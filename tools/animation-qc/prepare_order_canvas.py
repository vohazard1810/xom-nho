#!/usr/bin/env python3
"""Prepare four reviewed ORDER candidates on a 960x1704 stage canvas.

The exports are stage-composited candidates. They must not be fed back into the
current harness's small actor <img>, which would scale them a second time.
"""

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

NAMES = (
    "order_01_mid_raise.png", "order_02_raise_approved.png",
    "order_03_speaking.png", "order_04_expectant.png",
)
STAGE = (960, 1704)
ACTOR_WIDTH = 240  # 25% of stage width, matching the existing harness box.
GROUND_Y = 1227     # round(72% of 1704), matching the harness floor guide.
ACTOR_X = 653       # round(68% of 960), the existing NPC stage position.
LEFT_SHOE = (390, 1170, 590, 1380)
RIGHT_SHOE = (595, 1170, 840, 1380)
PALM_ROIS = ((480, 615, 615, 735), (370, 545, 510, 650),
             (370, 545, 510, 650), (370, 545, 510, 650))
HEAD_ROI = (250, 20, 900, 570)


def hash_file(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def shoe_contact(rgba, roi):
    x0, y0, x1, y1 = roi
    yy, xx = np.where(rgba[y0:y1, x0:x1, 3] > 127)
    if len(xx) == 0:
        raise ValueError(f"No opaque shoe pixels inside {roi}")
    bottom = yy.max()
    edge = xx[yy == bottom] + x0
    return {"x": int(np.median(edge)), "y": int(bottom + y0),
            "bottom_x_range": [int(edge.min()), int(edge.max())]}


def head_top(rgba):
    x0, y0, x1, y1 = HEAD_ROI
    yy, xx = np.where(rgba[y0:y1, x0:x1, 3] > 127)
    if len(xx) == 0:
        raise ValueError("Head ROI has no visible pixels")
    # X center of the silhouette and highest visible Y. This is a proposed
    # speech-bubble reference point above the hair, not a rig pivot.
    return {"x": int(round((xx.min() + xx.max()) / 2 + x0)),
            "y": int(yy.min() + y0), "method": "alpha silhouette head ROI"}


def palm_center(rgba, roi):
    x0, y0, x1, y1 = roi
    crop = rgba[y0:y1, x0:x1]
    r, g, b, alpha = [crop[:, :, i].astype(np.int16) for i in range(4)]
    skin = ((alpha > 220) & (r > 170) & (g > 95) & (g < 225)
            & (b > 70) & (b < 200) & (r - g > 20) & (g - b > 12))
    yy, xx = np.where(skin)
    if len(xx) < 200:
        raise ValueError(f"Palm ROI has too few skin pixels: {roi}, {len(xx)}")
    return {"x": int(np.median(xx) + x0), "y": int(np.median(yy) + y0),
            "skin_pixel_count": int(len(xx)), "method": "skin median in palm ROI"}


def project(point, dx, dy, sx, sy):
    return {"x": round(dx + point["x"] * sx, 2),
            "y": round(dy + point["y"] * sy, 2)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    qc = json.loads((args.input_dir / "order_four_frame_qc.json").read_text(encoding="utf-8"))
    if qc["frame_order"] != list(NAMES):
        raise ValueError("Frame order differs from reviewed ORDER candidate")

    source = []
    for name in NAMES:
        path = args.input_dir / name
        if hash_file(path) != qc["frame_reviews"][name]["sha256"]:
            raise ValueError(f"Candidate SHA-256 differs from reviewed QC: {path}")
        with Image.open(path) as img:
            if img.format != "PNG" or img.mode != "RGBA" or img.size != (1128, 1394):
                raise ValueError(f"Unexpected source format/canvas for {path}")
            rgba = np.asarray(img.copy())
        source.append((path, rgba))

    # All source frames must share the actual shoe pixels already approved on
    # the manual 120x124 viewer. Refuse to fit if that invariant changes.
    for _, rgba in source[1:]:
        if not np.array_equal(rgba[1025:], source[0][1][1025:]):
            raise ValueError("Source feet differ below Y=1025")

    contacts = [(shoe_contact(rgba, LEFT_SHOE), shoe_contact(rgba, RIGHT_SHOE))
                for _, rgba in source]
    if any(pair != contacts[0] for pair in contacts[1:]):
        raise ValueError("Source shoe contacts differ across frames")

    src_foot = {"x": (contacts[0][0]["x"] + contacts[0][1]["x"]) / 2,
                "y": contacts[0][0]["y"]}
    resize_w = ACTOR_WIDTH
    resize_h = round(1394 * resize_w / 1128)
    sx, sy = resize_w / 1128, resize_h / 1394
    dx = round(ACTOR_X - src_foot["x"] * sx)
    dy = round(GROUND_Y - src_foot["y"] * sy)
    assert 0 <= dx and 0 <= dy and dx + resize_w <= STAGE[0] and dy + resize_h <= STAGE[1]

    result = {"status": "CANDIDATE_CANVAS_FIT_ANCHORS_REVIEW_PENDING",
              "stage_canvas": list(STAGE), "source_canvas": [1128, 1394],
              "actor_width": ACTOR_WIDTH, "resized_dimensions": [resize_w, resize_h],
              "transform": {"scale_x": sx, "scale_y": sy, "offset_x": dx, "offset_y": dy,
                            "source_foot_reference": src_foot, "target_ground_y": GROUND_Y,
                            "target_actor_x": ACTOR_X},
              "anchor_semantics": {
                  "feet": "midpoint X of measured shoe-bottom medians; Y of lower shoe sole",
                  "head": "top of visible hair silhouette, X center of head ROI; bubble reference",
                  "hand_right": "median opaque skin pixel in raised palm ROI; candidate gesture contact",
                  "receive_point": "not applicable to ORDER"},
              "anchor_review": "PROPOSED_PIXEL_MEASURED_NOT_HUMAN_APPROVED",
              "production_manifest_updated": False,
              "warning": "Full-stage PNGs are composition previews, not drop-in actor-box sprites.",
              "frames": []}
    thumbnails = []
    details = []
    for i, ((path, rgba), (left, right)) in enumerate(zip(source, contacts)):
        anchors = {"feet": dict(src_foot), "head": head_top(rgba),
                   "hand_right": palm_center(rgba, PALM_ROIS[i]),
                   "receive_point": None}
        stage_anchors = {key: project(point, dx, dy, sx, sy) if point else None
                         for key, point in anchors.items()}
        original = Image.fromarray(rgba, "RGBA")
        # RGBa is premultiplied alpha in Pillow; resample without halo RGB.
        resized = original.convert("RGBa").resize((resize_w, resize_h), Image.Resampling.LANCZOS).convert("RGBA")
        stage = Image.new("RGBA", STAGE, (0, 0, 0, 0))
        stage.alpha_composite(resized, (dx, dy))
        output = args.output_dir / path.name
        stage.save(output)

        # Overlay is evidence for checking proposed anchors, not a sprite.
        preview = Image.new("RGBA", STAGE, "#d8c7ae")
        ImageDraw.Draw(preview).line((0, GROUND_Y, STAGE[0], GROUND_Y), fill="#a33838", width=3)
        preview.alpha_composite(stage)
        draw = ImageDraw.Draw(preview)
        for key, color in (("feet", "#e94242"), ("head", "#25a8e0"), ("hand_right", "#38d173")):
            pt = stage_anchors[key]
            x, y = round(pt["x"]), round(pt["y"])
            draw.ellipse((x - 9, y - 9, x + 9, y + 9), outline=color, width=4)
            draw.text((x + 12, y - 10), key, fill=color)
        preview_rgb = preview.convert("RGB")
        thumbnails.append(preview_rgb.resize((240, 426), Image.Resampling.LANCZOS))
        details.append(preview_rgb.crop((510, 910, 790, 1270)))
        result["frames"].append({
            "index": i + 1, "source": path.as_posix(), "source_sha256": hash_file(path),
            "output": output.as_posix(), "output_sha256": hash_file(output),
            "shoe_contact_source": {"left": left, "right": right},
            "source_anchors": anchors, "stage_anchors": stage_anchors,
            "status": "PIXELS_MEASURED_SEMANTIC_REVIEW_PENDING"})

    # This is a structural gate for the export, not a human/runtime PASS.
    feet = [row["stage_anchors"]["feet"] for row in result["frames"]]
    if len({(f["x"], f["y"]) for f in feet}) != 1:
        raise AssertionError("Projected feet anchor drift")
    result["feet_stage_consistency_px"] = 0
    sheet = Image.new("RGB", (960, 455), "#f4eee3")
    for i, thumb in enumerate(thumbnails):
        sheet.paste(thumb, (i * 240, 29))
        ImageDraw.Draw(sheet).text((i * 240 + 10, 8), f"ORDER {i+1}", fill="#30251d")
    sheet.save(args.output_dir / "order_canvas_anchor_overlay.png")
    detail = Image.new("RGB", (1120, 390), "#f4eee3")
    for i, crop in enumerate(details):
        detail.paste(crop, (i * 280, 30))
        ImageDraw.Draw(detail).text((i * 280 + 8, 8), f"ORDER {i+1}: head / hand_right / feet", fill="#30251d")
    detail.save(args.output_dir / "order_canvas_anchor_detail.png")
    log = args.output_dir / "order_canvas_mapping.json"
    log.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    # Explicitly non-drop-in: the existing harness wraps sprites in a smaller
    # actor box, and setting `file` to a full-stage PNG there would double-fit.
    fragment = {
        "state": "ORDER", "frame_count": 4, "loop": False,
        "status": "CANDIDATE_NOT_READY_FOR_PRODUCTION_MANIFEST",
        "reason": "Stage-composited previews need actor-box/origin integration and semantic review",
        "frames": [
            {"index": row["index"], "source_file": row["source"],
             "stage_preview_file": row["output"], "anchors_proposed": row["stage_anchors"],
             "status": "ANCHORS_REVIEW_PENDING"}
            for row in result["frames"]
        ],
    }
    (args.output_dir / "order_manifest_candidate.json").write_text(
        json.dumps(fragment, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(source)} stage PNGs, anchor overlay, and {log}")


if __name__ == "__main__":
    main()
