"""Render an index of downloaded QA sources for visual triage, not model scoring."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("manifest", type=Path)
args = parser.parse_args()
sources = json.loads(args.manifest.read_text())["sources"]
for batch in range(0, len(sources), 9):
    sheet = Image.new("RGB", (1500, 1140), "#ffffff")
    draw = ImageDraw.Draw(sheet)
    for index, source in enumerate(sources[batch:batch + 9]):
        x, y = index % 3 * 500, index // 3 * 380
        with Image.open(source["path"]) as original:
            thumb = ImageOps.contain(original.convert("RGB"), (490, 335))
            sheet.paste(thumb, (x + (500 - thumb.width) // 2, y + 32))
        draw.text((x + 8, y + 8), source["id"], fill="black")
    sheet.save(args.manifest.parent / f"contact-{batch // 9 + 1}.jpg", quality=90)
