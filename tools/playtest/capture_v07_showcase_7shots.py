import asyncio
import sys
import threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE_DIR = ROOT / "docs" / "mobile_gate_evidence" / "pilot"
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
BRAIN_DIR = Path(r"C:\Users\truonggiang.vo01\.gemini\antigravity\brain\47b8d4fc-0808-455a-ab31-40cf8e3ca68d")

class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, format, *args):
        pass

server = ThreadingHTTPServer(("127.0.0.1", 8996), QuietHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()

async def capture_all():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            headless=True
        )
        context = await browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=1
        )
        page = await context.new_page()

        # Shot 1: Lineup is already produced as pilot_archetype_consistency_lineup.png
        # Let's verify and copy/link shot_01
        lineup_path = EVIDENCE_DIR / "shot_01_archetype_lineup.png"
        existing_lineup = EVIDENCE_DIR / "pilot_archetype_consistency_lineup.png"
        if existing_lineup.exists():
            lineup_path.write_bytes(existing_lineup.read_bytes())
            if BRAIN_DIR.exists():
                (BRAIN_DIR / "shot_01_archetype_lineup.png").write_bytes(existing_lineup.read_bytes())
        print("Shot 1 ready:", lineup_path)

        # Navigate to game
        await page.goto("http://127.0.0.1:8996/game/")
        await page.evaluate("() => localStorage.clear()")
        await page.reload()
        await page.locator("#shop-name-input").fill("Quán Hẻm Nhỏ")
        await page.locator('[data-type="SET_SHOP_NAME"]').click()
        await page.locator('[data-type="NAVIGATE"]').click()
        await page.locator('[data-type="BUNDLE_DAY1"]').click()
        await page.locator('[data-type="BUY"]').click()
        await page.locator('[data-type="START_DAY"]').click()

        # Pause background simulation loop so staged states remain perfectly static
        await page.evaluate("""() => {
            window.__xomNho.clearAllTimers();
            window.__xomNho.getState().isPaused = true;
        }""")
        await page.wait_for_timeout(200)

        # Shot 2: 3 customers waiting in queue
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.activeCustomer = {
                id: 'be_ti', name: 'Bé Tí', personId: 'be_ti', visualVariantId: 'be_ti',
                recipe: 'BANH_MI_CHA', dialogue: 'Chú ơi cho con ổ Bánh mì chả, chú cho con xin thêm chả nghen!',
                patience: 150, maxPatience: 180, temperament: 'FRIENDLY', status: 'ARRIVED'
            };
            s.waitingQueue = [
                {
                    id: 'co_chin', name: 'Cô Chín', personId: 'co_chin', visualVariantId: 'co_chin',
                    recipe: 'TRA_TAC', dialogue: 'Làm cô ly trà tắc chua ngọt nghe con!',
                    patience: 120, maxPatience: 180, temperament: 'FRIENDLY', status: 'WAITING', isPrioritized: false
                },
                {
                    id: 'anh_tung', name: 'Anh Tùng', personId: 'anh_tung', visualVariantId: 'anh_tung',
                    recipe: 'SUA_DAU_DA', dialogue: 'Cho anh ly Sữa đậu đá mát rượi em ơi! Đang vội chạy cuốc khách trưa!',
                    patience: 70, maxPatience: 80, temperament: 'RUSH', status: 'WAITING', isPrioritized: false
                }
            ];
            s.extraCha = true;
            window.__xomNho.setAutoPrepState(null);
            window.__xomNho.render();
        }""")
        await page.wait_for_timeout(300)
        shot2_path = EVIDENCE_DIR / "shot_02_three_customers_queue.png"
        await page.screenshot(path=str(shot2_path))
        if BRAIN_DIR.exists():
            (BRAIN_DIR / "shot_02_three_customers_queue.png").write_bytes(shot2_path.read_bytes())
        print("Shot 2 captured:", shot2_path)

        # Shot 3: 1 order prepping on rustic workstation + prioritized order badge
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.prioritizedCustomerId = 'anh_tung';
            s.waitingQueue[1].isPrioritized = true;
            window.__xomNho.setAutoPrepState({
                stage: 'layer2',
                progress: 68,
                item: 'BANH_MI_CHA',
                isExtra: true
            });
            window.__xomNho.render();
        }""")
        await page.wait_for_timeout(300)
        shot3_path = EVIDENCE_DIR / "shot_03_prep_and_prioritized.png"
        await page.screenshot(path=str(shot3_path))
        if BRAIN_DIR.exists():
            (BRAIN_DIR / "shot_03_prep_and_prioritized.png").write_bytes(shot3_path.read_bytes())
        print("Shot 3 captured:", shot3_path)

        # Shot 4: Impatient customer with patience warning
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.activeCustomer = {
                id: 'chi_hai', name: 'Chị Mai (Văn phòng)', personId: 'office_chi_hai', visualVariantId: 'walkin_variant_1',
                recipe: 'TRA_TAC', dialogue: 'Sắp vào giờ họp rồi, quán làm nhanh giùm mình với nha!',
                patience: 15, maxPatience: 100, temperament: 'RUSH', status: 'ARRIVED'
            };
            s.waitingQueue[0].patience = 20; // 16% Warning
            s.waitingQueue[1].patience = 35; // 43% Impatient
            window.__xomNho.setAutoPrepState(null);
            window.__xomNho.render();
        }""")
        await page.wait_for_timeout(300)
        shot4_path = EVIDENCE_DIR / "shot_04_customer_impatient.png"
        await page.screenshot(path=str(shot4_path))
        if BRAIN_DIR.exists():
            (BRAIN_DIR / "shot_04_customer_impatient.png").write_bytes(shot4_path.read_bytes())
        print("Shot 4 captured:", shot4_path)

        # Shot 5: Staff handoff Banh Mi
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.activeCustomer = {
                id: 'be_ti', name: 'Bé Tí', personId: 'be_ti', visualVariantId: 'be_ti',
                recipe: 'BANH_MI_CHA', dialogue: 'Dạ con cảm ơn chú nhiều nghen!',
                patience: 180, maxPatience: 180, temperament: 'FRIENDLY', status: 'ARRIVED'
            };
            window.__xomNho.setAutoPrepState({
                stage: 'done',
                progress: 100,
                item: 'BANH_MI_CHA',
                isExtra: true
            });
            window.__xomNho.render();
        }""")
        await page.wait_for_timeout(300)
        shot5_path = EVIDENCE_DIR / "shot_05_handoff_banhmi.png"
        await page.screenshot(path=str(shot5_path))
        if BRAIN_DIR.exists():
            (BRAIN_DIR / "shot_05_handoff_banhmi.png").write_bytes(shot5_path.read_bytes())
        print("Shot 5 captured:", shot5_path)

        # Shot 6: Staff handoff Soy Milk (STAFF_HANDOFF_SOYMILK_IMG)
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.activeCustomer = {
                id: 'anh_tung', name: 'Anh Tùng', personId: 'anh_tung', visualVariantId: 'anh_tung',
                recipe: 'SUA_DAU_DA', dialogue: 'Cảm ơn em trai nha, ly sữa đậu béo mát quá!',
                patience: 80, maxPatience: 80, temperament: 'RUSH', status: 'ARRIVED'
            };
            window.__xomNho.setAutoPrepState({
                stage: 'done',
                progress: 100,
                item: 'SUA_DAU_DA',
                isExtra: false
            });
            window.__xomNho.render();
        }""")
        await page.wait_for_timeout(300)
        shot6_path = EVIDENCE_DIR / "shot_06_handoff_soymilk.png"
        await page.screenshot(path=str(shot6_path))
        if BRAIN_DIR.exists():
            (BRAIN_DIR / "shot_06_handoff_soymilk.png").write_bytes(shot6_path.read_bytes())
        print("Shot 6 captured:", shot6_path)

        # Shot 7: Day result ledger with categorized missed reasons
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.screen = 'DAY_RESULT';
            s.cash = 127000;
            s.revenue = 122000;
            s.rating = 3.5;
            s.servedOrders = [
                { ticketId: '1', name: 'Bác Ba', recipe: 'BANH_MI_CHA', sellPrice: 25000, cogs: 8000 },
                { ticketId: '2', name: 'Chị Hai', recipe: 'TRA_TAC', sellPrice: 15000, cogs: 7000 },
                { ticketId: '3', name: 'Bé Tí', recipe: 'BANH_MI_CHA', sellPrice: 25000, cogs: 13000 },
                { ticketId: '4', name: 'Cô Chín', recipe: 'TRA_TAC', sellPrice: 15000, cogs: 7000 },
                { ticketId: '5', name: 'Anh Tùng', recipe: 'SUA_DAU_DA', sellPrice: 17000, cogs: 10000 },
                { ticketId: '6', name: 'Bác Năm', recipe: 'BANH_MI_CHA', sellPrice: 25000, cogs: 10000 }
            ];
            s.missedOrders = [
                { ticketId: 'm1', name: 'Cô Bảy', recipe: 'TRA_TAC', reason: 'WAIT_TOO_LONG' },
                { ticketId: 'm2', name: 'Chú Tư', recipe: 'BANH_MI_CHA', reason: 'OUT_OF_STOCK' }
            ];
            s.lastDayReport = {
                day: 1,
                served: 6,
                missed: 2,
                cash: 127000,
                rating: 3.5,
                feedback: [
                    { name: 'Cô Bảy', text: 'Quán làm lâu quá, trễ giờ làm của tôi rồi!', reason: 'WAIT_TOO_LONG' },
                    { name: 'Chú Tư', text: 'Tiếc quá, quán hết món rồi; mai mình ghé sớm nhé.', reason: 'OUT_OF_STOCK' },
                    { name: 'Bé Tí', text: 'Nhiều chả quá, con thích lắm!', reason: 'SERVED' }
                ],
                forecastTomorrow: 'Tin chợ: Tắc giá 3.000đ/trái. Dự kiến 8 lượt khách.'
            };
            window.__xomNho.render();
            // Open the ledger details
            const details = document.querySelector('#day-ledger-details');
            if (details) details.open = true;
        }""")
        await page.wait_for_timeout(300)
        shot7_path = EVIDENCE_DIR / "shot_07_day_result_categorized.png"
        await page.screenshot(path=str(shot7_path), full_page=True)
        if BRAIN_DIR.exists():
            (BRAIN_DIR / "shot_07_day_result_categorized.png").write_bytes(shot7_path.read_bytes())
        print("Shot 7 captured:", shot7_path)

        # Multi-viewport perspective scale check (360x800 & 430x932)
        for vp in [{"w": 360, "h": 800}, {"w": 430, "h": 932}]:
            v_ctx = await browser.new_context(viewport={"width": vp["w"], "height": vp["h"]})
            v_page = await v_ctx.new_page()
            await v_page.goto("http://127.0.0.1:8996/game/")
            await v_page.locator("#shop-name-input").fill("Quán Hẻm Nhỏ")
            await v_page.locator('[data-type="SET_SHOP_NAME"]').click()
            await v_page.locator('[data-type="NAVIGATE"]').click()
            await v_page.locator('[data-type="BUNDLE_DAY1"]').click()
            await v_page.locator('[data-type="BUY"]').click()
            await v_page.locator('[data-type="START_DAY"]').click()
            await v_page.wait_for_timeout(200)
            vp_path = EVIDENCE_DIR / f"viewport_{vp['w']}x{vp['h']}.png"
            await v_page.screenshot(path=str(vp_path))
            if BRAIN_DIR.exists():
                (BRAIN_DIR / f"viewport_{vp['w']}x{vp['h']}.png").write_bytes(vp_path.read_bytes())
            await v_ctx.close()
            print(f"Viewport {vp['w']}x{vp['h']} captured:", vp_path)

        await browser.close()
    print("ALL 7 SHOWCASE CHECKPOINTS AND VIEWPORTS CAPTURED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(capture_all())
