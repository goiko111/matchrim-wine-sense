#!/usr/bin/env python3

import argparse
import importlib.util
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RUNNER_PATH = ROOT / "scripts" / "qa-matchrim-real-e2e.py"


def load_runner():
    spec = importlib.util.spec_from_file_location("matchrim_real_e2e", RUNNER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not import {RUNNER_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def fixture_key(value: str) -> str:
    return str(value).lower().replace("_", "-").removesuffix("--original")


def backend_versions(result: dict) -> list[str]:
    backend = result.get("backend") or {}
    versions = []
    for field in ("detector_version", "version", "function_version"):
        if backend.get(field):
            versions.append(str(backend[field]))
    versions.extend(str(value) for value in backend.get("analysis_versions", []))
    versions.extend(str(value) for value in backend.get("versions", []))
    return sorted(set(versions))


def ratio(numerator: int, denominator: int) -> float:
    return round(numerator / denominator, 4) if denominator else 0.0


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare two Matchrim backend QA reports.")
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    baseline = json.loads(args.baseline.read_text())
    candidate = json.loads(args.candidate.read_text())
    baseline_by_fixture = {
        fixture_key(result["fixture"]): result for result in baseline["results"]
    }
    runner = load_runner()

    comparisons = []
    menu_matches = 0
    menu_actual = 0
    menu_expected = 0
    missing_baselines = []
    max_menu_count_drift = 0

    for current in candidate["results"]:
        key = fixture_key(current["fixture"])
        previous = baseline_by_fixture.get(key)
        if previous is None:
            missing_baselines.append(current["fixture"])
            continue

        identity_stability = runner.compare_wine_names(
            previous.get("displayed_names", []), current.get("displayed_names", [])
        )
        is_menu = current.get("mode") != "etiqueta"
        if is_menu:
            menu_matches += identity_stability["matched_count"]
            menu_actual += identity_stability["actual_count"]
            menu_expected += identity_stability["expected_count"]
            max_menu_count_drift = max(
                max_menu_count_drift,
                abs(current["actual_results"] - previous["actual_results"]),
            )

        previous_latency = previous.get("latency_ms") or 0
        current_latency = current.get("latency_ms") or 0
        comparisons.append({
            "fixture": current["fixture"],
            "mode": current.get("mode"),
            "baseline_status": previous.get("status"),
            "candidate_status": current.get("status"),
            "baseline_results": previous.get("actual_results"),
            "candidate_results": current.get("actual_results"),
            "result_count_delta": current.get("actual_results", 0) - previous.get("actual_results", 0),
            "baseline_high_confidence": previous.get("high_confidence_results"),
            "candidate_high_confidence": current.get("high_confidence_results"),
            "identity_stability": identity_stability,
            "baseline_latency_ms": previous_latency,
            "candidate_latency_ms": current_latency,
            "latency_delta_ms": current_latency - previous_latency,
            "latency_ratio": round(current_latency / previous_latency, 3) if previous_latency else None,
            "baseline_backend_versions": backend_versions(previous),
            "candidate_backend_versions": backend_versions(current),
            "backend_versions_stable": backend_versions(previous) == backend_versions(current),
        })

    candidate_summary = candidate["summary"]
    candidate_identity = candidate_summary["identity_micro"]
    fridge = next(
        (result for result in candidate["results"] if result.get("mode") == "etiqueta"),
        {},
    )
    menu_stability = {
        "matched": menu_matches,
        "actual": menu_actual,
        "expected": menu_expected,
        "precision": ratio(menu_matches, menu_actual),
        "recall": ratio(menu_matches, menu_expected),
        "max_result_count_drift": max_menu_count_drift,
    }
    thresholds = {
        "candidate_pass_rate": 1.0,
        "candidate_identity_precision": 0.9,
        "candidate_identity_recall": 0.9,
        "menu_stability_precision": 0.9,
        "menu_stability_recall": 0.85,
        "max_menu_result_count_drift": 2,
        "fridge_min_regions": 12,
        "fridge_min_high_confidence": 6,
        "console_error_scenes": 0,
    }
    checks = {
        "all_fixtures_have_baseline": not missing_baselines,
        "candidate_pass_rate": candidate_summary["pass_rate"] >= thresholds["candidate_pass_rate"],
        "candidate_identity_precision": candidate_identity["precision"] >= thresholds["candidate_identity_precision"],
        "candidate_identity_recall": candidate_identity["recall"] >= thresholds["candidate_identity_recall"],
        "menu_stability_precision": menu_stability["precision"] >= thresholds["menu_stability_precision"],
        "menu_stability_recall": menu_stability["recall"] >= thresholds["menu_stability_recall"],
        "max_menu_result_count_drift": max_menu_count_drift <= thresholds["max_menu_result_count_drift"],
        "fridge_regions": fridge.get("actual_results", 0) >= thresholds["fridge_min_regions"],
        "fridge_high_confidence": fridge.get("high_confidence_results", 0) >= thresholds["fridge_min_high_confidence"],
        "console_errors": candidate_summary["operational"]["console_error_scene_count"] == 0,
        "backend_versions_stable": all(item["backend_versions_stable"] for item in comparisons),
    }
    decision = "GO" if all(checks.values()) else "NO_GO"
    report = {
        "baseline": str(args.baseline.resolve()),
        "candidate": str(args.candidate.resolve()),
        "decision": decision,
        "thresholds": thresholds,
        "checks": checks,
        "candidate_summary": candidate_summary,
        "menu_identity_stability": menu_stability,
        "missing_baselines": missing_baselines,
        "comparisons": comparisons,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({
        "decision": decision,
        "checks": checks,
        "menu_identity_stability": menu_stability,
        "output": str(args.output.resolve()),
    }, indent=2, ensure_ascii=False))
    raise SystemExit(0 if decision == "GO" else 2)


if __name__ == "__main__":
    main()
