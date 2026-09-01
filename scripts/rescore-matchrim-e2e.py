import argparse
import importlib.util
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RUNNER_PATH = ROOT / "scripts" / "qa-matchrim-real-e2e.py"
GROUND_TRUTH_RUNNER_PATH = ROOT / "scripts" / "qa-matchrim-ground-truth.py"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not import {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def recover_result_rows(result: dict) -> list[str]:
    if result.get("displayed_names"):
        return result["displayed_names"]
    accuracy = result.get("accuracy") or {}
    matched_rows = [match["actual"] for match in accuracy.get("matches", [])]
    return [*matched_rows, *accuracy.get("false_positives", [])]


def main() -> None:
    parser = argparse.ArgumentParser(description="Re-score captured Matchrim E2E responses without new API calls.")
    parser.add_argument("--source-report", type=Path, required=True)
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    runner = load_module("matchrim_real_e2e", RUNNER_PATH)
    ground_truth_runner = load_module("matchrim_ground_truth", GROUND_TRUTH_RUNNER_PATH)
    source_report = json.loads(args.source_report.read_text())
    dataset = json.loads(args.dataset.read_text())
    scenes = {scene["id"]: scene for scene in dataset["scenes"]}

    results = []
    for captured in source_report["results"]:
        result = dict(captured)
        scene = scenes[result["fixture"]]
        result["ground_truth"] = scene["ground_truth"]
        result["expected_results"] = len(scene["ground_truth"].get("expected_wines", []))

        if result["mode"] == "carta-vinos":
            displayed_names = [runner.menu_row_identity(row) for row in recover_result_rows(result)]
            expected_names = scene["ground_truth"]["expected_wines"]
            result["displayed_names"] = displayed_names
            result["accuracy"] = runner.compare_wine_names(expected_names, displayed_names)
            canonical_names = [runner.menu_identity(item) for item in (result.get("backend") or {}).get("items", [])]
            result["canonical_accuracy"] = runner.compare_wine_names(expected_names, canonical_names)
            passed = (
                result["terminal_state"] == "completed"
                and result["accuracy"]["precision"] >= runner.MIN_MENU_PRECISION
                and result["accuracy"]["recall"] >= runner.MIN_MENU_RECALL
                and result["anchored_pins"] > 0
                and not result.get("horizontal_overflow")
                and not result.get("unhandled_console_errors")
            )
            result["status"] = "PASS" if passed else "BLOCKED_OR_FAIL"
        results.append(result)

    report = {
        "dataset_id": dataset["dataset_id"],
        "interception": False,
        "production_guard": source_report.get("production_guard", True),
        "selected_scene_count": len(results),
        "rescored_without_api_calls": True,
        "source_report": str(args.source_report.resolve()),
        "summary": ground_truth_runner.summarize(results),
        "results": results,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=True) + "\n")
    print(json.dumps(report["summary"], indent=2))
    print(f"report={args.output}")


if __name__ == "__main__":
    main()
