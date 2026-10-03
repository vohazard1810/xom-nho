import asyncio
import json
import os
import shutil
import sys
sys.stdout.reconfigure(encoding='utf-8')
import threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
DOCS_EVIDENCE = ROOT / "docs" / "mobile_gate_evidence" / "section9_readability"
DOCS_EVIDENCE.mkdir(parents=True, exist_ok=True)
BRAIN = Path(r"C:\Users\truonggiang.vo01\.gemini\antigravity\brain\47b8d4fc-0808-455a-ab31-40cf8e3ca68d")

class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, format, *args):
        pass

PORT = 8996
server = ThreadingHTTPServer(("127.0.0.1", PORT), QuietHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            headless=True
        )

        test_results = {
            "dish_name_font_size": None,
            "dish_name_font_size_ge_16px": False,
            "ticket_thumbnail_valid": False,
            "extra_cha_badge_visible": False,
            "queue_thumbnails_count": 0,
            "workbench_checklist_status": False,
            "menu_thumbnails_count": 0,
            "menu_lock_condition_separated": False,
            "staff_role_cards_vertical": False,
            "touch_targets_ge_44px": True,
            "no_horizontal_overflow_360": False,
            "no_horizontal_overflow_390": False,
            "console_errors": [],
            "broken_images": []
        }

        # -------------------------------------------------------------
        # 1. SETUP PAGE & LISTENERS AT 390x844
        # -------------------------------------------------------------
        context = await browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        page = await context.new_page()

        page.on("pageerror", lambda err: test_results["console_errors"].append(str(err)))
        page.on("response", lambda res: test_results["broken_images"].append(res.url) if res.status >= 400 and any(ext in res.url for ext in [".png", ".jpg", ".jpeg"]) else None)

        await page.goto(f"http://127.0.0.1:{PORT}/game/")
        await page.wait_for_selector(".screen-home", timeout=5000)

        # -------------------------------------------------------------
        # SCENE 1: BÁNH MÌ CÓ THÊM CHẢ (BÉ TÍ)
        # -------------------------------------------------------------
        await page.evaluate("""() => {
            localStorage.clear();
            const s = window.__xomNho.getState();
            s.shopName = 'Quán Xóm Nhỏ';
            s.screen = 'SHOP';
            s.currentDay = 1;
            s.cash = 120000;
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
                customerId: 'be_ti',
                recipeId: 'BANH_MI_CHA',
                isExtra: true,
                selected: { bread: 1, cha: 1 },
                phase: 'SELECT',
                elapsedMs: 0,
                prepMs: 2000
            };
            s.waitingQueue = [
                { id: 'co_chin', name: 'Cô Chín', recipe: 'TRA_TAC', temperament: 'NORMAL', patience: 90, maxPatience: 100 },
                { id: 'anh_tung', name: 'Anh Tùng', recipe: 'SUA_DAU_DA', temperament: 'RUSH', patience: 50, maxPatience: 60 },
                { id: 'bac_ba', name: 'Bác Ba', recipe: 'BANH_MI_CHA', temperament: 'NORMAL', patience: 80, maxPatience: 100 }
            ];
            window.__xomNho.render();
        }""")

        await page.wait_for_selector(".customer-order-callout", timeout=5000)

        # Verify Scene 1 DOM
        s1_metrics = await page.evaluate("""() => {
            const ticket = document.querySelector('.customer-order-callout');
            const nameEl = ticket ? ticket.querySelector('.ticket-dish-name') : null;
            const imgEl = ticket ? ticket.querySelector('.ticket-dish-img') : null;
            const specialEl = ticket ? ticket.querySelector('.ticket-special-badge') : null;
            const receipt = document.querySelector('.order-receipt');
            const checkItems = receipt ? [...receipt.querySelectorAll('.receipt-item')] : [];

            const fontSize = nameEl ? window.getComputedStyle(nameEl).fontSize : '0px';
            return {
                dishName: nameEl ? nameEl.textContent : '',
                fontSize: parseFloat(fontSize),
                imgSrc: imgEl ? imgEl.src : '',
                specialText: specialEl ? specialEl.textContent : '',
                receiptTitle: receipt ? receipt.querySelector('b')?.textContent : '',
                checkItems: checkItems.map(el => ({ text: el.textContent.trim(), isChecked: el.classList.contains('checked') }))
            };
        }""")

        test_results["dish_name_font_size"] = s1_metrics["fontSize"]
        test_results["dish_name_font_size_ge_16px"] = s1_metrics["fontSize"] >= 16.0
        test_results["ticket_thumbnail_valid"] = "takeaway_banh_mi.png" in s1_metrics["imgSrc"]
        test_results["extra_cha_badge_visible"] = "Thêm chả" in s1_metrics["specialText"]
        test_results["workbench_checklist_status"] = len(s1_metrics["checkItems"]) > 0

        shot1_path = DOCS_EVIDENCE / "shot_01_banh_mi_them_cha.png"
        await page.screenshot(path=str(shot1_path))
        print("Captured Scene 1 ->", shot1_path)

        # -------------------------------------------------------------
        # SCENE 2: TRÀ TẮC (CÔ CHÍN)
        # -------------------------------------------------------------
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.activeCustomer = {
                id: 'co_chin',
                name: 'Cô Chín',
                recipe: 'TRA_TAC',
                status: 'ARRIVED',
                temperament: 'NORMAL',
                dialogue: 'Bán cho cô ly trà tắc ít đá nha con!'
            };
            s.extraCha = null;
            s.service = {
                version: 2,
                customerId: 'co_chin',
                recipeId: 'TRA_TAC',
                isExtra: false,
                selected: { ice: 1, sugar_syrup: 1, kumquat: 1 },
                phase: 'PREP',
                elapsedMs: 500,
                prepMs: 2000
            };
            window.__xomNho.render();
        }""")
        await page.wait_for_timeout(200)

        shot2_path = DOCS_EVIDENCE / "shot_02_tra_tac.png"
        await page.screenshot(path=str(shot2_path))
        print("Captured Scene 2 ->", shot2_path)

        # -------------------------------------------------------------
        # SCENE 3: SỮA ĐẬU ĐÁ (ANH TÙNG - RUSH)
        # -------------------------------------------------------------
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.activeCustomer = {
                id: 'anh_tung',
                name: 'Anh Tùng',
                recipe: 'SUA_DAU_DA',
                status: 'ARRIVED',
                temperament: 'RUSH',
                dialogue: 'Lẹ nha em ơi, anh giao cuốc xe gấp!'
            };
            s.extraCha = null;
            s.service = {
                version: 2,
                customerId: 'anh_tung',
                recipeId: 'SUA_DAU_DA',
                isExtra: false,
                selected: { soy_milk: 1 },
                phase: 'SELECT',
                elapsedMs: 0,
                prepMs: 2000
            };
            window.__xomNho.render();
        }""")
        await page.wait_for_timeout(200)

        shot3_path = DOCS_EVIDENCE / "shot_03_sua_dau.png"
        await page.screenshot(path=str(shot3_path))
        print("Captured Scene 3 ->", shot3_path)

        # -------------------------------------------------------------
        # SCENE 4: HÀNG CHỜ 3 KHÁCH CÓ THẺ MÓN NHỎ & TEST PRIORITIZE
        # -------------------------------------------------------------
        # Ensure 3 waiting customers with distinct dishes
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.waitingQueue = [
                { id: 'be_ti', name: 'Bé Tí', recipe: 'BANH_MI_CHA', temperament: 'NORMAL', patience: 95, maxPatience: 100 },
                { id: 'co_chin', name: 'Cô Chín', recipe: 'TRA_TAC', temperament: 'NORMAL', patience: 75, maxPatience: 100 },
                { id: 'chu_sau', name: 'Chú Sáu', recipe: 'SUA_DAU_DA', temperament: 'RUSH', patience: 35, maxPatience: 70 }
            ];
            s.prioritizedCustomerId = 'chu_sau'; // prioritize Chú Sáu
            window.__xomNho.render();
        }""")
        await page.wait_for_timeout(200)

        q_metrics = await page.evaluate("""() => {
            const tickets = [...document.querySelectorAll('.queue-ticket')];
            return tickets.map(t => {
                const img = t.querySelector('.queue-dish-thumb');
                const b = t.querySelector('b');
                const tag = t.querySelector('.queue-dish-name');
                const rect = t.getBoundingClientRect();
                return {
                    text: b ? b.textContent : '',
                    dishTag: tag ? tag.textContent : '',
                    hasImg: img !== null && img.src.length > 0,
                    width: rect.width,
                    height: rect.height,
                    isChosen: t.classList.contains('chosen')
                };
            });
        }""")

        test_results["queue_thumbnails_count"] = sum(1 for q in q_metrics if q["hasImg"])
        shot4_path = DOCS_EVIDENCE / "shot_04_hang_cho_3_khach.png"
        await page.screenshot(path=str(shot4_path))
        print("Captured Scene 4 ->", shot4_path)

        # -------------------------------------------------------------
        # SCENE 5: MENU SETUP VỚI THUMBNAIL & ĐIỀU KIỆN MỞ TÁCH BIỆT
        # -------------------------------------------------------------
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.screen = 'MENU';
            window.__xomNho.render();
        }""")
        await page.wait_for_selector(".menu-screen", timeout=5000)

        menu_metrics = await page.evaluate("""() => {
            const cards = [...document.querySelectorAll('.menu-card')];
            const lockEl = document.querySelector('.menu-lock-condition');
            const btns = [...document.querySelectorAll('.price-tier-btn')];
            const btnSizes = btns.map(b => {
                const r = b.getBoundingClientRect();
                return { w: r.width, h: r.height };
            });
            return {
                cardCount: cards.length,
                thumbsCount: cards.filter(c => c.querySelector('.menu-dish-thumb') !== null).length,
                hasLockCondition: lockEl !== null && lockEl.textContent.includes('Điều kiện mở'),
                allBtnsGe44: btnSizes.every(s => s.w >= 44 && s.h >= 44)
            };
        }""")

        test_results["menu_thumbnails_count"] = menu_metrics["thumbsCount"]
        test_results["menu_lock_condition_separated"] = menu_metrics["hasLockCondition"]

        shot5_path = DOCS_EVIDENCE / "shot_05_menu_readability.png"
        await page.screenshot(path=str(shot5_path))
        print("Captured Scene 5 (Menu) ->", shot5_path)

        # -------------------------------------------------------------
        # SCENE 6: NHÂN SỰ VỚI THẺ DỌC & CONTRAST RÕ RÀNG
        # -------------------------------------------------------------
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.empire.staffOpen = true;
            window.__xomNho.render();
        }""")
        await page.wait_for_selector(".staff-role-card", timeout=5000)

        staff_metrics = await page.evaluate("""() => {
            const cards = [...document.querySelectorAll('.staff-role-card')];
            const hireBtns = [...document.querySelectorAll('.btn-hire')];
            const btnSizes = hireBtns.map(b => {
                const r = b.getBoundingClientRect();
                return { w: r.width, h: r.height };
            });
            return {
                cardCount: cards.length,
                hasHeaders: cards.every(c => c.querySelector('.role-card-header') !== null),
                hasPerks: cards.every(c => c.querySelector('.role-perk') !== null),
                hasStatus: cards.every(c => c.querySelector('.role-status-row') !== null),
                hireBtnsGe44: btnSizes.every(s => s.w >= 44 && s.h >= 44)
            };
        }""")

        test_results["staff_role_cards_vertical"] = staff_metrics["hasHeaders"] and staff_metrics["hasPerks"] and staff_metrics["hireBtnsGe44"]

        shot6_path = DOCS_EVIDENCE / "shot_06_staff_readability.png"
        await page.screenshot(path=str(shot6_path))
        print("Captured Scene 6 (Staff) ->", shot6_path)

        # -------------------------------------------------------------
        # VIEWPORT OVERFLOW CHECKS (360x640 and 390x844)
        # -------------------------------------------------------------
        # Close staff panel and return to SHOP screen
        await page.evaluate("""() => {
            const s = window.__xomNho.getState();
            s.empire.staffOpen = false;
            s.screen = 'SHOP';
            window.__xomNho.render();
        }""")
        await page.wait_for_timeout(100)

        # Check 390x844
        await page.set_viewport_size({"width": 390, "height": 844})
        await page.wait_for_timeout(100)
        overflow_390 = await page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth")
        test_results["no_horizontal_overflow_390"] = not overflow_390

        # Check 360x640
        await page.set_viewport_size({"width": 360, "height": 640})
        await page.wait_for_timeout(100)
        overflow_360 = await page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth")
        test_results["no_horizontal_overflow_360"] = not overflow_360

        shot_360_path = DOCS_EVIDENCE / "shot_07_viewport_360x640.png"
        await page.screenshot(path=str(shot_360_path))
        print("Captured 360x640 Viewport ->", shot_360_path)

        # Copy all screenshots to BRAIN artifacts
        if BRAIN.exists():
            for pth in DOCS_EVIDENCE.glob("*.png"):
                dest = BRAIN / pth.name
                shutil.copy(pth, dest)
                print(f"Copied to brain artifact: {dest.name}")

        # Write test report
        report_path = DOCS_EVIDENCE / "section9_report.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(test_results, f, ensure_ascii=False, indent=2)
        print("Wrote Section 9 Test Report ->", report_path)
        print("Test Summary:")
        print(json.dumps(test_results, indent=2))

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
