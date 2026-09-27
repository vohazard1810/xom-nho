# XÓM NHỎ — Architecture Guardrails

## Source of truth
GitHub main is the stable source of truth. Feature work lands through branches and pull requests.

## State boundaries
Keep PersistentGameState, DayState and presentation/transient state distinct. Avoid duplicating the same gameplay fact across layers without a clear owner.

## Data-driven content
Recipes, ingredients, stations, NPCs and day definitions are data-driven. Prefer reusable models over one-off conditionals.

## Transactions
Market purchase and recipe commit are validated transactions. Duplicate UI input must not double-mutate state.

Recipe ingredient taps are draft selections only. Inventory mutation happens on successful commit.

## Simulation
The world may advance without player input, but successful shop service requires player action. Customer arrival/patience should remain deterministic enough for repeatable tests.

## Debug tooling
Developer helpers may exist only behind an explicit debug flag. Debug tooling must never silently alter normal-player economy or save state.

## Save/recovery
Saving must preserve enough state to resume the active day, pending decisions and active assembly/customer context safely. Recovery chooses the newest valid save; no merge.

## Test guardrails
Protect at minimum:
- no auto fulfillment;
- exact ingredient consumption;
- no consumption on wrong/cleared draft;
- modifier quantities;
- economy reconciliation;
- save/reload safety.
