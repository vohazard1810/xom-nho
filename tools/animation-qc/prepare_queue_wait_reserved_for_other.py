#!/usr/bin/env python3
"""Export four standing QUEUE_WAIT.reserved_for_other candidate frames for art review.

This script measures existing genuine RGBA PNGs, verifies their locked lower
body and exports exact actor crops; it never marks a generated pose as PASS.
"""

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "assets/characters/named/be_ti/candidates/alternate_model_v1"
SOURCE = BASE / "queue_wait_reserved_for_other_pilot"
MAPPING = BASE / "order_four_frame_pilot/canvas_960x1704/order_canvas_mapping.json"
IDLE = BASE / "idle_open.png"
STAGE_DIR = SOURCE / "canvas_960x1704"
CROP_DIR = SOURCE / "actor_crop"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def feet(frame):
    result = []
    for x0, y0, x1, y1 in ((350, 1200, 590, 1370), (600, 1200, 900, 1370)):
        ys, xs = np.where(frame[y0:y1, x0:x1, 3] > 127)
        bottom = ys.max()
        result.append({"x": int(np.median(xs[ys == bottom]+x0)), "y": int(bottom+y0)})
    return result


def head(frame):
    ys, xs = np.where(frame[:570, 100:980, 3] > 127)
    top = ys.min()
    return {"x": int(round(np.median(xs[ys <= top+8])+100)), "y": int(top)}


def main():
    mapping = json.loads(MAPPING.read_text(encoding="utf-8"))
    if mapping["source_canvas"] != [1128, 1394] or mapping["stage_canvas"] != [960, 1704]:
        raise ValueError("Unexpected stage mapping")
    t = mapping["transform"]
    with Image.open(IDLE) as im:
        idle = np.asarray(im.copy())
    if idle.shape != (1394, 1128, 4):
        raise ValueError("Idle RGBA canvas mismatch")
    sole = feet(idle)
    anchor_foot = {"x": (sole[0]["x"]+sole[1]["x"])/2, "y": sole[0]["y"]}
    STAGE_DIR.mkdir(parents=True, exist_ok=True)
    CROP_DIR.mkdir(parents=True, exist_ok=True)
    stages, entries = [], []
    for i in range(1, 5):
        raw = SOURCE / f"reserved_{i:02d}_raw.png"
        fixed = SOURCE / f"reserved_{i:02d}_fixed.png"
        blend_log = SOURCE / f"reserved_{i:02d}_blend_qc.json"
        log = json.loads(blend_log.read_text(encoding="utf-8"))
        if log["source_sha256"] != {"idle": digest(IDLE), "pose": digest(raw)} or log["sha256"] != digest(fixed):
            raise ValueError(f"Blend provenance hash mismatch: frame {i}")
        if (not log["lower_body_pixel_match"] or log["changed_pixels_below_y_1025"] or
                log["transition_gradient_exceeds_both_by_10_pixels"]):
            raise ValueError(f"Blend QC failed: frame {i}")
        with Image.open(fixed) as im:
            if im.mode != "RGBA" or im.size != (1128, 1394):
                raise ValueError(f"Expected RGBA normalized frame {i}")
            rgba = np.asarray(im.copy())
        if not np.array_equal(rgba[1025:], idle[1025:]) or feet(rgba) != sole:
            raise ValueError(f"Fixed feet mismatch: frame {i}")
        source_anchors = {"feet": anchor_foot, "head": head(rgba)}
        anchors = {key: {"x": round(t["offset_x"]+a["x"]*t["scale_x"], 2),
                         "y": round(t["offset_y"]+a["y"]*t["scale_y"], 2)}
                   for key, a in source_anchors.items()}
        resized = Image.fromarray(rgba, "RGBA").convert("RGBa").resize(
            tuple(mapping["resized_dimensions"]), Image.Resampling.LANCZOS).convert("RGBA")
        stage = Image.new("RGBA", (960, 1704), (0, 0, 0, 0))
        stage.alpha_composite(resized, (t["offset_x"], t["offset_y"]))
        # Frame 02 has a stray near-invisible alpha pixel 40 stage pixels away
        # from the actor. Strip only alpha <= 3 before finding the shared crop.
        stage_arr = np.asarray(stage).copy()
        stage_arr[stage_arr[:, :, 3] <= 3] = 0
        stage = Image.fromarray(stage_arr, "RGBA")
        stage_path = STAGE_DIR / f"reserved_{i:02d}.png"
        stage.save(stage_path)
        stages.append(stage)
        entries.append({"index": i, "raw": str(raw.relative_to(ROOT)), "raw_sha256": digest(raw),
                        "fixed": str(fixed.relative_to(ROOT)), "fixed_sha256": digest(fixed),
                        "blend_qc": str(blend_log.relative_to(ROOT)),
                        "stage": str(stage_path.relative_to(ROOT)),
                        "stage_sha256": digest(stage_path),
                        "source_anchors": source_anchors, "anchors": anchors,
                        "shoe_contacts": sole, "lower_body_changed_pixels": 0,
                        "blend_transition_gradient_excess": 0})
    bounds = [stage.getchannel("A").getbbox() for stage in stages]
    box = (min(b[0] for b in bounds), min(b[1] for b in bounds),
           max(b[2] for b in bounds), max(b[3] for b in bounds))
    x0, y0, x1, y1 = box
    sheet = Image.new("RGB", (4*284, 25+(y1-y0)*2), "#dec9a7")
    for row, stage in zip(entries, stages):
        crop = stage.crop(box)
        path = CROP_DIR / f"reserved_{row['index']:02d}.png"
        crop.save(path)
        rebuilt = Image.new("RGBA", stage.size, (0, 0, 0, 0))
        rebuilt.paste(crop, (x0, y0))
        changed = int(np.any(np.asarray(rebuilt) != np.asarray(stage), axis=2).sum())
        if changed:
            raise AssertionError(f"Stage reconstruction mismatch: frame {row['index']}")
        local = {key: {"x": round(a["x"]-x0, 2), "y": round(a["y"]-y0, 2)}
                 for key, a in row["anchors"].items()}
        for key, a in row["anchors"].items():
            if (abs(local[key]["x"]+x0-a["x"]) > 1e-8 or
                    abs(local[key]["y"]+y0-a["y"]) > 1e-8):
                raise AssertionError("Anchor offset mismatch")
        row.update({"file": str(path.relative_to(ROOT)), "sha256": digest(path),
                    "crop_origin": {"x": x0, "y": y0}, "crop_size": [x1-x0, y1-y0],
                    "anchors_local": local, "reconstruction_changed_pixels": changed,
                    "status": "CANDIDATE_ART_AND_HARNESS_REVIEW_PENDING"})
        small = crop.resize((crop.width*2, crop.height*2), Image.Resampling.NEAREST)
        sheet.paste(small.convert("RGBA"), ((row["index"]-1)*284+5, 25), mask=small.getchannel("A"))
        ImageDraw.Draw(sheet).text(((row["index"]-1)*284+5, 5),
                                   f"QUEUE_WAIT.reserved_for_other {row['index']}", fill="#24201b")
    sheet_path = SOURCE / "reserved_four_frame_review.png"
    sheet.save(sheet_path)
    if len({(e["anchors"]["feet"]["x"],e["anchors"]["feet"]["y"]) for e in entries}) != 1:
        raise AssertionError("Feet anchor moves between frames")
    metadata = {"status": "CANDIDATE_ART_REVIEW_PIXEL_AND_ANCHOR_QC_COMPLETE",
                "state": "QUEUE_WAIT", "variant": "reserved_for_other", "loop": True,
                "stage_canvas": [960, 1704], "source_canvas": [1128, 1394],
                "shared_crop_origin": {"x": x0, "y": y0},
                "shared_crop_size": [x1-x0, y1-y0],
                "order_stage_mapping_sha256": digest(MAPPING), "idle_sha256": digest(IDLE),
                "stage_alpha_noise_removed_at_or_below": 3,
                "anchor_semantics": {"feet": "midpoint X of idle shoe-bottom contacts and Y of lower sole",
                                     "head": "top visible hair and median X within top head ROI"},
                "preview_frame_durations_ms": [2200, 80, 80, 100],
                "preview_timing_note": "Pilot comparison copied from QUEUE_WAIT.normal; harness preview only, NOT approved runtime timing.",
                "comparison": {"stage_reconstruction_changed_pixels_total": 0,
                               "anchor_coordinate_delta_px": 0, "feet_frame_delta_px": 0,
                               "changed_lower_body_pixels_total": 0},
                "human_art_review": "NOT_EVALUATED", "human_anchor_review": "NOT_EVALUATED",
                "human_harness_loop_review": "NOT_EVALUATED", "production_manifest_updated": False,
                "production_state_pass": False, "frames": entries}
    (CROP_DIR / "reserved_actor_crop_metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({"crop": box, "frames": len(entries), "comparison": metadata["comparison"]}))


if __name__ == "__main__":
    main()
