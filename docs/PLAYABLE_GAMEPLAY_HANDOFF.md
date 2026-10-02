# Xóm Nhỏ — playable gameplay handoff

Base: `7d2516f`, branch `codex/playable-active-idle`. This is a gameplay implementation, with the existing art retained for Antigravity's next art pass. Do not merge PR #1 automatically.

## Playable loop

- Name the shop, read the morning forecast, buy ingredients, enable dishes, set prices and opening time.
- Day 1 offers the approved 55k basket. Later mornings offer an editable suggested basket constrained by cash, capacity, carried stock and known/enabled recipes.
- The shop prepares and serves automatically. Arrivals continue during preparation. Waiting guests lose patience according to temperament and actual simulation time.
- Priority changes the next order, without interrupting food already being prepared. Focus doubles preparation speed for 12 simulation seconds, followed by a 30-second cooldown. x2 advances the entire shift consistently.
- Player pause, mandatory decisions and hidden tabs freeze the shift. The game does not advance days or spoil food while the player is away.
- Closing time stops the shift after existing orders resolve. Closing early records each unresolved guest exactly once, regardless of queue order.
- The result shows cash, revenue, gross profit, spoilage, operating costs, reasons for lost guests, real customer feedback and a recommendation for tomorrow.
- The result advances to morning after 12 visible seconds. Opening details pauses the remaining countdown, including after a reload. The next morning waits for the player's purchasing/menu choices.
- Calendar visit stamps remain independent from in-game days, with no missed-login penalties.

## Progression

- Day 2: larger bicycle basket and seating/quay investments.
- Day 3: learn egg bánh mì after expanding the counter.
- Day 5: canopy protects against rain slowing preparation and helps attract rain-day customers.
- Day 8: optional paid helper, 35% faster preparation. Additional tickets still require stock.
- Day 10: motorcycle cargo box, +30 carrying units, requires basket level 2.
- Day 15: optional delivery tickets share stock and production capacity, with fees only on completed orders.
- Days 1–21 have forecasts and events. Heat/deals actually change ingredient prices; heat changes drink demand. Morning clusters from Day 3 create a reason to use queue controls. Events cycle after Day 21.

## Architecture Antigravity must preserve

`game/shift-engine.mjs` is the shared production simulation. The browser and tests use `advanceShift(state, elapsedMs)`. Preparation, handoff and reaction are persisted in `state.service`; neither food preparation nor customer departure uses independent timeout chains. `serviceVisual(state)` derives presentation from that saved state.

`day1-core.mjs` remains the transaction/progression reducer. The production engine marks `managedShift` so the legacy recovery and boost counters do not also run. Save slots use the existing checksum and revision mechanism. UI updates preserve DOM nodes rather than recreating every button/animation on every clock tick.

## Verification performed

- `node game/test-shift.mjs`: approved Day 1 127k cash / 67k gross profit; reload at PREP/HANDOFF/REACTION; modal/manual pause; one boost clock; stock safety; early close after priority; full 21-day run through the production engine.
- Controlled three-ticket wave: FIFO serves 2/3; priority serves 3/3; focus serves 3/3, +17k revenue. This uses the production engine, not the earlier independent comparison simulator.
- Existing Day 1, multi-day, balance, progression, UI and result-timer tests pass. Market expectations now follow the day's prices; high pricing must reduce campaign performance, rather than being forced into a fixed number of losing days.
- `tools/playtest/playable_smoke.cjs`: real Chromium UI, page reload, compulsory pause, priority, boost, manual pause, widths 360/390/430, Day 1 reconciliation, result details/F5/countdown, next-day suggested basket, zero JS errors or image failures in the exercised flow.
- Browser time was advanced using Playwright's clock to keep this check short. This is not a new seven-day real-time mobile gate or a physical-phone performance measurement. No video recorded.

## Tomorrow: art work

Use the current gameplay state and existing screenshots in `docs/playable_evidence/`. Replace assets and visual treatment without rebuilding the transaction flow. Needed: one consistent character style; readable heads/expressions in the queue; a convincing empty preparation board; a physical tray and matching food/drink/egg dish; ORDER/RECEIVE/REACT poses. The egg dish currently reuses the wrapped sandwich image with its correct dish label; it needs distinct art.

Run one food and one drink through preparation/handoff/reaction after art changes. Check the changed viewport and console/assets. Run the full real-time seven-day gate only for a major multi-day behavior milestone. Economy numbers and real-device feel remain prototype tuning work.
