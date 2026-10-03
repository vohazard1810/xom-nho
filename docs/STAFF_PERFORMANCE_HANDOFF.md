# Staff performance expansion

Base: e91ab0c. Branch: codex/staff-performance-expansion.

## Implemented
- Existing skill, assignment, training and rest remain available before a shift.
- Morale now affects helper/manager/cleaner preparation bonuses and packing bonuses. Background manager morale also affects unattended service speed. No random money loss or automatic firing.
- End-of-shift fatigue gain is min(28, 8 + ceil(shop served orders * 0.7)). All staff at a shop share this shop workload proxy; this is not individual task telemetry.
- Rest or a closed shop recovers 30 fatigue and 8 morale, with no shift wage.
- STAFF_BONUS costs 5,000 VND, raises morale by 20 up to 100, and is allowed once per employee per game day before opening. It is recorded as operating expense, never COGS.
- Persistent lastShift records rest/work, shop orders served, fatigue/morale change and advice. Morning staff cards show previous shift and advice; portfolio result includes assigned staff, including rested workers.
- Advice prioritizes rest at fatigue >=70, morale support below 50, then training below skill 3. Stock shortages remain business/inventory advice, not employee blame.

## Antigravity scope
Keep existing cooking and camera layout. Style the new bonus button, prior-shift text and staff advice. Rested staff must be distinguishable from working staff. Do not invent individual employee sales or misconduct. Keep actions >=44 CSS px; use targeted screenshots only, no video or seven-day mobile gate.

## Verification and limits
Node production-engine tests: staff-performance, empire, UI smoke and UI timers. Staff tests cover expense/cash, duplicate bonus, save, workload fatigue and recovery; empire tests cover shared money, background sales and campaign reconciliation. Physical mobile interaction and art remain unverified. Workload formula requires player feedback before final balance.
