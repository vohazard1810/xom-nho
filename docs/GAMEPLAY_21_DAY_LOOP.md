# Xóm Nhỏ — 21-day gameplay loop (prototype, 2026-09-30)

This document describes the implemented engine in `game/`, not a balanced or art-approved release. Day 1's 55k/122k/127k/67k fixture remains unchanged. Days 2–21 use provisional costs and deterministic event fixtures.

## Two independent calendars

- Calendar visit: `CLAIM_LOGIN` stores a Vietnam-local `YYYY-MM-DD` once per date. Stamps are cosmetic, never grant cash and never reset after missed days. Opening the app does not advance the simulated day or spoil food.
- Shop day: clock runs only in an opened shop. At 14:00 (360 minutes after 08:00) it closes after any current customer leaves. The result screen shows a concise summary for 12 seconds and auto-opens tomorrow's planning screen. Opening full ledger pauses the countdown; the player may also prepare immediately. The next selling shift never starts without menu/stock decisions.
- Reload in `DAY_RESULT` restarts the 12-second review countdown. Reload in `SHOP` resumes the saved shift, without offline progress.

## First week and continuation

| Day | Demand/event cue | Business decision |
| --- | --- | --- |
| 1 | Regulars, Bé Tí request, tắc price rumor | Learn stock and cash flow; one paused decision |
| 2 | Rain, tắc 3k | Reforecast drinks; bike capacity optional |
| 3 | School crowd | Counter expansion and egg recipe training available |
| 4 | Early-opening cost cue | Choose opening time versus possible missed breakfast guests |
| 5 | Friendly visitors, syrup inflation | Canopy unlocks; menu margin choice |
| 6 | Roadwork, price-sensitive guests | Set affordable prices; at 10:30 choose whether to spend 3k on a sign pointing to the shop. The sign adds one visitor with a real inventory requirement. Declining has no cash cost. |
| 7 | Payday crowd | Test earlier inventory and capacity choices |
| 8–14 | Deterministic rotating cues | Optional helper paid 8k per day; two extra peak-hour visits, +500 potential tip per friendly order |
| 15–21 | Rotating cues | Optional two delivery tickets per day, same stock/menu, 2k fee on successful orders |

After Day 7 the fixture rotation remains deterministic to make reloads and test results reproducible. More hand-written story arcs and visual NPC variants are still pending.

## Costs and accounting

Upgrade outlay includes recipe training (12k after counter) and canopy (35k from Day 5). Staff wage is 8k/day in operating expenses, not COGS. Delivery fee is 2k per successful online order, separately subtracted from cash and operating result. All successful orders consume actual inventory lots; rejected and out-of-stock online tickets do not pay a fee or debit stock. Day-end feedback is derived from served/missed transactions and saved in `lastDayReport` and `dayHistory`.

`endingCash = startingCash - stockPurchases - upgradeOutlay - operatingExpenses - onlineFees + cashSales + tips + sideJobIncome`.

`grossProfit = salesRevenue - soldItemCOGS`; `operatingResult = grossProfit - spoilage - operatingExpenses - onlineFees + sideJobIncome`. Neither the daily cosmetic stamp nor inventory purchase is booked as sales.

## Rules and limits

- Shop rating drops only when avoidable refusals (high pricing, disabled menu, deliberate early closing) exceed one third of visits; unexpected excess demand and rain do not directly lower stars. Strong service can still increase rating by half a star. These thresholds are prototype tuning values, not validated player balance.
- Forecasts appear before morning stock buying. The in-shift news ticker does not pause the clock. The Bé Tí request and the Day 6 roadwork sign choice pause only for an actual decision; no daily spam of modal dialogs.
- The current helper is a demand/earning abstraction; no NPC sprite or work-speed animation is produced here. Walk-in visitors and delivery orders still use placeholder visuals. Antigravity should supply character art and visual choreography separately.
- The UI has only Node smoke coverage. Real 390×844 browser playtesting, touch target and visual/art gates remain open.

## Verification commands

`node game/test-day1.mjs && node game/test-multiday.mjs && node game/test-progression.mjs && node game/test-ui.mjs && node game/test-ui-timers.mjs`

The 21-day stress test checks cash/stock invariants across daily transitions. It does not claim playability or optimal economy balance for every strategy; the progression test exercises the new unlocks and cash reconciliation independently.
