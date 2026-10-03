# Xóm Nhỏ: continuous-day expansion handoff

Branch: codex/staff-performance-expansion. Base includes Antigravity e91ab0c and staff-performance expansion.

## Implemented engine behavior
1. Days 1–7 retain introductory events. From Day 8, a deterministic seeded event pool replaces the repeating 21-day calendar. Day 22 is not another opening day. Reload never rerolls the day.
2. After the introductory week, demand growth depends on reputation, seating and known recipes rather than increasing indefinitely with day number. Traffic remains bounded at 20 regular walk-ins; existing online/role-generated arrivals are separate.
3. Market changes are bounded and declared before purchasing. Kumquat, syrup, egg, cha and soy milk have explicit prices. Existing batch costs remain unchanged when tomorrow's market moves.
4. One recurring rival, xe bánh mì cô Tư, offers 22k bread on flagged days. Only price-sensitive bread customers use this comparison; other recipes are unaffected. Reduce bread price to 22k, focus drinks or accept fewer bread sales. There is no arbitrary cash penalty. Event news states the offer before opening.
5. Lifetime served orders persist. School location opens on Day 8 OR 30 orders from Day 4; office on Day 15 OR 100 orders from Day 4. Four-star, manager, deposit and reserve requirements still apply.
6. Staff roles retain calendar unlocks, with alternative order milestones from Day 4: helper 15, manager/cleaner 30, buyer/keeper 50, packer/driver 100. Seating/online restrictions still apply. UI uses the same role eligibility function.
7. Preparation times differ: drinks 1.1s, bread 1.4s, egg bread 2.2s before staff/boost modifiers. Manual ingredient selection and explicit serve remain default.
8. Morale, workload fatigue, rest, training and paid bonuses: see STAFF_PERFORMANCE_HANDOFF.md. Multiple shops use existing shared money, separate stock and actual unattended manager sales.

## Antigravity: one integrated UI/art pass
- Keep the approved mobile order strip, ingredient selection and camera layout.
- Show competitor name, discounted recipe and suggested price in morning market news. Do not add fake sabotage or deduct money outside transactions.
- Staff role lock labels must include the achievement alternative, not just calendar days. Map opening reasons come from openingEligibility.
- Give orders, foreground cooking, away-shop operation and staff recovery visual states using actual engine data.
- Named character art and walk-in variants must share a visual style. Candidate art stays separate until visually reviewed in the live scene.
- Reuse current recipe assets. New recipes and special ingredient variants are NOT implemented by this change; do not show unsupported orders or new recipe art as playable.
- No video and no repeated seven-day mobile gate. Targeted cooking, staff, map and news checks only.

## Limits / remaining product work
The rival currently has one price-offer behavior, not a full relationship/story system. There is no new recipe catalogue, no staff absence event, no configurable combo discount and no individual staff task tracking yet. These remain follow-up work, not completed features. Physical mobile pacing and release build must be checked separately. Generated content is seeded, not random-on-reload.

## Verification
Production engine: manual 21-day campaign and multi-shop campaign tests; dedicated staff tests; UI smoke. Endless test simulates through Day 100 with save round-trips, stock and ledger assertions, plus generated calendar checks through Day 120. No browser-video testing.
