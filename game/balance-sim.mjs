// Reproducible economy probes, not an assertion that the game is enjoyable.
import { fresh, action, ingredients, recipes, totalBasketUnits, calculateLedger } from './day1-core.mjs';

function apply(s, type, payload) {
  const { state, error } = action(s, type, payload);
  if (error) throw new Error(`Day ${s.currentDay} ${type}: ${error}`);
  return state;
}
function chooseBasket(s, target) {
  const basket = Object.fromEntries(Object.keys(ingredients).map(k => [k, 0]));
  const plannedDemand = Object.fromEntries(Object.keys(ingredients).map(k => [k, 0]));
  let budget = s.cash;
  for (const cust of s.dayCustomers.slice(0, target)) {
    if (!s.menu[cust.recipe]?.enabled) continue;
    const needs = recipes[cust.recipe].needs;
    const required = Object.entries(needs).map(([id, qty]) => [id, Math.max(0, plannedDemand[id] + qty - (s.stock[id] || 0) - basket[id])]);
    const cost = required.reduce((n, [id, qty]) => n + s.marketPrices[id] * qty, 0);
    const units = required.reduce((n, [, qty]) => n + qty, 0);
    if (cost > budget || totalBasketUnits(basket) + units > s.upgrades.vehicleCapacity) continue;
    for (const [id, qty] of required) basket[id] += qty;
    for (const [id, qty] of Object.entries(needs)) plannedDemand[id] += qty;
    budget -= cost;
  }
  for (const [id, qty] of Object.entries(basket)) if (qty) s = apply(s, 'BASKET', { id, qty });
  return apply(s, 'BUY');
}
function serve(s, signChoice) {
  let ticks = 0;
  while (s.screen === 'SHOP') {
    if (++ticks > 3000) throw new Error(`Stall on day ${s.currentDay}`);
    if (s.isPaused) s = apply(s, 'DECIDE', { choice: s.activeDecision.id === 'ROADWORK_SIGN' ? signChoice : s.stock.cha >= 2 ? 'yes' : 'no' });
    if (s.activeCustomer?.status === 'ARRIVED') s = apply(s, 'SERVE_AUTO');
    if (s.activeCustomer && s.activeCustomer.status !== 'ARRIVED') s = apply(s, 'CUSTOMER_LEAVE');
    if (s.screen === 'SHOP') s = apply(s, 'TICK', 3);
  }
  return s;
}
export function simulate(strategy, endDay = 21) {
  let s = fresh();
  s = apply(s, 'SET_SHOP_NAME', 'Quán mô phỏng');
  const rows = [];
  for (let day = 1; day <= endDay; day++) {
    if (day > 1) s = apply(s, 'NEXT_DAY');
    if (day === 1) s = apply(s, 'NAVIGATE');
    if (day > 1) {
      if (strategy === 'expand') {
        for (const id of ['bike_basket', 'counter', 'seating', 'canopy']) {
          const cost = id === 'bike_basket' && s.upgrades[id] === 1 ? 45000 : { bike_basket: 30000, counter: 25000, seating: 20000, canopy: 35000 }[id];
          const level = s.upgrades[id];
          if (day >= (id === 'canopy' ? 5 : 2) && level < (id === 'bike_basket' || id === 'seating' ? 2 : 1) && s.cash > cost + 65000) s = apply(s, 'UPGRADE', id);
        }
        if (day >= 3 && s.upgrades.counter && !s.knownRecipeIds.includes('BANH_MI_TRUNG') && s.cash > 80000) s = apply(s, 'LEARN_RECIPE', 'BANH_MI_TRUNG');
        if (day >= 8 && s.cash > 40000) s = apply(s, 'HIRE_STAFF');
        if (day >= 15) s = apply(s, 'ENABLE_ONLINE');
      }
      s = apply(s, 'NAVIGATE');
    } else s = apply(s, 'NAVIGATE');
    if (day === 1) s = apply(s, 'BUNDLE_DAY1');
    s = day === 1 ? apply(s, 'BUY') : chooseBasket(s, strategy === 'conservative' ? 6 : s.dayCustomers.length);
    if ((strategy === 'high_price' || strategy === 'recover_price' && day <= 7) && day > 1) {
      for (const [id, cfg] of Object.entries(s.menu)) if (cfg.enabled) s = apply(s, 'CONFIG_MENU', { recipeId: id, sellPrice: recipes[id].priceTiers.at(-1) });
    }
    if (strategy === 'recover_price' && day === 8) {
      for (const [id, cfg] of Object.entries(s.menu)) if (cfg.enabled) s = apply(s, 'CONFIG_MENU', { recipeId: id, sellPrice: recipes[id].basePrice });
    }
    s = apply(s, 'START_DAY');
    s = serve(s, strategy === 'expand' ? 'yes' : 'no');
    const ledger = calculateLedger(s);
    if (ledger.finalCashInDrawer !== s.cash) throw new Error(`Cash mismatch day ${day}`);
    rows.push({ day, cash: s.cash, served: ledger.servedCount, missed: ledger.missedCount, rating: s.rating, profit: ledger.resultAfterSpoilageAndExpenses, spoilage: ledger.spoilageLoss, upgrade: ledger.upgradeOutlay, expenses: ledger.operatingExpenses, fees: ledger.onlineFees });
  }
  return rows;
}
if (process.argv[1]?.endsWith('balance-sim.mjs')) {
  for (const strategy of ['conservative', 'expand', 'high_price', 'recover_price']) {
    const rows = simulate(strategy);
    console.log(strategy, JSON.stringify({ days: rows.filter(r => [1, 3, 7, 14, 21].includes(r.day)), totals: { served: rows.reduce((n, r) => n + r.served, 0), missed: rows.reduce((n, r) => n + r.missed, 0), negativeDays: rows.filter(r => r.profit < 0).map(r => r.day), endCash: rows.at(-1).cash, endRating: rows.at(-1).rating } }));
  }
}
