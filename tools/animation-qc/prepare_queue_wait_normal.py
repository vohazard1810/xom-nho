#!/usr/bin/env python3
"""Build the four QUEUE_WAIT.normal candidate crops with a fixed idle lower body.

Source queue sprites use a different canvas than idle_open; normalize from measured
shoe extents before invoking the existing stationary-pose blend. No manifest edits.
"""

import hashlib
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "assets/characters/named/be_ti/candidates"
IDLE = BASE / "alternate_model_v1/idle_open.png"
SOURCE_QC = BASE / "queue-wait-normal-pilot-qc.json"
ORDER_MAP = BASE / "alternate_model_v1/order_four_frame_pilot/canvas_960x1704/order_canvas_mapping.json"
OUTPUT = BASE / "alternate_model_v1/queue_wait_normal_pilot"
NAMES = ["queue-wait-normal-01-clean-candidate.png"] + [
    f"queue-wait-normal-0{i}-candidate.png" for i in range(2, 5)
]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def extent(frame, roi):
    x0, y0, x1, y1 = roi
    yy, xx = np.where(frame[y0:y1, x0:x1, 3] > 127)
    if not len(xx):
        raise ValueError(f"No visible pixels in shoe ROI {roi}")
    bottom = yy.max()
    edge = xx[yy == bottom] + x0
    return {"x0": int(xx.min()+x0), "x1": int(xx.max()+x0),
            "bottom_x": int(np.median(edge)), "bottom_y": int(bottom+y0)}


def head_anchor(frame):
    # Topmost opaque hair pixel inside the head region; proposed bubble attachment.
    roi = frame[0:570, 100:980, 3] > 127
    ys, xs = np.where(roi)
    if not len(xs):
        raise ValueError("No visible hair pixels in head ROI")
    top = ys.min()
    return {"x": int(round(np.median(xs[ys <= top+8])+100)), "y": int(top)}


def main():
    qc = json.loads(SOURCE_QC.read_text(encoding="utf-8"))
    mapping = json.loads(ORDER_MAP.read_text(encoding="utf-8"))
    if qc["state"] != "QUEUE_WAIT" or qc["variant"] != "normal" or qc["frame_count"] != 4:
        raise ValueError("Unexpected source QC contract")
    if mapping["source_canvas"] != [1128, 1394] or mapping["stage_canvas"] != [960, 1704]:
        raise ValueError("Unexpected reviewed ORDER stage transform")
    sources = []
    for name, row in zip(NAMES, qc["frames"]):
        path = BASE / name
        if path.as_posix() != row["path"] and row["path"] != path.relative_to(ROOT).as_posix():
            raise ValueError("QC frame order differs from requested frames")
        if digest(path) != row["sha256"]:
            raise ValueError(f"Source SHA-256 mismatch: {path}")
        with Image.open(path) as image:
            if image.mode != "RGBA" or image.size != (1278, 1230):
                raise ValueError(f"Unexpected source mode/dimensions: {path}")
            sources.append(np.asarray(image.copy()))
    with Image.open(IDLE) as image:
        if image.mode != "RGBA" or image.size != (1128, 1394):
            raise ValueError("Unexpected idle model canvas")
        idle = np.asarray(image.copy())

    # Independent left/right shoe widths give a measurable registration scale.
    idle_shoes = [extent(idle, roi) for roi in ((350, 1200, 590, 1370), (600, 1200, 900, 1370))]
    source_shoes = [extent(sources[0], roi) for roi in ((400, 1080, 660, 1220), (660, 1080, 950, 1220))]
    ratios = [(a["x1"]-a["x0"]+1)/(b["x1"]-b["x0"]+1)
              for a, b in zip(idle_shoes, source_shoes)]
    scale = round(float(np.mean(ratios)), 2)
    offset_x = round(np.mean([a["bottom_x"] - scale*b["bottom_x"]
                              for a, b in zip(idle_shoes, source_shoes)]))
    offset_y = round(idle_shoes[0]["bottom_y"] - scale*source_shoes[0]["bottom_y"])
    if not 1.1 <= scale <= 1.2 or abs(offset_x) > 230 or abs(offset_y) > 70:
        raise ValueError("Shoe registration outside measured reference envelope")
    t = mapping["transform"]
    if (t["offset_x"], t["offset_y"], mapping["resized_dimensions"]) != (521, 942, [240, 297]):
        raise ValueError("Reviewed ORDER stage placement changed; check alignment before exporting")

    normalized_dir = OUTPUT / "normalized"
    blended_dir = OUTPUT / "blended"
    stage_dir = OUTPUT / "canvas_960x1704"
    crop_dir = OUTPUT / "actor_crop"
    for folder in (normalized_dir, blended_dir, stage_dir, crop_dir):
        folder.mkdir(parents=True, exist_ok=True)
    entries = []
    stages = []
    left = extent(idle, (350, 1200, 590, 1370))
    right = extent(idle, (600, 1200, 900, 1370))
    feet = {"x": (left["bottom_x"]+right["bottom_x"])/2,
            "y": left["bottom_y"]}
    for index, (name, frame) in enumerate(zip(NAMES, sources), 1):
        # Filter only source halo with alpha <= 5. Preserve real translucent edges.
        clean = frame.copy()
        clean[clean[:, :, 3] <= 5] = 0
        resized = Image.fromarray(clean, "RGBA").convert("RGBa").resize(
            (round(1278*scale), round(1230*scale)), Image.Resampling.LANCZOS).convert("RGBA")
        pose = Image.new("RGBA", (1128, 1394), (0, 0, 0, 0))
        pose.paste(resized, (offset_x, offset_y))
        normalized = normalized_dir / f"queue_wait_normal_{index:02d}.png"
        pose.save(normalized)
        blended = blended_dir / normalized.name
        log = blended_dir / f"queue_wait_normal_{index:02d}_blend_qc.json"
        subprocess.run([sys.executable, str(ROOT / "tools/animation-qc/blend_stationary_pose.py"),
                        "--idle", str(IDLE), "--pose", str(normalized),
                        "--output", str(blended), "--log", str(log)],
                       check=True, capture_output=True, text=True)
        blend_qc = json.loads(log.read_text(encoding="utf-8"))
        if not blend_qc["lower_body_pixel_match"] or blend_qc["changed_pixels_below_y_1025"]:
            raise AssertionError(f"Foot pixels not locked in frame {index}")
        with Image.open(blended) as image:
            merged = np.asarray(image.copy())
        if not np.array_equal(merged[1025:], idle[1025:]):
            raise AssertionError("Merged lower body differs from idle reference")
        source_anchor = {"feet": feet, "head": head_anchor(merged)}
        stage_anchors = {key: {"x": round(t["offset_x"]+p["x"]*t["scale_x"], 2),
                               "y": round(t["offset_y"]+p["y"]*t["scale_y"], 2)}
                         for key, p in source_anchor.items()}
        stage = Image.new("RGBA", (960, 1704), (0, 0, 0, 0))
        img = Image.fromarray(merged, "RGBA").convert("RGBa").resize(
            tuple(mapping["resized_dimensions"]), Image.Resampling.LANCZOS).convert("RGBA")
        stage.alpha_composite(img, (t["offset_x"], t["offset_y"]))
        stage_path = stage_dir / normalized.name
        stage.save(stage_path)
        stages.append(stage)
        entries.append({"index": index, "source": str((BASE/name).relative_to(ROOT)),
                        "source_sha256": digest(BASE/name),
                        "normalized": str(normalized.relative_to(ROOT)),
                        "normalized_sha256": digest(normalized),
                        "blended": str(blended.relative_to(ROOT)),
                        "blended_sha256": digest(blended),
                        "blend_log": str(log.relative_to(ROOT)),
                        "stage": str(stage_path.relative_to(ROOT)),
                        "stage_sha256": digest(stage_path),
                        "source_anchors": source_anchor, "anchors": stage_anchors,
                        "shoe_contacts_source": {"left": left, "right": right},
                        "blend_transition_gradient_exceeds_both_by_10_pixels":
                            blend_qc["transition_gradient_exceeds_both_by_10_pixels"],
                        "lower_body_changed_pixels": blend_qc["changed_pixels_below_y_1025"]})

    boxes = [im.getchannel("A").getbbox() for im in stages]
    crop_box = (min(b[0] for b in boxes), min(b[1] for b in boxes),
                max(b[2] for b in boxes), max(b[3] for b in boxes))
    x0, y0, x1, y1 = crop_box
    review = Image.new("RGB", (960, 455), "#f4eee3")
    for index, (entry, stage) in enumerate(zip(entries, stages)):
        crop = stage.crop(crop_box)
        path = crop_dir / f"queue_wait_normal_{index+1:02d}.png"
        crop.save(path)
        rebuilt = Image.new("RGBA", stage.size, (0, 0, 0, 0))
        rebuilt.paste(crop, (x0, y0))
        changed = int(np.any(np.asarray(rebuilt) != np.asarray(stage), axis=2).sum())
        if changed:
            raise AssertionError(f"Stage reconstruction differs by {changed} pixels")
        local = {key: {"x": round(a["x"]-x0, 2), "y": round(a["y"]-y0, 2)}
                 for key, a in entry["anchors"].items()}
        for key, a in entry["anchors"].items():
            if local[key]["x"]+x0 != a["x"] or local[key]["y"]+y0 != a["y"]:
                raise AssertionError(f"{key} anchor loses coordinates in crop")
        entry.update({"file": str(path.relative_to(ROOT)), "sha256": digest(path),
                      "crop_origin": {"x": x0, "y": y0}, "crop_size": [x1-x0, y1-y0],
                      "anchors_local": local, "reconstruction_changed_pixels": changed,
                      "status": "CANDIDATE_HUMAN_HARNESS_LOOP_REVIEW_PENDING"})
        preview = Image.new("RGBA", (960, 1704), "#dec9a7")
        preview.alpha_composite(stage)
        dr = ImageDraw.Draw(preview)
        for key, color in (("feet", "#d42b2b"), ("head", "#2986c5")):
            a = entry["anchors"][key]
            x, y = round(a["x"]), round(a["y"])
            dr.ellipse((x-9, y-9, x+9, y+9), outline=color, width=4)
        review.paste(preview.convert("RGB").resize((240, 426)), (index*240, 29))
        ImageDraw.Draw(review).text((index*240+8, 8), f"QUEUE_WAIT.normal {index+1}", fill="#30251d")
    overlay = OUTPUT / "queue_wait_normal_anchor_review.png"
    review.save(overlay)
    closeup = Image.new("RGBA", (4*284, 590), "#dec9a7")
    for index in range(4):
        crop = Image.open(crop_dir / f"queue_wait_normal_{index+1:02d}.png").convert("RGBA")
        closeup.alpha_composite(crop.resize((crop.width*2, crop.height*2),
                                               Image.Resampling.NEAREST), (index*284+5, 25))
        ImageDraw.Draw(closeup).text((index*284+5, 5), f"QUEUE_WAIT.normal {index+1}",
                                     fill="#24201b")
    closeup.convert("RGB").save(OUTPUT / "queue_wait_normal_frame_review.png")
    feet_stage = [e["anchors"]["feet"] for e in entries]
    if any(p != feet_stage[0] for p in feet_stage[1:]):
        raise AssertionError("Feet move between frames on stage")
    result = {"status": "CANDIDATE_PIXEL_AND_ANCHOR_QC_COMPLETE_HUMAN_REVIEW_PENDING",
              "state": "QUEUE_WAIT", "variant": "normal", "loop": True,
              "stage_canvas": [960, 1704], "source_canvas": [1278, 1230],
              "normalized_canvas": [1128, 1394],
              "source_qc_sha256": digest(SOURCE_QC), "idle_sha256": digest(IDLE),
              "order_stage_mapping_sha256": digest(ORDER_MAP),
              "shoe_registration": {"scale": scale, "offset_x": offset_x,
                                    "offset_y": offset_y, "left_right_width_ratios": ratios,
                                    "idle_shoes": idle_shoes, "source_shoes_frame_01": source_shoes,
                                    "alpha_noise_removed_at_or_below": 5},
              "stage_transform": t, "shared_crop_origin": {"x": x0, "y": y0},
              "shared_crop_size": [x1-x0, y1-y0],
              "anchor_semantics": {"feet": "midpoint of idle sole bottom X; Y of lower sole",
                                   "head": "median top opaque hair X within head ROI; bubble reference"},
              "preview_frame_durations_ms": [round(1000*x) for x in qc["preview"]["frame_durations_seconds"]],
              "preview_timing_note": "Existing source pilot hold/blink cadence; harness preview only, not production game timing.",
              "comparison": {"stage_reconstruction_changed_pixels_total": 0,
                             "anchor_coordinate_delta_px": 0, "feet_frame_delta_px": 0,
                             "changed_lower_body_pixels_total": 0},
              "production_manifest_updated": False, "production_state_pass": False,
              "anchor_visual_review": "NOT_EVALUATED", "harness_loop_human_review": "NOT_EVALUATED",
              "frames": entries}
    path = crop_dir / "queue_wait_normal_actor_crop_metadata.json"
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({"crop": crop_box, "frame_count": 4,
                      "shoe_registration": result["shoe_registration"],
                      "comparison": result["comparison"],
                      "blend_gradient_excess": [e["blend_transition_gradient_exceeds_both_by_10_pixels"]
                                                for e in entries]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
