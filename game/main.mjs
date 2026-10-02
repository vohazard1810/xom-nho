import { advanceShift, serviceVisual } from './shift-engine.mjs';
import {
  ingredients,
  recipes,
  fixtureCustomers,
  SAVE_KEY,
  BIKE_CAPACITY,
  UPGRADE_CATALOG,
  fresh,
  totalBasketUnits,
  totalBasketCost,
  recipeNeeds,
  hasEnoughStock,
  calculateRecipeCost,
  action,
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
let state = saved || fresh();
let message = '';

// Simulation and Animation State
let simInterval = null;
let betiFrameIdx = 0;
let autoPrepState = null; // { stage: 'bread'|'cha'|'veg'|'done', progress: number, item: recipeId, isExtra: boolean }
let floatingCash = null; // e.g. "+25.000đ"
let customerReaction = null; // { quote: string, status: 'happy'|'disappointed' }
let resultTimer = null;
let resultDetailsOpen = Boolean(state.resultDetailsOpen);
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
    state = fresh();
    resultDetailsOpen = false;
  } else {
    const r = action(state, type, payload);
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
    if (document.hidden || state.screen !== 'SHOP' || state.isPaused || state.manualPaused) return;
    const before = state.activeCustomer?.id + ':' + state.service?.phase;
    const revenue = state.revenue;
    state = advanceShift(state, 200);
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
        <span class="cover-tag">🏮 PHIÊN BẢN CHƠI THỬ · IDLE MANAGEMENT</span>
        <h1 class="cover-brand">${shopTitle()}</h1>
        <p class="cover-sub">Chuyện Làm Ăn Buôn Bán Quán Phố</p>
      </div>
      <div class="cover-card">
        <p class="cover-desc">
          Quản lý quán ăn nhỏ trong con hẻm Sài Gòn.<br>
          Dự tính nhu cầu, đặt giá bán, mở quán tự bán và xử lý tình huống phát sinh cùng bà con chòm xóm.
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
  return `
    <header class="top-nav">
      <div class="brand-title">${shopTitle()} <small>Tin Buổi Sớm</small></div>
      <div class="wallet-badge">💵 ${money(state.cash)}</div>
    </header>
    <div class="story-screen">
      <div class="story-card">
        <h2>🌤️ Xóm Ơi · Ngày ${state.currentDay}</h2>
        <p>Nắng sớm len lỏi qua giàn hoa giấy tím trước hiên nhà. Mùi cà phê thơm lừng quyện cùng tiếng còi xe máy đầu hẻm báo hiệu một ngày buôn bán mới.</p>
        ${state.currentDay > 1 ? `
          <div class="story-hint"><b>📰 Tin trước giờ mở:</b> ${escapeHtml(state.dayEvent.forecast)}<br>
          Dự kiến ${state.dayCustomers.length} lượt khách · Sao quán ${state.rating?.toFixed(1) || 'chưa đánh giá'} ⭐.
          Giá đã mua hôm trước giữ nguyên trong kho; giá mới chỉ áp dụng cho hàng mua hôm nay.
          ${state.rating !== null && state.rating < 3 ? '<br>⚠️ Sao quán đang thấp: khách bình dân sẽ dè giá cao, dự kiến ít người ghé hơn.' : ''}
          <br>Sức chở ${state.upgrades.vehicleCapacity} đơn vị: trần sao hiện tại ${state.upgrades.vehicleCapacity <= 20 ? '3,5' : state.upgrades.vehicleCapacity <= 30 ? '4,0' : '5,0'}; nâng xe để phục vụ nhiều khách hơn.
          <br>Tem ghé xóm: ${state.login?.visitDays || 0} ngày lịch, nghỉ chơi không mất tem.</div>
          ${state.lastDayReport?.recommendation ? `<p class="story-hint">${escapeHtml(state.lastDayReport.recommendation)}</p>` : ''}
          ${state.lastDayReport ? `<details class="story-hint"><summary>Xem lại ngày ${state.lastDayReport.day}: ${state.lastDayReport.served} khách được phục vụ · két ${money(state.lastDayReport.cash)}</summary><ul>${state.lastDayReport.feedback.slice(0, 3).map(f => `<li>${escapeHtml(f.name)}: ${escapeHtml(f.text)}</li>`).join('')}</ul></details>` : ''}
          <div class="upgrade-list"><h3>🔧 Nâng cấp trước khi đi chợ</h3>
            ${Object.entries(UPGRADE_CATALOG).map(([id, u]) => `
              <button class="btn-secondary" data-type="UPGRADE" data-payload="${id}" ${state.currentDay < (u.unlockDay || 2) || (id === 'cargo' && state.upgrades.bike_basket < 2) || (state.upgrades[id] || 0) >= u.maxLevel || state.cash < (state.upgrades[id] === 1 ? (u.nextCost || u.cost) : u.cost) ? 'disabled' : ''}>
                ${u.name} · ${money(state.upgrades[id] === 1 ? (u.nextCost || u.cost) : u.cost)} — ${u.description} (${state.upgrades[id] || 0}/${u.maxLevel})${state.currentDay < (u.unlockDay || 2) ? ` · Mở ngày ${u.unlockDay}` : ''}
              </button>
            `).join('')}
          </div>
          ${state.currentDay >= 3 ? `<button class="btn-secondary" data-type="LEARN_RECIPE" data-payload="BANH_MI_TRUNG" ${!state.upgrades.counter || state.knownRecipeIds.includes('BANH_MI_TRUNG') || state.cash < 12000 ? 'disabled' : ''}>📒 Học bánh mì ốp la · 12.000đ (cần nới quầy)${state.knownRecipeIds.includes('BANH_MI_TRUNG') ? ' · Đã học' : ''}</button>` : ''}
          ${state.currentDay >= 8 ? `<button class="btn-secondary" data-type="HIRE_STAFF" ${state.staffHiredToday || state.cash < 8000 ? 'disabled' : ''}>🧑‍🍳 Thuê người phụ ca này · lương 8.000đ; làm món nhanh hơn 35%, vẫn cần đủ nguyên liệu</button>` : ''}
          ${state.currentDay >= 15 ? `<button class="btn-secondary" data-type="ENABLE_ONLINE" ${state.onlineEnabledToday ? 'disabled' : ''}>🛵 Nhận 2 đơn mang đi · phí 2.000đ/đơn thành công, dùng chung hàng tồn</button>` : ''}
          ${state.cash < 11000 && !state.sideJobIncome ? `<button class="btn-secondary" data-type="SIDE_JOB">🧹 Phụ cô hàng xóm dọn sân · nhận 15.000đ vốn nhập hàng</button>` : ''}
          ${state.sideJobIncome ? `<p>Hôm nay đã làm việc phụ: +${money(state.sideJobIncome)}. Khoản này ghi riêng với tiền bán món.</p>` : ''}
          ${message ? `<div class="alert-message">${escapeHtml(message)}</div>` : ''}
        ` : `
        <div class="story-clues">
          <strong>📰 Tin tức trong xóm:</strong>
          <ul>
            <li>👧 <b>Bé Tí</b> hôm nay tan trường sớm (~10h), thế nào cũng tạt qua quán ăn bánh mì.</li>
            <li>👵 <b>Cô Chín</b> đi chợ ngang (~11h), trời oi nồng cô thường thèm ly trà tắc thanh mát.</li>
            <li>🛵 <b>Anh Tùng</b> chạy xe ôm công nghệ ghé nghỉ trưa (~11h45) nạp năng lượng ly sữa đậu.</li>
            <li>☀️ <b>Thời tiết:</b> Nắng nóng từ sớm, nước giải khát dự kiến sẽ đắt hàng.</li>
          </ul>
        </div>

        <div class="story-hint">
          📢 <b>Bà Sáu đầu chợ rỉ tai:</b> <i>"Tắc bữa nay gom ép nước nhiều, giá chợ chiều có thể nhích lên 3.000đ/trái đó nghen chú!"</i>
        </div>
        `}

        <button class="btn-primary" data-type="NAVIGATE" style="margin-top: 18px;">🛒 Ra Chợ Đầu Ngõ Nhập Hàng</button>
      </div>
    </div>
  `;
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

          return `
            <div class="menu-card ${cfg.enabled ? 'active' : 'disabled'}">
              <div class="menu-card-header">
                <label class="menu-toggle">
                  <input type="checkbox" data-type="CONFIG_MENU_TOGGLE" data-recipe="${recipeId}" ${cfg.enabled ? 'checked' : ''} ${recipeId === 'BANH_MI_TRUNG' && !state.knownRecipeIds.includes(recipeId) ? 'disabled' : ''}>
                  <strong>${recipeData.name}${recipeId === 'BANH_MI_TRUNG' && !state.knownRecipeIds.includes(recipeId) ? ' · Cần nới quầy và học món' : ''}</strong>
                </label>
                <span class="cost-estimate">Vốn: ~${money(cost)}</span>
              </div>
              
              <div class="price-tiers-row">
                <span class="price-tier-label">Giá bán:</span>
                ${recipeData.priceTiers.map(p => `
                  <button class="price-tier-btn ${cfg.sellPrice === p ? 'selected' : ''}" 
                    data-type="CONFIG_MENU_PRICE" data-recipe="${recipeId}" data-price="${p}" ${recipeId === 'BANH_MI_TRUNG' && !state.knownRecipeIds.includes(recipeId) ? 'disabled' : ''}>
                    ${p / 1000}k
                  </button>
                `).join('')}
              </div>

              <div class="menu-margin-preview">
                Lãi gộp dự kiến: <strong>+${money(margin)} / phần</strong>
              </div>
              ${cfg.sellPrice > recipeData.basePrice ? `<div class="price-demand-hint">Giá cao: một số khách nhạy giá có thể bỏ mua.</div>` : ''}
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
        <button class="btn-primary" data-type="START_DAY">🏪 Mở Quán Đón Khách</button>
      </div>
    </div>
  `;
}

function renderShop() {
  // Engine clock is always measured relative to 08:00; early starts at -120,
  // late starts at +120. Do not add the opening offset twice.
  const totalMinutes = 480 + state.clock;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  const timeFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  const cust = state.activeCustomer;
  const isBeti = cust && cust.id === 'be_ti';
  const isCoChin = cust && cust.id === 'co_chin';
  const isAnhTung = cust && cust.id === 'anh_tung';
  const custEmotion = cust ? getCustomerEmotion(cust) : null;
  const currentPose = autoPrepState?.customerPose || 'ORDER';
  const currentItem = autoPrepState?.item || cust?.recipe;
  const dishImg = currentItem ? (DISH_IMAGES[currentItem] || '') : '';
  const dishOnTray = Boolean(autoPrepState && (autoPrepState.stage === 'deliver_to_tray' || autoPrepState.stage === 'customer_react'));
  const isLeaving = Boolean(cust && cust.status === 'SERVED' && !customerReaction);

  return `
    <header class="top-nav">
      <div class="brand-title">${shopTitle()}</div>
      <div class="clock-display">
        <small>Ngày ${state.currentDay} · ${state.servedOrders.length}/${state.dayCustomers.length} khách</small>
        <span>⏰ ${timeFormatted}</span>
        <div class="speed-toggle">
          <button class="speed-btn ${state.speed === 1 ? 'active' : ''}" data-type="SPEED" data-payload="1">x1</button>
          <button class="speed-btn ${state.speed === 2 ? 'active' : ''}" data-type="SPEED" data-payload="2">x2</button>
        </div>
      </div>
      <div class="top-nav-right" style="display: flex; align-items: center; gap: 8px;">
        <button class="btn-icon-replay" data-type="TOGGLE_PAUSE" title="Tạm dừng hoặc tiếp tục ca" style="background: none; border: none; font-size: 16px; cursor: pointer; color: #fbd38d; min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center;">${state.manualPaused ? '▶' : 'Ⅱ'}</button>
        <div class="wallet-badge" style="position: relative;">
          💵 ${money(state.cash)}
          ${floatingCash ? `<div class="floating-cash-burst">${floatingCash}</div>` : ''}
        </div>
      </div>
    </header>

    <div class="shop-stage-container">
      ${state.manualPaused ? '<div class="pause-notice">Ca đang tạm dừng. Bấm ▶ để tiếp tục.</div>' : ''}
      ${message ? `<div class="alert-message">${escapeHtml(message)}</div>` : ''}
      ${state.newsTicker ? `
        <div class="news-ticker-banner">
          <span>📢 ${state.newsTicker.text}</span>
        </div>
      ` : ''}

      <!-- Street view & Counter window -->
      <div class="street-counter-scene">
        <img src="../assets/environment/alley_counter_clean.jpg" class="scene-background" alt="Con hẻm">
        ${(state.upgrades?.canopy > 0 || state.previewCanopy) ? `
          <img src="${CANOPY_AWNING_IMG}" class="shop-canopy-awning" alt="Mái hiên di động">
        ` : ''}

        <!-- Waiting customers in queue along the alley pavement -->
        ${state.waitingQueue && state.waitingQueue.length > 0 ? `
          <div class="waiting-queue-actors">
            ${state.waitingQueue.slice(0, 2).map((waitCust, idx) => {
              const waitEmotion = getCustomerEmotion(waitCust);
              const waitSprite = getCustomerSprite(waitCust);
              const isPrio = state.prioritizedCustomerId === waitCust.id;
              return `
                <div class="queue-actor-wrap queue-pos-${idx} ${isPrio ? 'is-prioritized' : ''}" data-type="PRIORITIZE" data-payload="${waitCust.id}" role="button" tabindex="0" aria-label="Ưu tiên ${escapeHtml(waitCust.name)}" title="Chạm để ưu tiên phục vụ">
                  <img src="${waitSprite}" class="actor-sprite queue-sprite" alt="${escapeHtml(waitCust.name)}">
                  <div class="queue-mini-bubble">
                    <span class="emotion-icon">${waitEmotion.icon}</span>
                    <div class="patience-mini-bar">
                      <div class="patience-fill" style="width: ${waitEmotion.pct}%; background-color: ${waitEmotion.color};"></div>
                    </div>
                    ${isPrio ? `<span class="prio-tag">⭐ Ưu tiên</span>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        <!-- Customer in service spot at counter window -->
        ${cust ? `
          <div class="customer-actor-wrap ${isLeaving ? 'served-leaving' : ''} ${currentPose === 'RECEIVE' ? 'pose-receive' : (currentPose === 'REACT' ? 'pose-react' : 'pose-order')}">
            <img src="${getCustomerSprite(cust, currentPose)}" class="actor-sprite ${isBeti ? 'beti-sprite' : (isCoChin ? 'co-chin-sprite' : (isAnhTung ? 'anh-tung-sprite' : (cust.archetype === 'teen' ? 'teen-sprite' : 'walkin-sprite')))}" alt="${escapeHtml(cust.name)}">

          </div>
            <!-- Speech is a scene-level layer so foreground art cannot wash it out. -->
            <div class="customer-bubble">
              <div class="bubble-header-row">
                <span class="bubble-emotion-icon">${currentPose === 'REACT' ? '😊' : custEmotion.icon}</span>
                <strong>${escapeHtml(cust.name)}${cust.temperament === 'RUSH' ? ' · Đang vội' : cust.temperament === 'FRIENDLY' ? ' · Vui vẻ' : ''}</strong>
              </div>
              <span class="bubble-dialogue-text">"${escapeHtml(customerReaction ? customerReaction.quote : cust.dialogue)}"</span>
              <div class="patience-mini-bar">
                <div class="patience-fill" style="width: ${custEmotion.pct}%; background-color: ${custEmotion.color};"></div>
              </div>
              ${currentPose === 'REACT' ? `<div class="bubble-sparkle">Cảm ơn quán!</div>` : ''}
            </div>
        ` : `
          <div class="empty-street-idle">
            <span>Tiếng ve kêu râm ran... Quán đang chờ khách ghé</span>
          </div>
        `}

        <!-- Foreground Counter Shelf (Occludes customer legs/feet, placing customer behind the counter) -->
        <img src="${COUNTER_SHELF_FOREGROUND_IMG}" class="counter-shelf-foreground" alt="Mặt bàn quầy gỗ">

        <!-- Counter Pass Tray (Khay quầy gỗ phẳng nằm ngang): Rustic horizontal pass tray on counter sill -->
        <div class="counter-pass-tray ${dishOnTray ? 'has-dish' : 'is-empty'}">
          ${dishOnTray && dishImg ? `
            <div class="tray-dish-holder popIn">
              <img src="${dishImg}" class="tray-dish-img" alt="${recipes[currentItem]?.name || 'Món ăn'}">
              <span class="tray-steam-wisp">~</span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Active Coordination Dock (Focus Boost & Queue Priority) -->
      <div class="active-management-dock">
        <div class="management-controls-row">
          <button class="btn-focus-boost ${state.focusBoost?.active ? 'is-active' : (state.focusBoost?.cooldownSeconds > 0 ? 'is-cooldown' : '')}"
                  data-type="FOCUS_BOOST"
                  ${state.isPaused || state.manualPaused || state.focusBoost?.active || state.focusBoost?.cooldownSeconds > 0 ? 'disabled' : ''}>
            ${state.focusBoost?.active
              ? `⚡ ĐANG TẬP TRUNG (${Math.ceil(state.focusBoost.remainingSeconds)}s · Chế biến x2)`
              : (state.focusBoost?.cooldownSeconds > 0
                ? `⏳ Hồi chiêu (${Math.ceil(state.focusBoost.cooldownSeconds)}s)`
                : `⚡ Tập Trung Phục Vụ (x2)`)}
          </button>
        </div>
        ${state.waitingQueue && state.waitingQueue.length > 0 ? `
          <p class="queue-help">Ưu tiên đổi đơn kế tiếp. Món đang làm vẫn tiếp tục; tập trung giúp làm nhanh hơn.</p>
          <div class="queue-management-strip">
            <div class="queue-strip-label">👥 Hàng chờ (${state.waitingQueue.length}):</div>
            <div class="queue-cards-row">
              ${state.waitingQueue.map(qCust => {
                const qEmotion = getCustomerEmotion(qCust);
                const isPrio = state.prioritizedCustomerId === qCust.id;
                return `
                  <div class="queue-cust-card ${isPrio ? 'is-prioritized' : ''}">
                    <div class="queue-cust-info">
                      <img class="queue-cust-avatar" src="${getCustomerSprite(qCust)}" alt="">
                      <div class="queue-cust-text">
                        <strong>${escapeHtml(qCust.name)}</strong>
                        <small>${recipes[qCust.recipe]?.name || qCust.recipe} · ${qEmotion.label}</small>
                      </div>
                    </div>
                    <div class="queue-cust-patience-bar">
                      <div class="queue-cust-patience-fill" style="width: ${qEmotion.pct}%; background-color: ${qEmotion.color};"></div>
                    </div>
                    <button class="btn-prio-tag ${isPrio ? 'prio-active' : ''}" data-type="PRIORITIZE" data-payload="${qCust.id}">
                      ${isPrio ? '⭐ Đang ưu tiên' : 'Ưu tiên'}
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Auto-Prep Rustic Wooden Workstation -->
      <div class="auto-prep-bench">
        <div class="prep-bench-header">
          <span class="prep-bench-title">${cust ? escapeHtml(recipes[cust.recipe]?.name) : 'Bàn chế biến'}</span>
          <span class="prep-status-text">
            ${autoPrepState ? (
              autoPrepState.stage === 'layer1' ? 'Đang chuẩn bị' :
              autoPrepState.stage === 'layer2' ? 'Đang hoàn thiện món' :
              autoPrepState.stage === 'deliver_to_tray' ? '✨ Đã chuyển món lên khay quầy!' :
              autoPrepState.stage === 'customer_react' ? '🎉 Khách nhận món ngon lành!' :
              autoPrepState.stage === 'menudisabled' ? 'Món không bán hôm nay!' :
              autoPrepState.stage === 'pricerejected' ? 'Khách chê giá đắt!' : 'Hết nguyên liệu!'
            ) : cust ? `Đang chuẩn bị ${recipes[cust.recipe]?.name || 'món'}` : 'Sẵn sàng đón khách'}
          </span>
        </div>

        <div class="prep-visual-dock rustic-wood-dock">
          ${['layer1', 'layer2'].includes(autoPrepState?.stage) && autoPrepState.item === 'BANH_MI_CHA' ? `
            <div class="watercolor-prep-stage banh-mi-stage">
              <div class="art-layers-stack">
                <img src="../assets/ingredients/bread.png" class="art-layer art-bread ${autoPrepState.stage === 'layer1' ? 'layer-enter' : ''}" alt="Bánh mì">
                ${autoPrepState.stage === 'layer2' ? `
                  <img src="../assets/ingredients/cha.png" class="art-layer art-cha-slice slice-1 dropIn" alt="Chả lụa">
                  ${autoPrepState.isExtra ? `
                    <img src="../assets/ingredients/cha.png" class="art-layer art-cha-slice slice-2 dropIn" alt="Chả lụa thêm">
                  ` : ''}
                  <img src="../assets/ingredients/vegetable.png" class="art-layer art-veg dropIn" alt="Dưa ngò">
                ` : ''}
              </div>
              <div class="prep-layer-caption">
                ${autoPrepState.stage === 'layer1' ? 'Vỏ bánh mì nướng giòn rụm' : (autoPrepState.isExtra ? 'Xếp 2 khoanh chả lụa dày đặc + dưa ngò' : 'Xếp chả lụa thơm ngậy + dưa ngò')}
            </div>
          ` : ['layer1', 'layer2'].includes(autoPrepState?.stage) && autoPrepState.item === 'TRA_TAC' ? `
            <div class="watercolor-prep-stage drink-stage">
              <div class="art-layers-stack drink-stack">
                <img src="../assets/ingredients/ice.png" class="art-layer art-ice ${autoPrepState.stage === 'layer1' ? 'layer-enter' : ''}" alt="Đá bi">
                ${autoPrepState.stage === 'layer2' ? `
                  <img src="../assets/ingredients/sugar_syrup.png" class="art-layer art-syrup dropIn" alt="Nước đường">
                  <img src="../assets/ingredients/kumquat.png" class="art-layer art-kumquat dropIn" alt="Tắc tươi">
                ` : ''}
              </div>
              <div class="prep-layer-caption">
                ${autoPrepState.stage === 'layer1' ? 'Ly thủy tinh đầy ắp đá bi' : 'Vắt tắc tươi mọng nước + chan nước đường'}
              </div>
            </div>
          ` : ['layer1', 'layer2'].includes(autoPrepState?.stage) && autoPrepState.item === 'SUA_DAU_DA' ? `
            <div class="watercolor-prep-stage drink-stage">
              <div class="art-layers-stack drink-stack">
                <img src="../assets/ingredients/ice.png" class="art-layer art-ice ${autoPrepState.stage === 'layer1' ? 'layer-enter' : ''}" alt="Đá bi">
                ${autoPrepState.stage === 'layer2' ? `
                  <img src="../assets/ingredients/soy_milk.png" class="art-layer art-soymilk dropIn" alt="Sữa đậu">
                ` : ''}
              </div>
              <div class="prep-layer-caption">
                ${autoPrepState.stage === 'layer1' ? 'Ly thủy tinh đầy ắp đá bi' : 'Rót sữa đậu nành béo thơm'}
              </div>
            </div>
          ` : `
            <div class="prep-idle-platter rustic-board">
              <span class="idle-desc">${autoPrepState && autoPrepState.stage === 'deliver_to_tray' ? '✨ Thớt gỗ sạch sẽ · Đã đặt món lên khay quầy' : (autoPrepState && autoPrepState.stage === 'customer_react' ? '🎉 Khách đang nhận món · Thớt gỗ chuẩn bị đợt mới' : cust ? `Chuẩn bị ${recipes[cust.recipe]?.name || 'món'}` : 'Chờ khách tiếp theo')}</span>
            </div>
          `}
        </div>

        <!-- Progress bar for auto-prep -->
        <div class="auto-prep-progress-track">
          <div class="auto-prep-progress-fill" style="width: ${autoPrepState ? autoPrepState.progress : 0}%;"></div>
        </div>
      </div>

      <!-- Live Stock Bar -->
      <div class="live-stock-dock">
        <div class="stock-chips-row">
          ${Object.entries(state.stock).map(([id, qty]) => `
            <span class="stock-chip ${qty === 0 ? 'zero' : ''}">
              ${ingredientMeta[id]?.icon || ''} ${ingredientMeta[id]?.name}: <b>${qty}</b>
            </span>
          `).join('')}
        </div>
        <div class="shop-action-row">
          <button class="btn-close-shop" data-type="CLOSE">🚪 ${state.customerIndex < state.dayCustomers.length ? 'Đóng Sớm & Tính Sổ' : 'Đóng Quán & Tính Sổ'}</button>
        </div>
      </div>
    </div>

    <!-- Decision Modal (Pauses Clock) -->
    ${state.activeDecision ? `
      <div class="decision-modal-backdrop">
        <div class="decision-card">
          <div class="decision-icon">👧</div>
          <h3>${state.activeDecision.title}</h3>
          <p class="decision-speech">"${state.activeDecision.message}"</p>
          <div class="decision-options-col">
            ${state.activeDecision.options.map(opt => `
              <button class="btn-decision" data-type="DECIDE" data-payload="${opt.key}" ${opt.key === 'yes' && ((state.activeDecision.id === 'EXTRA_CHA' && state.stock.cha < 2) || (state.activeDecision.id === 'ROADWORK_SIGN' && state.cash < 3000)) ? 'disabled' : ''}>
                ${opt.label}
              </button>
            `).join('')}
          </div>
          ${state.activeDecision.id === 'EXTRA_CHA' && state.stock.cha < 2 ? '<p>Không đủ chả để thêm; hôm nay chỉ có thể bán phần thường.</p>' : ''}
        </div>
      </div>
    ` : ''}
  `;
}

function renderDayResult() {
  const ledger = calculateLedger(state);

  return `
    <header class="top-nav">
      <div class="brand-title">${shopTitle()} <small>Sổ Ghi Tiền Cuối Ngày</small></div>
      <div class="wallet-badge">💵 ${money(ledger.finalCashInDrawer)}</div>
    </header>

    <div class="result-screen">
      <div class="notebook-ledger-card">
        <div class="notebook-header">
          <h2>📖 SỔ GHI TIỀN ${shopTitle()}</h2>
          <small>Ngày ${state.currentDay} · Tổng Kết Buổi Bán</small>
        </div>
        <div class="ledger-block highlight-box" aria-label="Tóm tắt cuối ngày">
          <h3>${ledger.servedCount}/${ledger.servedCount + ledger.missedCount} khách được phục vụ · ⭐ ${state.rating?.toFixed(1)}</h3>
          <p>Doanh thu ${money(ledger.totalSalesRevenue)} · Lãi gộp ${money(ledger.grossOperatingProfit)} · Tiền két ${money(ledger.finalCashInDrawer)}</p>
          <h4>Khách nói gì hôm nay?</h4>
          <ul class="journal-list">${(state.lastDayReport?.feedback || []).filter(f => f.reason !== 'SERVED').slice(0, 2).concat((state.lastDayReport?.feedback || []).filter(f => f.reason === 'SERVED').slice(0, 1)).map(f => `<li><b>${escapeHtml(f.name)}:</b> ${escapeHtml(f.text)}</li>`).join('') || '<li>Hôm nay chưa có phản hồi.</li>'}</ul>
          <p><b>Gợi ý:</b> ${escapeHtml(state.lastDayReport?.recommendation || '')}</p>
          <p><b>Ngày mai:</b> ${escapeHtml(state.lastDayReport?.forecastTomorrow || '')}</p>
          <small>Tự sang màn chuẩn bị ngày ${state.currentDay + 1} sau <b id="next-day-countdown">${Math.ceil((state.resultRemainingMs ?? 12000) / 1000)}</b> giây. Chạm xem sổ để dừng đếm.</small>
        </div>
        <details id="day-ledger-details" ${resultDetailsOpen ? 'open' : ''}><summary class="btn-secondary">Xem sổ chi tiết & toàn bộ feedback</summary>

        <!-- 1. Dòng tiền mặt trong két -->
        <div class="ledger-block">
          <h4 class="ledger-block-title">💵 1. BÁO CÁO DÒNG TIỀN MẶT TRONG KÉT</h4>
          <div class="ledger-row">
            <span>Tiền vốn mở quầy sáng nay:</span>
            <strong>${money(ledger.startingCash)}</strong>
          </div>
          <div class="ledger-row minus">
            <span>Chi tiền mua nguyên liệu ở chợ:</span>
            <strong>-${money(ledger.spentOnMorningStock)}</strong>
          </div>
          ${ledger.upgradeOutlay ? `<div class="ledger-row minus"><span>Chi nâng cấp quán:</span><strong>-${money(ledger.upgradeOutlay)}</strong></div>` : ''}
          ${ledger.operatingExpenses ? `<div class="ledger-row minus"><span>Chi vận hành (nhân viên, sự kiện):</span><strong>-${money(ledger.operatingExpenses)}</strong></div>` : ''}
          ${ledger.onlineFees ? `<div class="ledger-row minus"><span>Phí đơn mang đi:</span><strong>-${money(ledger.onlineFees)}</strong></div>` : ''}
          ${ledger.sideJobIncome ? `<div class="ledger-row plus"><span>Tiền việc phụ trong xóm:</span><strong>+${money(ledger.sideJobIncome)}</strong></div>` : ''}
          <div class="ledger-row plus">
            <span>Tiền mặt thu thực tế từ bán hàng (${ledger.servedCount} đơn):</span>
            <strong>+${money(ledger.cashSalesCollected)}</strong>
          </div>
          <div class="ledger-row">
            <span>Tiền tip:</span>
            <strong>+${money(ledger.tipsCollected)}</strong>
          </div>
          <hr class="ledger-divider">
          <div class="ledger-row highlight">
            <span>👉 TỔNG TIỀN MẶT TRONG KÉT:</span>
            <strong>${money(ledger.finalCashInDrawer)}</strong>
          </div>
          <div class="ledger-row sub">
            <span>Chênh lệch tiền mặt trong ngày:</span>
            <span class="${ledger.netCashDifferenceToday >= 0 ? 'text-green' : 'text-red'}">
              ${ledger.netCashDifferenceToday >= 0 ? '+' : ''}${money(ledger.netCashDifferenceToday)}
            </span>
          </div>
        </div>

        <!-- 2. Báo cáo P&L -->
        <div class="ledger-block">
          <h4 class="ledger-block-title">📊 2. BÁO CÁO KẾT QUẢ KINH DOANH (P&L)</h4>
          <div class="ledger-row">
            <span>Tổng doanh thu thuần:</span>
            <strong>+${money(ledger.totalSalesRevenue)}</strong>
          </div>
          <div class="ledger-row minus">
            <span>Giá vốn hàng đã bán (COGS):</span>
            <strong>-${money(ledger.cogsSoldItemsOnly)}</strong>
          </div>
          <hr class="ledger-divider">
          <div class="ledger-row highlight profit">
            <span>👉 LỢI NHUẬN GỘP:</span>
            <strong>${ledger.grossOperatingProfit >= 0 ? '+' : ''}${money(ledger.grossOperatingProfit)}</strong>
          </div>
          <div class="ledger-row sub">
            <span>Giá trị nguyên liệu còn tồn kho:</span>
            <strong>${money(ledger.retainedStockValueAtCost)}</strong>
          </div>
          <div class="ledger-row sub"><span>Nguyên liệu tươi hỏng cuối ngày:</span><strong>${money(ledger.spoilageLoss)}</strong></div>
          <div class="ledger-row sub"><span>Kết quả gồm tip, hao hụt, chi vận hành và việc phụ:</span><strong>${money(ledger.resultAfterSpoilageAndExpenses)}</strong></div>
        </div>

        <!-- 3. Lãi gộp theo món -->
        <div class="ledger-block">
          <h4 class="ledger-block-title">📊 3. LÃI GỘP THEO TỪNG MÓN ĂN</h4>
          ${Object.entries(ledger.dishBreakdown).map(([id, d]) => `
            <div class="dish-ledger-line">
              <div class="dish-line-name">
                <b>${d.name}:</b> ${d.count} phần
              </div>
              <div class="dish-line-math">
                Thu: ${money(d.revenue)} - Vốn: ${money(d.cogs)} = 
                <strong class="text-green">+${money(d.margin)}</strong>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- 4. Đơn phục vụ & Đơn lỡ -->
        <div class="ledger-block">
          <h4 class="ledger-block-title">🚫 4. TỔNG KẾT PHỤC VỤ KHÁCH</h4>
          <div class="ledger-row">
            <span>Phục vụ thành công:</span>
            <strong>${ledger.servedCount} / ${ledger.servedCount + ledger.missedCount} khách</strong>
          </div>
          ${ledger.missedCount > 0 ? `
            <div class="missed-details-box">
              <div class="missed-header text-red">Tổng số đơn bỏ lỡ: <strong>${ledger.missedCount} đơn</strong></div>
              ${ledger.missedByReason?.WAIT_TOO_LONG?.length ? `
                <div class="missed-subline">• Khách chờ quá lâu bỏ về: <b>${ledger.missedByReason.WAIT_TOO_LONG.map(o => o.name).join(', ')}</b></div>
              ` : ''}
              ${ledger.missedByReason?.OUT_OF_STOCK?.length ? `
                <div class="missed-subline">• Hết nguyên liệu: <b>${ledger.missedByReason.OUT_OF_STOCK.map(o => o.name).join(', ')}</b></div>
              ` : ''}
              ${ledger.missedByReason?.MENU_DISABLED?.length ? `
                <div class="missed-subline">• Món không bán: <b>${ledger.missedByReason.MENU_DISABLED.map(o => o.name).join(', ')}</b></div>
              ` : ''}
              ${ledger.missedByReason?.PRICE_TOO_HIGH?.length ? `
                <div class="missed-subline">• Khách chê giá đắt: <b>${ledger.missedByReason.PRICE_TOO_HIGH.map(o => o.name).join(', ')}</b></div>
              ` : ''}
              ${ledger.missedByReason?.MISSED_LATE_OPENING?.length ? `
                <div class="missed-subline">• Mở quán muộn (lúc 10h): <b>${ledger.missedByReason.MISSED_LATE_OPENING.map(o => o.name).join(', ')}</b></div>
              ` : ''}
              ${ledger.missedByReason?.MISSED_EARLY_CLOSING?.length ? `
                <div class="missed-subline">• Đóng quán sớm: <b>${ledger.missedByReason.MISSED_EARLY_CLOSING.map(o => o.name).join(', ')}</b></div>
              ` : ''}
            </div>
          ` : `
            <div class="ledger-row text-green">
              <span>Không có khách nào bị bỏ lỡ!</span>
            </div>
          `}
        </div>

        <!-- 5. Chuyện xóm sau giờ bán -->
        <div class="ledger-block journal">
          <h4 class="ledger-block-title">📝 5. CHUYỆN XÓM SAU GIỜ BÁN</h4>
          <ul class="journal-list">
            ${(state.lastDayReport?.feedback || []).map(f => `<li><b>${escapeHtml(f.name)}:</b> ${escapeHtml(f.text)}</li>`).join('')}
          </ul>
        </div>

        <!-- 6. Đánh giá & Preview Day 2 -->
        <div class="ledger-block highlight-box">
          <div class="rating-tag">⭐ ${state.rating?.toFixed(1) || 'Chưa đánh giá'} sao · ${ledger.servedCount >= 5 ? 'Nhiều khách hài lòng' : ledger.servedCount > 0 ? 'Có khách đầu tiên, cần cải thiện thêm' : 'Chưa có đơn thành công'}</div>
          <p>${state.currentDay === 1 ? 'Ngày mai: tắc dự kiến lên 3.000đ/trái; cân nhắc lượng nhập và giá trà tắc.' : `Ngày ${state.currentDay + 1}: đọc tin xóm trước khi nhập hàng.`}</p>
          ${state.currentDay === 1 ? `<div class="upgrade-preview">
            <b>🔧 Xem trước nâng cấp Day 2:</b>
            <p>Rổ đèo hàng xe đạp (sức chở 30 đơn vị) và mối trứng gà tươi giá mềm đầu chợ để mở món Bánh Mì Ốp-La!</p>
          </div>` : ''}
        </div>

        </details>
        <button class="btn-primary" data-type="NEXT_DAY" style="margin-top: 16px;">🌅 Chuẩn bị ngày ${state.currentDay + 1} ngay</button>
        <button class="btn-tertiary" data-type="REPLAY">🔄 Chơi Lại Từ Đầu</button>
      </div>
    </div>
  `;
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
  const html = ({ HOME: renderHome, XOM_OI: renderXomOi, MARKET: renderMarket, MENU: renderMenuSetup, SHOP: renderShop, DAY_RESULT: renderDayResult }[state.screen])();
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
  } else { $.innerHTML = html; renderedScreen = state.screen; }
}

// ─────────────────────────────────────────────────────────────
// EVENT DELEGATION
// ─────────────────────────────────────────────────────────────

$.addEventListener('click', e => {
  const b = e.target.closest('[data-type]');
  if (!b) return;

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
const loginClaim = action(state, 'CLAIM_LOGIN', vnCalendarDate());
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
