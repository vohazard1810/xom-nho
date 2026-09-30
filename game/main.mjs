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

function playCoong() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1318.51, ctx.currentTime);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(2637, ctx.currentTime);

    gain.gain.setValueAtTime(0.45, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.9);
    osc2.stop(ctx.currentTime + 0.9);
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

// Game feel & customer interaction state
let customerTransitionState = 'idle'; // 'idle', 'entering', 'leaving'
let floatingCash = null; // string for juice, e.g. "+25.000đ"
let showParticles = false;
let speechBubbleHidden = false;
let bubbleFadeTimer = null;
let customerReaction = null; // { name, reaction, earned }
let reactionDisplayTimer = null;
let reactionLeaveTimer = null;
let reactionIdleTimer = null;

const money = n => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

const ingredientMeta = {
  bread: { name: 'Bánh mì', icon: '🥖', unit: 'ổ', img: '../assets/ingredients/bread.png' },
  cha: { name: 'Chả lụa', icon: '🍖', unit: 'khoanh', img: '../assets/ingredients/cha.png' },
  vegetable: { name: 'Dưa ngò', icon: '🥒', unit: 'phần', img: '../assets/ingredients/vegetable.png' },
  ice: { name: 'Đá bi', icon: '🧊', unit: 'ca', img: '../assets/ingredients/ice.png' },
  sugar_syrup: { name: 'Nước đường', icon: '🍯', unit: 'muỗng', img: '../assets/ingredients/sugar_syrup.png' },
  kumquat: { name: 'Tắc tươi', icon: '🍊', unit: 'trái', img: '../assets/ingredients/kumquat.png' },
  soy_milk: { name: 'Sữa đậu', icon: '🥛', unit: 'bịch', img: '../assets/ingredients/soy_milk.png' }
};

function persist() {
  localStorage.setItem(SAVE_KEY + ':' + (state.revision % 2), encode(state));
  saved = state;
}

function send(type, payload) {
  if (type === 'COMMIT') {
    const r = action(state, type, payload);
    if (r.error) {
      message = r.error;
      render();
      return;
    }
    playCoins();
    playChime();
    const npc = customers.find(c => c.id === state.selected);
    const basePrice = recipes[npc.recipe].price;

    let reactionText = '';
    if (npc.id === 'be_ti') {
      reactionText = state.extraCha 
        ? 'Bé Tí ôm ổ bánh mì cười tít mắt: "Oa, chả ngập tràn luôn, con cảm ơn chú nhiều lắm! Mai con tan học lại ghé!"' 
        : 'Bé Tí nhận bánh mì cười tươi: "Bánh mì giòn rụm thơm phức, con cảm ơn chú nghen!"';
    } else if (npc.id === 'co_chin') {
      reactionText = 'Cô Chín nhấp một ngụm gật gù: "Trà tắc mát rượi thanh tao, đã khát thiệt đó con ơi! Bữa sau cô lại sang ủng hộ!"';
    } else if (npc.id === 'anh_tung') {
      reactionText = 'Anh Tùng uống ực một hơi sảng khoái: "Sữa đậu béo bùi mát lạnh, tỉnh cả người em ơi! Cảm ơn quán, anh chạy cuốc trưa đây!"';
    }

    customerReaction = {
      name: npc.name,
      reaction: reactionText,
      earned: basePrice
    };

    floatingCash = '+' + money(basePrice);
    showParticles = true;
    state = r.state;
    message = '';
    persist();
    if (reactionDisplayTimer) clearTimeout(reactionDisplayTimer);
    if (reactionLeaveTimer) clearTimeout(reactionLeaveTimer);
    if (reactionIdleTimer) clearTimeout(reactionIdleTimer);

    reactionDisplayTimer = setTimeout(() => {
      floatingCash = null;
      showParticles = false;
      customerReaction = null;
      customerTransitionState = 'leaving';
      render();

      reactionLeaveTimer = setTimeout(() => {
        ensureActiveCustomer();
        customerTransitionState = 'entering';
        render();

        reactionIdleTimer = setTimeout(() => {
          customerTransitionState = 'idle';
          render();
        }, 300);
      }, 350);
    }, 1400);
    return;
  }

  const r = action(state, type, payload);
  if (r.error) {
    message = r.error;
  } else {
    if (type === 'REPLAY') {
      localStorage.removeItem(SAVE_KEY + ':0');
      localStorage.removeItem(SAVE_KEY + ':1');
      if (reactionDisplayTimer) { clearTimeout(reactionDisplayTimer); reactionDisplayTimer = null; }
      if (reactionLeaveTimer) { clearTimeout(reactionLeaveTimer); reactionLeaveTimer = null; }
      if (reactionIdleTimer) { clearTimeout(reactionIdleTimer); reactionIdleTimer = null; }
      customerTransitionState = 'idle';
      customerReaction = null;
      floatingCash = null;
      showParticles = false;
      if (betiAnimationTimer) { clearTimeout(betiAnimationTimer); betiAnimationTimer = null; }
      if (bubbleFadeTimer) { clearTimeout(bubbleFadeTimer); bubbleFadeTimer = null; }
    }
    if (type === 'TAP') {
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
  if (customerReaction) return; // Do not switch or close while reaction is being displayed
  
  const remaining = customers.filter(c => !state.served.includes(c.id) && !state.missed.includes(c.id));
  if (remaining.length === 0) {
    send('CLOSE');
    return;
  }
  
  if (!state.selected || state.served.includes(state.selected) || state.missed.includes(state.selected)) {
    send('SELECT', remaining[0].id);
  }
}

// Tính toán sổ sách kế toán Ngày 1 minh bạch
function calculateLedger() {
  const startingCash = 60000;
  const spentOnStock = state.spent || 0; // 28000
  const salesRevenue = state.revenue || 0; // 57000
  const tipsEarned = 0;
  const debt = 0;

  // Giá vốn hàng bán (COGS): Tính theo nguyên liệu đã dùng cho các khách đã phục vụ thành công
  let cogs = 0;
  for (const custId of state.served) {
    const cust = customers.find(c => c.id === custId);
    if (cust) {
      const extraCha = cust.id === 'be_ti' ? state.extraCha : null;
      const needed = needFor(cust.id, extraCha);
      for (const [ingId, qty] of Object.entries(needed)) {
        cogs += (ingredients[ingId].price || 0) * qty;
      }
    }
  }

  // Giá trị nguyên liệu còn tồn kho cuối ngày (Ending Stock)
  let endingStockValue = 0;
  for (const [ingId, qty] of Object.entries(state.stock)) {
    endingStockValue += (ingredients[ingId].price || 0) * (qty || 0);
  }

  // Lợi nhuận ròng thực tế = Doanh thu bán hàng + Tip - COGS
  const netProfit = salesRevenue + tipsEarned - cogs;

  // Tiền mặt thực tế trong két
  const finalCash = state.cash;

  // Chênh lệch tiền mặt ròng trong ngày (Cash difference)
  const cashDifference = finalCash - startingCash;

  return {
    startingCash,
    spentOnStock,
    salesRevenue,
    tipsEarned,
    cogs,
    endingStockValue,
    netProfit,
    finalCash,
    cashDifference,
    debt
  };
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
  const targetRecipe = currentCustomer ? recipes[currentCustomer.recipe] : null;
  const isBeti = currentCustomer && currentCustomer.id === 'be_ti';
  const isCoChin = currentCustomer && currentCustomer.id === 'co_chin';
  const isAnhTung = currentCustomer && currentCustomer.id === 'anh_tung';

  const isBanhMiOrder = currentCustomer && currentCustomer.recipe === 'BANH_MI_CHA';
  const isDrinkOrder = currentCustomer && currentCustomer.recipe !== 'BANH_MI_CHA';

  const needed = currentCustomer ? needFor(currentCustomer.id, isBeti ? state.extraCha : null) : {};
  const neededKeys = Object.keys(needed);
  const isReadyToCommit = currentCustomer && equalCounts(state.draft, needed);
  const isMissingStock = currentCustomer && neededKeys.some(k => (state.stock[k] || 0) < needed[k]);

  const checklist = neededKeys.map(k => {
    const reqQty = needed[k];
    const draftQty = state.draft[k] || 0;
    return {
      id: k,
      meta: ingredientMeta[k],
      reqQty,
      draftQty,
      isDone: draftQty === reqQty,
      isOver: draftQty > reqQty
    };
  });

  return `
    <div class="cooking-stage-container">
      <!-- 1. UPPER HALF: THE STREET WINDOW WITH ACTIVE CUSTOMER -->
      <div class="street-window-view">
        <div class="street-window-overlay"></div>

        <!-- Neighborhood Queue Tracker (Interactive customer tabs) -->
        <div class="queue-tracker-hud">
          ${customers.map(c => {
            const isServed = state.served.includes(c.id);
            const isCurrent = state.selected === c.id;
            return `
              <button class="queue-dot ${isServed ? 'served' : isCurrent ? 'current' : ''}" 
                      data-type="SELECT" data-payload="${c.id}" ${isServed ? 'disabled' : ''} 
                      style="background:none; border:none; padding:3px 6px; cursor:pointer;"
                      title="${c.id === 'anh_tung' ? 'Đơn gấp' : ''}">
                ${isServed ? '✓' : isCurrent ? '⭐' : '⏳'} ${c.id === 'anh_tung' ? '⚡ ' + c.name : c.name}
              </button>
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

        <!-- Ground Contact Shadow & Active Customer -->
        ${currentCustomer ? `
          <div class="active-customer-spot ${customerTransitionState === 'entering' ? 'customer-entering' : customerTransitionState === 'leaving' ? 'customer-leaving' : ''}">
            <div class="customer-contact-shadow"></div>
            <div class="customer-avatar-box">
              ${isBeti ? `<img id="beti-sprite-img" src="${BETI_SPRITES.order[0]}" alt="Bé Tí">` : ''}
              ${isCoChin ? `<img src="${CO_CHIN_IMG}" alt="Cô Chín">` : ''}
              ${isAnhTung ? `<img src="${ANH_TUNG_IMG}" alt="Anh Tùng">` : ''}
            </div>
          </div>

          <!-- Counter Sill Bar (3D foreground edge between street & prep counter) -->
          <div class="counter-sill-bar"></div>

          <!-- Floating Order Speech Bubble -->
          <div class="customer-order-bubble ${speechBubbleHidden ? 'bubble-faded' : ''}">
            <div class="order-dish-badge">
              <img src="${isBanhMiOrder ? '../assets/ingredients/bread.png' : isCoChin ? '../assets/ingredients/kumquat.png' : '../assets/ingredients/soy_milk.png'}" style="width:24px;height:24px;object-fit:contain;">
            </div>
            <div class="order-bubble-text">
              ${customerReaction ? `
                <div class="bubble-header-line">
                  <strong>${customerReaction.name}</strong>
                  <span class="bubble-recipe-pill" style="background:#dcfce7; color:#15803d;">Đã nhận món · +${money(customerReaction.earned)}</span>
                </div>
                <p class="bubble-dialogue-line" style="color: #15803d; font-weight: 700;">
                  "${customerReaction.reaction}"
                </p>
              ` : `
                <div class="bubble-header-line">
                  <strong>${currentCustomer.name}</strong>
                  <span class="bubble-recipe-pill">${targetRecipe.name} · +${money(targetRecipe.price)}</span>
                </div>
                <p class="bubble-dialogue-line">
                  ${isBeti ? '"Chú ơi cho con ổ Bánh mì chả, chú cho con xin thêm chả nghen!"' 
                    : isCoChin ? '"Cho cô ly Trà tắc nhiều đá mát lạnh nghen con!"' 
                    : '"Cho anh ly Sữa đậu đá mát rượi em ơi! Đang vội chạy cuốc khách trưa!"'}
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
              `}
            </div>
            
            ${isMissingStock && !customerReaction ? `
              <button class="btn-secondary btn-skip-order" data-type="SKIP">
                Hết hàng<br>(Qua lượt)
              </button>
            ` : ''}
          </div>
        ` : ''}

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
      </div>

      <!-- 2. LOWER HALF: COOKING PREP COUNTER (Single Active Station) -->
      <div class="counter-prep-deck">
        <div class="workstation-row">
          ${isBanhMiOrder ? `
            <!-- Workstation: Bàn Làm Bánh Mì Chả (Expanded Full Width) -->
            <div class="prep-workstation active-target">
              <div class="workstation-title">
                <span>🥖 Quầy Bánh Mì Chả</span>
                <span style="color:#c2410c; font-size:11px;">Món đang chuẩn bị (${targetRecipe.name})</span>
              </div>

              <div class="prep-visual-slot">
                ${isReadyToCommit ? `
                  <div class="finished-dish-wrap">
                    <img class="dish-preview-img" src="${DISH_IMAGES.BANH_MI_CHA}" alt="Bánh Mì Chả Hoàn Thành">
                    <span class="dish-sparkle-badge">✨ Bánh mì nóng giòn đã xong!</span>
                  </div>
                ` : Object.keys(state.draft).length > 0 ? `
                  <div class="assembly-banh-mi-stage">
                    <img class="assembly-bread-base" src="../assets/ingredients/bread.png" alt="Ổ bánh mì">
                    ${state.draft.cha ? `
                      <div class="assembly-cha-layer">
                        <img class="assembly-cha-slice cha-1" src="../assets/ingredients/cha.png" alt="Chả lụa">
                        ${state.draft.cha >= 2 ? `<img class="assembly-cha-slice cha-2" src="../assets/ingredients/cha.png" alt="Chả lụa thêm">` : ''}
                      </div>
                    ` : ''}
                    ${state.draft.vegetable ? `
                      <div class="assembly-veg-layer">
                        <img class="assembly-veg-sprig" src="../assets/ingredients/vegetable.png" alt="Dưa leo ngò rí">
                      </div>
                    ` : ''}
                  </div>
                ` : `
                  <div class="prep-empty-hint">
                    Khay sạch · Chạm <strong>Bánh mì</strong> bên dưới để đặt ổ bánh lên thớt!
                  </div>
                `}
              </div>

              <!-- Checklist cho Bánh Mì -->
              <div class="checklist-chips">
                ${checklist.map(item => `
                  <span class="checklist-chip ${item.isDone ? 'done' : item.isOver ? 'over' : ''}">
                    <img src="${item.meta.img}" style="width:14px;height:14px;object-fit:contain;"> ${item.meta.name}: ${item.draftQty}/${item.reqQty} ${item.isDone ? '✓' : ''}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : isDrinkOrder ? `
            <!-- Workstation: Quầy Nước Giải Khát (Expanded Full Width) -->
            <div class="prep-workstation active-target">
              <div class="workstation-title">
                <span>🥤 Quầy Nước Giải Khát</span>
                <span style="color:#0284c7; font-size:11px;">Món đang chuẩn bị (${targetRecipe.name})</span>
              </div>

              <div class="prep-visual-slot">
                ${isReadyToCommit ? `
                  <div class="finished-dish-wrap">
                    <img class="dish-preview-img" src="${DISH_IMAGES[currentCustomer.recipe]}" alt="${targetRecipe.name}">
                    <span class="dish-sparkle-badge">✨ Nước mát lạnh giải khát!</span>
                  </div>
                ` : Object.keys(state.draft).length > 0 ? `
                  <div class="assembly-drink-stage">
                    <div class="assembly-cup-base">
                      <div class="assembly-cup-rim"></div>
                      ${state.draft.sugar_syrup ? `<div class="assembly-drink-syrup"></div>` : ''}
                      ${state.draft.kumquat ? `<div class="assembly-drink-flavor tra-tac"></div>` : ''}
                      ${state.draft.soy_milk ? `<div class="assembly-drink-flavor sua-dau"></div>` : ''}
                      ${state.draft.ice ? `<img class="assembly-drink-ice" src="../assets/ingredients/ice.png" alt="Đá bi">` : ''}
                      ${state.draft.kumquat ? `<img class="assembly-drink-kumquat-slice" src="../assets/ingredients/kumquat.png" alt="Tắc tươi">` : ''}
                    </div>
                  </div>
                ` : `
                  <div class="prep-empty-hint">
                    Ly sạch · Chạm <strong>Đá bi</strong> bên dưới để bắt đầu pha ${targetRecipe.name}!
                  </div>
                `}
              </div>

              <!-- Checklist cho Nước -->
              <div class="checklist-chips">
                ${checklist.map(item => `
                  <span class="checklist-chip ${item.isDone ? 'done' : item.isOver ? 'over' : ''}">
                    <img src="${item.meta.img}" style="width:14px;height:14px;object-fit:contain;"> ${item.meta.name}: ${item.draftQty}/${item.reqQty} ${item.isDone ? '✓' : ''}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- 3. INGREDIENT TRAYS ON COUNTER (KHAY NGUYÊN LIỆU MINH HỌA SPRITE) -->
        <div class="ingredient-tray-rack">
          ${Object.entries(ingredients).map(([id, item]) => {
            const meta = ingredientMeta[id];
            const stockQty = state.stock[id] || 0;
            const isNeeded = neededKeys.includes(id);
            return `
              <button class="tray-button ${isNeeded ? 'needed' : ''} ${stockQty <= 0 ? 'out-of-stock' : ''}" 
                      data-type="TAP" data-payload="${id}" ${stockQty <= 0 ? 'disabled' : ''}>
                <img class="tray-sprite-img" src="${meta.img}" alt="${meta.name}">
                <span class="tray-name">${meta.name}</span>
                <span class="tray-stock">Còn: ${stockQty}</span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- 4. BOTTOM ACTION BAR: SERVE DISH OR TRASH -->
        <div class="counter-actions-bar">
          <button class="btn-secondary" data-type="CLEAR" ${Object.keys(state.draft).length === 0 ? 'disabled' : ''} style="padding:12px 14px; font-size:13px; font-weight:700;">
            🗑️ Làm Lại
          </button>
          
          <button class="btn-serve ${isReadyToCommit ? 'pulse-ready' : ''}" data-type="COMMIT" ${!isReadyToCommit ? 'disabled' : ''}>
            ${isReadyToCommit ? `✨ GIAO MÓN CHO ${currentCustomer.name.toUpperCase()} (+${money(targetRecipe.price)})` : '🥢 Đang chuẩn bị món...'}
          </button>

          <button class="btn-secondary" data-type="CLOSE" style="font-size:12px; padding:12px 10px; white-space:nowrap;">
            Đóng Quán
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderDayResult() {
  const ledger = calculateLedger();

  return `
    <div class="notebook-card" style="max-width: 480px; margin: 16px auto; width: calc(100% - 24px);">
      <div class="notebook-title">
        📖 SỔ GHI TIỀN QUÁN XÓM NHỎ<br>
        <small style="font-size: 13px; font-weight: normal; color: #78350f;">Ngày 1 · Tổng kết kinh doanh buổi đầu</small>
      </div>

      <!-- Dòng tiền mặt trong két (Cash Flow) -->
      <div class="ledger-group-title">💵 Dòng tiền mặt trong két</div>
      <div class="ledger-line">
        <span>Tiền vốn đầu ngày:</span>
        <strong>${money(ledger.startingCash)}</strong>
      </div>
      <div class="ledger-line">
        <span>Chi tiền mua hàng ở chợ:</span>
        <strong style="color: #dc2626;">-${money(ledger.spentOnStock)}</strong>
      </div>
      <div class="ledger-line">
        <span>Thu tiền bán bánh & nước:</span>
        <strong style="color: #16a34a;">+${money(ledger.salesRevenue)}</strong>
      </div>
      ${ledger.tipsEarned > 0 ? `
        <div class="ledger-line">
          <span>Tiền tip nhận được:</span>
          <strong style="color: #eab308;">+${money(ledger.tipsEarned)}</strong>
        </div>
      ` : ''}
      <div class="ledger-line ledger-cash-diff">
        <span>Chênh lệch tiền mặt trong ngày:</span>
        <strong style="color: #0369a1;">${ledger.cashDifference >= 0 ? '+' : ''}${money(ledger.cashDifference)}</strong>
      </div>
      <div class="ledger-line" style="font-weight: 800; color: #7c2d12;">
        <span>Tổng tiền mặt trong két cuối ngày:</span>
        <strong style="color: #15803d; font-size: 15px;">${money(ledger.finalCash)}</strong>
      </div>

      <!-- Kết quả kinh doanh (P&L) -->
      <div class="ledger-group-title" style="margin-top: 14px;">📊 Kết quả kinh doanh (P&L)</div>
      <div class="ledger-line">
        <span>Doanh thu thuần:</span>
        <strong>+${money(ledger.salesRevenue)}</strong>
      </div>
      <div class="ledger-line">
        <span>Giá vốn hàng đã bán (COGS):</span>
        <strong style="color: #dc2626;">-${money(ledger.cogs)}</strong>
      </div>
      <div class="ledger-line">
        <span>Giá trị nguyên liệu còn tồn kho:</span>
        <strong>${money(ledger.endingStockValue)}</strong>
      </div>
      <div class="ledger-line ledger-profit">
        <span>LỢI NHUẬN GỘP NGÀY 1:</span>
        <span>+${money(ledger.netProfit)}</span>
      </div>
      <div class="ledger-line" style="font-size: 12px; color: #735946;">
        <span>Khoản nợ:</span>
        <span>${money(ledger.debt)} (Không nợ)</span>
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

