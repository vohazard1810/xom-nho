import asyncio
import json
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

PORT = 8994
server = ThreadingHTTPServer(("127.0.0.1", PORT), QuietHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()

async def run_simulation():
    html_content = """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script type="module">
import { fresh, action, recipes } from '/game/day1-core.mjs';
import { advanceShift, cookingAction, cookingNeeds } from '/game/shift-engine.mjs';

function createRushWaveState() {
  let s = fresh();
  const apply = (type, payload) => {
    const res = action(s, type, payload);
    if (res.error) console.error(type, res.error);
    s = res.state;
  };
  apply('SET_SHOP_NAME', 'Quán Xóm Nhỏ');
  apply('NAVIGATE');
  apply('NAVIGATE');
  apply('BUNDLE_DAY1');
  apply('BUY');
  apply('START_DAY');

  // 3-customer rush wave:
  // t=0: Bác Ba (NORMAL, 120 patience) - Bánh mì chả (25.000đ)
  // t=2: Chị Mai (NORMAL, 100 patience) - Trà tắc (12.000đ)
  // t=3: Anh Tùng (RUSH, 10 patience, 1.5 drain/min) - Sữa đậu đá (15.000đ)
  s.dayCustomers = [
    { id: 'bac_ba', name: 'Bác Ba', recipe: 'BANH_MI_CHA', arrivalMinute: 0, temperament: 'NORMAL', maxPatience: 120, priceSensitivity: 'LOW', dialogue: 'Cho tôi ổ bánh mì nhé.' },
    { id: 'chi_mai', name: 'Chị Mai', recipe: 'TRA_TAC', arrivalMinute: 2, temperament: 'NORMAL', maxPatience: 100, priceSensitivity: 'MEDIUM', dialogue: 'Em ơi một ly trà tắc nha.' },
    { id: 'anh_tung', name: 'Anh Tùng', recipe: 'SUA_DAU_DA', arrivalMinute: 3, temperament: 'RUSH', maxPatience: 14, priceSensitivity: 'LOW', dialogue: 'Lẹ lẹ nha em ơi, anh giao gấp!' }
  ];
  s.spawnedIndex = 0;
  s.customerIndex = 0;
  s.clock = 0;
  s.waitingQueue = [];
  s.activeCustomer = null;
  s.missedOrders = [];
  s.servedOrders = [];
  s.cookingTutorialDone = true; // Real gameplay, no tutorial freeze
  return s;
}

// REAL HANDS-ON KITCHEN STEP:
// Selects required ingredients -> COOK -> SERVE -> advanceShift(100ms)
function stepKitchen(s) {
  if (s.service?.phase === 'SELECT') {
    const needs = cookingNeeds(s);
    for (const [id, q] of Object.entries(needs)) {
      for (let n = s.service.selected[id] || 0; n < q; n++) {
        const r = cookingAction(s, 'ADD_INGREDIENT', id);
        if (r.error) console.error('ADD_INGREDIENT error:', r.error);
        s = r.state;
      }
    }
    const cookRes = cookingAction(s, 'COOK');
    if (cookRes.error) console.error('COOK error:', cookRes.error);
    s = cookRes.state;
  }
  if (s.service?.phase === 'READY') {
    const serveRes = cookingAction(s, 'SERVE');
    if (serveRes.error) console.error('SERVE error:', serveRes.error);
    s = serveRes.state;
  }
  s = advanceShift(s, 100);
  return s;
}

// -----------------------------------------------------------------
// Mode 1: KHÔNG CAN THIỆP (Idle thuần túy - FIFO)
// -----------------------------------------------------------------
function runMode1() {
  let s = createRushWaveState();
  const customerLogs = {
    bac_ba: { name: 'Bác Ba', temperament: 'NORMAL', arrival: 0, servedAt: null, waitTime: 0, status: null },
    chi_mai: { name: 'Chị Mai', temperament: 'NORMAL', arrival: 2, servedAt: null, waitTime: 0, status: null },
    anh_tung: { name: 'Anh Tùng', temperament: 'RUSH', arrival: 3, servedAt: null, waitTime: 0, status: null }
  };

  for (let t = 0; t < 250; t++) {
    s = stepKitchen(s);

    for (const served of s.servedOrders) {
      const cid = served.personId || served.customerId;
      if (customerLogs[cid] && !customerLogs[cid].servedAt) {
        customerLogs[cid].servedAt = Math.round(s.clock * 10) / 10;
        customerLogs[cid].waitTime = Math.round((s.clock - customerLogs[cid].arrival) * 10) / 10;
        customerLogs[cid].status = 'SERVED';
      }
    }
    for (const missed of s.missedOrders) {
      const cid = missed.personId || missed.customerId;
      if (customerLogs[cid] && !customerLogs[cid].status) {
        customerLogs[cid].servedAt = null;
        customerLogs[cid].waitTime = Math.round((s.clock - customerLogs[cid].arrival) * 10) / 10;
        customerLogs[cid].status = missed.reason;
      }
    }
    if (s.servedOrders.length + s.missedOrders.length >= 3) break;
  }

  return {
    mode: 'KHONG_CAN_THIEP',
    modeName: '1. Không can thiệp (Idle thuần túy - FIFO)',
    servedCount: s.servedOrders.length,
    missedCount: s.missedOrders.length,
    revenue: s.revenue,
    customers: customerLogs
  };
}

// -----------------------------------------------------------------
// Mode 2: ƯU TIÊN KHÁCH VỘI (PRIORITIZE)
// -----------------------------------------------------------------
function runMode2() {
  let s = createRushWaveState();
  const customerLogs = {
    bac_ba: { name: 'Bác Ba', temperament: 'NORMAL', arrival: 0, servedAt: null, waitTime: 0, status: null },
    chi_mai: { name: 'Chị Mai', temperament: 'NORMAL', arrival: 2, servedAt: null, waitTime: 0, status: null },
    anh_tung: { name: 'Anh Tùng', temperament: 'RUSH', arrival: 3, servedAt: null, waitTime: 0, status: null }
  };

  let prioritized = false;

  for (let t = 0; t < 250; t++) {
    // When Anh Tùng (RUSH) enters waiting queue, player taps PRIORITIZE!
    if (!prioritized && s.waitingQueue.some(c => c.id === 'anh_tung')) {
      s = action(s, 'PRIORITIZE', { customerId: 'anh_tung' }).state;
      prioritized = true;
    }

    s = stepKitchen(s);

    for (const served of s.servedOrders) {
      const cid = served.personId || served.customerId;
      if (customerLogs[cid] && !customerLogs[cid].servedAt) {
        customerLogs[cid].servedAt = Math.round(s.clock * 10) / 10;
        customerLogs[cid].waitTime = Math.round((s.clock - customerLogs[cid].arrival) * 10) / 10;
        customerLogs[cid].status = 'SERVED';
      }
    }
    for (const missed of s.missedOrders) {
      const cid = missed.personId || missed.customerId;
      if (customerLogs[cid] && !customerLogs[cid].status) {
        customerLogs[cid].servedAt = null;
        customerLogs[cid].waitTime = Math.round((s.clock - customerLogs[cid].arrival) * 10) / 10;
        customerLogs[cid].status = missed.reason;
      }
    }
    if (s.servedOrders.length + s.missedOrders.length >= 3) break;
  }

  return {
    mode: 'UU_TIEN_KHACH_VOI',
    modeName: '2. Ưu tiên khách vội (PRIORITIZE Anh Tùng)',
    servedCount: s.servedOrders.length,
    missedCount: s.missedOrders.length,
    revenue: s.revenue,
    customers: customerLogs
  };
}

// -----------------------------------------------------------------
// Mode 3: DÙNG FOCUS BOOST (Chế biến x2)
// -----------------------------------------------------------------
function runMode3() {
  let s = createRushWaveState();
  const customerLogs = {
    bac_ba: { name: 'Bác Ba', temperament: 'NORMAL', arrival: 0, servedAt: null, waitTime: 0, status: null },
    chi_mai: { name: 'Chị Mai', temperament: 'NORMAL', arrival: 2, servedAt: null, waitTime: 0, status: null },
    anh_tung: { name: 'Anh Tùng', temperament: 'RUSH', arrival: 3, servedAt: null, waitTime: 0, status: null }
  };

  let boosted = false;

  for (let t = 0; t < 250; t++) {
    // When rush customer arrives at counter or queue, activate FOCUS_BOOST
    if (!boosted && s.waitingQueue.some(c => c.id === 'anh_tung')) {
      s = action(s, 'FOCUS_BOOST').state;
      boosted = true;
    }

    s = stepKitchen(s);

    for (const served of s.servedOrders) {
      const cid = served.personId || served.customerId;
      if (customerLogs[cid] && !customerLogs[cid].servedAt) {
        customerLogs[cid].servedAt = Math.round(s.clock * 10) / 10;
        customerLogs[cid].waitTime = Math.round((s.clock - customerLogs[cid].arrival) * 10) / 10;
        customerLogs[cid].status = 'SERVED';
      }
    }
    for (const missed of s.missedOrders) {
      const cid = missed.personId || missed.customerId;
      if (customerLogs[cid] && !customerLogs[cid].status) {
        customerLogs[cid].servedAt = null;
        customerLogs[cid].waitTime = Math.round((s.clock - customerLogs[cid].arrival) * 10) / 10;
        customerLogs[cid].status = missed.reason;
      }
    }
    if (s.servedOrders.length + s.missedOrders.length >= 3) break;
  }

  return {
    mode: 'DUNG_FOCUS_BOOST',
    modeName: '3. Dùng Focus Boost (Tập trung chế biến x2)',
    servedCount: s.servedOrders.length,
    missedCount: s.missedOrders.length,
    revenue: s.revenue,
    customers: customerLogs
  };
}

window.runAllModes = function() {
  return {
    mode1: runMode1(),
    mode2: runMode2(),
    mode3: runMode3()
  };
};
</script>
</body>
</html>
"""
    runner_html = ROOT / "game" / "_rush_runner.html"
    runner_html.write_text(html_content, encoding="utf-8")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            headless=True
        )
        page = await browser.new_page()
        page.on("console", lambda m: print("[BROWSER CONSOLE]", m.text))
        page.on("pageerror", lambda e: print("[BROWSER ERROR]", e))
        await page.goto(f"http://127.0.0.1:{PORT}/game/_rush_runner.html")
        await page.wait_for_timeout(800)
        result = await page.evaluate("() => window.runAllModes()")
        await browser.close()

    if runner_html.exists():
        runner_html.unlink()

    return result

async def main():
    res = await run_simulation()
    
    # Strict assertions on real engine behavior:
    # Mode 1: Idle FIFO -> Anh Tùng (RUSH) leaves due to WAIT_TOO_LONG (2 served, 1 missed)
    assert res["mode1"]["servedCount"] == 2, f"Mode 1 servedCount expected 2, got {res['mode1']['servedCount']}"
    assert res["mode1"]["missedCount"] == 1, f"Mode 1 missedCount expected 1, got {res['mode1']['missedCount']}"
    assert res["mode1"]["customers"]["anh_tung"]["status"] == "WAIT_TOO_LONG", f"Mode 1 Anh Tùng status: {res['mode1']['customers']['anh_tung']['status']}"
    
    # Mode 2: Prioritizing Anh Tùng saves him -> 3 served, 0 missed
    assert res["mode2"]["servedCount"] == 3, f"Mode 2 servedCount expected 3, got {res['mode2']['servedCount']}"
    assert res["mode2"]["missedCount"] == 0, f"Mode 2 missedCount expected 0, got {res['mode2']['missedCount']}"
    assert res["mode2"]["customers"]["anh_tung"]["status"] == "SERVED", f"Mode 2 Anh Tùng status: {res['mode2']['customers']['anh_tung']['status']}"
    
    # Mode 3: Focus Boost 2x kitchen speed finishes Chị Mai early and saves Anh Tùng -> 3 served, 0 missed
    assert res["mode3"]["servedCount"] == 3, f"Mode 3 servedCount expected 3, got {res['mode3']['servedCount']}"
    assert res["mode3"]["missedCount"] == 0, f"Mode 3 missedCount expected 0, got {res['mode3']['missedCount']}"
    assert res["mode3"]["customers"]["anh_tung"]["status"] == "SERVED", f"Mode 3 Anh Tùng status: {res['mode3']['customers']['anh_tung']['status']}"
    
    out_path = ROOT / "docs" / "mobile_gate_evidence" / "pilot" / "three_modes_comparison.json"
    out_path.write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")
    print("OUTPUT SAVED TO:", out_path)
    print("\n================ THREE COORDINATION MODES RESULTS ================")
    for key, data in res.items():
        print(f"\n--- {data['modeName']} ---")
        print(f"Phục vụ: {data['servedCount']}/3 | Bỏ lỡ: {data['missedCount']}/3 | Doanh thu: {data['revenue']:,}đ")
        print(f"{'Khách hàng':<15} | {'Tính cách':<10} | {'Thời gian chờ':<18} | {'Kết quả':<15}")
        print("-" * 68)
        for cid, c in data['customers'].items():
            print(f"{c['name']:<15} | {c['temperament']:<10} | {c['waitTime']} phút ({c['waitTime']*60:.0f}s)   | {c['status']}")
    print("===================================================================\n")

if __name__ == "__main__":
    asyncio.run(main())
