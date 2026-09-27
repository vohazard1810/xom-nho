# Animation QC

This folder is evidence tooling, not artwork.

- `measure_frames.py`: reads real PNG bytes with Pillow and records objective image properties/alpha bounds. It deliberately leaves semantic anchors null.
- `validate_manifest.py`: refuses numeric PASS unless required frame entries are status `MEASURED` with numeric anchors. It also refuses the human readability gate unless a real reviewer and timestamp are recorded.

The generated composite sprite sheets are visual references only. Never split/crop them and relabel the crops as production evidence.

## Run

```bash
python tools/animation-qc/measure_frames.py assets/be_ti/walk/*.png
python tools/animation-qc/validate_manifest.py tools/animation-harness/manifest.json
```

Until independently exported production PNG frames exist, expected gate status is `BLOCKED`.
