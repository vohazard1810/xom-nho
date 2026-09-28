# Animation Validation Harness

Purpose: validate one representative NPC (Bé Tí) before producing the rest of the cast.

This is a real browser harness, but currently uses placeholders because production sprite frames have not yet been approved.

## Run

From repository root:

```bash
python -m http.server 8080
```

Open `/tools/animation-harness/`.

### ORDER candidate review (isolated from production manifest)

Open `/tools/animation-harness/?orderCandidate=1` or check **ORDER candidate · Actor Crop + offset**. The harness reads `order_actor_crop_metadata.json`, preloads four 130×276 RGBA crops and places them at their shared `(577,954)` origin on the 960×1704 stage. Red, blue and green dots show the reviewed feet, head and raised-hand anchors. Use **Play** to watch the ORDER one-shot stop at frame 04, or step manually. The existing 140 ms harness interval is a preview cadence only; it does not set or approve game timing.

Recreate and verify the crop from repo root:

```bash
python tools/animation-qc/prepare_order_actor_crop.py \
  --stage-dir assets/characters/named/be_ti/candidates/alternate_model_v1/order_four_frame_pilot/canvas_960x1704 \
  --output-dir assets/characters/named/be_ti/candidates/alternate_model_v1/order_four_frame_pilot/actor_crop
node tools/animation-harness/test_order_candidate.mjs
```

The crop metadata records stage anchors, local anchors and pixel reconstruction deltas. These PNGs are candidate art; the production manifest stays frozen. A browser or physical-device playback inspection is still needed for the rendered one-shot.

## Required coverage

NPC:
WALK, ARRIVE, QUEUE_WAIT (normal/deprioritized/reserved_for_other/stock_pending), ORDER, SPECIAL_REQUEST presentation, CONFLICT_WAIT, RECEIVE, REFUSED, REACT (positive/neutral/negative), PAY, LEAVE.

Shopkeeper:
IDLE, PREPARE_FOOD.normal, PREPARE_FOOD.extra_cha, PREPARE_DRINK, HANDOFF.

SPAWN/DESPAWN are runtime transitions and need no dedicated frames by default.

## What this validates

- fixed stage/canvas;
- feet baseline;
- hand and receive anchors;
- frame timing;
- state/variant switching;
- food/drink product overlay;
- HANDOFF ↔ RECEIVE overlay;
- debug state/frame/anchor output.

## What it does NOT validate yet

It cannot claim visual PASS until actual sprite frames are installed. Placeholder emoji prove only that the harness and validation contract exist.

## PASS gate

Do not produce full Cô Chín / Anh Tùng animation sets until:
1. Bé Tí has production frames installed;
2. feet/scale remain stable across lifecycle;
3. four queue-wait presentations read differently;
4. food and drink handoffs align;
5. extra-cha preparation is visually distinct;
6. REFUSED and negative reaction are readable.
