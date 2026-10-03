import asyncio
import json
import shutil
from pathlib import Path
import sys
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path('.').resolve()
ARTIFACT_DIR = Path(r"C:\Users\truonggiang.vo01\.gemini\antigravity\brain\47b8d4fc-0808-455a-ab31-40cf8e3ca68d")
DOCS_EVIDENCE = ROOT / "docs" / "mobile_gate_evidence"
DOCS_EVIDENCE.mkdir(parents=True, exist_ok=True)

async def test_patience_assertions():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            headless=True
        )

        page = await browser.new_page(viewport={"width": 360, "height": 640})
        await page.goto("http://192.168.1.16:8990/game/")

        result = await page.evaluate("""async () => {
            const coreMod = await import('/game/day1-core.mjs');
            const shiftMod = await import('/game/shift-engine.mjs');

            // 1. Verify that all 8 fixtureCustomers have valid arrivalMinute
            const fixtureCheck = coreMod.fixtureCustomers.map(c => ({
                id: c.id,
                name: c.name,
                arrivalMinute: c.arrivalMinute,
                hasValidArrival: Number.isFinite(c.arrivalMinute) && c.arrivalMinute >= 0
            }));
            const allFixturesValid = fixtureCheck.every(c => c.hasValidArrival);

            // 2. Set up shift state with two waiting customers:
            // - Customer 1: explicit arrivalMinute = 90
            // - Customer 2: missing arrivalMinute (undefined)
            let s = coreMod.fresh();
            s.screen = 'SHOP';
            s.clock = 100;
            s.cookingTutorialDone = true;
            s.dayCustomers = []; // Isolate queue patience test from day customer spawner
            s.activeCustomer = { id: 'active_1', name: 'Khách tại quầy', recipe: 'BANH_MI_CHA', status: 'ARRIVED' };
            s.service = { version: 2, customerId: 'active_1', recipeId: 'BANH_MI_CHA', selected: {}, phase: 'SELECT', elapsedMs: 0, prepMs: 1400 };
            s.waitingQueue = [
                {
                    id: 'cust_normal',
                    name: 'Khách Có Arrival',
                    recipe: 'TRA_TAC',
                    status: 'WAITING',
                    temperament: 'NORMAL',
                    arrivalMinute: 90,
                    patience: 100,
                    maxPatience: 100,
                    ticksWaiting: 0
                },
                {
                    id: 'cust_fallback',
                    name: 'Khách Thiếu Arrival (Fallback)',
                    recipe: 'BANH_MI_CHA',
                    status: 'WAITING',
                    temperament: 'NORMAL',
                    // arrivalMinute is deliberately undefined!
                    patience: 100,
                    maxPatience: 100,
                    ticksWaiting: 0
                }
            ];

            const initP1 = s.waitingQueue[0].patience;
            const initP2 = s.waitingQueue[1].patience;

            // Tick 1: Advance by 10 minutes (delta = 10)
            let res1 = coreMod.action(s, 'TICK', 10);
            s = res1.state;
            const step1_p1 = s.waitingQueue.find(c => c.id === 'cust_normal')?.patience;
            const step1_p2 = s.waitingQueue.find(c => c.id === 'cust_fallback')?.patience;
            const step1_p2_arrMin = s.waitingQueue.find(c => c.id === 'cust_fallback')?.arrivalMinute;

            // Tick 2: Advance by 20 minutes (delta = 20)
            let res2 = coreMod.action(s, 'TICK', 20);
            s = res2.state;
            const step2_p1 = s.waitingQueue.find(c => c.id === 'cust_normal')?.patience;
            const step2_p2 = s.waitingQueue.find(c => c.id === 'cust_fallback')?.patience;

            // Tick 3: Advance by two 40-minute ticks (delta <= 60 is enforced by engine)
            let res3a = coreMod.action(s, 'TICK', 40);
            s = res3a.state;
            let res3b = coreMod.action(s, 'TICK', 40);
            s = res3b.state;
            const remainingQueueIds = s.waitingQueue.map(c => c.id);
            const missedWaitTooLong = s.missedOrders.filter(o => o.reason === 'WAIT_TOO_LONG');

            // 3. Test shift-engine advanceShift integration
            let shiftState = coreMod.fresh();
            shiftState.screen = 'SHOP';
            shiftState.currentDay = 2; // day > 1 so tutorial does not freeze clock
            shiftState.cookingTutorialDone = true;
            shiftState.clock = 60;
            shiftState.dayCustomers = [];
            shiftState.activeCustomer = { id: 'act_2', name: 'Act', recipe: 'TRA_TAC', status: 'ARRIVED' };
            shiftState.service = { version: 2, customerId: 'act_2', recipeId: 'TRA_TAC', selected: {}, phase: 'SELECT', elapsedMs: 0, prepMs: 1400 };
            shiftState.waitingQueue = [
                {
                    id: 'shift_cust_fallback',
                    name: 'Khách Shift Fallback',
                    recipe: 'TRA_TAC',
                    status: 'WAITING',
                    temperament: 'NORMAL',
                    patience: 80,
                    maxPatience: 100
                    // arrivalMinute missing
                }
            ];
            // advance 2000ms in shift-engine (4 game minutes)
            shiftState = shiftMod.advanceShift(shiftState, 2000);
            const shiftCustPatience = shiftState.waitingQueue.find(c => c.id === 'shift_cust_fallback')?.patience;

            return {
                allFixturesValid,
                fixtureCheck,
                init: { p1: initP1, p2: initP2 },
                step1: {
                    p1: step1_p1,
                    p2: step1_p2,
                    p2_arrMin_persisted: step1_p2_arrMin,
                    p1_finite: Number.isFinite(step1_p1),
                    p2_finite: Number.isFinite(step1_p2),
                    p1_drained: step1_p1 < initP1,
                    p2_drained: step1_p2 < initP2
                },
                step2: {
                    p1: step2_p1,
                    p2: step2_p2,
                    p1_drained_further: step2_p1 < step1_p1,
                    p2_drained_further: step2_p2 < step1_p2
                },
                step3: {
                    remainingQueueIds,
                    missedCount: missedWaitTooLong.length,
                    missedCustomerIds: missedWaitTooLong.map(o => o.customerId),
                    custFallbackDeparted: !remainingQueueIds.includes('cust_fallback'),
                    custNormalDeparted: !remainingQueueIds.includes('cust_normal')
                },
                shiftEngineIntegration: {
                    initialPatience: 80,
                    afterPatience: shiftCustPatience,
                    drained: shiftCustPatience < 80,
                    isFinite: Number.isFinite(shiftCustPatience)
                }
            };
        }""")

        print("=== PATIENCE AND FIXTURE AUDIT REPORT ===")
        print(json.dumps(result, ensure_ascii=False, indent=2))

        # Assertions
        assert result["allFixturesValid"], "All 8 original fixture customers must have valid arrivalMinute"
        assert result["step1"]["p1_finite"], "Normal customer patience must be finite"
        assert result["step1"]["p2_finite"], "Fallback customer patience must be finite"
        assert result["step1"]["p1_drained"], "Normal customer patience must drain"
        assert result["step1"]["p2_drained"], "Fallback customer patience must drain on first tick"
        assert result["step1"]["p2_arrMin_persisted"] is not None, "Fallback must persist arrivalMinute onto customer"
        assert result["step2"]["p2_drained_further"], "Fallback customer patience must continue draining (NO infinite waiting!)"
        assert result["step3"]["custFallbackDeparted"], "Fallback customer must not wait infinitely; must depart when patience hits 0"
        assert result["shiftEngineIntegration"]["drained"], "advanceShift in shift-engine must drain patience properly"

        # Save report
        report_file = DOCS_EVIDENCE / "patience_drain_assertion_report.json"
        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        shutil.copyfile(report_file, ARTIFACT_DIR / "patience_drain_assertion_report.json")
        print(f"\nReport saved to {report_file} and copied to artifacts.")

        await page.close()
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_patience_assertions())
