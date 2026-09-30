import assert from 'node:assert/strict';
import { fresh, action, encode, decode, ingredients, recipes, calculateLedger, totalBasketUnits } from './day1-core.mjs';

function apply(s, type, payload) {
  const r = action(s, type, payload);
  assert.equal(r.error, undefined, `Day ${s.currentDay}, ${type}: ${r.error}`);
  return r.state;
}
function buy(s, plan) {
  for (const [id, qty] of Object.entries(plan)) s = apply(s, 'BASKET', { id, qty });
  assert.ok(totalBasketUnits(s.basket) <= s.upgrades.vehicleCapacity);
  return apply(s, 'BUY');
}
function serveDay(s) {
  let steps = 0;
  while (s.customerIndex < s.dayCustomers.length) {
    assert.ok(++steps < 1500, `Day ${s.currentDay} stalled`);
    if (!s.activeCustomer) s = apply(s, 'TICK', 3);
    if (!s.activeCustomer) continue;
    if (s.isPaused) s = apply(s, 'DECIDE', { choice: s.stock.cha >= 2 ? 'yes' : 'no' });
    if (s.activeCustomer.status === 'ARRIVED') s = apply(s, 'SERVE_AUTO');
    s = apply(s, 'CUSTOMER_LEAVE');
    if (steps % 7 === 0) {
      s = decode(encode(s));
      assert.ok(s, 'Saved state must restore');
    }
  }
  return apply(s, 'CLOSE');
}

let s = fresh();
assert.ok(action(s, 'NAVIGATE').error);
assert.ok(action(s, 'SET_SHOP_NAME', '<a>').error === undefined, 'HTML escaped in UI; name stays data');
s = apply(s, 'SET_SHOP_NAME', 'Quán Hẻm Nhỏ');
for (const type of ['NAVIGATE', 'NAVIGATE', 'BUNDLE_DAY1', 'BUY', 'START_DAY']) s = apply(s, type);
s = serveDay(s);
assert.equal(s.currentDay, 1);
assert.equal(s.cash, 127000);
assert.equal(s.dayHistory.length, 1);
assert.equal(calculateLedger(s).grossOperatingProfit, 67000);
let day1Ending = s.cash;

for (let day = 2; day <= 21; day++) {
  s = apply(s, 'NEXT_DAY');
  assert.equal(s.currentDay, day);
  assert.equal(s.dayStartingCash, day1Ending);
  assert.equal(s.shopName, 'Quán Hẻm Nhỏ');
  assert.equal(s.marketPrices.kumquat, 3000);
  if (day === 2) s = apply(s, 'UPGRADE', 'bike_basket');
  if (day === 3) s = apply(s, 'UPGRADE', 'counter');
  if (day === 4) s = apply(s, 'UPGRADE', 'seating');
  if (day === 5) s = apply(s, 'UPGRADE', 'bike_basket');
  if (day === 7) s = apply(s, 'UPGRADE', 'seating');
  assert.ok(s.dayCustomers.length >= 6 && s.dayCustomers.length <= 20);
  assert.equal(new Set(s.dayCustomers.map(c => c.id)).size, s.dayCustomers.length);
  assert.ok(s.dayCustomers.every(c => c.personId && c.visualVariantId));
  s = apply(s, 'NAVIGATE');
  const basket = day <= 2
    ? { bread: 3, cha: 4, vegetable: 3, ice: 3, sugar_syrup: 3, kumquat: 2, soy_milk: 1 }
    : { bread: 4, cha: 4, vegetable: 4, ice: 4, sugar_syrup: 4, kumquat: 3, soy_milk: 2, egg: 3 };
  // Stay solvent even after upgrades; a shorter basket still produces a valid day.
  let planned = { ...basket };
  const cost = () => Object.entries(planned).reduce((n, [id, qty]) => n + s.marketPrices[id] * qty, 0);
  while (cost() > s.cash || totalBasketUnits(planned) > s.upgrades.vehicleCapacity) {
    const id = Object.keys(planned).filter(k => planned[k] > 0).sort((a, b) => planned[b] - planned[a])[0];
    if (!id) break;
    planned[id]--;
  }
  s = buy(s, planned);
  if (day === 4) s = apply(s, 'SET_OPENING_TIME', 'early_6am');
  if (day === 5) s = apply(s, 'SET_OPENING_TIME', 'late_10am');
  if (day === 6) s = apply(s, 'CONFIG_MENU', { recipeId: 'TRA_TAC', sellPrice: 18000 });
  s = apply(s, 'START_DAY');
  if (day === 4) {
    assert.equal(s.clock, -120);
    assert.equal(s.operatingExpenses, 3000);
    assert.equal(s.dayCustomers[0].arrivalMinute, -60);
  }
  if (day === 5) assert.ok(s.missedOrders.some(o => o.reason === 'MISSED_LATE_OPENING'));
  s = serveDay(s);
  const l = calculateLedger(s);
  assert.equal(l.finalCashInDrawer, s.cash, `Day ${day} cash reconciliation`);
  assert.equal(l.grossOperatingProfit, l.totalSalesRevenue - l.cogsSoldItemsOnly);
  assert.equal(l.resultAfterSpoilageAndExpenses, l.grossOperatingProfit - l.spoilageLoss - l.operatingExpenses);
  assert.equal(l.servedCount + l.missedCount, s.dayCustomers.length);
  assert.ok(Object.values(s.stock).every(q => q >= 0));
  assert.ok(s.cash >= 0);
  assert.ok(s.rating >= 1 && s.rating <= 5);
  assert.equal(s.dayHistory.length, day);
  assert.equal(new Set([...s.servedOrders, ...s.missedOrders].map(o => o.personId + ':' + o.ticketId)).size, s.dayCustomers.length);
  if (day === 2) assert.equal(s.upgrades.vehicleCapacity, 30);
  if (day === 3) assert.equal(s.upgrades.counterSlots, 4);
  if (day === 5) assert.equal(s.upgrades.vehicleCapacity, 45);
  day1Ending = s.cash;
}
assert.equal(s.dayHistory.length, 21);

// A deliberate inventory plan can grow reputation; extra seats alone do not
// guarantee it. This checks that the star-gated customer variety is reachable.
let plannedShop = fresh();
plannedShop = apply(plannedShop, 'SET_SHOP_NAME', 'Quán Có Kế Hoạch');
plannedShop = apply(plannedShop, 'NAVIGATE');
plannedShop = apply(plannedShop, 'NAVIGATE');
plannedShop = apply(plannedShop, 'BUNDLE_DAY1');
plannedShop = apply(plannedShop, 'BUY');
plannedShop = apply(plannedShop, 'START_DAY');
plannedShop = serveDay(plannedShop);
for (let day = 2; day <= 7; day++) {
  plannedShop = apply(plannedShop, 'NEXT_DAY');
  if (day === 2 || day === 5) plannedShop = apply(plannedShop, 'UPGRADE', 'bike_basket');
  if (day === 3) plannedShop = apply(plannedShop, 'UPGRADE', 'counter');
  if (day === 4) plannedShop = apply(plannedShop, 'UPGRADE', 'seating');
  plannedShop = apply(plannedShop, 'NAVIGATE');
  const planned = Object.fromEntries(Object.keys(ingredients).map(id => [id, 0]));
  for (const customer of plannedShop.dayCustomers) {
    if (!plannedShop.menu[customer.recipe]?.enabled) continue;
    const needs = recipes[customer.recipe].needs;
    if (totalBasketUnits(planned) + Object.values(needs).reduce((a, b) => a + b, 0) > plannedShop.upgrades.vehicleCapacity) break;
    for (const [id, qty] of Object.entries(needs)) planned[id] += qty;
  }
  plannedShop = buy(plannedShop, planned);
  plannedShop = apply(plannedShop, 'START_DAY');
  plannedShop = serveDay(plannedShop);
}
assert.ok(plannedShop.rating >= 4, `Planned inventory should reach 4 stars, got ${plannedShop.rating}`);
assert.ok(plannedShop.dayCustomers.some(c => c.visualVariantId));

// Spoilage is a separate end-of-day loss; it never inflates sold-item COGS.
let waste = fresh();
waste = apply(waste, 'SET_SHOP_NAME', 'Quán Test');
waste = apply(waste, 'NAVIGATE');
waste = apply(waste, 'NAVIGATE');
waste = apply(waste, 'BASKET', { id: 'bread', qty: 2 });
waste = apply(waste, 'BUY');
waste = apply(waste, 'START_DAY');
waste = apply(waste, 'CLOSE');
assert.equal(waste.spoilageLoss, 8000);
assert.equal(calculateLedger(waste).cogsSoldItemsOnly, 0);
assert.equal(calculateLedger(waste).finalCashInDrawer, waste.cash);
assert.equal(calculateLedger(waste).resultAfterSpoilageAndExpenses, -8000);
assert.equal(waste.stock.bread, 0);

// A bad first-day decision can recover without misreporting a side job as sales.
let recovery = fresh();
recovery = apply(recovery, 'SET_SHOP_NAME', 'Quán Cần Vốn');
recovery = apply(recovery, 'NAVIGATE');
recovery = apply(recovery, 'NAVIGATE');
recovery = apply(recovery, 'BUNDLE_DAY1');
recovery = apply(recovery, 'BUY');
recovery = apply(recovery, 'START_DAY');
recovery = apply(recovery, 'CLOSE');
recovery = apply(recovery, 'NEXT_DAY');
assert.equal(recovery.cash, 5000);
recovery = apply(recovery, 'SIDE_JOB');
assert.equal(recovery.cash, 20000);
assert.ok(action(recovery, 'SIDE_JOB').error);
recovery = apply(recovery, 'NAVIGATE');
recovery = buy(recovery, { bread: 1, cha: 1, vegetable: 1 });
recovery = apply(recovery, 'START_DAY');
recovery = serveDay(recovery);
const recoveryLedger = calculateLedger(recovery);
assert.equal(recoveryLedger.sideJobIncome, 15000);
assert.equal(recoveryLedger.finalCashInDrawer, recovery.cash);
assert.equal(recoveryLedger.totalSalesRevenue, recovery.revenue);

// Old dry-stock lots retain their acquisition cost after a market price rise.
let fifo = fresh();
fifo = apply(fifo, 'SET_SHOP_NAME', 'Quán FIFO');
fifo.currentDay = 5;
fifo.screen = 'SHOP';
fifo.marketPrices = { ...fifo.marketPrices, kumquat: 3000, sugar_syrup: 3000 };
fifo.stock = { ...fifo.stock, ice: 1, sugar_syrup: 2, kumquat: 1 };
fifo.stockBatches.ice = [{ quantityRemaining: 1, unitCost: 1000, dayAcquired: 5 }];
fifo.stockBatches.kumquat = [{ quantityRemaining: 1, unitCost: 3000, dayAcquired: 5 }];
fifo.stockBatches.sugar_syrup = [{ quantityRemaining: 1, unitCost: 2000, dayAcquired: 4 }, { quantityRemaining: 1, unitCost: 3000, dayAcquired: 5 }];
fifo.activeCustomer = { id: 'fifo_customer', personId: 'fifo_customer', name: 'Khách', recipe: 'TRA_TAC', priceSensitivity: 'LOW', status: 'ARRIVED' };
fifo = apply(fifo, 'SERVE_AUTO');
assert.equal(fifo.servedOrders[0].cogs, 6000);
assert.equal(fifo.stockBatches.sugar_syrup[0].quantityRemaining, 0);
assert.equal(fifo.stockBatches.sugar_syrup[1].quantityRemaining, 1);
console.log('7 playable days + 21-day deterministic stress: name, upgrades, prices, roster, clock, emotions, ledger, spoilage, save/reload PASS');
