# Economy probe — 21 shop days (2026-09-30)

Run: `node game/balance-sim.mjs` and `node game/test-balance.mjs`. These scripts play the real state machine; they are scripted purchasing policies, not measurements of real players.

| Strategy | Day 21 cash | Day 21 rating | Served / missed over 21 days | Negative operating-result days |
| --- | ---: | ---: | ---: | --- |
| Conservative, no upgrades, buy for ~6 orders | 1,225,500đ | 3.5 | 106 / 200 | 0 |
| Expand capacity/counter/seats, hire from Day 8, delivery from Day 15 | 3,255,000đ | 5.0 | 290 / 136 | 0 |
| Persistent top-tier pricing, no upgrades | 508,500đ | 1.0 | 71 / 194 | 11 |
| Top pricing Days 2–7, standard price from Day 8 | 1,256,000đ | 3.5 | 113 / 186 | 2 |

All paths retain the approved Day 1 127k cash / 67k gross result. The high-price strategy originally generated 1.365m cash despite one-star reputation. Medium-budget guests now reject the top price below 3 stars, and low reputation reduces forecast traffic. Rating improvements compare fulfilled orders with orders physically reachable given vehicle capacity, while deliberate high pricing, known-menu removals and early closure count against the shop. The visible morning cue gives current star ceiling by vehicle: 20 units → 3.5, 30 → 4.0, 45 → 5.0. Locked recipes do not penalize ratings until learned.

## Open issues

- A profitable expansion path ends with 3.255m cash and no additional long-term purchase goal. This is not a balanced endgame. Future authored week objectives and capital sinks need a new economy design pass before tuning prices blindly.
- Results depend on deterministic visitor recipes and the script's purchasing policy; they do not measure fun, clarity, finger reach or pacing on a phone.
- Browser gate **blocked**: no Chromium binary in the workspace, Playwright download returned an invalid/truncated ZIP, and the partial checkout lacks the original `assets/` directory. The Python scripts reference a Windows Edge path and cannot serve as evidence here. Real 390×844 screenshots and seven-day mobile recording are still required.

The draft PR stays draft until a real browser run with full art assets passes.
