import sys, asyncio, os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\truonggiang.vo01\.gemini\antigravity\brain\47b8d4fc-0808-455a-ab31-40cf8e3ca68d"

async def js_click(page, selector, label=""):
    """Click a button by triggering a real click via JS evaluate — guaranteed bubbling."""
    result = await page.evaluate(f"""() => {{
        const el = document.querySelector('{selector}');
        if (!el) return 'NOT_FOUND';
        el.click();
        return 'OK';
    }}""")
    if result == 'NOT_FOUND':
        print(f"  WARNING: '{selector}' not found ({label})")
    return result == 'OK'

async def mobile_play_through():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
            headless=True
        )
        context = await browser.new_context(viewport={'width': 390, 'height': 844})
        page = await context.new_page()
        
        errors = []
        page.on('pageerror', lambda err: errors.append(str(err)))
        
        print("=== MOBILE PLAYTHROUGH (390×844) ===")
        await page.goto('http://localhost:8000/game/')
        await page.wait_for_timeout(300)
        await page.evaluate("() => localStorage.clear()")
        await page.reload()
        await page.wait_for_timeout(400)
        
        # 1. HOME
        print("\n1. HOME Screen")
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_home.png"))
        await js_click(page, 'button[data-type="NAVIGATE"]', "Start")
        await page.wait_for_timeout(300)
        
        # 2. XOM_OI → MARKET
        print("2. XOM_OI Screen")
        await js_click(page, 'button[data-type="NAVIGATE"]', "Go to Market")
        await page.wait_for_timeout(300)
        
        # 3. MARKET
        print("3. MARKET Screen")
        await js_click(page, 'button[data-type="BUNDLE_DAY1"]', "Quick Bundle")
        await page.wait_for_timeout(200)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_market.png"))
        await js_click(page, 'button[data-type="BUY"]', "Buy")
        await page.wait_for_timeout(600)
        
        # 4. SHOP — Bé Tí
        print("\n4. SHOP — Bé Tí")
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_shop_beti_empty.png"))
        
        # Answer EXTRA
        print("  Answering EXTRA request: +1 chả")
        await js_click(page, 'button[data-type="EXTRA"][data-payload="yes"]', "Extra cha")
        await page.wait_for_timeout(300)
        
        # Verify EXTRA took effect
        extra_status = await page.evaluate("() => document.querySelector('.special-confirmed-tag')?.textContent || 'NOT_FOUND'")
        print(f"  Extra status: {extra_status}")
        
        # P0: Wrong tap safety
        print("  P0 TEST: Wrong tap (kumquat for bánh mì) doesn't deduct stock")
        stock_before = await page.evaluate("() => document.querySelector('.tray-button[data-payload=\"kumquat\"] .tray-stock')?.textContent || 'N/A'")
        await js_click(page, '.tray-button[data-payload="kumquat"]', "Wrong tap")
        await page.wait_for_timeout(150)
        stock_after = await page.evaluate("() => document.querySelector('.tray-button[data-payload=\"kumquat\"] .tray-stock')?.textContent || 'N/A'")
        print(f"  Kumquat: {stock_before} → {stock_after}")
        assert stock_before == stock_after, f"FAIL: stock changed on TAP!"
        print("  ✓ PASS: Stock unchanged on TAP")
        
        # Clear if needed
        clear_disabled = await page.evaluate("() => document.querySelector('button[data-type=\"CLEAR\"]')?.disabled ?? true")
        if not clear_disabled:
            await js_click(page, 'button[data-type="CLEAR"]', "Clear draft")
            await page.wait_for_timeout(100)
            print("  Cleared draft")
        else:
            print("  CLEAR disabled — draft is empty")
        
        # Assemble Bánh Mì: bread(1) + chả(2) + vegetable(1)
        print("  Assembling Bánh Mì...")
        for ing in ['bread', 'cha', 'cha', 'vegetable']:
            await js_click(page, f'.tray-button[data-payload="{ing}"]', ing)
            await page.wait_for_timeout(100)
        await page.wait_for_timeout(200)
        
        # Screenshot assembly
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_shop_beti_assembled.png"))
        
        # Check COMMIT enabled
        commit_disabled = await page.evaluate("() => document.querySelector('button[data-type=\"COMMIT\"]')?.disabled ?? true")
        print(f"  COMMIT enabled: {not commit_disabled}")
        
        # Check draft state via checklist
        checklist = await page.evaluate("""() => {
            const chips = document.querySelectorAll('.checklist-chip');
            return Array.from(chips).map(c => c.textContent.trim());
        }""")
        print(f"  Checklist: {checklist}")
        
        # Commit
        print("  Serving Bánh Mì to Bé Tí...")
        await js_click(page, 'button[data-type="COMMIT"]', "Serve")
        await page.wait_for_timeout(400)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_shop_beti_reaction.png"))
        
        # Wait for transition
        print("\n  Waiting for Cô Chín transition...")
        await page.wait_for_timeout(2200)
        
        # 5. CÔ CHÍN — P0 IDLE TEST
        print("5. SHOP — Cô Chín")
        active = await page.evaluate("() => document.querySelector('.customer-order-bubble strong')?.textContent || 'unknown'")
        print(f"  Current customer: {active}")
        
        print("  P0 TEST: Idle 3 seconds — must NOT auto-complete")
        await page.wait_for_timeout(3000)
        active_after = await page.evaluate("() => document.querySelector('.customer-order-bubble strong')?.textContent || 'unknown'")
        print(f"  After 3s idle: {active_after}")
        if "Cô Chín" in active_after:
            print("  ✓ PASS: Cô Chín still waiting (no auto-complete)")
        else:
            print(f"  ⚠ NOTE: Expected Cô Chín, got {active_after}")
        
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_shop_co_chin_waiting.png"))
        
        # Assemble Trà Tắc
        print("  Assembling Trà Tắc...")
        for ing in ['ice', 'sugar_syrup', 'kumquat']:
            await js_click(page, f'.tray-button[data-payload="{ing}"]', ing)
            await page.wait_for_timeout(80)
        await page.wait_for_timeout(200)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_shop_co_chin_assembled.png"))
        
        await js_click(page, 'button[data-type="COMMIT"]', "Serve Cô Chín")
        await page.wait_for_timeout(400)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_shop_co_chin_reaction.png"))
        
        print("\n  Waiting for Anh Tùng transition...")
        await page.wait_for_timeout(2200)
        
        # 6. ANH TÙNG
        print("6. SHOP — Anh Tùng")
        dialogue = await page.evaluate("() => document.querySelector('.bubble-dialogue-line')?.textContent || 'no dialogue'")
        print(f"  Dialogue: {dialogue[:100]}")
        
        hold_count = await page.evaluate("() => document.querySelectorAll('#btn-hold-pour').length")
        assert hold_count == 0, "FAIL: Hold & release button exists!"
        print("  ✓ PASS: No hold & release or patience timer")
        
        print("  Assembling Sữa Đậu Đá...")
        for ing in ['ice', 'sugar_syrup', 'soy_milk']:
            await js_click(page, f'.tray-button[data-payload="{ing}"]', ing)
            await page.wait_for_timeout(80)
        await page.wait_for_timeout(200)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_shop_anh_tung_assembled.png"))
        
        await js_click(page, 'button[data-type="COMMIT"]', "Serve Anh Tùng")
        await page.wait_for_timeout(400)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_shop_anh_tung_reaction.png"))
        
        # Wait for DAY_RESULT
        print("\n  Waiting for day wrap-up...")
        await page.wait_for_timeout(2500)
        
        # Try clicking CLOSE if still on SHOP
        await js_click(page, 'button[data-type="CLOSE"]', "Close shop")
        await page.wait_for_timeout(500)
        
        # 7. DAY_RESULT
        print("7. DAY_RESULT Screen")
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "mobile_day_result.png"))
        
        ledger = await page.evaluate("() => document.querySelector('.notebook-card')?.innerText || 'NOT_FOUND'")
        if ledger != 'NOT_FOUND':
            print("\n" + "="*50)
            print("SỔ GHI TIỀN CUỐI NGÀY 1")
            print("="*50)
            print(ledger)
            print("="*50)
            
            for val, label in [("60.000đ","Start"), ("28.000đ","Stock"), ("57.000đ","Revenue"), ("89.000đ","Cash"), ("29.000đ","Profit")]:
                print(f"  {'✓' if val in ledger else '✗'} {label}: {val}")
        else:
            print("  WARNING: No ledger found. May still be on SHOP screen.")
            screen_text = await page.evaluate("() => document.querySelector('.brand-title small')?.textContent || ''")
            print(f"  Current screen indicator: {screen_text}")
        
        print(f"\nJS errors: {len(errors)}")
        for e in errors[:5]:
            print(f"  ⚠ {e[:100]}")
        
        await browser.close()
        print("\n✅ Mobile playtest finished!")

if __name__ == '__main__':
    asyncio.run(mobile_play_through())
