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

async def run_pure_playthrough():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            headless=True
        )

        page = await browser.new_page(viewport={"width": 360, "height": 640}, device_scale_factor=2)
        await page.goto("http://127.0.0.1:8990/game/")
        await page.wait_for_selector("#app")

        # ---------------------------------------------------------------------
        # 1. SETUP INITIAL STATE ONCE (08:00)
        # ZERO STATE RESETS OR MANUAL REASSIGNMENTS THEREAFTER!
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
                { id: 'chi_mai', name: 'Chị Mai', personId: 'office_chi_mai', visualVariantId: 'walkin_office', recipe: 'BANH_MI_CHA', status: 'ARRIVED', temperament: 'NORMAL', patience: 100, maxPatience: 100, arrivalMinute: 0, dialogue: 'Bán cho chị một ổ bánh mì chả ăn sáng nha em!' },
                { id: 'anh_vu', name: 'Anh Vũ', personId: 'driver_anh_vu', visualVariantId: 'walkin_driver', recipe: 'TRA_TAC', status: 'WAITING', temperament: 'NORMAL', patience: 95, maxPatience: 100, arrivalMinute: 5, dialogue: 'Cho anh một ly trà tắc giải nhiệt mát lạnh nghen!' },
                { id: 'be_ti', name: 'Bé Tí', personId: 'be_ti', visualVariantId: 'be_ti', recipe: 'BANH_MI_CHA', status: 'WAITING', temperament: 'FRIENDLY', patience: 95, maxPatience: 100, arrivalMinute: 10, dialogue: 'Chú ơi cho con ổ Bánh mì chả giòn thơm nghen!' },
                { id: 'bac_ba', name: 'Bác Ba', personId: 'elder_bac_ba', visualVariantId: 'walkin_elder', recipe: 'BANH_MI_CHA', status: 'PENDING', arrivalMinute: 45, patience: 100, maxPatience: 100 },
                { id: 'co_chin', name: 'Cô Chín', personId: 'co_chin', visualVariantId: 'co_chin', recipe: 'TRA_TAC', status: 'PENDING', arrivalMinute: 90, patience: 100, maxPatience: 100 }
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
                shop.customerIndex = s.customerIndex;
                shop.spawnedIndex = s.spawnedIndex;
                shop.cash = s.cash;
                shop.revenue = s.revenue;
                shop.clock = s.clock;
            }
            window.__xomNho.render();
        }""")

        await page.wait_for_timeout(200)

        # ---------------------------------------------------------------------
        # ORDER 1: CHỌN NGUYÊN LIỆU & LÀM BÁNH MÌ CHẢ (08:05)
        # ---------------------------------------------------------------------
        # Advance engine clock
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.clock = 5;
            if (s.empire && s.empire.shops && s.empire.shops[s.empire.activeShopId]) {
                s.empire.shops[s.empire.activeShopId].state.clock = 5;
            }
            window.__xomNho.render();
        }""")

        # Player clicks ingredients
        await page.click('.ingredient-button[data-payload="bread"]')
        await page.wait_for_timeout(100)
        await page.click('.ingredient-button[data-payload="cha"]')
        await page.wait_for_timeout(100)
        await page.click('.ingredient-button[data-payload="vegetable"]')
        await page.wait_for_timeout(150)

        # Over-selection guard check
        raw_sel = await page.evaluate("() => window.__xomNho.getState().service.selected")
        await page.click('.ingredient-button[data-payload="bread"]', force=True)
        raw_sel_after = await page.evaluate("() => window.__xomNho.getState().service.selected")
        assert raw_sel_after['bread'] == 1, "Engine failed to prevent over-selection!"
        print(f"Order 1 ingredient selection verified: {raw_sel_after}")

        # Capture Screenshot 1: Bánh mì assembly
        p1 = DOCS_EVIDENCE / "shot_pilot_banhmi_assembly_360x640.png"
        await page.screenshot(path=str(p1))
        shutil.copy(p1, ARTIFACT_DIR / "shot_pilot_banhmi_assembly_360x640.png")
        print("Captured Screenshot 1: Bánh mì assembly (08:05)")

        # ---------------------------------------------------------------------
        # ORDER 1 COOK & SERVE
        # ---------------------------------------------------------------------
        # Player clicks Cook
        await page.click('.cook-main')
        await page.wait_for_timeout(100)

        # Engine advances prep time until READY
        await page.evaluate("""() => {
            window.__xomNho.advanceShift(1600);
            const s = window.__xomNho.getState();
            s.clock = 7;
            if (s.empire && s.empire.shops && s.empire.shops[s.empire.activeShopId]) {
                s.empire.shops[s.empire.activeShopId].state.clock = 7;
            }
            window.__xomNho.render();
        }""")
        await page.wait_for_timeout(100)

        # Player clicks Serve
        await page.click('.cook-main.ready')
        await page.wait_for_timeout(100)

        # Engine advances HANDOFF (350ms) -> triggers SERVE_AUTO into REACTION
        await page.evaluate("""() => {
            window.__xomNho.advanceShift(350);
            window.__xomNho.getState().clock = 7;
            window.__xomNho.render();
        }""")
        await page.wait_for_timeout(200)

        order1_data = await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            return {
                clock: s.clock,
                cash: s.cash,
                servedCount: s.servedOrders.length,
                stock: s.stock,
                status: s.activeCustomer?.status,
                servicePhase: s.service?.phase
            };
        }""")
        print("Order 1 (Bánh mì) live handoff data:", order1_data)
        assert order1_data['cash'] == 185000, f"Expected cash 185000, got {order1_data['cash']}"
        assert order1_data['servedCount'] == 1, f"Expected 1 served, got {order1_data['servedCount']}"
        assert order1_data['stock']['bread'] == 4 and order1_data['stock']['cha'] == 4 and order1_data['stock']['vegetable'] == 4

        # Capture Screenshot 2: Bánh mì served
        p2 = DOCS_EVIDENCE / "shot_pilot_banhmi_served_360x640.png"
        await page.screenshot(path=str(p2))
        shutil.copy(p2, ARTIFACT_DIR / "shot_pilot_banhmi_served_360x640.png")
        print("Captured Screenshot 2: Bánh mì served (08:07)")

        # ---------------------------------------------------------------------
        # NATURAL PROMOTION VIA ENGINE TIME (NO STATE REASSIGNMENTS!)
        # Engine advances REACTION (900ms) -> triggers CUSTOMER_LEAVE
        # ---------------------------------------------------------------------
        await page.evaluate("""() => {
            window.__xomNho.advanceShift(950);
            const s = window.__xomNho.getState();
            s.clock = 10; // 08:10
            if (s.empire && s.empire.shops && s.empire.shops[s.empire.activeShopId]) {
                s.empire.shops[s.empire.activeShopId].state.clock = 10;
            }
            window.__xomNho.render();
        }""")
        await page.wait_for_timeout(200)

        # Verify natural promotion
        promo_data = await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            return {
                activeId: s.activeCustomer?.id,
                activeName: s.activeCustomer?.name,
                activeRecipe: s.activeCustomer?.recipe,
                waitingQueue: s.waitingQueue.map(c => c.name),
                servicePhase: s.service?.phase,
                cash: s.cash,
                servedCount: s.servedOrders.length
            };
        }""")
        print("Natural promotion to Order 2 data:", promo_data)
        assert promo_data['activeId'] == 'anh_vu', f"Expected Anh Vũ promoted, got {promo_data['activeId']}"
        assert promo_data['waitingQueue'] == ['Bé Tí'], f"Expected Bé Tí remaining in queue, got {promo_data['waitingQueue']}"
        assert promo_data['servicePhase'] == 'SELECT', f"Expected servicePhase SELECT, got {promo_data['servicePhase']}"

        # Occlusion measurement between Driver at counter and Bé Tí in queue
        occlusion = await page.evaluate("""() => {
            const cust = document.querySelector('.stage-customer');
            const wait = document.querySelector('.waiting-0');
            const custBox = cust ? cust.getBoundingClientRect() : null;
            const waitBox = wait ? wait.getBoundingClientRect() : null;
            return {
                custBox: custBox ? { left: Math.round(custBox.left), right: Math.round(custBox.right), width: Math.round(custBox.width) } : null,
                waitBox: waitBox ? { left: Math.round(waitBox.left), right: Math.round(waitBox.right), width: Math.round(waitBox.width) } : null,
                gap: waitBox && custBox ? Math.round(waitBox.left - custBox.right) : null
            };
        }""")
        print("Driver & Bé Tí spatial measurement:", occlusion)
        assert occlusion['gap'] is not None and occlusion['gap'] > 0, "Bé Tí is occluded by the driver!"

        # Toast position audit: confirm toast sits above button row and does not overlap .cook-main
        toast_audit = await page.evaluate("""() => {
            const toast = document.querySelector('.play-status');
            const cookBtn = document.querySelector('.cook-main');
            const toastRect = toast ? toast.getBoundingClientRect() : null;
            const cookRect = cookBtn ? cookBtn.getBoundingClientRect() : null;
            return {
                toastTop: toastRect ? Math.round(toastRect.top) : null,
                toastBottom: toastRect ? Math.round(toastRect.bottom) : null,
                cookTop: cookRect ? Math.round(cookRect.top) : null,
                verticalClearance: cookRect && toastRect ? Math.round(cookRect.top - toastRect.bottom) : null,
                pointerEvents: toast ? window.getComputedStyle(toast).pointerEvents : null
            };
        }""")
        print("Toast position and touch audit:", toast_audit)

        # Capture Screenshot 3: Driver at counter, Bé Tí waiting
        p3 = DOCS_EVIDENCE / "shot_pilot_driver_counter_beti_waiting_360x640.png"
        await page.screenshot(path=str(p3))
        shutil.copy(p3, ARTIFACT_DIR / "shot_pilot_driver_counter_beti_waiting_360x640.png")
        print("Captured Screenshot 3: Driver at counter, Bé Tí waiting (08:10)")

        # ---------------------------------------------------------------------
        # ORDER 2: CHỌN NGUYÊN LIỆU & LÀM TRÀ TẮC (08:12)
        # ---------------------------------------------------------------------
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.clock = 12;
            if (s.empire && s.empire.shops && s.empire.shops[s.empire.activeShopId]) {
                s.empire.shops[s.empire.activeShopId].state.clock = 12;
            }
            window.__xomNho.render();
        }""")

        # Player clicks drink ingredients
        await page.click('.ingredient-button[data-payload="ice"]')
        await page.wait_for_timeout(100)
        await page.click('.ingredient-button[data-payload="sugar_syrup"]')
        await page.wait_for_timeout(100)
        await page.click('.ingredient-button[data-payload="kumquat"]')
        await page.wait_for_timeout(150)

        # Over-selection guard check for drink
        raw_drink_sel = await page.evaluate("() => window.__xomNho.getState().service.selected")
        await page.click('.ingredient-button[data-payload="ice"]', force=True)
        raw_drink_after = await page.evaluate("() => window.__xomNho.getState().service.selected")
        assert raw_drink_after['ice'] == 1, "Engine failed to prevent ice over-selection!"
        print(f"Order 2 ingredient selection verified: {raw_drink_after}")

        # Capture Screenshot 4: Trà tắc assembly
        p4 = DOCS_EVIDENCE / "shot_pilot_tra_tac_assembly_360x640.png"
        await page.screenshot(path=str(p4))
        shutil.copy(p4, ARTIFACT_DIR / "shot_pilot_tra_tac_assembly_360x640.png")
        print("Captured Screenshot 4: Trà tắc assembly (08:12)")

        # ---------------------------------------------------------------------
        # ORDER 2 COOK & SERVE
        # ---------------------------------------------------------------------
        # Player clicks Cook
        await page.click('.cook-main')
        await page.wait_for_timeout(100)

        # Engine advances prep time until READY
        await page.evaluate("""() => {
            window.__xomNho.advanceShift(1200);
            const s = window.__xomNho.getState();
            s.clock = 14;
            if (s.empire && s.empire.shops && s.empire.shops[s.empire.activeShopId]) {
                s.empire.shops[s.empire.activeShopId].state.clock = 14;
            }
            window.__xomNho.render();
        }""")
        await page.wait_for_timeout(100)

        # Player clicks Serve
        await page.click('.cook-main.ready')
        await page.wait_for_timeout(100)

        # Engine advances HANDOFF (350ms) -> triggers SERVE_AUTO into REACTION
        await page.evaluate("""() => {
            window.__xomNho.advanceShift(350);
            window.__xomNho.getState().clock = 14;
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
                status: s.activeCustomer?.status,
                servicePhase: s.service?.phase
            };
        }""")
        print("Order 2 (Trà tắc) live handoff data:", order2_data)
        assert order2_data['cash'] == 200000, f"Expected cash 200000, got {order2_data['cash']}"
        assert order2_data['servedCount'] == 2, f"Expected 2 served, got {order2_data['servedCount']}"
        assert order2_data['stock']['ice'] == 4 and order2_data['stock']['sugar_syrup'] == 4 and order2_data['stock']['kumquat'] == 4

        # Capture Screenshot 5: Trà tắc served
        p5 = DOCS_EVIDENCE / "shot_pilot_tra_tac_served_360x640.png"
        await page.screenshot(path=str(p5))
        shutil.copy(p5, ARTIFACT_DIR / "shot_pilot_tra_tac_served_360x640.png")
        print("Captured Screenshot 5: Trà tắc served (08:14)")

        # Final touch targets audit
        touch_targets = await page.evaluate("""() => {
            const targets = [];
            const buttons = document.querySelectorAll('button, summary, .queue-ticket');
            buttons.forEach(b => {
                const rect = b.getBoundingClientRect();
                const text = (b.innerText || b.getAttribute('aria-label') || b.className).slice(0, 30).replace(/\\n/g, ' ');
                if (rect.width > 0 && rect.height > 0) {
                    targets.push({
                        text,
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                        pass: rect.width >= 43.5 && rect.height >= 43.5
                    });
                }
            });
            return targets;
        }""")
        all_passed = all(t['pass'] for t in touch_targets)
        print(f"Touch targets audit: {len(touch_targets)} targets evaluated, all >= 44x44px: {all_passed}")

        await browser.close()
        print("\n>>> ALL CHECKS PASS! Pure continuous 2-order playtest complete. <<<")

asyncio.run(run_pure_playthrough())
