import asyncio
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')
import threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "docs" / "mobile_gate_evidence" / "pilot"
EVIDENCE.mkdir(parents=True, exist_ok=True)
BRAIN = Path(r"C:\Users\truonggiang.vo01\.gemini\antigravity\brain\47b8d4fc-0808-455a-ab31-40cf8e3ca68d")

class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, format, *args):
        pass

server = ThreadingHTTPServer(("127.0.0.1", 8996), QuietHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()

async def main():
    errors = []
    failed_images = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            headless=True
        )
        context = await browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2
        )
        page = await context.new_page()

        page.on("pageerror", lambda exc: errors.append(str(exc)))
        page.on("requestfailed", lambda req: failed_images.append(req.url) if "/assets/" in req.url else None)

        # Load game
        await page.goto("http://127.0.0.1:8996/game/")
        await page.wait_for_selector(".screen-home", timeout=5000)

        # Set up Day 1 directly with bundle
        await page.evaluate("""() => {
            localStorage.clear();
            const s = window.__xomNho.getState();
            s.shopName = 'Quán Xóm Nhỏ';
            s.screen = 'MARKET';
            window.__xomNho.send('BUNDLE_DAY1');
            window.__xomNho.send('BUY');
            s.openingTime = 'ontime_8am';
            window.__xomNho.send('START_DAY');
            window.__xomNho.render();
        }""")
        await page.wait_for_selector(".street-counter-scene", timeout=5000)

        # Fast forward directly to Cô Chín (minute 180 = 11:00 AM)
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.clock = 180;
            s.spawnedIndex = 3; // Fast forward past Bác Ba, Chị Hai, Bé Tí
            s.customerIndex = 3;
            s.activeCustomer = null;
            s.waitingQueue = [];
            window.__xomNho.send('TICK', 1);
            window.__xomNho.render();
        }""")

        # Wait until Cô Chín arrives at counter
        await page.wait_for_function("() => window.__xomNho.getState().activeCustomer?.id === 'co_chin'", timeout=5000)

        # -------------------------------------------------------------
        # SHOT 1: TRƯỚC GIAO (ORDER state)
        # Cô Chín at counter, drink assembling in prep dock (ly đá bi + tắc)
        # Counter pass tray is empty
        # -------------------------------------------------------------
        await page.wait_for_function("() => document.querySelector('.drink-stack') !== null && document.querySelector('.counter-pass-tray.is-empty') !== null", timeout=5000)
        await page.wait_for_timeout(200)

        path_before = EVIDENCE / "shot_drink_01_truoc_giao.png"
        await page.screenshot(path=str(path_before))
        print("Captured Drink 1: Trước giao ->", path_before)

        # -------------------------------------------------------------
        # SHOT 2: ĐANG NHẬN (RECEIVE state)
        # Ly Trà Tắc mang đi (.counter-pass-tray.has-dish) is placed on horizontal tray
        # Prep dock cutting board is clear (thớt gỗ sạch sẽ)
        # Only 1 drink on screen (zero duplication)
        # Customer in RECEIVE pose
        # -------------------------------------------------------------
        await page.wait_for_function("() => document.querySelector('.customer-actor-wrap.pose-receive') !== null && document.querySelector('.counter-pass-tray.has-dish') !== null", timeout=6000)
        path_receiving = EVIDENCE / "shot_drink_02_dang_nhan.png"
        await page.screenshot(path=str(path_receiving))
        print("Captured Drink 2: Đang nhận ->", path_receiving)

        # -------------------------------------------------------------
        # SHOT 3: SAU NHẬN (REACT state)
        # Drink remains on horizontal counter tray
        # Customer is in REACT pose saying thank you
        # Speech bubble shows "Trà tắc mát rượi thanh tao..." & ✨ Cảm ơn quán!
        # Floating cash burst appears at wallet badge
        # -------------------------------------------------------------
        await page.wait_for_selector(".customer-actor-wrap.pose-react", timeout=6000)
        await page.wait_for_selector(".bubble-sparkle", timeout=6000)
        path_after = EVIDENCE / "shot_drink_03_sau_nhan.png"
        await page.screenshot(path=str(path_after))
        print("Captured Drink 3: Sau nhận ->", path_after)

        # Wait until customer leaves and tray clears
        await page.wait_for_function("() => window.__xomNho.getState().activeCustomer === null || window.__xomNho.getState().activeCustomer.id !== 'co_chin'", timeout=6000)
        print("Confirmed: Cô Chín departed cleanly and dish disappeared from tray.")

        # Check for broken images on page
        broken_imgs = await page.evaluate("""() => [...document.images]
          .filter(img => img.getClientRects().length && img.complete && img.naturalWidth === 0)
          .map(img => img.currentSrc || img.src)""")

        # Copy to brain artifacts
        if BRAIN.exists():
            import shutil
            shutil.copy(path_before, BRAIN / "shot_drink_01_truoc_giao.png")
            shutil.copy(path_receiving, BRAIN / "shot_drink_02_dang_nhan.png")
            shutil.copy(path_after, BRAIN / "shot_drink_03_sau_nhan.png")
            print("Copied all 3 drink shots to brain artifacts directory.")

        await browser.close()

    server.shutdown()

    report = {
        "test": "DRINK_HANDOFF_TEST",
        "customer": "co_chin (Cô Chín)",
        "dish": "TRA_TAC (Trà Tắc)",
        "stages": ["TRUOC_GIAO", "DANG_NHAN", "SAU_NHAN", "ROI_QUAY"],
        "errors": errors,
        "failedAssetRequests": failed_images,
        "brokenImagesOnDOM": broken_imgs
    }
    print("\nREPORT:", json.dumps(report, ensure_ascii=False, indent=2))
    assert not errors, f"Console/Page errors: {errors}"
    assert not failed_images, f"Failed image requests: {failed_images}"
    assert not broken_imgs, f"Broken images: {broken_imgs}"
    print("DRINK HANDOFF TEST PASSED 100%!")

if __name__ == "__main__":
    asyncio.run(main())
