import argparse
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

import cv2
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "qa" / "ground-truth" / "matchrim-v1.json"
DEFAULT_OUTPUT = ROOT / "qa-artifacts" / "matchrim-ground-truth-v1"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_source(path: Path) -> np.ndarray:
    if path.suffix.lower() in {".heic", ".heif"}:
        with tempfile.TemporaryDirectory(prefix="matchrim-gt-") as temporary:
            converted = Path(temporary) / "source.jpg"
            subprocess.run(
                ["sips", "-s", "format", "jpeg", str(path), "--out", str(converted)],
                check=True,
                capture_output=True,
                text=True,
            )
            image = cv2.imread(str(converted), cv2.IMREAD_COLOR)
    else:
        image = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if image is None:
        raise RuntimeError(f"Could not decode {path}")
    return image


def resize_max(image: np.ndarray, max_dimension: int) -> np.ndarray:
    height, width = image.shape[:2]
    scale = min(1.0, max_dimension / max(height, width))
    if scale == 1.0:
        return image.copy()
    return cv2.resize(
        image,
        (max(1, round(width * scale)), max(1, round(height * scale))),
        interpolation=cv2.INTER_AREA,
    )


def apply_transform(image: np.ndarray, variant: dict) -> np.ndarray:
    transform = variant.get("transform", {})
    variant_id = variant["id"]
    if variant_id == "original":
        return image.copy()
    if variant_id == "low-light":
        brightness = float(transform["brightness"])
        contrast = float(transform["contrast"])
        return np.clip((image.astype(np.float32) - 127.5) * contrast * brightness + 127.5 * brightness, 0, 255).astype(np.uint8)
    if variant_id == "uneven-light":
        height, width = image.shape[:2]
        left = float(transform["gradient_min"])
        right = float(transform["gradient_max"])
        horizontal = np.linspace(left, right, width, dtype=np.float32)
        vertical = np.linspace(0.92, 1.06, height, dtype=np.float32)[:, None]
        mask = np.clip(vertical * horizontal[None, :], 0.35, 1.25)[..., None]
        return np.clip(image.astype(np.float32) * mask, 0, 255).astype(np.uint8)
    if variant_id == "perspective":
        height, width = image.shape[:2]
        left = float(transform["inset_left"])
        right = float(transform["inset_right"])
        source = np.float32([[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]])
        target = np.float32([
            [width * left, height * 0.025],
            [width * (1 - right), 0],
            [width * (1 - left), height * 0.975],
            [width * right, height - 1],
        ])
        matrix = cv2.getPerspectiveTransform(source, target)
        return cv2.warpPerspective(image, matrix, (width, height), borderMode=cv2.BORDER_REPLICATE)
    if variant_id == "small-text":
        return resize_max(image, int(transform["max_dimension"]))
    if variant_id == "illegible":
        reduced = resize_max(image, int(transform["max_dimension"]))
        sigma = float(transform["blur_sigma"])
        return cv2.GaussianBlur(reduced, (0, 0), sigmaX=sigma, sigmaY=sigma)
    raise ValueError(f"Unknown variant {variant_id}")


def build_contact_sheet(scenes: list[dict], output: Path) -> Path:
    variants = []
    sources = []
    for scene in scenes:
        if scene["variant"] not in variants:
            variants.append(scene["variant"])
        if scene["source_id"] not in sources:
            sources.append(scene["source_id"])
    tile_width = 240
    tile_height = 210
    header_height = 32
    sheet = np.full(
        (len(sources) * tile_height, len(variants) * tile_width, 3),
        245,
        dtype=np.uint8,
    )
    by_key = {(scene["source_id"], scene["variant"]): scene for scene in scenes}
    for row, source_id in enumerate(sources):
        for column, variant_id in enumerate(variants):
            scene = by_key[(source_id, variant_id)]
            image = cv2.imread(scene["path"], cv2.IMREAD_COLOR)
            available_height = tile_height - header_height
            scale = min(tile_width / image.shape[1], available_height / image.shape[0])
            resized = cv2.resize(
                image,
                (max(1, round(image.shape[1] * scale)), max(1, round(image.shape[0] * scale))),
                interpolation=cv2.INTER_AREA,
            )
            x = column * tile_width
            y = row * tile_height
            offset_x = x + (tile_width - resized.shape[1]) // 2
            offset_y = y + header_height + (available_height - resized.shape[0]) // 2
            sheet[offset_y:offset_y + resized.shape[0], offset_x:offset_x + resized.shape[1]] = resized
            label = f"{source_id} / {variant_id}"
            cv2.putText(sheet, label[:34], (x + 6, y + 21), cv2.FONT_HERSHEY_SIMPLEX, 0.39, (25, 25, 25), 1, cv2.LINE_AA)
    target = output / "contact-sheet.jpg"
    if not cv2.imwrite(str(target), sheet, [cv2.IMWRITE_JPEG_QUALITY, 88]):
        raise RuntimeError(f"Could not write {target}")
    return target


def build_dataset(manifest_path: Path, output: Path) -> dict:
    manifest = json.loads(manifest_path.read_text())
    output.mkdir(parents=True, exist_ok=True)
    scene_dir = output / "scenes"
    scene_dir.mkdir(parents=True, exist_ok=True)
    scenes = []

    for source in manifest["sources"]:
        source_path = Path(source["path"])
        if not source_path.exists():
            raise FileNotFoundError(source_path)
        actual_hash = sha256(source_path)
        if actual_hash != source["sha256"]:
            raise RuntimeError(f"Source hash changed for {source['id']}: {actual_hash}")
        image = load_source(source_path)
        for variant in manifest["variants"]:
            scene_id = f"{source['id']}--{variant['id']}"
            transformed = apply_transform(image, variant)
            target = scene_dir / f"{scene_id}.jpg"
            quality = int(variant.get("transform", {}).get("jpeg_quality", 90))
            if not cv2.imwrite(str(target), transformed, [cv2.IMWRITE_JPEG_QUALITY, quality]):
                raise RuntimeError(f"Could not write {target}")
            scenes.append({
                "id": scene_id,
                "source_id": source["id"],
                "source_path": str(source_path),
                "source_sha256": actual_hash,
                "path": str(target),
                "sha256": sha256(target),
                "mode": source["mode"],
                "capture_kind": source["capture_kind"],
                "variant": variant["id"],
                "variant_kind": variant["kind"],
                "difficulty": variant["difficulty"],
                "expectation": variant["expectation"],
                "width": int(transformed.shape[1]),
                "height": int(transformed.shape[0]),
                "ground_truth": source["ground_truth"],
                "annotation_provenance": source["annotation_provenance"],
            })

    if len(scenes) != manifest["scene_count"]:
        raise RuntimeError(f"Expected {manifest['scene_count']} scenes, built {len(scenes)}")
    contact_sheet = build_contact_sheet(scenes, output)
    report = {
        "dataset_id": manifest["dataset_id"],
        "schema_version": manifest["schema_version"],
        "scene_count": len(scenes),
        "independent_capture_count": len(manifest["sources"]),
        "controlled_variant_count": len(scenes) - len(manifest["sources"]),
        "contact_sheet": str(contact_sheet),
        "annotation_policy": manifest["annotation_policy"],
        "scenes": scenes,
    }
    report_path = output / "materialization-report.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=True) + "\n")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Materialize the Matchrim 30-scene ground-truth dataset.")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    report = build_dataset(args.manifest, args.output)
    print(json.dumps({
        "dataset_id": report["dataset_id"],
        "scene_count": report["scene_count"],
        "independent_capture_count": report["independent_capture_count"],
        "controlled_variant_count": report["controlled_variant_count"],
        "report": str(args.output / "materialization-report.json"),
        "contact_sheet": report["contact_sheet"],
    }, indent=2))


if __name__ == "__main__":
    main()
