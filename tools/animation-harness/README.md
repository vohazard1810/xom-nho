# Animation Validation Harness

Purpose: validate one representative NPC (Bé Tí) before producing the rest of the cast.

This is a real browser harness, but currently uses placeholders because production sprite frames have not yet been approved.

## Run

From repository root:

```bash
python -m http.server 8080
```

Open `/tools/animation-harness/`.

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
