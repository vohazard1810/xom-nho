import asyncio
import sys
sys.stdout.reconfigure(encoding='utf-8')
import threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]

class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, format, *args):
        pass

PORT = 8997
server = ThreadingHTTPServer(("127.0.0.1", PORT), QuietHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            headless=True
        )
        context = await browser.new_context(viewport={"width": 390, "height": 844})
        page = await context.new_page()

        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))

        await page.goto(f"http://127.0.0.1:{PORT}/game/")
        await page.locator('#shop-name-input').fill('Quán Bé Mây')
        await page.locator('[data-type=SET_SHOP_NAME]').click()
        await page.locator('[data-type=NAVIGATE]').click()
        await page.locator('[data-type=BUNDLE_DAY1]').click()
        await page.locator('[data-type=BUY]').click()
        await page.locator('[data-type=START_DAY]').click()

        await page.wait_for_timeout(500)
        s = await page.evaluate("() => window.__xomNho.getState()")
        assert s["screen"] == "SHOP", f"Screen was {s['screen']}"

        # Check viewports
        for width, height in [(360, 640), (390, 700), (430, 932)]:
            await page.set_viewport_size({"width": width, "height": height})
            await page.wait_for_timeout(100)
            metrics = await page.evaluate("""() => {
                const buttons = [...document.querySelectorAll('.ingredient-button, .cook-actions button, .play-pause')];
                const buttonMetrics = buttons.map(e => {
                    const r = e.getBoundingClientRect();
                    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
                    return {
                        label: e.textContent.trim(),
                        width: r.width,
                        height: r.height,
                        bottom: r.bottom,
                        reachable: hit === e || e.contains(hit)
                    };
                });
                return {
                    scrollWidth: document.documentElement.scrollWidth,
                    scrollHeight: document.documentElement.scrollHeight,
                    buttons: buttonMetrics
                };
            }""")
            assert metrics["scrollWidth"] <= width, f"ScrollWidth {metrics['scrollWidth']} > {width}"
            assert metrics["scrollHeight"] <= height + 1, f"ScrollHeight {metrics['scrollHeight']} > {height}"
            for b in metrics["buttons"]:
                assert b["width"] >= 44 and b["height"] >= 44, f"Button {b['label']} too small: {b['width']}x{b['height']}"
                assert b["reachable"], f"Button {b['label']} not reachable"

        assert len(errors) == 0, f"Errors: {errors}"
        print("ALL VIEWPORTS AND BUTTON REACHABILITY VERIFIED PASS!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
