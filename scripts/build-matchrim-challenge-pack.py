"""Freeze additive challenge provenance without changing the baseline corpus."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--source-report", type=Path, action="append", required=True)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
annotations = json.loads((ROOT / "qa/ground-truth/matchrim-challenge-v4-annotations.json").read_text())
baseline = json.loads((ROOT / "qa/ground-truth/matchrim-pilot-v3.json").read_text())
baseline_ids = {item["id"] for item in baseline["sources"]}
baseline_hashes = {item["source_sha256"] for item in baseline["sources"]}
metadata = {source["id"]: source for report in args.source_report
            for source in json.loads(report.read_text())["sources"]}
seen = set()
scenes = []
for annotation in annotations["sources"]:
    source = metadata[annotation["id"]]
    assert source["id"] not in baseline_ids
    assert source["license_accepted_for_qa"] and source["source_url"]
    assert source["author"] or annotation.get("attribution_note")
    digest = hashlib.sha256(Path(source["path"]).read_bytes()).hexdigest()
    assert digest == source["sha256"] and digest not in seen | baseline_hashes
    seen.add(digest)
    scenes.append({**source, **annotation, "annotation_status": "agent_visual_review_not_human_validated",
                   "canonical_identity_verified": False, "model_evaluated": False,
                   "annotation_provenance": annotations["annotation_provenance"]})
assert len(scenes) == 24
report = {
    "dataset_id": annotations["dataset_id"], "policy": annotations["policy"],
    "baseline_source_count": len(baseline["sources"]), "new_source_count": len(scenes),
    "total_public_files": len(baseline["sources"]) + len(scenes),
    "independence_note": "Unique file count is not independent scene count. Baseline contains shared venue/document series; group before split.",
    "holdout_note": "New scenes were inspected for annotation, not yet sent to vision. Do not tune against final evaluation holdout.",
    "scenes": scenes,
}
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
print(json.dumps({key: value for key, value in report.items() if key != "scenes"}, indent=2))
