import sys, asyncio, os, time
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

async def js_eval(page, script):
    return await page.evaluate(script)

async def js_click(page, selector):
    return await page.evaluate(f"""() => {{
        const el = document.querySelector('{selector}');
        if (!el) return false;
        el.click();
        return true;
    }}""")

async def run_gate1_logic_tests():
    print("=" * 65)
    print("GATE 1: COMPREHENSIVE LOGIC VERIFICATION SUITE (v0.7 IDLE MANAGEMENT)")
    print("=" * 65)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
            headless=True
        )
        context = await browser.new_context(viewport={'width': 390, 'height': 844})
        page = await context.new_page()
        
        errors = []
        page.on('pageerror', lambda err: errors.append(str(err)))
        
        await page.goto('http://127.0.0.1:8000/game/')
        await page.wait_for_timeout(400)
        
        # ─────────────────────────────────────────────────────────────
        # TEST 1: END-TO-END SIMULATION PIPELINE & DYNAMIC RECONCILED LEDGER
        # ─────────────────────────────────────────────────────────────
        print("\n--- TEST 1: End-To-End Simulation Pipeline & Dynamic Ledger ---")
        e2e_ledger = await page.evaluate("""() => {
            return import('./day1-core.mjs').then(core => {
                // Run complete simulation from fresh state to Day Result
                let s = core.action(core.fresh(), 'SET_SHOP_NAME', 'Quán Test').state;
                s.screen = 'MARKET';
                s = core.action(s, 'BUNDLE_DAY1').state;
                s = core.action(s, 'BUY').state;
                
                // Spent 55k, cash remaining 5k
                const spent = s.spent;
                const cashAfterBuy = s.cash;
                
                // Start day on time 8:00
                s = core.action(s, 'SET_OPENING_TIME', 'ontime_8am').state;
                s = core.action(s, 'START_DAY').state;
                
                // 1. Bác Ba (08:30) - Bánh mì chả
                s = core.action(s, 'TICK', 30).state;
                s = core.action(s, 'SERVE_AUTO').state;
                s = core.action(s, 'CUSTOMER_LEAVE').state;
                
                // 2. Chị Hai (09:15) - Trà tắc
                s = core.action(s, 'TICK', 45).state;
                s = core.action(s, 'SERVE_AUTO').state;
                s = core.action(s, 'CUSTOMER_LEAVE').state;
                
                // 3. Bé Tí (10:00) - Bánh mì chả (Extra chả)
                s = core.action(s, 'TICK', 45).state;
                s = core.action(s, 'DECIDE', { choice: 'yes' }).state;
                s = core.action(s, 'SERVE_AUTO').state;
                s = core.action(s, 'CUSTOMER_LEAVE').state;
                
                // 4. Cô Chín (11:00) - Trà tắc
                s = core.action(s, 'TICK', 60).state;
                s = core.action(s, 'SERVE_AUTO').state;
                s = core.action(s, 'CUSTOMER_LEAVE').state;
                
                // Market news ticker at 11:15 (TICK +15)
                s = core.action(s, 'TICK', 15).state;
                const hadNewsTicker = s.newsTicker !== null;
                
                // 5. Anh Tùng (11:45) - Sữa đậu đá
                s = core.action(s, 'TICK', 30).state;
                s = core.action(s, 'SERVE_AUTO').state;
                s = core.action(s, 'CUSTOMER_LEAVE').state;
                
                // 6. Bác Năm (12:15) - Bánh mì chả
                s = core.action(s, 'TICK', 30).state;
                s = core.action(s, 'SERVE_AUTO').state;
                s = core.action(s, 'CUSTOMER_LEAVE').state;
                
                // 7. Cô Bảy (12:45) - Trà tắc (Hết tắc tươi -> OUT_OF_STOCK)
                s = core.action(s, 'TICK', 30).state;
                s = core.action(s, 'SERVE_AUTO').state;
                s = core.action(s, 'CUSTOMER_LEAVE').state;
                
                // 8. Chú Tư (13:15) - Bánh mì chả (Hết bánh mì -> OUT_OF_STOCK)
                s = core.action(s, 'TICK', 30).state;
                s = core.action(s, 'SERVE_AUTO').state;
                s = core.action(s, 'CUSTOMER_LEAVE').state;
                
                // Close shop and compute ledger
                s = core.action(s, 'CLOSE').state;
                const ledger = core.calculateLedger(s);
                
                return {
                    spent,
                    cashAfterBuy,
                    hadNewsTicker,
                    ledger,
                    remainingStock: s.stock
                };
            });
        }""")
        
        print("  Full Simulation Ledger Output:")
        print(f"    Spent on Stock:        -{e2e_ledger['spent']}")
        print(f"    Starting Cash:          {e2e_ledger['ledger']['startingCash']}")
        print(f"    Cash Collected:        +{e2e_ledger['ledger']['cashSalesCollected']}")
        print(f"    Final Cash in Drawer:   {e2e_ledger['ledger']['finalCashInDrawer']}")
        print(f"    Gross Profit:          +{e2e_ledger['ledger']['grossOperatingProfit']}")
        print(f"    Served Orders:          {e2e_ledger['ledger']['servedCount']} / 8")
        print(f"    Missed Orders:          {e2e_ledger['ledger']['missedCount']} / 8")
        print(f"    Remaining Stock:        {e2e_ledger['remainingStock']}")
        
        assert e2e_ledger['spent'] == 55000, "Morning market spend must be 55.000đ"
        assert e2e_ledger['cashAfterBuy'] == 5000, "Cash after buy must be 5.000đ"
        assert e2e_ledger['hadNewsTicker'], "News ticker must trigger at 11:15"
        assert e2e_ledger['ledger']['cashSalesCollected'] == 122000, "Collected revenue must be 122.000đ"
        assert e2e_ledger['ledger']['finalCashInDrawer'] == 127000, "Final cash must be 127.000đ"
        assert e2e_ledger['ledger']['grossOperatingProfit'] == 67000, "Gross profit must be +67.000đ"
        assert e2e_ledger['ledger']['servedCount'] == 6, "Must serve exactly 6 customers"
        assert e2e_ledger['ledger']['missedCount'] == 2, "Must miss exactly 2 customers"
        assert all(q == 0 for q in e2e_ledger['remainingStock'].values()), "All 19 stock units must be consumed"
        print("  ✓ PASS: End-to-end simulation naturally produces 127k cash and 67k gross profit!")

        # ─────────────────────────────────────────────────────────────
        # TEST 2: PRICE SENSITIVITY MECHANICS (High Tier vs HIGH Sensitivity)
        # ─────────────────────────────────────────────────────────────
        print("\n--- TEST 2: Customer Price Sensitivity Mechanics ---")
        price_test = await page.evaluate("""() => {
            return import('./day1-core.mjs').then(core => {
                let s = core.action(core.fresh(), 'SET_SHOP_NAME', 'Quán Test').state;
                s.screen = 'MENU';
                s.stock = { bread: 5, cha: 5, vegetable: 5, ice: 5, sugar_syrup: 5, kumquat: 5, soy_milk: 5 };
                
                // Case A: Set Bánh Mì to Tier 3 (Cao: 28.000đ)
                s = core.action(s, 'CONFIG_MENU', { recipeId: 'BANH_MI_CHA', sellPrice: 28000 }).state;
                s = core.action(s, 'START_DAY').state;
                
                // Customer with MEDIUM sensitivity (Bác Ba): accepts 28k
                s.activeCustomer = { id: 'bac_ba', name: 'Bác Ba', recipe: 'BANH_MI_CHA', priceSensitivity: 'MEDIUM', status: 'ARRIVED' };
                s = core.action(s, 'SERVE_AUTO').state;
                const bacBaServed = s.activeCustomer.status === 'SERVED';
                const revenueAfterBacBa = s.revenue; // 28.000đ
                s = core.action(s, 'CUSTOMER_LEAVE').state;
                
                // Customer with HIGH sensitivity (Bác Năm): rejects 28k as too expensive
                s.activeCustomer = { id: 'bac_nam', name: 'Bác Năm', recipe: 'BANH_MI_CHA', priceSensitivity: 'HIGH', status: 'ARRIVED' };
                const stockBeforeBacNam = s.stock.bread;
                s = core.action(s, 'SERVE_AUTO').state;
                const bacNamStatus = s.activeCustomer.status; // PRICE_REJECTED
                const bacNamReason = s.missedOrders[0]?.reason; // PRICE_TOO_HIGH
                const stockAfterBacNam = s.stock.bread; // Unchanged!
                const revenueAfterBacNam = s.revenue; // Unchanged (still 28k)!
                s = core.action(s, 'CUSTOMER_LEAVE').state;
                
                // Case B: Set price back to standard 25.000đ
                s.menu.BANH_MI_CHA.sellPrice = 25000;
                s.activeCustomer = { id: 'chu_tu', name: 'Chú Tư', recipe: 'BANH_MI_CHA', priceSensitivity: 'HIGH', status: 'ARRIVED' };
                s = core.action(s, 'SERVE_AUTO').state;
                const chuTuServed = s.activeCustomer.status === 'SERVED';
                
                return {
                    bacBaServed,
                    revenueAfterBacBa,
                    bacNamStatus,
                    bacNamReason,
                    stockProtected: stockBeforeBacNam === stockAfterBacNam,
                    revenueProtected: revenueAfterBacBa === revenueAfterBacNam,
                    chuTuServed
                };
            });
        }""")
        
        print(f"  Price Sensitivity Results: {price_test}")
        assert price_test['bacBaServed'], "Medium sensitivity customer accepts 28k"
        assert price_test['bacNamStatus'] == 'PRICE_REJECTED', "High sensitivity customer rejects 28k"
        assert price_test['bacNamReason'] == 'PRICE_TOO_HIGH', "Reason must be recorded as PRICE_TOO_HIGH"
        assert price_test['stockProtected'], "Stock must not be deducted on price rejection"
        assert price_test['revenueProtected'], "Revenue must not increase on price rejection"
        assert price_test['chuTuServed'], "High sensitivity customer accepts standard 25k price"
        print("  ✓ PASS: Price sensitivity enforces realistic managerial trade-offs!")

        # ─────────────────────────────────────────────────────────────
        # TEST 3: MENU DISABLED DISH DISTINCTION (MENU_DISABLED vs OUT_OF_STOCK)
        # ─────────────────────────────────────────────────────────────
        print("\n--- TEST 3: Menu Disabled Dish Distinction ---")
        disabled_dish_test = await page.evaluate("""() => {
            return import('./day1-core.mjs').then(core => {
                let s = core.action(core.fresh(), 'SET_SHOP_NAME', 'Quán Test').state;
                s.screen = 'MENU';
                s.stock = { bread: 2, cha: 2, vegetable: 2, ice: 2, sugar_syrup: 2, kumquat: 2, soy_milk: 2 };
                
                // Disable Sữa Đậu Đá on menu
                s = core.action(s, 'CONFIG_MENU', { recipeId: 'SUA_DAU_DA', enabled: false }).state;
                s = core.action(s, 'START_DAY').state;
                
                // Customer ordering Sữa Đậu Đá arrives
                s.activeCustomer = { id: 'anh_tung', name: 'Anh Tùng', recipe: 'SUA_DAU_DA', status: 'ARRIVED' };
                s = core.action(s, 'SERVE_AUTO').state;
                
                const customerStatus = s.activeCustomer.status;
                const missedOrder = s.missedOrders[0];
                const ledger = core.calculateLedger(s);
                
                return {
                    customerStatus,
                    reason: missedOrder?.reason,
                    note: missedOrder?.note,
                    missedByReasonMenuDisabled: ledger.missedByReason.MENU_DISABLED.length
                };
            });
        }""")
        
        print(f"  Disabled Dish Results: {disabled_dish_test}")
        assert disabled_dish_test['customerStatus'] == 'MENU_DISABLED', "Status must be MENU_DISABLED"
        assert disabled_dish_test['reason'] == 'MENU_DISABLED', "Reason must be MENU_DISABLED"
        assert disabled_dish_test['missedByReasonMenuDisabled'] == 1, "Ledger must categorize under MENU_DISABLED"
        print("  ✓ PASS: Disabled menu dish cleanly recorded as MENU_DISABLED instead of OUT_OF_STOCK!")

        # ─────────────────────────────────────────────────────────────
        # TEST 4: OPENING TIME IMPACT ON CUSTOMER ROSTER
        # ─────────────────────────────────────────────────────────────
        print("\n--- TEST 4: Opening Time Impact on Customer Roster ---")
        opening_time_test = await page.evaluate("""() => {
            return import('./day1-core.mjs').then(core => {
                let s = core.action(core.fresh(), 'SET_SHOP_NAME', 'Quán Test').state;
                s.screen = 'MENU';
                
                // Choose late opening: late_10am
                s = core.action(s, 'SET_OPENING_TIME', 'late_10am').state;
                s = core.action(s, 'START_DAY').state;
                
                // Check state at start of late day
                const startClock = s.clock; // 120 (10:00 AM)
                const startIndex = s.customerIndex; // 2 (Bé Tí)
                const missedCount = s.missedOrders.length; // 2 (Bác Ba 8:30, Chị Hai 9:15)
                const missedReasons = s.missedOrders.map(o => o.reason);
                const missedNames = s.missedOrders.map(o => o.name);
                
                return {
                    startClock,
                    startIndex,
                    missedCount,
                    missedReasons,
                    missedNames
                };
            });
        }""")
        
        print(f"  Late Opening Results: {opening_time_test}")
        assert opening_time_test['startClock'] == 120, "Clock must start at 10:00 (120 min)"
        assert opening_time_test['startIndex'] == 2, "Customer index must start at Bé Tí"
        assert opening_time_test['missedCount'] == 2, "2 morning customers must be missed"
        assert opening_time_test['missedReasons'] == ['MISSED_LATE_OPENING', 'MISSED_LATE_OPENING']
        assert opening_time_test['missedNames'] == ['Bác Ba', 'Chị Hai']
        print("  ✓ PASS: Opening time logically affects customer arrivals and missed morning traffic!")

        # ─────────────────────────────────────────────────────────────
        # TEST 5: BOTH BRANCHES OF BÉ TÍ DECISION
        # ─────────────────────────────────────────────────────────────
        print("\n--- TEST 5: Both Branches of Bé Tí Decision ---")
        branches_test = await page.evaluate("""() => {
            return import('./day1-core.mjs').then(core => {
                // Branch A: Agree (+1 chả)
                let sA = core.fresh();
                sA.screen = 'SHOP';
                sA.stock = { bread: 3, cha: 4, vegetable: 3, ice: 3, sugar_syrup: 3, kumquat: 2, soy_milk: 1 };
                sA.activeCustomer = { id: 'be_ti', name: 'Bé Tí', recipe: 'BANH_MI_CHA', status: 'ARRIVED' };
                sA.activeDecision = { id: 'EXTRA_CHA' };
                sA.isPaused = true;
                sA = core.action(sA, 'DECIDE', { choice: 'yes' }).state;
                sA = core.action(sA, 'SERVE_AUTO').state;
                
                // Branch B: Deny (standard 1 chả)
                let sB = core.fresh();
                sB.screen = 'SHOP';
                sB.stock = { bread: 3, cha: 4, vegetable: 3, ice: 3, sugar_syrup: 3, kumquat: 2, soy_milk: 1 };
                sB.activeCustomer = { id: 'be_ti', name: 'Bé Tí', recipe: 'BANH_MI_CHA', status: 'ARRIVED' };
                sB.activeDecision = { id: 'EXTRA_CHA' };
                sB.isPaused = true;
                sB = core.action(sB, 'DECIDE', { choice: 'no' }).state;
                sB = core.action(sB, 'SERVE_AUTO').state;
                
                return {
                    branchA_cha: sA.stock.cha, // 4 - 2 = 2
                    branchB_cha: sB.stock.cha, // 4 - 1 = 3
                    branchA_unpaused: !sA.isPaused,
                    branchB_unpaused: !sB.isPaused
                };
            });
        }""")
        
        print(f"  Bé Tí Branches: {branches_test}")
        assert branches_test['branchA_cha'] == 2, "Branch A must consume 2 chả (4 - 2 = 2)"
        assert branches_test['branchB_cha'] == 3, "Branch B must consume 1 chả (4 - 1 = 3)"
        assert branches_test['branchA_unpaused'] and branches_test['branchB_unpaused'], "Both branches must unpause clock"
        print("  ✓ PASS: Both Bé Tí decision branches deduct stock and unpause accurately!")

        # ─────────────────────────────────────────────────────────────
        # TEST 6: REAL BROWSER PAGE RELOAD MID-SHIFT & SIMULATION RECOVERY
        # ─────────────────────────────────────────────────────────────
        print("\n--- TEST 6: Real Browser Page Reload (F5) Mid-Shift & Simulation Recovery ---")
        await page.evaluate("() => localStorage.clear()")
        await page.goto('http://127.0.0.1:8000/game/')
        await page.wait_for_timeout(300)
        
        # Navigate to Market and buy 55k bundle
        await page.fill('#shop-name-input', 'Quán Test')
        await js_click(page, 'button[data-type="SET_SHOP_NAME"]')
        await page.wait_for_timeout(200)
        await js_click(page, 'button[data-type="NAVIGATE"]')
        await page.wait_for_timeout(200)
        await js_click(page, 'button[data-type="BUNDLE_DAY1"]')
        await page.wait_for_timeout(100)
        await js_click(page, 'button[data-type="BUY"]')
        await page.wait_for_timeout(200)
        
        # Start Day
        await js_click(page, 'button[data-type="START_DAY"]')
        await page.wait_for_timeout(400)
        
        # Wait until Customer 1 arrives and is being served
        print("  Waiting for Customer 1 to arrive at counter...")
        for _ in range(25):
            await page.wait_for_timeout(200)
            status = await page.evaluate("() => window.__xomNho?.getState()?.activeCustomer?.status || ''")
            if status in ['ARRIVED', 'SERVED']:
                print(f"  Customer 1 detected with status: {status}")
                break
        
        # Trigger REAL BROWSER RELOAD (F5) while customer is at counter
        print("  Executing real browser page.reload() mid-shift...")
        await page.reload()
        await page.wait_for_timeout(800)
        
        # Verify page rehydrated on SHOP screen and simulation loop resumed
        screen_after_reload = await page.evaluate("() => window.__xomNho?.getState()?.screen || ''")
        print(f"  Screen after reload: {screen_after_reload}")
        assert screen_after_reload == 'SHOP', "Must resume on SHOP screen"
        
        # Switch to x2 speed for fast verification of recovery
        await js_click(page, 'button[data-type="SPEED"][data-payload="2"]')
        await page.wait_for_timeout(200)

        # Verify that customer did not get stuck forever, but continued
        print("  Waiting for simulation to process remaining customers...")
        beti_handled = False
        simulation_finished = False
        
        for i in range(120):
            await page.wait_for_timeout(350)
            
            # Handle Bé Tí if pause modal appears
            has_decision = await page.evaluate("() => Boolean(document.querySelector('.decision-modal-backdrop'))")
            if has_decision and not beti_handled:
                print("  Bé Tí pause modal recovered! Choosing 'yes'...")
                await js_click(page, 'button[data-type="DECIDE"][data-payload="yes"]')
                beti_handled = True
                await page.wait_for_timeout(300)
            
            cust_idx = await page.evaluate("() => window.__xomNho?.getState()?.customerIndex || 0")
            if cust_idx >= 8:
                print(f"  Simulation successfully processed past Customer {cust_idx}!")
                simulation_finished = True
                break
                
        if not simulation_finished:
            final_cust_idx = await page.evaluate("() => window.__xomNho?.getState()?.customerIndex || 0")
            final_cust_status = await page.evaluate("() => window.__xomNho?.getState()?.activeCustomer?.status || ''")
            print(f"  Diagnostics: customerIndex={final_cust_idx}, activeStatus={final_cust_status}")
            
        assert simulation_finished, f"Simulation must recover and continue servicing customers after real page reload! (cust_idx={final_cust_idx if not simulation_finished else cust_idx})"
        after_reload_ledger = await page.evaluate("""() => import('./day1-core.mjs').then(core => core.calculateLedger(window.__xomNho.getState()))""")
        assert after_reload_ledger['servedCount'] + after_reload_ledger['missedCount'] == 8
        assert after_reload_ledger['finalCashInDrawer'] == 127000
        assert after_reload_ledger['grossOperatingProfit'] == 67000
        print("  ✓ PASS: Real browser page.reload() mid-shift recovers and advances simulation smoothly!")

        # ─────────────────────────────────────────────────────────────
        # TEST 7: REPLAY TIMERS CANCELLATION SAFETY
        # ─────────────────────────────────────────────────────────────
        print("\n--- TEST 7: REPLAY During Active Prep / Timers Cancellation ---")
        await js_click(page, 'button[data-type="REPLAY"]')
        await page.fill('#shop-name-input', 'Quán Test')
        await js_click(page, 'button[data-type="SET_SHOP_NAME"]')
        await js_click(page, 'button[data-type="NAVIGATE"]')
        await js_click(page, 'button[data-type="BUNDLE_DAY1"]')
        await js_click(page, 'button[data-type="BUY"]')
        await js_click(page, 'button[data-type="START_DAY"]')
        prep_started = False
        for _ in range(50):
            await page.wait_for_timeout(100)
            prep_started = await page.evaluate("() => Boolean(document.querySelector('.art-layers-stack'))")
            if prep_started:
                break
        assert prep_started, "Must catch an active preparation timer before REPLAY"
        await js_click(page, 'button[data-type="REPLAY"]')
        await page.wait_for_timeout(2500)
        screen_after_replay = await page.evaluate("() => document.querySelector('.screen-home') ? 'HOME' : 'OTHER'")
        assert screen_after_replay == 'HOME', "REPLAY must return to HOME"
        replay_state = await page.evaluate("() => window.__xomNho.getState()")
        assert replay_state['customerIndex'] == 0 and replay_state['revenue'] == 0
        assert replay_state['activeCustomer'] is None
        print("  ✓ PASS: REPLAY cleanly resets state and cancels all pending callbacks!")

        print(f"\nTotal JS runtime errors: {len(errors)}")
        for err in errors:
            print(f"  ⚠ {err}")
        assert len(errors) == 0, "No JS runtime errors allowed!"
        
        await browser.close()
        print("\n" + "=" * 65)
        print("🎉 ALL GATE 1 LOGIC TESTS PASSED 100% WITH ZERO ERRORS!")
        print("=" * 65)

if __name__ == '__main__':
    asyncio.run(run_gate1_logic_tests())
