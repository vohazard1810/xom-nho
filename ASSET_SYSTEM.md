# XÓM NHỎ — Character, Animation & Content Asset System

Version: v0.4
Date: 2026-09-27
Status: Production architecture before sprite production

## 1. Goal

Build a small-game asset pipeline that can grow without looking patched together.

The vertical slice starts small, but the asset architecture must support:
- many named NPCs;
- ambient/background NPCs;
- many recipes assembled from a controlled ingredient vocabulary;
- consistent character animation;
- consistent handoff/holding alignment;
- future shop/world expansion without redesigning the Day 1 scene.

Do not confuse "small prototype content" with "small final content system."

## 2. Character visual grammar

Every character asset is authored against the same coordinate/anchor contract.

Required anchors:
- feet_anchor: world placement / floor contact;
- center_anchor: sorting and selection;
- head_anchor: speech bubble / emote placement;
- hand_left_anchor;
- hand_right_anchor;
- receive_anchor: object handoff;
- order_anchor: optional world order indicator.

All characters share:
- one world perspective;
- one base pixel-density/export scale;
- a bounded height scale by age/body archetype;
- consistent ground shadow logic;
- consistent outline/render treatment.

Named NPCs may have unique silhouettes and animation timing. They must not look like simple recolors.

## 3. Character archetypes

Archetypes are production guides, not personality classes.

Initial body/age coverage:
- child_small
- teen
- adult_short
- adult_average
- adult_tall
- elder_short
- elder_average

Each named NPC receives a unique silhouette through controlled differences in:
- body proportion;
- hair;
- clothing;
- carried object/accessory;
- posture;
- walk timing.

Ambient NPCs may recombine compatible layers, but avoid visibly cloning named NPCs.

## 4. Shared animation state grammar

### Customer lifecycle states
- spawn
- walk
- arrive
- queue_wait
- order
- conflict_wait
- receive
- refused
- react
- pay
- leave
- despawn

### Presentation variants / sub-branches (not extra lifecycle states)
- queue_wait.wait_reason = normal | deprioritized | reserved_for_other | stock_pending
- order.has_special_request may open SPECIAL_REQUEST UI branch
- react.react_type = positive | neutral | negative
- talk is an animation/expression variant used by ORDER/SPECIAL_REQUEST, not a separate lifecycle state
- impatient is an animation variant of QUEUE_WAIT/CONFLICT_WAIT, not a separate lifecycle state

### Shopkeeper states
- idle
- prepare_food
- prepare_drink
- handoff

Presentation-only idle variants such as attentive / idle_busy / react do not require new lifecycle states.

Not every animation needs the same frame count.

Recommended starting ranges:
- idle: 3–4 frames / subtle loop
- walk: 6–8 frames
- queue_wait: 3–4 frames / subtle loop; wait_reason selects presentation variant
- conflict_wait / impatient presentation: 3–5 frames
- order / special-request talk: 2–4 frames plus expression variation
- reactions: 2–4 frames
- receive/handoff: 3–5 frames
- leave: reuse walk cycle with state transition when appropriate

Animation difficulty must not become gameplay difficulty.

## 4A. Runtime branch contract

SPECIAL_REQUEST is a UI sub-branch from ORDER, not a standalone lifecycle state. Other NPCs continue animating while the choice is open.

The service architecture uses player-driven Recipe Assembly. Therefore the older term AUTO_PREPARE must not mean automatic fulfillment. Runtime flow is:

ORDER → [SPECIAL_REQUEST?] → RECIPE_ASSEMBLY → VALID_COMMIT → shopkeeper PREPARE_FOOD/PREPARE_DRINK → [stock/commit conflict only if validation changes] → HANDOFF ↔ RECEIVE.

Normal service cannot succeed without player recipe assembly + commit.

CONFLICT_WAIT is reserved for a real unresolved service conflict; it must not become a generic restock mechanic in Day 1.

REFUSED skips PAY.

At DESPAWN, persist factual outcomes only: successful_orders, missed_orders where applicable, special-request facts, last_visit_day, and other contract-approved facts.

## 5. Expression system

Support a small reusable expression vocabulary:
- neutral
- pleased
- excited
- concerned
- impatient
- disappointed
- surprised

Expressions may be authored as full frames or compatible face variants depending on final production method.

NPC emotion shown on screen is derived from current facts/context. Do not persist abstract happiness/trust scores merely to select an expression.

## 6. Object interaction contract

Products and carried objects use normalized anchors:
- object_origin
- grip_anchor
- receive_anchor
- counter_anchor

Characters use hand/receive anchors.

This must allow:
shopkeeper.handoff(product)
→ product.receive_anchor aligns with npc.receive_anchor.

Do not manually eyeball alignment per recipe.

## 7. Ingredient asset system

Each managed ingredient has:
- ingredient_id
- world_station
- inventory_icon
- station_sprite
- optional selected/empty/scarce presentation
- interaction anchor

Day 1:
- bread
- cha
- vegetable
- ice
- sugar_syrup
- kumquat
- soy_milk

Future ingredients must use the same contract.

## 8. Product / recipe asset system

A recipe is data, not a hard-coded image screen.

Recipe visual definition may reference:
- base/container;
- ingredient visual layers;
- finished product sprite;
- handoff scale;
- handoff rotation;
- counter placement;
- preparation animation family.

Initial product families:
- banh_mi
- cold_drink

Architecture should permit later families such as:
- fried_snack
- rice
- noodle
- dessert

without replacing the Day 1 asset system.

## 9. Station architecture

Day 1 stations:
- food
- drink

Stations are visual/interaction groupings, not separate inventories.

Each station defines:
- world bounds;
- ingredient slot anchors;
- preparation anchor;
- optional prop anchors;
- expansion slots.

Never build a station image whose layout only works for the exact Day 1 ingredient count.

## 10. Living-world animation

The shop should feel alive without distracting from decisions.

Candidate ambient loops:
- leaves / bougainvillea movement;
- fan rotation;
- cat idle / reposition;
- distant scooter pass;
- hanging sign movement;
- drink condensation / ice glint;
- subtle steam where appropriate;
- changing light by time of day.

Ambient motion is low-frequency and lower contrast than customer/order feedback.

## 11. NPC scalability rule

The first production batch is a pipeline proof, not the whole cast.

Vertical-slice representative set:
- shopkeeper: full required states;
- Bé Tí: full required customer states;
- Cô Chín: full required customer states;
- Anh Tùng: full required customer states;
- at least 1 additional NPC using a different archetype;
- at least 2 ambient NPC variants.

Expansion PASS condition:
adding the additional named NPC must not require changing:
- world camera;
- queue slot system;
- character anchors;
- animation state names;
- handoff logic.

## 11A. State-machine stress test result

### Test 1 — fourth named NPC
PASS with no new lifecycle state.

Required new data only:
- npc_id
- archetype
- sprite/animation manifest
- animation timing/personality presentation parameters
- optional order/schedule/content data

A fourth NPC may use different timing, accessories, expressions and animation variants, but still maps to the same lifecycle states.

If a future story behavior cannot be represented, first test whether it is a content/event overlay or presentation variant before adding a lifecycle state.

## 12. Recipe scalability rule

Vertical-slice representative set:
- BANH_MI_CHA
- TRA_TAC
- SUA_DAU_DA
- one future recipe test using a future ingredient (production test only, not Day 1 gameplay)

Recommended expansion test:
egg → BANH_MI_TRUNG or BANH_MI_CHA_TRUNG.

Expansion PASS condition:
the test recipe can be added through data/assets without redesigning:
- recipe assembly UI;
- Food Station architecture;
- inventory model;
- handoff system.

Do not expose the future test recipe in Day 1 gameplay.

### Test 2 — egg recipe
PASS with no new shopkeeper lifecycle state.

Add:
- ingredient_id: egg
- Food Station expansion-slot asset/data
- recipe data such as BANH_MI_TRUNG or BANH_MI_CHA_TRUNG
- PREPARE_FOOD animation variant keyed by preparation_family/variant

Cooking egg is an animation variant inside PREPARE_FOOD, not a new state.

Special recipe steps may add animation clips/variants, but must not create lifecycle states unless they change control flow rather than presentation.

## 13. File organization

assets/
  world/
    alley/
    shop/
    props/
    ambient/
  characters/
    shopkeeper/
    named/
    ambient/
    shared/
  stations/
    food/
    drink/
  ingredients/
  products/
    banh_mi/
    drinks/
  ui/
    speech/
    order/
    recipe/
  manifests/

Suggested per-character layout:
characters/named/be_ti/
  manifest.json
  walk/
  arrive/
  queue_wait/
    normal/
    deprioritized/
    reserved_for_other/
    stock_pending/
  order/
  conflict_wait/
  receive/
  refused/
  react/
    positive/
    neutral/
    negative/
  pay/
  leave/

SPAWN and DESPAWN are runtime lifecycle states and normally do not require dedicated sprite folders.

## 14. Naming

Use stable ASCII IDs in code and filenames.

Examples:
- be_ti
- co_chin
- anh_tung
- banh_mi_cha
- sua_dau_da
- sugar_syrup

Vietnamese display names remain content/localization data, not filenames or IDs.

## 15. Production manifest

Each production character should eventually have a manifest describing:
- id
- archetype
- native_size
- scale
- anchors
- available_states
- frame timing
- loop behavior
- optional accessory layers

Each product manifest should describe:
- id
- family
- native_size
- handoff scale/rotation
- anchors
- station
- finished sprite
- preparation family

## 16. Art constraints

Direction: Vietnamese Cozy Storybook.

Avoid:
- anime-coded facial/body language;
- glossy generic mobile 3D;
- inconsistent perspective;
- excessive micro-detail at gameplay scale;
- baked dialogue/prices/UI text;
- NPCs differing only by clothing color.

At gameplay zoom, silhouette and state readability beat illustration detail.

## 17. Production order

1. Freeze Master Gameplay Scene geometry.
2. Define world coordinates / queue slots / station bounds.
3. Produce clean alley background.
4. Produce modular counter and stations.
5. Produce shopkeeper base + anchor test.
6. Produce one NPC walk/wait/order/receive chain.
7. Test handoff alignment in-engine.
8. Produce remaining Day 1 named NPCs.
9. Produce ingredient/product sprites.
10. Produce ambient NPCs and ambient loops.
11. Run fourth-NPC + fourth-recipe expansion test.
12. Only then scale asset production.

## 17A. Handoff synchronization

HANDOFF (shopkeeper) and RECEIVE (NPC) synchronize through anchors and an explicit handoff event/timing marker.

The product receive_anchor aligns to the NPC receive_anchor; do not eyeball per-recipe placement.

Special-request visual differences (for example extra cha) are PREPARE_FOOD variants before HANDOFF. They do not require a new lifecycle state.

## 17B. Representative-first production gate

Do not generate full animation sets for multiple named NPCs in parallel before one representative lifecycle passes in-engine validation.

Representative NPC: be_ti.

Required validation coverage:
- WALK
- ARRIVE
- QUEUE_WAIT.normal
- QUEUE_WAIT.deprioritized
- QUEUE_WAIT.reserved_for_other
- QUEUE_WAIT.stock_pending
- ORDER
- SPECIAL_REQUEST presentation branch
- CONFLICT_WAIT
- RECEIVE
- REFUSED
- REACT.positive
- REACT.neutral
- REACT.negative
- PAY
- LEAVE
- DESPAWN runtime transition

SPAWN/DESPAWN normally require no dedicated frames.

Shopkeeper validation coverage:
- IDLE
- PREPARE_FOOD.normal
- PREPARE_FOOD.extra_cha variant
- PREPARE_DRINK
- HANDOFF

The earlier multi-NPC concept sheet is reference-only and is NOT production evidence. It contains known defects:
- missing CONFLICT_WAIT;
- only normal QUEUE_WAIT shown;
- missing SPECIAL_REQUEST/extra-cha preparation variant;
- missing REFUSED;
- Anh Tùng preview omitted RECEIVE and duplicated ORDER;
- Bé Tí duplicated LEAVE without semantic labeling.

Do not repair those previews by producing more full-cast art. Validate be_ti first.

### Engine validation requirements

A static sprite sheet cannot prove anchors.

Create an in-engine/canvas harness that:
- places every frame on a fixed-size canvas;
- renders feet_anchor guide;
- renders hand/receive anchor guides;
- plays each animation at intended timing;
- overlays shopkeeper HANDOFF and NPC RECEIVE;
- can switch wait_reason and reaction variants;
- exposes current state/frame/anchor coordinates for debug;
- supports product overlay for one food and one drink.

PASS requires:
- feet do not visibly drift between frames/states except intended gait motion;
- character scale does not pop;
- receive object does not jump at HANDOFF ↔ RECEIVE;
- queue variants are visually distinguishable without text labels;
- extra-cha preparation is visibly distinct but remains PREPARE_FOOD;
- REFUSED and negative reaction are readable without becoming exaggerated slapstick.

Only after this harness passes may Cô Chín and Anh Tùng receive production animation sets.

## 17C. Wait-state semantics and numeric QC

QUEUE_WAIT.stock_pending and CONFLICT_WAIT are intentionally different:

- QUEUE_WAIT.stock_pending: this NPC has not entered active service; the queue is stalled or delayed because another active order ahead is unresolved.
- CONFLICT_WAIT: this NPC is the active order owner and their own order has an unresolved stock/service conflict after ORDER / assembly validation.

Visual requirement:
- stock_pending reads as passive/observational waiting, attention directed toward the counter/other customer;
- conflict_wait reads as personal uncertainty/concern about this NPC's own order.

Do not differentiate them only through labels or debug UI.

### Numeric feet-anchor gate

For all stationary Bé Tí states and variants:
ORDER, SPECIAL_REQUEST presentation, all QUEUE_WAIT variants, CONFLICT_WAIT, RECEIVE, REFUSED, REACT variants and PAY:

- canonical ground baseline Y must be identical in runtime world coordinates;
- sprite source-frame differences are corrected by per-frame trim/origin metadata, not by moving the world actor;
- record the effective feet_anchor Y for every frame in the validation report.

WALK/LEAVE may show gait movement inside the sprite, but the world ground contact model remains stable.

### Handoff timing gate

HANDOFF and RECEIVE must be played on the same validation timeline.

For each paired frame record:
- shopkeeper hand anchor;
- product anchor;
- NPC receive anchor;
- distance/error between intended contact points.

PASS requires contact at the designated transfer frame with no one-frame product teleport before or after transfer.

A static concept sheet is not evidence of numeric PASS. Actual exported frame files + manifest metadata are required before measuring this gate.

## 18. Freeze gate

Do not mass-produce assets until all are true:
- character anchors work in-engine;
- one complete customer lifecycle animates correctly;
- one food and one drink handoff align correctly;
- queue slots support visibly different body heights;
- stations have spare expansion capacity;
- fourth NPC requires no architecture rewrite;
- fourth recipe requires no architecture rewrite.

If any fails, fix the system before creating more art.
