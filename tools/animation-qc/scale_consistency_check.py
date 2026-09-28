#!/usr/bin/env python3
"""Report bbox drift from independently measured PNGs; never grant the asset gate PASS."""
import argparse
import hashlib
import json
from pathlib import Path

STATIONARY = {"QUEUE_WAIT", "ORDER", "SPECIAL_REQUEST", "CONFLICT_WAIT", "RECEIVE", "REFUSED", "REACT", "PAY"}
LOCOMOTION = {"WALK", "ARRIVE", "LEAVE"}
HEIGHT_TOLERANCE_PCT = WIDTH_TOLERANCE_PCT = 3.0
LOCOMOTION_HEIGHT_TOLERANCE_PCT = 6.0


def frame_groups(character):
    for state, spec in character["states"].items():
        if "frames_by_variant" in spec:
            for variant, frames in spec["frames_by_variant"].items():
                yield state, f"{state}:{variant}", frames, spec.get("frame_count_per_variant")
        else:
            yield state, state, spec.get("frames", []), spec.get("frame_count")


def compare(entries, reference, axis, tolerance, kind):
    ref = reference[axis]
    return [{"type": kind, "reference": reference["label"], "frame": item["label"],
             "reference_px": ref, "actual_px": item[axis],
             "difference_pct": round(abs(item[axis] - ref) / ref * 100, 2)}
            for item in entries if abs(item[axis] - ref) / ref * 100 > tolerance]


def check(manifest, measurements, character, manifest_path):
    if character not in manifest.get("characters", {}):
        return {"status": "BLOCKED", "blockers": [f"Unknown character: {character}"], "issues": []}
    roots = [Path.cwd(), manifest_path.parent]
    indexed = {}
    blockers = []
    warnings = []
    for row in measurements:
        path = row.get("file")
        if not isinstance(path, str) or path in indexed:
            blockers.append(f"Duplicate or invalid measurement file: {path}")
        else:
            indexed[path] = row
    grouped = {}
    used = set()
    for state, label, frames, expected in frame_groups(manifest["characters"][character]):
        if expected is not None and len(frames) != expected:
            blockers.append(f"{label}: expected {expected} frames, found {len(frames)}")
        if not frames:
            blockers.append(f"{label}: no frames")
        entries = []
        seen_indices = set()
        for frame in frames:
            name = frame.get("file")
            index = frame.get("index")
            if not isinstance(name, str) or index is None or index in seen_indices:
                blockers.append(f"{label}: invalid file/index or duplicate index: {index}")
                continue
            seen_indices.add(index)
            row = indexed.get(name)
            if row is None:
                blockers.append(f"{label}[{index}]: missing pixel measurement for {name}")
                continue
            if name in used:
                blockers.append(f"{label}[{index}]: reused measurement file {name}")
            used.add(name)
            path = next((root / name for root in roots if (root / name).is_file()), None)
            if path is None:
                blockers.append(f"{label}[{index}]: PNG missing: {name}")
                continue
            if not row.get("has_alpha") or row.get("status") != "PIXELS_MEASURED_ANCHORS_PENDING":
                blockers.append(f"{label}[{index}]: invalid pixel measurement status/alpha")
                continue
            digest = row.get("sha256")
            if not digest or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
                blockers.append(f"{label}[{index}]: PNG hash missing or changed: {name}")
                continue
            raw_bbox = row.get("alpha_bbox")
            bbox = row.get("alpha_bbox_visible", raw_bbox)
            if "alpha_bbox_visible" in row and row.get("visible_alpha_min") != 10:
                blockers.append(f"{label}[{index}]: unsupported visible alpha threshold")
                continue
            if not isinstance(bbox, list) or len(bbox) != 4 or not all(isinstance(v, int) for v in bbox):
                blockers.append(f"{label}[{index}]: invalid alpha_bbox")
                continue
            if "alpha_bbox_visible" in row and (not isinstance(raw_bbox,list) or len(raw_bbox)!=4):
                blockers.append(f"{label}[{index}]: missing raw alpha_bbox")
                continue
            width, height = bbox[2] - bbox[0], bbox[3] - bbox[1]
            if width <= 0 or height <= 0:
                blockers.append(f"{label}[{index}]: empty alpha_bbox")
                continue
            if raw_bbox != bbox:
                extra=max(bbox[0]-raw_bbox[0],raw_bbox[2]-bbox[2],bbox[1]-raw_bbox[1],raw_bbox[3]-bbox[3])
                if extra > max(width,height)*0.05:
                    warnings.append(f"{label}[{index}]: near-transparent alpha extends {extra}px beyond visible sprite")
            entries.append({"label": f"{label}[{index}] ({name})", "width": width, "height": height})
        grouped[label] = (state, entries)
    issues = []
    stationary = []
    for label, (state, entries) in grouped.items():
        if state in STATIONARY:
            stationary.extend(entries)
            if entries:
                issues += compare(entries[1:], entries[0], "height", HEIGHT_TOLERANCE_PCT, "within_state_height")
                issues += compare(entries[1:], entries[0], "width", WIDTH_TOLERANCE_PCT, "within_state_width")
        elif state in LOCOMOTION and entries:
            issues += compare(entries[1:], entries[0], "height", LOCOMOTION_HEIGHT_TOLERANCE_PCT, "locomotion_height")
    if stationary:
        issues += compare(stationary[1:], stationary[0], "height", HEIGHT_TOLERANCE_PCT, "cross_state_height")
    return {"status": "BLOCKED" if blockers else "ISSUES_FOUND" if issues else "NO_DRIFT_DETECTED",
            "blockers": blockers, "issues": issues, "warnings": warnings,
            "measured_frames": sum(len(v[1]) for v in grouped.values()),
            "note": "BBox is a rough visual screen, not a body proportion or whole-gate PASS."}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--measurements", required=True, type=Path)
    parser.add_argument("--character", required=True)
    args = parser.parse_args()
    try:
        manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
        measurements = json.loads(args.measurements.read_text(encoding="utf-8"))
        if not isinstance(measurements, list):
            raise ValueError("measurements must be a JSON list")
        report = check(manifest, measurements, args.character, args.manifest)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        report = {"status": "BLOCKED", "blockers": [str(exc)], "issues": []}
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["status"] == "NO_DRIFT_DETECTED" else 2 if report["status"] == "BLOCKED" else 1


if __name__ == "__main__":
    raise SystemExit(main())
