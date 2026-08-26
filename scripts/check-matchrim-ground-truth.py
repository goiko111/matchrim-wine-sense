import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "qa" / "ground-truth" / "matchrim-v1.json"


def main() -> None:
    manifest = json.loads(MANIFEST.read_text())
    sources = manifest["sources"]
    variants = manifest["variants"]
    assert manifest["schema_version"] == 1
    assert manifest["scene_count"] == 30
    assert len(sources) == 5
    assert len(variants) == 6
    assert len(sources) * len(variants) == manifest["scene_count"]
    assert len({source["id"] for source in sources}) == len(sources)
    assert len({variant["id"] for variant in variants}) == len(variants)
    assert {variant["expectation"] for variant in variants} == {"inherit", "abstain"}
    assert sum(variant["kind"] == "original" for variant in variants) == 1
    assert sum(variant["kind"] == "controlled" for variant in variants) == 5

    for source in sources:
        assert len(source["sha256"]) == 64
        assert source["annotation_provenance"]
        ground_truth = source["ground_truth"]
        if source["mode"] == "carta-vinos":
            assert ground_truth["annotation_scope"] == "wine_identity"
            assert len(ground_truth["expected_wines"]) >= 8
        else:
            assert ground_truth["annotation_scope"] == "count_threshold"
            assert ground_truth["visible_bottles_estimate"] > ground_truth["expected_min_regions"]
            assert ground_truth["detector_cap"] == 30

    limitations = " ".join(manifest["annotation_policy"]["limitations"])
    assert "not new captures" in limitations
    assert "no exhaustive" in limitations
    print("Matchrim ground-truth manifest checks passed: 30 scenes (5 captures + 25 controlled variants)")


if __name__ == "__main__":
    main()
