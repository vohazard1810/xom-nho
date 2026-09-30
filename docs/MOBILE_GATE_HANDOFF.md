# Mobile gate handoff for Antigravity

Use a **full repository checkout** including `assets/` and a machine with Chrome/Edge/Playwright Chromium. Run from the repository root:

```sh
python -m pip install playwright
python -m playwright install chromium
python tools/playtest/mobile_gate_7day.py
```

If Chromium download is unavailable, pass the installed browser executable:

```sh
python tools/playtest/mobile_gate_7day.py --browser-executable "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
```

The runner starts a local HTTP server itself; it does not require manual `python -m http.server`. It launches a 390×844 browser context, records video and day-by-day screenshots in `docs/mobile_gate_evidence/`, and writes `mobile_gate_7day.json` with per-day duration, served/missed counts, cash, rating and touch-control counts. It verifies:

- All seven days progress through morning news, market, menu, shop and ledger.
- Day 1 retains 127k cash / 67k gross and automatically enters Day 2 after the 12-second result review; opening full ledger pauses the countdown.
- Page reload in Day 2 preserves cash and customer index. Decision modals resolve, including Bé Tí and roadwork.
- Cash ledger reconciles after each day; UI has no JS errors or broken assets.
- Enabled touch buttons throughout all screens are at least 44×44 px and reachable. Every day gets morning/shop/result screenshots and a complete browser video.

Any failed assertion or missing asset/browser produces a nonzero exit. Do not mark the mobile or art gate PASS from Node simulations. Attach the JSON, seven-day video, screenshots and browser console output to the PR for review, together with which browser/version was used. The older `test_v07_logic_gate.py` and `test_v07_mobile_experience.py` scripts are Day 1 historical checks with hardcoded Windows Edge paths; use this runner as the current seven-day gate.

Current execution workspace is partial: the preflight finds 13 required `assets/` images absent. Chromium download here returned an invalid/truncated ZIP. This is an environment block, not a successful mobile playtest.
