import argparse
import hashlib
import json
import subprocess
import urllib.parse
import urllib.request
from pathlib import Path

import cv2
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "qa" / "ground-truth" / "matchrim-independent-v2.json"
DEFAULT_OUTPUT = ROOT / "qa-artifacts" / "matchrim-independent-v2"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "Matchrim-QA/1.0 (qa@winerim.com)"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fetch_metadata(page_ids: list[int]) -> dict[str, dict]:
    params = urllib.parse.urlencode({
        "action": "query",
        "pageids": "|".join(str(page_id) for page_id in page_ids),
        "prop": "imageinfo",
        "iiprop": "url|size|extmetadata",
        "iiurlwidth": "1800",
        "format": "json",
    })
    request = urllib.request.Request(f"{COMMONS_API}?{params}", headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = json.load(response)
    return {str(page["pageid"]): page for page in payload["query"]["pages"].values()}


def download(url: str, target: Path) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=90) as response, target.open("wb") as stream:
        while chunk := response.read(1024 * 1024):
            stream.write(chunk)


def materialize_jpeg(source: Path, target: Path) -> None:
    subprocess.run(
        ["sips", "-s", "format", "jpeg", "-Z", "1800", str(source), "--out", str(target)],
        check=True,
        capture_output=True,
        text=True,
    )


def build_contact_sheet(scenes: list[dict], output: Path) -> Path:
    tile_width, tile_height, header_height = 300, 245, 30
    columns = 5
    rows = (len(scenes) + columns - 1) // columns
    sheet = np.full((rows * tile_height, columns * tile_width, 3), 245, dtype=np.uint8)
    for index, scene in enumerate(scenes):
        image = cv2.imread(scene["path"], cv2.IMREAD_COLOR)
        if image is None:
            raise RuntimeError(f"Could not decode {scene['path']}")
        available_height = tile_height - header_height
        scale = min(tile_width / image.shape[1], available_height / image.shape[0])
        resized = cv2.resize(
            image,
            (max(1, round(image.shape[1] * scale)), max(1, round(image.shape[0] * scale))),
            interpolation=cv2.INTER_AREA,
        )
        x = index % columns * tile_width
        y = index // columns * tile_height
        offset_x = x + (tile_width - resized.shape[1]) // 2
        offset_y = y + header_height + (available_height - resized.shape[0]) // 2
        sheet[offset_y:offset_y + resized.shape[0], offset_x:offset_x + resized.shape[1]] = resized
        label = f"{scene['id']} / {scene['capture_kind']}"
        cv2.putText(sheet, label[:42], (x + 5, y + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.36, (20, 20, 20), 1, cv2.LINE_AA)
    target = output / "contact-sheet.jpg"
    if not cv2.imwrite(str(target), sheet, [cv2.IMWRITE_JPEG_QUALITY, 88]):
        raise RuntimeError(f"Could not write {target}")
    return target


def build_dataset(manifest_path: Path, output: Path) -> dict:
    manifest = json.loads(manifest_path.read_text())
    sources_dir = output / "sources"
    scenes_dir = output / "scenes"
    sources_dir.mkdir(parents=True, exist_ok=True)
    scenes_dir.mkdir(parents=True, exist_ok=True)
    metadata_by_id = fetch_metadata([source["page_id"] for source in manifest["sources"]])
    scenes = []
    for source in manifest["sources"]:
        page = metadata_by_id[str(source["page_id"])]
        image_info = page["imageinfo"][0]
        license_name = image_info.get("extmetadata", {}).get("LicenseShortName", {}).get("value")
        if license_name != source["license"]:
            raise RuntimeError(f"License changed for {source['id']}: {license_name!r}")
        source_path = sources_dir / f"{source['id']}.source"
        if not source_path.exists() or sha256(source_path) != source["source_sha256"]:
            download(image_info["thumburl"], source_path)
        actual_source_hash = sha256(source_path)
        if actual_source_hash != source["source_sha256"]:
            raise RuntimeError(f"Source hash changed for {source['id']}: {actual_source_hash}")
        target = scenes_dir / f"{source['id']}.jpg"
        materialize_jpeg(source_path, target)
        image = cv2.imread(str(target), cv2.IMREAD_COLOR)
        if image is None:
            raise RuntimeError(f"Could not decode {target}")
        scenes.append({
            "id": source["id"],
            "source_id": source["id"],
            "source_page_id": source["page_id"],
            "source_title": page["title"],
            "source_url": image_info["descriptionurl"],
            "download_url": image_info["thumburl"],
            "license": source["license"],
            "author": source["author"],
            "source_sha256": actual_source_hash,
            "path": str(target),
            "sha256": sha256(target),
            "width": int(image.shape[1]),
            "height": int(image.shape[0]),
            "mode": source["mode"],
            "capture_kind": source["capture_kind"],
            "difficulty": source["difficulty"],
            "expectation": source["expectation"],
            "variant": "original",
            "variant_kind": "original",
            "annotation_provenance": manifest["selection_policy"]["annotation"],
            "ground_truth": source["ground_truth"],
        })
    if len(scenes) != manifest["source_count"]:
        raise RuntimeError(f"Expected {manifest['source_count']} sources, built {len(scenes)}")
    contact_sheet = build_contact_sheet(scenes, output)
    report = {
        "dataset_id": manifest["dataset_id"],
        "schema_version": manifest["schema_version"],
        "scene_count": len(scenes),
        "independent_capture_count": len(scenes),
        "controlled_variant_count": 0,
        "selection_policy": manifest["selection_policy"],
        "contact_sheet": str(contact_sheet),
        "scenes": scenes,
    }
    report_path = output / "materialization-report.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=True) + "\n")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Materialize the independent Matchrim v2 dataset.")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    report = build_dataset(args.manifest, args.output)
    print(json.dumps({
        "dataset_id": report["dataset_id"],
        "scene_count": report["scene_count"],
        "independent_capture_count": report["independent_capture_count"],
        "contact_sheet": report["contact_sheet"],
        "report": str(args.output / "materialization-report.json"),
    }, indent=2))


if __name__ == "__main__":
    main()
