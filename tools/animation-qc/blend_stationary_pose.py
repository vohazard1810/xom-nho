"""Blend a stationary pose into a fixed lower body without moving its feet."""

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--idle", type=Path, required=True)
    parser.add_argument("--pose", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--log", type=Path, required=True)
    args = parser.parse_args()

    idle = np.asarray(Image.open(args.idle).convert("RGBA"))
    pose = np.asarray(Image.open(args.pose).convert("RGBA"))
    if idle.shape != pose.shape or idle.shape[0] < 1026:
        raise ValueError("Both RGBA frames must have identical dimensions and height >= 1026")

    # Work in premultiplied RGB to avoid pulling hidden RGB from transparent pixels.
    out = pose.copy()
    for y in range(1016, 1025):
        idle_row = idle[y].astype(np.float64) / 255.0
        pose_row = pose[y].astype(np.float64) / 255.0
        weight = (y - 1015) / 10.0
        alpha = (1 - weight) * pose_row[:, 3] + weight * idle_row[:, 3]
        rgb_pre = ((1 - weight) * pose_row[:, :3] * pose_row[:, 3:4]
                   + weight * idle_row[:, :3] * idle_row[:, 3:4])
        rgb = np.divide(rgb_pre, alpha[:, None], out=np.zeros_like(rgb_pre), where=alpha[:, None] > 0)
        out[y, :, :3] = np.rint(rgb * 255).clip(0, 255).astype(np.uint8)
        out[y, :, 3] = np.rint(alpha * 255).clip(0, 255).astype(np.uint8)
    out[1025:] = idle[1025:]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(out, "RGBA").save(args.output)

    # Compare neighbor-row gradients in the transition against both unblended inputs.
    def gradients(frame):
        return np.abs(frame[1015:1025, :, :3].astype(np.int16)
                      - frame[1016:1026, :, :3].astype(np.int16)).mean(axis=2)

    visible = ((idle[1015:1025, :, 3] > 127) & (idle[1016:1026, :, 3] > 127)
               & (pose[1015:1025, :, 3] > 127))
    idle_grad, pose_grad, fixed_grad = map(gradients, (idle, pose, out))
    excess = (fixed_grad > idle_grad + 10) & (fixed_grad > pose_grad + 10) & visible
    seam_visible = visible[4]
    report = {
        "asset": str(args.output),
        "sha256": sha256(args.output),
        "source_sha256": {"idle": sha256(args.idle), "pose": sha256(args.pose)},
        "blend": "linear premultiplied RGBA; y=1016..1024, weight_idle=(y-1015)/10",
        "fixed_idle_from_y": 1025,
        "lower_body_pixel_match": bool(np.array_equal(out[1025:], idle[1025:])),
        "changed_pixels_below_y_1025": int(np.any(out[1025:] != idle[1025:], axis=2).sum()),
        "transition_gradient_exceeds_both_by_10_pixels": int(excess.sum()),
        "y_1019_to_1020_gradient_exceeds_both_by_10_pixels": int(excess[4].sum()),
        "y_1019_to_1020_mean_gradient": {
            "idle": round(float(idle_grad[4, seam_visible].mean()), 3),
            "pose": round(float(pose_grad[4, seam_visible].mean()), 3),
            "blended": round(float(fixed_grad[4, seam_visible].mean()), 3),
        },
    }
    args.log.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
