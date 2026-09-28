#!/usr/bin/env python3
"""Run the real food-menu runtime against an annotated, write-free fixture."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
import time
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_GROUND_TRUTH = ROOT / "qa-fixtures/food-menu/ground-truth.json"
DEFAULT_OUTPUT = ROOT / "docs/qa-evidence/matchrim-build64-recognition-2026-09-28/food-menu-real-backend.json"


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key] = value.strip().strip('"').strip("'")
    return values


def normalize(value: str) -> str:
    turkish_fold = str.maketrans({"ı": "i", "İ": "I", "ş": "s", "Ş": "S", "ğ": "g", "Ğ": "G"})
    decomposed = unicodedata.normalize("NFKD", value.translate(turkish_fold))
    ascii_value = "".join(char for char in decomposed if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", ascii_value.casefold()).strip()


def matches(expected: dict[str, object], actual: str) -> bool:
    actual_normalized = normalize(actual)
    candidates = [str(expected["name"]), *[str(alias) for alias in expected.get("aliases", [])]]
    return any(
        (candidate_normalized := normalize(candidate))
        and (
            candidate_normalized in actual_normalized
            or actual_normalized in candidate_normalized
        )
        for candidate in candidates
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ground-truth", type=Path, default=DEFAULT_GROUND_TRUTH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--env", type=Path, default=ROOT / ".env")
    parser.add_argument(
        "--input-report",
        type=Path,
        help="Rescore a prior report response without calling the provider again.",
    )
    args = parser.parse_args()

    ground_truth = json.loads(args.ground_truth.read_text(encoding="utf-8"))
    image_path = args.ground_truth.parent / ground_truth["image"]
    image_bytes = image_path.read_bytes()
    env = load_env(args.env)
    base_url = env["VITE_SUPABASE_URL"].rstrip("/")
    anon_key = env["VITE_SUPABASE_PUBLISHABLE_KEY"]
    body = {
        "image": "data:image/jpeg;base64," + base64.b64encode(image_bytes).decode("ascii"),
        "mode": "menu",
        "restaurantName": "Ground truth CC0",
        "matchrimProfile": {
            "potente": 3,
            "acidez": 3,
            "dulce": 2,
            "tanico": 3,
            "afrutado": 3,
        },
    }
    if args.input_report:
        previous = json.loads(args.input_report.read_text(encoding="utf-8"))
        status = int(previous["http_status"])
        payload = previous["response"]
        latency_ms = int(previous["latency_ms"])
        provider_run_at = previous.get("provider_run_at", previous.get("run_at"))
    else:
        request = urllib.request.Request(
            f"{base_url}/functions/v1/scan-food-pairing",
            data=json.dumps(body).encode("utf-8"),
            method="POST",
            headers={
                "apikey": anon_key,
                "Authorization": f"Bearer {anon_key}",
                "Content-Type": "application/json",
            },
        )

        started = time.monotonic()
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                status = response.status
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            status = error.code
            payload = json.loads(error.read().decode("utf-8"))
        latency_ms = round((time.monotonic() - started) * 1000)
        provider_run_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    expected = ground_truth["expected_dishes"]
    actual_names = [str(dish.get("nombre", "")).strip() for dish in payload.get("dishes", [])]
    matched_expected: list[str] = []
    unmatched_expected: list[str] = []
    matches_by_actual: dict[int, list[str]] = {index: [] for index in range(len(actual_names))}

    for expected_dish in expected:
        match_index = next(
            (
                index
                for index, actual_name in enumerate(actual_names)
                if matches(expected_dish, actual_name)
            ),
            None,
        )
        if match_index is None:
            unmatched_expected.append(str(expected_dish["name"]))
        else:
            expected_name = str(expected_dish["name"])
            matches_by_actual[match_index].append(expected_name)
            matched_expected.append(expected_name)

    false_positives = [
        name for index, name in enumerate(actual_names) if not matches_by_actual[index]
    ]
    matched_count = len(matched_expected)
    grounded_actual_count = len(actual_names) - len(false_positives)
    precision = grounded_actual_count / len(actual_names) if actual_names else 0.0
    recall = matched_count / len(expected) if expected else 0.0
    merged_results = [
        {"actual": actual_names[index], "matched_expected": names}
        for index, names in matches_by_actual.items()
        if len(names) > 1
    ]
    result = {
        "dataset_id": ground_truth["dataset_id"],
        "scene_id": ground_truth["scene_id"],
        "evaluated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "provider_run_at": provider_run_at,
        "source_url": ground_truth["source_url"],
        "license": ground_truth["license"],
        "interception": False,
        "production_write": False,
        "runtime": "real_supabase_edge_function",
        "http_status": status,
        "latency_ms": latency_ms,
        "image_sha256": hashlib.sha256(image_bytes).hexdigest(),
        "expected_count": len(expected),
        "actual_count": len(actual_names),
        "grounded_actual_count": grounded_actual_count,
        "matched_count": matched_count,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "matched_expected": matched_expected,
        "missed": unmatched_expected,
        "false_positives": false_positives,
        "merged_result_count": len(merged_results),
        "merged_results": merged_results,
        "actual_dishes": actual_names,
        "scan_version": payload.get("scan_version"),
        "profile_source": payload.get("profile_source"),
        "contract_limit": 8,
        "certified": status == 200 and precision >= 0.9 and recall >= 0.9,
        "response": payload,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: result[key] for key in (
        "http_status", "latency_ms", "expected_count", "actual_count", "matched_count",
        "precision", "recall", "scan_version", "certified"
    )}, ensure_ascii=False, indent=2))
    return 0 if status == 200 else 1


if __name__ == "__main__":
    raise SystemExit(main())
