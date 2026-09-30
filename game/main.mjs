import {
  ingredients,
  recipes,
  fixtureCustomers,
  SAVE_KEY,
  BIKE_CAPACITY,
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
  normal: [
    ASSET_BASE + 'queue_wait_normal_pilot/actor_crop/queue_wait_normal_01.png',
    ASSET_BASE + 'queue_wait_normal_pilot/actor_crop/queue_wait_normal_02.png',
    ASSET_BASE + 'queue_wait_normal_pilot/actor_crop/queue_wait_normal_03.png',
    ASSET_BASE + 'queue_wait_normal_pilot/actor_crop/queue_wait_normal_04.png'
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

const ingredientMeta = {
  bread: { name: 'Bánh mì', icon: '🥖', unit: 'ổ', img: '../assets/ingredients/bread.png' },
  cha: { name: 'Chả lụa', icon: '🍖', unit: 'khoanh', img: '../assets/ingredients/cha.png' },
  vegetable: { name: 'Dưa ngò', icon: '🥒', unit: 'phần', img: '../assets/ingredients/vegetable.png' },
  ice: { name: 'Đá bi', icon: '🧊', unit: 'ca', img: '../assets/ingredients/ice.png' },
  sugar_syrup: { name: 'Nước đường', icon: '🍯', unit: 'muỗng', img: '../assets/ingredients/sugar_syrup.png' },
  kumquat: { name: 'Tắc tươi', icon: '🍊', unit: 'trái', img: '../assets/ingredients/kumquat.png' },
  soy_milk: { name: 'Sữa đậu', icon: '🥛', unit: 'bịch', img: '../assets/ingredients/soy_milk.png' }
};

// Audio synthesis
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

function playTap(type = 'default') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
const load = () => [0, 1].map(i => decode(localStorage.getItem(SAVE_KEY + ':' + i))).filter(Boolean).sort((a, b) => b.revision - a.revision)[0] || null;
let saved = load();
let state = saved || fresh();
let message = '';

// Simulation and Animation State
let simInterval = null;
let betiFrameIdx = 0;
let betiAnimTimer = null;
let autoPrepState = null; // { stage: 'bread'|'cha'|'veg'|'done', progress: number, item: recipeId, isExtra: boolean }
let floatingCash = null; // e.g. "+25.000đ"
let customerReaction = null; // { quote: string, status: 'happy'|'disappointed' }
let prepTimer1 = null;
let prepTimer2 = null;
let prepTimer3 = null;
let leaveTimer = null;

const money = n => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

function persist() {
  localStorage.setItem(SAVE_KEY + ':' + (state.revision % 2), encode(state));
  saved = state;
}

function clearAllTimers() {
  if (simInterval) { clearInterval(simInterval); simInterval = null; }
  if (betiAnimTimer) { clearInterval(betiAnimTimer); betiAnimTimer = null; }
  if (prepTimer1) { clearTimeout(prepTimer1); prepTimer1 = null; }
  if (prepTimer2) { clearTimeout(prepTimer2); prepTimer2 = null; }
  if (prepTimer3) { clearTimeout(prepTimer3); prepTimer3 = null; }
  if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
}

function send(type, payload) {
  if (type === 'REPLAY') {
    clearAllTimers();
    localStorage.removeItem(SAVE_KEY + ':0');
    localStorage.removeItem(SAVE_KEY + ':1');
    autoPrepState = null;
    floatingCash = null;
    customerReaction = null;
    state = fresh();
    persist();
    render();
    return;
  }

  const r = action(state, type, payload);
  if (r.error) {
    message = r.error;
    render();
    return;
  }

  state = r.state;
  message = '';
  persist();

  // Handle simulation lifecycle when entering/leaving SHOP
  if (state.screen === 'SHOP') {
    startSimulationLoop();
  } else {
    clearAllTimers();
  }

  render();
}

function startSimulationLoop() {
  if (simInterval) clearInterval(simInterval);
  const intervalMs = state.speed === 2 ? 140 : 280;
  
  // Hydration recovery: if customer was already served/handled before reload, schedule departure
  if (state.activeCustomer) {
    const custStatus = state.activeCustomer.status;
    if (['SERVED', 'OUT_OF_STOCK', 'MENU_DISABLED', 'PRICE_REJECTED'].includes(custStatus)) {
      leaveTimer = setTimeout(() => {
        send('CUSTOMER_LEAVE');
        render();
      }, 600);
    } else if (custStatus === 'ARRIVED' && !state.isPaused && !autoPrepState) {
      runAutoPrepSequence();
    }
  }
  
  simInterval = setInterval(() => {
    if (state.screen !== 'SHOP') {
      clearInterval(simInterval);
      return;
    }
    
    // If decision modal is active or auto-prep in progress, do not advance clock
    if (state.isPaused || autoPrepState) {
      return;
    }

    // Advance clock
    send('TICK', 3);

    // If a customer just arrived and is ready for auto-prep
    if (state.activeCustomer && state.activeCustomer.status === 'ARRIVED' && !state.isPaused && !autoPrepState) {
      runAutoPrepSequence();
    }
  }, intervalMs);
}

function runAutoPrepSequence() {
  const cust = state.activeCustomer;
  if (!cust) return;

  const recipeId = cust.recipe;
  const isExtra = cust.id === 'be_ti' && state.extraCha === true;
  const needs = recipeNeeds(recipeId, isExtra);
  const menuItem = state.menu[recipeId];
  const recipeDef = recipes[recipeId];

  // 1. Check if recipe is disabled on today's menu
  if (!menuItem || !menuItem.enabled) {
    autoPrepState = { stage: 'menudisabled', progress: 100, item: recipeId, isExtra };
    render();

    prepTimer1 = setTimeout(() => {
      send('SERVE_AUTO');
      customerReaction = {
        quote: `Ủa nay quán không bán ${recipeDef?.name || 'món này'} hả chú? Tiếc ghê, để bữa khác con ghé lại nha!`,
        status: 'disappointed'
      };
      render();

      leaveTimer = setTimeout(() => {
        customerReaction = null;
        autoPrepState = null;
        send('CUSTOMER_LEAVE');
        render();
      }, 1500);
    }, 700);
    return;
  }

  // 2. Check customer price sensitivity (HIGH sensitivity vs Tier 3 High Price)
  if (menuItem.sellPrice > recipeDef.basePrice && cust.priceSensitivity === 'HIGH') {
    autoPrepState = { stage: 'pricerejected', progress: 100, item: recipeId, isExtra };
    render();

    prepTimer1 = setTimeout(() => {
      send('SERVE_AUTO');
      customerReaction = {
        quote: `Ủa nay ${recipeDef?.name || 'món này'} lên tới ${money(menuItem.sellPrice)} dữ vậy chú? Mắc quá, thôi để bác đi chỗ khác!`,
        status: 'angry'
      };
      render();

      leaveTimer = setTimeout(() => {
        customerReaction = null;
        autoPrepState = null;
        send('CUSTOMER_LEAVE');
        render();
      }, 1500);
    }, 700);
    return;
  }

  // 3. Check inventory stock
  if (!hasEnoughStock(state.stock, needs)) {
    autoPrepState = { stage: 'outofstock', progress: 100, item: recipeId, isExtra };
    render();

    prepTimer1 = setTimeout(() => {
      send('SERVE_AUTO');
      customerReaction = {
        quote: 'Hết hàng rồi hả chú? Tiếc quá, để mai con ghé sớm ủng hộ tiếp nha!',
        status: 'disappointed'
      };
      render();

      leaveTimer = setTimeout(() => {
        customerReaction = null;
        autoPrepState = null;
        send('CUSTOMER_LEAVE');
        render();
      }, 1500);
    }, 700);
    return;
  }

  // 4. Watercolor 3-Stage Auto-Prep Animation Sequence (1.4s total)
  // Stage 1 (0ms): Base layer (bread base / ice cup)
  autoPrepState = { stage: 'layer1', progress: 33, item: recipeId, isExtra };
  playTap('bread');
  render();

  // Stage 2 (450ms): Middle filling/juice layer (cha slices / kumquat syrup / soy milk)
  prepTimer1 = setTimeout(() => {
    autoPrepState = { stage: 'layer2', progress: 70, item: recipeId, isExtra };
    playTap('cha');
    render();

    // Stage 3 (900ms): Complete dish with herbs / chill / garnish
    prepTimer2 = setTimeout(() => {
      autoPrepState = { stage: 'done', progress: 100, item: recipeId, isExtra };
      playChime();
      playCoins();
      render();

      // Transaction commit (1350ms)
      prepTimer3 = setTimeout(() => {
        const earned = menuItem.sellPrice;
        floatingCash = '+' + money(earned);
        send('SERVE_AUTO');

        let quote = 'Cảm ơn chú nhiều nghen, món ngon vừa miệng lắm!';
        if (cust.id === 'be_ti') {
          quote = isExtra 
            ? 'Oa chả ngập tràn luôn, con cảm ơn chú nhiều lắm! Mai con ghé tiếp!'
            : 'Bánh mì giòn rụm thơm phức, con cảm ơn chú nghen!';
        } else if (cust.id === 'co_chin') {
          quote = 'Trà tắc mát rượi thanh tao, đã khát thiệt đó con ơi!';
        } else if (cust.id === 'anh_tung') {
          quote = 'Sữa đậu béo bùi mát lạnh, tỉnh cả người em ơi! Anh chạy cuốc trưa đây!';
        } else if (cust.priceSensitivity === 'LOW' && menuItem.sellPrice > recipeDef.basePrice) {
          quote = 'Giá nay hơi nhỉnh xíu ha chú, mà thèm quá nên mua luôn nè!';
        } else if (menuItem.sellPrice < recipeDef.basePrice) {
          quote = 'Quán bán giá mềm mà chất lượng ghê, để bác rủ thêm người ủng hộ!';
        }

        customerReaction = { quote, status: 'happy' };
        render();

        leaveTimer = setTimeout(() => {
          floatingCash = null;
          customerReaction = null;
          autoPrepState = null;
          send('CUSTOMER_LEAVE');
          render();
        }, 1400);
      }, 400);
    }, 450);
  }, 450);
}

// ─────────────────────────────────────────────────────────────
// RENDERERS
// ─────────────────────────────────────────────────────────────

function renderHome() {
  return `
    <div class="screen-home">
      <div class="cover-hero">
        <span class="cover-tag">🏮 PHIÊN BẢN CHƠI THỬ · IDLE MANAGEMENT</span>
        <h1 class="cover-brand">XÓM NHỎ</h1>
        <p class="cover-sub">Chuyện Làm Ăn Buôn Bán Quán Phố</p>
      </div>
      <div class="cover-card">
        <p class="cover-desc">
          Quản lý quán ăn nhỏ trong con hẻm Sài Gòn.<br>
          Dự tính nhu cầu, đặt giá bán, mở quán tự bán và xử lý tình huống phát sinh cùng bà con chòm xóm.
        </p>
        <button class="btn-primary" data-type="NAVIGATE">🌿 Bắt Đầu Mở Quán Ngày 1</button>
        ${saved ? `<button class="btn-secondary" data-type="RESUME">Tiếp Tục Ca Bán Đang Chơi</button>` : ''}
        <button class="btn-tertiary" data-type="REPLAY">🔄 Đặt Lại / Chơi Lại Từ Đầu</button>
      </div>
    </div>
  `;
}

function renderXomOi() {
  return `
    <header class="top-nav">
      <div class="brand-title">XÓM NHỎ <small>Tin Buổi Sớm</small></div>
      <div class="wallet-badge">💵 ${money(state.cash)}</div>
    </header>
    <div class="story-screen">
      <div class="story-card">
        <h2>🌤️ Xóm Ơi · Tiếng Chổi Tre Quét Sớm</h2>
        <p>Nắng sớm len lỏi qua giàn hoa giấy tím trước hiên nhà. Mùi cà phê thơm lừng quyện cùng tiếng còi xe máy đầu hẻm báo hiệu một ngày buôn bán mới.</p>
        
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

        <button class="btn-primary" data-type="NAVIGATE" style="margin-top: 18px;">🛒 Ra Chợ Đầu Ngõ Nhập Hàng</button>
      </div>
    </div>
  `;
}

function renderMarket() {
  const currentBasketUnits = totalBasketUnits(state.basket);
  const currentBasketCost = totalBasketCost(state.basket);
  const remainingCash = state.cash - currentBasketCost;

  return `
    <header class="top-nav">
      <div class="brand-title">XÓM NHỎ <small>Chợ Đầu Ngõ</small></div>
      <div class="wallet-badge">💵 ${money(state.cash)}</div>
    </header>
    <div class="market-screen">
      <div class="capacity-banner">
        <div class="capacity-header">
          <span>🚲 Sức chở xe đạp hàng:</span>
          <strong>${currentBasketUnits} / ${BIKE_CAPACITY} đơn vị</strong>
        </div>
        <div class="capacity-bar-track">
          <div class="capacity-bar-fill ${currentBasketUnits > BIKE_CAPACITY ? 'overflow' : ''}" style="width: ${Math.min(100, (currentBasketUnits / BIKE_CAPACITY) * 100)}%;"></div>
        </div>
      </div>

      <div class="bundle-quick-row">
        <button class="btn-bundle" data-type="BUNDLE_DAY1">
          <span>🌟 Chọn Gói Gợi Ý Day 1 (55.000đ)</span>
          <small>3 Bánh mì, 4 Chả, 3 Dưa, 3 Đá, 3 Đường, 2 Tắc, 1 Sữa (19 đơn vị)</small>
        </button>
      </div>

      <div class="market-list">
        ${Object.entries(ingredients).map(([id, item]) => {
          const qty = state.basket[id] || 0;
          return `
            <div class="market-item-card">
              <img src="${ingredientMeta[id]?.img || ''}" class="market-item-img" alt="${item.name}">
              <div class="market-item-info">
                <strong>${item.name}</strong>
                <span>${money(item.price)} / ${item.unit}</span>
                ${id === 'kumquat' ? `<small class="market-warning">⚠️ Chiều có thể lên 3.000đ</small>` : ''}
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
        <button class="btn-primary" data-type="BUY" ${currentBasketUnits === 0 || remainingCash < 0 ? 'disabled' : ''}>
          🥖 Mang Hàng Về Lên Menu
        </button>
      </div>
    </div>
  `;
}

function renderMenuSetup() {
  return `
    <header class="top-nav">
      <div class="brand-title">XÓM NHỎ <small>Lên Thực Đơn</small></div>
      <div class="wallet-badge">💵 ${money(state.cash)}</div>
    </header>
    <div class="menu-screen">
      <div class="menu-intro">
        <h3>📋 Bảng Thực Đơn Quán Hôm Nay (3 Slot Quầy)</h3>
        <p>Chọn các món mở bán và mức giá niêm yết cho khách hàng.</p>
      </div>

      <div class="menu-slots-grid">
        ${Object.entries(recipes).map(([recipeId, recipeData]) => {
          const cfg = state.menu[recipeId] || { enabled: true, sellPrice: recipeData.basePrice };
          const cost = calculateRecipeCost(recipeData.needs);
          const margin = cfg.sellPrice - cost;

          return `
            <div class="menu-card ${cfg.enabled ? 'active' : 'disabled'}">
              <div class="menu-card-header">
                <label class="menu-toggle">
                  <input type="checkbox" data-type="CONFIG_MENU_TOGGLE" data-recipe="${recipeId}" ${cfg.enabled ? 'checked' : ''}>
                  <strong>${recipeData.name}</strong>
                </label>
                <span class="cost-estimate">Vốn: ~${money(cost)}</span>
              </div>
              
              <div class="price-tiers-row">
                <span class="price-tier-label">Giá bán:</span>
                ${recipeData.priceTiers.map(p => `
                  <button class="price-tier-btn ${cfg.sellPrice === p ? 'selected' : ''}" 
                    data-type="CONFIG_MENU_PRICE" data-recipe="${recipeId}" data-price="${p}">
                    ${p / 1000}k
                  </button>
                `).join('')}
              </div>

              <div class="menu-margin-preview">
                Lãi gộp dự kiến: <strong>+${money(margin)} / phần</strong>
              </div>
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
      </div>

      ${message ? `<div class="alert-message">${message}</div>` : ''}

      <div class="menu-footer">
        <button class="btn-primary" data-type="START_DAY">🏪 Mở Quán Đón Khách</button>
      </div>
    </div>
  `;
}

function renderShop() {
  // Compute display clock time (clock: 0 min -> 08:00 AM)
  const baseMinutes = state.openingTime === 'early_6am' ? 360 : (state.openingTime === 'late_10am' ? 600 : 480);
  const totalMinutes = baseMinutes + state.clock;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const timeFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  const cust = state.activeCustomer;
  const isBeti = cust && cust.id === 'be_ti';
  const isCoChin = cust && cust.id === 'co_chin';
  const isAnhTung = cust && cust.id === 'anh_tung';

  return `
    <header class="top-nav">
      <div class="brand-title">XÓM NHỎ <small>Đang Mở Bán</small></div>
      <div class="clock-display">
        <span>⏰ ${timeFormatted}</span>
        <div class="speed-toggle">
          <button class="speed-btn ${state.speed === 1 ? 'active' : ''}" data-type="SPEED" data-payload="1">x1</button>
          <button class="speed-btn ${state.speed === 2 ? 'active' : ''}" data-type="SPEED" data-payload="2">x2</button>
        </div>
      </div>
      <div class="top-nav-right" style="display: flex; align-items: center; gap: 8px;">
        <button class="btn-icon-replay" data-type="REPLAY" title="Chơi lại" style="background: none; border: none; font-size: 16px; cursor: pointer; color: #fbd38d; min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center;">🔄</button>
        <div class="wallet-badge">💵 ${money(state.cash)}</div>
      </div>
    </header>

    <div class="shop-stage-container">
      ${state.newsTicker ? `
        <div class="news-ticker-banner">
          <span>📢 ${state.newsTicker.text}</span>
        </div>
      ` : ''}

      <!-- Street view & Counter window -->
      <div class="street-counter-scene">
        <img src="../assets/environment/alley_counter_clean.jpg" class="scene-background" alt="Con hẻm">

        <!-- Customer in queue -->
        ${cust ? `
          <div class="customer-actor-wrap ${cust.status === 'SERVED' ? 'served-leaving' : ''}">
            <div class="customer-contact-shadow"></div>
            ${isBeti ? `
              <img src="${BETI_SPRITES.order[betiFrameIdx % 4]}" class="actor-sprite beti-sprite" alt="Bé Tí">
            ` : isCoChin ? `
              <img src="${CO_CHIN_IMG}" class="actor-sprite co-chin-sprite" alt="Cô Chín">
            ` : isAnhTung ? `
              <img src="${ANH_TUNG_IMG}" class="actor-sprite anh-tung-sprite" alt="Anh Tùng">
            ` : `
              <div class="walkin-avatar-placeholder">
                <span class="walkin-avatar-icon">👤</span>
                <span class="walkin-name-tag">${cust.name}</span>
              </div>
            `}

            <!-- Customer speech bubble -->
            <div class="customer-bubble">
              <strong>${cust.name}:</strong>
              <span>"${customerReaction ? customerReaction.quote : cust.dialogue}"</span>
              ${autoPrepState && autoPrepState.stage === 'done' ? `<div class="bubble-sparkle">✨ Cảm ơn quán!</div>` : ''}
            </div>
          </div>
        ` : `
          <div class="empty-street-idle">
            <span>Tiếng ve kêu râm ran... Quán đang chờ khách ghé</span>
          </div>
        `}

        <div class="counter-sill-bar"></div>

        ${floatingCash ? `<div class="floating-cash-burst">${floatingCash}</div>` : ''}
      </div>

      <!-- Auto-Prep Watercolor Workstation -->
      <div class="auto-prep-bench">
        <div class="prep-bench-header">
          <span class="prep-bench-title">🔪 Bàn Chế Biến Quán Phố</span>
          <span class="prep-status-text">
            ${autoPrepState ? (
              autoPrepState.stage === 'layer1' ? 'Lớp 1/3: Vỏ bánh / Ly đá...' :
              autoPrepState.stage === 'layer2' ? 'Lớp 2/3: Thêm nhân / Rót nước...' :
              autoPrepState.stage === 'done' ? '✨ Món hoàn thành vàng ruộm!' :
              autoPrepState.stage === 'menudisabled' ? 'Món không bán hôm nay!' :
              autoPrepState.stage === 'pricerejected' ? 'Khách chê giá đắt!' : 'Hết nguyên liệu!'
            ) : 'Bàn thớt sạch sẽ · Dao thớt sẵn sàng'}
          </span>
        </div>

        <div class="prep-visual-dock">
          ${autoPrepState && autoPrepState.item === 'BANH_MI_CHA' ? `
            <div class="watercolor-prep-stage banh-mi-stage">
              ${autoPrepState.stage === 'done' ? `
                <div class="art-layer-finish">
                  <img src="../assets/dishes/banh_mi_cha.png" class="dish-finish-img popIn" alt="Bánh mì chả hoàn chỉnh">
                  <div class="finish-label">Ổ Bánh Mì Chả Nóng Giòn</div>
                </div>
              ` : `
                <div class="art-layers-stack">
                  <img src="../assets/ingredients/bread.png" class="art-layer art-bread ${autoPrepState.stage === 'layer1' ? 'layer-enter' : ''}" alt="Bánh mì">
                  ${['layer2', 'done'].includes(autoPrepState.stage) ? `
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
              `}
            </div>
          ` : autoPrepState && autoPrepState.item === 'TRA_TAC' ? `
            <div class="watercolor-prep-stage drink-stage">
              ${autoPrepState.stage === 'done' ? `
                <div class="art-layer-finish">
                  <img src="../assets/dishes/tra_tac.png" class="dish-finish-img popIn" alt="Trà tắc hoàn chỉnh">
                  <div class="finish-label">Ly Trà Tắc Chua Ngọt Mát Lạnh</div>
                </div>
              ` : `
                <div class="art-layers-stack drink-stack">
                  <img src="../assets/ingredients/ice.png" class="art-layer art-ice ${autoPrepState.stage === 'layer1' ? 'layer-enter' : ''}" alt="Đá bi">
                  ${['layer2', 'done'].includes(autoPrepState.stage) ? `
                    <img src="../assets/ingredients/sugar_syrup.png" class="art-layer art-syrup dropIn" alt="Nước đường">
                    <img src="../assets/ingredients/kumquat.png" class="art-layer art-kumquat dropIn" alt="Tắc tươi">
                  ` : ''}
                </div>
                <div class="prep-layer-caption">
                  ${autoPrepState.stage === 'layer1' ? 'Ly thủy tinh đầy ắp đá bi' : 'Vắt tắc tươi mọng nước + chan nước đường'}
                </div>
              `}
            </div>
          ` : autoPrepState && autoPrepState.item === 'SUA_DAU_DA' ? `
            <div class="watercolor-prep-stage drink-stage">
              ${autoPrepState.stage === 'done' ? `
                <div class="art-layer-finish">
                  <img src="../assets/dishes/sua_dau.png" class="dish-finish-img popIn" alt="Sữa đậu hoàn chỉnh">
                  <div class="finish-label">Ly Sữa Đậu Nành Béo Mát</div>
                </div>
              ` : `
                <div class="art-layers-stack drink-stack">
                  <img src="../assets/ingredients/ice.png" class="art-layer art-ice ${autoPrepState.stage === 'layer1' ? 'layer-enter' : ''}" alt="Đá bi">
                  ${['layer2', 'done'].includes(autoPrepState.stage) ? `
                    <img src="../assets/ingredients/soy_milk.png" class="art-layer art-soymilk dropIn" alt="Sữa đậu">
                  ` : ''}
                </div>
                <div class="prep-layer-caption">
                  ${autoPrepState.stage === 'layer1' ? 'Ly thủy tinh đầy ắp đá bi' : 'Rót sữa đậu nành béo thơm'}
                </div>
              `}
            </div>
          ` : `
            <div class="prep-idle-platter">
              <span class="idle-desc">Thớt gỗ sạch sẽ · Dao thớt sẵn sàng · Ly cốc ngay ngắn</span>
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
          <button class="btn-close-shop" data-type="CLOSE">🚪 Đóng Quán & Tính Sổ</button>
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
              <button class="btn-decision" data-type="DECIDE" data-payload="${opt.key}">
                ${opt.label}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    ` : ''}
  `;
}

function renderDayResult() {
  const ledger = calculateLedger(state);

  return `
    <header class="top-nav">
      <div class="brand-title">XÓM NHỎ <small>Sổ Ghi Tiền Cuối Ngày</small></div>
      <div class="wallet-badge">💵 ${money(ledger.finalCashInDrawer)}</div>
    </header>

    <div class="result-screen">
      <div class="notebook-ledger-card">
        <div class="notebook-header">
          <h2>📖 SỔ GHI TIỀN QUÁN XÓM NHỎ</h2>
          <small>Ngày 1 · Tổng Kết Kinh Doanh Buổi Đầu</small>
        </div>

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
            <span>👉 LỢI NHUẬN GỘP (GROSS OPERATING PROFIT):</span>
            <strong>+${money(ledger.grossOperatingProfit)}</strong>
          </div>
          <div class="ledger-row sub">
            <span>Giá trị nguyên liệu còn tồn kho:</span>
            <strong>${money(ledger.retainedStockValueAtCost)}</strong>
          </div>
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
            ${state.servedOrders.some(o => o.personId === 'be_ti') ? `
              <li>👧 <b>Bé Tí:</b> Cầm ổ bánh mì thơm phức cười tít mắt, tấm tắc khen chú làm ngon rồi hứa mai tan học ghé tiếp!</li>
            ` : ''}
            ${state.servedOrders.some(o => o.personId === 'co_chin') ? `
              <li>👵 <b>Cô Chín:</b> Uống ly trà tắc mát lạnh, khen quán pha thanh mát vừa miệng, bảo trưa mai sẽ ghé ủng hộ.</li>
            ` : ''}
            ${state.servedOrders.some(o => o.personId === 'anh_tung') ? `
              <li>🛵 <b>Anh Tùng:</b> Uống ực một hơi ly sữa đậu mát rượi, khen quán chu đáo rồi nổ máy chạy cuốc xe trưa.</li>
            ` : ''}
            ${ledger.missedOrders.map(o => `
              <li>👤 <b>${o.name}:</b> ${
                o.reason === 'MENU_DISABLED' ? 'Tiếc vì quán không bán món hôm nay, hẹn mai ghé lại.' :
                o.reason === 'PRICE_TOO_HIGH' ? 'Chê giá hôm nay đắt hơn mức bình dân trong xóm.' :
                o.reason === 'MISSED_LATE_OPENING' ? 'Ghé lúc sáng sớm khi quán chưa mở cửa.' :
                'Tiếc vì quán hết hàng sớm, hẹn mai ghé sớm hơn.'
              }</li>
            `).join('')}
          </ul>
        </div>

        <!-- 6. Đánh giá & Preview Day 2 -->
        <div class="ledger-block highlight-box">
          <div class="rating-tag">⭐ ĐÁNH GIÁ: Quán Mới Mở · Nhận Phản Hồi Tích Cực</div>
          <div class="upgrade-preview">
            <b>🔧 Xem trước nâng cấp Day 2:</b>
            <p>Rổ đèo hàng xe đạp (sức chở 30 đơn vị) và mối trứng gà tươi giá mềm đầu chợ để mở món Bánh Mì Ốp-La!</p>
          </div>
        </div>

        <button class="btn-primary" data-type="REPLAY" style="margin-top: 16px;">🔄 Mở Quán Chơi Lại Ngày 1</button>
      </div>
    </div>
  `;
}

function render() {
  if (state.screen === 'HOME') $.innerHTML = renderHome();
  else if (state.screen === 'XOM_OI') $.innerHTML = renderXomOi();
  else if (state.screen === 'MARKET') $.innerHTML = renderMarket();
  else if (state.screen === 'MENU') $.innerHTML = renderMenuSetup();
  else if (state.screen === 'SHOP') $.innerHTML = renderShop();
  else if (state.screen === 'DAY_RESULT') $.innerHTML = renderDayResult();
}

// ─────────────────────────────────────────────────────────────
// EVENT DELEGATION
// ─────────────────────────────────────────────────────────────

$.addEventListener('click', e => {
  const b = e.target.closest('[data-type]');
  if (!b) return;

  const t = b.dataset.type;
  const p = b.dataset.payload;

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
    send('REPLAY');
    return;
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
    startSimulationLoop();
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

  send(t, p);
});

// Initial boot
render();
if (state.screen === 'SHOP') {
  startSimulationLoop();
}

window.__xomNho = { send, getState: () => state };
