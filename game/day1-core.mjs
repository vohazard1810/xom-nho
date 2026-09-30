// Day 1 Vertical Slice v0.7 — Idle Management State Machine
// Pure functional state machine. Every action returns a new cloned state or {state, error}.
import { extraIngredient, extraRecipe, UPGRADE_CATALOG, FRESH_INGREDIENTS, dayConfig, rosterForDay } from './day-content.mjs';
export { UPGRADE_CATALOG, dayConfig } from './day-content.mjs';

export const ingredients = Object.freeze({
  bread: { name: 'Bánh mì', price: 4000, unit: 'ổ' },
  cha: { name: 'Chả lụa', price: 5000, unit: 'khoanh' },
  vegetable: { name: 'Dưa ngò', price: 2000, unit: 'phần' },
  ice: { name: 'Đá bi', price: 1000, unit: 'ca' },
  sugar_syrup: { name: 'Nước đường', price: 2000, unit: 'muỗng' },
  kumquat: { name: 'Tắc tươi', price: 2000, unit: 'trái' },
  soy_milk: { name: 'Sữa đậu', price: 4000, unit: 'bịch' },
  ...extraIngredient
});

export const recipes = Object.freeze({
  BANH_MI_CHA: {
    name: 'Bánh mì chả',
    basePrice: 25000,
    priceTiers: [22000, 25000, 28000],
    needs: { bread: 1, cha: 1, vegetable: 1 }
  },
  TRA_TAC: {
    name: 'Trà tắc',
    basePrice: 15000,
    priceTiers: [12000, 15000, 18000],
    needs: { ice: 1, sugar_syrup: 1, kumquat: 1 }
  },
  SUA_DAU_DA: {
    name: 'Sữa đậu đá',
    basePrice: 17000,
    priceTiers: [14000, 17000, 20000],
    needs: { ice: 1, sugar_syrup: 1, soy_milk: 1 }
  },
  ...extraRecipe
});

// 8 Fixture Customers for the Day 1 rhythm test
export const fixtureCustomers = Object.freeze([
  {
    id: 'bac_ba',
    name: 'Bác Ba',
    isRegular: false,
    recipe: 'BANH_MI_CHA',
    arrivalMinute: 30, // 08:30
    priceSensitivity: 'MEDIUM',
    dialogue: 'Bán cho tui ổ bánh mì chả ăn sáng nha chú!'
  },
  {
    id: 'chi_hai',
    name: 'Chị Hai',
    isRegular: false,
    recipe: 'TRA_TAC',
    arrivalMinute: 75, // 09:15
    priceSensitivity: 'MEDIUM',
    dialogue: 'Cho chị một ly trà tắc nhiều đá mát lạnh nghen!'
  },
  {
    id: 'be_ti',
    name: 'Bé Tí',
    isRegular: true,
    recipe: 'BANH_MI_CHA',
    arrivalMinute: 120, // 10:00
    priceSensitivity: 'LOW',
    specialRequest: 'EXTRA_CHA',
    dialogue: 'Chú ơi cho con ổ Bánh mì chả, chú cho con xin thêm chả nghen!'
  },
  {
    id: 'co_chin',
    name: 'Cô Chín',
    isRegular: true,
    recipe: 'TRA_TAC',
    arrivalMinute: 180, // 11:00
    priceSensitivity: 'MEDIUM',
    dialogue: 'Cô đi chợ về ngang, làm cô ly trà tắc chua ngọt thanh mát nghe con!'
  },
  {
    id: 'anh_tung',
    name: 'Anh Tùng',
    isRegular: true,
    recipe: 'SUA_DAU_DA',
    arrivalMinute: 225, // 11:45
    priceSensitivity: 'LOW',
    dialogue: 'Cho anh ly Sữa đậu đá mát rượi em ơi! Đang vội chạy cuốc khách trưa!'
  },
  {
    id: 'bac_nam',
    name: 'Bác Năm',
    isRegular: false,
    recipe: 'BANH_MI_CHA',
    arrivalMinute: 255, // 12:15
    priceSensitivity: 'HIGH',
    dialogue: 'Làm bác ổ bánh mì dằn bụng buổi trưa chú em ơi.'
  },
  {
    id: 'co_bay',
    name: 'Cô Bảy',
    isRegular: false,
    recipe: 'TRA_TAC',
    arrivalMinute: 285, // 12:45
    priceSensitivity: 'HIGH',
    dialogue: 'Nắng nôi quá, cho ly trà tắc giải khát đi con!'
  },
  {
    id: 'chu_tu',
    name: 'Chú Tư',
    isRegular: false,
    recipe: 'BANH_MI_CHA',
    arrivalMinute: 315, // 13:15
    priceSensitivity: 'HIGH',
    dialogue: 'Còn bánh mì không chú? Làm tui một ổ mang đi.'
  }
]);

export const SAVE_KEY = 'xom_nho_v07_idle_save_v1';
export const BIKE_CAPACITY = 20;

export function fresh() {
  return {
    revision: 0,
    shopName: '',
    currentDay: 1,
    dayStartingCash: 60000,
    upgradeSpent: 0,
    spoilageLoss: 0,
    operatingExpenses: 0,
    sideJobIncome: 0,
    tips: 0,
    dayHistory: [],
    login: { lastClaimDate: null, visitDays: 0, stamps: [] },
    staffHiredToday: false,
    onlineEnabledToday: false,
    onlineFees: 0,
    lastDayReport: null,
    rating: null,
    upgrades: { vehicleCapacity: 20, counterSlots: 3, seatingLevel: 0, bike_basket: 0, counter: 0, seating: 0, canopy: 0 },
    marketPrices: Object.fromEntries(Object.entries(ingredients).map(([id, item]) => [id, item.price])),
    dayEvent: dayConfig(1),
    dayCustomers: structuredClone(fixtureCustomers),
    screen: 'HOME', // 'HOME' | 'XOM_OI' | 'MARKET' | 'MENU' | 'SHOP' | 'DAY_RESULT'
    cash: 60000,
    spent: 0,
    revenue: 0,
    debt: 0,
    
    // Inventory
    basket: Object.fromEntries(Object.keys(ingredients).map(k => [k, 0])),
    stock: Object.fromEntries(Object.keys(ingredients).map(k => [k, 0])),
    stockBatches: Object.fromEntries(Object.keys(ingredients).map(k => [k, []])),
    
    // Menu setup (3 starter slots)
    menu: {
      BANH_MI_CHA: { enabled: true, sellPrice: 25000 },
      TRA_TAC: { enabled: true, sellPrice: 15000 },
      SUA_DAU_DA: { enabled: true, sellPrice: 17000 },
      BANH_MI_TRUNG: { enabled: false, sellPrice: 27000 }
    },
    openingTime: 'ontime_8am', // 'early_6am' | 'ontime_8am' | 'late_10am'
    
    // Idle simulation state
    clock: 0, // In-game minutes elapsed (0 to 360)
    speed: 1, // 1 or 2
    isPaused: false, // Paused when decision is active
    
    // Customer roster & progression
    customerIndex: 0,
    activeCustomer: null, // Current customer at counter
    extraCha: null, // null | true | false
    activeDecision: null, // null or { id: 'EXTRA_CHA', title: string, options: [...] }
    
    // Non-pausing news ticker
    newsTicker: null, // null or { id: string, text: string, endMinute: number }
    newsSeen: false,
    eventDecisionSeen: false,
    
    // Transaction history
    servedOrders: [], // Array of { ticketId, personId, name, recipe, sellPrice, cogs, ingredientsUsed }
    missedOrders: [], // Array of { ticketId, personId, name, recipe, reason }
    
    knownRecipeIds: ['BANH_MI_CHA', 'TRA_TAC', 'SUA_DAU_DA'],
    teasedRecipeIds: ['BANH_MI_TRUNG'],
    facts: {}
  };
}

export const totalBasketUnits = basket => Object.values(basket).reduce((sum, q) => sum + q, 0);
export const totalBasketCost = (basket, prices) => Object.entries(basket).reduce((sum, [id, qty]) => sum + (prices?.[id] ?? ingredients[id]?.price ?? 0) * qty, 0);

function consumeBatches(s, needs) {
  let cost = 0;
  for (const [id, qty] of Object.entries(needs)) {
    let left = qty;
    for (const batch of s.stockBatches?.[id] || []) {
      const used = Math.min(left, batch.quantityRemaining);
      batch.quantityRemaining -= used;
      cost += used * batch.unitCost;
      left -= used;
      if (!left) break;
    }
    // Legacy saves and older engine tests may have quantities without batches.
    if (left) cost += left * (s.marketPrices?.[id] ?? ingredients[id].price);
    s.stock[id] -= qty;
  }
  return cost;
}

function clearFreshStock(s) {
  let loss = 0;
  for (const id of FRESH_INGREDIENTS) {
    loss += (s.stockBatches?.[id] || []).reduce((n, b) => n + b.quantityRemaining * b.unitCost, 0);
    s.stock[id] = 0;
    s.stockBatches[id] = [];
  }
  s.spoilageLoss = loss;
}

export const recipeNeeds = (recipeId, extraCha = false) => {
  const base = { ...recipes[recipeId].needs };
  if (recipeId === 'BANH_MI_CHA' && extraCha) {
    base.cha = 2;
  }
  return base;
};

export const hasEnoughStock = (stock, needs) => {
  return Object.entries(needs).every(([ing, qty]) => (stock[ing] || 0) >= qty);
};

export const calculateRecipeCost = (needs) => {
  return Object.entries(needs).reduce((sum, [ing, qty]) => sum + (ingredients[ing]?.price || 0) * qty, 0);
};

const copy = s => structuredClone(s);

export function action(state, type, payload) {
  const s = copy(state);
  const fail = message => ({ state, error: message });

  if (type === 'SET_SHOP_NAME') {
    if (s.screen !== 'HOME') return fail('Chỉ đặt tên quán trước khi bắt đầu.');
    const name = typeof payload === 'string' ? payload.trim().replace(/\s+/g, ' ') : '';
    if (name.length < 2 || name.length > 24 || /[\x00-\x1f\x7f]/.test(name)) return fail('Tên quán cần từ 2 đến 24 ký tự.');
    s.shopName = name;
  } else if (type === 'CLAIM_LOGIN') {
    // The calendar is independent of simulated days; no cash or streak loss.
    if (typeof payload !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(payload) || !Number.isFinite(Date.parse(payload + 'T00:00:00Z'))) return fail('Ngày đăng nhập không hợp lệ.');
    s.login ||= { lastClaimDate: null, visitDays: 0, stamps: [] };
    if (s.login.lastClaimDate === payload) return { state };
    if (s.login.lastClaimDate && payload < s.login.lastClaimDate) return { state };
    s.login.lastClaimDate = payload;
    s.login.visitDays += 1;
    s.login.stamps.push(payload);
  } else if (type === 'NAVIGATE') {
    if (s.screen === 'HOME' && !s.shopName) return fail('Hãy đặt tên quán trước khi bắt đầu.');
    const nextMap = {
      HOME: 'XOM_OI',
      XOM_OI: 'MARKET'
    };
    const next = nextMap[s.screen];
    if (!next) return fail('Không có bước tiếp theo ở màn này.');
    s.screen = next;
  } else if (type === 'REPLAY') {
    return { state: fresh() };
  } else if (type === 'BASKET') {
    if (s.screen !== 'MARKET' || !payload || !Object.hasOwn(ingredients, payload.id) || !Number.isInteger(payload.qty) || payload.qty < 0) {
      return fail('Số lượng nguyên liệu không hợp lệ.');
    }
    const tentative = { ...s.basket, [payload.id]: payload.qty };
    if (totalBasketUnits(tentative) > s.upgrades.vehicleCapacity) {
      return fail(`Sức chở tối đa ${s.upgrades.vehicleCapacity} đơn vị.`);
    }
    s.basket[payload.id] = payload.qty;
  } else if (type === 'BUNDLE_DAY1') {
    // 55k bundle for 6 customers: 19 units total
    if (s.screen !== 'MARKET' || s.currentDay !== 1) return fail('Gói mẫu chỉ dùng cho ngày đầu.');
    const bundle = {
      bread: 3,
      cha: 4,
      vegetable: 3,
      ice: 3,
      sugar_syrup: 3,
      kumquat: 2,
      soy_milk: 1
    };
    if (totalBasketUnits(bundle) > s.upgrades.vehicleCapacity) return fail('Vượt sức chở.');
    s.basket = bundle;
  } else if (type === 'BUY') {
    if (s.screen !== 'MARKET') return fail('Chỉ mua hàng ở chợ.');
    const cost = totalBasketCost(s.basket, s.marketPrices);
    if (cost > s.cash) return fail('Không đủ tiền mặt để mua số hàng này.');
    if (totalBasketUnits(s.basket) === 0 && s.currentDay === 1) return fail('Giỏ hàng đang trống.');
    
    // Add to stock
    for (const [k, qty] of Object.entries(s.basket)) {
      s.stock[k] = (s.stock[k] || 0) + qty;
      if (qty) s.stockBatches[k].push({ quantityRemaining: qty, unitCost: s.marketPrices[k], dayAcquired: s.currentDay });
    }
    s.cash -= cost;
    s.spent += cost;
    s.basket = Object.fromEntries(Object.keys(ingredients).map(k => [k, 0]));
    s.screen = 'MENU';
  } else if (type === 'UPGRADE') {
    if (s.screen !== 'XOM_OI' || s.currentDay < 2 || !Object.hasOwn(UPGRADE_CATALOG, payload)) return fail('Nâng cấp chỉ mua vào buổi sáng từ ngày 2.');
    const def = UPGRADE_CATALOG[payload];
    if (s.currentDay < (def.unlockDay || 2)) return fail('Chưa đến ngày mở nâng cấp này.');
    if (s.upgrades[payload] >= def.maxLevel) return fail('Đã nâng cấp tối đa.');
    const upgradeCost = s.upgrades[payload] === 1 ? (def.nextCost || def.cost) : def.cost;
    if (s.cash < upgradeCost) return fail('Không đủ tiền mặt để nâng cấp.');
    s.cash -= upgradeCost;
    s.upgradeSpent += upgradeCost;
    s.upgrades[payload] += 1;
    if (payload === 'bike_basket') s.upgrades.vehicleCapacity = s.upgrades.bike_basket === 1 ? 30 : 45;
    if (payload === 'counter') {
      s.upgrades.counterSlots = 4;
    }
    if (payload === 'seating' || payload === 'canopy') {
      const extras = s.dayCustomers.filter(c => c.isOnline || c.id.startsWith('staff_peak_'));
      s.dayCustomers = [...rosterForDay(s.currentDay, s.rating ?? 3, s.upgrades.seating, s.upgrades.canopy), ...extras].sort((a, b) => a.arrivalMinute - b.arrivalMinute);
    }
  } else if (type === 'HIRE_STAFF') {
    if (s.screen !== 'XOM_OI' || s.currentDay < 8 || s.staffHiredToday || s.cash < 8000) return fail('Từ ngày 8 có thể thuê người phụ với lương 8.000đ/ca.');
    s.cash -= 8000;
    s.operatingExpenses += 8000;
    s.staffHiredToday = true;
    // A helper handles two additional peak-hour walk-ins; their sales still
    // require ingredients and remain subject to menu and price choices.
    const additional = s.dayCustomers.slice(0, 2).map((customer, i) => ({
      ...customer, id: `staff_peak_d${s.currentDay}_${i}`, personId: `staff_peak_${i}`,
      name: i ? 'Anh ghé giờ trưa' : 'Chị ghé giờ trưa',
      arrivalMinute: 185 + i * 20, dialogue: 'Thấy quán bán nhanh nên mình ghé thử một phần nhé!'
    }));
    s.dayCustomers.push(...additional);
    s.dayCustomers.sort((a, b) => a.arrivalMinute - b.arrivalMinute);
  } else if (type === 'LEARN_RECIPE') {
    if (s.screen !== 'XOM_OI' || s.currentDay < 3 || payload !== 'BANH_MI_TRUNG' || !s.upgrades.counter || s.knownRecipeIds.includes(payload) || s.cash < 12000) return fail('Cần nới quầy và 12.000đ học món từ ngày 3.');
    s.cash -= 12000;
    s.upgradeSpent += 12000;
    s.knownRecipeIds.push(payload);
    s.menu[payload].enabled = true;
  } else if (type === 'ENABLE_ONLINE') {
    if (s.screen !== 'XOM_OI' || s.currentDay < 15 || s.onlineEnabledToday) return fail('Đơn mang đi mở từ ngày 15, chọn một lần trước ca.');
    s.onlineEnabledToday = true;
    // Two delivery tickets compete for the same pantry stock as walk-in guests.
    for (let i = 0; i < 2; i++) s.dayCustomers.push({ id: `online_d${s.currentDay}_${i}`, personId: `online_${i}`, visualVariantId: 'online_order', name: `Đơn mang đi ${i + 1}`, isRegular: false, isOnline: true, recipe: i ? 'TRA_TAC' : 'BANH_MI_CHA', arrivalMinute: 160 + i * 65, priceSensitivity: 'LOW', temperament: 'NORMAL', dialogue: 'Đơn đặt mang đi, gói giúp mình nhé!' });
    s.dayCustomers.sort((a, b) => a.arrivalMinute - b.arrivalMinute);
  } else if (type === 'SIDE_JOB') {
    if (s.screen !== 'XOM_OI' || s.currentDay < 2 || s.cash >= 11000 || s.sideJobIncome) return fail('Việc phụ chỉ mở khi quán thiếu vốn nhập món cơ bản.');
    s.cash += 15000;
    s.sideJobIncome = 15000;
  } else if (type === 'CONFIG_MENU') {
    // payload: { recipeId, enabled?: boolean, sellPrice?: number }
    if (s.screen !== 'MENU' || !payload || !Object.hasOwn(recipes, payload.recipeId)) return fail('Món không hợp lệ.');
    if (payload.recipeId === 'BANH_MI_TRUNG' && (!s.upgrades.counter || !s.knownRecipeIds.includes('BANH_MI_TRUNG'))) return fail('Cần nới quầy và học công thức bánh mì ốp la.');
    if (payload.enabled !== undefined) {
      if (payload.enabled && !s.menu[payload.recipeId].enabled && Object.values(s.menu).filter(m => m.enabled).length >= s.upgrades.counterSlots) return fail('Không còn chỗ trưng bày trên quầy.');
      s.menu[payload.recipeId].enabled = Boolean(payload.enabled);
    }
    if (payload.sellPrice !== undefined) {
      if (!recipes[payload.recipeId].priceTiers.includes(payload.sellPrice)) {
        return fail('Mức giá không nằm trong tier quy định.');
      }
      s.menu[payload.recipeId].sellPrice = payload.sellPrice;
    }
  } else if (type === 'SET_OPENING_TIME') {
    if (s.screen !== 'MENU') return fail('Chỉ chọn giờ mở cửa trước khi mở quán.');
    if (!['early_6am', 'ontime_8am', 'late_10am'].includes(payload)) return fail('Giờ mở không hợp lệ.');
    s.openingTime = payload;
  } else if (type === 'START_DAY') {
    if (s.screen !== 'MENU') return fail('Chỉ bắt đầu ca bán từ màn hình Menu.');
    if (!s.shopName) return fail('Hãy đặt tên quán trước khi mở bán.');
    const enabledDishes = Object.values(s.menu).filter(m => m.enabled);
    if (enabledDishes.length === 0) return fail('Cần bật ít nhất 1 món trong thực đơn.');
    if (s.openingTime === 'early_6am' && s.currentDay >= 2 && s.cash < s.dayEvent.costDelta) return fail('Không đủ tiền chuẩn bị mở quán sớm hôm nay.');
    s.screen = 'SHOP';
    s.activeCustomer = null;
    s.isPaused = false;
    s.activeDecision = null;
    s.extraCha = null;
    s.servedOrders = [];
    s.missedOrders = [];
    if (s.openingTime === 'early_6am' && s.currentDay >= 2) {
      s.dayCustomers.unshift({
        id: `early_d${s.currentDay}`, personId: `early_d${s.currentDay}`,
        visualVariantId: 'walkin_variant_0', name: 'Cô đi chợ sớm', isRegular: false,
        recipe: 'TRA_TAC', arrivalMinute: -60, priceSensitivity: 'MEDIUM', temperament: 'FRIENDLY',
        dialogue: 'Mở sớm quá hay! Cho cô ly trà tắc mang đi nghen.'
      });
      if (s.dayEvent.costDelta) {
        s.cash -= s.dayEvent.costDelta;
        s.operatingExpenses = s.dayEvent.costDelta;
      }
    }
    s.newsTicker = null;
    s.newsSeen = false;
    s.eventDecisionSeen = false;

    if (s.openingTime === 'late_10am') {
      // Quán mở muộn 10:00: Khách ghé trước 10:00 (minute 120) bị bỏ lỡ
      s.clock = 120; // 10:00 AM
      let idx = 0;
      while (idx < s.dayCustomers.length && s.dayCustomers[idx].arrivalMinute < 120) {
        const missedCust = s.dayCustomers[idx];
        s.missedOrders.push({
          ticketId: missedCust.id + '_late_opening',
          personId: missedCust.personId || missedCust.id,
          name: missedCust.name,
          recipe: missedCust.recipe,
          reason: 'MISSED_LATE_OPENING',
          note: 'Quán mở trễ lúc 10h, khách sáng đã đi qua chỗ khác.',
          timestampMinute: missedCust.arrivalMinute
        });
        const pid = missedCust.personId || missedCust.id;
        s.facts[pid] = {
          ...(s.facts[pid] || {}),
          missed_orders: ((s.facts[pid]?.missed_orders) || 0) + 1
        };
        idx++;
      }
      s.customerIndex = idx; // Starts with Bé Tí (index 2)
    } else {
      // Clock stores minutes relative to 08:00, including the early 06:00 opening.
      s.clock = s.openingTime === 'early_6am' ? -120 : 0;
      s.customerIndex = 0;
    }
  } else if (type === 'SET_SPEED') {
    if (s.screen !== 'SHOP') return fail('Chỉ đổi tốc độ trong giờ bán.');
    if (![1, 2].includes(payload)) return fail('Tốc độ không hợp lệ.');
    s.speed = payload;
  } else if (type === 'TICK') {
    // Simulation step: deltaMinutes (typically 1 to 5 in-game minutes)
    if (s.screen !== 'SHOP') return fail('Quán chưa mở.');
    if (s.isPaused) return { state: s }; // Paused when decision is active
    
    const delta = Number(payload);
    if (!Number.isFinite(delta) || delta <= 0 || delta > 60) return fail('Bước thời gian không hợp lệ.');
    // The UI controls x2 through its interval. Simulation minutes per tick stay fixed.
    s.clock = Math.min(360, s.clock + delta);

    // Self-healing customer departure recovery:
    // If customer finished serving/rejecting and UI timer was lost (e.g. page reload),
    // automatically clear customer after 4 simulation ticks.
    if (s.activeCustomer && ['SERVED', 'OUT_OF_STOCK', 'MENU_DISABLED', 'PRICE_REJECTED'].includes(s.activeCustomer.status)) {
      s.activeCustomer.ticksInCompletedState = (s.activeCustomer.ticksInCompletedState || 0) + 1;
      if (s.activeCustomer.ticksInCompletedState >= 4) {
        s.activeCustomer = null;
        s.customerIndex += 1;
      }
    }
    
    // Check Market News Ticker at minute 195 (11:15 AM)
    if (s.clock >= 195 && !s.newsSeen) {
      s.newsSeen = true;
      s.newsTicker = {
        id: s.currentDay === 1 ? 'KUMQUAT_PRICE_RUMOR' : s.dayEvent.event,
        text: s.currentDay === 1 ? 'Bà Sáu chợ đầu ngõ: "Tắc chiều gom ép nước giá lên 3.000đ rồi đó nghen!"' : s.dayEvent.forecast,
        endMinute: 235
      };
    } else if (s.newsTicker && s.clock >= s.newsTicker.endMinute) {
      s.newsTicker = null;
    }
    if (s.dayEvent.event === 'roadwork' && s.clock >= 150 && !s.eventDecisionSeen && !s.activeDecision) {
      s.eventDecisionSeen = true;
      s.isPaused = true;
      s.activeDecision = {
        id: 'ROADWORK_SIGN', title: 'Đầu hẻm đang sửa đường',
        message: 'Có người đi ngang hỏi đường vào quán. Làm bảng chỉ vào hẻm 3.000đ không?',
        options: [
          { key: 'yes', label: 'Làm bảng chỉ đường · 3.000đ' },
          { key: 'no', label: 'Để khách tự tìm quán' }
        ]
      };
    }
    
    // Spawn next customer if no active customer and clock matches
    if (!s.activeCustomer && s.customerIndex < s.dayCustomers.length) {
      const nextCust = s.dayCustomers[s.customerIndex];
      if (s.clock >= nextCust.arrivalMinute) {
        s.activeCustomer = {
          ...nextCust,
          status: 'ARRIVED'
        };
        // If Bé Tí with special request: trigger pause decision
        if (nextCust.id === 'be_ti' && s.extraCha === null) {
          s.isPaused = true;
          s.activeDecision = {
            id: 'EXTRA_CHA',
            title: 'Bé Tí Xin Thêm Chả',
            message: 'Chú ơi cho con ổ Bánh mì chả, chú cho con xin thêm chả nghen!',
            options: [
              { key: 'yes', label: '👍 Thêm chả cho con (+1 chả)', extraCost: 5000 },
              { key: 'no', label: '✋ Bán phần thường nha con', extraCost: 0 }
            ]
          };
        }
      }
    }
    if (s.clock >= 360 && !s.activeCustomer) return action(s, 'CLOSE');
  } else if (type === 'DECIDE') {
    // Resolves a pending decision, e.g. payload: { choice: 'yes' | 'no' }
    if (s.screen !== 'SHOP' || !s.activeDecision || !s.isPaused) return fail('Không có quyết định đang chờ.');
    if (!['yes', 'no'].includes(payload?.choice)) return fail('Lựa chọn không hợp lệ.');
    if (s.activeDecision.id === 'EXTRA_CHA') {
      if (payload.choice === 'yes' && (s.stock.cha || 0) < 2) return fail('Không đủ 2 phần chả để thêm cho Bé Tí. Chọn phần thường hoặc nhập nhiều hơn ngày sau.');
      s.extraCha = payload.choice === 'yes';
      s.activeDecision = null;
      s.isPaused = false;
    } else if (s.activeDecision.id === 'ROADWORK_SIGN') {
      if (payload.choice === 'yes' && s.cash < 3000) return fail('Không đủ 3.000đ làm bảng chỉ đường.');
      if (payload.choice === 'yes') {
        s.cash -= 3000;
        s.operatingExpenses += 3000;
        s.dayCustomers.push({ id: `sign_d${s.currentDay}`, personId: 'visitor_sign', visualVariantId: 'walkin_variant_2', name: 'Cô tìm quán trong hẻm', isRegular: false, recipe: 'TRA_TAC', arrivalMinute: 265, priceSensitivity: 'MEDIUM', temperament: 'NORMAL', dialogue: 'May có bảng chỉ đường, cô mới tìm được quán!' });
        s.dayCustomers.sort((a, b) => a.arrivalMinute - b.arrivalMinute);
      }
      s.activeDecision = null;
      s.isPaused = false;
    }
  } else if (type === 'SERVE_AUTO') {
    // Automatically prepare and serve the active customer
    if (s.screen !== 'SHOP' || !s.activeCustomer) return fail('Không có khách tại quầy.');
    if (s.activeCustomer.status !== 'ARRIVED' || s.isPaused) return fail('Đơn này chưa sẵn sàng hoặc đã xử lý.');
    const cust = s.activeCustomer;
    const personId = cust.personId || cust.id;
    const recipeId = cust.recipe;
    const isExtra = cust.id === 'be_ti' && s.extraCha === true;
    const needs = recipeNeeds(recipeId, isExtra);
    const menuItem = s.menu[recipeId];
    const recipeDef = recipes[recipeId];
    
    // 1. Check if recipe is disabled in today's menu
    if (!menuItem || !menuItem.enabled) {
      s.missedOrders.push({
        ticketId: cust.id + '_' + s.clock,
        personId,
        name: cust.name,
        recipe: recipeId,
        reason: 'MENU_DISABLED',
        note: 'Món không có trong thực đơn hôm nay.',
        timestampMinute: s.clock
      });
      s.facts[personId] = {
        ...(s.facts[personId] || {}),
        missed_orders: ((s.facts[personId]?.missed_orders) || 0) + 1
      };
      s.activeCustomer.status = 'MENU_DISABLED';
      s.revision = state.revision + 1;
      return { state: s };
    }

    // 2. Check customer price sensitivity (High tier vs HIGH sensitivity)
    const isHighPrice = menuItem.sellPrice > recipeDef.basePrice;
    if (isHighPrice && cust.priceSensitivity === 'HIGH') {
      s.missedOrders.push({
        ticketId: cust.id + '_' + s.clock,
        personId,
        name: cust.name,
        recipe: recipeId,
        reason: 'PRICE_TOO_HIGH',
        note: `Khách chê giá đắt (${menuItem.sellPrice.toLocaleString('vi-VN')}đ).`,
        timestampMinute: s.clock
      });
      s.facts[personId] = {
        ...(s.facts[personId] || {}),
        missed_orders: ((s.facts[personId]?.missed_orders) || 0) + 1
      };
      s.activeCustomer.status = 'PRICE_REJECTED';
      s.revision = state.revision + 1;
      return { state: s };
    }

    // 3. Check inventory stock
    if (!hasEnoughStock(s.stock, needs)) {
      s.missedOrders.push({
        ticketId: cust.id + '_' + s.clock,
        personId,
        name: cust.name,
        recipe: recipeId,
        reason: 'OUT_OF_STOCK',
        note: 'Hết nguyên liệu trong kho.',
        timestampMinute: s.clock
      });
      s.facts[personId] = {
        ...(s.facts[personId] || {}),
        missed_orders: ((s.facts[personId]?.missed_orders) || 0) + 1
      };
      s.activeCustomer.status = 'OUT_OF_STOCK';
      s.revision = state.revision + 1;
      return { state: s };
    }

    // 4. Fulfill order successfully
    const cogs = consumeBatches(s, needs);
    const sellPrice = menuItem.sellPrice;
    const tip = s.currentDay > 1 && cust.temperament === 'FRIENDLY' ? 1000 + (s.dayEvent.tipBonus || 0) + (s.staffHiredToday ? 500 : 0) : 0;
    const onlineFee = cust.isOnline ? 2000 : 0;
    s.cash += sellPrice + tip - onlineFee;
    s.onlineFees = (s.onlineFees || 0) + onlineFee;
    s.tips += tip;
    s.revenue += sellPrice;
    
    s.servedOrders.push({
      ticketId: cust.id + '_' + s.clock,
      personId,
      name: cust.name,
      recipe: recipeId,
      sellPrice,
      cogs,
      tip,
      onlineFee,
      isOnline: Boolean(cust.isOnline),
      ingredientsUsed: needs,
      timestampMinute: s.clock
    });
    
    s.facts[personId] = {
      ...(s.facts[personId] || {}),
      successful_orders: ((s.facts[personId]?.successful_orders) || 0) + 1,
      times_given_extra: ((s.facts[personId]?.times_given_extra) || 0) + (isExtra ? 1 : 0)
    };
    s.activeCustomer.status = 'SERVED';
  } else if (type === 'CUSTOMER_LEAVE') {
    if (s.screen !== 'SHOP' || !s.activeCustomer) return fail('Không có khách đang rời.');
    if (!['SERVED', 'OUT_OF_STOCK', 'MENU_DISABLED', 'PRICE_REJECTED'].includes(s.activeCustomer.status)) return fail('Khách chưa được xử lý.');
    s.activeCustomer = null;
    s.customerIndex += 1;
    if (s.clock >= 360) return action(s, 'CLOSE');
  } else if (type === 'CLOSE') {
    if (s.screen !== 'SHOP') return fail('Quán chưa mở.');
    // Closing early is a management decision: everyone not yet served is a
    // missed customer, while an already completed transaction remains recorded.
    const completed = s.activeCustomer && ['SERVED', 'OUT_OF_STOCK', 'MENU_DISABLED', 'PRICE_REJECTED'].includes(s.activeCustomer.status);
    const fromIndex = s.customerIndex + (completed ? 1 : 0);
    for (let i = fromIndex; i < s.dayCustomers.length; i++) {
      const customer = s.dayCustomers[i];
      s.missedOrders.push({
        ticketId: customer.id + '_early_close',
        personId: customer.personId || customer.id,
        name: customer.name,
        recipe: customer.recipe,
        reason: 'MISSED_EARLY_CLOSING',
        note: 'Quán đã đóng trước khi khách được phục vụ.',
        timestampMinute: customer.arrivalMinute
      });
      const pid = customer.personId || customer.id;
      s.facts[pid] = {
        ...(s.facts[pid] || {}),
        missed_orders: (s.facts[pid]?.missed_orders || 0) + 1
      };
    }
    s.customerIndex = s.dayCustomers.length;
    s.activeCustomer = null;
    s.activeDecision = null;
    s.isPaused = false;
    clearFreshStock(s);
    const total = s.servedOrders.length + s.missedOrders.length;
    const serviceRate = total ? s.servedOrders.length / total : 0;
    // Demand growth or bad weather cannot lower rating by itself. Voluntary
    // early closure, high pricing and menu removals remain controllable.
    const avoidable = s.missedOrders.filter(o => ['PRICE_TOO_HIGH', 'MENU_DISABLED', 'MISSED_EARLY_CLOSING'].includes(o.reason)).length;
    s.rating = s.currentDay === 1 ? 3 : Math.max(1, Math.min(5, (s.rating ?? 3) + (avoidable > total / 3 ? -.5 : serviceRate >= .8 && s.servedOrders.length >= 5 ? .5 : 0)));
    s.screen = 'DAY_RESULT';
    const feedback = [...s.missedOrders.map(o => ({ personId: o.personId, name: o.name, reason: o.reason, text: o.reason === 'OUT_OF_STOCK' ? 'Tiếc quá, quán hết món rồi; mai mình ghé sớm nhé.' : o.reason === 'PRICE_TOO_HIGH' ? 'Giá hôm nay cao quá, để bữa khác ghé.' : o.reason === 'MENU_DISABLED' ? 'Hôm nay không có món mình thích rồi.' : 'Mình ghé mà quán chưa bán hoặc đã đóng.' })), ...s.servedOrders.map(o => ({ personId: o.personId, name: o.name, reason: 'SERVED', text: o.tip ? 'Ngon quá, gửi quán thêm chút tiền cà phê!' : o.personId === 'be_ti' && s.extraCha ? 'Nhiều chả quá, con thích lắm!' : 'Món vừa miệng, cảm ơn quán nha!' }))];
    s.lastDayReport = { day: s.currentDay, feedback, forecastTomorrow: dayConfig(s.currentDay + 1).forecast, served: s.servedOrders.length, missed: s.missedOrders.length, cash: s.cash, revenue: s.revenue, cogs: s.servedOrders.reduce((n, o) => n + o.cogs, 0), spoilage: s.spoilageLoss, rating: s.rating };
    s.dayHistory.push(s.lastDayReport);
  } else if (type === 'NEXT_DAY') {
    if (s.screen !== 'DAY_RESULT') return fail('Hãy kết thúc ca bán trước khi qua ngày mới.');
    s.currentDay += 1;
    s.dayStartingCash = s.cash;
    s.upgradeSpent = 0;
    s.spoilageLoss = 0;
    s.operatingExpenses = 0;
    s.onlineFees = 0;
    s.onlineEnabledToday = false;
    s.staffHiredToday = false;
    s.sideJobIncome = 0;
    s.tips = 0;
    s.spent = 0;
    s.revenue = 0;
    s.clock = 0;
    s.customerIndex = 0;
    s.activeCustomer = null;
    s.activeDecision = null;
    s.extraCha = null;
    s.newsTicker = null;
    s.newsSeen = false;
    s.eventDecisionSeen = false;
    s.isPaused = false;
    s.speed = 1;
    s.servedOrders = [];
    s.missedOrders = [];
    s.basket = Object.fromEntries(Object.keys(ingredients).map(k => [k, 0]));
    s.dayEvent = dayConfig(s.currentDay);
    s.marketPrices = Object.fromEntries(Object.entries(ingredients).map(([id, item]) => [id, s.dayEvent.marketPrices?.[id] ?? item.price]));
    s.dayCustomers = rosterForDay(s.currentDay, s.rating ?? 3, s.upgrades.seating, s.upgrades.canopy);
    s.openingTime = 'ontime_8am';
    s.screen = 'XOM_OI';
  } else {
    return fail('Lệnh không hợp lệ.');
  }

  s.revision = state.revision + 1;
  return { state: s };
}

// Transparent Ledger Calculation strictly from actual transactions
export function calculateLedger(state) {
  const startingCash = state.dayStartingCash ?? 60000;
  const spentOnMorningStock = state.spent || 0;
  const upgradeOutlay = state.upgradeSpent || 0;
  const operatingExpenses = state.operatingExpenses || 0;
  const onlineFees = state.onlineFees || 0;
  const sideJobIncome = state.sideJobIncome || 0;
  
  // Actual cash collected from sales
  const cashSalesCollected = (state.servedOrders || []).reduce((sum, o) => sum + o.sellPrice, 0);
  const uncollectedCreditSales = 0; // Day 1 fixture: zero debt
  const tipsCollected = (state.servedOrders || []).reduce((sum, o) => sum + (o.tip || 0), 0);
  
  // Reconciled physical cash in drawer
  // finalCashInDrawer = startingCash - spentOnMorningStock + cashSalesCollected + tipsCollected
  const finalCashInDrawer = startingCash - upgradeOutlay - operatingExpenses - onlineFees - spentOnMorningStock + cashSalesCollected + tipsCollected + sideJobIncome;
  const netCashDifferenceToday = finalCashInDrawer - startingCash;
  
  // Accrual P&L: COGS of sold items only
  const cogsSoldItemsOnly = (state.servedOrders || []).reduce((sum, o) => sum + o.cogs, 0);
  const totalSalesRevenue = cashSalesCollected;
  const grossOperatingProfit = totalSalesRevenue - cogsSoldItemsOnly;
  
  // Leftover stock value in pantry
  const retainedStockValueAtCost = state.stockBatches
    ? Object.values(state.stockBatches).flat().reduce((sum, batch) => sum + batch.quantityRemaining * batch.unitCost, 0)
    : Object.entries(state.stock || {}).reduce((sum, [id, qty]) => sum + (ingredients[id]?.price || 0) * Math.max(0, qty), 0);
  
  // Breakdown by dish
  const dishBreakdown = {};
  for (const [recipeId, recipeData] of Object.entries(recipes)) {
    const orders = (state.servedOrders || []).filter(o => o.recipe === recipeId);
    dishBreakdown[recipeId] = {
      name: recipeData.name,
      count: orders.length,
      revenue: orders.reduce((s, o) => s + o.sellPrice, 0),
      cogs: orders.reduce((s, o) => s + o.cogs, 0),
      margin: orders.reduce((s, o) => s + (o.sellPrice - o.cogs), 0)
    };
  }

  const missedOrders = state.missedOrders || [];
  const missedByReason = {
    OUT_OF_STOCK: missedOrders.filter(o => o.reason === 'OUT_OF_STOCK'),
    MENU_DISABLED: missedOrders.filter(o => o.reason === 'MENU_DISABLED'),
    PRICE_TOO_HIGH: missedOrders.filter(o => o.reason === 'PRICE_TOO_HIGH'),
    MISSED_LATE_OPENING: missedOrders.filter(o => o.reason === 'MISSED_LATE_OPENING'),
    MISSED_EARLY_CLOSING: missedOrders.filter(o => o.reason === 'MISSED_EARLY_CLOSING')
  };
  
  return {
    startingCash,
    spentOnMorningStock,
    upgradeOutlay,
    operatingExpenses,
    onlineFees,
    sideJobIncome,
    spoilageLoss: state.spoilageLoss || 0,
    cashSalesCollected,
    uncollectedCreditSales,
    tipsCollected,
    finalCashInDrawer,
    netCashDifferenceToday,
    totalSalesRevenue,
    cogsSoldItemsOnly,
    grossOperatingProfit,
    resultAfterSpoilageAndExpenses: grossOperatingProfit - (state.spoilageLoss || 0) - operatingExpenses - onlineFees + sideJobIncome,
    retainedStockValueAtCost,
    dishBreakdown,
    servedCount: (state.servedOrders || []).length,
    missedCount: missedOrders.length,
    missedOrders,
    missedByReason
  };
}

// Stable checksum encoding / decoding for dual-slot localStorage
export function checksum(value) {
  let n = 2166136261;
  for (const ch of JSON.stringify(value)) {
    n = Math.imul(n ^ ch.charCodeAt(0), 16777619);
  }
  return (n >>> 0).toString(16);
}

export function encode(state) {
  return JSON.stringify({
    saveRevision: state.revision,
    checksum: checksum(state),
    state
  });
}

export function decode(raw) {
  try {
    const data = JSON.parse(raw);
    if (
      data.saveRevision !== data.state.revision ||
      data.checksum !== checksum(data.state) ||
      !['HOME', 'XOM_OI', 'MARKET', 'MENU', 'SHOP', 'DAY_RESULT'].includes(data.state.screen)
    ) {
      return null;
    }
    const s = data.state;
    // v0.7 saves predate the seven-day loop. Verify their original checksum
    // first, then fill the new fields without discarding a day in progress.
    if (s.currentDay === undefined) {
      const defaults = fresh();
      s.shopName = s.shopName || 'Quán Xóm Nhỏ';
      s.currentDay = 1;
      s.dayStartingCash = 60000;
      s.upgradeSpent = 0;
      s.spoilageLoss = 0;
      s.operatingExpenses = 0;
      s.sideJobIncome = 0;
      s.tips = 0;
      s.dayHistory = [];
      s.rating = null;
      s.upgrades = defaults.upgrades;
      s.marketPrices = defaults.marketPrices;
      s.dayEvent = defaults.dayEvent;
      s.dayCustomers = defaults.dayCustomers;
      s.stock.egg = s.stock.egg || 0;
      s.basket.egg = s.basket.egg || 0;
      s.menu.BANH_MI_TRUNG = defaults.menu.BANH_MI_TRUNG;
      s.stockBatches = Object.fromEntries(Object.entries(s.stock).map(([id, qty]) => [id, qty ? [{ quantityRemaining: qty, unitCost: ingredients[id].price, dayAcquired: 1 }] : []]));
      s.newsSeen = Boolean(s.newsTicker);
    }
    s.login ||= { lastClaimDate: null, visitDays: 0, stamps: [] };
    s.upgrades.canopy ||= 0;
    s.staffHiredToday ||= false;
    s.onlineEnabledToday ||= false;
    s.onlineFees ||= 0;
    s.eventDecisionSeen ||= false;
    s.lastDayReport ||= s.dayHistory.at(-1) || null;
    return s;
  } catch {
    return null;
  }
}
