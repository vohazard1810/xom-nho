import sys, asyncio, os, time
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

EVIDENCE_DIR = os.path.abspath(r"docs\v0.7_mobile_evidence")
VIDEO_DIR = os.path.abspath(r"docs\v0.7_playtest_videos")
os.makedirs(EVIDENCE_DIR, exist_ok=True)
os.makedirs(VIDEO_DIR, exist_ok=True)

async def js_click(page, selector):
    return await page.evaluate(f"""() => {{
        const el = document.querySelector('{selector}');
        if (!el) return false;
        el.click();
        return true;
    }}""")

async def assert_all_buttons_touch_target(page, screen_name):
    details = await page.evaluate("""() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.map(b => ({
            text: b.textContent.trim().replace(/\\s+/g, ' ').slice(0, 30),
            className: b.className,
            height: Math.round(b.getBoundingClientRect().height),
            width: Math.round(b.getBoundingClientRect().width),
            visible: b.getBoundingClientRect().bottom > 0 && b.getBoundingClientRect().top < innerHeight && b.getBoundingClientRect().right > 0 && b.getBoundingClientRect().left < innerWidth,
            centerClickable: (() => { const r = b.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) return null; const x = r.left + r.width / 2, y = r.top + r.height / 2; return b === document.elementFromPoint(x, y) || b.contains(document.elementFromPoint(x, y)); })()
        }));
    }""")
    print(f"  Touch targets inspection on {screen_name} ({len(details)} buttons):")
    all_valid = True
    for b in details:
        valid = b['height'] >= 44 and b['width'] >= 44 and b['visible'] and b['centerClickable'] is not False
        if not valid:
            all_valid = False
        print(f"    - [{b['text']}]: {b['height']}×{b['width']}px (pass: {valid})")
    assert all_valid, f"Every visible button on {screen_name} must be at least 44×44px and reachable"

async def run_gate2_mobile_experience():
    print("=" * 65)
    print("GATE 2: COMPREHENSIVE MOBILE EXPERIENCE & WATERCOLOR ART SUITE (390×844)")
    print("=" * 65)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
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
        print("\n2. HOME Screen...")
        await page.screenshot(path=os.path.join(EVIDENCE_DIR, "01_home_screen.png"))
        await assert_all_buttons_touch_target(page, "HOME")
        await js_click(page, 'button[data-type="NAVIGATE"]')
        await page.wait_for_timeout(300)
        
        # 2. XOM_OI SCREEN
        print("\n3. XÓM ƠI Screen (Morning News)...")
        await page.screenshot(path=os.path.join(EVIDENCE_DIR, "02_xom_oi_morning_news.png"))
        await assert_all_buttons_touch_target(page, "XOM_OI")
        await js_click(page, 'button[data-type="NAVIGATE"]')
        await page.wait_for_timeout(300)
        
        # 3. MARKET SCREEN
        print("\n4. MARKET Screen (Select 55k Bundle & Capacity Bar)...")
        await js_click(page, 'button[data-type="BUNDLE_DAY1"]')
        await page.wait_for_timeout(200)
        await page.screenshot(path=os.path.join(EVIDENCE_DIR, "03_market_bundle_capacity.png"))
        await assert_all_buttons_touch_target(page, "MARKET")
        await js_click(page, 'button[data-type="BUY"]')
        await page.wait_for_timeout(400)
        
        # 4. MENU & PRICING SETUP
        print("\n5. MENU & PRICING SETUP Screen...")
        await page.screenshot(path=os.path.join(EVIDENCE_DIR, "04_menu_pricing_setup.png"))
        await assert_all_buttons_touch_target(page, "MENU_SETUP")
        await js_click(page, 'button[data-type="SET_TIME"][data-payload="ontime_8am"]')
        await page.wait_for_timeout(150)
        await js_click(page, 'button[data-type="START_DAY"]')
        await page.wait_for_timeout(400)
        
        # 5. SHOP SCREEN — IDLE SERVICE RUN
        print("\n6. SHOP Screen — Starting Idle Service Simulation...")
        await page.screenshot(path=os.path.join(EVIDENCE_DIR, "05_shop_open_idle.png"))
        await assert_all_buttons_touch_target(page, "SHOP (Open Idle)")
        
        start_service_time = time.time()
        beti_decision_handled = False
        captured_auto_prep = False
        captured_stage1 = False
        captured_stage2 = False
        captured_stage3 = False
        captured_news_ticker = False
        
        max_wait_seconds = 80
        poll_interval = 0.25
        elapsed = 0
        
        while elapsed < max_wait_seconds:
            await page.wait_for_timeout(int(poll_interval * 1000))
            elapsed = time.time() - start_service_time
            
            # Check auto prep stages for real watercolor art evidence
            prep_info = await page.evaluate("""() => {
                const bench = document.querySelector('.auto-prep-bench');
                if (!bench) return null;
                const stage = document.querySelector('.watercolor-prep-stage');
                const hasBread = Boolean(document.querySelector('.art-bread'));
                const hasCha = Boolean(document.querySelector('.art-cha-slice'));
                const hasFinish = Boolean(document.querySelector('.dish-finish-img'));
                return {
                    hasBench: true,
                    hasBread,
                    hasCha,
                    hasFinish
                };
            }""")
            
            if prep_info:
                if prep_info['hasBread'] and not prep_info['hasCha'] and not captured_stage1:
                    print(f"  [T+{elapsed:.1f}s] 🎨 Stage 1 Art Captured: Base bread layer!")
                    await page.screenshot(path=os.path.join(EVIDENCE_DIR, "07a_prep_stage1_bread.png"))
                    captured_stage1 = True
                elif prep_info['hasCha'] and not prep_info['hasFinish'] and not captured_stage2:
                    print(f"  [T+{elapsed:.1f}s] 🎨 Stage 2 Art Captured: Chả slice + vegetable layers!")
                    await page.screenshot(path=os.path.join(EVIDENCE_DIR, "07b_prep_stage2_cha.png"))
                    captured_stage2 = True
                elif prep_info['hasFinish'] and not captured_stage3:
                    print(f"  [T+{elapsed:.1f}s] 🎨 Stage 3 Art Captured: Complete watercolor dish art!")
                    await page.screenshot(path=os.path.join(EVIDENCE_DIR, "07c_prep_stage3_complete.png"))
                    bench_el = await page.query_selector('.auto-prep-bench')
                    if bench_el:
                        await bench_el.screenshot(path=os.path.join(EVIDENCE_DIR, "auto_prep_workbench_closeup.png"))
                    captured_stage3 = True
            
            # Check if decision modal is open (Bé Tí extra chả)
            has_decision = await page.evaluate("() => Boolean(document.querySelector('.decision-modal-backdrop'))")
            if has_decision and not beti_decision_handled:
                print(f"  [T+{elapsed:.1f}s] ⏸ DECISION MODAL ACTIVE: Clock is Paused for Bé Tí!")
                await page.wait_for_timeout(350)
                await page.screenshot(path=os.path.join(EVIDENCE_DIR, "06_beti_decision_modal_pause.png"))
                
                # Check touch target of decision buttons
                await assert_all_buttons_touch_target(page, "BÉ TÍ DECISION MODAL")
                
                await page.wait_for_timeout(500)
                print("  Choosing: '👍 Thêm chả cho con (+1 chả)'...")
                await js_click(page, 'button[data-type="DECIDE"][data-payload="yes"]')
                beti_decision_handled = True
                await page.wait_for_timeout(300)
                continue
            
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
        assert 45 <= total_service_time <= 60, f"Service time {total_service_time:.1f}s outside 45–60s target"
        assert captured_stage1 and captured_stage2 and captured_stage3, "All three prep stages must be observed"
        assert beti_decision_handled and captured_news_ticker, "Decision and market news must be observed"
        
        # Click close shop if still on SHOP
        on_shop = await page.evaluate("() => document.querySelector('.btn-close-shop') !== null")
        if on_shop:
            print("  Closing shop to wrap up day...")
            await js_click(page, 'button[data-type="CLOSE"]')
            await page.wait_for_timeout(500)
            
        # 6. DAY_RESULT SCREEN
        print("\n7. DAY_RESULT Screen (Reconciled Notebook Ledger)...")
        await page.screenshot(path=os.path.join(EVIDENCE_DIR, "10_day_result_ledger.png"))
        await assert_all_buttons_touch_target(page, "DAY_RESULT")
        
        ledger_text = await page.evaluate("() => document.querySelector('.notebook-ledger-card')?.innerText || ''")
        print("\n" + "=" * 55)
        print("SỔ GHI TIỀN ĐỐI SOÁT CUỐI NGÀY:")
        print("=" * 55)
        print(ledger_text)
        print("=" * 55)
        
        # Verify key ledger amounts in text
        for expected in ["60.000đ", "-55.000đ", "+122.000đ", "127.000đ", "+67.000đ"]:
            assert expected in ledger_text, f"Missing '{expected}' in final ledger!"
            print(f"  ✓ Found '{expected}' in ledger")
            
        print(f"\nTotal JS runtime errors: {len(errors)}")
        for err in errors:
            print(f"  ⚠ {err}")
        assert len(errors) == 0, "No JS runtime errors allowed!"

        await browser.close()
        
        # Rename newest video
        video_files = [f for f in os.listdir(VIDEO_DIR) if f.startswith('page@') and f.endswith('.webm')]
        if video_files:
            latest_vid = max(video_files, key=lambda f: os.path.getmtime(os.path.join(VIDEO_DIR, f)))
            dest_vid = os.path.join(VIDEO_DIR, "v0.7_day1_mobile_playtest.webm")
            if os.path.exists(dest_vid):
                os.remove(dest_vid)
            os.rename(os.path.join(VIDEO_DIR, latest_vid), dest_vid)
            print(f"\n🎥 Playtest video successfully saved to: {dest_vid}")

        print("\n" + "=" * 65)
        print("🎉 ALL GATE 2 MOBILE EXPERIENCE & TOUCH TARGET TESTS PASSED 100%!")
        print("=" * 65)

if __name__ == '__main__':
    asyncio.run(run_gate2_mobile_experience())
