def compact_label_backend_observation(api_calls):
    detector_calls = [call for call in api_calls if call["function"] == "detect-wine-regions"]
    detector = detector_calls[-1] if detector_calls else None
    analyzers = [call for call in api_calls if call["function"] == "analyze-wine-region"]
    detector_payload = detector.get("payload", {}) if detector else {}

    candidate_names = []
    analyzer_versions = set()
    analysis_by_region = {}
    for call in analyzers:
        payload = call.get("payload") or {}
        if payload.get("analysis_version"):
            analyzer_versions.add(payload["analysis_version"])
        region_id = call.get("region_id") or f"unknown-{len(analysis_by_region) + 1}"
        analysis_by_region.setdefault(region_id, []).append(call)

    recovered_analysis_failures = 0
    final_failed_regions = []
    region_results = []
    for region_id, calls in analysis_by_region.items():
        successful = [call for call in calls if call["status"] == 200]
        if successful and any(call["status"] != 200 for call in calls):
            recovered_analysis_failures += 1
        if not successful:
            final_failed_regions.append(region_id)
            continue
        payload = successful[-1].get("payload") or {}
        request_payload = successful[-1].get("request_payload") or {}
        candidates = payload.get("candidates") or []
        fallback = payload.get("fallback") if isinstance(payload.get("fallback"), dict) else None
        if candidates and candidates[0].get("name"):
            candidate_names.append(candidates[0]["name"])
        region_results.append({
            "region_id": region_id,
            "attempts": len(calls),
            "status_codes": [call["status"] for call in calls],
            "candidate": candidates[0].get("name") if candidates else None,
            "confidence": candidates[0].get("confidence") if candidates else None,
            "recognition_status": payload.get("recognition_status"),
            "fallback_code": fallback.get("code") if fallback else None,
            "request_index": request_payload.get("region_index"),
            "request_box": request_payload.get("region_box"),
            "crop_sha256": request_payload.get("image_sha256"),
            "crop_bytes": request_payload.get("image_bytes"),
        })

    traced_regions = [
        region for region in region_results
        if isinstance(region.get("request_box"), dict)
    ]
    traced_regions.sort(key=lambda region: (
        region.get("request_index") if isinstance(region.get("request_index"), int) else 10_000,
        region["region_id"],
    ))
    detector_observations = []
    for call in detector_calls:
        payload = call.get("payload") or {}
        request_payload = call.get("request_payload") or {}
        detector_observations.append({
            "tile": request_payload.get("detection_tile", "full"),
            "status": call.get("status"),
            "regions": len(payload.get("regions") or []),
            "detector_version": payload.get("detector_version"),
        })

    return {
        "function": "multi-wine-label",
        "detector_http_status": detector.get("status") if detector else None,
        "detector_version": detector_payload.get("detector_version"),
        "detected_boxes": [region["request_box"] for region in traced_regions],
        "detected_boxes_source": "analysis_request_region_box" if traced_regions else "unavailable",
        "trace_complete": len(traced_regions) == len(analysis_by_region),
        "detector_calls": detector_observations,
        "analysis_versions": sorted(analyzer_versions),
        "coverage": detector_payload.get("coverage"),
        "detected_regions": len(traced_regions),
        "last_detector_response_regions": len(detector_payload.get("regions") or []),
        "analyzed_regions": len(analysis_by_region),
        "analysis_attempts": len(analyzers),
        "recovered_analysis_failures": recovered_analysis_failures,
        "final_failed_regions": sorted(set(final_failed_regions)),
        "identified_candidates": len(candidate_names),
        "candidate_names": candidate_names,
        "region_results": region_results,
    }
