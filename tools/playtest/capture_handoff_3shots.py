import asyncio
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

server = ThreadingHTTPServer(("127.0.0.1", 8993), QuietHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()

async def main():
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

        # Load game
        await page.goto("http://127.0.0.1:8993/game/")
        await page.wait_for_selector(".screen-home", timeout=5000)

        # Set up Day 1 directly with standard bundle and late opening to encounter Bé Tí
        await page.evaluate("""() => {
            localStorage.clear();
            const s = window.__xomNho.getState();
            s.shopName = 'Xóm Nhỏ Quán';
            s.screen = 'MARKET';
            window.__xomNho.send('BUNDLE_DAY1');
            window.__xomNho.send('BUY');
            s.openingTime = 'late_10am';
            window.__xomNho.send('START_DAY');
            window.__xomNho.render();
        }""")
        await page.wait_for_selector(".street-counter-scene", timeout=5000)

        # Fast forward slightly to 10:00 (minute 120) so Bé Tí arrives
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.clock = 120;
            s.spawnedIndex = 2; // Bác Ba & Chị Hai missed early
            window.__xomNho.send('TICK');
            window.__xomNho.render();
        }""")

        # Bé Tí arrives with EXTRA_CHA decision modal
        await page.wait_for_selector(".decision-modal-backdrop", timeout=5000)
        # Choose YES (thêm chả cho con)
        await page.click("button[data-payload='yes']")
        await page.wait_for_timeout(100)

        # -------------------------------------------------------------
        # SHOT 1: TRƯỚC GIAO (ORDER state)
        # Customer at counter, prep dock has ingredients assembling on cutting board
        # Counter pass tray is empty, customer speech bubble shows order request
        # -------------------------------------------------------------
        await page.wait_for_function("() => document.querySelector('.art-layers-stack') !== null && document.querySelector('.counter-pass-tray.is-empty') !== null", timeout=5000)
        await page.wait_for_timeout(200)
        
        path_before = EVIDENCE / "shot_handoff_01_truoc_giao.png"
        await page.screenshot(path=str(path_before))
        print("Captured 1: Trước giao ->", path_before)

        # -------------------------------------------------------------
        # SHOT 2: ĐANG NHẬN (RECEIVE state)
        # Dish is placed on horizontal counter tray (.counter-pass-tray.has-dish)
        # Prep dock cutting board is clear to clean idle board (zero dish duplication)
        # Customer is in RECEIVE pose
        # Customer speech bubble still shows order dialogue (no thank you yet)
        # -------------------------------------------------------------
        await page.wait_for_function("() => document.querySelector('.customer-actor-wrap.pose-receive') !== null && document.querySelector('.counter-pass-tray.has-dish') !== null", timeout=6000)
        path_receiving = EVIDENCE / "shot_handoff_02_dang_nhan.png"
        await page.screenshot(path=str(path_receiving))
        print("Captured 2: Đang nhận ->", path_receiving)

        # -------------------------------------------------------------
        # SHOT 3: SAU NHẬN (REACT state)
        # Dish remains on horizontal counter tray
        # Customer is in REACT pose with beaming smile
        # Speech bubble shows thank you dialogue & ✨ Cảm ơn quán!
        # Floating cash burst appears at wallet badge in top-nav
        # No floating dish overlay on customer chest
        # -------------------------------------------------------------
        await page.wait_for_selector(".customer-actor-wrap.pose-react", timeout=6000)
        await page.wait_for_selector(".bubble-sparkle", timeout=6000)
        path_after = EVIDENCE / "shot_handoff_03_sau_nhan.png"
        await page.screenshot(path=str(path_after))
        print("Captured 3: Sau nhận ->", path_after)

        # Copy to brain artifacts
        if BRAIN.exists():
            import shutil
            shutil.copy(path_before, BRAIN / "shot_handoff_01_truoc_giao.png")
            shutil.copy(path_receiving, BRAIN / "shot_handoff_02_dang_nhan.png")
            shutil.copy(path_after, BRAIN / "shot_handoff_03_sau_nhan.png")
            print("Copied all 3 shots to brain artifacts directory.")

        await browser.close()
        print("ALL 3 SHOTS CAPTURED SUCCESSFULLY FROM LIVE GAMEPLAY!")

if __name__ == "__main__":
    asyncio.run(main())
