# XÓM NHỎ — Visual Bible & Gameplay Contract

Version: v0.6 — gameplay consistency patch + Visual Concept v2 direction
Updated: 2026-09-27

## Core product vision
XÓM NHỎ — Chuyện Làm Ăn is a portrait-first, offline single-player cozy Vietnamese neighborhood shop-management game.

Core skill loop:
OBSERVE → ANTICIPATE → BUY → PRIORITIZE → ASSEMBLE → COMMIT → SEE CONSEQUENCE → LEARN.

The player returns to a fading Vietnamese neighborhood, runs a small shop, builds relationships through observable actions, and gradually helps the neighborhood feel alive again.

This is NOT a detailed cooking simulator. Physical preparation after a valid recipe commit is feedback/animation, not a dexterity minigame.

## Core loop
XÓM ƠI → MARKET → OPEN SHOP → CUSTOMERS ARRIVE → ORDERS → PLAYER SELECTS CUSTOMER → RECIPE ASSEMBLY → AUTO PREPARATION/HANDOFF → MANAGEMENT CONFLICTS → CLOSE SHOP → DAY STORY → TOMORROW HOOK.

Target session: 3–5 minutes.

## Day 1 active service rule
Normal orders do NOT auto-fulfill.

Customers may autonomously arrive, queue, order, wait and leave. Successful service requires the player to:
1. select/prioritize a waiting customer;
2. read the order;
3. assemble the recipe by tapping ingredients;
4. commit a valid recipe.

Ingredient selection is a temporary draft. Wrong selections, clearing, or switching customer consume nothing. A valid commit atomically consumes the exact recipe once, then preparation/handoff/payment animate automatically.

Special requests modify the real target recipe. Example: Bé Tí extra cha changes BANH_MI_CHA from cha x1 to cha x2.

Difficulty comes from queue overlap, scarcity, forecast consequences, NPC context and later recipe variation — not frantic tapping.

## Day 1 recipes
- BANH_MI_CHA = bread x1 + cha x1 + vegetable x1
- TRA_TAC = ice x1 + sugar_syrup x1 + kumquat x1
- SUA_DAU_DA = ice x1 + sugar_syrup x1 + soy_milk x1

Managed ingredients:
bread, cha, vegetable, ice, sugar_syrup, kumquat, soy_milk.

Shared scarcity:
ice + sugar_syrup.

Special-request scarcity:
Bé Tí extra cha consumes real cha x2.

Recipe diversity should grow faster than ingredient complexity.

## Forecast — Xóm Ơi
Use diegetic signals: weather, school schedule, neighborhood activity, NPC gossip, observable prior behavior and local events.

Never show demand percentages or optimization tables.

Market purchase is the forecast commitment.

Hidden demand direction may combine base demand, day type, weather, local event, NPC schedule and small controlled variance. Variance must not overpower or contradict strong signals merely to punish correct reasoning.

## NPC memory
Persist facts, not interpretation scores.

Good examples:
missed_orders, last_missed_day, successful_orders, favorite_item, last_visit_day, times_prioritized, debt, debt_repaid_on_time, times_given_extra.

Do not store trust/grudge/happiness/reputation scores.

## Economy
Internally separate cash, revenue, COGS and receivables.

Player-facing UI should stay diegetic/lightweight: cash and relevant debt only.

Normal player mode must never inject debug cash or silently refill stock.

## Living Shop visual direction
Art direction: Vietnamese Cozy Storybook.

Keep:
- recognizable Vietnamese alley;
- warm natural light;
- bougainvillea and greenery;
- weathered walls / rolling doors / corrugated details;
- plastic stools, motorbikes, baskets, ice containers and neighborhood props;
- soft hand-painted illustration;
- readable silhouettes;
- warm but not candy-saturated palette.

Avoid:
- anime presentation;
- glossy 3D mobile-game look;
- poster-level clutter;
- generic “Asian cozy” scenery;
- oversized vendor/counter that blocks the world.

## Master Gameplay Scene requirements
Portrait 9:16.

The scene is a gameplay stage, not key art.

Composition:
- upper/background: alley and neighborhood life;
- middle: 3–4 clearly separated NPC slots and customer movement path;
- lower: shop counter and readable Food/Drink stations;
- recipe assembly dock may occupy ~35–40% of the lower screen without hiding waiting customers.

The world must remain visible during assembly.

NPCs are direct world UI: tap another waiting NPC to change priority. Do not make a separate full-screen customer/assembly page.

Food station:
bread, cha, vegetable.

Drink station:
ice, sugar_syrup, kumquat, soy_milk.

Stations are presentation groups, not separate inventories.

Text, prices and dialogue are rendered in code. Do not bake important text into AI image assets.

## Asset production pipeline
Concept/key art → Master Gameplay Scene → layered Asset Kit → character states → integration → playtest.

Asset layers:
1. alley_background (no people/counter)
2. shop_counter
3. food_station
4. drink_station
5. props
6. shopkeeper
7. Bé Tí / Cô Chín / Anh Tùng transparent sprites
8. character states: walk / wait / impatient / order / receive / leave
9. ingredient/product sprites
10. speech/UI pieces

Do not mass-produce assets until Master Gameplay Scene composition is frozen.

## Day 1–7 framework
D1 LEARN
D2 RECOMBINE
D3 PRESSURE
D4 CONSEQUENCE
D5 EXPECTATION BREAK
D6 COLLISION
D7 MASTERY + PAYOFF

Prefer recombination of learned systems over adding a new mechanic every day.

## Failure philosophy
No Game Over for a weak sales day.

Stockouts, customers leaving and low profit create a different story and future context, not a fail screen.

Consequences should be observable facts, not abstract punishment scores.

## Vertical-slice exclusions
No multiplayer, guild, leaderboard, server economy, mandatory login, energy, FOMO, supplier progression, freshness/spoilage implementation, staff, multiple shops, seasonal live events, detailed crafting, gram/ml simulation, or manual cooking minigames.

## Current visual target
Concept v1 remains useful as splash/store/key-art reference.

Master Gameplay Scene v2 is the production target and must be cleaner, flatter, more readable and more modular than Concept v1.

## Change from v0.5
Resolved a contract contradiction: v0.5 still described normal service as automatic/conflict-only intervention, while the latest tested design had already moved to player-driven Recipe Assembly. v0.6 makes the tested/latest direction authoritative: customers/world are autonomous; successful normal service is not.
