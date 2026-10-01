import asyncio
import os
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import threading
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent.parent
PORT = 8769
EVIDENCE_DIR = ROOT / "docs" / "mobile_gate_evidence" / "pilot"
BRAIN_DIR = Path(r"C:\Users\truonggiang.vo01\.gemini\antigravity\brain\47b8d4fc-0808-455a-ab31-40cf8e3ca68d")
EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

def start_server():
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("127.0.0.1", PORT), SimpleHTTPRequestHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server

async def capture_pilot():
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    server = start_server()
    print("HTTP Server started on port", PORT)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=EDGE_PATH,
            headless=True
        )
        context = await browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2
        )
        page = await context.new_page()

        # Load game
        await page.goto(f"http://127.0.0.1:{PORT}/game/index.html")
        await page.wait_for_selector("#app")

        # Set shop name and proceed to XOM_OI
        await page.locator("#shop-name-input").fill("Quán Hẻm Nhỏ")
        await page.locator('[data-type="SET_SHOP_NAME"]').click()
        await page.wait_for_timeout(300)

        # Go to MARKET
        await page.locator('[data-type="NAVIGATE"]').click()
        await page.wait_for_timeout(300)

        # Buy Day 1 bundle and go to MENU
        await page.locator('[data-type="BUNDLE_DAY1"]').click()
        await page.locator('[data-type="BUY"]').click()
        await page.wait_for_timeout(300)

        # Start Day -> SHOP
        await page.locator('[data-type="START_DAY"]').click()
        await page.wait_for_timeout(500)

        # Pause simulation so state is completely stable for screenshots
        await page.evaluate("""() => {
            const state = window.__xomNho.getState();
            state.isPaused = true;
        }""")

        # 1. Capture canopy BEFORE vs AFTER
        # Before canopy
        await page.evaluate("""() => {
            const state = window.__xomNho.getState();
            state.upgrades.canopy = 0;
            state.activeCustomer = {
                id: 'pilot_student_before',
                visualVariantId: 'walkin_variant_0',
                name: 'Em Nam (Học Sinh)',
                dialogue: 'Quán hôm nay đông vui quá!',
                status: 'ARRIVED',
                temperament: 'FRIENDLY'
            };
            window.__xomNho.render();
        }""")
        await page.wait_for_timeout(300)
        p_no_canopy = EVIDENCE_DIR / "pilot_canopy_before.png"
        await page.screenshot(path=str(p_no_canopy))

        # Enable canopy (Mái hiên di động)
        await page.evaluate("""() => {
            const state = window.__xomNho.getState();
            state.upgrades.canopy = 1;
            window.__xomNho.render();
        }""")
        await page.wait_for_timeout(300)
        p_canopy = EVIDENCE_DIR / "pilot_canopy_after.png"
        await page.screenshot(path=str(p_canopy))

        # 2. Capture each of the 4 pilot walk-in characters at the counter (with canopy)
        walkin_cases = [
            ("walkin_variant_0", "Em Nam (Học Sinh)", "pilot_01_walkin_student.png", "Cho em một ổ bánh mì chả ít cay để kịp giờ vào lớp nha anh!"),
            ("walkin_variant_1", "Chị Mai (Văn Phòng)", "pilot_02_walkin_office.png", "Một ly trà tắc ít đường mang đi giùm em nha!"),
            ("walkin_driver", "Chú Bảy (Xe Ôm Công Nghệ)", "pilot_03_walkin_driver.png", "Cho chú ly sữa đậu đá mát lạnh uống cho đã khát con ơi!"),
            ("walkin_elder", "Bác Năm (Tập Thể Dục)", "pilot_04_walkin_elder.png", "Sáng nay bánh mì mới ra lò thơm quá, lấy bác một ổ nha.")
        ]

        for variant_key, name, filename, dialogue in walkin_cases:
            await page.evaluate(f"""() => {{
                const state = window.__xomNho.getState();
                state.upgrades.canopy = 1;
                state.activeCustomer = {{
                    id: 'pilot_{variant_key}',
                    visualVariantId: '{variant_key}',
                    name: '{name}',
                    dialogue: '{dialogue}',
                    status: 'ARRIVED',
                    temperament: 'FRIENDLY'
                }};
                window.__xomNho.setAutoPrepState(null);
                window.__xomNho.render();
            }}""")
            await page.wait_for_timeout(350)
            target = EVIDENCE_DIR / filename
            await page.screenshot(path=str(target))
            print(f"Captured {filename}")

        # 3. Capture Staff Handoff moment (Hands reaching across counter to customer)
        await page.evaluate("""() => {
            const state = window.__xomNho.getState();
            state.upgrades.canopy = 1;
            state.activeCustomer = {
                id: 'pilot_handoff_cust',
                visualVariantId: 'walkin_variant_0',
                name: 'Em Nam (Học Sinh)',
                dialogue: 'Cảm ơn anh! Bánh mì nóng hổi thơm nức mũi luôn!',
                status: 'ARRIVED',
                temperament: 'FRIENDLY'
            };
            window.__xomNho.setAutoPrepState({
                item: 'BANH_MI_CHA',
                stage: 'done',
                isExtra: false
            });
            window.__xomNho.render();
        }""")
        await page.wait_for_timeout(400)
        p_handoff = EVIDENCE_DIR / "pilot_05_staff_handoff.png"
        await page.screenshot(path=str(p_handoff))
        print("Captured pilot_05_staff_handoff.png")

        await context.close()
        await browser.close()

    server.shutdown()
    print("All pilot screenshots successfully captured in:", EVIDENCE_DIR)

if __name__ == "__main__":
    asyncio.run(capture_pilot())
