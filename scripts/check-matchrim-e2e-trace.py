#!/usr/bin/env python3
from matchrim_e2e_trace import compact_label_backend_observation


def detector_call(tile, boxes):
    return {
        "function": "detect-wine-regions",
        "status": 200,
        "request_payload": {"detection_tile": tile},
        "payload": {
            "detector_version": "trace-test-v1",
            "coverage": {"status": "reported_complete"},
            "regions": [{"box": box} for box in boxes],
        },
    }


def analyzer_call(region_id, index, box, crop_sha, candidate):
    return {
        "function": "analyze-wine-region",
        "region_id": region_id,
        "status": 200,
        "request_payload": {
            "region_id": region_id,
            "region_index": index,
            "region_box": box,
            "image_sha256": crop_sha,
            "image_bytes": 1234 + index,
        },
        "payload": {
            "analysis_version": "trace-test-analysis-v1",
            "recognition_status": "identified",
            "candidates": [{"name": candidate, "confidence": 0.9}],
        },
    }


full_box = {"x": 5, "y": 5, "width": 90, "height": 90}
left_boxes = [
    {"x": 10, "y": 10, "width": 12, "height": 70},
    {"x": 35, "y": 10, "width": 12, "height": 70},
]
right_boxes = [
    {"x": 20, "y": 10, "width": 12, "height": 70},
    {"x": 60, "y": 10, "width": 12, "height": 70},
]
final_boxes = [
    {"x": 5.6, "y": 10, "width": 6.72, "height": 70},
    {"x": 19.6, "y": 10, "width": 6.72, "height": 70},
    {"x": 77.6, "y": 10, "width": 6.72, "height": 70},
]

calls = [
    detector_call("full", [full_box]),
    detector_call("left", left_boxes),
    detector_call("right", right_boxes),
    analyzer_call("region-2", 2, final_boxes[1], "crop-middle", "Middle bottle"),
    analyzer_call("region-1", 1, final_boxes[0], "crop-left", "Left bottle"),
    analyzer_call("region-3", 3, final_boxes[2], "crop-right", "Right bottle"),
]

result = compact_label_backend_observation(calls)

assert result["last_detector_response_regions"] == 2
assert result["detected_regions"] == 3
assert result["analyzed_regions"] == 3
assert result["detected_boxes"] == final_boxes
assert result["detected_boxes_source"] == "analysis_request_region_box"
assert result["trace_complete"] is True
assert [call["tile"] for call in result["detector_calls"]] == ["full", "left", "right"]

by_region = {row["region_id"]: row for row in result["region_results"]}
assert by_region["region-1"]["candidate"] == "Left bottle"
assert by_region["region-1"]["crop_sha256"] == "crop-left"
assert by_region["region-2"]["candidate"] == "Middle bottle"
assert by_region["region-3"]["candidate"] == "Right bottle"

print("Matchrim E2E trace contract: PASS")
