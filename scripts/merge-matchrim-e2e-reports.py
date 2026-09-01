import argparse
import importlib.util
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GROUND_TRUTH_RUNNER_PATH = ROOT / "scripts" / "qa-matchrim-ground-truth.py"


def load_ground_truth_runner():
    spec = importlib.util.spec_from_file_location("matchrim_ground_truth", GROUND_TRUTH_RUNNER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not import {GROUND_TRUTH_RUNNER_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> None:
    parser = argparse.ArgumentParser(description="Combine disjoint Matchrim E2E reports into one benchmark report.")
    parser.add_argument("--reports", type=Path, nargs="+", required=True)
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    dataset = json.loads(args.dataset.read_text())
    reports = [json.loads(path.read_text()) for path in args.reports]
    results = [result for report in reports for result in report["results"]]
    fixture_ids = [result["fixture"] for result in results]
    expected_ids = [scene["id"] for scene in dataset["scenes"]]
    if len(fixture_ids) != len(set(fixture_ids)):
        raise RuntimeError("Source reports contain duplicate fixtures")
    if set(fixture_ids) != set(expected_ids):
        missing = sorted(set(expected_ids) - set(fixture_ids))
        extra = sorted(set(fixture_ids) - set(expected_ids))
        raise RuntimeError(f"Combined report does not match dataset; missing={missing}, extra={extra}")

    ground_truth_runner = load_ground_truth_runner()
    report = {
        "dataset_id": dataset["dataset_id"],
        "interception": False,
        "production_guard": all(report.get("production_guard", True) for report in reports),
        "selected_scene_count": len(results),
        "source_reports": [str(path.resolve()) for path in args.reports],
        "contains_offline_rescore": any(report.get("rescored_without_api_calls", False) for report in reports),
        "summary": ground_truth_runner.summarize(results),
        "results": results,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=True) + "\n")
    print(json.dumps(report["summary"], indent=2))
    print(f"report={args.output}")


if __name__ == "__main__":
    main()
