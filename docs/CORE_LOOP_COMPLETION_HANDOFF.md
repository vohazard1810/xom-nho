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

No new recipe variants are introduced. Browser-based visual verification was unavailable in this environment because the installed Playwright package has no Chromium executable; Node UI tests use DOM stubs and are not a physical-device test.

## Persistent customer population update

New games store a population seed. Names, visual archetypes, temperament and favorite recipe belong to persistent person IDs, independently of transaction IDs. Existing saves migrate without replacing the active ticket or queue. Each district has its own population; repeat customers keep their identity. Three successful orders mark a customer as familiar. After the introduction, some orders use the saved favorite recipe when unlocked. Day 1 schedule, recipe quantities and financial baseline remain unchanged.

All seven existing visual templates can represent generated identities, including the child, neighbor and professional templates. Female student and office templates use matching names. No new character art is required from Antigravity. The familiar badge may need a small visual pass; browser screenshots have not been verified here.

Tests: customer-population covers seeded reproducibility, differing runs, persistent favorites, familiar threshold, twenty distinct district identities and legacy save migration. Day 1 ledger and existing manual cooking/portfolio regressions are retained. This update does not change shift duration or declare physical-device acceptance.
