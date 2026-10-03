import { serviceVisual, cookingNeeds, cookingComplete } from './shift-engine.mjs';
import { ensureEmpire, empireAction, advanceEmpire, LOCATIONS, STAFF_ROLES, openingEligibility } from './empire-engine.mjs';
import {
  ingredients,
  recipes,
  SAVE_KEY,
  UPGRADE_CATALOG,
  fresh,
  totalBasketUnits,
  totalBasketCost,
  recipeNeeds,
  hasEnoughStock,
  calculateLedger,
  encode,
  decode
} from './day1-core.mjs';

const $ = document.querySelector('#app');

// Sprite asset base paths
const ASSET_BASE = '../assets/characters/named/be_ti/candidates/alternate_model_v1/';
const BETI_SPRITES = {
  order: [
    ASSET_BASE + 'order_four_frame_pilot/actor_crop/order_01_mid_raise.png',
    ASSET_BASE + 'order_four_frame_pilot/actor_crop/order_02_raise_approved.png',
    ASSET_BASE + 'order_four_frame_pilot/actor_crop/order_03_speaking.png',
    ASSET_BASE + 'order_four_frame_pilot/actor_crop/order_04_expectant.png'
  ]
};

const CO_CHIN_IMG = '../assets/characters/named/co_chin/co_chin_standing.png';
const ANH_TUNG_IMG = '../assets/characters/named/anh_tung/anh_tung_standing.png';

const WALKIN_SPRITES = {
  walkin_variant_0: '../assets/pilot/walkin_student.png',
  walkin_variant_1: '../assets/pilot/walkin_office.png',
  walkin_variant_2: '../assets/pilot/walkin_driver.png',
  walkin_variant_3: '../assets/pilot/walkin_elder.png',
  walkin_student: '../assets/pilot/walkin_student.png',
  walkin_office: '../assets/pilot/walkin_office.png',
  walkin_driver: '../assets/pilot/walkin_driver.png',
  walkin_elder: '../assets/pilot/walkin_elder.png'
};

const CANOPY_AWNING_IMG = '../assets/pilot/awning_canopy.png';
const COUNTER_SHELF_FOREGROUND_IMG = '../assets/environment/counter_shelf_foreground.png';

const DISH_IMAGES = {
  BANH_MI_CHA: '../assets/dishes/takeaway_banh_mi.png',
  TRA_TAC: '../assets/dishes/takeaway_tra_tac.png',
  SUA_DAU_DA: '../assets/dishes/takeaway_sua_dau.png',
  BANH_MI_TRUNG: '../assets/dishes/takeaway_banh_mi.png'
};

const ingredientMeta = {
  bread: { name: 'Bánh mì', icon: '🥖', unit: 'ổ', img: '../assets/ingredients/bread.png' },
  cha: { name: 'Chả lụa', icon: '🍖', unit: 'khoanh', img: '../assets/ingredients/cha.png' },
  vegetable: { name: 'Dưa ngò', icon: '🥒', unit: 'phần', img: '../assets/ingredients/vegetable.png' },
  ice: { name: 'Đá bi', icon: '🧊', unit: 'ca', img: '../assets/ingredients/ice.png' },
  sugar_syrup: { name: 'Nước đường', icon: '🍯', unit: 'muỗng', img: '../assets/ingredients/sugar_syrup.png' },
  kumquat: { name: 'Tắc tươi', icon: '🍊', unit: 'trái', img: '../assets/ingredients/kumquat.png' },
  soy_milk: { name: 'Sữa đậu', icon: '🥛', unit: 'bịch', img: '../assets/ingredients/soy_milk.png' },
  egg: { name: 'Trứng gà', icon: '🥚', unit: 'quả', img: null }
};

// One shared context avoids exhausting browser audio resources.
let audioCtx;
const getAudioContext = () => audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
// Audio synthesis
function playChime() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (e) {}
}

function playCoins() {
  try {
    const ctx = getAudioContext();
    [0, 0.06, 0.12].forEach((delay, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1174 + idx * 300, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.18);
    });
  } catch (e) {}
}

function playTap(type = 'default') {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {}
}

// Storage helpers
const load = () => { try { return [0, 1].map(i => decode(localStorage.getItem(SAVE_KEY + ':' + i))).filter(Boolean).sort((a, b) => b.revision - a.revision)[0] || null; } catch { return null; } };
let saved = load();
let state = ensureEmpire(saved || fresh());
let message = '';

// Simulation and Animation State
let simInterval = null;
let betiFrameIdx = 0;
let autoPrepState = null; // { stage: 'bread'|'cha'|'veg'|'done', progress: number, item: recipeId, isExtra: boolean }
let floatingCash = null; // e.g. "+25.000đ"
let customerReaction = null; // { quote: string, status: 'happy'|'disappointed' }
let resultTimer = null;
let resultDetailsOpen = Boolean(state.resultDetailsOpen);
let playOptionsOpen = false;
const vnCalendarDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const money = n => new Intl.NumberFormat('vi-VN').format(n) + 'đ';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const shopTitle = () => escapeHtml(state.shopName || 'Xóm Nhỏ');

function persist() {
  try { localStorage.setItem(SAVE_KEY + ':' + (state.revision % 2), encode(state)); } catch { message = 'Trình duyệt không cho lưu trên máy. Giữ trang này mở để tiếp tục ca.'; }
  saved = state;
}

function getCustomerEmotion(cust) {
  if (!cust) return { stage: 'CALM', icon: '😊', label: 'Bình tĩnh', color: '#16a34a', pct: 100 };
  const pat = cust.patience !== undefined ? cust.patience : (cust.maxPatience || 100);
  const max = cust.maxPatience || 100;
  const pct = Math.max(0, Math.min(100, Math.round((pat / max) * 100)));
  if (pct > 50) {
    return { stage: 'CALM', icon: '😊', label: 'Bình tĩnh', color: '#16a34a', pct };
  } else if (pct > 20) {
    return { stage: 'IMPATIENT', icon: '⏳', label: 'Sốt ruột', color: '#ea580c', pct };
  } else {
    return { stage: 'WARNING', icon: '⚠️', label: 'Sắp bỏ về', color: '#dc2626', pct };
  }
}

function getCustomerSprite(c, pose = 'ORDER') {
  if (!c) return '';
  if (c.id === 'be_ti') {
    if (pose === 'RECEIVE') return ASSET_BASE + 'order_four_frame_pilot/actor_crop/order_02_raise_approved.png';
    if (pose === 'REACT') return ASSET_BASE + 'order_four_frame_pilot/actor_crop/order_04_expectant.png';
    return BETI_SPRITES.order[betiFrameIdx % 4];
  }
  if (c.id === 'co_chin') return CO_CHIN_IMG;
  if (c.id === 'anh_tung') return ANH_TUNG_IMG;
  return WALKIN_SPRITES[c.visualVariantId] || WALKIN_SPRITES[c.archetype] || WALKIN_SPRITES.walkin_variant_0;
}

function clearAllTimers() {
  if (simInterval) clearInterval(simInterval);
  if (resultTimer) clearInterval(resultTimer);
  simInterval = resultTimer = null;
}

function updateServiceView() {
  autoPrepState = serviceVisual(state);
  const c = state.activeCustomer;
  customerReaction = null;
  floatingCash = null;
  if (state.service?.phase !== 'REACTION' || !c) return;
  if (c.status === 'SERVED') {
    const order = state.servedOrders.at(-1);
    floatingCash = '+' + money((order?.sellPrice || 0) + (order?.tip || 0) - (order?.onlineFee || 0));
    customerReaction = { status: 'happy', quote: c.id === 'be_ti' && state.extraCha ? 'Nhiều chả quá, con thích lắm! Mai con ghé tiếp!' : c.temperament === 'RUSH' ? 'Kịp giờ rồi! Cảm ơn quán, mình đi đây!' : order?.tip ? 'Ngon quá, gửi quán thêm chút tiền cà phê nha!' : 'Cảm ơn quán, món vừa miệng lắm!' };
  } else customerReaction = { status: 'disappointed', quote: c.status === 'MENU_DISABLED' ? 'Hôm nay quán không bán món này hả? Để mình ghé bữa khác.' : c.status === 'PRICE_REJECTED' ? 'Giá này hơi quá túi tiền của mình rồi.' : 'Hết món rồi hả? Mai mình ghé sớm hơn vậy.' };
}

function scheduleNextDay() {
  if (resultTimer || state.screen !== 'DAY_RESULT') return;
  state.resultRemainingMs ??= 12000;
  resultTimer = setInterval(() => {
    if (state.screen !== 'DAY_RESULT') { clearInterval(resultTimer); resultTimer = null; return; }
    if (resultDetailsOpen || document.hidden) return;
    state.resultRemainingMs = Math.max(0, state.resultRemainingMs - 250);
    state.revision += 1;
    persist();
    const label = document.querySelector('#next-day-countdown');
    if (label) label.textContent = Math.ceil(state.resultRemainingMs / 1000);
    if (!state.resultRemainingMs) send('NEXT_DAY');
  }, 250);
}

function send(type, payload) {
  if (type === 'REPLAY') {
    clearAllTimers();
    try { localStorage.removeItem(SAVE_KEY + ':0'); localStorage.removeItem(SAVE_KEY + ':1'); } catch {}
    state = ensureEmpire(fresh());
    resultDetailsOpen = false;
  } else {
    const r = empireAction(state, type, payload);
    if (r.error) { message = r.error; render(); return; }
    state = r.state;
  }
  message = '';
  if (type === 'NEXT_DAY') resultDetailsOpen = false;
  updateServiceView();
  persist();
  if (state.screen === 'SHOP') startSimulationLoop();
  else { clearAllTimers(); if (state.screen === 'DAY_RESULT') scheduleNextDay(); }
  render();
}

function startSimulationLoop() {
  if (simInterval) return;
  updateServiceView();
  simInterval = setInterval(() => {
    if (document.hidden || state.screen !== 'SHOP' || state.isPaused || state.manualPaused || state.empire?.mapOpen || state.empire?.staffOpen) return;
    const before = state.activeCustomer?.id + ':' + state.service?.phase;
    const revenue = state.revenue;
    state = advanceEmpire(state, 200);
    updateServiceView();
    if (state.revenue > revenue) playCoins();
    else if (before !== state.activeCustomer?.id + ':' + state.service?.phase && state.service?.phase === 'HANDOFF') playChime();
    persist();
    render();
    if (state.screen !== 'SHOP') { clearAllTimers(); scheduleNextDay(); }
  }, 200);
}

// ─────────────────────────────────────────────────────────────
// RENDERERS
// ─────────────────────────────────────────────────────────────

function renderHome() {
  return `
    <div class="screen-home">
      <div class="cover-hero">
        <span class="cover-tag">🏮 PHIÊN BẢN CHƠI THỬ · CHẠM ĐỂ LÀM MÓN</span>
        <h1 class="cover-brand">${shopTitle()}</h1>
        <p class="cover-sub">Chuyện Làm Ăn Buôn Bán Quán Phố</p>
      </div>
      <div class="cover-card">
        <p class="cover-desc">
          Quản lý quán ăn nhỏ trong con hẻm Sài Gòn.<br>
          Chọn nguyên liệu, làm món và giao khách.<br>Nâng cấp quán, học món mới và thuê phụ việc.
        </p>
        ${!state.shopName ? `
          <label for="shop-name-input">Tên quán của bạn</label>
          <input id="shop-name-input" class="shop-name-input" maxlength="24" placeholder="Ví dụ: Quán Đầu Hẻm" autocomplete="off">
          <button class="btn-primary" data-type="SET_SHOP_NAME">🌿 Đặt Tên & Bắt Đầu</button>
        ` : `<button class="btn-primary" data-type="NAVIGATE">🌿 Bắt Đầu Ngày ${state.currentDay}</button>`}
        ${saved && state.screen === 'HOME' && saved.currentDay > 1 ? `<small>Đã lưu đến ngày ${saved.currentDay}</small>` : ''}
        ${message ? `<div class="alert-message">${escapeHtml(message)}</div>` : ''}
        <button class="btn-tertiary" data-type="REPLAY">🔄 Đặt Lại / Chơi Lại Từ Đầu</button>
      </div>
    </div>
  `;
}

function renderXomOi() {
  const forecast=state.currentDay===1?'Trời nóng · chuẩn bị thêm thức uống. Bé Tí sẽ ghé xin thêm chả.':state.dayEvent.forecast;
  return `<header class="top-nav"><b>${shopTitle()}</b><span class="wallet-badge">${money(state.cash)}</span></header><section class="morning-dashboard"><div class="morning-hero"><span>Ngày ${state.currentDay}</span><h2>Mở quán thôi!</h2></div>
    <div class="day-stats"><div><b>${state.dayCustomers.length}</b><small>Khách dự kiến</small></div><div><b>${state.upgrades.vehicleCapacity}</b><small>Sức chở</small></div><div><b>${state.rating?.toFixed(1)||'—'} ★</b><small>Sao quán</small></div></div>
    <div class="forecast-card"><b>Tin xóm hôm nay</b><p>${escapeHtml(forecast)}</p></div>
    ${message?`<div class="alert-message">${escapeHtml(message)}</div>`:''}
    <button class="btn-primary" data-type="NAVIGATE">Đi chợ nhập hàng →</button>
    <div class="empire-nav"><button data-type="OPEN_MAP">Bản đồ xóm · ${Object.keys(state.empire.shops).length} quán</button><button data-type="OPEN_STAFF">Nhân sự · ${state.empire.employees.filter(x=>x.shopId===state.empire.activeShopId).length} người</button></div>
    ${state.currentDay>1?`<h3>Nâng cấp quán</h3><div class="upgrade-grid">${Object.entries(UPGRADE_CATALOG).filter(([id,u])=>state.currentDay>=(u.unlockDay||2)).map(([id,u])=>{const level=state.upgrades[id]||0,cost=level===1?(u.nextCost||u.cost):u.cost;return `<button data-type="UPGRADE" data-payload="${id}" ${level>=u.maxLevel||state.cash<cost||(id==='cargo'&&state.upgrades.bike_basket<2)?'disabled':''}><b>${u.name}</b><span>${level>=u.maxLevel?'Đã nâng tối đa':money(cost)}</span><small>${escapeHtml(u.description)}</small></button>`}).join('')}</div>
      ${state.currentDay>=3?`<button class="btn-secondary" data-type="LEARN_RECIPE" data-payload="BANH_MI_TRUNG" ${!state.upgrades.counter||state.knownRecipeIds.includes('BANH_MI_TRUNG')||state.cash<12000?'disabled':''}>Học bánh mì ốp la · 12k ${state.knownRecipeIds.includes('BANH_MI_TRUNG')?'· Đã học':''}</button>`:''}
      ${state.currentDay>=15?`<button class="btn-secondary" data-type="ENABLE_ONLINE" ${state.onlineEnabledToday?'disabled':''}>Nhận thêm đơn online · phí 2k/đơn</button>`:''}
      ${state.cash<11000&&!state.sideJobIncome?'<button class="btn-secondary" data-type="SIDE_JOB">Phụ dọn sân · nhận 15k vốn</button>':''}
    `:'<p class="morning-help">Bạn chọn nguyên liệu, làm món và giao khách. Ngày đầu có hướng dẫn ngay tại quầy.</p>'}
    <details class="morning-details"><summary>Chuyện xóm & ngày trước</summary><p>Tem ghé xóm: ${state.login?.visitDays||0}. Ngày trong game chỉ tiến sau khi kết thúc ca.</p>${state.lastDayReport?`<p>${escapeHtml(state.lastDayReport.recommendation)}</p>`:'<p>Bà Sáu báo tắc ngày mai có thể lên 3.000đ/trái. Hàng mua hôm nay giữ nguyên giá vốn.</p>'}</details></section>`;
}

function renderMarket() {
  const currentBasketUnits = totalBasketUnits(state.basket);
  const currentBasketCost = totalBasketCost(state.basket, state.marketPrices);
  const remainingCash = state.cash - currentBasketCost;

  return `
    <header class="top-nav">
      <div class="brand-title">${shopTitle()} <small>Chợ Đầu Ngõ</small></div>
      <div class="wallet-badge">💵 ${money(state.cash)}</div>
    </header>
    <div class="market-screen">
      <div class="capacity-banner">
        <div class="capacity-header">
          <span>🚲 Sức chở xe đạp hàng:</span>
          <strong>${currentBasketUnits} / ${state.upgrades.vehicleCapacity} đơn vị</strong>
        </div>
        <div class="capacity-bar-track">
          <div class="capacity-bar-fill ${currentBasketUnits > state.upgrades.vehicleCapacity ? 'overflow' : ''}" style="width: ${Math.min(100, (currentBasketUnits / state.upgrades.vehicleCapacity) * 100)}%;"></div>
        </div>
      </div>

      ${state.currentDay === 1 ? `<div class="bundle-quick-row">
        <button class="btn-bundle" data-type="BUNDLE_DAY1">
          <span>🌟 Chọn Gói Gợi Ý Day 1 (55.000đ)</span>
          <small>3 Bánh mì, 4 Chả, 3 Dưa, 3 Đá, 3 Đường, 2 Tắc, 1 Sữa (19 đơn vị)</small>
        </button>
      </div>` : `<div class="bundle-quick-row"><button class="btn-bundle" data-type="SUGGEST_BASKET">Chọn giỏ gợi ý hôm nay<small>Theo khách dự kiến, món đã bật, tiền và sức chở. Bạn có thể chỉnh lại.</small></button></div><p class="market-note">Ngày ${state.currentDay}: chọn số lượng dựa trên lượng khách dự kiến. Hàng khô còn từ hôm qua: ${Object.entries(state.stock).filter(([id, qty]) => qty > 0).map(([id, qty]) => `${ingredientMeta[id]?.name}: ${qty}`).join(', ') || 'không có'}.</p>`}

      <div class="market-list">
        ${Object.entries(ingredients).filter(([id]) => state.currentDay > 1 || id !== 'egg').map(([id, item]) => {
          const qty = state.basket[id] || 0;
          return `
            <div class="market-item-card">
              ${ingredientMeta[id]?.img ? `<img src="${ingredientMeta[id].img}" class="market-item-img" alt="${item.name}">` : `<span class="market-item-img">${ingredientMeta[id]?.icon || ''}</span>`}
              <div class="market-item-info">
                <strong>${item.name}</strong>
                <span>${money(state.marketPrices[id])} / ${item.unit}</span>
                ${id === 'kumquat' && state.currentDay === 1 ? `<small class="market-warning">⚠️ Ngày mai có thể lên 3.000đ</small>` : ''}
              </div>
              <div class="stepper">
                <button class="step-btn" data-type="BASKET" data-payload="${id}:${Math.max(0, qty - 1)}">-</button>
                <span class="step-val">${qty}</span>
                <button class="step-btn" data-type="BASKET" data-payload="${id}:${qty + 1}">+</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="market-checkout-dock">
        <div class="checkout-summary">
          <div>Tiền giỏ hàng: <strong>${money(currentBasketCost)}</strong></div>
          <div>Tiền còn lại: <strong style="color: ${remainingCash < 0 ? '#ef4444' : '#15803d'}">${money(remainingCash)}</strong></div>
        </div>
        ${message ? `<div class="alert-message">${message}</div>` : ''}
        <button class="btn-primary" data-type="BUY" ${(currentBasketUnits === 0 && state.currentDay === 1) || remainingCash < 0 ? 'disabled' : ''}>
          🥖 ${currentBasketUnits ? 'Mua Hàng & Lên Menu' : 'Không Mua Thêm · Lên Menu'}
        </button>
      </div>
    </div>
  `;
}

function renderMenuSetup() {
  return `
    <header class="top-nav">
      <div class="brand-title">${shopTitle()} <small>Lên Thực Đơn</small></div>
      <div class="wallet-badge">💵 ${money(state.cash)}</div>
    </header>
    <div class="menu-screen">
      <div class="menu-intro">
        <h3>📋 Bảng Thực Đơn Ngày ${state.currentDay} (${state.upgrades.counterSlots} chỗ trên quầy)</h3>
        <p>Chọn các món mở bán và mức giá niêm yết cho khách hàng.</p>
      </div>

      <div class="menu-slots-grid">
        ${Object.entries(recipes).map(([recipeId, recipeData]) => {
          const cfg = state.menu[recipeId] || { enabled: true, sellPrice: recipeData.basePrice };
          const cost = Object.entries(recipeData.needs).reduce((n, [id, qty]) => n + (state.marketPrices[id] || ingredients[id].price) * qty, 0);
          const margin = cfg.sellPrice - cost;
          const isLocked = recipeId === 'BANH_MI_TRUNG' && !state.knownRecipeIds.includes(recipeId);

          return `
            <div class="menu-card ${cfg.enabled ? 'active' : 'disabled'} ${isLocked ? 'locked-dish' : ''}">
              <div class="menu-card-top">
                <img src="${DISH_IMAGES[recipeId]}" class="menu-dish-thumb" alt="${escapeHtml(recipeData.name)}">
                <div class="menu-dish-identity">
                  <div class="menu-toggle-row">
                    <label class="menu-toggle">
                      <input type="checkbox" data-type="CONFIG_MENU_TOGGLE" data-recipe="${recipeId}" ${cfg.enabled ? 'checked' : ''} ${isLocked ? 'disabled' : ''}>
                      <strong>${escapeHtml(recipeData.name)}</strong>
                    </label>
                  </div>
                  <span class="cost-estimate">Vốn ước tính: ~${money(cost)} / phần</span>
                </div>
              </div>

              ${isLocked ? `
                <div class="menu-lock-condition">
                  🔒 Điều kiện mở: Nâng cấp quầy và học công thức từ Ngày 3
                </div>
              ` : ''}

              <div class="price-tiers-row">
                <span class="price-tier-label">Giá niêm yết:</span>
                <div class="price-tier-buttons">
                  ${recipeData.priceTiers.map(p => `
                    <button class="price-tier-btn ${cfg.sellPrice === p ? 'selected' : ''}" 
                      data-type="CONFIG_MENU_PRICE" data-recipe="${recipeId}" data-price="${p}" ${isLocked ? 'disabled' : ''}>
                      ${p / 1000}k
                    </button>
                  `).join('')}
                </div>
              </div>

              <div class="menu-margin-preview">
                Lãi gộp dự kiến: <strong>+${money(margin)} / phần</strong>
              </div>
              ${cfg.sellPrice > recipeData.basePrice ? `<div class="price-demand-hint">⚠️ Giá cao: một số khách nhạy giá có thể bỏ mua.</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <div class="opening-time-section">
        <label>⏰ Giờ mở cửa hôm nay:</label>
        <div class="opening-btn-group">
          <button class="time-btn ${state.openingTime === 'early_6am' ? 'selected' : ''}" data-type="SET_TIME" data-payload="early_6am">
            🌅 Sớm (6h)
          </button>
          <button class="time-btn ${state.openingTime === 'ontime_8am' ? 'selected' : ''}" data-type="SET_TIME" data-payload="ontime_8am">
            ⏰ Đúng giờ (8h)
          </button>
          <button class="time-btn ${state.openingTime === 'late_10am' ? 'selected' : ''}" data-type="SET_TIME" data-payload="late_10am">
            😴 Trễ (10h)
          </button>
        </div>
        <p class="opening-note">${state.openingTime === 'early_6am' ? state.currentDay === 1 ? 'Ngày đầu khách đầu tiên dự kiến 8h30; mở sớm sẽ chờ lâu.' : `Mở sớm sẽ đón khách 7h; ${state.dayEvent.costDelta ? `tốn ${money(state.dayEvent.costDelta)} chuẩn bị` : 'không phát sinh chi phí chuẩn bị hôm nay'}.` : state.openingTime === 'late_10am' ? 'Mở lúc 10h sẽ bỏ lỡ khách ghé trước giờ này.' : 'Mở lúc 8h để đón khách sáng.'}</p>
      </div>

      ${message ? `<div class="alert-message">${message}</div>` : ''}

      <div class="menu-footer">
        <button class="btn-primary" data-type="START_DAY">${Object.keys(state.empire.shops).length>1?'Chuẩn bị xong · Mở các quán':'Mở quán đón khách'}</button>
        <div class="empire-nav"><button data-type="OPEN_MAP">Bản đồ & các quán</button><button data-type="OPEN_STAFF">Nhân sự</button></div>
      </div>
    </div>
  `;
}

function renderShop() {
  const c=state.activeCustomer, p=state.service?.version===2?state.service:null;
  const needs=cookingNeeds(state), selected=p?.selected || {};
  const phase=p?.phase, cooking=phase==='PREP', ready=phase==='READY', handoff=['HANDOFF','REACTION'].includes(phase);
  const canSelect=c?.status==='ARRIVED'&&phase==='SELECT'&&!state.isPaused&&!state.manualPaused;
  const time=480+state.clock;
  const emotion=c?getCustomerEmotion(c):null;
  const visibleIngredients=Object.keys(ingredientMeta).filter(id=>id!=='egg'||state.knownRecipeIds.includes('BANH_MI_TRUNG'));
  const title=c?recipes[c.recipe]?.name:'Quầy của bạn';
  const blocked=c && c.status!=='ARRIVED'&&c.status!=='SERVED';
  return `<div class="play-screen">
    <header class="play-header"><div><b>${shopTitle()}</b><small>Ngày ${state.currentDay} · ${String(Math.floor(time/60)).padStart(2,'0')}:${String(Math.floor(time%60)).padStart(2,'0')} · ${state.servedOrders.length}/${state.dayCustomers.length} khách</small></div><span class="play-cash">${money(state.cash)}${floatingCash?`<i>${floatingCash}</i>`:''}</span><button class="play-pause" data-type="TOGGLE_PAUSE" aria-label="${state.manualPaused?'Tiếp tục':'Tạm dừng'}">${state.manualPaused?'▶':'Ⅱ'}</button></header>
    <div class="play-scene">
      <img src="../assets/environment/alley_counter_clean.jpg" class="play-background" alt="Quán nhỏ trong hẻm">
      ${state.upgrades.canopy?`<img class="play-canopy" src="${CANOPY_AWNING_IMG}" alt="Mái che">`:''}
      ${(state.waitingQueue||[]).slice(0,2).map((q,i)=>`<img class="play-waiting waiting-${i}" src="${getCustomerSprite(q)}" alt="${escapeHtml(q.name)} đang chờ">`).join('')}
      ${c?`<img class="play-customer ${c.id==='be_ti'?'small-child':c.archetype==='teen'?'teen':''} ${phase==='REACTION'?'react':''}" src="${getCustomerSprite(c,autoPrepState?.customerPose)}" alt="${escapeHtml(c.name)}">`:''}
      <img class="play-foreground" src="${COUNTER_SHELF_FOREGROUND_IMG}" alt="Gờ quầy">
      <div class="play-speech customer-order-callout ${c ? '' : 'is-empty'}">
        ${c ? `
          <div class="ticket-dish-row">
            <img src="${DISH_IMAGES[c.recipe]}" class="ticket-dish-img" alt="${escapeHtml(title)}">
            <div class="ticket-dish-meta">
              <div class="ticket-dish-title-row">
                <span class="ticket-dish-name">${escapeHtml(title)}</span>
                <span class="ticket-qty-pill">×1</span>
              </div>
              ${c.id === 'be_ti' && state.extraCha === true ? `<div class="ticket-special-badge">⭐ Thêm chả</div>` : ''}
              <div class="ticket-cust-sub">
                <span class="ticket-cust-name">${escapeHtml(c.name)}</span>
                ${c.temperament === 'RUSH' ? `<span class="ticket-rush-tag">⚡ Vội</span>` : ''}
              </div>
            </div>
          </div>
          <div class="ticket-dialogue-row">
            <span>"${escapeHtml(customerReaction?.quote || (c.id === 'be_ti' && state.extraCha ? 'Cho con bánh mì thêm chả nha chú!' : c.dialogue))}"</span>
          </div>
        ` : `
          <div class="ticket-empty-row">Khách đang ghé tới…</div>
        `}
      </div>
      ${handoff&&c?.status==='SERVED'?`<img class="play-tray-dish" src="${DISH_IMAGES[c.recipe]}" alt="${escapeHtml(title)} trên khay quầy">`:''}
      ${state.manualPaused?'<div class="play-pause-overlay">Đã tạm dừng</div>':''}
    </div>
    <div class="play-queue"><span class="queue-header-label">Hàng chờ</span>${state.waitingQueue.length?state.waitingQueue.slice(0,3).map(q=>{const e=getCustomerEmotion(q);const dishName=recipes[q.recipe]?.name||'Món';const isChosen=state.prioritizedCustomerId===q.id;return `<button class="queue-ticket ${isChosen?'chosen':''}" data-type="PRIORITIZE" data-payload="${q.id}" aria-label="Ưu tiên ${escapeHtml(q.name)} (${escapeHtml(dishName)})"><img src="${DISH_IMAGES[q.recipe]}" class="queue-dish-thumb" alt="${escapeHtml(dishName)}"><div class="queue-ticket-meta"><div class="queue-title-line"><b>${isChosen?'⭐ ':''}${escapeHtml(q.name)}</b></div><div class="queue-sub-line"><span class="queue-dish-name">${escapeHtml(dishName)}</span><small class="${q.temperament==='RUSH'?'rush-label':''}">· ${q.temperament==='RUSH'?'⚡ Vội':e.label}</small></div></div><i class="queue-patience-bar" style="width:${e.pct}%;background:${e.color}"></i></button>`}).join(''):'<small class="queue-empty-note">Hàng chờ rỗng · Chạm khách để ưu tiên làm trước</small>'}</div>
    <div class="order-receipt"><b>${c?`Đang làm: ${escapeHtml(title)}${c.id==='be_ti'&&state.extraCha===true?' (Thêm chả)':''}`:'Quầy chế biến · Chờ khách'}</b><div class="receipt-checklist">${c?Object.entries(needs).map(([id,q])=>{const sel=selected[id]||0;const done=sel>=q;return `<span class="receipt-item ${done?'checked':'pending'}"><i class="receipt-mark">${done?'✓':'○'}</i> ${ingredientMeta[id]?.name||id} ${sel}/${q}</span>`}).join(''):'<span class="receipt-item pending">Sẵn sàng nhận đơn</span>'}</div></div>
    <div class="cooking-board ${cooking?'is-cooking':''}" aria-label="Bàn làm món">
      ${ready?`<img class="finished-dish" src="${DISH_IMAGES[c.recipe]}" alt="${escapeHtml(title)} đã làm xong"><b>Xong rồi! Giao khách nào</b>`:handoff?`<span>${blocked?'Khách không mua được món':'Khách nhận món · Chuẩn bị đơn tiếp theo'}</span>`:Object.values(selected).some(Boolean)?`<div class="selected-art">${Object.entries(selected).flatMap(([id,q])=>Array.from({length:q},()=>ingredientMeta[id].img?`<img src="${ingredientMeta[id].img}" alt="${ingredientMeta[id].name}">`:`<span>${ingredientMeta[id].name}</span>`)).join('')}</div><b>${cooking?'Đang làm món…':'Nguyên liệu bạn đã chọn'}</b>`:`<span>${c?'Chạm nguyên liệu bên dưới để làm món':'Sẵn sàng đón khách'}</span>`}
      ${cooking?`<div class="cook-progress"><i style="width:${autoPrepState?.progress||0}%"></i></div>`:''}
    </div>
    <div class="ingredient-tray">${visibleIngredients.map(id=>{const meta=ingredientMeta[id],q=selected[id]||0,n=state.stock[id]||0;return `<button class="ingredient-button ${q?'picked':''}" data-type="ADD_INGREDIENT" data-payload="${id}" ${!canSelect||n===0?'disabled':''} aria-label="Chọn ${meta.name}, còn ${n}">${meta.img?`<img src="${meta.img}" alt="">`:'<span class="egg-placeholder">Trứng</span>'}<b>${meta.name}</b><small>${q?`Đã chọn ${q} · `:''}Còn ${n}</small></button>`}).join('')}</div>
    <div class="cook-actions"><button class="undo-button" data-type="UNDO_INGREDIENTS" ${!canSelect||!Object.values(selected).some(Boolean)?'disabled':''} aria-label="Bỏ nguyên liệu đã chọn">Làm lại</button><button class="cook-main ${ready?'ready':''}" data-type="${ready?'SERVE':'COOK'}" ${state.manualPaused||state.isPaused||!(ready||cookingComplete(state))?'disabled':''}>${ready?'Giao khách →':cooking?'Đang làm món…':canSelect?'Làm món':'Đón khách'}</button><button class="boost-button" data-type="FOCUS_BOOST" ${state.isPaused||state.manualPaused||state.focusBoost.active||state.focusBoost.cooldownSeconds>0?'disabled':''} aria-label="Tập trung làm món nhanh gấp đôi">${state.focusBoost.active?'x2':state.focusBoost.cooldownSeconds>0?Math.ceil(state.focusBoost.cooldownSeconds)+'s':'Nhanh x2'}</button></div>
    <div class="play-status" role="status">${escapeHtml(message || (state.manualPaused?'Bấm ▶ để tiếp tục':state.currentDay===1&&!state.cookingTutorialDone?'Chọn theo công thức → Làm món → Giao khách':state.newsTicker?.text||'Bạn làm món · khách trong hàng vẫn đang chờ'))}</div>
    <details id="play-options" class="play-options" ${playOptionsOpen?'open':''}><summary>Quản lý ca · ${Object.keys(state.empire.shops).length} quán</summary><div><button data-type="OPEN_MAP">Xem map · chuyển quán vào khoảng nghỉ</button><button data-type="SPEED" data-payload="${state.speed===1?2:1}">Nhịp giờ x${state.speed} · đổi</button>${state.staffHiredToday?`<button data-type="TOGGLE_ASSIST">Nhờ nhân viên tự làm: ${state.assistEnabled?'Bật':'Tắt'}</button>`:'<small>Quán có quản lý sẽ tự bán khi bạn vắng.</small>'}<button data-type="CLOSE">Đóng quán này sớm</button></div></details>
    ${state.activeDecision?`<div class="decision-modal-backdrop"><div class="decision-card"><h3>${escapeHtml(state.activeDecision.title)}</h3><p>${escapeHtml(state.activeDecision.message)}</p>${state.activeDecision.options.map(o=>`<button class="btn-decision" data-type="DECIDE" data-payload="${o.key}" ${o.key==='yes'&&((state.activeDecision.id==='EXTRA_CHA'&&state.stock.cha<2)||(state.activeDecision.id==='ROADWORK_SIGN'&&state.cash<3000))?'disabled':''}>${o.label}</button>`).join('')}<small>Đồng hồ dừng trong lúc bạn chọn.</small></div></div>`:''}
  </div>`;
}

function renderDayResult() {
  if (state.empire?.report) return renderEmpireResult();
  const l=calculateLedger(state), report=state.lastDayReport;
  return `<header class="top-nav"><b>${shopTitle()}</b><span class="wallet-badge">${money(l.finalCashInDrawer)}</span></header><section class="end-day">
    <div class="end-day-badge">Hết ca · Ngày ${state.currentDay}</div><h2>Hôm nay quán thế nào?</h2>
    <div class="day-stats"><div><b>${l.servedCount}/${l.servedCount+l.missedCount}</b><small>Khách được phục vụ</small></div><div><b>${state.rating?.toFixed(1)} ★</b><small>Sao quán</small></div><div><b>${l.grossOperatingProfit>=0?'+':''}${money(l.grossOperatingProfit)}</b><small>Lãi gộp</small></div></div>
    <h3>Khách nói gì?</h3><div class="feedback-cards">${(report?.feedback||[]).filter(f=>f.reason!=='SERVED').slice(0,1).concat((report?.feedback||[]).filter(f=>f.reason==='SERVED').slice(0,1)).map(f=>`<div><b>${escapeHtml(f.name)}</b><p>${escapeHtml(f.text)}</p></div>`).join('')||'<p>Ngày mai mình thử đón khách nhé.</p>'}</div>
    <p class="next-tip">${escapeHtml(report?.recommendation||'')}</p>
    <button class="btn-primary" data-type="NEXT_DAY">Chuẩn bị ngày ${state.currentDay+1} →</button><small class="result-countdown">Tự sang ngày sau <b id="next-day-countdown">${Math.ceil((state.resultRemainingMs??12000)/1000)}</b>s · mở sổ để dừng</small>
    <details id="day-ledger-details" ${resultDetailsOpen?'open':''}><summary>Sổ tiền & phản hồi chi tiết</summary><div class="compact-ledger">
      ${[['Vốn đầu ngày',l.startingCash],['Mua nguyên liệu',-l.spentOnMorningStock],['Doanh thu',l.totalSalesRevenue],['Giá vốn đã bán',-l.cogsSoldItemsOnly],['Lãi gộp',l.grossOperatingProfit],['Tiền tip',l.tipsCollected],['Hàng hỏng',-l.spoilageLoss],['Chi vận hành',-l.operatingExpenses],['Nâng cấp',-l.upgradeOutlay],['Phí giao hàng',-l.onlineFees],['Việc phụ',l.sideJobIncome],['Tiền két cuối ca',l.finalCashInDrawer]].map(([label,n])=>`<div><span>${label}</span><b>${money(n)}</b></div>`).join('')}
      <h3>Lý do lỡ khách</h3>${Object.entries(l.missedByReason||{}).filter(([,a])=>a.length).map(([reason,a])=>`<p>${escapeHtml({WAIT_TOO_LONG:'Đợi quá lâu',OUT_OF_STOCK:'Hết hàng',MENU_DISABLED:'Món không bán',PRICE_TOO_HIGH:'Giá cao',MISSED_LATE_OPENING:'Mở muộn',MISSED_EARLY_CLOSING:'Quán đóng cửa'}[reason]||reason)}: ${a.length}</p>`).join('')||'<p>Không lỡ khách nào.</p>'}
      ${(report?.feedback||[]).map(f=>`<p><b>${escapeHtml(f.name)}:</b> ${escapeHtml(f.text)}</p>`).join('')}<h3>Ngày mai</h3><p>${escapeHtml(report?.forecastTomorrow||'')}</p>
    </div></details><button class="btn-tertiary" data-type="REPLAY">Chơi lại từ đầu</button></section>`;
}



function renderMapPanel(){
 const e=state.empire,id=e.mapFocusId||e.activeShopId,loc=LOCATIONS[id],x=e.shops[id];
 const workers=e.employees.filter(p=>p.shopId===id&&!p.restingToday),manager=workers.find(p=>p.role==='manager'),reason=openingEligibility(state,id);
 return `<div class="empire-backdrop"><section class="empire-panel"><header><h2>Bản đồ xóm</h2><button data-type="CLOSE_MAP" aria-label="Đóng bản đồ">×</button></header><p class="panel-hint">${e.shiftRunning?'Map đang tạm dừng · chuyển quán vào khoảng nghỉ.':'Chạm địa điểm để chuẩn bị hoặc mở thêm quán.'}</p>
 <div class="town-board"><svg viewBox="0 0 320 200" aria-hidden="true"><path d="M20 150 Q70 145 70 95 T170 100 T285 45" fill="none" stroke="#b4a486" stroke-width="26"/><path d="M20 150 Q70 145 70 95 T170 100 T285 45" fill="none" stroke="#ead9b9" stroke-width="19"/><path d="M180 100 Q200 145 235 175" fill="none" stroke="#ead9b9" stroke-width="15"/></svg><span class="map-street-name">Hẻm Hoa Giấy</span>${Object.entries(LOCATIONS).map(([key,l])=>`<button class="map-node node-${key} ${e.shops[key]?'owned':'locked'} ${id===key?'focused':''}" data-type="MAP_FOCUS" data-payload="${key}"><i class="house-marker"></i><b>${key==='home'?'Đầu hẻm':key==='school'?'Cổng trường':'Văn phòng'}</b><small>${e.shops[key]?(e.shops[key].closedToday?'Nghỉ hôm nay':e.activeShopId===key?'Bạn ở đây':e.shiftRunning?'Đang bán':'Đã mở'):'Chưa mở'}</small></button>`).join('')}</div>
 <article class="map-location ${x?'owned':'locked'}"><small>${loc.district}</small><h3>${escapeHtml(id==='home'?e.shops.home.state.shopName:loc.name)}</h3><p>${loc.description}</p>${x?`<div class="map-metrics"><span>${(x.state.rating??0).toFixed(1)} ★</span><span>${x.state.servedOrders.length} đơn hôm nay</span></div><p>${e.shiftRunning?x.state.screen==='DAY_RESULT'?'Đã đóng ca':e.activeShopId===id?'Bạn đang đứng bán':manager?'Quản lý đang tự bán':'Chờ chủ':x.closedToday?'Nghỉ hôm nay':x.ready?'Đã chuẩn bị':x.state.screen==='MENU'?'Cần xác nhận menu':'Chưa chuẩn bị'}</p><small>${manager?'Quản lý: '+escapeHtml(manager.name):'Chưa có quản lý'} · ${workers.length} người</small><button data-type="SWITCH_SHOP" data-payload="${id}">${e.activeShopId===id?'Về quán đang chọn':'Đến quán này'}</button>${!e.shiftRunning?`<button class="shop-day-toggle" data-type="TOGGLE_SHOP_DAY" data-payload="${id}">${x.closedToday?'Mở lại hôm nay':'Cho quán nghỉ hôm nay'}</button>`:''}`:`<small>${escapeHtml(reason||'Đủ điều kiện mở quán!')}</small><button data-type="OPEN_LOCATION" data-payload="${id}" ${reason||e.shiftRunning?'disabled':''}>Thuê mặt bằng · ${money(loc.deposit)}</button>`}</article>${message?`<div class="alert-message">${escapeHtml(message)}</div>`:''}<small class="map-footnote">Vốn chung · kho riêng · quán vắng chủ cần quản lý.</small></section></div>`;
}

function renderEmpirePanels(){
 const e=state.empire;if(!e)return '';
 if(e.mapOpen)return renderMapPanel();
  if(e.staffOpen){const people=e.employees.filter(p=>p.shopId===e.activeShopId);return `<div class="empire-backdrop"><section class="empire-panel"><header><h2>Nhân sự · ${shopTitle()}</h2><button data-type="CLOSE_STAFF" aria-label="Đóng nhân sự">×</button></header><p class="panel-hint">Tuyển: 5k/người. Lương thu một lần lúc mở ca; người nghỉ không nhận lương ca đó.</p><div class="staff-list">${people.map(x=>`<article class="employee-card"><h3>${escapeHtml(x.name)} · ${STAFF_ROLES[x.role].name}</h3><div class="employee-meters"><span>Tay nghề ${x.skill}/3</span><span>Mệt ${x.fatigue}/100</span><span>Tinh thần ${x.mood}/100</span></div><small>${money(STAFF_ROLES[x.role].wage)}/ca · ${x.restingToday?'Nghỉ ca hôm nay':x.daysWorked+' ca đã làm'}</small><div class="employee-actions"><button data-type="STAFF_TRAIN" data-payload="${x.id}" ${x.skill>=3||x.lastTrainedDay===state.currentDay?'disabled':''}>Đào tạo · 8k</button><button data-type="STAFF_REST" data-payload="${x.id}">${x.restingToday?'Đi làm lại':'Cho nghỉ ca'}</button>${Object.keys(e.shops).filter(id=>id!==x.shopId).map(id=>`<button data-type="STAFF_MOVE" data-payload="${x.id}:${id}">Chuyển → ${LOCATIONS[id].name}</button>`).join('')}<button class="release-staff" data-type="STAFF_RELEASE" data-payload="${x.id}">Kết thúc hợp đồng</button></div></article>`).join('')||'<p>Quán chưa có nhân viên. Bạn đang tự đứng bán.</p>'}</div><h3>Tuyển thêm</h3><div class="hire-grid">${Object.entries(STAFF_ROLES).map(([id,def])=>{const exists=people.some(x=>x.role===id);const locked=state.currentDay<def.unlockDay||(def.seating&&!state.upgrades.seating)||(def.online&&!state.onlineEnabledToday);const lockReason=state.currentDay<def.unlockDay?`Mở ngày ${def.unlockDay}`:def.seating&&!state.upgrades.seating?'Cần chỗ ngồi':def.online&&!state.onlineEnabledToday?'Cần bật online':'';return `<article class="staff-role-card ${locked?'role-locked':''} ${exists?'role-hired':''}"><div class="role-card-header"><h4>${escapeHtml(def.name)}</h4><span class="role-wage">${money(def.wage)}/ca</span></div><p class="role-perk">${escapeHtml(def.description)}</p><div class="role-status-row">${exists?'<span class="role-tag hired">✓ Đã tuyển cho quán</span>':locked?`<span class="role-tag locked">🔒 ${escapeHtml(lockReason)}</span>`:'<span class="role-tag available">Phí tuyển: 5.000đ</span>'}</div><button class="btn-hire" data-type="STAFF_HIRE" data-payload="${id}" ${exists||locked||state.cash<5000?'disabled':''}>${exists?'Đã tuyển':locked?'Chưa mở':'Tuyển nhân sự (5k)'}</button></article>`}).join('')}</div>${message?`<div class="alert-message">${escapeHtml(message)}</div>`:''}</section></div>`;}
 return '';
}
function renderEmpireResult(){
 const r=state.empire.report;
 const reasonNames={OUT_OF_STOCK:'Hết hàng',WAIT_TOO_LONG:'Đợi lâu',PRICE_TOO_HIGH:'Giá cao',MENU_DISABLED:'Không bán món',MISSED_LATE_OPENING:'Mở muộn',MISSED_EARLY_CLOSING:'Đóng cửa'};
 return `<header class="top-nav"><b>Tổng kết các quán</b><span class="wallet-badge">${money(r.closingCash)}</span></header><section class="end-day"><div class="end-day-badge">Hết ca · Ngày ${r.day}</div><h2>Hôm nay xóm thế nào?</h2><div class="day-stats"><div><b>${r.shops.length}</b><small>Quán vận hành</small></div><div><b>${r.shops.reduce((n,x)=>n+x.served,0)}</b><small>Khách phục vụ</small></div><div><b>${money(r.profit)}</b><small>Kết quả sau chi phí</small></div></div><div class="branch-results">${r.shops.map(x=>`<article><header><h3>${escapeHtml(x.name)}</h3><b>${x.rating?.toFixed(1)} ★</b></header><div class="map-metrics"><span>${x.served}/${x.served+x.missed} khách</span><b class="${x.profit>=0?'text-green':'text-red'}">${money(x.profit)}</b></div><small>Thu ${money(x.revenue)} · vốn đã bán ${money(x.cogs)} · lương/việc ${money(x.ops)}</small><p>${Object.entries(x.reasons).map(([k,n])=>`${reasonNames[k]||k}: ${n}`).join(' · ')||'Không lỡ khách'}</p><div class="next-tip">${escapeHtml(x.advice)}</div><h4>Khách nói gì?</h4>${x.feedback.slice(0,2).map(f=>`<p><b>${escapeHtml(f.name)}:</b> ${escapeHtml(f.text)}</p>`).join('')}${x.employees.length?`<details><summary>Nhân viên cuối ca</summary>${x.employees.map(p=>`<p>${escapeHtml(p.name)} · ${STAFF_ROLES[p.role].name} · mệt ${p.fatigue}/100 · tinh thần ${p.mood}/100</p>`).join('')}</details>`:''}</article>`).join('')}</div><button class="btn-primary" data-type="NEXT_DAY">Chuẩn bị ngày ${r.day+1} →</button><small class="result-countdown">Tự sang ngày sau <b id="next-day-countdown">${Math.ceil((state.resultRemainingMs??12000)/1000)}</b>s · mở sổ để dừng</small><details id="day-ledger-details" ${resultDetailsOpen?'open':''}><summary>Sổ tiền chung & đối soát</summary><div class="compact-ledger"><div><span>Vốn đầu ngày</span><b>${money(r.openingCash)}</b></div><div><span>Biến động tiền mặt</span><b>${money(r.cashMovement)}</b></div><div><span>Tiền cuối ngày</span><b>${money(r.closingCash)}</b></div><p>${r.reconciled?'Đối soát khớp các giao dịch từng quán.':'Có chênh lệch cần kiểm tra.'}</p>${r.shops.map(x=>`<p><b>${x.name}</b> · nhập ${money(x.spent)} · đầu tư ${money(x.investment)} · hàng hỏng ${money(x.spoilage)} · tip ${money(x.tips)} · phí giao ${money(x.fees)}</p>`).join('')}</div></details><button class="btn-tertiary" data-type="REPLAY">Chơi lại từ đầu</button></section>`;
}

let renderedScreen = null;


function patchNode(old, next) {
  if (old.nodeType !== next.nodeType || old.nodeName !== next.nodeName) { old.replaceWith(next.cloneNode(true)); return; }
  if (old.nodeType === 3 || old.nodeType === 8) { if (old.nodeValue !== next.nodeValue) old.nodeValue = next.nodeValue; return; }
  for (const attr of [...old.attributes]) if (!next.hasAttribute(attr.name)) old.removeAttribute(attr.name);
  for (const attr of [...next.attributes]) if (old.getAttribute(attr.name) !== attr.value) old.setAttribute(attr.name, attr.value);
  if (old.nodeName === 'INPUT' && old.type === 'checkbox') old.checked = next.checked;
  const a = [...old.childNodes], b = [...next.childNodes];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (!b[i]) a[i].remove();
    else if (!a[i]) old.appendChild(b[i].cloneNode(true));
    else patchNode(a[i], b[i]);
  }
}
function render() {
  const html = ({ HOME: renderHome, XOM_OI: renderXomOi, MARKET: renderMarket, MENU: renderMenuSetup, SHOP: renderShop, DAY_RESULT: renderDayResult }[state.screen])() + renderEmpirePanels();
  // Preserve buttons, images and CSS animation nodes between clock updates.
  if (renderedScreen === state.screen && document.createElement) {
    const draft = document.createElement('main');
    draft.innerHTML = html;
    const a = [...$.childNodes], b = [...draft.childNodes];
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (!b[i]) a[i].remove();
      else if (!a[i]) $.appendChild(b[i].cloneNode(true));
      else patchNode(a[i], b[i]);
    }
  } else { $.innerHTML = html; renderedScreen = state.screen; window.scrollTo?.(0, 0); }
  $.dataset.screen = state.screen;
}

// ─────────────────────────────────────────────────────────────
// EVENT DELEGATION
// ─────────────────────────────────────────────────────────────

$.addEventListener('click', e => {
  const playSummary = e.target.closest('#play-options > summary');
  if (playSummary) { playOptionsOpen = !playSummary.parentElement.open; return; }
  const ledgerSummary = e.target.closest('#day-ledger-details > summary');
  if (ledgerSummary) {
    resultDetailsOpen = !ledgerSummary.parentElement.open;
    state.resultDetailsOpen = resultDetailsOpen;
    state.revision += 1;
    persist();
    return;
  }
  const b = e.target.closest('[data-type]');
  if (!b) return;
  if (b.disabled) return;

  const t = b.dataset.type;
  const p = b.dataset.payload;

  if (t === 'SET_SHOP_NAME') {
    send('SET_SHOP_NAME', document.querySelector('#shop-name-input')?.value || '');
    if (state.shopName) send('NAVIGATE');
    return;
  }

  if (t === 'RESUME') {
    if (saved) {
      state = saved;
      message = '';
      if (state.screen === 'SHOP') startSimulationLoop();
      render();
    }
    return;
  }

  if (t === 'STAFF_RELEASE' && !window.confirm('Kết thúc hợp đồng nhân viên này? Quán có thể thiếu người vận hành.')) return;

  if (t === 'REPLAY') {
    if (!window.confirm('Chơi lại sẽ xóa tiến độ quán trên máy này. Bạn muốn bắt đầu lại?')) return;
    send('REPLAY');
    return;
  }

  if (t === 'CLOSE' && state.customerIndex < state.dayCustomers.length) {
    const remaining = state.dayCustomers.length - state.customerIndex - (state.activeCustomer?.status && state.activeCustomer.status !== 'ARRIVED' ? 1 : 0);
    if (!window.confirm(`Đóng sớm sẽ bỏ lỡ ${remaining} khách chưa phục vụ. Vẫn đóng quán?`)) return;
  }

  if (t === 'CONFIG_MENU_TOGGLE') {
    const recipeId = b.dataset.recipe;
    const isChecked = b.checked;
    send('CONFIG_MENU', { recipeId, enabled: isChecked });
    return;
  }

  if (t === 'CONFIG_MENU_PRICE') {
    const recipeId = b.dataset.recipe;
    const sellPrice = Number(b.dataset.price);
    send('CONFIG_MENU', { recipeId, sellPrice });
    return;
  }

  if (t === 'SET_TIME') {
    send('SET_OPENING_TIME', p);
    return;
  }

  if (t === 'SPEED') {
    send('SET_SPEED', Number(p));
    return;
  }

  if (t === 'DECIDE') {
    send('DECIDE', { choice: p });
    return;
  }

  if (t === 'BASKET') {
    const [id, qty] = p.split(':');
    send('BASKET', { id, qty: Number(qty) });
    return;
  }

  if (t === 'FOCUS_BOOST') {
    send('FOCUS_BOOST');
    render();
    return;
  }

  if (t === 'PRIORITIZE') {
    send('PRIORITIZE', { customerId: p });
    render();
    return;
  }

  send(t, p);
});

$.addEventListener('toggle', e => {
  if (e.target?.id === 'play-options') { playOptionsOpen = e.target.open; return; }
  if (e.target?.id !== 'day-ledger-details') return;
  resultDetailsOpen = e.target.open;
  state.resultDetailsOpen = resultDetailsOpen;
  state.revision += 1;
  persist();
}, true);
$.addEventListener('keydown', e => {
  if (e.target?.id === 'shop-name-input' && e.key === 'Enter') {
    send('SET_SHOP_NAME', e.target.value);
    if (state.shopName) send('NAVIGATE');
  }
});
// Initial boot
updateServiceView();
const loginClaim = empireAction(state, 'CLAIM_LOGIN', vnCalendarDate());
if (!loginClaim.error && loginClaim.state !== state) { state = loginClaim.state; persist(); }
render();
if (state.screen === 'SHOP') {
  startSimulationLoop();
}
if (state.screen === 'DAY_RESULT') scheduleNextDay();

window.__xomNho = {
  send,
  getState: () => state,
  render,
  setAutoPrepState: (val) => { autoPrepState = val; },
  clearAllTimers
};
