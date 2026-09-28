import sys, asyncio
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

async def play_through():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe', headless=True)
        # Test in a desktop viewport (1000 x 850) to see both ambient coffee shop border and game stage
        page = await browser.new_page(viewport={'width': 1000, 'height': 850})
        
        errors = []
        page.on('pageerror', lambda err: errors.append(str(err)))
        
        await page.goto('http://localhost:8000/game/')
        await page.wait_for_timeout(300)
        
        # Reset storage to start fresh
        await page.evaluate("() => localStorage.clear()")
        await page.reload()
        await page.wait_for_timeout(300)
        
        # 1. HOME -> Click start
        print('1. On HOME screen')
        await page.screenshot(path='home_screen.png')
        await page.click('button[data-type="NAVIGATE"]')
        await page.wait_for_timeout(400)
        
        # 2. XOM_OI -> Click to market
        print('2. On XOM_OI screen')
        await page.screenshot(path='xom_oi_screen.png')
        await page.click('button[data-type="NAVIGATE"]')
        await page.wait_for_timeout(400)
        
        # 3. MARKET -> Click BUNDLE_DAY1
        print('3. On MARKET screen, clicking Quick Bundle button')
        await page.click('button[data-type="BUNDLE_DAY1"]')
        await page.wait_for_timeout(200)
        await page.screenshot(path='market_screen.png')
        
        # Buy & go to Shop
        print('Buying items and opening shop...')
        await page.click('button[data-type="BUY"]')
        await page.wait_for_timeout(800)
        
        # 4. SHOP SCREEN
        print('4. On SHOP screen')
        await page.screenshot(path='shop_initial.png')
        
        # Check Bé Tí sprite
        beti_img = await page.locator('#beti-sprite-img').get_attribute('src')
        print('Bé Tí initial sprite src:', beti_img)
        
        # Test selecting Bé Tí
        print('Selecting Bé Tí...')
        await page.click('.actor-beti')
        await page.wait_for_timeout(500)
        
        beti_ordering_img = await page.locator('#beti-sprite-img').get_attribute('src')
        print('Bé Tí ordering sprite src:', beti_ordering_img)
        await page.screenshot(path='shop_beti_selected.png')
        
        # Accept extra chả
        print('Granting extra chả to Bé Tí...')
        await page.click('button[data-type="EXTRA"][data-payload="yes"]')
        await page.wait_for_timeout(300)
        
        # Tap bread, cha, cha, vegetable
        print('Assembling Bánh Mì (1 bread, 2 chả, 1 rau)...')
        await page.click('button[data-type="TAP"][data-payload="bread"]')
        await page.click('button[data-type="TAP"][data-payload="cha"]')
        await page.click('button[data-type="TAP"][data-payload="cha"]')
        await page.click('button[data-type="TAP"][data-payload="vegetable"]')
        await page.wait_for_timeout(300)
        await page.screenshot(path='shop_beti_assembled.png')
        
        # Commit order
        print('Committing Bé Tí order...')
        await page.click('button[data-type="COMMIT"]', force=True)
        await page.wait_for_timeout(600)
        
        # Serve Cô Chín
        print('Selecting and serving Cô Chín (Trà tắc: đá, đường, tắc)...')
        await page.click('.actor-queue-character.co-chin')
        await page.wait_for_timeout(300)
        await page.click('button[data-type="TAP"][data-payload="ice"]')
        await page.click('button[data-type="TAP"][data-payload="sugar_syrup"]')
        await page.click('button[data-type="TAP"][data-payload="kumquat"]')
        await page.wait_for_timeout(300)
        await page.click('button[data-type="COMMIT"]', force=True)
        await page.wait_for_timeout(600)
        
        # Serve Anh Tùng
        print('Selecting and serving Anh Tùng (Sữa đậu đá: đá, đường, sữa đậu)...')
        await page.click('.actor-queue-character.anh-tung')
        await page.wait_for_timeout(300)
        await page.click('button[data-type="TAP"][data-payload="ice"]')
        await page.click('button[data-type="TAP"][data-payload="sugar_syrup"]')
        await page.click('button[data-type="TAP"][data-payload="soy_milk"]')
        await page.wait_for_timeout(300)
        await page.click('button[data-type="COMMIT"]', force=True)
        await page.wait_for_timeout(600)
        
        await page.screenshot(path='shop_all_served.png')
        
        # Close shop
        print('Closing shop for day result...')
        await page.click('button[data-type="CLOSE"]')
        await page.wait_for_timeout(600)
        
        await page.screenshot(path='day_result.png')
        print('5. On DAY_RESULT screen! Screenshot saved to day_result.png')
        
        ledger_text = await page.locator('.notebook-card').inner_text()
        print('--- SỔ GHI TIỀN CUỐI NGÀY ---')
        print(ledger_text)
        print('-----------------------------')
        
        print('Final JS errors:', errors)
        await browser.close()

asyncio.run(play_through())
