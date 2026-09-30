import sys, asyncio, os, time
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

VIDEO_DIR = os.path.abspath(r"docs\v0.7_playtest_videos")
EVIDENCE_DIR = os.path.abspath(r"docs\v0.7_mobile_evidence")
os.makedirs(VIDEO_DIR, exist_ok=True)
os.makedirs(EVIDENCE_DIR, exist_ok=True)

async def js_click(page, selector):
    return await page.evaluate(f"""() => {{
        const el = document.querySelector('{selector}');
        if (!el) return false;
        el.click();
        return true;
    }}""")

async def record_closeup():
    print("=" * 60)
    print("RECORDING 1.5s WATERCOLOR AUTO-PREP WORKSTATION CLOSE-UP")
    print("=" * 60)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
            headless=True
        )
        
        # We record the viewport at 390x844
        context = await browser.new_context(
            viewport={'width': 390, 'height': 844},
            record_video_dir=VIDEO_DIR,
            record_video_size={'width': 390, 'height': 844}
        )
        page = await context.new_page()
        
        await page.goto('http://127.0.0.1:8000/game/')
        await page.evaluate("() => localStorage.clear()")
        await page.reload()
        await page.wait_for_timeout(300)
        
        # Fast setup to shop
        await js_click(page, 'button[data-type="NAVIGATE"]')
        await page.wait_for_timeout(150)
        await js_click(page, 'button[data-type="NAVIGATE"]')
        await page.wait_for_timeout(150)
        await js_click(page, 'button[data-type="BUNDLE_DAY1"]')
        await page.wait_for_timeout(100)
        await js_click(page, 'button[data-type="BUY"]')
        await page.wait_for_timeout(150)
        await js_click(page, 'button[data-type="START_DAY"]')
        await page.wait_for_timeout(200)
        
        print("  Waiting for Bác Ba to arrive...")
        # Wait for customer arrival
        for _ in range(30):
            await page.wait_for_timeout(100)
            has_cust = await page.evaluate("() => window.__xomNho?.getState()?.activeCustomer?.status === 'ARRIVED'")
            if has_cust:
                break
                
        print("  Customer arrived! Observing the 1.5s Watercolor Assembly Animation...")
        
        # Capture close-ups during the 1.5s sequence
        await page.wait_for_timeout(150)
        bench_el = await page.query_selector('.auto-prep-bench')
        if bench_el:
            await bench_el.screenshot(path=os.path.join(EVIDENCE_DIR, "closeup_workbench_stage1.png"))
            print("  ✓ Captured Workbench Stage 1 (Bread base)")
            
        await page.wait_for_timeout(450)
        bench_el = await page.query_selector('.auto-prep-bench')
        if bench_el:
            await bench_el.screenshot(path=os.path.join(EVIDENCE_DIR, "closeup_workbench_stage2.png"))
            print("  ✓ Captured Workbench Stage 2 (Chả slices & vegetables)")
            
        await page.wait_for_timeout(450)
        bench_el = await page.query_selector('.auto-prep-bench')
        if bench_el:
            await bench_el.screenshot(path=os.path.join(EVIDENCE_DIR, "closeup_workbench_stage3.png"))
            print("  ✓ Captured Workbench Stage 3 (Complete dish art)")
            
        await page.wait_for_timeout(1000)
        await browser.close()
        
        # Rename video to auto_prep_closeup_1.5s.webm
        video_files = [f for f in os.listdir(VIDEO_DIR) if f.startswith('page@') and f.endswith('.webm')]
        if video_files:
            latest_vid = max(video_files, key=lambda f: os.path.getmtime(os.path.join(VIDEO_DIR, f)))
            dest_vid = os.path.join(VIDEO_DIR, "auto_prep_closeup_1.5s.webm")
            if os.path.exists(dest_vid):
                os.remove(dest_vid)
            os.rename(os.path.join(VIDEO_DIR, latest_vid), dest_vid)
            print(f"  🎥 Close-up video saved to: {dest_vid}")
            
    print("=" * 60)
    print("DONE RECORDING CLOSE-UP!")
    print("=" * 60)

if __name__ == '__main__':
    asyncio.run(record_closeup())
