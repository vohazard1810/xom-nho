> Cập nhật: kiến trúc nhiều quán/nhân sự đã triển khai. Xem [ANTIGRAVITY_MULTI_SHOP_HANDOFF.md](ANTIGRAVITY_MULTI_SHOP_HANDOFF.md). Nội dung dưới mô tả baseline nấu tay trước khi thêm map.

# Xóm Nhỏ — hands-on gameplay handoff

Branch: `codex/playable-active-idle`. Supersedes the auto-only gameplay of 44ab5a6. Keep PR #1 and main unmerged. Existing art stays provisional for Antigravity's art pass.

## Approved change in direction

The owner found the previous experience too much like reading and watching a progress bar. Default service is now **choose ingredients → cook → explicitly serve**, with 21-day management progression retained. Ingredient taps were chosen over dragging for the first mobile implementation. Automation is an optional benefit of paid staff from Day 8, not the opening gameplay.

## Actual playable loop

- Shop naming, purchasing, menu pricing, opening hours, upgrades, recipe learning, wages, online tickets and economic events remain functional.
- The morning is a short forecast dashboard with upgrade tiles. Market ingredients are a two-column grid. End-of-day opens with three metrics and two feedback cards; detailed accounting is optional.
- The entire cooking screen fits the visible phone viewport. Ingredients, customer, queue, recipe counts, cooking board and action buttons are visible together. Management options are in a drawer.
- Each ingredient tap selects one unit. Wrong ingredients, surplus taps and incomplete cooking are rejected without spending stock. Undo clears the selection before cooking.
- Selected ingredients are **reserved**, not consumed. Cooking takes 1.4 simulation seconds, modified by boost, rain and helper speed. Cooked food waits for the player's Serve action. At completed handoff, the existing transaction reducer consumes the actual ingredient cost batches and credits money once. Duplicate cooking/serving is blocked.
- Default SELECT and READY phases never complete automatically. The first Day 1 order freezes the clock until the player starts cooking, providing a forgiving tutorial. Later orders continue advancing time while the player chooses.
- Queue patience still decreases; priority changes the next order without interrupting the current dish. Focus doubles cooking speed. Whole-shift speed lives in the management drawer.
- Active trading time advances at 2 in-game minutes per simulation second; empty gaps advance at 18 to shorten waiting. The compressed clock describes the shop's day, not real recipe cooking time. No fixed real-time shift duration is claimed for manual play.
- Mandatory decision, manual pause and hidden tabs freeze simulation. Closing time resolves unfinished orders; early closing records unserved guests once.
- Paid helpers speed cooking by 35%. Their auto-service toggle starts OFF; players can opt into full ingredient/cook/serve assistance that still consumes real stock.
- Results auto-advance after 12 visible seconds. Opening the ledger pauses the countdown and preserves it across reload. Morning waits for the next purchasing/menu choice. Calendar visit stamps remain independent and have no absence penalties.

## State contract

`shift-engine.mjs`: `cookingAction`, `cookingNeeds`, `cookingComplete`, `advanceShift`, `serviceVisual`. Browser and tests use the same production engine.

Persisted `service.version = 2`: `customerId`, `recipeId`, `isExtra`, `selected`, `phase`, `elapsedMs`, `prepMs`.

Phases: SELECT → PREP → READY → HANDOFF → REACTION. Only COOK leaves manual SELECT; only SERVE leaves manual READY. Staff automation is gated by both `staffHiredToday` and `assistEnabled`. The transaction reducer blocks uncommitted version-2 orders from bypassing handoff.

Old uncommitted auto-prep saves migrate to SELECT without losing cash/day/name/stock. Already served customers resume their reaction without charging again. No cooking/departure timeout chains are used. Replay clears both simulation and result timers. DOM nodes are patched between ticks.

## Verified scope

- `test-shift.mjs`: actual manual actions, safe wrong/surplus taps, incomplete cooking, duplicate serve guard, tutorial, save phases SELECT/PREP/READY/REACTION, ordinary queue timing, manual pause, old save migration, both extra-cha branches, Day 1 baseline, 21 simulated days, optional paid staff automation.
- `test-day1.mjs`, `test-multiday.mjs`, `test-balance.mjs`, `test-progression.mjs`: existing economy/progression checks pass.
- `test-ui.mjs`, `test-ui-timers.mjs`: onboarding, result countdown/details, day change, Replay timer cleanup.
- `tools/playtest/playable_smoke.cjs`: real Chromium, actual ingredient buttons, bread and drink, wrong-tap stock safety, no passive sales, real F5 SELECT/READY/results, queue priority, boost and pause, actual six-sale Day 1 ledger (127k cash / 67k gross), next-day basket.
- Cooking controls measured at 360×640, 390×700, 430×932: 11 controls fit without page scrolling, ≥44×44 CSS pixels and hit-test reachable. Zero runtime errors / failed image loads in exercised browser flow.
- Browser time advanced with Playwright clock. Screenshots use completed animation frames. No video and no real-time seven-day mobile gate. Tests do not prove fun or physical-device performance.

## Antigravity's next work

Preserve the manual gameplay contract. Replace provisional art and treatment, not the transaction engine. Build a coherent character palette and poses, physical cooking layers/board, ingredient tray, serving tray, food/drink/egg final art. Egg currently has a text ingredient placeholder and reuses wrapped-sandwich dish art; supply distinct assets. Existing character proportions and assembly illustrations need aesthetic review.

Art-only QA: one food and one drink, changed layouts, console and asset loading. Full real-time seven-day gate only for a major multi-day milestone. Manual pacing and later recipe complexity require human playtesting; do not label enjoyment PASS based on technical suites.
