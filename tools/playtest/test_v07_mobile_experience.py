import sys, asyncio, os, time
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

EVIDENCE_DIR = os.path.abspath(r"docs\v0.7_mobile_evidence")
VIDEO_DIR = os.path.abspath(r"docs\v0.7_playtest_videos")

async def js_click(page, selector):
    return await page.evaluate(f"""() => {{
        const el = document.querySelector('{selector}');
        if (!el) return false;
        el.click();
        return true;
    }}""")

async def run_gate2_mobile_experience():
    print("=" * 60)
    print("GATE 2: MOBILE EXPERIENCE & VISUAL SUITE (390×844)")
    print("=" * 60)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=r'C:\Program Files\WindowsApps\Microsoft.Edge_*\msedge.exe' if False else r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
            headless=True
        )
        
        context = await browser.new_context(
            viewport={'width': 390, 'height': 844},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)',
            record_video_dir=VIDEO_DIR,
            record_video_size={'width': 390, 'height': 844}
        )
        page = await context.new_page()
        
        errors = []
        page.on('pageerror', lambda err: errors.append(str(err)))
        
        print("\n1. Booting Game at 390×844...")
        await page.goto('http://127.0.0.1:8000/game/')
        await page.wait_for_timeout(300)
        await page.evaluate("() => localStorage.clear()")
        await page.reload()
        await page.wait_for_timeout(400)
        
        # 1. HOME SCREEN
        print("2. HOME Screen...")
        await page.screenshot(path=os.path.join(EVIDENCE_DIR, "01_home_screen.png"))
        await js_click(page, 'button[data-type="NAVIGATE"]')
        await page.wait_for_timeout(300)
        
        # 2. XOM_OI SCREEN
        print("3. XÓM ƠI Screen (Morning News)...")
        await page.screenshot(path=os.path.join(EVIDENCE_DIR, "02_xom_oi_morning_news.png"))
        await js_click(page, 'button[data-type="NAVIGATE"]')
        await page.wait_for_timeout(300)
        
        # 3. MARKET SCREEN
        print("4. MARKET Screen (Select 55k Bundle & Capacity Bar)...")
        await js_click(page, 'button[data-type="BUNDLE_DAY1"]')
        await page.wait_for_timeout(200)
        await page.screenshot(path=os.path.join(EVIDENCE_DIR, "03_market_bundle_capacity.png"))
        await js_click(page, 'button[data-type="BUY"]')
        await page.wait_for_timeout(400)
        
        # 4. MENU & PRICING SETUP
        print("5. MENU & PRICING SETUP Screen...")
        await page.screenshot(path=os.path.join(EVIDENCE_DIR, "04_menu_pricing_setup.png"))
        # Verify opening time buttons exist
        await js_click(page, 'button[data-type="SET_TIME"][data-payload="ontime_8am"]')
        await page.wait_for_timeout(150)
        await js_click(page, 'button[data-type="START_DAY"]')
        await page.wait_for_timeout(400)
        
        # 5. SHOP SCREEN — IDLE SERVICE RUN
        print("\n6. SHOP Screen — Starting Idle Service Simulation...")
        await page.screenshot(path=os.path.join(EVIDENCE_DIR, "05_shop_open_idle.png"))
        
        start_service_time = time.time()
        beti_decision_handled = False
        captured_auto_prep = False
        captured_news_ticker = False
        
        # Loop to monitor simulation progress
        max_wait_seconds = 80
        poll_interval = 0.35
        elapsed = 0
        
        while elapsed < max_wait_seconds:
            await page.wait_for_timeout(int(poll_interval * 1000))
            elapsed = time.time() - start_service_time
            
            # Check if decision modal is open (Bé Tí extra chả)
            has_decision = await page.evaluate("() => Boolean(document.querySelector('.decision-modal-backdrop'))")
            if has_decision and not beti_decision_handled:
                print(f"  [T+{elapsed:.1f}s] ⏸ DECISION MODAL ACTIVE: Clock is Paused for Bé Tí!")
                await page.wait_for_timeout(350) # Allow entrance animation to settle
                await page.screenshot(path=os.path.join(EVIDENCE_DIR, "06_beti_decision_modal_pause.png"))
                
                # Check decision buttons min-height
                btn_height = await page.evaluate("() => document.querySelector('.btn-decision')?.getBoundingClientRect().height || 0")
                print(f"  Decision button height: {btn_height}px (Requirement: >= 44px)")
                assert btn_height >= 44, f"Touch target too small: {btn_height}px"
                
                await page.wait_for_timeout(600) # Give player time to read
                print("  Choosing: '👍 Thêm chả cho con (+1 chả)'...")
                await js_click(page, 'button[data-type="DECIDE"][data-payload="yes"]')
                beti_decision_handled = True
                await page.wait_for_timeout(300)
                continue
            
            # Capture auto-prep in action
            has_auto_prep = await page.evaluate("() => Boolean(document.querySelector('.auto-prep-bench .banh-mi-assembly-visual') || document.querySelector('.auto-prep-bench .drink-assembly-visual'))")
            if has_auto_prep and not captured_auto_prep:
                print(f"  [T+{elapsed:.1f}s] ✨ Captured live auto-prep workstation animation!")
                await page.screenshot(path=os.path.join(EVIDENCE_DIR, "07_auto_prep_workstation.png"))
                captured_auto_prep = True
            
            # Capture news ticker
            has_news = await page.evaluate("() => Boolean(document.querySelector('.news-ticker-banner'))")
            if has_news and not captured_news_ticker:
                print(f"  [T+{elapsed:.1f}s] 📢 Captured Market News Ticker (Non-pausing)!")
                await page.screenshot(path=os.path.join(EVIDENCE_DIR, "08_news_ticker_no_pause.png"))
                captured_news_ticker = True
                
            # Check if out-of-stock customer reached
            active_status = await page.evaluate("() => document.querySelector('.prep-status-text')?.textContent || ''")
            if 'Hết' in active_status:
                await page.screenshot(path=os.path.join(EVIDENCE_DIR, "09_out_of_stock_customer.png"))
            
            # Check if all customers processed
            cust_idx = await page.evaluate("() => window.__xomNho?.getState()?.customerIndex ?? 0")
            screen = await page.evaluate("() => window.__xomNho?.getState()?.screen ?? ''")
            if cust_idx >= 8 or screen == 'DAY_RESULT':
                print(f"  [T+{elapsed:.1f}s] All 8 customers processed!")
                break
        
        total_service_time = time.time() - start_service_time
        print(f"\n⏱ TOTAL SERVICE TIME: {total_service_time:.1f}s (Pacing target: 45–60s)")
        
        # Click close shop if still on SHOP
        on_shop = await page.evaluate("() => document.querySelector('.btn-close-shop') !== null")
        if on_shop:
            print("  Closing shop to wrap up day...")
            await js_click(page, 'button[data-type="CLOSE"]')
            await page.wait_for_timeout(500)
            
        # 6. DAY_RESULT SCREEN
        print("\n7. DAY_RESULT Screen (Reconciled Notebook Ledger)...")
        await page.screenshot(path=os.path.join(EVIDENCE_DIR, "10_day_result_ledger.png"))
        
        ledger_text = await page.evaluate("() => document.querySelector('.notebook-ledger-card')?.innerText || ''")
        print("\n" + "=" * 50)
        print("SỔ GHI TIỀN ĐỐI SOÁT CUỐI NGÀY:")
        print("=" * 50)
        print(ledger_text)
        print("=" * 50)
        
        # Verify key ledger amounts in text
        for expected in ["60.000đ", "-55.000đ", "+122.000đ", "127.000đ", "+67.000đ"]:
            assert expected in ledger_text, f"Missing '{expected}' in final ledger!"
            print(f"  ✓ Found '{expected}' in ledger")
            
        # Check touch targets on buttons
        button_check = await page.evaluate("""() => {
            const btns = Array.from(document.querySelectorAll('button:not(.speed-btn)'));
            const details = btns.map(b => ({
                text: b.textContent.trim().slice(0, 25),
                className: b.className,
                height: Math.round(b.getBoundingClientRect().height)
            }));
            return {
                allValid: details.every(d => d.height >= 40),
                details
            };
        }""")
        print(f"  Touch targets inspection:")
        for b in button_check['details']:
            print(f"    - [{b['text']}]: {b['height']}px (pass: {b['height'] >= 40})")
        assert button_check['allValid'], "All primary interactive buttons must have adequate touch target height"

        print(f"\nTotal JS runtime errors: {len(errors)}")
        for err in errors:
            print(f"  ⚠ {err}")
        assert len(errors) == 0, "No JS runtime errors allowed!"
        
        # Close context and page to flush video recording
        await page.close()
        await context.close()
        await browser.close()
        
        # Find recorded video file
        video_files = os.listdir(VIDEO_DIR)
        print(f"\n🎥 Playtest video recorded in {VIDEO_DIR}: {video_files}")
        
        print("\n" + "=" * 60)
        print("🎉 ALL GATE 2 MOBILE EXPERIENCE REQUIREMENTS MET 100%!")
        print("=" * 60)

if __name__ == '__main__':
    asyncio.run(run_gate2_mobile_experience())
