# Xóm Nhỏ — v0.7 Day 1 gameplay slice

From the repository root, run `python3 -m http.server 8000` and open `http://localhost:8000/game/`. The portrait layout is intended for a 390×844 phone viewport. Saves use two checksum-validated localStorage slots and resume the latest valid state.

## Player loop

HOME → XÓM ƠI → CHỢ (choose quantities; bicycle limit 20 units and 60,000đ cash) → MENU (enable dishes, choose listed prices and 6h/8h/10h opening) → SHOP (orders prepared automatically, x1/x2, one paused choice for Bé Tí, market news without pause) → SỔ CUỐI NGÀY. Only BUY enters MENU and only START_DAY opens SHOP; generic NAVIGATE cannot bypass either decision.

Day 1 uses eight fixed customers and seven ingredients. The suggested 55,000đ basket with standard prices yields six served, two out of stock, 122,000đ collected, 127,000đ cash and 67,000đ gross profit. Changing purchases, menu, prices, Bé Tí's request, or opening time changes the outcome. High-sensitivity customers decline high prices; disabled dishes and insufficient stock are recorded separately. The extra-chả option requires at least two chả in stock. Closing early explicitly records all unserved customers as missed; the UI asks before closing.

The clock is stored in minutes relative to 08:00, so opening at 6h starts at -120 and opening at 10h starts at +120. x2 halves the real-time interval between ticks, without also doubling simulated minutes. The market ticker appears once. Opening at 6h currently adds waiting time before the first 8h30 customer and has no extra demand fixture. Opening at 10h loses the 8h30 and 9h15 customers, though later demand can consume the same stock and yield the same final cash. These choices need economy tuning beyond the Day 1 fixture.

A save during ARRIVED replays preparation after reload; a completed transaction schedules departure once. REPLAY cancels outstanding timers. Ledger totals derive from served orders and actual purchased/remaining stock. Tip and credit are zero in this fixture. Day 2 upgrades, new recipes, spoilage, dynamic customers, and character art are not implemented in this slice; the end-of-day card previews them only.

## Checks

`node game/test-day1.mjs` covers the complete baseline, price/menu/opening branches, serialized resume, stock and ledger invariants, time/news, early closure, and duplicate-service prevention. The Python Playwright scripts in `tools/playtest/` require Edge and a local server; they must be run separately on a full checkout for browser reload, timers, mobile touch targets, and visual timing. Do not describe the visual gate as passed based on the Node suite alone.
