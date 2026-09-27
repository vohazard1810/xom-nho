# Animation QC

This folder is evidence tooling, not artwork.

- `measure_frames.py`: reads real PNG bytes with Pillow and records objective image properties/alpha bounds. It deliberately leaves semantic anchors null.
- `scale_consistency_check.py`: joins manifest frames to pixel measurements by the exact `file` value and verifies SHA-256 against PNG bytes. Missing frames, stale measurements, and absent alpha block the check. It reports bbox drift only; it cannot PASS the overall gate.
- `validate_manifest.py`: refuses numeric PASS unless required frame entries are status `MEASURED` with numeric anchors. It also refuses the human readability gate unless a real reviewer and timestamp are recorded.

The generated composite sprite sheets are visual references only. Never split/crop them and relabel the crops as production evidence.

## Run

```bash
python tools/animation-qc/measure_frames.py assets/be_ti/walk/*.png
python tools/animation-qc/scale_consistency_check.py --manifest tools/animation-harness/manifest.json --measurements tools/animation-qc/pixel_measurements.json --character be_ti
python tools/animation-qc/validate_manifest.py tools/animation-harness/manifest.json
```

Until independently exported production PNG frames exist, expected gate status is `BLOCKED`.

The `file` strings in manifest frames must exactly match paths supplied to `measure_frames.py`; duplicate paths and missing expected frame counts block the scale check. Pixel measurements use `PIXELS_MEASURED_ANCHORS_PENDING` and do not modify the manifest. A reviewer must separately record real semantic anchors before setting a manifest frame to `MEASURED`. Exit codes for the scale check: 0 = no bbox drift found in complete input, 1 = drift found, 2 = blocked. No exit code grants whole-gate PASS.

The bbox thresholds are 3% for stationary frame height/width and cross-state height, and 6% for locomotion height. These are initial screening thresholds, not measured body proportions. Raised hands, props, and pose changes can alter bounds without scale changes; inspect flagged frames in the harness before regenerating art.
