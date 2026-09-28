# Animation QC

This folder is evidence tooling, not artwork.

- `measure_frames.py`: reads real PNG bytes with Pillow and records objective image properties/alpha bounds. It deliberately leaves semantic anchors null.
- `scale_consistency_check.py`: joins manifest frames to pixel measurements by the exact `file` value and verifies SHA-256 against PNG bytes. Missing frames, stale measurements, and absent alpha block the check. It reports bbox drift only; it cannot PASS the overall gate.
- `validate_manifest.py`: refuses numeric PASS unless required frame entries are status `MEASURED` with numeric anchors. It also refuses the human readability gate unless a real reviewer and timestamp are recorded.

The stationary feet check covers all four `QUEUE_WAIT` variants, `ORDER`,
`SPECIAL_REQUEST` presentation, `CONFLICT_WAIT`, `RECEIVE`, `REFUSED`, all three
`REACT` variants and `PAY`. It checks expected frame counts and rejects missing,
boolean or non-finite feet coordinates. `scale_consistency_check.py` includes
`QUEUE_WAIT` in its stationary bbox screen. Synthetic regression fixtures test
code coverage only; they are not art review evidence.

Known remaining limitation: the handoff check uses the final HANDOFF and
RECEIVE frames, while the asset contract asks for a designated transfer frame
and a paired timeline. Do not treat its isolated result as full handoff PASS.

The generated composite sprite sheets are visual references only. Never split/crop them and relabel the crops as production evidence.

`assets/characters/named/be_ti/candidates/queue-wait-normal-01-candidate.png`
is a single generated still referenced from `identity-v1.png`. It has genuine
PNG alpha and a measured pixel bbox/hash, but retains a wide dark halo and has
no measured semantic anchors. It is rejected as a production QUEUE_WAIT frame;
it does not enter the production manifest or count toward its four frames.

`assets/characters/named/be_ti/candidates/queue-wait-normal-01-clean-candidate.png`
uses `assets/characters/named/be_ti/candidates/identity-clean-demo-reference.png`
(SHA-256 `a50ea753a0a25fd9a2348a30d552e375bbe197f653e0ed429e9879ec930011ff`)
as its identity reference. It is an independent
single-frame candidate with real alpha (1278x1230; alpha bbox
`[130,58,1013,1199]`; SHA-256
`1739db1d56da9955ba0ef0785c3a30a3b048da2ca60fc64dd37ee687b0cfb6e2`).
The face is closed-mouth neutral. Semantic anchors, world scale, 4-frame loop,
and in-engine readability remain unmeasured/unreviewed. It is not a PASS and
does not enter the production manifest yet.

## Run

```bash
python tools/animation-qc/measure_frames.py assets/be_ti/walk/*.png
python tools/animation-qc/scale_consistency_check.py --manifest tools/animation-harness/manifest.json --measurements tools/animation-qc/pixel_measurements.json --character be_ti
python tools/animation-qc/validate_manifest.py tools/animation-harness/manifest.json
```

Until independently exported production PNG frames exist, expected gate status is `BLOCKED`.

The `file` strings in manifest frames must exactly match paths supplied to `measure_frames.py`; duplicate paths and missing expected frame counts block the scale check. Pixel measurements use `PIXELS_MEASURED_ANCHORS_PENDING` and do not modify the manifest. A reviewer must separately record real semantic anchors before setting a manifest frame to `MEASURED`. Exit codes for the scale check: 0 = no bbox drift found in complete input, 1 = drift found, 2 = blocked. No exit code grants whole-gate PASS.

The bbox thresholds are 3% for stationary frame height/width and cross-state height, and 6% for locomotion height. These are initial screening thresholds, not measured body proportions. Raised hands, props, and pose changes can alter bounds without scale changes; inspect flagged frames in the harness before regenerating art.
