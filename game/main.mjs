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

// Audio effects using Web Audio API
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (e) {}
}

function playTap() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
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

const money = n => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

const button = (label, type, payload, extra = '') =>
  `<button data-type="${type}" ${payload !== undefined ? `data-payload="${payload}"` : ''} ${extra}>${label}</button>`;

const ingredientMeta = {
  bread: { name: 'Bánh mì', icon: '🥖', unit: 'ổ' },
  cha: { name: 'Chả lụa', icon: '🍖', unit: 'khoanh' },
  vegetable: { name: 'Dưa ngò', icon: '🥒', unit: 'phần' },
  ice: { name: 'Đá bi', icon: '🧊', unit: 'ca' },
  sugar_syrup: { name: 'Nước đường', icon: '🍯', unit: 'muỗng' },
  kumquat: { name: 'Tắc tươi', icon: '🍊', unit: 'trái' },
  soy_milk: { name: 'Sữa đậu', icon: '🥛', unit: 'bịch' }
};

function getBetiStatus() {
  if (state.selected === 'be_ti') {
    return { variant: 'order', tag: 'Bé Tí · Đang gọi món' };
  }
  // If another customer is being served while Bé Tí is waiting
  if (state.selected && !state.served.includes('be_ti')) {
    return { variant: 'reserved', tag: 'Bé Tí · Chờ lượt' };
  }
  // If bread or cha stock is depleted
  if ((state.stock.bread || 0) < 1 || (state.stock.cha || 0) < 1) {
    return { variant: 'stock', tag: 'Bé Tí · Lo thiếu chả/bánh' };
  }
  // If someone else was served first
  if (state.served.length > 0 && !state.served.includes('be_ti')) {
    return { variant: 'deprioritized', tag: 'Bé Tí · Chờ nãy giờ' };
  }
  return { variant: 'normal', tag: 'Bé Tí · Chờ gọi món' };
}

function persist() {
  localStorage.setItem(SAVE_KEY + ':' + (state.revision % 2), encode(state));
  saved = state;
}

function send(type, payload) {
  const r = action(state, type, payload);
  if (r.error) {
    message = r.error;
  } else {
    if (type === 'REPLAY') {
      localStorage.removeItem(SAVE_KEY + ':0');
      localStorage.removeItem(SAVE_KEY + ':1');
    }
    if (type === 'TAP') {
      playTap();
    }
    if (type === 'COMMIT') {
      playChime();
      const npc = customers.find(c => c.id === state.selected);
      lastServedToast = `Đã giao món cho ${npc.name}! +${money(recipes[npc.recipe].price)}`;
    }
    state = r.state;
    message = '';
    persist();
  }
  render();
}

// Bé Tí animation loop manager with natural biological blink cadence
function startBetiAnimation() {
  if (betiAnimationTimer) clearTimeout(betiAnimationTimer);
  betiFrameIdx = 0;
  
  const tick = () => {
    const el = document.getElementById('beti-sprite-img');
    if (!el) return;
    
    const { variant } = getBetiStatus();
    const frames = BETI_SPRITES[variant] || BETI_SPRITES.normal;
    
    let delay = 600;
    if (variant === 'order') {
      const orderDelays = [200, 250, 450, 550];
      delay = orderDelays[betiFrameIdx] || 400;
      betiFrameIdx = (betiFrameIdx + 1) % frames.length;
    } else {
      // Natural cadence: 2200ms open, 80ms start, 80ms closed, 100ms reopen
      const blinkDelays = [2200, 80, 80, 100];
      delay = blinkDelays[betiFrameIdx] || 2000;
      betiFrameIdx = (betiFrameIdx + 1) % frames.length;
    }
    
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
    <div class="story-card" style="text-align: center; padding: 26px 18px;">
      <div style="font-size: 42px; margin-bottom: 6px;">🏮 🥖 ☕</div>
      <h1 style="font-size: 26px; margin: 0 0 6px; color: #7c2d12; font-family: var(--font-serif);">XÓM NHỎ</h1>
      <p style="font-size: 15px; font-weight: 700; color: #b45309; margin: 0 0 16px;">Chuyện Làm Ăn · Ngày 1</p>
      
      <p style="text-align: left; background: #fffdf9; border: 1.5px dashed #d97706; padding: 14px; border-radius: 12px; font-size: 13.5px; line-height: 1.6;">
        Một buổi sáng ấm áp trong con hẻm nhỏ Sài Gòn. Bạn mở đầu ngày với <b>60.000đ</b> tiền vốn. 
        Hãy ra chợ mua nguyên liệu tươi, dọn quầy đón <b>Bé Tí</b>, <b>Cô Chín</b>, <b>Anh Tùng</b> và tự tay pha chế, chăm sóc từng món ăn nhé!
      </p>

      <div class="story-tip" style="text-align: left; margin: 14px 0 18px;">
        💡 <b>Mẹo xóm:</b> Bé Tí mê Bánh mì chả và hay xin thêm chả, Cô Chín đi chợ về cần Trà tắc giải nhiệt, Anh Tùng chạy xe thèm ly Sữa đậu đá thơm mát.
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        <button class="btn-primary btn-wide" data-type="NAVIGATE">
          🌿 Bắt Đầu Mở Quán Hôm Nay
        </button>
        ${saved && saved.screen !== 'HOME' ? `<button class="btn-secondary btn-wide" data-type="RESUME">Tiếp tục ngày đang chơi</button>` : ''}
        ${button('Chơi lại từ đầu', 'REPLAY', undefined, 'class="btn-secondary" style="font-size: 12.5px;"')}
      </div>
    </div>
  `;
}

function renderXomOi() {
  return `
    <div class="story-card">
      <div class="story-header">
        <span style="font-size: 24px;">🌤️</span>
        <h2>Xóm Ơi · Tiếng Rao Buổi Sớm</h2>
      </div>
      <p>
        Nắng sớm rọi qua giàn hoa giấy rực rỡ trước hiên. Tiếng chổi tre xào xạc đầu hẻm báo hiệu một ngày mới bắt đầu. 
        Trời hôm nay oi ả lắm, mấy món giải nhiệt có đá lạnh và tắc chua ngọt chắc chắn sẽ đắt khách.
      </p>
      <p>
        Giờ tan trường trưa, <b>Bé Tí</b> thế nào cũng ghé quán ăn bánh mì lót dạ. 
        <b>Cô Chín</b> đi chợ ngang và <b>Anh Tùng</b> chạy xe ôm cũng sẽ dừng lại làm ly nước mát.
      </p>
      
      <div class="story-tip">
        💡 <b>Gợi ý nguyên liệu:</b> Đá bi và nước đường dùng chung cho cả Trà tắc và Sữa đậu đá. Nhớ mua dư một chút chả nếu muốn chiều Bé Tí nhé!
      </div>

      <div style="margin-top: 20px;">
        <button class="btn-primary btn-wide" data-type="NAVIGATE">
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
    <div class="story-card" style="padding: 14px 16px;">
      <div class="story-header" style="justify-content: space-between;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size: 22px;">🏪</span>
          <h2 style="font-size: 16px;">Sạp Chợ Đầu Ngõ</h2>
        </div>
        <div class="wallet-badge">💵 ${money(state.cash)}</div>
      </div>
      
      <!-- Gợi ý combo mua nhanh Ngày 1 -->
      <div class="market-quick-bundle">
        <div style="font-size: 13px; font-weight: 700; color: #7c2d12; margin-bottom: 2px;">
          ⚡ Gợi Ý Mua Nhanh Cho Ngày 1 (3 khách):
        </div>
        <div style="font-size: 11.5px; color: #78350f; margin-bottom: 8px;">
          Đủ Bánh mì chả thêm chả (Bé Tí), Trà tắc (Cô Chín) và Sữa đậu đá (Anh Tùng).
        </div>
        <button class="btn-secondary" data-type="BUNDLE_DAY1" style="font-size: 12px; padding: 6px 12px; width: 100%; border: 1.5px dashed #d97706; background: #fffdf9;">
          🧺 Tự động chọn combo chuẩn 3 khách (48.000đ)
        </button>
      </div>

      <div class="market-table" style="margin-top: 12px;">
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
      <div style="background: #fdf5ea; border: 1.5px solid #ebd3b6; border-radius: 14px; padding: 12px; margin-top: 14px;">
        <div style="display:flex; justify-content:space-between; font-size: 13.5px; margin-bottom: 4px;">
          <span>Tiền hàng trong giỏ:</span>
          <strong style="color: #c2410c;">${money(basketCost)}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; font-size: 13.5px;">
          <span>Tiền mặt còn lại:</span>
          <strong style="color: ${remainingCash < 0 ? '#dc2626' : '#15803d'};">${money(remainingCash)}</strong>
        </div>
      </div>

      <button class="btn-primary btn-wide" data-type="BUY" ${!canBuy ? 'disabled' : ''} style="margin-top: 14px;">
        ${remainingCash < 0 ? '❌ Không đủ tiền mặt' : basketCost === 0 ? '👉 Hãy chọn nguyên liệu' : '🥖 Mang Hàng Về Mở Quán!'}
      </button>
    </div>
  `;
}

function renderShop() {
  const selectedCustomer = customers.find(c => c.id === state.selected);
  const remainingCustomers = customers.filter(c => !state.served.includes(c.id));
  const betiServed = state.served.includes('be_ti');
  const coChinServed = state.served.includes('co_chin');
  const anhTungServed = state.served.includes('anh_tung');

  // Check if draft matches recipe
  let isReadyToCommit = false;
  let targetRecipe = null;
  let recipeChecklist = [];
  let isMissingStock = false;
  let neededKeys = [];

  if (selectedCustomer) {
    targetRecipe = recipes[selectedCustomer.recipe];
    const needed = needFor(selectedCustomer.id, state.extraCha);
    neededKeys = Object.keys(needed);
    isReadyToCommit = equalCounts(state.draft, needed);

    for (const [ingId, reqQty] of Object.entries(needed)) {
      const draftQty = state.draft[ingId] || 0;
      const stockQty = state.stock[ingId] || 0;
      const isDone = draftQty === reqQty;
      const isOver = draftQty > reqQty;
      if (stockQty < reqQty) isMissingStock = true;
      recipeChecklist.push({
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

  const betiStatus = getBetiStatus();

  return `
    <!-- SÂN KHẤU 2D: HẺM VÀ QUẦY HÀNG -->
    <div class="game-stage-wrapper">
      <div class="stage-actors">
        <!-- Bé Tí (Animated 2D Character) -->
        ${!betiServed ? `
          <div class="actor-beti ${state.selected === 'be_ti' ? 'selected' : ''}" data-type="SELECT" data-payload="be_ti">
            <img id="beti-sprite-img" src="${BETI_SPRITES[betiStatus.variant][0]}" alt="Bé Tí">
            <span class="actor-name-tag">${betiStatus.tag}</span>
          </div>
        ` : ''}

        <!-- Cô Chín -->
        <div class="actor-queue-character co-chin ${coChinServed ? 'served' : ''} ${state.selected === 'co_chin' ? 'selected' : ''}" 
             ${!coChinServed ? 'data-type="SELECT" data-payload="co_chin"' : ''}>
          <img src="${CO_CHIN_IMG}" alt="Cô Chín">
          <span class="actor-name-tag">${coChinServed ? 'Đã nhận nước' : 'Cô Chín'}</span>
        </div>

        <!-- Anh Tùng -->
        <div class="actor-queue-character anh-tung ${anhTungServed ? 'served' : ''} ${state.selected === 'anh_tung' ? 'selected' : ''}" 
             ${!anhTungServed ? 'data-type="SELECT" data-payload="anh_tung"' : ''}>
          <img src="${ANH_TUNG_IMG}" alt="Anh Tùng">
          <span class="actor-name-tag">${anhTungServed ? 'Đã nhận nước' : 'Anh Tùng'}</span>
        </div>
      </div>

      <!-- Dynamic Speech Bubble when Customer Selected -->
      ${selectedCustomer ? `
        <div class="speech-bubble">
          <div class="speech-bubble-inner">
            ${selectedCustomer.id === 'be_ti' ? `
              <b>Bé Tí:</b> "Chú ơi cho con ổ Bánh mì chả! ...Mà cho con xin thêm chả được hông chú?"
              <div class="speech-request-actions">
                <button class="btn-mini-action ${state.extraCha === true ? 'btn-primary' : 'btn-secondary'}" data-type="EXTRA" data-payload="yes">
                  👍 Thêm chả cho con (2 chả)
                </button>
                <button class="btn-mini-action ${state.extraCha === false ? 'btn-primary' : 'btn-secondary'}" data-type="EXTRA" data-payload="no">
                  Ăn phần thường nha (1 chả)
                </button>
              </div>
            ` : selectedCustomer.id === 'co_chin' ? `
              <b>Cô Chín:</b> "Cho cô ly Trà tắc nhiều đá mát lạnh nghen con, đi chợ về khát quá!"
            ` : `
              <b>Anh Tùng:</b> "Cho anh ly Sữa đậu đá uống cho mát em ơi, chuẩn bị chạy thêm cuốc xe!"
            `}
          </div>
        </div>
      ` : `
        <div class="speech-bubble">
          <div class="speech-bubble-inner" style="font-weight: 500;">
            👉 <b>Chạm vào Bé Tí, Cô Chín hoặc Anh Tùng</b> để nhận đơn và làm món!
          </div>
        </div>
      `}
    </div>

    <!-- BÀN CHẾ BIẾN & LẮP RÁP MÓN ĂN (KITCHEN DOCK) -->
    <div class="kitchen-dock">
      <div class="kitchen-header">
        <div class="recipe-target-name">
          ${selectedCustomer ? `
            <span>🍽️ Làm món: <b>${targetRecipe.name}</b></span>
            <span class="recipe-target-badge">+${money(targetRecipe.price)}</span>
          ` : `
            <span>🍽️ Quầy Chế Biến & Pha Chế</span>
          `}
        </div>
        <div style="font-size: 12px; color: var(--text-muted);">
          Đã phục vụ: <b>${state.served.length}/3</b> khách
        </div>
      </div>

      <!-- Hướng dẫn công thức chuẩn cho món đang chọn -->
      ${selectedCustomer ? `
        <div class="recipe-formula-card">
          <div class="formula-title">📋 Thành phần cần cho vào đĩa:</div>
          <div class="formula-pills">
            ${recipeChecklist.map(item => `
              <div class="pill-item ${item.isDone ? 'done' : item.isOver ? 'over' : ''} ${item.stockQty < item.reqQty ? 'no-stock' : ''}">
                <span class="pill-icon">${item.meta.icon}</span>
                <span class="pill-name">${item.meta.name}</span>
                <span class="pill-count">${item.draftQty}/${item.reqQty}</span>
                ${item.isDone ? '<span class="pill-check">✓</span>' : ''}
              </div>
            `).join('')}
          </div>
          ${isMissingStock ? `
            <div class="stock-warning">
              ⚠️ Quán không còn đủ nguyên liệu này trong kho! Bạn hãy chọn phục vụ khách khác hoặc bấm "Đóng Quán Nghỉ Ngơi".
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Đĩa món đang chuẩn bị (Interactive Assembly Slot) -->
      <div class="assembly-board">
        ${selectedCustomer ? `
          <div class="assembly-dish-preview">
            ${Object.keys(state.draft).length === 0 ? `
              <span class="assembly-prompt-empty">Chạm các ô nguyên liệu bên dưới để cho vào ${targetRecipe.name.toLowerCase()}...</span>
            ` : Object.entries(state.draft).map(([id, qty]) => {
              const meta = ingredientMeta[id] || { icon: '📦', name: id };
              return `
                <div class="ingredient-token">
                  <span>${meta.icon}</span>
                  <span>${meta.name} ×${qty}</span>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div style="text-align: center; color: var(--text-light); font-size: 13px;">
            Hãy chọn một vị khách ở trên quầy để bắt đầu làm món!
          </div>
        `}
      </div>

      <!-- Khay 7 Nguyên liệu sẵn có -->
      <div class="ingredient-shelf">
        ${Object.entries(ingredients).map(([id, item]) => {
          const meta = ingredientMeta[id];
          const stockQty = state.stock[id] || 0;
          const isNeeded = neededKeys.includes(id);
          return `
            <button class="btn-ingredient ${isNeeded ? 'highlight-needed' : ''}" data-type="TAP" data-payload="${id}" ${stockQty <= 0 || !selectedCustomer ? 'disabled' : ''}>
              <span class="ing-icon">${meta.icon}</span>
              <span class="ing-name">${meta.name}</span>
              <span class="ing-stock">Còn: ${stockQty}</span>
            </button>
          `;
        }).join('')}
      </div>

      <!-- Thao tác Commit hoặc Clear -->
      <div class="kitchen-actions">
        <button class="btn-secondary" data-type="CLEAR" ${Object.keys(state.draft).length === 0 ? 'disabled' : ''}>
          🗑️ Xóa Đĩa
        </button>
        <button class="btn-commit ${isReadyToCommit ? 'pulse-ready' : ''}" data-type="COMMIT" ${!isReadyToCommit ? 'disabled' : ''}>
          ${isReadyToCommit ? '✨ GIAO MÓN CHO KHÁCH (+Tiền)' : '🥢 Đang chuẩn bị món...'}
        </button>
      </div>
    </div>

    <!-- Thanh đóng quán -->
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 6px;">
      <span style="font-size: 12.5px; color: var(--text-muted);">
        ${remainingCustomers.length === 0 ? '🎉 Tất cả khách đã được phục vụ!' : `Còn ${remainingCustomers.length} khách đang đợi.`}
      </span>
      <button class="btn-secondary" data-type="CLOSE" style="font-size: 12.5px; padding: 6px 12px;">
        Đóng Quán Nghỉ Ngơi
      </button>
    </div>
  `;
}

function renderDayResult() {
  const profit = state.revenue - state.spent;

  return `
    <div class="notebook-card">
      <div class="notebook-title">
        📖 SỔ GHI TIỀN QUÁN XÓM NHỎ<br>
        <small style="font-size: 13px; font-weight: normal; color: #78350f;">Ngày 1 · Tổng kết kinh doanh</small>
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
        <strong style="color: #7c2d12; font-size: 13px;">📝 Chuyện Xóm Sau Giờ Bán:</strong>
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
      <div style="background: #fef3c7; border: 1px dashed #d97706; padding: 10px; border-radius: 8px; margin-top: 14px; font-size: 12.5px; color: #92400e;">
        🌟 <b>Gợi ý ngày mai:</b> Nghe mấy cô đầu chợ đồn ngày mai có mối giao trứng gà tươi giá mềm. Quán mình sắp có thể bán thêm món <b>Bánh Mì Ốp-La</b> rồi đấy!
      </div>

      <div style="display: flex; gap: 8px; margin-top: 18px;">
        <button class="btn-primary btn-wide" data-type="REPLAY">
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

  // Start Bé Tí animation if we are on SHOP screen
  if (state.screen === 'SHOP' && !state.served.includes('be_ti')) {
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
