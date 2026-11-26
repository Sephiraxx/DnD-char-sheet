"""Convert a legacy miniature pack to the board's native density before shipping it."""
import argparse
import json
from pathlib import Path
import re

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DENSITY = int(re.search(r"const pixelsPerSquare = (\d+);", (ROOT / "miniature-mesh.js").read_text(encoding="utf-8"))[1])


def convert(source, output):
    entries = json.loads((source / "index.json").read_text(encoding="utf-8"))
    output.mkdir(parents=True, exist_ok=True)
    images = {}
    for entry in entries:
        ratio = DENSITY / entry["pixelsPerSquare"]
        for frame in [entry, *entry.get("rotations", {}).values()] + ([entry["fixture"]] if "fixture" in entry else []):
            name = frame["image"]
            if not re.fullmatch(r"[A-Za-z0-9_-]+\.png", name):
                raise ValueError(f"Invalid sprite filename: {name}")
            if name not in images:
                with Image.open(source / name) as image:
                    size = tuple(max(1, round(side * ratio)) for side in image.size)
                    image.convert("RGBA").resize(size, Image.Resampling.LANCZOS).save(output / name, optimize=True)
                images[name] = ratio
            if images[name] != ratio:
                raise ValueError(f"Inconsistent pixel density for {name}")
            frame["anchor"] = {axis: value * ratio for axis, value in frame["anchor"].items()}
        entry["pixelsPerSquare"] = DENSITY
    (output / "index.json").write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return len(images)


if __name__ == "__main__":
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("source", type=Path)
    args.add_argument("output", type=Path)
    paths = args.parse_args()
    if paths.source.resolve() == paths.output.resolve():
        args.error("Use a separate output folder")
    print(f"Converted {convert(paths.source, paths.output)} sprites to {DENSITY} px/square")
