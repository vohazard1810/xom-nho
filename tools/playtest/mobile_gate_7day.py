"""Real-browser seven-day mobile gate. Run from a full repo checkout.

    python -m pip install playwright
    python -m playwright install chromium
    python tools/playtest/mobile_gate_7day.py

Use --browser-executable PATH for an installed Chrome/Edge instead.
This runner never reports PASS when images, browser or gameplay are missing.
"""

import argparse
import asyncio
import json
import re
import threading
from datetime import datetime
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCREEN = {"width": 390, "height": 844}


def required_assets(root):
    source = (root / "game" / "main.mjs").read_text(encoding="utf-8")
    candidates = re.findall(r"\.\./assets/[\w/.-]+\.(?:png|jpg|jpeg|webp)", source)
    return sorted({root / item.removeprefix("../") for item in candidates})


def missing_assets(root):
    return [str(path.relative_to(root)) for path in required_assets(root) if not path.is_file()]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


async def state(page):
    return await page.evaluate("() => window.__xomNho?.getState()")


async def action(page, name, payload=None):
    await page.evaluate("([name, payload]) => window.__xomNho.send(name, payload)", [name, payload])
    current = await state(page)
    if current is None:
        raise AssertionError("Game state unavailable after " + name)
    return current


async def assert_touch_targets(page, label):
    # Inspect *every* enabled button, including those below the fold.
    buttons = page.locator(".decision-modal-backdrop button") if await page.locator(".decision-modal-backdrop").count() else page.locator("button")
    visible = []
    for index in range(await buttons.count()):
        button = buttons.nth(index)
        if not await button.is_visible() or not await button.is_enabled():
            continue
        await button.scroll_into_view_if_needed()
        dimensions = await button.evaluate("""b => {
          const r = b.getBoundingClientRect();
          return { text: b.textContent.trim().slice(0, 35), width: r.width, height: r.height,
            reachable: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b ||
              b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)) };
        }""")
        visible.append(dimensions)
    bad = [b for b in visible if b["height"] < 44 or b["width"] < 44 or not b["reachable"]]
    assert visible, f"No interactive buttons on {label}"
    assert not bad, f"Undersized controls on {label}: {bad}"
    return len(visible)


async def assert_images(page, label):
    await page.wait_for_function("() => [...document.images].every(img => img.complete)", timeout=5000)
    broken = await page.evaluate("""() => [...document.images]
      .filter(img => img.getClientRects().length && img.complete && img.naturalWidth === 0)
      .map(img => img.currentSrc || img.src)""")
    assert not broken, f"Broken images on {label}: {broken}"


async def plan_basket(page, current):
    # Simple playtest policy: buy against the first arrivals until bike/stock
    # budget runs out. All stock purchases still use the production action.
    plan = await page.evaluate("""async () => {
      const { recipes, ingredients, totalBasketUnits } = await import('./day1-core.mjs');
      const s = window.__xomNho.getState();
      const basket = Object.fromEntries(Object.keys(ingredients).map(id => [id, 0]));
      const demand = Object.fromEntries(Object.keys(ingredients).map(id => [id, 0]));
      let remaining = s.cash;
      for (const customer of s.dayCustomers) {
        if (!s.menu[customer.recipe]?.enabled) continue;
        const needs = recipes[customer.recipe].needs;
        const extra = Object.fromEntries(Object.entries(needs).map(([id, qty]) =>
          [id, Math.max(0, demand[id] + qty - (s.stock[id] || 0) - basket[id])]));
        const cost = Object.entries(extra).reduce((n, [id, qty]) => n + s.marketPrices[id] * qty, 0);
        if (cost > remaining || totalBasketUnits(basket) + totalBasketUnits(extra) > s.upgrades.vehicleCapacity) continue;
        for (const [id, qty] of Object.entries(extra)) basket[id] += qty;
        for (const [id, qty] of Object.entries(needs)) demand[id] += qty;
        remaining -= cost;
      }
      return basket;
    }""")
    for ingredient, qty in plan.items():
        if qty:
            current = await action(page, "BASKET", {"id": ingredient, "qty": qty})
            assert current["basket"][ingredient] == qty
    return plan


async def run(args):
    root = Path(args.repo_root).resolve()
    missing = missing_assets(root)
    if missing:
        raise RuntimeError("BLOCKED: full art assets missing from checkout: " + ", ".join(missing[:12]) + (f" (+{len(missing)-12} more)" if len(missing) > 12 else ""))
    try:
        from playwright.async_api import async_playwright
    except ImportError as exc:
        raise RuntimeError("BLOCKED: install Python Playwright with `python -m pip install playwright`") from exc
    evidence = Path(args.evidence).resolve()
    evidence.mkdir(parents=True, exist_ok=True)
    (evidence / "video").mkdir(exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(QuietHandler, directory=str(root)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    report = {"status": "IN_PROGRESS", "viewport": SCREEN, "started": datetime.now().isoformat(), "days": [], "errors": [], "imageFailures": []}
    try:
        async with async_playwright() as playwright:
            launch = {"headless": not args.headed}
            if args.browser_executable:
                launch["executable_path"] = str(Path(args.browser_executable).resolve())
            browser = await playwright.chromium.launch(**launch)
            context = await browser.new_context(viewport=SCREEN, device_scale_factor=1,
                                                record_video_dir=str(evidence / "video"),
                                                record_video_size=SCREEN)
            page = await context.new_page()
            page.on("pageerror", lambda exc: report["errors"].append(str(exc)))
            page.on("requestfailed", lambda req: report["imageFailures"].append(req.url) if "/assets/" in req.url else None)
            try:
                await page.goto(f"http://127.0.0.1:{args.port}/game/")
                await page.evaluate("() => localStorage.clear()")
                await page.reload()
                await assert_touch_targets(page, "Home")
                await page.screenshot(path=str(evidence / "home.png"))
                await page.locator("#shop-name-input").fill("Quán Hẻm Nhỏ")
                await page.locator('[data-type="SET_SHOP_NAME"]').click()
                for day in range(1, 8):
                    current = await state(page)
                    assert current["currentDay"] == day
                    assert current["screen"] == "XOM_OI"
                    touch = await assert_touch_targets(page, f"Day {day} morning")
                    await assert_images(page, f"Day {day} morning")
                    await page.screenshot(path=str(evidence / f"day{day:02d}_morning.png"), full_page=True)
                    if day == 2 and current["cash"] >= 90000:
                        current = await action(page, "UPGRADE", "bike_basket")
                        assert current["upgrades"]["vehicleCapacity"] == 30
                    current = await action(page, "NAVIGATE")
                    assert current["screen"] == "MARKET"
                    touch += await assert_touch_targets(page, f"Day {day} market")
                    if day == 1:
                        current = await action(page, "BUNDLE_DAY1")
                    else:
                        await plan_basket(page, current)
                    current = await action(page, "BUY")
                    assert current["screen"] == "MENU"
                    touch += await assert_touch_targets(page, f"Day {day} menu")
                    await assert_images(page, f"Day {day} menu")
                    current = await action(page, "START_DAY")
                    assert current["screen"] == "SHOP"
                    await assert_images(page, f"Day {day} shop open")
                    await page.screenshot(path=str(evidence / f"day{day:02d}_shop.png"))
                    touched_shop = False
                    inspected_customer = False
                    start = asyncio.get_running_loop().time()
                    reloaded = False
                    while (current := await state(page))["screen"] == "SHOP":
                        elapsed = asyncio.get_running_loop().time() - start
                        assert elapsed < 150, f"Day {day} stalled at {current['clock']} minutes"
                        if current["activeDecision"]:
                            decision = current["activeDecision"]["id"]
                            if decision == "EXTRA_CHA":
                                choice = "yes" if current["stock"]["cha"] >= 2 else "no"
                            else:
                                choice = "yes" if current["cash"] >= 3000 else "no"
                            await page.screenshot(path=str(evidence / f"day{day:02d}_{decision}.png"))
                            touch += await assert_touch_targets(page, decision)
                            await action(page, "DECIDE", {"choice": choice})
                        if current["activeCustomer"] and not inspected_customer:
                            await assert_images(page, f"Day {day} active customer")
                            await page.screenshot(path=str(evidence / f"day{day:02d}_customer.png"))
                            inspected_customer = True
                        if day == 2 and not reloaded and current["customerIndex"] >= 1 and not current["activeDecision"]:
                            before = current
                            await page.reload()
                            after = await state(page)
                            assert after["cash"] == before["cash"] and after["customerIndex"] == before["customerIndex"]
                            reloaded = True
                        if not touched_shop:
                            touch += await assert_touch_targets(page, f"Day {day} shop")
                            touched_shop = True
                        await page.wait_for_timeout(150)
                    assert current["screen"] == "DAY_RESULT"
                    assert current["dayHistory"][-1]["day"] == day
                    ledger = await page.evaluate("""async () => {
                      const core = await import('./day1-core.mjs');
                      return core.calculateLedger(window.__xomNho.getState());
                    }""")
                    assert ledger["finalCashInDrawer"] == current["cash"]
                    assert ledger["grossOperatingProfit"] == ledger["totalSalesRevenue"] - ledger["cogsSoldItemsOnly"]
                    assert ledger["servedCount"] + ledger["missedCount"] == len(current["dayCustomers"])
                    if day == 1:
                        assert current["cash"] == 127000 and ledger["grossOperatingProfit"] == 67000
                    touch += await assert_touch_targets(page, f"Day {day} result")
                    await page.screenshot(path=str(evidence / f"day{day:02d}_result.png"), full_page=True)
                    await page.locator("#day-ledger-details summary").click()
                    assert await page.locator("#day-ledger-details").evaluate("el => el.open")
                    await page.wait_for_timeout(300)
                    assert (await state(page))["screen"] == "DAY_RESULT", "Opening ledger must pause auto advance"
                    await assert_images(page, f"Day {day} result")
                    day_report = current["lastDayReport"]
                    report["days"].append({"day": day, "seconds": round(asyncio.get_running_loop().time() - start, 2),
                                           "served": day_report["served"], "missed": day_report["missed"],
                                           "cash": day_report["cash"], "rating": day_report["rating"], "touchChecks": touch})
                    if day == 1:
                        await page.locator("#day-ledger-details summary").click()
                        await page.wait_for_function("() => window.__xomNho.getState().screen === 'XOM_OI'", timeout=16000)
                        assert (await state(page))["currentDay"] == 2
                    elif day < 7:
                        await page.locator('[data-type="NEXT_DAY"]').click()
                assert len(report["days"]) == 7
                assert not report["errors"], report["errors"]
                assert not report["imageFailures"], report["imageFailures"]
            finally:
                await context.close()
                await browser.close()
    except Exception as exc:
        report["status"] = "FAIL"
        report["failure"] = str(exc)
        raise
    else:
        report["status"] = "PASS"
    finally:
        server.shutdown()
        (evidence / "mobile_gate_7day.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"status": "PASS", "days": report["days"], "evidence": str(evidence)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", default=str(ROOT))
    parser.add_argument("--evidence", default=str(ROOT / "docs" / "mobile_gate_evidence"))
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--browser-executable", default=None)
    parser.add_argument("--headed", action="store_true")
    asyncio.run(run(parser.parse_args()))
