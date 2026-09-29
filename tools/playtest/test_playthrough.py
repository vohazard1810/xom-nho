import sys, asyncio
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

async def play_through():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe', headless=True)
        # Desktop widescreen viewport matching Cooking Fever / Good Pizza Great Pizza
        page = await browser.new_page(viewport={'width': 1050, 'height': 800})
        
        errors = []
        page.on('pageerror', lambda err: errors.append(str(err)))
        
        await page.goto('http://localhost:8000/game/')
        await page.wait_for_timeout(300)
        
        # Reset storage to start fresh
        await page.evaluate("() => localStorage.clear()")
        await page.reload()
        await page.wait_for_timeout(400)
        
        # 1. HOME SCREEN (Grand animated poster)
        print('1. On HOME screen')
        await page.screenshot(path='home_screen.png')
        await page.click('button[data-type="NAVIGATE"]')
        await page.wait_for_timeout(400)
        
        # 2. XOM_OI SCREEN
        print('2. On XOM_OI screen')
        await page.screenshot(path='xom_oi_screen.png')
        await page.click('button[data-type="NAVIGATE"]')
        await page.wait_for_timeout(400)
        
        # 3. MARKET SCREEN (Quick Bundle)
        print('3. On MARKET screen, clicking Quick Bundle button')
        await page.click('button[data-type="BUNDLE_DAY1"]')
        await page.wait_for_timeout(200)
        await page.screenshot(path='market_screen.png')
        
        # Buy & go to Shop
        print('Buying items and opening shop...')
        await page.click('button[data-type="BUY"]')
        await page.wait_for_timeout(800)
        
        # 4. FIRST-PERSON COOKING STAGE (SHOP)
        print('4. On SHOP screen - Bé Tí arrives at the counter window')
        await page.screenshot(path='shop_beti_arrived.png')
        
        # Grant extra chả to Bé Tí
        print('Granting extra chả to Bé Tí...')
        await page.click('button[data-type="EXTRA"][data-payload="yes"]')
        await page.wait_for_timeout(300)
        
        # Assemble Bánh Mì on the cutting board (1 bread, 2 chả, 1 rau)
        print('Assembling Bánh Mì on the prep workstation...')
        await page.click('button.tray-button[data-payload="bread"]')
        await page.click('button.tray-button[data-payload="cha"]')
        await page.click('button.tray-button[data-payload="cha"]')
        await page.click('button.tray-button[data-payload="vegetable"]')
        await page.wait_for_timeout(400)
        await page.screenshot(path='shop_beti_ready.png')
        
        # Commit Bé Tí order
        print('Serving completed Bánh Mì to Bé Tí...')
        await page.click('button[data-type="COMMIT"]', force=True)
        await page.wait_for_timeout(600)
        
        # Customer 2: Cô Chín (Auto-Service)
        print('Customer 2 (Cô Chín) is now at the counter! Verifying Auto-Service for Trà Tắc...')
        await page.screenshot(path='shop_co_chin.png')
        # Wait 1.8s for auto-preparation and auto-commit
        await page.wait_for_timeout(1800)
        
        # Customer 3: Anh Tùng (Auto-Service)
        print('Customer 3 (Anh Tùng) is now at the counter! Verifying Auto-Service for Sữa Đậu Đá...')
        await page.screenshot(path='shop_anh_tung.png')
        # Wait 1.8s for auto-preparation and auto-commit
        await page.wait_for_timeout(1800)
        
        # All served -> Closing shop or auto transition
        print('All customers served! Verifying transition to day result...')
        try:
            await page.click('button[data-type="CLOSE"]', timeout=800)
        except:
            pass
        await page.wait_for_timeout(800)
        
        await page.screenshot(path='day_result.png')
        print('5. On DAY_RESULT screen! Screenshot saved to day_result.png')
        
        ledger_text = await page.locator('.notebook-card').inner_text()
        print('--- SỔ GHI TIỀN CUỐI NGÀY ---')
        print(ledger_text)
        print('-----------------------------')
        
        print('Final JS errors:', errors)
        await browser.close()

asyncio.run(play_through())
