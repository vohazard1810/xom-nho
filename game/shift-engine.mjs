import { action, recipes, recipeNeeds, hasEnoughStock } from './day1-core.mjs';

export const SHIFT_RULES = Object.freeze({ minutesPerSecond: 2, emptyMinutesPerSecond: 18, prepMs: 1400, handoffMs: 350, reactionMs: 900, stepMs: 100 });
const terminal = new Set(['SERVED', 'OUT_OF_STOCK', 'MENU_DISABLED', 'PRICE_REJECTED', 'WAIT_TOO_LONG']);
export function orderBlocker(s, c) {
  const menu = s.menu[c.recipe], recipe = recipes[c.recipe];
  if (!recipe || !menu?.enabled) return 'MENU_DISABLED';
  const referencePrice=s.dayEvent.rival?.offer===c.recipe?s.dayEvent.rival.suggestedPrice:recipe.basePrice;
  if (menu.sellPrice > referencePrice && (c.priceSensitivity === 'HIGH' || (s.currentDay > 1 && s.rating < 3 && c.priceSensitivity === 'MEDIUM'))) return 'PRICE_TOO_HIGH';
  return hasEnoughStock(s.stock, recipeNeeds(c.recipe, c.id === 'be_ti' && s.extraCha === true)) ? null : 'OUT_OF_STOCK';
}
export const cookingNeeds = s => s.activeCustomer ? recipeNeeds(s.activeCustomer.recipe, s.activeCustomer.id === 'be_ti' && s.extraCha === true) : {};
export const cookingComplete = s => Boolean(s.service?.phase === 'SELECT' && Object.entries(cookingNeeds(s)).every(([id, qty]) => s.service.selected[id] === qty));

// Assembly is reserved, not spent. The reducer consumes batches exactly once
// at handoff. Selecting, undoing, pausing and reloading cannot lose ingredients.
export function cookingAction(input, type, payload) {
  if (!['ADD_INGREDIENT', 'UNDO_INGREDIENTS', 'COOK', 'SERVE', 'TOGGLE_ASSIST'].includes(type)) return action(input, type, payload);
  const fail = error => ({state: input, error});
  if (input.screen !== 'SHOP' || input.isPaused || input.manualPaused) return fail('Tiếp tục ca trước khi làm món.');
  const s = structuredClone(input);
  if (type === 'TOGGLE_ASSIST') {
    if (!s.staffHiredToday) return fail('Thuê phụ việc từ ngày 8 để bật tự phục vụ.');
    s.assistEnabled = !s.assistEnabled;
  } else {
    const p = s.service;
    if (!p || p.version !== 2 || p.customerId !== s.activeCustomer?.id || s.activeCustomer.status !== 'ARRIVED') return fail('Chưa có đơn cần làm tại quầy.');
    if (type === 'SERVE') {
      if (p.phase !== 'READY') return fail('Làm xong món trước khi giao khách.');
      p.phase = 'HANDOFF'; p.elapsedMs = 0;
    } else {
      if (p.phase !== 'SELECT') return fail('Món đã bắt đầu làm; hãy chờ để giao khách.');
      const needs = cookingNeeds(s);
      if (type === 'ADD_INGREDIENT') {
        const id = payload;
        if (!Object.hasOwn(needs, id)) return fail('Nguyên liệu này không có trong món khách gọi.');
        if ((p.selected[id] || 0) >= needs[id]) return fail('Đã đủ nguyên liệu này rồi.');
        if ((s.stock[id] || 0) <= (p.selected[id] || 0)) return fail('Nguyên liệu này đã hết.');
        p.selected[id] = (p.selected[id] || 0) + 1;
      } else if (type === 'UNDO_INGREDIENTS') p.selected = {};
      else {
        if (!cookingComplete(s)) return fail('Chọn đủ nguyên liệu theo đơn trước khi làm món.');
        p.phase = 'PREP'; p.elapsedMs = 0; s.cookingTutorialDone = true;
      }
    }
  }
  s.revision = input.revision + 1;
  return {state: s};
}

export function advanceShift(input, elapsedMs, options = {}) {
  if (input.screen !== 'SHOP' || input.isPaused || input.manualPaused) return input;
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0 || elapsedMs > 60000) throw new Error('Invalid shift duration');
  let s = structuredClone(input); s.managedShift = true;
  let left = elapsedMs * (s.speed || 1);
  while (left > 0 && s.screen === 'SHOP' && !s.isPaused && !s.manualPaused) {
    const ms = Math.min(left, SHIFT_RULES.stepMs); left -= ms;
    // First order is a safe hands-on tutorial. Quiet gaps move faster;
    // customer queues always use the slower, shared gameplay clock.
    const tutorial = s.currentDay === 1 && !s.cookingTutorialDone && s.activeCustomer?.status === 'ARRIVED';
    if (!tutorial) s = action(s, 'TICK', ms / 1000 * (options.minuteRate ?? (s.activeCustomer || s.waitingQueue.length ? SHIFT_RULES.minutesPerSecond : SHIFT_RULES.emptyMinutesPerSecond))).state;
    if (s.screen !== 'SHOP' || s.isPaused) break;
    const boost = s.focusBoost;
    if (boost?.active) { boost.remainingSeconds = Math.max(0, boost.remainingSeconds-ms/1000); if (boost.remainingSeconds <= .000001) {boost.active=false;boost.remainingSeconds=0;} }
    else if (boost?.cooldownSeconds > 0) boost.cooldownSeconds=Math.max(0,boost.cooldownSeconds-ms/1000);
    const c = s.activeCustomer;
    if (!c) {s.service=null;continue;}
    // Upgrade existing saves without replaying completed transactions.
    if (!s.service || s.service.customerId !== c.id || s.service.version !== 2) {
      c.startedAt ??= s.clock;
      s.service = {version:2,customerId:c.id,recipeId:c.recipe,isExtra:c.id==='be_ti'&&s.extraCha===true,selected:{},phase:terminal.has(c.status)?'REACTION':'SELECT',elapsedMs:0,prepMs:c.recipe==='BANH_MI_TRUNG'?2200:c.recipe==='BANH_MI_CHA'?SHIFT_RULES.prepMs:1100};
      if (!terminal.has(c.status) && orderBlocker(s,c)) {s.service.phase='HANDOFF';s=action(s,'SERVE_AUTO').state;s.service.phase='REACTION';}
    }
    const p=s.service;
    const assist=s.staffHiredToday && s.assistEnabled;
    if (p.phase==='SELECT' && assist) {
      p.elapsedMs+=ms;
      if(p.elapsedMs>=400) {p.selected=cookingNeeds(s);p.phase='PREP';p.elapsedMs=0;}
    } else if(p.phase==='PREP') {
      const rain=['rain','morning_drizzle'].includes(s.dayEvent.event)&&!s.upgrades.canopy? .9:1;
      p.elapsedMs+=ms*(boost?.active?2:1)*(s.employeeSpeed ?? (s.staffHiredToday?1.35:1))*(c.isOnline?(s.packingSpeed||1):1)*rain;
      if(p.elapsedMs>=p.prepMs) {p.phase='READY';p.elapsedMs=0;}
    } else if(p.phase==='READY' && assist) {p.phase='HANDOFF';p.elapsedMs=0;}
    else if(p.phase==='HANDOFF') {
      p.elapsedMs+=ms;
      if(p.elapsedMs>=SHIFT_RULES.handoffMs) {
        const r=action(s,'SERVE_AUTO');if(r.error) throw new Error(r.error);
        s=r.state;s.service.phase='REACTION';s.service.elapsedMs=0;
      }
    } else if(p.phase==='REACTION') {
      p.elapsedMs+=ms;if(p.elapsedMs>=SHIFT_RULES.reactionMs) s=action(s,'CUSTOMER_LEAVE').state;
    }
    // A neglected manual order must not hold the day open forever.
    if(s.clock>=360 && s.screen==='SHOP') s=action(s,'CLOSE').state;
  }
  return s;
}
export function serviceVisual(s) {
  const p=s.service;if(!p||p.customerId!==s.activeCustomer?.id)return null;
  const rejected=s.activeCustomer.status!=='SERVED'&&terminal.has(s.activeCustomer.status);
  return {item:p.recipeId,isExtra:p.isExtra,stage:rejected?({MENU_DISABLED:'menudisabled',PRICE_REJECTED:'pricerejected'}[s.activeCustomer.status]||'outofstock'):p.phase==='HANDOFF'?'deliver_to_tray':p.phase==='REACTION'?'customer_react':p.phase==='READY'?'ready':p.phase==='PREP'?'layer2':'select',progress:p.phase==='PREP'?Math.min(100,p.elapsedMs/p.prepMs*100):p.phase==='SELECT'?0:100,customerPose:p.phase==='HANDOFF'?'RECEIVE':p.phase==='REACTION'&&!rejected?'REACT':'ORDER'};
}
