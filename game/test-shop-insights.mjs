import assert from 'node:assert/strict';
import { fresh } from './day1-core.mjs';
import { menuReadiness, recipeSalesSummary } from './shop-insights.mjs';

const state = fresh(20261024);
state.stock = { bread: 3, cha: 2, vegetable: 5, ice: 2, sugar_syrup: 2, kumquat: 4, soy_milk: 3 };
state.basket = { cha: 1, ice: 2, sugar_syrup: 2 };
const before = structuredClone(state);
let rows = menuReadiness(state);
assert.equal(rows.find(x => x.recipeId === 'BANH_MI_CHA').servings, 2);
assert.equal(rows.find(x => x.recipeId === 'TRA_TAC').servings, 2);
assert.equal(rows.find(x => x.recipeId === 'SUA_DAU_DA').servings, 2);
assert.equal(rows.some(x => x.recipeId === 'BANH_MI_TRUNG'), false, 'locked recipe must stay hidden');
assert.equal(menuReadiness(state, { includeBasket: true }).find(x => x.recipeId === 'BANH_MI_CHA').servings, 3);
assert.deepEqual(state, before, 'preview must never spend stock or basket');
state.stock.cha = 0;
const bread = menuReadiness(state).find(x => x.recipeId === 'BANH_MI_CHA');
assert.equal(bread.servings, 0);
assert.deepEqual(bread.shortages.map(x => [x.id, x.missing]), [['cha', 1]]);
state.menu.BANH_MI_CHA.enabled = false;
assert.equal(menuReadiness(state).some(x => x.recipeId === 'BANH_MI_CHA'), false);
assert.deepEqual(menuReadiness({}), []);

state.servedOrders = [
  { recipe: 'TRA_TAC', sellPrice: 15000, cogs: 4000, tip: 1000, onlineFee: 2000 },
  { recipe: 'TRA_TAC', sellPrice: 12000, cogs: 6000, tip: 0, onlineFee: 0 },
  { recipe: 'BANH_MI_CHA', sellPrice: 25000, cogs: 11000, tip: 500, onlineFee: 0 },
];
const summary = recipeSalesSummary(state);
assert.equal(summary.bestSeller, 'TRA_TAC');
assert.deepEqual(summary.totals, { orders: 3, revenue: 52000, cogs: 21000, tips: 1500, onlineFees: 2000, grossProfit: 31000, contribution: 30500 });
const preserved = structuredClone(state);
state.marketPrices = { kumquat: 999999 };
state.operatingExpenses = 500000;
assert.deepEqual(recipeSalesSummary(state), summary, 'historical costs and contribution are independent of market/overheads');
assert.deepEqual(state.servedOrders, preserved.servedOrders);
assert.equal(recipeSalesSummary({}).bestSeller, null);
assert.equal(recipeSalesSummary({ servedOrders: [{ recipe: 'legacy', sellPrice: 10, cogs: 20 }] }).totals.grossProfit, -10);
assert.equal(recipeSalesSummary({ servedOrders: [{ recipe: 'legacy', sellPrice: 10, cogs: 20 }] }).items[0].name, 'Món chưa xác định');
console.log('Shop insights: independent shared-stock capacity, basket preview, recipe locks, FIFO sales totals, no mutation PASS');
