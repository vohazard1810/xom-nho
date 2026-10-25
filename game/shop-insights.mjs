import { ingredients, recipes, recipeNeeds } from './day1-core.mjs';
import { FRESH_INGREDIENTS } from './day-content.mjs';

const quantity = value => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
const money = value => Number.isFinite(value) ? Math.max(0, value) : 0;

// Planning estimates use today's market price, not FIFO costs or realized profit.
export function menuPricePreview(state) {
  const known = new Set(state.knownRecipeIds || []);
  return Object.keys(recipes).filter(id => known.has(id)).map(recipeId => {
    const sellPrice = money(state.menu?.[recipeId]?.sellPrice ?? recipes[recipeId].basePrice);
    const estimatedUnitCost = Object.entries(recipeNeeds(recipeId)).reduce((sum, [id, needed]) =>
      sum + needed * money(state.marketPrices?.[id] ?? ingredients[id].price), 0);
    const estimatedGrossProfit = sellPrice - estimatedUnitCost;
    return { recipeId, name: recipes[recipeId].name, enabled: Boolean(state.menu?.[recipeId]?.enabled),
      sellPrice, estimatedUnitCost, estimatedGrossProfit,
      marginRate: sellPrice > 0 ? estimatedGrossProfit / sellPrice : null,
      risk: estimatedGrossProfit < 0 ? 'loss' : estimatedGrossProfit === 0 ? 'break_even' : 'positive' };
  });
}

// Only the unpurchased basket: no stock, cash movement or promised spoilage value.
export function marketFreshnessPreview(state) {
  const items = Object.entries(ingredients).map(([id, item]) => {
    const amount = quantity(state.basket?.[id]);
    const unitPrice = money(state.marketPrices?.[id] ?? item.price);
    return { id, name: item.name, unit: item.unit, quantity: amount, unitPrice, cost: amount * unitPrice,
      storage: FRESH_INGREDIENTS.has(id) ? 'same_day' : 'overnight' };
  }).filter(row => row.quantity > 0);
  const freshCost = items.filter(row => row.storage === 'same_day').reduce((sum, row) => sum + row.cost, 0);
  const carryoverCost = items.filter(row => row.storage === 'overnight').reduce((sum, row) => sum + row.cost, 0);
  return { items, freshCost, carryoverCost, totalCost: freshCost + carryoverCost };
}

// Counts actual missed tickets. Do not turn these into speculative sales revenue.
export function missedDemandSummary(state) {
  const grouped = new Map();
  for (const order of state.missedOrders || []) {
    if (!order || typeof order !== 'object') continue;
    const recipeId = typeof order.recipe === 'string' && order.recipe ? order.recipe : 'UNKNOWN';
    const reason = typeof order.reason === 'string' && order.reason ? order.reason : 'UNKNOWN';
    if (!grouped.has(recipeId)) grouped.set(recipeId, { recipeId, name: recipes[recipeId]?.name || 'Món chưa xác định', count: 0, reasons: new Map() });
    const row = grouped.get(recipeId);
    row.count += 1;
    row.reasons.set(reason, (row.reasons.get(reason) || 0) + 1);
  }
  const compareId = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  const items = [...grouped.values()].map(row => ({ ...row,
    reasons: [...row.reasons].map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count || compareId(a.reason, b.reason))
  })).sort((a, b) => b.count - a.count || compareId(a.recipeId, b.recipeId));
  return { items, totalMissed: items.reduce((sum, row) => sum + row.count, 0) };
}

// Capacities are independent: shared stock is NOT promised to every recipe at once.
// This is a standard serving estimate, not a purchase or an extra-cha order.
export function menuReadiness(state, { includeBasket = false } = {}) {
  const known = new Set(state.knownRecipeIds || []);
  return Object.keys(recipes).filter(id => known.has(id) && state.menu?.[id]?.enabled).map(recipeId => {
    const needs = recipeNeeds(recipeId);
    const rows = Object.entries(needs).map(([id, needed]) => {
      const available = quantity(state.stock?.[id]) + (includeBasket ? quantity(state.basket?.[id]) : 0);
      return { id, name: ingredients[id].name, needed, available, missing: Math.max(0, needed - available) };
    });
    return {
      recipeId, name: recipes[recipeId].name,
      servings: rows.length ? Math.min(...rows.map(row => Math.floor(row.available / row.needed))) : 0,
      shortages: rows.filter(row => row.missing > 0),
      estimatedUnitCost: rows.reduce((sum, row) => sum + row.needed * money(state.marketPrices?.[row.id] ?? ingredients[row.id].price), 0),
    };
  });
}

const blankTotals = () => ({ orders: 0, revenue: 0, cogs: 0, tips: 0, onlineFees: 0, grossProfit: 0, contribution: 0 });

// Actual fulfilled orders and FIFO transaction costs, never tomorrow's market prices.
// Contribution excludes wages, waste, upgrades and all other shop overheads.
export function recipeSalesSummary(state) {
  const grouped = new Map();
  for (const order of state.servedOrders || []) {
    const recipeId = typeof order.recipe === 'string' && order.recipe ? order.recipe : 'UNKNOWN';
    if (!grouped.has(recipeId)) grouped.set(recipeId, {
      recipeId, name: recipes[recipeId]?.name || 'Món chưa xác định', ...blankTotals(),
    });
    const row = grouped.get(recipeId);
    row.orders += 1;
    row.revenue += money(order.sellPrice);
    row.cogs += money(order.cogs);
    row.tips += money(order.tip);
    row.onlineFees += money(order.onlineFee);
  }
  const items = [...grouped.values()];
  for (const row of items) {
    row.grossProfit = row.revenue - row.cogs;
    row.contribution = row.grossProfit + row.tips - row.onlineFees;
  }
  items.sort((a, b) => b.orders - a.orders || b.revenue - a.revenue || (a.recipeId < b.recipeId ? -1 : a.recipeId > b.recipeId ? 1 : 0));
  const totals = blankTotals();
  for (const row of items) for (const key of Object.keys(totals)) totals[key] += row[key];
  return { items, totals, bestSeller: items[0]?.recipeId ?? null };
}
