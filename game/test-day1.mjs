import assert from 'node:assert/strict';
import { fresh, action, encode, decode, calculateLedger, fixtureCustomers } from './day1-core.mjs';

function run({ price = 25000, disabled = false, late = false, reloadAt = -1 } = {}) {
  let s = fresh();
  const apply = (type, payload) => {
    const result = action(s, type, payload);
    assert.equal(result.error, undefined, `${type}: ${result.error}`);
    s = result.state;
  };
  apply('SET_SHOP_NAME', 'Quán Xóm Nhỏ');
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

function prepared() {
  let s = fresh();
  for (const [type, payload] of [['SET_SHOP_NAME', 'Quán Xóm Nhỏ'], ['NAVIGATE'], ['NAVIGATE'], ['BUNDLE_DAY1'], ['BUY']]) {
    const r = action(s, type, payload);
    assert.equal(r.error, undefined);
    s = r.state;
  }
  return s;
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

// The setup gates cannot be bypassed through generic navigation.
let gate = prepared();
assert.ok(action(gate, 'NAVIGATE').error);
assert.ok(action(gate, 'CONFIG_MENU', { recipeId: 'BANH_MI_CHA', sellPrice: 123 }).error);
assert.ok(action(gate, 'BASKET', null).error);
gate = action(gate, 'SET_OPENING_TIME', 'early_6am').state;
gate = action(gate, 'START_DAY').state;
assert.equal(gate.clock, -120);
assert.equal(gate.customerIndex, 0);
assert.ok(action(gate, 'CUSTOMER_LEAVE').error);
assert.ok(action(gate, 'TICK', -3).error);
gate = action(gate, 'SET_SPEED', 2).state;
gate = action(gate, 'TICK', 3).state;
assert.equal(gate.clock, -117, 'x2 changes interval, not simulation minutes per tick');

// News is delivered once without pausing and does not reappear after expiry.
let news = prepared();
news = action(news, 'START_DAY').state;
for (let i = 0; i < 65; i++) {
  if (news.activeCustomer?.status === 'ARRIVED') {
    if (news.isPaused) news = action(news, 'DECIDE', { choice: 'no' }).state;
    news = action(news, 'SERVE_AUTO').state;
    news = action(news, 'CUSTOMER_LEAVE').state;
  }
  news = action(news, 'TICK', 3).state;
}
assert.ok(news.newsSeen && news.newsTicker);
for (let i = 0; i < 16; i++) {
  if (news.activeCustomer?.status === 'ARRIVED') {
    news = action(news, 'SERVE_AUTO').state;
    news = action(news, 'CUSTOMER_LEAVE').state;
  }
  news = action(news, 'TICK', 3).state;
}
assert.equal(news.newsTicker, null);
assert.equal(news.isPaused, false);

// Explicit early closure accounts for every unserved customer and preserves cash.
let closed = prepared();
closed = action(closed, 'START_DAY').state;
closed = action(closed, 'TICK', 3).state;
closed = action(closed, 'CLOSE').state;
assert.equal(closed.missedOrders.length, 8);
assert.equal(calculateLedger(closed).missedByReason.MISSED_EARLY_CLOSING.length, 8);
assert.equal(closed.cash, 5000);
assert.equal(action(closed, 'TICK', 3).error, 'Quán chưa mở.');

// A special request cannot silently turn an affordable ordinary order into a loss.
let scarce = prepared();
scarce.stock.cha = 1;
scarce = action(scarce, 'START_DAY').state;
scarce = action(scarce, 'TICK', 3).state;
scarce.activeCustomer = { ...fixtureCustomers[2], status: 'ARRIVED' };
scarce.activeDecision = { id: 'EXTRA_CHA' };
scarce.isPaused = true;
assert.ok(action(scarce, 'DECIDE', { choice: 'yes' }).error);
assert.equal(scarce.isPaused, true);
scarce = action(scarce, 'DECIDE', { choice: 'no' }).state;
assert.equal(scarce.isPaused, false);
scarce = action(scarce, 'SERVE_AUTO').state;
assert.equal(scarce.activeCustomer.status, 'SERVED');

// Closing while a decision is open records all unserved customers once.
let pausedClose = prepared();
pausedClose = action(pausedClose, 'START_DAY').state;
pausedClose.activeCustomer = { ...fixtureCustomers[2], status: 'ARRIVED' };
pausedClose.activeDecision = { id: 'EXTRA_CHA' };
pausedClose.isPaused = true;
pausedClose.customerIndex = 2;
pausedClose.missedOrders = fixtureCustomers.slice(0, 2).map(c => ({ personId: c.id, reason: 'MISSED_LATE_OPENING' }));
pausedClose = action(pausedClose, 'CLOSE').state;
assert.equal(pausedClose.missedOrders.length, 8);
assert.equal(pausedClose.activeDecision, null);
console.log('v0.7 Day 1: baseline ledger, serialized resume, pricing/menu, clock/news, opening/closing, extra chả and duplicate-service guards PASS');
