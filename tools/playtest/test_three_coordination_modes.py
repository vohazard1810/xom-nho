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

server = ThreadingHTTPServer(("127.0.0.1", 8995), QuietHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()

async def run_simulation():
    html_content = """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script type="module">
import { fresh, action } from '/game/day1-core.mjs';

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

  // Custom 3-customer rush wave:
  // t=0: Bác Ba (NORMAL, 120 patience)
  // t=5: Chị Mai (NORMAL, 100 patience)
  // t=8: Anh Tùng (RUSH, 55 patience, 1.5 drain/tick)
  s.dayCustomers = [
    { id: 'bac_ba', name: 'Bác Ba', recipe: 'BANH_MI_CHA', arrivalMinute: 0, temperament: 'NORMAL', priceSensitivity: 'LOW', dialogue: 'Cho tôi ổ bánh mì nhé.' },
    { id: 'chi_mai', name: 'Chị Mai', recipe: 'TRA_TAC', arrivalMinute: 5, temperament: 'NORMAL', priceSensitivity: 'MEDIUM', dialogue: 'Em ơi một ly trà tắc nha.' },
    { id: 'anh_tung', name: 'Anh Tùng', recipe: 'SUA_DAU_DA', arrivalMinute: 8, temperament: 'RUSH', priceSensitivity: 'LOW', dialogue: 'Lẹ lẹ nha em ơi, anh giao gấp!' }
  ];
  s.spawnedIndex = 0;
  s.customerIndex = 0;
  s.clock = 0;
  s.waitingQueue = [];
  s.activeCustomer = null;
  s.missedOrders = [];
  s.servedOrders = [];
  return s;
}

function stepShop(s, prepDuration = 35) {
  s = action(s, 'TICK', 1).state;

  if (s.activeCustomer && s.activeCustomer.status === 'ARRIVED') {
    if (!s.activeCustomer._prepProgress) s.activeCustomer._prepProgress = 0;
    const speedMult = (s.focusBoost && s.focusBoost.active) ? 2.0 : 1.0;
    s.activeCustomer._prepProgress += speedMult;

    if (s.activeCustomer._prepProgress >= prepDuration) {
      s = action(s, 'SERVE_AUTO').state;
      s = action(s, 'CUSTOMER_LEAVE').state;
    }
  }
  return s;
}

// -----------------------------------------------------------------
// Mode 1: KHÔNG CAN THIỆP (Idle / FIFO)
// -----------------------------------------------------------------
function runMode1() {
  let s = createRushWaveState();
  const customerLogs = {
    bac_ba: { name: 'Bác Ba', temperament: 'NORMAL', arrival: 0, servedAt: null, waitTime: 0, status: null },
    chi_mai: { name: 'Chị Mai', temperament: 'NORMAL', arrival: 5, servedAt: null, waitTime: 0, status: null },
    anh_tung: { name: 'Anh Tùng', temperament: 'RUSH', arrival: 8, servedAt: null, waitTime: 0, status: null }
  };

  for (let t = 0; t < 150; t++) {
    s = stepShop(s, 35);

    for (const served of s.servedOrders) {
      const cid = served.personId || served.ticketId.split('_')[0];
      if (customerLogs[cid] && !customerLogs[cid].servedAt) {
        customerLogs[cid].servedAt = s.clock;
        customerLogs[cid].waitTime = s.clock - customerLogs[cid].arrival;
        customerLogs[cid].status = 'SERVED';
      }
    }
    for (const missed of s.missedOrders) {
      const cid = missed.personId || missed.ticketId.split('_')[0];
      if (customerLogs[cid] && !customerLogs[cid].status) {
        customerLogs[cid].servedAt = null;
        customerLogs[cid].waitTime = s.clock - customerLogs[cid].arrival;
        customerLogs[cid].status = missed.reason;
      }
    }
    if (s.customerIndex >= 3) break;
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
    chi_mai: { name: 'Chị Mai', temperament: 'NORMAL', arrival: 5, servedAt: null, waitTime: 0, status: null },
    anh_tung: { name: 'Anh Tùng', temperament: 'RUSH', arrival: 8, servedAt: null, waitTime: 0, status: null }
  };

  let prioritized = false;

  for (let t = 0; t < 150; t++) {
    // When Anh Tùng (RUSH) enters waiting queue, player taps PRIORITIZE!
    if (!prioritized && s.waitingQueue.some(c => c.id === 'anh_tung')) {
      s = action(s, 'PRIORITIZE', { customerId: 'anh_tung' }).state;
      prioritized = true;
    }

    s = stepShop(s, 35);

    for (const served of s.servedOrders) {
      const cid = served.personId || served.ticketId.split('_')[0];
      if (customerLogs[cid] && !customerLogs[cid].servedAt) {
        customerLogs[cid].servedAt = s.clock;
        customerLogs[cid].waitTime = s.clock - customerLogs[cid].arrival;
        customerLogs[cid].status = 'SERVED';
      }
    }
    for (const missed of s.missedOrders) {
      const cid = missed.personId || missed.ticketId.split('_')[0];
      if (customerLogs[cid] && !customerLogs[cid].status) {
        customerLogs[cid].servedAt = null;
        customerLogs[cid].waitTime = s.clock - customerLogs[cid].arrival;
        customerLogs[cid].status = missed.reason;
      }
    }
    if (s.customerIndex >= 3) break;
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
    chi_mai: { name: 'Chị Mai', temperament: 'NORMAL', arrival: 5, servedAt: null, waitTime: 0, status: null },
    anh_tung: { name: 'Anh Tùng', temperament: 'RUSH', arrival: 8, servedAt: null, waitTime: 0, status: null }
  };

  let boosted = false;

  for (let t = 0; t < 150; t++) {
    // When rush wave forms at t=10, player activates FOCUS_BOOST mid-order!
    if (!boosted && t >= 10) {
      s = action(s, 'FOCUS_BOOST').state;
      boosted = true;
    }

    s = stepShop(s, 35);

    for (const served of s.servedOrders) {
      const cid = served.personId || served.ticketId.split('_')[0];
      if (customerLogs[cid] && !customerLogs[cid].servedAt) {
        customerLogs[cid].servedAt = s.clock;
        customerLogs[cid].waitTime = s.clock - customerLogs[cid].arrival;
        customerLogs[cid].status = 'SERVED';
      }
    }
    for (const missed of s.missedOrders) {
      const cid = missed.personId || missed.ticketId.split('_')[0];
      if (customerLogs[cid] && !customerLogs[cid].status) {
        customerLogs[cid].servedAt = null;
        customerLogs[cid].waitTime = s.clock - customerLogs[cid].arrival;
        customerLogs[cid].status = missed.reason;
      }
    }
    if (s.customerIndex >= 3) break;
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
        await page.goto("http://127.0.0.1:8995/game/_rush_runner.html")
        await page.wait_for_timeout(600)
        result = await page.evaluate("() => window.runAllModes()")
        await browser.close()

    if runner_html.exists():
        runner_html.unlink()

    return result

async def main():
    res = await run_simulation()
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
            print(f"{c['name']:<15} | {c['temperament']:<10} | {c['waitTime']} phút ({c['waitTime']*60}s)   | {c['status']}")
    print("===================================================================\n")

if __name__ == "__main__":
    asyncio.run(main())
