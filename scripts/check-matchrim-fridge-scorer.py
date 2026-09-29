#!/usr/bin/env python3
import copy
import importlib.util
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCORER_PATH = ROOT / "scripts" / "score-matchrim-fridge-identity.py"
GROUND_TRUTH_PATH = ROOT / "qa" / "ground-truth" / "matchrim-fridge-trace-contract-v1.json"
REPORT_PATH = (
    ROOT
    / "docs"
    / "qa-evidence"
    / "matchrim-build65-mobile-2026-09-29"
    / "automated"
    / "fridge-trace-contract-report.json"
)


spec = importlib.util.spec_from_file_location("matchrim_fridge_scorer", SCORER_PATH)
scorer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scorer)

ground_truth = json.loads(GROUND_TRUTH_PATH.read_text(encoding="utf-8"))
report = json.loads(REPORT_PATH.read_text(encoding="utf-8"))

valid = scorer.score(ground_truth, report)
assert valid["status"] == "computed"
assert valid["metrics"] == {
    "top1_identity_precision": 1.0,
    "top1_identity_recall": 1.0,
    "top1_identity_f1": 1.0,
}

wrong_fixture = copy.deepcopy(report)
wrong_fixture["results"][0]["fixture_sha256"] = "wrong-fixture-hash"
wrong_fixture_result = scorer.score(ground_truth, wrong_fixture)
assert wrong_fixture_result["status"] == "not_computable"
assert wrong_fixture_result["fixture_mismatch"]["actual_sha256"] == "wrong-fixture-hash"

shifted = copy.deepcopy(report)
shifted["results"][0]["backend"]["region_results"][1]["request_box"]["x"] = 38
shifted_result = scorer.score(ground_truth, shifted)
assert shifted_result["status"] == "not_computable"
assert shifted_result["spatial_mismatches"][0]["region_id"] == "region-2"

duplicate_crop = copy.deepcopy(report)
regions = duplicate_crop["results"][0]["backend"]["region_results"]
regions[1]["crop_sha256"] = regions[0]["crop_sha256"]
duplicate_result = scorer.score(ground_truth, duplicate_crop)
assert duplicate_result["status"] == "not_computable"
assert duplicate_result["trace_mismatches"]["duplicate_crop_hashes"]

extra_region = copy.deepcopy(report)
extra_region["results"][0]["backend"]["region_results"].append({
    "region_id": "region-4",
    "request_index": 4,
    "request_box": {"x": 88, "y": 12, "width": 8, "height": 72},
    "crop_sha256": "extra-crop-hash",
    "candidate": "Botella extra",
    "confidence": 0.9,
    "recognition_status": "identified",
    "fallback_code": None,
})
extra_result = scorer.score(ground_truth, extra_region)
assert extra_result["status"] == "not_computable"
assert extra_result["trace_mismatches"]["unexpected_region_ids"] == ["region-4"]

print("Matchrim fridge scorer contract: PASS")
