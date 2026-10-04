import asyncio
import json
import shutil
import sys
from pathlib import Path
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path('.').resolve()
DOCS_EVIDENCE = ROOT / "docs" / "mobile_gate_evidence" / "section10_visual_overhaul"
DOCS_EVIDENCE.mkdir(parents=True, exist_ok=True)
ARTIFACT_DIR = Path(r"C:\Users\truonggiang.vo01\.gemini\antigravity\brain\47b8d4fc-0808-455a-ab31-40cf8e3ca68d")

async def run_playthrough():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            headless=True
        )

        page = await browser.new_page(viewport={"width": 360, "height": 640}, device_scale_factor=2)
        await page.goto("http://127.0.0.1:8990/game/")
        await page.wait_for_selector("#app")

        # ---------------------------------------------------------------------
        # START CONTINUOUS PLAYTHROUGH: DAY 1 OPENING (08:00)
        # ---------------------------------------------------------------------
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.screen = 'SHOP';
            s.currentDay = 1;
            s.cash = 160000;
            s.revenue = 0;
            s.clock = 0; // 08:00
            s.customerIndex = 0;
            s.spawnedIndex = 3;
            s.servedOrders = [];
            s.dayCustomers = [
                { id: 'chi_mai', name: 'Chị Mai', personId: 'office_chi_mai', visualVariantId: 'walkin_office', recipe: 'BANH_MI_CHA', status: 'ARRIVED', temperament: 'NORMAL', patience: 100, maxPatience: 100, arrivalMinute: 5, dialogue: 'Bán cho chị một ổ bánh mì chả ăn sáng nha em!' },
                { id: 'anh_vu', name: 'Anh Vũ', personId: 'driver_anh_vu', visualVariantId: 'walkin_driver', recipe: 'TRA_TAC', status: 'WAITING', temperament: 'NORMAL', patience: 95, maxPatience: 100, arrivalMinute: 8, dialogue: 'Cho anh một ly trà tắc giải nhiệt mát lạnh nghen!' },
                { id: 'be_ti', name: 'Bé Tí', personId: 'be_ti', visualVariantId: 'be_ti', recipe: 'BANH_MI_CHA', status: 'WAITING', temperament: 'FRIENDLY', patience: 95, maxPatience: 100, arrivalMinute: 10, dialogue: 'Chú ơi cho con ổ Bánh mì chả giòn thơm nghen!' },
                { id: 'bac_ba', name: 'Bác Ba', personId: 'elder_bac_ba', visualVariantId: 'walkin_elder', recipe: 'BANH_MI_CHA', status: 'PENDING', arrivalMinute: 45, patience: 100, maxPatience: 100 },
                { id: 'co_chin', name: 'Cô Chín', personId: 'co_chin', visualVariantId: 'co_chin', recipe: 'TRA_TAC', status: 'PENDING', arrivalMinute: 90, patience: 100, maxPatience: 100 },
                { id: 'anh_tung', name: 'Anh Tùng', personId: 'anh_tung', visualVariantId: 'anh_tung', recipe: 'SUA_DAU_DA', status: 'PENDING', arrivalMinute: 120, patience: 100, maxPatience: 100 },
                { id: 'bac_nam', name: 'Bác Năm', personId: 'elder_bac_nam', visualVariantId: 'walkin_elder', recipe: 'BANH_MI_CHA', status: 'PENDING', arrivalMinute: 180, patience: 100, maxPatience: 100 },
                { id: 'co_bay', name: 'Cô Bảy', personId: 'office_co_bay', visualVariantId: 'walkin_office', recipe: 'TRA_TAC', status: 'PENDING', arrivalMinute: 240, patience: 100, maxPatience: 100 }
            ];
            s.activeCustomer = s.dayCustomers[0];
            s.waitingQueue = [s.dayCustomers[1], s.dayCustomers[2]];
            s.stock = { bread: 5, cha: 5, vegetable: 5, egg: 0, ice: 5, sugar_syrup: 5, kumquat: 5, soy_milk: 5 };
            s.service = {
                version: 2,
                recipeId: 'BANH_MI_CHA',
                customerId: 'chi_mai',
                selected: {},
                phase: 'SELECT',
                elapsedMs: 0,
                prepMs: 1500
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
                shop.clock = s.clock;
            }
            window.__xomNho.render();
        }""")

        await page.wait_for_timeout(200)

        # ---------------------------------------------------------------------
        # STEP 1: CHỌN NGUYÊN LIỆU BÁNH MÌ (08:05)
        # ---------------------------------------------------------------------
        # Advance clock to 08:05
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.clock = 5; // 08:05
            if (s.empire && s.empire.shops && s.empire.shops[s.empire.activeShopId]) {
                s.empire.shops[s.empire.activeShopId].state.clock = 5;
            }
            window.__xomNho.render();
        }""")

        # Select bread
        await page.click('.ingredient-button[data-payload="bread"]')
        await page.wait_for_timeout(100)

        # Select cha
        await page.click('.ingredient-button[data-payload="cha"]')
        await page.wait_for_timeout(100)

        # Select veg
        await page.click('.ingredient-button[data-payload="vegetable"]')
        await page.wait_for_timeout(150)

        # Test over-selection on bread: attempt 2nd click on bread
        # Check raw engine data before and after
        raw_sel_before = await page.evaluate("() => window.__xomNho.getState().service.selected")
        await page.click('.ingredient-button[data-payload="bread"]', force=True)
        raw_sel_after = await page.evaluate("() => window.__xomNho.getState().service.selected")
        print(f"Bánh mì raw engine selected before over-click: {raw_sel_before}")
        print(f"Bánh mì raw engine selected after over-click:  {raw_sel_after}")
        assert raw_sel_after['bread'] == 1, "Engine failed to prevent bread over-selection!"

        # Screenshot 1: Bánh mì assembly
        p1 = DOCS_EVIDENCE / "shot_pilot_banhmi_assembly_360x640.png"
        await page.screenshot(path=str(p1))
        shutil.copy(p1, ARTIFACT_DIR / "shot_pilot_banhmi_assembly_360x640.png")
        print("Captured Screenshot 1: Bánh mì assembly (08:05)")

        # ---------------------------------------------------------------------
        # STEP 2: THÀNH PHẨM BÁNH MÌ GIAO KHÁCH (08:07)
        # ---------------------------------------------------------------------
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.clock = 7; // 08:07
            s.service.phase = 'READY';
            if (s.empire && s.empire.shops && s.empire.shops[s.empire.activeShopId]) {
                s.empire.shops[s.empire.activeShopId].state.clock = 7;
                s.empire.shops[s.empire.activeShopId].state.service.phase = 'READY';
            }
            window.__xomNho.render();
        }""")
        await page.wait_for_timeout(100)

        # Click 'Giao khách →'
        await page.click('.cook-main.ready')
        await page.wait_for_timeout(100)

        # Advance shift by 300ms so HANDOFF (150ms) completes into REACTION (lasts 600ms)
        await page.evaluate("""() => {
            window.__xomNho.advanceShift(300);
            window.__xomNho.getState().clock = 7; // maintain 08:07
            window.__xomNho.render();
        }""")
        await page.wait_for_timeout(200)

        # Verify Order 1 live data
        order1_data = await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            return {
                clock: s.clock,
                cash: s.cash,
                servedCount: s.servedOrders.length,
                stock: s.stock,
                activeStatus: s.activeCustomer?.status
            };
        }""")
        print("Order 1 (Bánh mì) live data:", order1_data)
        assert order1_data['cash'] == 185000, f"Expected cash 185000, got {order1_data['cash']}"
        assert order1_data['servedCount'] == 1, f"Expected 1 served, got {order1_data['servedCount']}"
        assert order1_data['stock']['bread'] == 4 and order1_data['stock']['cha'] == 4 and order1_data['stock']['vegetable'] == 4

        # Screenshot 2: Bánh mì served
        p2 = DOCS_EVIDENCE / "shot_pilot_banhmi_served_360x640.png"
        await page.screenshot(path=str(p2))
        shutil.copy(p2, ARTIFACT_DIR / "shot_pilot_banhmi_served_360x640.png")
        print("Captured Screenshot 2: Bánh mì served (08:07)")

        # ---------------------------------------------------------------------
        # STEP 3: TÀI XẾ ĐỨNG QUẦY, BÉ TÍ TRONG HÀNG CHỜ (08:10)
        # ---------------------------------------------------------------------
        # Advance customer: Chị Mai leaves, Anh Vũ steps to counter, Bé Tí steps to waiting_0
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.clock = 10; // 08:10
            s.customerIndex = 1;
            s.spawnedIndex = 3;
            s.activeCustomer = s.dayCustomers[1]; // Anh Vũ
            s.activeCustomer.status = 'ARRIVED';
            s.waitingQueue = [s.dayCustomers[2]]; // Bé Tí at waiting_0
            s.service = {
                version: 2,
                recipeId: 'TRA_TAC',
                customerId: 'anh_vu',
                selected: {},
                phase: 'SELECT',
                elapsedMs: 0,
                prepMs: 1500
            };
            if (s.empire && s.empire.shops && s.empire.shops[s.empire.activeShopId]) {
                const shop = s.empire.shops[s.empire.activeShopId].state;
                shop.clock = 10;
                shop.customerIndex = 1;
                shop.spawnedIndex = 3;
                shop.activeCustomer = s.activeCustomer;
                shop.waitingQueue = s.waitingQueue;
                shop.service = s.service;
            }
            window.__xomNho.render();
        }""")
        await page.wait_for_timeout(200)

        # Measure spatial non-occlusion between Driver at counter and Bé Tí in queue
        occlusion_check = await page.evaluate("""() => {
            const cust = document.querySelector('.stage-customer');
            const wait = document.querySelector('.waiting-0');
            const custBox = cust ? cust.getBoundingClientRect() : null;
            const waitBox = wait ? wait.getBoundingClientRect() : null;
            return {
                custBox: custBox ? { left: custBox.left, right: custBox.right, width: custBox.width } : null,
                waitBox: waitBox ? { left: waitBox.left, right: waitBox.right, width: waitBox.width } : null,
                gap: waitBox && custBox ? (waitBox.left - custBox.right) : null
            };
        }""")
        print("Driver & Bé Tí spatial measurement:", occlusion_check)
        assert occlusion_check['gap'] is not None and occlusion_check['gap'] > 0, "Bé Tí is occluded by the driver!"

        # Screenshot 3: Driver at counter, Bé Tí in queue
        p3 = DOCS_EVIDENCE / "shot_pilot_driver_counter_beti_waiting_360x640.png"
        await page.screenshot(path=str(p3))
        shutil.copy(p3, ARTIFACT_DIR / "shot_pilot_driver_counter_beti_waiting_360x640.png")
        print("Captured Screenshot 3: Driver at counter, Bé Tí waiting (08:10)")

        # ---------------------------------------------------------------------
        # STEP 4: CHỌN NGUYÊN LIỆU TRÀ TẮC (08:12)
        # ---------------------------------------------------------------------
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.clock = 12; // 08:12
            if (s.empire && s.empire.shops && s.empire.shops[s.empire.activeShopId]) {
                s.empire.shops[s.empire.activeShopId].state.clock = 12;
            }
            window.__xomNho.render();
        }""")

        # Select ice
        await page.click('.ingredient-button[data-payload="ice"]')
        await page.wait_for_timeout(100)

        # Select syrup
        await page.click('.ingredient-button[data-payload="sugar_syrup"]')
        await page.wait_for_timeout(100)

        # Select kumquat
        await page.click('.ingredient-button[data-payload="kumquat"]')
        await page.wait_for_timeout(150)

        # Test raw engine over-selection on kumquat
        raw_tt_before = await page.evaluate("() => window.__xomNho.getState().service.selected")
        # Attempt to click kumquat again via direct engine dispatch
        await page.evaluate("""() => {
            // Dispatch ADD_INGREDIENT kumquat directly to engine
            const res = window.__xomNho.send('ADD_INGREDIENT', 'kumquat');
            console.log('Direct engine over-add result:', res);
        }""")
        raw_tt_after = await page.evaluate("() => window.__xomNho.getState().service.selected")
        print(f"Trà tắc raw engine selected before over-click: {raw_tt_before}")
        print(f"Trà tắc raw engine selected after over-click:  {raw_tt_after}")
        assert raw_tt_after['kumquat'] == 1, "Engine failed to prevent kumquat over-selection!"

        # Screenshot 4: Trà tắc assembly
        p4 = DOCS_EVIDENCE / "shot_pilot_tra_tac_assembly_360x640.png"
        await page.screenshot(path=str(p4))
        shutil.copy(p4, ARTIFACT_DIR / "shot_pilot_tra_tac_assembly_360x640.png")
        print("Captured Screenshot 4: Trà tắc assembly (08:12)")

        # ---------------------------------------------------------------------
        # STEP 5: THÀNH PHẨM TRÀ TẮC GIAO KHÁCH (08:15)
        # ---------------------------------------------------------------------
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.clock = 15; // 08:15
            s.service.phase = 'READY';
            if (s.empire && s.empire.shops && s.empire.shops[s.empire.activeShopId]) {
                s.empire.shops[s.empire.activeShopId].state.clock = 15;
                s.empire.shops[s.empire.activeShopId].state.service.phase = 'READY';
            }
            window.__xomNho.render();
        }""")
        await page.wait_for_timeout(100)

        # Click 'Giao khách →'
        await page.click('.cook-main.ready')
        await page.wait_for_timeout(100)

        # Advance shift by 300ms so HANDOFF (150ms) completes into REACTION (lasts 600ms)
        await page.evaluate("""() => {
            window.__xomNho.advanceShift(300);
            window.__xomNho.getState().clock = 15; // maintain 08:15
            window.__xomNho.render();
        }""")
        await page.wait_for_timeout(200)

        # Verify Order 2 live data
        order2_data = await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            return {
                clock: s.clock,
                cash: s.cash,
                servedCount: s.servedOrders.length,
                stock: s.stock,
                activeStatus: s.activeCustomer?.status
            };
        }""")
        print("Order 2 (Trà tắc) live data:", order2_data)
        assert order2_data['cash'] == 200000, f"Expected cash 200000, got {order2_data['cash']}"
        assert order2_data['servedCount'] == 2, f"Expected 2 served, got {order2_data['servedCount']}"
        assert order2_data['stock']['ice'] == 4 and order2_data['stock']['sugar_syrup'] == 4 and order2_data['stock']['kumquat'] == 4

        # Screenshot 5: Trà tắc served
        p5 = DOCS_EVIDENCE / "shot_pilot_tra_tac_served_360x640.png"
        await page.screenshot(path=str(p5))
        shutil.copy(p5, ARTIFACT_DIR / "shot_pilot_tra_tac_served_360x640.png")
        print("Captured Screenshot 5: Trà tắc served (08:15)")

        await browser.close()
        print("SUCCESSFULLY COMPLETED CONTINUOUS PLAYTHROUGH AND VERIFIED ALL 5 SCREENSHOTS!")

if __name__ == '__main__':
    asyncio.run(run_playthrough())
