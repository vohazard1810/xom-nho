import assert from 'node:assert/strict';
import { fresh, encode, SAVE_KEY } from './day1-core.mjs';
import { ensureEmpire, empireAction } from './empire-engine.mjs';
import { loadFixture } from './fixtures.mjs';
import { missedDemandSummary } from './shop-insights.mjs';
const data = new Map();
const app = { innerHTML: '', dataset: {}, addEventListener() {} };
globalThis.document = { querySelector(selector) { return selector === '#app' ? app : null; } };
globalThis.localStorage = { getItem(k) { return data.get(k) ?? null; }, setItem(k, v) { data.set(k, v); }, removeItem(k) { data.delete(k); } };
globalThis.window = { confirm: () => true };
let fixtureIndex = 0;
async function renderFixture(s) {
  window.__xomNho?.clearAllTimers();
  data.clear(); data.set(SAVE_KEY + ':0', encode(s));
  await import('./main.mjs?planning-case=' + (++fixtureIndex));
  window.__xomNho.clearAllTimers();
  return window.__xomNho;
}
const step = (s, type, payload) => {
 const next = empireAction(s, type, payload);
 assert.equal(next.error, undefined, type + ': ' + next.error);
 return next.state;
};
let state = ensureEmpire(fresh(20261025));
for (const [type, payload] of [['SET_SHOP_NAME', 'Quán thử kế hoạch'], ['NAVIGATE'], ['NAVIGATE']]) state = step(state, type, payload);
let hook = await renderFixture(state);
hook.send('BUNDLE_DAY1');
let dock = app.innerHTML.match(/<div class="market-freshness-dock">([\s\S]*?)<div class="checkout-summary">/)?.[1];
assert.ok(dock, 'Fresh/overnight breakdown must be on actual MARKET');
assert.match(dock, /49\.000đ/); assert.match(dock, /6\.000đ/);
assert.match(app.innerHTML, /storage-same_day/); assert.match(app.innerHTML, /storage-overnight/);
const cash = hook.getState().cash;
hook.send('BASKET', { id: 'bread', qty: 2 });
assert.equal(hook.getState().cash, cash, 'Basket preview must not purchase');
assert.match(app.innerHTML, /45\.000đ/);
hook.send('BUY');
assert.match(app.innerHTML, /14\.000đ/);
hook.send('CONFIG_MENU', { recipeId: 'BANH_MI_CHA', sellPrice: 22000 });
let card = app.innerHTML.match(/<div class="menu-card[\s\S]*?(?=<div class="menu-card |<div class="opening-time-section)/)?.[0];
assert.match(card, /11\.000đ/);
assert.match(card, /22\.000đ/);
const inflated = structuredClone(hook.getState());
inflated.marketPrices.cha = 17000;
inflated.empire.shops.home.state.marketPrices.cha = 17000;
hook = await renderFixture(inflated);
card = app.innerHTML.match(/<div class="menu-card[\s\S]*?(?=<div class="menu-card |<div class="opening-time-section)/)?.[0];
assert.match(card, /risk-loss/); assert.match(card, /-1\.000đ/);
inflated.marketPrices.cha = 16000;
inflated.empire.shops.home.state.marketPrices.cha = 16000;
hook = await renderFixture(inflated);
assert.match(app.innerHTML, /risk-break_even/);

// Natural engine CLOSE route, including the one-shop empire report.
hook.send('START_DAY'); hook.send('CLOSE');
assert.ok(hook.getState().empire.report);
assert.match(app.innerHTML, /missed-demand-breakdown/);
assert.match(app.innerHTML, /Đóng cửa sớm/);
assert.equal(missedDemandSummary(hook.getState().empire.shops.home.state).totalMissed, hook.getState().empire.report.shops[0].missed);

// Controlled zero-arrival fixture, closed by engine; no fake report fields.
let empty = ensureEmpire(fresh(20261025));
for (const [type, payload] of [['SET_SHOP_NAME', 'Quán không khách'], ['NAVIGATE'], ['NAVIGATE'], ['BUNDLE_DAY1'], ['BUY']]) empty = step(empty, type, payload);
empty.dayCustomers = []; empty.empire.shops.home.state.dayCustomers = [];
empty = step(empty, 'START_DAY'); empty = step(empty, 'CLOSE');
hook = await renderFixture(empty);
assert.match(app.innerHTML, /missed-empty-banner/);
assert.equal(missedDemandSummary(hook.getState().empire.shops.home.state).totalMissed, 0);

// Controlled two-shop fixture: different actual missed records must stay separate.
let chain = loadFixture('two_shops_mid_prep');
chain.empire.shops.school.state.dayCustomers = chain.empire.shops.school.state.dayCustomers.slice(0, 2);
for (const id of ['home', 'school']) { chain = step(chain, 'SWITCH_SHOP', id); chain = step(chain, 'CLOSE'); }
assert.ok(chain.empire.report);
hook = await renderFixture(chain);
const sections = [...app.innerHTML.matchAll(/<div class="missed-demand-breakdown">([\s\S]*?)<div class="missed-disclaimer-note">/g)].map(m => m[1]);
assert.equal(sections.length, 2);
const summaries = chain.empire.report.shops.map(shop => missedDemandSummary(chain.empire.shops[shop.id].state));
assert.notEqual(summaries[0].totalMissed, summaries[1].totalMissed);
for (const [i, summary] of summaries.entries()) assert.ok(sections[i].includes(`${summary.totalMissed} lượt khách lỡ`));
window.__xomNho.clearAllTimers();
console.log('Planning UI: basket totals and no spending, tier updates, loss/zero warnings, real CLOSE route, zero and separate multi-shop demand PASS');

