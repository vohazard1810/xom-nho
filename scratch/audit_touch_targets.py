import asyncio
import json
import shutil
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import sys
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path('.').resolve()
ARTIFACT_DIR = Path(r"C:\Users\truonggiang.vo01\.gemini\antigravity\brain\47b8d4fc-0808-455a-ab31-40cf8e3ca68d")
server = ThreadingHTTPServer(('127.0.0.1', 8994), lambda *args, **kwargs: SimpleHTTPRequestHandler(*args, directory=str(ROOT), **kwargs))
threading.Thread(target=server.serve_forever, daemon=True).start()

async def run_audit():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            headless=True
        )

        results = {}

        for w, h in [(360, 640), (390, 844)]:
            page = await browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=2)
            await page.goto("http://127.0.0.1:8994/game/")
            await page.wait_for_selector("#app")

            await page.evaluate("""() => {
                const s = window.__xomNho.getState();
                s.screen = 'SHOP';
                s.cash = 145000;
                s.stock = { bread: 4, cha: 4, vegetable: 5, egg: 0, ice: 5, sugar_syrup: 5, kumquat: 5, soy_milk: 4 };
                s.activeCustomer = {
                    id: 'be_ti',
                    name: 'Bé Tí',
                    recipe: 'BANH_MI_CHA',
                    status: 'ARRIVED',
                    temperament: 'NORMAL',
                    dialogue: 'Cho con bánh mì thêm chả nha chú!'
                };
                s.extraCha = true;
                s.service = {
                    version: 2,
                    recipeId: 'BANH_MI_CHA',
                    customerId: 'be_ti',
                    selected: { bread: 1 },
                    phase: 'SELECT',
                    elapsedMs: 0,
                    prepMs: 2000
                };
                s.waitingQueue = [
                    { id: 'co_chin', name: 'Cô Chín', recipe: 'TRA_TAC', temperament: 'NORMAL', patience: 85, maxPatience: 100, arrivalMinute: 60 },
                    { id: 'anh_tung', name: 'Anh Tùng', recipe: 'SUA_DAU_DA', temperament: 'RUSH', patience: 50, maxPatience: 60, arrivalMinute: 60 }
                ];
                window.__xomNho.setFloatingCash(null);
                window.__xomNho.render();
            }""")

            await page.wait_for_timeout(300)

            audit_data = await page.evaluate("""() => {
                const interactiveSelectors = [
                    { name: 'Nút Tạm dừng (.play-pause)', selector: '.play-pause' },
                    { name: 'Thẻ Hàng chờ 1 - Cô Chín (.queue-ticket:nth-child(2))', selector: '.play-queue .queue-ticket:nth-of-type(1)' },
                    { name: 'Thẻ Hàng chờ 2 - Anh Tùng (.queue-ticket:nth-child(3))', selector: '.play-queue .queue-ticket:nth-of-type(2)' },
                    { name: 'Nguyên liệu - Bánh mì', selector: '.ingredient-button[data-payload="bread"]' },
                    { name: 'Nguyên liệu - Chả lụa', selector: '.ingredient-button[data-payload="cha"]' },
                    { name: 'Nguyên liệu - Dưa ngò', selector: '.ingredient-button[data-payload="vegetable"]' },
                    { name: 'Nguyên liệu - Đá bi', selector: '.ingredient-button[data-payload="ice"]' },
                    { name: 'Nguyên liệu - Nước đường', selector: '.ingredient-button[data-payload="sugar_syrup"]' },
                    { name: 'Nguyên liệu - Tắc tươi', selector: '.ingredient-button[data-payload="kumquat"]' },
                    { name: 'Nguyên liệu - Sữa đậu', selector: '.ingredient-button[data-payload="soy_milk"]' },
                    { name: 'Thao tác bếp - Làm lại (.undo-button)', selector: '.undo-button' },
                    { name: 'Thao tác bếp - Làm món / Giao (.cook-main)', selector: '.cook-main' },
                    { name: 'Thao tác bếp - Nhanh x2 (.boost-button)', selector: '.boost-button' },
                    { name: 'Tùy chọn - Quản lý ca (.play-options summary)', selector: '.play-options summary' }
                ];

                const items = interactiveSelectors.map(item => {
                    const el = document.querySelector(item.selector);
                    if (!el) return { name: item.name, selector: item.selector, found: false };
                    const rect = el.getBoundingClientRect();
                    const w = Math.round(rect.width * 10) / 10;
                    const h = Math.round(rect.height * 10) / 10;
                    const pass = (w >= 44.0 && h >= 44.0);
                    return {
                        name: item.name,
                        selector: item.selector,
                        width: w,
                        height: h,
                        targetStandardPass: pass,
                        found: true
                    };
                });

                const allPass = items.every(i => i.found && i.targetStandardPass);
                return { items, allPass };
            }""")

            results[f"{w}x{h}"] = audit_data
            await page.close()

        print(json.dumps(results, indent=2, ensure_ascii=False))
        report_file = ROOT / "docs" / "mobile_gate_evidence" / "touch_targets_audit.json"
        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        shutil.copyfile(report_file, ARTIFACT_DIR / "touch_targets_audit.json")
        print(f"Audit report saved to {report_file}")
        await browser.close()

asyncio.run(run_audit())
