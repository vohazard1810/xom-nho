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

server = ThreadingHTTPServer(("127.0.0.1", 8997), QuietHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()

async def main():
    html_content = """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script type="module">
import { fresh, action } from '/game/day1-core.mjs';

window.testPauseResume = function() {
  let s = fresh();
  const apply = (t, p) => { s = action(s, t, p).state; };
  apply('SET_SHOP_NAME', 'Quán Xóm Nhỏ');
  apply('NAVIGATE');
  apply('NAVIGATE');
  apply('BUNDLE_DAY1');
  apply('BUY');
  apply('START_DAY');

  // Activate Focus Boost
  apply('FOCUS_BOOST');
  const boostSecBefore = s.focusBoost.remainingSeconds;

  // Set up counter for Bé Tí arrival at minute 120
  s.customerIndex = 2;
  s.spawnedIndex = 2;
  s.activeCustomer = null;
  s.clock = 120;
  apply('TICK', 1);

  const isPaused = s.isPaused;
  const decisionActive = Boolean(s.activeDecision);
  const clockAtPause = s.clock;
  const boostSecAtPause = s.focusBoost.remainingSeconds;

  // Try to tick 5 times while paused
  for (let i = 0; i < 5; i++) {
    apply('TICK', 1);
  }

  const clockAfterTicksWhilePaused = s.clock;
  const boostSecAfterTicksWhilePaused = s.focusBoost.remainingSeconds;

  // Now resolve decision (RESUME)
  apply('DECIDE', { choice: 'yes' });
  const isPausedAfterDecide = s.isPaused;

  // Tick 1 time after resume
  apply('TICK', 1);
  const clockAfterResume = s.clock;
  const boostSecAfterResume = s.focusBoost.remainingSeconds;

  return {
    isPausedInitially: isPaused,
    decisionActive,
    clockAtPause,
    clockAfterTicksWhilePaused,
    clockFrozen: clockAtPause === clockAfterTicksWhilePaused,
    boostSecAtPause,
    boostSecAfterTicksWhilePaused,
    boostFrozen: boostSecAtPause === boostSecAfterTicksWhilePaused,
    isPausedAfterDecide,
    clockAfterResume,
    clockResumed: clockAfterResume === clockAtPause + 1,
    boostResumed: boostSecAfterResume === boostSecAtPause - 1
  };
};
</script>
</body>
</html>
"""
    runner_html = ROOT / "game" / "_pause_runner.html"
    runner_html.write_text(html_content, encoding="utf-8")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            headless=True
        )
        page = await browser.new_page()
        await page.goto("http://127.0.0.1:8997/game/_pause_runner.html")
        await page.wait_for_timeout(300)
        res = await page.evaluate("() => window.testPauseResume()")
        await browser.close()

    if runner_html.exists():
        runner_html.unlink()

    print("PAUSE/RESUME TEST RESULT:")
    print(json.dumps(res, indent=2))
    assert res["clockFrozen"], "Clock must remain frozen during pause"
    assert res["boostFrozen"], "Boost duration must remain frozen during pause"
    assert not res["isPausedAfterDecide"], "Game must unpause after decision"
    assert res["clockResumed"], "Clock must advance after resume"
    assert res["boostResumed"], "Boost must continue counting down after resume"
    print("PAUSE/RESUME VERIFIED 100% PASS!")

if __name__ == "__main__":
    asyncio.run(main())
