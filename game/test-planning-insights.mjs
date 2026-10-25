import assert from 'node:assert/strict';
import { fresh, action, totalBasketCost } from './day1-core.mjs';
import { FRESH_INGREDIENTS } from './day-content.mjs';
import { menuPricePreview, marketFreshnessPreview, missedDemandSummary } from './shop-insights.mjs';

const state = fresh(20261025);
const before = structuredClone(state);
let bread = menuPricePreview(state).find(x => x.recipeId === 'BANH_MI_CHA');
assert.equal(bread.estimatedUnitCost, 11000);
assert.equal(bread.estimatedGrossProfit, 14000);
assert.equal(bread.marginRate, 14000 / 25000);
assert.equal(bread.risk, 'positive');
assert.equal(menuPricePreview(state).some(x => x.recipeId === 'BANH_MI_TRUNG'), false);
state.screen = 'MENU';
const configured = action(state, 'CONFIG_MENU', { recipeId: 'BANH_MI_CHA', sellPrice: 22000 }).state;
assert.equal(menuPricePreview(configured).find(x => x.recipeId === 'BANH_MI_CHA').estimatedGrossProfit, 11000);
configured.marketPrices.cha = 16000;
assert.equal(menuPricePreview(configured).find(x => x.recipeId === 'BANH_MI_CHA').risk, 'break_even');
configured.marketPrices.cha = 17000;
assert.equal(menuPricePreview(configured).find(x => x.recipeId === 'BANH_MI_CHA').estimatedGrossProfit, -1000);
assert.equal(menuPricePreview(configured).find(x => x.recipeId === 'BANH_MI_CHA').risk, 'loss');
configured.menu.BANH_MI_CHA.enabled = false;
assert.equal(menuPricePreview(configured).find(x => x.recipeId === 'BANH_MI_CHA').enabled, false);
configured.menu.BANH_MI_CHA.sellPrice = 0;
assert.equal(menuPricePreview(configured).find(x => x.recipeId === 'BANH_MI_CHA').marginRate, null);
assert.deepEqual(menuPricePreview({}), []);

const market = fresh(20261025);
market.stock.sugar_syrup = 100;
market.basket = { bread: 2, sugar_syrup: 3, egg: 1, unknown: 900 };
market.marketPrices.egg = 4000;
const snapshot = structuredClone(market);
const basket = marketFreshnessPreview(market);
assert.equal(basket.freshCost, 12000);
assert.equal(basket.carryoverCost, 6000);
assert.equal(basket.totalCost, 18000);
assert.equal(basket.totalCost, totalBasketCost({ bread: 2, sugar_syrup: 3, egg: 1 }, market.marketPrices));
for (const row of basket.items) assert.equal(row.storage === 'same_day', FRESH_INGREDIENTS.has(row.id));
assert.equal(basket.items.some(x => x.id === 'unknown'), false);
assert.deepEqual(market, snapshot, 'basket preview must never purchase, consume, or mutate stock');
market.basket.bread = 1;
assert.equal(marketFreshnessPreview(market).freshCost, 8000);
assert.deepEqual(marketFreshnessPreview({}), { items: [], freshCost: 0, carryoverCost: 0, totalCost: 0 });

const missed = { missedOrders: [
 { recipe: 'TRA_TAC', reason: 'OUT_OF_STOCK' },
 { recipe: 'TRA_TAC', reason: 'OUT_OF_STOCK' },
 { recipe: 'TRA_TAC', reason: 'PRICE_TOO_HIGH' },
 { recipe: 'BANH_MI_CHA', reason: 'WAIT_TOO_LONG' },
 { recipe: 'BANH_MI_CHA', reason: 'MISSED_EARLY_CLOSING' },
 { recipe: 'legacy', reason: 'FUTURE_REASON' },
 { recipe: '', reason: '' }, null,
] };
const missedBefore = structuredClone(missed);
const result = missedDemandSummary(missed);
assert.equal(result.totalMissed, 7);
assert.deepEqual(result.items[0], { recipeId: 'TRA_TAC', name: 'Trà tắc', count: 3,
 reasons: [{ reason: 'OUT_OF_STOCK', count: 2 }, { reason: 'PRICE_TOO_HIGH', count: 1 }] });
assert.equal(result.items.find(x => x.recipeId === 'legacy').name, 'Món chưa xác định');
assert.equal(result.items.reduce((sum, row) => sum + row.reasons.reduce((n, r) => n + r.count, 0), 0), result.totalMissed);
assert.deepEqual(missed, missedBefore);
assert.deepEqual(missedDemandSummary({}), { items: [], totalMissed: 0 });
assert.equal(missedDemandSummary({ missedOrders: [{ recipe: 'BANH_MI_CHA', reason: 'OUT_OF_STOCK' }] }).totalMissed, 1, 'shop summaries must remain independent');
assert.equal(Object.hasOwn(result, 'revenue'), false);
// Real engine actions: classifications match stock cleared by CLOSE, and summary
// reconciles real missed tickets rather than fabricated report totals.
let day = fresh(20261025);
for (const [type, payload] of [['SET_SHOP_NAME', 'Quán đối chiếu'], ['NAVIGATE'], ['NAVIGATE'], ['BUNDLE_DAY1']]) {
  const next = action(day, type, payload);
  assert.equal(next.error, undefined);
  day = next.state;
}
const purchasedPreview = marketFreshnessPreview(day);
assert.equal(purchasedPreview.totalCost, 55000);
for (const type of ['BUY', 'START_DAY', 'CLOSE']) {
  const next = action(day, type);
  assert.equal(next.error, undefined);
  day = next.state;
}
for (const row of purchasedPreview.items) {
  if (row.storage === 'same_day') assert.equal(day.stock[row.id], 0);
  else assert.equal(day.stock[row.id], row.quantity);
}
const closedSummary = missedDemandSummary(day);
assert.equal(closedSummary.totalMissed, day.missedOrders.length);
assert.equal(closedSummary.totalMissed, day.dayCustomers.length);
assert.equal(closedSummary.items.every(row => row.reasons.every(r => r.reason === 'MISSED_EARLY_CLOSING')), true);
assert.deepEqual(before, fresh(20261025), 'original save retained');
console.log('Planning insights: tier/price changes, negative and zero margins, locked recipes, fresh/overnight basket, missed demand grouping, no mutation PASS');
