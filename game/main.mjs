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

// -------------------------------------------------------------
// SVG ART ASSETS FOR VIETNAMESE COZY STREET SCENE
// -------------------------------------------------------------
const STREET_BACKGROUND_SVG = `
<svg class="street-scene-svg" viewBox="0 0 440 290" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fde68a" />
      <stop offset="60%" stop-color="#fed7aa" />
      <stop offset="100%" stop-color="#fdba74" />
    </linearGradient>
    <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#eab308" />
      <stop offset="100%" stop-color="#ca8a04" />
    </linearGradient>
    <pattern id="tilePattern" width="20" height="12" patternUnits="userSpaceOnUse">
      <rect width="20" height="12" fill="#d4bda4" />
      <line x1="0" y1="0" x2="20" y2="0" stroke="#b89c7d" stroke-width="1" />
      <line x1="0" y1="0" x2="0" y2="12" stroke="#b89c7d" stroke-width="1" />
      <line x1="10" y1="6" x2="10" y2="12" stroke="#b89c7d" stroke-width="0.7" />
    </pattern>
    <linearGradient id="awningStripes" x1="0" y1="0" x2="40" y2="0" patternUnits="userSpaceOnUse" gradientTransform="rotate(0)">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="50%" stop-color="#0284c7" />
      <stop offset="50%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#ffffff" />
    </linearGradient>
  </defs>

  <!-- Sky & Morning Light -->
  <rect x="0" y="0" width="440" height="180" fill="url(#skyGrad)" />
  
  <!-- Weathered French-colonial Ochre Wall -->
  <rect x="0" y="45" width="440" height="175" fill="url(#wallGrad)" />
  <!-- Moss / Weathered stain -->
  <path d="M 0,45 Q 80,70 160,45 Q 240,65 320,48 L 320,80 Q 200,105 100,75 Z" fill="#854d0e" opacity="0.25" />
  
  <!-- Alley Shutter Door / Rolling Door on Left -->
  <rect x="15" y="70" width="130" height="150" fill="#a16207" rx="4" />
  <line x1="15" y1="90" x2="145" y2="90" stroke="#713f12" stroke-width="1.5" />
  <line x1="15" y1="110" x2="145" y2="110" stroke="#713f12" stroke-width="1.5" />
  <line x1="15" y1="130" x2="145" y2="130" stroke="#713f12" stroke-width="1.5" />
  <line x1="15" y1="150" x2="145" y2="150" stroke="#713f12" stroke-width="1.5" />
  <line x1="15" y1="170" x2="145" y2="170" stroke="#713f12" stroke-width="1.5" />
  <line x1="15" y1="190" x2="145" y2="190" stroke="#713f12" stroke-width="1.5" />
  
  <!-- Street Floor / Sidewalk -->
  <rect x="0" y="220" width="440" height="70" fill="url(#tilePattern)" />
  <!-- Sidewalk curb curb line -->
  <line x1="0" y1="220" x2="440" y2="220" stroke="#854d0e" stroke-width="2.5" />

  <!-- Overhanging Bougainvillea Flowers (Giàn hoa giấy đỏ hồng) -->
  <g id="bougainvillea" opacity="0.95">
    <!-- Vine branches -->
    <path d="M 0,20 Q 90,40 180,25 Q 260,35 340,15 Q 380,25 440,10" stroke="#543015" stroke-width="4" fill="none" />
    <path d="M 30,25 Q 70,55 110,35" stroke="#543015" stroke-width="2.5" fill="none" />
    <path d="M 140,28 Q 190,60 230,30" stroke="#543015" stroke-width="2.5" fill="none" />
    <!-- Leaves -->
    <ellipse cx="60" cy="30" rx="9" ry="5" fill="#15803d" transform="rotate(-15 60 30)" />
    <ellipse cx="90" cy="40" rx="8" ry="4.5" fill="#166534" transform="rotate(20 90 40)" />
    <ellipse cx="140" cy="35" rx="10" ry="5" fill="#15803d" transform="rotate(-30 140 35)" />
    <ellipse cx="190" cy="42" rx="9" ry="5" fill="#166534" transform="rotate(15 190 42)" />
    <ellipse cx="260" cy="28" rx="11" ry="6" fill="#15803d" transform="rotate(-10 260 28)" />
    <!-- Pink Bougainvillea Flower Clusters -->
    <circle cx="50" cy="25" r="7" fill="#e11d48" />
    <circle cx="56" cy="30" r="6" fill="#f43f5e" />
    <circle cx="45" cy="32" r="5" fill="#fb7185" />
    
    <circle cx="105" cy="35" r="8" fill="#e11d48" />
    <circle cx="112" cy="42" r="7" fill="#f43f5e" />
    <circle cx="98" cy="42" r="6" fill="#fb7185" />

    <circle cx="185" cy="38" r="8" fill="#e11d48" />
    <circle cx="192" cy="46" r="7" fill="#f43f5e" />
    <circle cx="178" cy="45" r="6" fill="#fb7185" />
    
    <circle cx="280" cy="22" r="9" fill="#e11d48" />
    <circle cx="288" cy="28" r="7" fill="#f43f5e" />
  </g>

  <!-- ==============================================
       VIETNAMESE STREET FOOD CART (XE BÁNH MÌ TỦ KÍNH)
       ============================================== -->
  <g id="banh-mi-cart" transform="translate(255, 95)">
    <!-- Awning canopy (Mái bạt sọc xanh trắng) -->
    <path d="M 0,0 L 175,0 L 180,28 L -5,28 Z" fill="#0284c7" />
    <!-- Awning scalloped edge -->
    <path d="M -5,28 Q 10,38 25,28 Q 40,38 55,28 Q 70,38 85,28 Q 100,38 115,28 Q 130,38 145,28 Q 160,38 180,28" fill="#ffffff" stroke="#0284c7" stroke-width="2" />
    
    <!-- Glass Cabinet Body -->
    <rect x="10" y="30" width="155" height="85" fill="#f0fdf4" opacity="0.6" stroke="#475569" stroke-width="2" rx="3" />
    <line x1="10" y1="72" x2="165" y2="72" stroke="#475569" stroke-width="1.5" />
    <line x1="88" y1="30" x2="88" y2="115" stroke="#475569" stroke-width="1.5" />
    
    <!-- Signboard text: BÁNH MÌ & NƯỚC -->
    <rect x="20" y="34" width="135" height="18" fill="#dc2626" rx="3" />
    <text x="88" y="47" font-family="system-ui, sans-serif" font-weight="900" font-size="10" fill="#fef08a" text-anchor="middle" letter-spacing="1">BÁNH MÌ XÓM NHỎ</text>

    <!-- Loaves of bread visible in the cabinet -->
    <ellipse cx="38" cy="62" rx="14" ry="7" fill="#d97706" stroke="#b45309" stroke-width="1" transform="rotate(-10 38 62)" />
    <ellipse cx="62" cy="62" rx="14" ry="7" fill="#f59e0b" stroke="#b45309" stroke-width="1" transform="rotate(5 62 62)" />
    
    <!-- Cha Lua (Pork roll) in cabinet -->
    <rect x="102" y="55" width="22" height="15" fill="#fbcfe8" stroke="#db2777" stroke-width="1" rx="2" />
    <circle cx="140" cy="62" r="7" fill="#84cc16" stroke="#4d7c0f" stroke-width="1" />

    <!-- Stainless steel lower cart structure -->
    <rect x="5" y="115" width="165" height="50" fill="#94a3b8" stroke="#334155" stroke-width="2" rx="4" />
    <rect x="12" y="122" width="45" height="35" fill="#cbd5e1" stroke="#475569" rx="2" />
    <rect x="65" y="122" width="45" height="35" fill="#cbd5e1" stroke="#475569" rx="2" />
    
    <!-- Cart Wheels -->
    <circle cx="35" cy="165" r="14" fill="#1e293b" stroke="#0f172a" stroke-width="3" />
    <circle cx="35" cy="165" r="5" fill="#94a3b8" />
    <circle cx="140" cy="165" r="14" fill="#1e293b" stroke="#0f172a" stroke-width="3" />
    <circle cx="140" cy="165" r="5" fill="#94a3b8" />

    <!-- Red Plastic Stool (Ghế nhựa đỏ quen thuộc) -->
    <g transform="translate(-35, 140)">
      <rect x="0" y="0" width="26" height="5" fill="#e11d48" rx="2" />
      <polygon points="2,5 5,26 8,26 5,5" fill="#be123c" />
      <polygon points="24,5 21,26 18,26 21,5" fill="#be123c" />
      <rect x="4" y="16" width="18" height="2" fill="#9f1239" />
    </g>
  </g>
</svg>
`;

// Illustrated SVG Avatar for Cô Chín
const CO_CHIN_SVG = `
<svg viewBox="0 0 65 95" xmlns="http://www.w3.org/2000/svg">
  <!-- Conical Hat (Nón lá) -->
  <polygon points="32,8 4,28 60,28" fill="#fef3c7" stroke="#d97706" stroke-width="1.5" />
  <line x1="32" y1="8" x2="32" y2="28" stroke="#d97706" stroke-width="0.8" opacity="0.6" />
  <line x1="32" y1="8" x2="18" y2="28" stroke="#d97706" stroke-width="0.8" opacity="0.6" />
  <line x1="32" y1="8" x2="46" y2="28" stroke="#d97706" stroke-width="0.8" opacity="0.6" />
  
  <!-- Face & Hair Bun -->
  <circle cx="32" cy="36" r="12" fill="#fed7aa" />
  <!-- Hair bun peeking -->
  <circle cx="32" cy="27" r="7" fill="#451a03" />
  <!-- Cheerful facial features -->
  <ellipse cx="28" cy="36" rx="1.5" ry="2" fill="#451a03" />
  <ellipse cx="36" cy="36" rx="1.5" ry="2" fill="#451a03" />
  <path d="M 28,42 Q 32,46 36,42" stroke="#b91c1c" stroke-width="1.5" fill="none" stroke-linecap="round" />
  <!-- Blush -->
  <circle cx="26" cy="40" r="2.5" fill="#f87171" opacity="0.5" />
  <circle cx="38" cy="40" r="2.5" fill="#f87171" opacity="0.5" />

  <!-- Floral Áo Bà Ba (Áo bà ba hoa nhã nhặn) -->
  <path d="M 20,48 Q 32,46 44,48 L 47,82 L 17,82 Z" fill="#67e8f9" stroke="#0891b2" stroke-width="1.2" />
  <!-- Tiny floral pattern -->
  <circle cx="27" cy="58" r="2" fill="#f43f5e" />
  <circle cx="37" cy="65" r="2" fill="#f43f5e" />
  <circle cx="29" cy="74" r="2" fill="#f43f5e" />
  <line x1="32" y1="48" x2="32" y2="82" stroke="#0e7490" stroke-width="1" />
  
  <!-- Black pants (Quần đen) -->
  <rect x="21" y="82" width="10" height="12" fill="#1e293b" />
  <rect x="33" y="82" width="10" height="12" fill="#1e293b" />
</svg>
`;

// Illustrated SVG Avatar for Anh Tùng
const ANH_TUNG_SVG = `
<svg viewBox="0 0 65 95" xmlns="http://www.w3.org/2000/svg">
  <!-- Green Baseball Cap / Delivery Helmet -->
  <ellipse cx="32" cy="20" rx="13" ry="9" fill="#15803d" />
  <path d="M 22,22 L 46,22 L 52,26 L 24,26 Z" fill="#166534" />
  
  <!-- Face -->
  <circle cx="32" cy="32" r="11" fill="#fed7aa" />
  <!-- Eyes with friendly focus -->
  <ellipse cx="28" cy="31" rx="1.5" ry="1.8" fill="#1c1917" />
  <ellipse cx="36" cy="31" rx="1.5" ry="1.8" fill="#1c1917" />
  <!-- Broad friendly smile -->
  <path d="M 28,36 Q 32,41 36,36" stroke="#78350f" stroke-width="1.6" fill="none" stroke-linecap="round" />

  <!-- Green Driver Jacket (Áo khoác gió xanh sọc) -->
  <path d="M 18,43 L 46,43 L 49,80 L 15,80 Z" fill="#16a34a" stroke="#15803d" stroke-width="1.2" />
  <!-- Yellow safety stripe -->
  <rect x="17" y="56" width="30" height="6" fill="#facc15" />
  <line x1="32" y1="43" x2="32" y2="80" stroke="#14532d" stroke-width="1.5" />
  
  <!-- Jeans (Quần jean xanh) -->
  <rect x="20" y="80" width="11" height="14" fill="#1e3a8a" />
  <rect x="33" y="80" width="11" height="14" fill="#1e3a8a" />
</svg>
`;

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
    <div class="story-card" style="text-align: center; padding: 28px 20px;">
      <div style="font-size: 40px; margin-bottom: 8px;">🏮 🥖 ☕</div>
      <h1 style="font-size: 26px; margin: 0 0 6px; color: #7c2d12; font-family: var(--font-serif);">XÓM NHỎ</h1>
      <p style="font-size: 15px; font-weight: 700; color: #b45309; margin: 0 0 16px;">Chuyện Làm Ăn · Ngày 1</p>
      
      <p style="text-align: left; background: #fffdf9; border: 1px dashed #d97706; padding: 12px; border-radius: 12px; font-size: 13.5px; line-height: 1.6;">
        Một buổi sáng trong con hẻm nhỏ Sài Gòn. Quán bạn mở đầu ngày với <b>60.000đ</b> tiền vốn. 
        Hãy ra chợ mua nguyên liệu tươi, dọn quầy đón Bé Tí, Cô Chín, Anh Tùng và tự tay chăm sóc từng món ăn nhé!
      </p>

      <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
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
        Nắng sớm bắt đầu chiếu xiên qua giàn hoa giấy. Tiếng chổi tre quét lá xào xạc đầu hẻm. 
        Trời hôm nay oi ả lắm, mấy món giải nhiệt có đá lạnh và tắc chua ngọt chắc chắn sẽ hút khách.
      </p>
      <p>
        Giờ tan trường trưa, <b>Bé Tí</b> thế nào cũng ghé quán ăn bánh mì lót dạ. 
        <b>Cô Chín</b> và <b>Anh Tùng</b> chạy xe ngang cũng sẽ dừng lại giải khát.
      </p>
      <div class="story-tip">
        💡 <b>Mẹo quản lý quán:</b> Đá bi và nước đường được dùng chung cho cả Trà tắc và Sữa đậu. 
        Bé Tí rất mê chả lụa và có thể xin thêm chả đấy!
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
      <p style="margin-bottom: 12px; font-size: 12.5px;">
        Chọn số lượng nguyên liệu mang về quán. Mua đủ cho 3 vị khách quen nhé!
      </p>

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
  if (selectedCustomer) {
    targetRecipe = recipes[selectedCustomer.recipe];
    const needed = needFor(selectedCustomer.id, state.extraCha);
    isReadyToCommit = equalCounts(state.draft, needed);
  }

  const betiStatus = getBetiStatus();

  return `
    <!-- SÂN KHẤU 2D: HẺM VÀ QUẦY HÀNG -->
    <div class="game-stage-wrapper">
      ${STREET_BACKGROUND_SVG}

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
          ${CO_CHIN_SVG}
          <span class="actor-name-tag">${coChinServed ? 'Đã nhận nước' : 'Cô Chín'}</span>
        </div>

        <!-- Anh Tùng -->
        <div class="actor-queue-character anh-tung ${anhTungServed ? 'served' : ''} ${state.selected === 'anh_tung' ? 'selected' : ''}" 
             ${!anhTungServed ? 'data-type="SELECT" data-payload="anh_tung"' : ''}>
          ${ANH_TUNG_SVG}
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
        <div class="speech-bubble" style="left: 20px; top: 12px; background: rgba(255,255,255,0.92);">
          <div class="speech-bubble-inner" style="font-weight: 500;">
            👉 <b>Chạm vào một người khách</b> đang đứng trước quầy để nhận đơn!
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

      <!-- Đĩa món đang chuẩn bị (Interactive Assembly Slot) -->
      <div class="assembly-board">
        ${selectedCustomer ? `
          <div class="assembly-dish-preview">
            ${Object.keys(state.draft).length === 0 ? `
              <span class="assembly-prompt-empty">Chạm các khay nguyên liệu bên dưới để cho vào ${targetRecipe.name.toLowerCase()}...</span>
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
          return `
            <button class="btn-ingredient" data-type="TAP" data-payload="${id}" ${stockQty <= 0 || !selectedCustomer ? 'disabled' : ''}>
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
          🗑️ Xóa
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
