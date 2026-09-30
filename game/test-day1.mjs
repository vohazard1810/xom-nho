import assert from 'node:assert/strict';
import { fresh, action, encode, decode, calculateLedger, fixtureCustomers } from './day1-core.mjs';

function run({ price = 25000, disabled = false, late = false, reloadAt = -1 } = {}) {
  let s = fresh();
  const apply = (type, payload) => {
    const result = action(s, type, payload);
    assert.equal(result.error, undefined, `${type}: ${result.error}`);
    s = result.state;
  };
  apply('NAVIGATE');
  apply('NAVIGATE');
  apply('BUNDLE_DAY1');
  apply('BUY');
  if (price !== 25000) apply('CONFIG_MENU', { recipeId: 'BANH_MI_CHA', sellPrice: price });
  if (disabled) apply('CONFIG_MENU', { recipeId: 'SUA_DAU_DA', enabled: false });
  if (late) apply('SET_OPENING_TIME', 'late_10am');
  apply('START_DAY');
  if (late) assert.deepEqual(s.missedOrders.map(o => o.reason), ['MISSED_LATE_OPENING', 'MISSED_LATE_OPENING']);
  while (s.customerIndex < fixtureCustomers.length) {
    if (!s.activeCustomer) apply('TICK', 3);
    if (!s.activeCustomer) continue;
    if (s.isPaused) {
      const clock = s.clock;
      apply('DECIDE', { choice: 'yes' });
      assert.equal(s.clock, clock);
    }
    if (s.activeCustomer.status === 'ARRIVED') {
      apply('SERVE_AUTO');
      assert.equal(action(s, 'SERVE_AUTO').error, 'Đơn này chưa sẵn sàng hoặc đã xử lý.');
    }
    if (s.customerIndex === reloadAt) {
      s = decode(encode(s));
      assert.ok(s, 'Saved state recovers');
    }
    apply('CUSTOMER_LEAVE');
  }
  apply('CLOSE');
  const ledger = calculateLedger(s);
  assert.equal(s.cash, ledger.finalCashInDrawer);
  assert.equal(ledger.grossOperatingProfit, ledger.totalSalesRevenue - ledger.cogsSoldItemsOnly);
  assert.equal(s.servedOrders.length + s.missedOrders.length, 8);
  assert.ok(Object.values(s.stock).every(q => q >= 0));
  return { s, ledger };
}

const baseline = run();
assert.equal(baseline.ledger.finalCashInDrawer, 127000);
assert.equal(baseline.ledger.grossOperatingProfit, 67000);
assert.deepEqual(run({ reloadAt: 3 }).ledger, baseline.ledger);
const expensive = run({ price: 28000 });
assert.ok(expensive.s.missedOrders.some(o => o.reason === 'PRICE_TOO_HIGH'));
assert.notEqual(expensive.ledger.finalCashInDrawer, baseline.ledger.finalCashInDrawer);
const disabled = run({ disabled: true });
assert.ok(disabled.s.missedOrders.some(o => o.reason === 'MENU_DISABLED'));
assert.notEqual(disabled.ledger.finalCashInDrawer, baseline.ledger.finalCashInDrawer);
const late = run({ late: true });
assert.equal(late.s.missedOrders.filter(o => o.reason === 'MISSED_LATE_OPENING').length, 2);
assert.deepEqual(late.s.servedOrders.map(o => o.name), ['Bé Tí', 'Cô Chín', 'Anh Tùng', 'Bác Năm', 'Cô Bảy', 'Chú Tư']);
assert.notDeepEqual(late.s.servedOrders.map(o => o.name), baseline.s.servedOrders.map(o => o.name));
console.log('v0.7 Day 1: baseline, serialized resume, price, disabled menu, late opening, ledger and duplicate-service guard PASS');
