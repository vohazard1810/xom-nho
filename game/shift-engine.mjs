import { action, recipes, recipeNeeds, hasEnoughStock } from './day1-core.mjs';

export const SHIFT_RULES = Object.freeze({ minutesPerSecond: 6, prepMs: 4200, handoffMs: 350, reactionMs: 650, stepMs: 100 });
const terminal = new Set(['SERVED', 'OUT_OF_STOCK', 'MENU_DISABLED', 'PRICE_REJECTED', 'WAIT_TOO_LONG']);

export function orderBlocker(s, c) {
  const menu = s.menu[c.recipe];
  const recipe = recipes[c.recipe];
  if (!recipe || !menu?.enabled) return 'MENU_DISABLED';
  if (menu.sellPrice > recipe.basePrice && (c.priceSensitivity === 'HIGH' || (s.currentDay > 1 && s.rating < 3 && c.priceSensitivity === 'MEDIUM'))) return 'PRICE_TOO_HIGH';
  return hasEnoughStock(s.stock, recipeNeeds(c.recipe, c.id === 'be_ti' && s.extraCha === true)) ? null : 'OUT_OF_STOCK';
}

// The same persisted simulation runs in the game and in tests. No preparation
// timers or callbacks can survive Replay, a reload, or a change of customer.
export function advanceShift(input, elapsedMs) {
  if (input.screen !== 'SHOP' || input.isPaused || input.manualPaused) return input;
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0 || elapsedMs > 60000) throw new Error('Invalid shift duration');
  let s = structuredClone(input);
  s.managedShift = true;
  let left = elapsedMs * (s.speed || 1);
  while (left > 0 && s.screen === 'SHOP' && !s.isPaused && !s.manualPaused) {
    const ms = Math.min(left, SHIFT_RULES.stepMs);
    left -= ms;
    const boostMultiplier = s.focusBoost?.active ? 2 : 1;
    const tick = action(s, 'TICK', ms / 1000 * SHIFT_RULES.minutesPerSecond);
    if (tick.error) throw new Error(tick.error);
    s = tick.state;
    if (s.screen !== 'SHOP' || s.isPaused) break;
    const boost = s.focusBoost;
    if (boost?.active) {
      boost.remainingSeconds = Math.max(0, boost.remainingSeconds - ms / 1000);
      if (boost.remainingSeconds < .000001) { boost.active = false; boost.remainingSeconds = 0; }
    } else if (boost?.cooldownSeconds > 0) boost.cooldownSeconds = Math.max(0, boost.cooldownSeconds - ms / 1000);

    const c = s.activeCustomer;
    if (!c) { s.service = null; continue; }
    if (!s.service || s.service.customerId !== c.id) {
      c.startedAt ??= s.clock;
      s.service = { customerId: c.id, recipeId: c.recipe, isExtra: c.id === 'be_ti' && s.extraCha === true, phase: 'PREP', elapsedMs: 0, prepMs: SHIFT_RULES.prepMs };
      if (terminal.has(c.status)) s.service.phase = 'REACTION';
      else if (orderBlocker(s, c)) {
        s = action(s, 'SERVE_AUTO').state;
        s.service.phase = 'REACTION';
      }
    }
    const service = s.service;
    if (service.phase === 'PREP') {
      const rainFactor = ['rain', 'morning_drizzle'].includes(s.dayEvent.event) && !s.upgrades.canopy ? .9 : 1;
      service.elapsedMs += ms * boostMultiplier * (s.staffHiredToday ? 1.35 : 1) * rainFactor;
      if (service.elapsedMs >= service.prepMs) { service.phase = 'HANDOFF'; service.elapsedMs = 0; }
    } else if (service.phase === 'HANDOFF') {
      service.elapsedMs += ms;
      if (service.elapsedMs >= SHIFT_RULES.handoffMs) {
        const served = action(s, 'SERVE_AUTO');
        if (served.error) throw new Error(served.error);
        s = served.state;
        s.service.phase = 'REACTION';
        s.service.elapsedMs = 0;
      }
    } else {
      service.elapsedMs += ms;
      if (service.elapsedMs >= SHIFT_RULES.reactionMs) s = action(s, 'CUSTOMER_LEAVE').state;
    }
  }
  return s;
}

export function serviceVisual(s) {
  const p = s.service;
  if (!p || p.customerId !== s.activeCustomer?.id) return null;
  const rejected = s.activeCustomer.status !== 'SERVED' && terminal.has(s.activeCustomer.status);
  const fraction = p.elapsedMs / p.prepMs;
  return {
    item: p.recipeId, isExtra: p.isExtra,
    stage: rejected ? ({ MENU_DISABLED: 'menudisabled', PRICE_REJECTED: 'pricerejected' }[s.activeCustomer.status] || 'outofstock') : p.phase === 'HANDOFF' ? 'deliver_to_tray' : p.phase === 'REACTION' ? 'customer_react' : fraction < .45 ? 'layer1' : 'layer2',
    progress: p.phase === 'PREP' ? Math.min(95, Math.round(fraction * 95)) : 100,
    customerPose: rejected ? 'ORDER' : p.phase === 'HANDOFF' ? 'RECEIVE' : p.phase === 'REACTION' ? 'REACT' : 'ORDER'
  };
}
