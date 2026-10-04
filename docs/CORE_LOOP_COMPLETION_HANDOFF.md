# Core loop update — 2026-10-04

Based on Antigravity commit 8b76c11. Character assets and stage layout retained.

## Implemented

- Market: reuse the previous purchase basket. Quantities persist through save/reload and next day. Current market prices apply; exceeding available cash or carrying capacity rejects the action without mutating money, inventory or selection. This only selects quantities; BUY remains explicit.
- Portfolio: switch shops during SELECT/PREP/READY/HANDOFF/REACTION when the departing open shop has an available manager. Existing ticket, ingredient selection and progress remain in that branch; the production engine continues it. Mandatory decisions must be resolved first. Shops without a manager remain blocked.
- Tutorial: shared portfolio clock respects the first-order Day 1 tutorial freeze, matching the single-shop engine.
- Result countdown: opening the map pauses auto-next-day, as does opening the ledger or hiding the document.

## Verification

Production engine tests cover current-price basket reuse, insufficient cash without mutation, switching during PREP, serialization while away and exactly one background transaction. UI timer test covers map pause/resume. Existing Day 1, shift, portfolio, UI and staff tests were also run. No video or seven-day mobile gate.

## Antigravity scope

Keep current art. The only UI additions are a repeat-basket button and updated map label; style these within the established UI. Do not change engine transactions or shop-transfer rules.

## Remaining limits

Identity diversity is still the existing deterministic roster, not a fully generated persistent population. No new recipe variants are introduced. Browser-based visual verification was unavailable in this environment because the installed Playwright package has no Chromium executable; Node UI tests use DOM stubs and are not a physical-device test.
