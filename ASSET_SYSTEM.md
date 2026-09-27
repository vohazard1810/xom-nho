# XÓM NHỎ — Character, Animation & Content Asset System

Version: v0.1
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

### Customer states
- idle
- walk
- arrive
- wait
- impatient
- order
- talk
- react_positive
- react_neutral
- react_negative
- receive
- pay
- leave

### Shopkeeper states
- idle
- attentive
- prepare_food
- prepare_drink
- handoff
- react
- idle_busy

Not every animation needs the same frame count.

Recommended starting ranges:
- idle: 3–4 frames / subtle loop
- walk: 6–8 frames
- wait: 3–4 frames / subtle loop
- impatient: 3–5 frames
- talk/order: 2–4 frames plus expression variation
- reactions: 2–4 frames
- receive/handoff: 3–5 frames
- leave: reuse walk cycle with state transition when appropriate

Animation difficulty must not become gameplay difficulty.

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
  idle/
  walk/
  arrive/
  wait/
  impatient/
  order/
  talk/
  reactions/
  receive/
  pay/
  leave/

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
