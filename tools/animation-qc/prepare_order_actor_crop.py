#!/usr/bin/env python3
"""Trim a shared Bé Tí ORDER actor crop from approved 960x1704 stage candidates.

This never edits the manifest. Every output can be composited back at its
recorded origin to reproduce the stage PNG byte-for-byte in RGBA pixel space.
"""

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    mapping_path = args.stage_dir / "order_canvas_mapping.json"
    review_path = args.stage_dir / "order_anchor_human_review.json"
    mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
    review = json.loads(review_path.read_text(encoding="utf-8"))
    if digest(mapping_path) != review["reviewed_mapping_sha256"]:
        raise ValueError("Approved mapping SHA-256 has changed")
    if digest(args.stage_dir / "order_canvas_anchor_detail.png") != review["reviewed_overlay_sha256"]:
        raise ValueError("Approved anchor overlay SHA-256 has changed")
    if review["status"] != "PASS_SEMANTIC_ANCHORS_ORDER_FOUR_FRAMES":
        raise ValueError("Missing human semantic anchor approval")
    if len(mapping["frames"]) != 4 or len(review["frames"]) != 4:
        raise ValueError("Expected exactly four ORDER frames")

    images = []
    for row, approved in zip(mapping["frames"], review["frames"]):
        path = Path(row["output"])
        if not path.is_absolute() and not path.exists():
            path = args.stage_dir / path.name
        expected = row["output_sha256"]
        if digest(path) != expected or approved["stage_output_sha256"] != expected:
            raise ValueError(f"Approved stage frame SHA-256 differs: {path}")
        with Image.open(path) as im:
            if im.mode != "RGBA" or im.size != (960, 1704):
                raise ValueError(f"Expected RGBA stage canvas: {path}")
            images.append((row, im.copy()))

    # Compute ONE union bbox for all four frames. Per-frame trimming can move
    # actor edges despite stationary feet and changes the layout origin.
    bounds = [im.getchannel("A").getbbox() for _, im in images]
    if any(b is None for b in bounds):
        raise ValueError("Empty actor frame")
    x0 = min(b[0] for b in bounds)
    y0 = min(b[1] for b in bounds)
    x1 = max(b[2] for b in bounds)
    y1 = max(b[3] for b in bounds)
    crop_box = (x0, y0, x1, y1)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    entries = []
    for row, stage in images:
        crop = stage.crop(crop_box)
        output = args.output_dir / Path(row["output"]).name
        crop.save(output)
        reconstructed = Image.new("RGBA", stage.size, (0, 0, 0, 0))
        reconstructed.paste(crop, (x0, y0))
        diff = np.asarray(reconstructed).astype(np.int16) - np.asarray(stage).astype(np.int16)
        changed = int(np.any(diff != 0, axis=2).sum())
        if changed:
            raise AssertionError(f"Crop/stage pixel mismatch on {output}: {changed}")

        absolute = row["stage_anchors"]
        local = {key: ({"x": round(pt["x"] - x0, 2), "y": round(pt["y"] - y0, 2)}
                       if pt else None) for key, pt in absolute.items()}
        for key, pt in absolute.items():
            if pt and (abs(local[key]["x"] + x0 - pt["x"]) > 1e-8
                       or abs(local[key]["y"] + y0 - pt["y"]) > 1e-8):
                raise AssertionError(f"Anchor projection mismatch: {key}")
        entries.append({"index": row["index"], "file": output.as_posix(),
                        "sha256": digest(output), "stage_source_sha256": row["output_sha256"],
                        "crop_origin": {"x": x0, "y": y0},
                        "crop_size": [x1 - x0, y1 - y0],
                        "anchors": absolute, "anchors_local": local,
                        "reconstruction_changed_pixels": changed,
                        "anchor_coordinate_delta_px": 0,
                        "status": "CANDIDATE_ACTOR_CROP_HUMAN_RUNTIME_REVIEW_PENDING"})
    feet = {(item["anchors"]["feet"]["x"], item["anchors"]["feet"]["y"]) for item in entries}
    if len(feet) != 1:
        raise AssertionError("Feet anchor moves between frames")
    out = {"status": "CANDIDATE_ACTOR_CROP_PIXEL_AND_ANCHOR_EQUIVALENCE_VERIFIED",
           "state": "ORDER", "loop": False, "stage_canvas": [960, 1704],
           "shared_crop_origin": {"x": x0, "y": y0},
           "shared_crop_size": [x1 - x0, y1 - y0],
           "reviewed_mapping_sha256": digest(mapping_path),
           "reviewed_anchor_evidence_sha256": digest(review_path),
           "comparison": {"stage_reconstruction_changed_pixels_total": 0,
                          "anchor_coordinate_delta_px": 0,
                          "feet_frame_delta_px": 0},
           "integration": "Harness candidate mode places PNG at shared_crop_origin/size relative to 960x1704 stage, outside the existing actor-box transform.",
           "preview_cadence": "Harness's existing 140ms interval; preview only, not approved game timing.",
           "production_manifest_updated": False, "production_state_pass": False,
           "frames": entries}
    (args.output_dir / "order_actor_crop_metadata.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"crop": list(crop_box), "frame_count": len(entries),
                      "reconstruction_changed_pixels": 0, "anchor_coordinate_delta_px": 0,
                      "feet_frame_delta_px": 0}, ensure_ascii=False))


if __name__ == "__main__":
    main()
