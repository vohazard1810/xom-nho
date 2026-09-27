# XÓM NHỎ — Gameplay Contract

Status: Day 1 core direction frozen for implementation/playtest.

## Core fantasy
The player runs a small neighborhood shop and gradually helps revive the surrounding xóm.

Core skill:
OBSERVE → ANTICIPATE → PRIORITIZE → COMMIT → SEE CONSEQUENCE.

## Core loop
XÓM ƠI → MARKET → OPEN SHOP → CUSTOMERS / ORDERS → RECIPE ASSEMBLY → MANAGEMENT CONFLICTS → CLOSE SHOP → DAY STORY → TOMORROW HOOK.

## Day 1 recipes
- BANH_MI_CHA = bread x1 + cha x1 + vegetable x1
- TRA_TAC = ice x1 + sugar_syrup x1 + kumquat x1
- SUA_DAU_DA = soy_milk x1 + sugar_syrup x1 + ice x1

Shared scarcity:
- ice + sugar_syrup are shared by both drinks.
- Bé Tí may request extra cha, changing BANH_MI_CHA to cha x2.

## Service interaction
Customers autonomously arrive, queue, order and wait. The shop does not successfully run itself.

Player:
SELECT CUSTOMER → READ ORDER → ASSEMBLE RECIPE → COMMIT.

Ingredient selection is a temporary draft. Permanent inventory consumption happens only on a valid commit. Wrong selection or clearing consumes nothing. Preparation, handoff and payment are automatic feedback after commit.

## Queue
Multiple customers may wait simultaneously. Service is not forced FIFO. Patience is communicated diegetically, not as raw numbers. Pressure should come from overlap, scarcity and choices rather than frantic input speed.

## NPC memory
Store facts, not interpretation scores.

Valid examples: missed_orders, last_missed_day, successful_orders, favorite_item, last_visit_day, times_prioritized, debt, debt_repaid_on_time, times_given_extra.

Do not substitute abstract trust/grudge/happiness/reputation scores.

## Economy
Cash, revenue, COGS and receivables remain separate internally. Market purchases directly affect service inventory. No silent emergency stock or hidden refill. Normal player mode must never inject testing cash.

## Save
Use saveRevision + validation/checksum. Load the newest valid save; no merge. Mid-decision and mid-assembly resume must be safe.

## Day 1 rhythm
LEARN → PRACTICE → PRESSURE → DECISION → CONSEQUENCE → RELIEF.

## Out of Day 1 scope
No restock gameplay, manual cooking minigames, drag/drop, freshness/spoilage, staff, supplier progression, Today's Menu, large recipe catalog, less-ice/no-sugar modifiers, or mastery shortcuts.
