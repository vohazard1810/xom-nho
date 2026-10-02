import assert from 'node:assert/strict';
import { fresh, action, calculateLedger, encode, decode, recipes, dayConfig } from './day1-core.mjs';

const run = (s, type, payload) => {
  const result = action(s, type, payload);
  assert.equal(result.error, undefined, `${type}: ${result.error}`);
  return result.state;
};

let s = fresh();
s = run(s, 'CLAIM_LOGIN', '2026-09-30');
assert.equal(s.login.visitDays, 1);
s = run(s, 'CLAIM_LOGIN', '2026-09-30');
assert.equal(s.login.visitDays, 1);
s = run(s, 'CLAIM_LOGIN', '2026-10-03');
assert.equal(s.login.visitDays, 2, 'Missing calendar days never penalizes the player');
assert.equal(s.currentDay, 1, 'Calendar visits do not advance simulated days');
s = decode(encode(s));
assert.equal(s.login.stamps.length, 2);

// Closing is triggered by the simulation clock, without a manual button.
s = run(s, 'SET_SHOP_NAME', 'Quán Test');
s = run(s, 'NAVIGATE');
s = run(s, 'NAVIGATE');
s = run(s, 'BUNDLE_DAY1');
s = run(s, 'BUY');
s = run(s, 'START_DAY');
s.customerIndex = s.dayCustomers.length;
s = run(s, 'TICK', 60);
assert.equal(s.screen, 'SHOP');
s.clock = 357;
s = run(s, 'TICK', 3);
assert.equal(s.screen, 'DAY_RESULT');
assert.equal(s.lastDayReport.feedback.length, 0, 'Feedback comes from actual transactions');
s = run(s, 'NEXT_DAY');
assert.equal(s.screen, 'XOM_OI');
assert.equal(s.login.visitDays, 2);

// Standalone long-run progression fixtures, with real cash and inventory flow.
s.currentDay = 3;
s.screen = 'XOM_OI';
s.cash = 200000;
s.dayStartingCash = 200000;
s = run(s, 'UPGRADE', 'counter');
assert.ok(action(s, 'CONFIG_MENU', { recipeId: 'BANH_MI_TRUNG', enabled: true }).error);
s = run(s, 'LEARN_RECIPE', 'BANH_MI_TRUNG');
assert.ok(s.knownRecipeIds.includes('BANH_MI_TRUNG'));
assert.ok(s.menu.BANH_MI_TRUNG.enabled);
assert.equal(s.cash, 163000);
s.currentDay = 5;
s = run(s, 'UPGRADE', 'canopy');
assert.equal(s.upgrades.canopy, 1);
s.currentDay = 8;
s = run(s, 'HIRE_STAFF');
assert.equal(s.operatingExpenses, 8000);
assert.equal(s.dayCustomers.filter(c => c.id.startsWith('staff_peak_')).length, 2);
assert.ok(action(s, 'HIRE_STAFF').error);

s.currentDay = 15;
s.dayCustomers = [];
s = run(s, 'ENABLE_ONLINE');
assert.equal(s.dayCustomers.filter(c => c.isOnline).length, 2);
assert.ok(action(s, 'ENABLE_ONLINE').error);
// Morning upgrades must not erase a channel's already scheduled tickets.
s.upgrades.seating = 0;
s = run(s, 'UPGRADE', 'seating');
assert.equal(s.dayCustomers.filter(c => c.isOnline).length, 2);
s.dayCustomers = s.dayCustomers.filter(c => c.isOnline);
s = run(s, 'NAVIGATE');
s = run(s, 'BASKET', { id: 'bread', qty: 1 });
s = run(s, 'BASKET', { id: 'cha', qty: 1 });
s = run(s, 'BASKET', { id: 'vegetable', qty: 1 });
s = run(s, 'BUY');
s = run(s, 'START_DAY');
s.clock = 160;
s = run(s, 'TICK', 3);
assert.ok(s.activeCustomer.isOnline);
s = run(s, 'SERVE_AUTO');
assert.equal(s.servedOrders[0].onlineFee, 2000);
assert.equal(s.servedOrders[0].cogs, 11000);
s = run(s, 'CUSTOMER_LEAVE');
s = run(s, 'CLOSE');
const ledger = calculateLedger(s);
assert.equal(ledger.onlineFees, 2000);
assert.equal(ledger.finalCashInDrawer, s.cash);
assert.equal(ledger.resultAfterSpoilageAndExpenses, ledger.grossOperatingProfit - ledger.spoilageLoss - ledger.operatingExpenses - ledger.onlineFees + ledger.sideJobIncome);
assert.ok(s.lastDayReport.feedback.some(f => f.name === 'Đơn mang đi 1'));
assert.ok(recipes.BANH_MI_TRUNG);
// Roadwork is a single optional in-shift decision, with a signaled cost and
// actual additional visitor; choosing no cannot spend money or create demand.
for (const choice of ['yes', 'no']) {
  let event = fresh();
  event.currentDay = 6;
  event.screen = 'SHOP';
  event.shopName = 'Quán Hẻm';
  event.dayEvent = dayConfig(6);
  event.dayCustomers = [];
  event.cash = 10000;
  event.dayStartingCash = 10000;
  event.clock = 147;
  event = run(event, 'TICK', 3);
  assert.equal(event.activeDecision.id, 'ROADWORK_SIGN');
  assert.equal(event.isPaused, true);
  event = run(event, 'DECIDE', { choice });
  assert.equal(event.cash, choice === 'yes' ? 7000 : 10000);
  assert.equal(event.dayCustomers.length, choice === 'yes' ? 1 : 0);
  assert.equal(event.operatingExpenses, choice === 'yes' ? 3000 : 0);
  event = run(event, 'CLOSE');
  assert.equal(calculateLedger(event).finalCashInDrawer, event.cash);
}
console.log('Progression: calendar, auto close, recipe, canopy, staff, online inventory/fees, feedback and ledger PASS');
