import asyncio
import json
import shutil
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path('.').resolve()
ARTIFACT_DIR = Path(r"C:\Users\truonggiang.vo01\.gemini\antigravity\brain\47b8d4fc-0808-455a-ab31-40cf8e3ca68d")
DOCS_EVIDENCE = ROOT / "docs" / "mobile_gate_evidence"
DOCS_EVIDENCE.mkdir(parents=True, exist_ok=True)

try:
    server = ThreadingHTTPServer(('127.0.0.1', 8991), lambda *args, **kwargs: SimpleHTTPRequestHandler(*args, directory=str(ROOT), **kwargs))
    threading.Thread(target=server.serve_forever, daemon=True).start()
except Exception as e:
    print("Server note:", e)

async def test_tra_tac_and_double_tap():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            headless=True
        )

        page = await browser.new_page(viewport={"width": 360, "height": 640}, device_scale_factor=2)
        await page.goto("http://127.0.0.1:8991/game/")
        await page.wait_for_selector("#app")

        # Set up a real Day 1 active state with Cô Chín ordering TRA_TAC at counter
        setup_data = await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.screen = 'SHOP';
            s.currentDay = 1;
            s.cash = 100000;
            s.revenue = 0;
            s.servedOrders = [];
            s.missedOrders = [];
            s.dayCustomers = [
                { id: 'co_chin', personId: 'co_chin', name: 'Cô Chín', recipe: 'TRA_TAC', status: 'ARRIVED', temperament: 'FRIENDLY', patience: 100, maxPatience: 100, arrivalMinute: 60 }
            ];
            s.activeCustomer = s.dayCustomers[0];
            s.waitingQueue = [];
            s.stock = { bread: 5, cha: 5, vegetable: 5, egg: 0, ice: 5, sugar_syrup: 5, kumquat: 5, soy_milk: 5 };
            s.service = {
                version: 2,
                recipeId: 'TRA_TAC',
                customerId: 'co_chin',
                selected: {},
                phase: 'SELECT',
                elapsedMs: 0,
                prepMs: 1400
            };
            s.manualPaused = false;
            s.isPaused = false;
            if (s.empire && s.empire.shops && s.empire.shops[s.empire.activeShopId]) {
                const shop = s.empire.shops[s.empire.activeShopId].state;
                shop.screen = 'SHOP';
                shop.stock = s.stock;
                shop.activeCustomer = s.activeCustomer;
                shop.waitingQueue = s.waitingQueue;
                shop.service = s.service;
                shop.dayCustomers = s.dayCustomers;
                shop.servedOrders = s.servedOrders;
                shop.cash = s.cash;
                shop.revenue = s.revenue;
            }
            window.__xomNho.render();
            return {
                initialCash: s.cash,
                initialStock: { ...s.stock },
                activeRecipe: s.activeCustomer.recipe,
                activeCustName: s.activeCustomer.name
            };
        }""")

        await page.wait_for_timeout(200)

        # 1. Verify initial setup
        print("Initial state:", setup_data)
        assert setup_data["initialCash"] == 100000
        assert setup_data["initialStock"]["ice"] == 5
        assert setup_data["initialStock"]["sugar_syrup"] == 5
        assert setup_data["initialStock"]["kumquat"] == 5
        assert setup_data["activeRecipe"] == "TRA_TAC"

        # 2. Select ingredients for Trà tắc: ice, sugar_syrup, kumquat
        await page.click('.ingredient-button[data-payload="ice"]')
        await page.wait_for_timeout(100)
        await page.click('.ingredient-button[data-payload="sugar_syrup"]')
        await page.wait_for_timeout(100)
        await page.click('.ingredient-button[data-payload="kumquat"]')
        await page.wait_for_timeout(150)

        # 3. Check selected state
        cook_button_text = await page.evaluate("() => document.querySelector('.cook-main')?.textContent?.trim()")
        assert cook_button_text == "Làm món", f"Expected 'Làm món', got '{cook_button_text}'"

        # 4. Click 'Làm món' to start cooking
        await page.click('.cook-main')
        await page.wait_for_timeout(150)

        # Advance shift by 1600ms to complete preparation (prepMs is 1400ms)
        await page.evaluate("() => window.__xomNho.advanceShift(1600)")
        await page.wait_for_timeout(150)

        # Check ready state
        is_ready = await page.evaluate("() => document.querySelector('.cook-main')?.classList.contains('ready')")
        cook_text_ready = await page.evaluate("() => document.querySelector('.cook-main')?.textContent?.trim()")
        assert is_ready, "Cook button should be in ready state"
        print(f"Dish is READY. Cook button text: '{cook_text_ready}'")

        # 5. TEST RAPID DOUBLE/TRIPLE TAP ON 'Giao khách →'
        # Perform 3 rapid clicks to verify idempotency (double collection prevention)
        click_results = await page.evaluate("""async () => {
            const btn = document.querySelector('.cook-main');
            const clicks = [];
            // Click 1
            btn.click();
            clicks.push({ index: 1, text: btn.textContent.trim(), cash: window.__xomNho.getState().cash });
            // Click 2 immediate
            btn.click();
            clicks.push({ index: 2, text: btn.textContent.trim(), cash: window.__xomNho.getState().cash });
            // Click 3 immediate
            btn.click();
            clicks.push({ index: 3, text: btn.textContent.trim(), cash: window.__xomNho.getState().cash });
            return clicks;
        }""")
        print("Rapid clicks executed:", click_results)

        # 6. Advance through handoffMs (350ms) to complete auto-serve and record transaction
        await page.evaluate("() => window.__xomNho.advanceShift(450)")
        await page.wait_for_timeout(200)

        # 7. Check final verified state
        final_metrics = await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            const cashGainEl = document.querySelector('.cash-floating-gain');
            const cashDisplayEl = document.querySelector('.play-cash');
            const trayDish = document.querySelector('.stage-tray-dish');
            return {
                finalCash: s.cash,
                finalRevenue: s.revenue,
                stock: { ...s.stock },
                servedOrdersCount: s.servedOrders.length,
                servedOrder: s.servedOrders[0] || null,
                cashGainText: cashGainEl?.textContent?.trim() || null,
                cashDisplayText: cashDisplayEl?.textContent?.trim() || null,
                hasTrayDish: !!trayDish,
                activeCustomerStatus: s.activeCustomer?.status
            };
        }""")

        print("\n=== FINAL METRICS ===")
        print(json.dumps(final_metrics, ensure_ascii=False, indent=2))

        # Assertions:
        # Cash must increase by exactly 15,000đ (sale price of Trà tắc)
        cash_increase = final_metrics["finalCash"] - setup_data["initialCash"]
        print(f"Cash increase: {cash_increase}đ (Expected: 15.000đ)")
        assert cash_increase == 15000, f"Cash increase was {cash_increase}, expected 15000! Double-spend detected if 30000!"

        # Ingredients must decrease by exactly 1
        ice_diff = setup_data["initialStock"]["ice"] - final_metrics["stock"]["ice"]
        sugar_diff = setup_data["initialStock"]["sugar_syrup"] - final_metrics["stock"]["sugar_syrup"]
        kumquat_diff = setup_data["initialStock"]["kumquat"] - final_metrics["stock"]["kumquat"]
        print(f"Stock deductions: ice: -{ice_diff}, sugar_syrup: -{sugar_diff}, kumquat: -{kumquat_diff}")
        assert ice_diff == 1, f"Ice deduction was {ice_diff}, expected 1"
        assert sugar_diff == 1, f"Sugar deduction was {sugar_diff}, expected 1"
        assert kumquat_diff == 1, f"Kumquat deduction was {kumquat_diff}, expected 1"

        # Exactly 1 served order
        assert final_metrics["servedOrdersCount"] == 1
        assert final_metrics["servedOrder"]["recipe"] == "TRA_TAC"
        assert final_metrics["servedOrder"]["sellPrice"] == 15000

        # Capture evidence screenshot
        shot_path = DOCS_EVIDENCE / "shot_tra_tac_served_verified.png"
        await page.screenshot(path=str(shot_path))
        shutil.copyfile(shot_path, ARTIFACT_DIR / "shot_tra_tac_served_verified.png")
        print(f"Screenshot saved to {shot_path}")

        # Save verification report
        report = {
            "test": "TRA_TAC Delivery and Double-Tap Idempotency Test",
            "recipe": "TRA_TAC (Trà tắc)",
            "customer": "Cô Chín",
            "initialCash": setup_data["initialCash"],
            "finalCash": final_metrics["finalCash"],
            "cashIncrease": cash_increase,
            "salePrice": 15000,
            "cashIncreasePass": cash_increase == 15000,
            "stockDeduction": {
                "ice": {"before": setup_data["initialStock"]["ice"], "after": final_metrics["stock"]["ice"], "consumed": ice_diff},
                "sugar_syrup": {"before": setup_data["initialStock"]["sugar_syrup"], "after": final_metrics["stock"]["sugar_syrup"], "consumed": sugar_diff},
                "kumquat": {"before": setup_data["initialStock"]["kumquat"], "after": final_metrics["stock"]["kumquat"], "consumed": kumquat_diff}
            },
            "stockDeductionPass": (ice_diff == 1 and sugar_diff == 1 and kumquat_diff == 1),
            "rapidClickResults": click_results,
            "doubleTapPreventionPass": True,
            "servedOrdersCount": final_metrics["servedOrdersCount"],
            "servedOrderDetails": final_metrics["servedOrder"],
            "uiEvidence": {
                "cashGainText": final_metrics["cashGainText"],
                "cashDisplayText": final_metrics["cashDisplayText"],
                "hasTrayDish": final_metrics["hasTrayDish"]
            }
        }

        report_file = DOCS_EVIDENCE / "tra_tac_delivery_report.json"
        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        shutil.copyfile(report_file, ARTIFACT_DIR / "tra_tac_delivery_report.json")
        print(f"Report saved to {report_file}")

        await page.close()
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_tra_tac_and_double_tap())
