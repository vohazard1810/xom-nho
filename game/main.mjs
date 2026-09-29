import {ingredients,recipes,customers,SAVE_KEY,fresh,total,needFor,equalCounts,action,encode,decode} from './day1-core.mjs';

const $ = document.querySelector('#app');

// Sprite asset base paths
const ASSET_BASE = '../assets/characters/named/be_ti/candidates/alternate_model_v1/';
const BETI_SPRITES = {
  normal: [
    ASSET_BASE + 'queue_wait_normal_pilot/actor_crop/queue_wait_normal_01.png',
    ASSET_BASE + 'queue_wait_normal_pilot/actor_crop/queue_wait_normal_02.png',
    ASSET_BASE + 'queue_wait_normal_pilot/actor_crop/queue_wait_normal_03.png',
    ASSET_BASE + 'queue_wait_normal_pilot/actor_crop/queue_wait_normal_04.png'
  ],
  deprioritized: [
    ASSET_BASE + 'queue_wait_deprioritized_pilot/actor_crop/deprioritized_01.png',
    ASSET_BASE + 'queue_wait_deprioritized_pilot/actor_crop/deprioritized_02.png',
    ASSET_BASE + 'queue_wait_deprioritized_pilot/actor_crop/deprioritized_03.png',
    ASSET_BASE + 'queue_wait_deprioritized_pilot/actor_crop/deprioritized_04.png'
  ],
  reserved: [
    ASSET_BASE + 'queue_wait_reserved_for_other_pilot/actor_crop/reserved_01.png',
    ASSET_BASE + 'queue_wait_reserved_for_other_pilot/actor_crop/reserved_02.png',
    ASSET_BASE + 'queue_wait_reserved_for_other_pilot/actor_crop/reserved_03.png',
    ASSET_BASE + 'queue_wait_reserved_for_other_pilot/actor_crop/reserved_04.png'
  ],
  stock: [
    ASSET_BASE + 'queue_wait_stock_pending_pilot/actor_crop/stock_01.png',
    ASSET_BASE + 'queue_wait_stock_pending_pilot/actor_crop/stock_02.png',
    ASSET_BASE + 'queue_wait_stock_pending_pilot/actor_crop/stock_03.png',
    ASSET_BASE + 'queue_wait_stock_pending_pilot/actor_crop/stock_04.png'
  ],
  order: [
    ASSET_BASE + 'order_four_frame_pilot/actor_crop/order_01_mid_raise.png',
    ASSET_BASE + 'order_four_frame_pilot/actor_crop/order_02_raise_approved.png',
    ASSET_BASE + 'order_four_frame_pilot/actor_crop/order_03_speaking.png',
    ASSET_BASE + 'order_four_frame_pilot/actor_crop/order_04_expectant.png'
  ]
};

const CO_CHIN_IMG = '../assets/characters/named/co_chin/co_chin_standing.png';
const ANH_TUNG_IMG = '../assets/characters/named/anh_tung/anh_tung_standing.png';

const DISH_IMAGES = {
  BANH_MI_CHA: '../assets/dishes/banh_mi_cha.png',
  TRA_TAC: '../assets/dishes/tra_tac.png',
  SUA_DAU_DA: '../assets/dishes/sua_dau.png'
};

// Audio effects using Web Audio API
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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

function playBell() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.1].forEach((delay, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 1760 : 2349, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.35);
    });
  } catch (e) {}
}

function playCoins() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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

function playTap(ingredientId) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    let freqStart = 380;
    let freqEnd = 240;
    let type = 'triangle';
    if (ingredientId === 'ice') {
      freqStart = 1400; freqEnd = 900; type = 'sine';
    } else if (ingredientId === 'kumquat' || ingredientId === 'sugar_syrup' || ingredientId === 'soy_milk') {
      freqStart = 500; freqEnd = 700; type = 'sine';
    } else if (ingredientId === 'bread' || ingredientId === 'cha') {
      freqStart = 320; freqEnd = 180; type = 'triangle';
    }

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {}
}

// Persistent storage
const load = () => [0, 1].map(i => decode(localStorage.getItem(SAVE_KEY + ':' + i))).filter(Boolean).sort((a, b) => b.revision - a.revision)[0] || null;
let saved = load();
let state = saved || fresh();
let message = '';
let betiFrameIdx = 0;
let betiAnimationTimer = null;
let lastServedToast = null;

// TẦNG 1: Dynamic game feel state
let customerTransitionState = 'idle'; // 'idle', 'entering', 'leaving'
let floatingCash = null; // string for juice, e.g. "+25.000đ"
let showParticles = false;
let speechBubbleHidden = false;
let bubbleFadeTimer = null;
let autoServiceTimer = null;
let isAutoServing = false;

const money = n => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

const ingredientMeta = {
  bread: { name: 'Bánh mì', icon: '🥖', unit: 'ổ' },
  cha: { name: 'Chả lụa', icon: '🍖', unit: 'khoanh' },
  vegetable: { name: 'Dưa ngò', icon: '🥒', unit: 'phần' },
  ice: { name: 'Đá bi', icon: '🧊', unit: 'ca' },
  sugar_syrup: { name: 'Nước đường', icon: '🍯', unit: 'muỗng' },
  kumquat: { name: 'Tắc tươi', icon: '🍊', unit: 'trái' },
  soy_milk: { name: 'Sữa đậu', icon: '🥛', unit: 'bịch' }
};

function persist() {
  localStorage.setItem(SAVE_KEY + ':' + (state.revision % 2), encode(state));
  saved = state;
}

function send(type, payload) {
  if (type === 'COMMIT') {
    if (autoServiceTimer) {
      clearTimeout(autoServiceTimer);
      autoServiceTimer = null;
    }
    isAutoServing = false;
    const r = action(state, type, payload);
    if (r.error) {
      message = r.error;
      render();
      return;
    }
    playCoins();
    playChime();
    const npc = customers.find(c => c.id === state.selected);
    const price = recipes[npc.recipe].price;
    lastServedToast = `Đã giao món cho ${npc.name}! +${money(price)}`;
    floatingCash = '+' + money(price);
    showParticles = true;

    state = r.state;
    message = '';
    persist();

    // Advance customer synchronously
    ensureActiveCustomer();
    customerTransitionState = 'entering';
    render();

    setTimeout(() => {
      floatingCash = null;
      showParticles = false;
      customerTransitionState = 'idle';
      const spot = document.querySelector('.active-customer-spot');
      if (spot) spot.classList.remove('customer-entering');
    }, 450);
    return;
  }

  const r = action(state, type, payload);
  if (r.error) {
    message = r.error;
  } else {
    if (type === 'REPLAY') {
      localStorage.removeItem(SAVE_KEY + ':0');
      localStorage.removeItem(SAVE_KEY + ':1');
      if (autoServiceTimer) clearTimeout(autoServiceTimer);
      customerTransitionState = 'idle';
      isAutoServing = false;
    }
    if (type === 'TAP') {
      if (autoServiceTimer) {
        clearTimeout(autoServiceTimer);
        autoServiceTimer = null;
      }
      isAutoServing = false;
      playTap(payload);
    }
    if (type === 'SELECT') {
      playBell();
      speechBubbleHidden = false;
      if (bubbleFadeTimer) clearTimeout(bubbleFadeTimer);
      bubbleFadeTimer = setTimeout(() => {
        speechBubbleHidden = true;
        const b = document.querySelector('.customer-order-bubble');
        if (b && (!state.selected || state.selected !== 'be_ti' || state.extraCha !== null)) {
          b.classList.add('bubble-faded');
        }
      }, 2500);
    }
    if (type === 'BUY') {
      playCoins();
    }
    if (type === 'EXTRA') {
      speechBubbleHidden = false;
      if (bubbleFadeTimer) clearTimeout(bubbleFadeTimer);
      bubbleFadeTimer = setTimeout(() => {
        speechBubbleHidden = true;
        const b = document.querySelector('.customer-order-bubble');
        if (b) b.classList.add('bubble-faded');
      }, 2500);
    }
    state = r.state;
    message = '';
    persist();
  }
  render();
}

// Automatically advance queue in SHOP
function ensureActiveCustomer() {
  if (state.screen !== 'SHOP') return;
  
  const remaining = customers.filter(c => !state.served.includes(c.id) && !state.missed.includes(c.id));
  if (remaining.length === 0) {
    send('CLOSE');
    return;
  }
  
  if (!state.selected || state.served.includes(state.selected) || state.missed.includes(state.selected)) {
    send('SELECT', remaining[0].id);
  }
}

// 1.1 Khôi phục Auto-Service cho đơn thường
function checkAutoService() {
  if (state.screen !== 'SHOP') return;
  const currentCustomer = customers.find(c => c.id === state.selected);
  if (!currentCustomer) return;
  
  // Special Request: Bé Tí waits for player decision & assembly
  if (currentCustomer.id === 'be_ti') return;
  
  const needed = needFor(currentCustomer.id, null);
  const isMissingStock = Object.keys(needed).some(k => (state.stock[k] || 0) < needed[k]);
  if (isMissingStock) return; // Stock conflict: requires manual resolution

  if (autoServiceTimer) return;

  isAutoServing = true;

  // 1.0s auto preparation
  autoServiceTimer = setTimeout(() => {
    if (state.screen !== 'SHOP' || state.selected !== currentCustomer.id) {
      isAutoServing = false;
      return;
    }
    
    // Auto-populate all needed ingredients cleanly
    state.draft = { ...needed };
    playChime();
    render();
    
    // Auto commit after 350ms dish showcase
    autoServiceTimer = setTimeout(() => {
      if (state.screen !== 'SHOP' || state.selected !== currentCustomer.id) {
        isAutoServing = false;
        return;
      }
      isAutoServing = false;
      autoServiceTimer = null;
      send('COMMIT');
    }, 350);
  }, 1000);
}

// Bé Tí animation loop manager
function startBetiAnimation() {
  if (betiAnimationTimer) clearTimeout(betiAnimationTimer);
  betiFrameIdx = 0;
  
  const tick = () => {
    const el = document.getElementById('beti-sprite-img');
    if (!el) return;
    
    const frames = BETI_SPRITES.order;
    const delays = [200, 250, 450, 550];
    const delay = delays[betiFrameIdx] || 400;
    
    betiFrameIdx = (betiFrameIdx + 1) % frames.length;
    el.src = frames[betiFrameIdx];
    betiAnimationTimer = setTimeout(tick, delay);
  };

  betiAnimationTimer = setTimeout(tick, 300);
}

// -------------------------------------------------------------
// MAIN GAME VIEWS
// -------------------------------------------------------------

function renderHome() {
  return `
    <div class="title-cover-wrapper">
      <div class="title-header-box">
        <span class="title-badge">🏮 PHIÊN BẢN CHƠI THỬ · NGÀY 1</span>
        <h1 class="title-main-logo">XÓM NHỎ</h1>
        <p class="title-sub-text">Chuyện Làm Ăn Quán Phố · Sài Gòn 2000s</p>
      </div>

      <div class="title-card-footer">
        <div style="font-size: 13.5px; line-height: 1.6; color: var(--text-muted); margin-bottom: 16px;">
          Chào buổi sáng! Quầy bánh mì nhỏ của bạn mở đầu ngày với <b>60.000đ</b> tiền vốn. 
          Hãy ra chợ nhập nguyên liệu tươi ngon, dọn quầy đón <b>Bé Tí</b>, <b>Cô Chín</b> và <b>Anh Tùng</b> nhé!
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button class="btn-primary btn-wide" data-type="NAVIGATE" style="font-size: 16px;">
            🌿 Bắt Đầu Mở Quán Hôm Nay
          </button>
          ${saved && saved.screen !== 'HOME' ? `<button class="btn-secondary btn-wide" data-type="RESUME">Tiếp tục ngày đang chơi</button>` : ''}
          <button class="btn-secondary" data-type="REPLAY" style="font-size: 12.5px;">Chơi lại từ đầu</button>
        </div>
      </div>
    </div>
  `;
}

function renderXomOi() {
  return `
    <div class="story-card" style="max-width: 650px; margin: 30px auto; width: calc(100% - 32px);">
      <div class="story-header">
        <span style="font-size: 28px;">🌤️</span>
        <h2 style="font-size: 20px;">Xóm Ơi · Tiếng Rao Buổi Sớm</h2>
      </div>
      <p style="font-size: 14.5px; line-height: 1.6;">
        Nắng sớm len lỏi qua giàn hoa giấy rực rỡ đầu ngõ. Tiếng chổi tre quét lá xào xạc hòa cùng tiếng còi xe máy rộn rã. 
        Trời hôm nay oi ả lắm, mấy món giải nhiệt có đá lạnh và tắc chua ngọt chắc chắn sẽ đắt khách.
      </p>
      <p style="font-size: 14.5px; line-height: 1.6;">
        Trưa nay, <b>Bé Tí</b> thế nào cũng ghé quán ăn bánh mì lót dạ. 
        <b>Cô Chín</b> đi chợ về và <b>Anh Tùng</b> chạy xe ôm cũng sẽ dừng lại trước quầy làm ly nước giải khát.
      </p>
      
      <div class="story-tip" style="margin: 16px 0;">
        💡 <b>Mẹo nhập hàng:</b> Đá bi và nước đường dùng chung cho cả Trà tắc và Sữa đậu đá. Nhớ mua dư một chút chả lụa nếu muốn chiều lòng Bé Tí nhé!
      </div>

      <div style="margin-top: 24px;">
        <button class="btn-primary btn-wide" data-type="NAVIGATE" style="font-size: 16px;">
          🛒 Ra Chợ Đầu Ngõ Nhập Hàng
        </button>
      </div>
    </div>
  `;
}

function renderMarket() {
  const basketCost = total(state.basket);
  const remainingCash = state.cash - basketCost;
  const canBuy = basketCost > 0 && remainingCash >= 0;

  return `
    <div class="story-card" style="max-width: 680px; margin: 20px auto; width: calc(100% - 32px);">
      <div class="story-header" style="justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 12px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size: 26px;">🏪</span>
          <div>
            <h2 style="font-size: 18px; margin: 0;">Sạp Chợ Đầu Ngõ</h2>
            <small style="color: var(--text-light); font-size: 12px;">Mua nguyên liệu tươi về phục vụ 3 người khách</small>
          </div>
        </div>
        <div class="wallet-badge">💵 ${money(state.cash)}</div>
      </div>
      
      <!-- Gợi ý combo mua nhanh Ngày 1 -->
      <div style="background: #fdf5ea; border: 1.5px dashed #d97706; border-radius: 12px; padding: 12px 14px; margin: 14px 0;">
        <div style="font-size: 13.5px; font-weight: 700; color: #7c2d12; margin-bottom: 2px;">
          ⚡ Gợi Ý Mua Nhanh Cho Ngày 1 (3 khách):
        </div>
        <div style="font-size: 12px; color: #78350f; margin-bottom: 8px;">
          Tự động chọn đủ Bánh mì chả thêm chả (Bé Tí), Trà tắc (Cô Chín) và Sữa đậu đá (Anh Tùng).
        </div>
        <button class="btn-secondary" data-type="BUNDLE_DAY1" style="font-size: 13px; padding: 8px 14px; width: 100%; border: 1.5px solid #d97706; background: #fffdf9;">
          🧺 Tự động chọn combo chuẩn 3 khách (48.000đ)
        </button>
      </div>

      <div class="market-table">
        ${Object.entries(ingredients).map(([id, item]) => {
          const meta = ingredientMeta[id] || { icon: '📦', unit: 'phần' };
          const qty = state.basket[id] || 0;
          return `
            <div class="market-item-row">
              <div class="market-item-info">
                <span class="market-item-icon">${meta.icon}</span>
                <div class="market-item-text">
                  <strong>${item.name}</strong><br>
                  <small>${money(item.price)} / ${meta.unit}</small>
                </div>
              </div>
              <div class="market-stepper">
                <button class="btn-stepper" data-type="BASKET" data-payload="${id}:${Math.max(0, qty - 1)}">−</button>
                <span class="stepper-val">${qty}</span>
                <button class="btn-stepper" data-type="BASKET" data-payload="${id}:${qty + 1}">+</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Basket summary bar -->
      <div style="background: #fdf5ea; border: 1.5px solid #ebd3b6; border-radius: 14px; padding: 14px; margin-top: 16px;">
        <div style="display:flex; justify-content:space-between; font-size: 14px; margin-bottom: 6px;">
          <span>Tiền hàng trong giỏ:</span>
          <strong style="color: #c2410c; font-size: 16px;">${money(basketCost)}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; font-size: 14px;">
          <span>Tiền mặt còn lại:</span>
          <strong style="color: ${remainingCash < 0 ? '#dc2626' : '#15803d'}; font-size: 16px;">${money(remainingCash)}</strong>
        </div>
      </div>

      <button class="btn-primary btn-wide" data-type="BUY" ${!canBuy ? 'disabled' : ''} style="margin-top: 16px; font-size: 16px;">
        ${remainingCash < 0 ? '❌ Không đủ tiền mặt' : basketCost === 0 ? '👉 Hãy chọn nguyên liệu' : '🥖 Mang Hàng Về Mở Quán Ngay!'}
      </button>
    </div>
  `;
}

// -------------------------------------------------------------
// FIRST-PERSON COOKING STAGE (SHOP)
// -------------------------------------------------------------
function renderShop() {
  const currentCustomer = customers.find(c => c.id === state.selected);
  const isBeti = currentCustomer && currentCustomer.id === 'be_ti';
  const isCoChin = currentCustomer && currentCustomer.id === 'co_chin';
  const isAnhTung = currentCustomer && currentCustomer.id === 'anh_tung';

  let targetRecipe = null;
  let needed = {};
  let neededKeys = [];
  let isReadyToCommit = false;
  let isMissingStock = false;
  let checklist = [];

  if (currentCustomer) {
    targetRecipe = recipes[currentCustomer.recipe];
    needed = needFor(currentCustomer.id, state.extraCha);
    neededKeys = Object.keys(needed);
    isReadyToCommit = equalCounts(state.draft, needed);

    for (const [ingId, reqQty] of Object.entries(needed)) {
      const draftQty = state.draft[ingId] || 0;
      const stockQty = state.stock[ingId] || 0;
      const isDone = draftQty === reqQty;
      const isOver = draftQty > reqQty;
      if (stockQty < reqQty) isMissingStock = true;
      checklist.push({
        id: ingId,
        meta: ingredientMeta[ingId],
        reqQty,
        draftQty,
        stockQty,
        isDone,
        isOver
      });
    }
  }

  // Active preparation dish type
  const isBanhMiOrder = currentCustomer && currentCustomer.recipe === 'BANH_MI_CHA';
  const isDrinkOrder = currentCustomer && currentCustomer.recipe !== 'BANH_MI_CHA';

  return `
    <div class="cooking-stage-container">
      <!-- 1. UPPER HALF: THE STREET WINDOW WITH ACTIVE CUSTOMER -->
      <div class="street-window-view">
        <div class="street-window-overlay"></div>

        <!-- Neighborhood Queue Tracker -->
        <div class="queue-tracker-hud">
          ${customers.map(c => {
            const isServed = state.served.includes(c.id);
            const isCurrent = state.selected === c.id;
            return `
              <div class="queue-dot ${isServed ? 'served' : isCurrent ? 'current' : ''}">
                ${isServed ? '✓' : isCurrent ? '⭐' : '⏳'} ${c.name}
              </div>
            `;
          }).join('')}
        </div>

        <!-- 2.1 Ambient Loops: Grill Smoke & Swaying Lantern -->
        <div class="ambient-lantern">🏮</div>
        <div class="grill-smoke-emitter">
          <span class="smoke-puff s1"></span>
          <span class="smoke-puff s2"></span>
          <span class="smoke-puff s3"></span>
        </div>

        <!-- 2.3 Camera Cutscene Flash when new customer arrives -->
        ${customerTransitionState === 'entering' ? `<div class="camera-cutscene-flash"></div>` : ''}

        <!-- Counter Sill Bar (3D foreground edge in front of customer) -->
        <div class="counter-sill-bar"></div>

        <!-- Juice: Floating Cash & Particle Bursts -->
        ${floatingCash ? `<div class="floating-cash-popup">${floatingCash}</div>` : ''}
        ${showParticles ? `
          <div class="serve-particles-burst">
            <span class="spark-dot d1"></span>
            <span class="spark-dot d2"></span>
            <span class="spark-dot d3"></span>
            <span class="spark-dot d4"></span>
          </div>
        ` : ''}

        <!-- Active Customer Standing in Front of Counter -->
        ${currentCustomer ? `
          <div class="active-customer-spot ${customerTransitionState === 'entering' ? 'customer-entering' : customerTransitionState === 'leaving' ? 'customer-leaving' : ''}">
            <div class="customer-avatar-box">
              ${isBeti ? `<img id="beti-sprite-img" src="${BETI_SPRITES.order[0]}" alt="Bé Tí">` : ''}
              ${isCoChin ? `<img src="${CO_CHIN_IMG}" alt="Cô Chín">` : ''}
              ${isAnhTung ? `<img src="${ANH_TUNG_IMG}" alt="Anh Tùng">` : ''}
            </div>
          </div>

          <!-- Floating Order Speech Bubble - Sleek & Compact with Auto-Fade -->
          <div class="customer-order-bubble ${speechBubbleHidden ? 'bubble-faded' : ''}">
            <div class="order-dish-badge">
              ${isBanhMiOrder ? '🥖' : isCoChin ? '🍊' : '🥛'}
            </div>
            <div class="order-bubble-text">
              <div class="bubble-header-line">
                <strong>${currentCustomer.name}</strong>
                <span class="bubble-recipe-pill">${targetRecipe.name} · +${money(targetRecipe.price)}</span>
              </div>
              <p class="bubble-dialogue-line">
                ${isBeti ? '"Chú ơi cho con ổ Bánh mì chả, chú cho con xin thêm chả nghen!"' 
                  : isCoChin ? '"Cho cô ly Trà tắc nhiều đá mát lạnh nghen con!"' 
                  : '"Cho anh ly Sữa đậu đá nhiều đá mát rượi em ơi!"'}
              </p>
              ${isBeti && state.extraCha === null ? `
                <div class="special-request-actions">
                  <button class="btn-mini-action btn-primary" data-type="EXTRA" data-payload="yes">
                    👍 Thêm chả cho con (+1 chả)
                  </button>
                  <button class="btn-mini-action btn-secondary" data-type="EXTRA" data-payload="no">
                    Ăn phần thường nha (1 chả)
                  </button>
                </div>
              ` : isBeti && state.extraCha !== null ? `
                <span class="special-confirmed-tag">${state.extraCha ? '✓ Đã đồng ý thêm chả' : '✓ Bán phần thường'}</span>
              ` : ''}
            </div>
            
            ${isMissingStock ? `
              <button class="btn-secondary btn-skip-order" data-type="SKIP">
                Hết hàng<br>(Qua lượt)
              </button>
            ` : ''}
          </div>
        ` : ''}
      </div>

      <!-- 2. LOWER HALF: COOKING FEVER PREP COUNTER -->
      <div class="counter-prep-deck">
        <!-- Workstation Row: Cutting Board (Bánh mì) & Drink Station -->
        <div class="workstation-row">
          <!-- Workstation 1: Bàn Làm Bánh Mì -->
          <div class="prep-workstation ${isBanhMiOrder ? 'active-target' : ''}">
            <div class="workstation-title">
              <span>🥖 Quầy Bánh Mì</span>
              ${isBanhMiOrder ? `<span style="color:#c2410c; font-size:11px;">Món đang chuẩn bị</span>` : ''}
            </div>

            <div class="prep-visual-slot">
              ${isBanhMiOrder && isReadyToCommit ? `
                <div class="finished-dish-wrap">
                  <img class="dish-preview-img" src="${DISH_IMAGES.BANH_MI_CHA}" alt="Bánh Mì Chả Hoàn Thành">
                  <span class="dish-sparkle-badge">✨ Bánh mì nóng giòn!</span>
                </div>
              ` : isBanhMiOrder && Object.keys(state.draft).length > 0 ? `
                <div class="assembly-cutting-board">
                  <div class="board-layer bread-layer ${state.draft.bread ? 'has-item' : ''}">
                    ${state.draft.bread ? '🥖 Ổ bánh mì vàng giòn đã mổ bụng' : '⚪ Chưa bỏ bánh mì'}
                  </div>
                  <div class="board-layer-row">
                    ${state.draft.cha ? `<span class="board-token cha-token">🍖 Chả lụa x${state.draft.cha}</span>` : ''}
                    ${state.draft.vegetable ? `<span class="board-token veg-token">🥒 Dưa ngò x${state.draft.vegetable}</span>` : ''}
                  </div>
                </div>
              ` : `
                <div class="prep-empty-hint">
                  ${isBanhMiOrder ? 'Chạm vào khay Bánh mì, Chả lụa, Dưa ngò bên dưới để kẹp bánh!' : 'Khay chờ làm bánh mì'}
                </div>
              `}
            </div>

            <!-- Checklist cho Bánh Mì -->
            ${isBanhMiOrder ? `
              <div class="checklist-chips">
                ${checklist.map(item => `
                  <span class="checklist-chip ${item.isDone ? 'done' : item.isOver ? 'over' : ''}">
                    ${item.meta.icon} ${item.meta.name}: ${item.draftQty}/${item.reqQty} ${item.isDone ? '✓' : ''}
                  </span>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <!-- Workstation 2: Quầy Pha Nước Giải Khát -->
          <div class="prep-workstation ${isDrinkOrder ? 'active-target' : ''}">
            <div class="workstation-title">
              <span>🥤 Quầy Nước Giải Khát</span>
              ${isDrinkOrder ? `<span style="color:#0284c7; font-size:11px;">Món đang chuẩn bị</span>` : ''}
            </div>

            ${isDrinkOrder && isAutoServing ? `
              <div class="auto-service-indicator">
                <div class="auto-service-bar"><div class="auto-service-fill"></div></div>
                <span class="auto-service-label">⚡ Đang tự động pha...</span>
              </div>
            ` : ''}

            <div class="prep-visual-slot">
              ${isDrinkOrder && isReadyToCommit ? `
                <div class="finished-dish-wrap">
                  <img class="dish-preview-img" src="${DISH_IMAGES[currentCustomer.recipe]}" alt="Nước Uống Hoàn Thành">
                  <span class="dish-sparkle-badge">✨ Nước mát lạnh giải khát!</span>
                </div>
              ` : isDrinkOrder && Object.keys(state.draft).length > 0 ? `
                <div class="assembly-drink-glass">
                  <div class="drink-cup-icon">🥤</div>
                  <div class="drink-layers-col">
                    ${state.draft.ice ? `<span class="board-token ice-token">🧊 Đá bi x${state.draft.ice}</span>` : ''}
                    ${state.draft.sugar_syrup ? `<span class="board-token syrup-token">🍯 Nước đường x${state.draft.sugar_syrup}</span>` : ''}
                    ${state.draft.kumquat ? `<span class="board-token kumquat-token">🍊 Tắc tươi x${state.draft.kumquat}</span>` : ''}
                    ${state.draft.soy_milk ? `<span class="board-token soy-token">🥛 Sữa đậu x${state.draft.soy_milk}</span>` : ''}
                  </div>
                </div>
              ` : `
                <div class="prep-empty-hint">
                  ${isDrinkOrder ? 'Chạm Đá, Đường và Tắc / Sữa đậu bên dưới để pha nước!' : 'Khay chờ pha nước giải khát'}
                </div>
              `}
            </div>

            <!-- Checklist cho Nước -->
            ${isDrinkOrder ? `
              <div class="checklist-chips">
                ${checklist.map(item => `
                  <span class="checklist-chip ${item.isDone ? 'done' : item.isOver ? 'over' : ''}">
                    ${item.meta.icon} ${item.meta.name}: ${item.draftQty}/${item.reqQty} ${item.isDone ? '✓' : ''}
                  </span>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- 3. INGREDIENT TRAYS ON COUNTER (KHAY INOX NGUYÊN LIỆU) -->
        <div class="ingredient-tray-rack">
          ${Object.entries(ingredients).map(([id, item]) => {
            const meta = ingredientMeta[id];
            const stockQty = state.stock[id] || 0;
            const isNeeded = neededKeys.includes(id);
            return `
              <button class="tray-button ${isNeeded ? 'needed' : ''}" data-type="TAP" data-payload="${id}" ${stockQty <= 0 ? 'disabled' : ''}>
                <span class="tray-icon">${meta.icon}</span>
                <span class="tray-name">${meta.name}</span>
                <span class="tray-stock">Còn: ${stockQty}</span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- 4. BOTTOM ACTION BAR: SERVE DISH OR TRASH -->
        <div class="counter-actions-bar">
          <button class="btn-secondary" data-type="CLEAR" ${Object.keys(state.draft).length === 0 ? 'disabled' : ''} style="padding:10px 14px; font-size:12.5px;">
            🗑️ Làm Lại
          </button>
          
          <button class="btn-serve ${isReadyToCommit ? 'pulse-ready' : ''}" data-type="COMMIT" ${!isReadyToCommit ? 'disabled' : ''}>
            ${isReadyToCommit ? `✨ GIAO MÓN CHO ${currentCustomer.name.toUpperCase()} (+${money(targetRecipe.price)})` : '🥢 Đang chuẩn bị món...'}
          </button>

          <button class="btn-secondary" data-type="CLOSE" style="font-size:12px; padding:10px 12px; white-space:nowrap;">
            Đóng Quán
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderDayResult() {
  const profit = state.revenue - state.spent;

  return `
    <div class="notebook-card" style="max-width: 680px; margin: 24px auto; width: calc(100% - 32px);">
      <div class="notebook-title">
        📖 SỔ GHI TIỀN QUÁN XÓM NHỎ<br>
        <small style="font-size: 13px; font-weight: normal; color: #78350f;">Ngày 1 · Tổng kết kinh doanh buổi đầu</small>
      </div>

      <div class="ledger-line">
        <span>Tiền vốn đầu ngày:</span>
        <strong>60.000đ</strong>
      </div>
      <div class="ledger-line">
        <span>Chi phí đi chợ nhập hàng:</span>
        <strong style="color: #dc2626;">-${money(state.spent)}</strong>
      </div>
      <div class="ledger-line">
        <span>Doanh thu bán bánh & nước:</span>
        <strong style="color: #16a34a;">+${money(state.revenue)}</strong>
      </div>
      <div class="ledger-line ledger-profit">
        <span>LỢI NHUẬN RÒNG HÔM NAY:</span>
        <span>+${money(profit)}</span>
      </div>
      <div class="ledger-line" style="font-weight: 700; color: #7c2d12;">
        <span>Tổng tiền mặt trong két:</span>
        <span>${money(state.cash)}</span>
      </div>

      <!-- Chuyện xóm ghi chép -->
      <div class="journal-section">
        <strong style="color: #7c2d12; font-size: 13.5px;">📝 Chuyện Xóm Sau Giờ Bán:</strong>
        <div class="journal-item">
          • <b>Bé Tí:</b> ${state.served.includes('be_ti') 
              ? (state.extraCha ? 'Cầm ổ bánh mì thêm chả cười tít mắt, tấm tắc khen chú làm ngon rồi hứa mai tan học ghé tiếp!' : 'Ăn ổ bánh mì chả ngon lành rồi chào chú chạy về học bài.') 
              : 'Đợi lâu quá nên đành bụng đói đi về, hôm nay lỡ mất một lượt khách quen.'}
        </div>
        <div class="journal-item">
          • <b>Cô Chín:</b> ${state.served.includes('co_chin') 
              ? 'Uống ly trà tắc mát lạnh, khen quán pha vừa miệng chua ngọt thanh tao, bảo trưa mai sẽ ghé ủng hộ.' 
              : 'Không mua được nước giải khát, phải đi tiếp về nhà.'}
        </div>
        <div class="journal-item">
          • <b>Anh Tùng:</b> ${state.served.includes('anh_tung') 
              ? 'Uống ực một hơi ly sữa đậu mát rượi, khen quán chu đáo rồi nổ máy chạy cuốc xe ôm trưa.' 
              : 'Vội chạy cuốc khách nên không kịp uống nước.'}
        </div>
      </div>

      <!-- Hook ngày mai -->
      <div style="background: #fef3c7; border: 1.5px dashed #d97706; padding: 12px; border-radius: 10px; margin-top: 16px; font-size: 13px; color: #92400e;">
        🌟 <b>Gợi ý ngày mai:</b> Nghe mấy cô đầu chợ đồn ngày mai có mối giao trứng gà tươi giá mềm. Quán mình sắp có thể bán thêm món <b>Bánh Mì Ốp-La</b> rồi đấy!
      </div>

      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button class="btn-primary btn-wide" data-type="REPLAY" style="font-size: 15px;">
          🔄 Mở Quán Chơi Lại Ngày 1
        </button>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// RENDER CONTROLLER
// -------------------------------------------------------------
function render() {
  ensureActiveCustomer();

  let content = '';
  if (state.screen === 'HOME') content = renderHome();
  else if (state.screen === 'XOM_OI') content = renderXomOi();
  else if (state.screen === 'MARKET') content = renderMarket();
  else if (state.screen === 'SHOP') content = renderShop();
  else if (state.screen === 'DAY_RESULT') content = renderDayResult();

  $.innerHTML = `
    <header class="top-nav">
      <div class="brand-title">
        <span>XÓM NHỎ</span>
        <small>Ngày 1 · ${state.screen}</small>
      </div>
      <div class="wallet-badge">
        💵 ${money(state.cash)}
      </div>
    </header>

    <div class="view-container">
      ${message ? `<div class="toast-msg">⚠️ ${message}</div>` : ''}
      ${lastServedToast ? `<div class="toast-msg" style="background:#dcfce7; border-color:#22c55e; color:#15803d;">🎉 ${lastServedToast}</div>` : ''}
      ${content}
    </div>
  `;

  // Start Bé Tí animation if Bé Tí is active customer in SHOP
  if (state.screen === 'SHOP' && state.selected === 'be_ti') {
    startBetiAnimation();
  } else if (betiAnimationTimer) {
    clearTimeout(betiAnimationTimer);
    betiAnimationTimer = null;
  }

  // Trigger Auto-Service for regular orders in SHOP
  if (state.screen === 'SHOP') {
    checkAutoService();
  }
}

// Event delegation
$.addEventListener('click', e => {
  const b = e.target.closest('[data-type]');
  if (!b) return;
  
  const t = b.dataset.type;
  const p = b.dataset.payload;

  if (t === 'RESUME') {
    if (saved) {
      state = saved;
      message = '';
      render();
    }
    return;
  }

  if (t === 'REPLAY' && !confirm('Chơi lại sẽ đặt lại toàn bộ Ngày 1. Bạn chắc chắn chứ?')) {
    return;
  }

  lastServedToast = null;

  if (t === 'BUNDLE_DAY1') {
    const bundle = {
      bread: 1,
      cha: 2,
      vegetable: 1,
      ice: 2,
      sugar_syrup: 2,
      kumquat: 1,
      soy_milk: 1
    };
    for (const [id, qty] of Object.entries(bundle)) {
      const r = action(state, 'BASKET', { id, qty });
      if (!r.error) state = r.state;
    }
    persist();
    render();
    return;
  }

  if (t === 'BASKET') {
    const [id, qty] = p.split(':');
    send(t, { id, qty: Number(qty) });
  } else if (t === 'EXTRA') {
    send(t, p === 'yes');
  } else {
    send(t, p);
  }
});

// Initial boot
render();
