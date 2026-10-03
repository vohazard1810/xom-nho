import asyncio
import sys
sys.stdout.reconfigure(encoding='utf-8')
import threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
test_file = sys.argv[1] if len(sys.argv) > 1 else "game/test-day1.mjs"

class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, format, *args):
        pass

server = ThreadingHTTPServer(("127.0.0.1", 8992), QuietHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()

async def run():
    test_rel = Path(test_file).as_posix()
    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<div id="output"></div>
<script type="importmap">
{{
  "imports": {{
    "node:assert/strict": "data:text/javascript,export default {{ equal(a, b, m){{if(a!=b)throw new Error((m?m+': ':'')+a+'!='+b)}}, notEqual(a,b,m){{if(a==b)throw new Error((m?m+': ':'')+a+'=='+b)}}, ok(v,m){{if(!v)throw new Error(m||'falsy')}}, deepEqual(a,b,m){{if(JSON.stringify(a)!=JSON.stringify(b))throw new Error((m?m+': ':'')+JSON.stringify(a)+'!='+JSON.stringify(b))}}, notDeepEqual(a,b,m){{if(JSON.stringify(a)==JSON.stringify(b))throw new Error((m?m+': ':'')+JSON.stringify(a)+'=='+JSON.stringify(b))}}, match(a,b,m){{if(!b.test(a))throw new Error((m?m+': ':'')+a+' does not match '+b)}} }};",
    "node:assert": "data:text/javascript,export default {{ equal(a, b, m){{if(a!=b)throw new Error((m?m+': ':'')+a+'!='+b)}}, notEqual(a,b,m){{if(a==b)throw new Error((m?m+': ':'')+a+'=='+b)}}, ok(v,m){{if(!v)throw new Error(m||'falsy')}}, deepEqual(a,b,m){{if(JSON.stringify(a)!=JSON.stringify(b))throw new Error((m?m+': ':'')+JSON.stringify(a)+'!='+JSON.stringify(b))}}, notDeepEqual(a,b,m){{if(JSON.stringify(a)==JSON.stringify(b))throw new Error((m?m+': ':'')+JSON.stringify(a)+'=='+JSON.stringify(b))}}, match(a,b,m){{if(!b.test(a))throw new Error((m?m+': ':'')+a+' does not match '+b)}} }};"
  }}
}}
</script>
<script>
  window.process = {{ argv: [], env: {{}}, exit: (code) => console.log('process.exit', code) }};
</script>
<script type="module">
  try {{
    // dynamically patch or import
    const mod = await import('/{test_rel}');
    console.log('TEST_RUNNER_PASSED');
  }} catch (err) {{
    console.error('TEST_RUNNER_FAILED', err);
  }}
</script>
</body>
</html>
"""
    runner_html = ROOT / "game" / "_test_runner.html"
    runner_html.write_text(html_content, encoding="utf-8")
    
    errors = []
    messages = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            headless=True
        )
        page = await browser.new_page()
        done_future = asyncio.get_event_loop().create_future()
        def on_msg(m):
            messages.append(m.text)
            if "TEST_RUNNER_PASSED" in m.text or "TEST_RUNNER_FAILED" in m.text:
                if not done_future.done():
                    done_future.set_result(True)
        page.on("console", on_msg)
        page.on("pageerror", lambda e: errors.append(str(e)))
        
        await page.goto("http://127.0.0.1:8992/game/_test_runner.html")
        try:
            await asyncio.wait_for(done_future, timeout=12.0)
        except asyncio.TimeoutError:
            pass
        await browser.close()
        
    if runner_html.exists():
        runner_html.unlink()
        
    print("MESSAGES:", messages)
    if errors:
        print("ERRORS:", errors)
        sys.exit(1)
    if any("TEST_RUNNER_PASSED" in m for m in messages):
        print("SUCCESS:", test_file)
    else:
        print("DID NOT PASS")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run())
