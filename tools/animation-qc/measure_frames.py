#!/usr/bin/env python3
"""Measure objective PNG properties only. Never invent semantic anchors."""
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path
from PIL import Image

# Ignore near-invisible encoder noise for the scale screen only. Keep the raw
# alpha bbox and the source PNG unchanged for transparency auditing.
VISIBLE_ALPHA_MIN = 10

def measure(path: Path):
    with Image.open(path) as source:
        if source.format != "PNG" or not ("A" in source.getbands() or "transparency" in source.info):
            raise ValueError(f"{path}: PNG source has no real alpha/transparency (mode={source.mode})")
        im=source.convert("RGBA")
    alpha=im.getchannel("A")
    bbox=alpha.getbbox()
    if bbox is None:
        raise ValueError(f"{path}: completely transparent PNG")
    visible_bbox=alpha.point(lambda value: 255 if value>VISIBLE_ALPHA_MIN else 0).getbbox()
    if visible_bbox is None:
        raise ValueError(f"{path}: no visible pixels above alpha {VISIBLE_ALPHA_MIN}")
    return {
        "file": path.as_posix(),
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "width": im.width,
        "height": im.height,
        "has_alpha": True,
        "alpha_bbox": list(bbox) if bbox else None,
        "alpha_bbox_visible": list(visible_bbox),
        "visible_alpha_min": VISIBLE_ALPHA_MIN,
        "opaque_pixel_count": sum(1 for v in alpha.get_flattened_data() if v),
        "semantic_anchors": {
            "head": None, "hand_right": None, "feet": None, "receive_point": None
        },
        "status": "PIXELS_MEASURED_ANCHORS_PENDING"
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("-o","--output",default="tools/animation-qc/pixel_measurements.json")
    args=ap.parse_args()
    out=[measure(Path(p)) for p in args.files]
    Path(args.output).write_text(json.dumps(out,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"Wrote {len(out)} measurements to {args.output}")

if __name__=="__main__": main()
