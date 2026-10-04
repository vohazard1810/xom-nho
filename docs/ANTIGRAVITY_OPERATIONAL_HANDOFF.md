# Gameplay operations handoff — 2026-10-04

## Ownership and baseline

Codex owns engine, transactions and automated logic verification. Antigravity owns presentation and browser/UI verification. Start from `codex/core-loop-completion`; do not overwrite it with the older staff-performance branch. Keep the existing character assets, anchors, food scale and recipe catalog. Do not merge main.

## Implemented changes

- Quiet intervals advance at 30 game minutes per real second (previously 18); occupied queues remain at 2. A fixed quiet interval takes 40% less time. This is not a claim that entire player-driven shifts are 40% shorter. Tutorial freeze, pauses, boost timers and manual ingredient selection remain in force.
- Single-shop and portfolio clocks use the same `SHIFT_RULES`, preventing the two modes from drifting after a pacing adjustment.
- Existing owner/manager speed difference verified on equal staffing: preparation multipliers 1.322 versus 0.78177792 in the controlled scenario. This measures preparation speed only; revenue also depends on stock, prices and intervention.
- End-of-day recommendations now retain multiple causes, rank missed-customer causes by count, and add loss/fatigue/morale actions. Stock and price failures are not presented as employee misconduct.
- Map text now correctly explains that an open departing shop requires a manager; switching is possible with unfinished orders.

## Antigravity: one bounded UI pass

1. On the shop/map, make `Bạn đang đứng bán`, `Quản lý đang tự bán`, `Chờ chủ`, and `Nghỉ hôm nay` immediately distinguishable. Display the actual manager name and existing staffing state. Do not invent a production or revenue bonus.
2. Present quiet-time acceleration with a restrained `Vắng khách · giờ chạy nhanh` cue only when no open shop has an active ticket or waiting customer. Never overlay faces, food, ingredient inventory or primary actions. Prefer a label in the existing header rather than another grid row.
3. In portfolio results show each shop's served/missed customers, profit after costs, and up to three `recommendations`. Keep detailed cash ledger collapsed. Recommendations are suggestions, not proof of causation; do not add a disciplinary button for stock/price failures.
4. Verify the new familiar-customer badge does not squeeze the dish name, quantity, extra-cha badge or checklist. Use the existing minimum 16px dish text and 44x44px actionable targets.
5. Verify both 360x640 and 390x844 without regenerating characters or moving anchors. Check status-strip expansion and long recommendation text.

## Verification performed by Codex

`node game/test-operational-e2e.mjs --report` runs production engine actions through fresh Day 1 onboarding, purchasing, manual cooking, double-serve rejection, save/load during PREP, final ledger, NEXT_DAY and repeat-basket purchase. A separately disclosed Day 8 boundary fixture verifies opening a second shop, staffing, separate inventory, wages once, mid-prep transfer, real manager sales, map pause, portfolio reconciliation, next morning, bonus once and rest assignment. State is not rewritten between orders.

Measured output: `docs/operational_e2e_report.json`. Day 1: 6 served, cash 127000, gross 67000. Two-shop scenario: home 10 served/6 missed, school 10 served/3 missed; shared cash reconciled; transferred ticket appears exactly once. Automated simulated shift durations are 27.6s and 58.8s; input delays are absent, so these are not human play times.

## Browser E2E gap and bounded acceptance

The cloud browser rejected `http://127.0.0.1:8991/game/` with `net::ERR_BLOCKED_BY_CLIENT`. Browser/UI E2E is BLOCKED, not PASS. Node UI tests use stubs and cannot establish mobile rendering or physical touch feel.

Antigravity should run one fresh browser session from onboarding to Day 1 result using real UI clicks, then one disclosed two-shop scenario with a mid-prep transfer and result ledger. Check console errors, broken assets, duplicate payment and retained selected ingredients. Capture only the useful result/screens at the two viewports. Label controlled scenarios and fresh play separately. Do not set served status, money or queues midway to manufacture evidence.

No video. No full seven-day mobile gate. Do not ask the player to perform acceptance at this stage. Report browser-only blockers honestly; engine ownership remains with Codex.
