import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "qa" / "ground-truth" / "matchrim-independent-v2.json"
PRIVATE_MANIFEST = ROOT / "qa" / "ground-truth" / "matchrim-v1.json"


def main() -> None:
    manifest = json.loads(MANIFEST.read_text())
    private_manifest = json.loads(PRIVATE_MANIFEST.read_text())
    sources = manifest["sources"]
    assert manifest["schema_version"] == 2
    assert manifest["source_count"] == 25
    assert len(sources) == 25
    assert len({source["id"] for source in sources}) == 25
    assert len({source["page_id"] for source in sources}) == 25
    assert len({source["source_sha256"] for source in sources}) == 25
    assert not ({source["source_sha256"] for source in sources} & {source["sha256"] for source in private_manifest["sources"]})
    assert all(len(source["source_sha256"]) == 64 for source in sources)
    assert all(source["license"] and source["author"] for source in sources)
    assert all(source["expectation"] in {"identify", "grounded_or_abstain"} for source in sources)
    assert all("model" not in manifest["selection_policy"]["annotation"].lower() or "never" in manifest["selection_policy"]["annotation"].lower() for _ in [0])

    categories = Counter(
        "board" if source["capture_kind"] == "handwritten_board"
        else "menu" if source["mode"] == "carta-vinos"
        else "multi" if source["ground_truth"].get("visible_bottles_estimate", 0) > 1
        else "single"
        for source in sources
    )
    assert categories == {"single": 11, "multi": 6, "menu": 5, "board": 3}
    assert sum(source["difficulty"] != "baseline" for source in sources) >= 15
    assert sum(bool(source["ground_truth"].get("expected_boxes")) for source in sources) >= 15
    assert sum(source["ground_truth"]["annotation_scope"] == "wine_identity" for source in sources) >= 6

    for source in sources:
        truth = source["ground_truth"]
        if source["mode"] == "etiqueta":
            assert truth["visible_bottles_estimate"] >= truth["expected_min_regions"]
            assert truth["detector_cap"] == 30
            for box in truth.get("expected_boxes", []):
                assert len(box) == 4
                x, y, width, height = box
                assert 0 <= x <= 1 and 0 <= y <= 1
                assert 0 < width <= 1 and 0 < height <= 1
                assert x + width <= 1.001 and y + height <= 1.001
        elif source["expectation"] == "identify":
            assert len(truth["expected_wines"]) >= 5
        else:
            assert truth["annotation_scope"] == "grounded_or_abstain"

    print(
        "Independent Matchrim ground-truth checks passed: "
        "25 distinct Commons sources (11 single, 6 multi, 5 menu, 3 board)"
    )


if __name__ == "__main__":
    main()
