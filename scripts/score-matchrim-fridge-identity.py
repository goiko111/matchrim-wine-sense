#!/usr/bin/env python3
import argparse
import json
import re
import unicodedata
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_GROUND_TRUTH = REPOSITORY_ROOT / "qa" / "ground-truth" / "matchrim-fridge-identity-v1.json"
DEFAULT_REPORT = (
    REPOSITORY_ROOT
    / "docs"
    / "qa-evidence"
    / "matchrim-build65-mobile-2026-09-29"
    / "real-five-release-gate-approved"
    / "real-e2e-report.json"
)


def normalize(value):
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(char for char in value if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def load_json(path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def find_fixture(report, fixture_id):
    for result in report.get("results", []):
        if result.get("fixture") == fixture_id:
            return result
    raise ValueError(f"Fixture {fixture_id!r} is missing from {report.get('base_url', 'report')}")


def boxes_match(expected, actual, tolerance=0.01):
    if not isinstance(expected, dict) or not isinstance(actual, dict):
        return False
    return all(
        isinstance(expected.get(key), (int, float))
        and isinstance(actual.get(key), (int, float))
        and abs(expected[key] - actual[key]) <= tolerance
        for key in ("x", "y", "width", "height")
    )


def score(ground_truth, report):
    fixture_id = ground_truth["fixture"]["id"]
    fixture_result = find_fixture(report, fixture_id)
    expected_fixture_sha = ground_truth["fixture"]["sha256"]
    actual_fixture_sha = fixture_result.get("fixture_sha256")
    if actual_fixture_sha != expected_fixture_sha:
        return {
            "fixture": fixture_id,
            "fixture_sha256": expected_fixture_sha,
            "status": "not_computable",
            "reason": "The traced fixture fingerprint does not match the validated ground truth.",
            "fixture_mismatch": {
                "expected_sha256": expected_fixture_sha,
                "actual_sha256": actual_fixture_sha,
            },
            "metrics": {
                "top1_identity_precision": None,
                "top1_identity_recall": None,
                "top1_identity_f1": None,
            },
        }
    region_results = fixture_result.get("backend", {}).get("region_results", [])
    actual_by_region = {
        item["region_id"]: item
        for item in region_results
    }
    traced_regions = [
        item for item in actual_by_region.values()
        if isinstance(item.get("request_box"), dict) and item.get("crop_sha256")
    ]
    if ground_truth.get("mapping_status") != "validated" or len(traced_regions) != len(actual_by_region):
        return {
            "fixture": fixture_id,
            "fixture_sha256": expected_fixture_sha,
            "status": "not_computable",
            "reason": (
                "The legacy report does not map every analysis region to the final merged client box and crop fingerprint. "
                "Its 29 detector boxes came from the last detector tile while the client analyzed 30 merged regions."
            ),
            "mapping_status": ground_truth.get("mapping_status", "missing"),
            "diagnostics": {
                "legacy_detected_boxes": len(fixture_result.get("backend", {}).get("detected_boxes", [])),
                "analyzed_regions": len(actual_by_region),
                "regions_with_request_box_and_crop": len(traced_regions),
                "detector_version": fixture_result.get("backend", {}).get("detector_version"),
                "analysis_versions": fixture_result.get("backend", {}).get("analysis_versions", []),
            },
            "metrics": {
                "top1_identity_precision": None,
                "top1_identity_recall": None,
                "top1_identity_f1": None,
            },
            "next_gate": (
                "Run the instrumented client against isolated staging, reconcile final boxes to the manual bottle slots, "
                "then set mapping_status to validated."
            ),
        }
    expected_region_ids = {annotation["region_id"] for annotation in ground_truth["annotations"]}
    actual_region_ids = set(actual_by_region)
    duplicate_region_ids = sorted({
        item["region_id"]
        for item in region_results
        if sum(row.get("region_id") == item["region_id"] for row in region_results) > 1
    })
    duplicate_crop_hashes = sorted({
        item["crop_sha256"]
        for item in region_results
        if item.get("crop_sha256")
        and sum(row.get("crop_sha256") == item["crop_sha256"] for row in region_results) > 1
    })
    if expected_region_ids != actual_region_ids or duplicate_region_ids or duplicate_crop_hashes:
        return {
            "fixture": fixture_id,
            "fixture_sha256": expected_fixture_sha,
            "status": "not_computable",
            "reason": "The traced region set is not a one-to-one match with the validated ground truth.",
            "trace_mismatches": {
                "missing_region_ids": sorted(expected_region_ids - actual_region_ids),
                "unexpected_region_ids": sorted(actual_region_ids - expected_region_ids),
                "duplicate_region_ids": duplicate_region_ids,
                "duplicate_crop_hashes": duplicate_crop_hashes,
            },
            "metrics": {
                "top1_identity_precision": None,
                "top1_identity_recall": None,
                "top1_identity_f1": None,
            },
        }
    spatial_mismatches = [
        {
            "region_id": annotation["region_id"],
            "expected_box": annotation.get("box_pct"),
            "actual_box": actual_by_region.get(annotation["region_id"], {}).get("request_box"),
        }
        for annotation in ground_truth["annotations"]
        if not boxes_match(
            annotation.get("box_pct"),
            actual_by_region.get(annotation["region_id"], {}).get("request_box"),
        )
    ]
    if spatial_mismatches:
        return {
            "fixture": fixture_id,
            "fixture_sha256": expected_fixture_sha,
            "status": "not_computable",
            "reason": "Final region boxes do not match the validated spatial mapping.",
            "spatial_mismatches": spatial_mismatches,
            "metrics": {
                "top1_identity_precision": None,
                "top1_identity_recall": None,
                "top1_identity_f1": None,
            },
        }

    rows = []
    true_positives = 0
    false_positives = 0
    false_negatives = 0
    scoreable = 0
    non_scoreable_suggestions = 0
    verifiability_counts = {}

    for annotation in ground_truth["annotations"]:
        region_id = annotation["region_id"]
        verifiability = annotation["verifiability"]
        verifiability_counts[verifiability] = verifiability_counts.get(verifiability, 0) + 1
        actual = actual_by_region.get(region_id, {})
        candidate = actual.get("candidate")
        row = {
            "region_id": region_id,
            "shelf": annotation["shelf"],
            "position": annotation["position"],
            "verifiability": verifiability,
            "expected": annotation.get("expected_identity", {}).get("canonical") if annotation.get("expected_identity") else None,
            "actual": candidate,
            "actual_confidence": actual.get("confidence"),
            "actual_status": actual.get("recognition_status", "missing"),
            "fallback_code": actual.get("fallback_code"),
        }

        if verifiability == "complete":
            scoreable += 1
            aliases = annotation["expected_identity"]["accepted_top1"]
            matches = candidate is not None and normalize(candidate) in {normalize(alias) for alias in aliases}
            if matches:
                true_positives += 1
                row["outcome"] = "correct"
            else:
                false_negatives += 1
                if candidate:
                    false_positives += 1
                    row["outcome"] = "wrong_identity"
                else:
                    row["outcome"] = "abstained"
        else:
            if candidate:
                non_scoreable_suggestions += 1
            row["outcome"] = "not_scored"
        rows.append(row)

    precision_denominator = true_positives + false_positives
    recall_denominator = true_positives + false_negatives
    precision = true_positives / precision_denominator if precision_denominator else None
    recall = true_positives / recall_denominator if recall_denominator else None
    f1 = (
        2 * precision * recall / (precision + recall)
        if precision is not None and recall is not None and precision + recall
        else 0.0
    )

    return {
        "fixture": fixture_id,
        "fixture_sha256": expected_fixture_sha,
        "detector_version": fixture_result.get("backend", {}).get("detector_version"),
        "analysis_versions": fixture_result.get("backend", {}).get("analysis_versions", []),
        "status": "computed",
        "metric_policy": ground_truth["protocol"]["identity_metrics"],
        "counts": {
            "annotations": len(ground_truth["annotations"]),
            "scoreable_complete_identities": scoreable,
            "true_positives": true_positives,
            "false_positives": false_positives,
            "false_negatives": false_negatives,
            "non_scoreable_suggestions": non_scoreable_suggestions,
            "verifiability": verifiability_counts,
        },
        "metrics": {
            "top1_identity_precision": precision,
            "top1_identity_recall": recall,
            "top1_identity_f1": f1,
        },
        "rows": rows,
    }


def main():
    parser = argparse.ArgumentParser(description="Score Matchrim fridge top-1 identities against manual ground truth.")
    parser.add_argument("--ground-truth", type=Path, default=DEFAULT_GROUND_TRUTH)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    result = score(load_json(args.ground_truth), load_json(args.report))
    rendered = json.dumps(result, indent=2, ensure_ascii=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    print(rendered, end="")


if __name__ == "__main__":
    main()
