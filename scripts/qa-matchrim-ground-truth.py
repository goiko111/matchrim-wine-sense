import argparse
import importlib.util
import json
import statistics
import sys
from pathlib import Path
from typing import Optional

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = ROOT / "qa-artifacts" / "matchrim-ground-truth-v1" / "materialization-report.json"
DEFAULT_ARTIFACTS = ROOT / "qa-artifacts" / "matchrim-ground-truth-v1" / "e2e"
RUNNER_PATH = ROOT / "scripts" / "qa-matchrim-real-e2e.py"


def load_runner():
    spec = importlib.util.spec_from_file_location("matchrim_real_e2e", RUNNER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not import {RUNNER_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def build_fixture(scene: dict) -> dict:
    ground_truth = scene["ground_truth"]
    fixture = {
        "id": scene["id"],
        "source": Path(scene["path"]),
        "mode": scene["mode"],
        "expectation": scene["expectation"],
        "rationale": f"{scene['capture_kind']} / {scene['difficulty']} / {scene['annotation_provenance']}",
    }
    if scene["mode"] == "etiqueta":
        fixture.update({
            "expected_min_results": ground_truth["expected_min_regions"],
            "expected_min_identified": ground_truth["expected_min_identified"],
            "max_high_confidence_results": ground_truth["illegible_max_high_confidence_candidates"],
            "expected_wines": ground_truth.get("expected_wines", []),
            "expected_boxes": ground_truth.get("expected_boxes", []),
            "identity_min_recall": ground_truth.get("identity_min_recall", 0.8),
            "identity_min_precision": ground_truth.get("identity_min_precision", 0.7),
        })
    else:
        fixture.update({
            "expected_wines": ground_truth["expected_wines"],
            "max_high_confidence_results": 0,
        })
    return fixture


def micro_identity_metrics(results: list[dict]) -> dict:
    annotated = [
        result for result in results
        if result.get("accuracy") and result["expectation"] in {"inherit", "identify"}
    ]
    matched = sum(result["accuracy"]["matched_count"] for result in annotated)
    actual = sum(result["accuracy"]["actual_count"] for result in annotated)
    expected = sum(result["accuracy"]["expected_count"] for result in annotated)
    return {
        "scene_count": len(annotated),
        "matched": matched,
        "actual": actual,
        "expected": expected,
        "precision": round(matched / actual, 4) if actual else 0.0,
        "recall": round(matched / expected, 4) if expected else 0.0,
        "false_positives": sum(len(result["accuracy"]["false_positives"]) for result in annotated),
        "missed": sum(len(result["accuracy"]["missed"]) for result in annotated),
    }


def micro_detection_metrics(results: list[dict]) -> dict:
    annotated = [result["detection_accuracy"] for result in results if result.get("detection_accuracy")]
    matched = sum(result["matched_count"] for result in annotated)
    actual = sum(result["actual_count"] for result in annotated)
    expected = sum(result["expected_count"] for result in annotated)
    weighted_iou = sum(result["mean_iou"] * result["matched_count"] for result in annotated)
    return {
        "scene_count": len(annotated),
        "matched": matched,
        "actual": actual,
        "expected": expected,
        "precision": round(matched / actual, 4) if actual else 0.0,
        "recall": round(matched / expected, 4) if expected else 0.0,
        "mean_iou": round(weighted_iou / matched, 4) if matched else 0.0,
        "iou_threshold": 0.3,
    }


def summarize(results: list[dict]) -> dict:
    def pass_rate(items: list[dict]) -> Optional[float]:
        return round(sum(item["status"] == "PASS" for item in items) / len(items), 4) if items else None

    identity = micro_identity_metrics(results)
    detection = micro_detection_metrics(results)
    originals = [result for result in results if result["variant_kind"] == "original"]
    controlled = [result for result in results if result["variant_kind"] == "controlled"]
    abstention = [result for result in results if result["expectation"] == "abstain"]
    label_results = [result for result in results if result["mode"] == "etiqueta"]
    latencies = [result["latency_ms"] for result in results]
    completed = [result for result in results if result["terminal_state"] in {"completed", "abstained"}]
    recovered_transient_failures = sum(
        (result.get("backend") or {}).get("recovered_analysis_failures", 0)
        for result in results
    )
    console_error_scenes = sum(bool(result.get("console_errors")) for result in results)
    capped_detection_recall = []
    absolute_detection_recall = []
    for result in label_results:
        truth = result["ground_truth"]
        actual = result["actual_results"]
        capped_detection_recall.append(min(actual, truth["detector_cap"]) / min(truth["visible_bottles_estimate"], truth["detector_cap"]))
        absolute_detection_recall.append(min(actual, truth["visible_bottles_estimate"]) / truth["visible_bottles_estimate"])
    return {
        "scene_count": len(results),
        "all_passed": all(result["status"] == "PASS" for result in results),
        "pass_rate": pass_rate(results),
        "original_pass_rate": pass_rate(originals),
        "controlled_variant_pass_rate": pass_rate(controlled),
        "operational": {
            "terminal_completion_rate": round(len(completed) / len(results), 4),
            "console_error_scene_count": console_error_scenes,
            "recovered_transient_analysis_failures": recovered_transient_failures,
        },
        "identity_micro": identity,
        "detection_micro": detection,
        "abstention": {
            "scene_count": len(abstention),
            "passed": sum(result["status"] == "PASS" for result in abstention),
            "high_confidence_results": sum(result["high_confidence_results"] for result in abstention),
            "false_positive_names": sum(
                len((result.get("accuracy") or {}).get("false_positives", [])) for result in abstention
            ),
        },
        "fridge_detection": {
            "scene_count": len(label_results),
            "precision": detection["precision"] if detection["scene_count"] else None,
            "precision_note": (
                "IoU-backed precision from human boxes. Count-only dense scenes are excluded."
                if detection["scene_count"] else
                "Unavailable until exhaustive per-bottle boxes are human-annotated."
            ),
            "mean_capped_count_recall": round(statistics.mean(capped_detection_recall), 4) if capped_detection_recall else None,
            "mean_absolute_count_recall": round(statistics.mean(absolute_detection_recall), 4) if absolute_detection_recall else None,
        },
        "latency_ms": {
            "mean": round(statistics.mean(latencies)),
            "median": round(statistics.median(latencies)),
            "max": max(latencies),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run real Matchrim E2E over the 30-scene ground-truth dataset.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--artifacts", type=Path, default=DEFAULT_ARTIFACTS)
    parser.add_argument("--scene-pattern", default="")
    parser.add_argument("--mode", choices=("etiqueta", "carta-vinos"), default="")
    parser.add_argument("--max-scenes", type=int, default=0)
    args = parser.parse_args()

    dataset = json.loads(args.dataset.read_text())
    scenes = [scene for scene in dataset["scenes"] if args.scene_pattern in scene["id"]]
    if args.mode:
        scenes = [scene for scene in scenes if scene["mode"] == args.mode]
    if args.max_scenes > 0:
        scenes = scenes[:args.max_scenes]
    if not scenes:
        raise RuntimeError("No scenes selected")

    runner = load_runner()
    runner.refuse_production_url()
    runner.ARTIFACTS = args.artifacts
    args.artifacts.mkdir(parents=True, exist_ok=True)
    results = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path=runner.CHROME)
        for index, scene in enumerate(scenes, start=1):
            fixture = build_fixture(scene)
            print(f"RUN {index}/{len(scenes)} {scene['id']}", flush=True)
            result = runner.run_fixture(browser, fixture, Path(scene["path"]))
            result.update({
                "source_id": scene["source_id"],
                "variant": scene["variant"],
                "variant_kind": scene["variant_kind"],
                "difficulty": scene["difficulty"],
                "ground_truth": scene["ground_truth"],
                "scene_sha256": scene["sha256"],
            })
            results.append(result)
            accuracy = result.get("accuracy") or {}
            print(
                f"DONE {scene['id']} {result['status']} actual={result['actual_results']} "
                f"precision={accuracy.get('precision', '-')} recall={accuracy.get('recall', '-')} "
                f"high_conf={result['high_confidence_results']} latency_ms={result['latency_ms']}",
                flush=True,
            )
        browser.close()

    report = {
        "dataset_id": dataset["dataset_id"],
        "interception": False,
        "production_guard": True,
        "selected_scene_count": len(scenes),
        "summary": summarize(results),
        "results": results,
    }
    report_path = args.artifacts / "ground-truth-e2e-report.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=True) + "\n")
    print(json.dumps(report["summary"], indent=2))
    print(f"report={report_path}")
    if not report["summary"]["all_passed"]:
        sys.exit(2)


if __name__ == "__main__":
    main()
