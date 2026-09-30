// Day 1 Vertical Slice v0.7 — Idle Management State Machine
// Pure functional state machine. Every action returns a new cloned state or {state, error}.

export const ingredients = Object.freeze({
  bread: { name: 'Bánh mì', price: 4000, unit: 'ổ' },
  cha: { name: 'Chả lụa', price: 5000, unit: 'khoanh' },
  vegetable: { name: 'Dưa ngò', price: 2000, unit: 'phần' },
  ice: { name: 'Đá bi', price: 1000, unit: 'ca' },
  sugar_syrup: { name: 'Nước đường', price: 2000, unit: 'muỗng' },
  kumquat: { name: 'Tắc tươi', price: 2000, unit: 'trái' },
  soy_milk: { name: 'Sữa đậu', price: 4000, unit: 'bịch' }
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
  }
});

// 8 Fixture Customers for the Day 1 rhythm test
export const fixtureCustomers = Object.freeze([
  {
    id: 'bac_ba',
    name: 'Bác Ba',
    isRegular: false,
    recipe: 'BANH_MI_CHA',
    arrivalMinute: 30, // 08:30
    dialogue: 'Bán cho tui ổ bánh mì chả ăn sáng nha chú!'
  },
  {
    id: 'chi_hai',
    name: 'Chị Hai',
    isRegular: false,
    recipe: 'TRA_TAC',
    arrivalMinute: 75, // 09:15
    dialogue: 'Cho chị một ly trà tắc nhiều đá mát lạnh nghen!'
  },
  {
    id: 'be_ti',
    name: 'Bé Tí',
    isRegular: true,
    recipe: 'BANH_MI_CHA',
    arrivalMinute: 120, // 10:00
    specialRequest: 'EXTRA_CHA',
    dialogue: 'Chú ơi cho con ổ Bánh mì chả, chú cho con xin thêm chả nghen!'
  },
  {
    id: 'co_chin',
    name: 'Cô Chín',
    isRegular: true,
    recipe: 'TRA_TAC',
    arrivalMinute: 180, // 11:00
    dialogue: 'Cô đi chợ về ngang, làm cô ly trà tắc chua ngọt thanh mát nghe con!'
  },
  {
    id: 'anh_tung',
    name: 'Anh Tùng',
    isRegular: true,
    recipe: 'SUA_DAU_DA',
    arrivalMinute: 225, // 11:45
    dialogue: 'Cho anh ly Sữa đậu đá mát rượi em ơi! Đang vội chạy cuốc khách trưa!'
  },
  {
    id: 'bac_nam',
    name: 'Bác Năm',
    isRegular: false,
    recipe: 'BANH_MI_CHA',
    arrivalMinute: 255, // 12:15
    dialogue: 'Làm bác ổ bánh mì dằn bụng buổi trưa chú em ơi.'
  },
  {
    id: 'co_bay',
    name: 'Cô Bảy',
    isRegular: false,
    recipe: 'TRA_TAC',
    arrivalMinute: 285, // 12:45
    dialogue: 'Nắng nôi quá, cho ly trà tắc giải khát đi con!'
  },
  {
    id: 'chu_tu',
    name: 'Chú Tư',
    isRegular: false,
    recipe: 'BANH_MI_CHA',
    arrivalMinute: 315, // 13:15
    dialogue: 'Còn bánh mì không chú? Làm tui một ổ mang đi.'
  }
]);

export const SAVE_KEY = 'xom_nho_v07_idle_save_v1';
export const BIKE_CAPACITY = 20;

export function fresh() {
  return {
    revision: 0,
    screen: 'HOME', // 'HOME' | 'XOM_OI' | 'MARKET' | 'MENU' | 'SHOP' | 'DAY_RESULT'
    cash: 60000,
    spent: 0,
    revenue: 0,
    debt: 0,
    
    // Inventory
    basket: Object.fromEntries(Object.keys(ingredients).map(k => [k, 0])),
    stock: Object.fromEntries(Object.keys(ingredients).map(k => [k, 0])),
    
    // Menu setup (3 starter slots)
    menu: {
      BANH_MI_CHA: { enabled: true, sellPrice: 25000 },
      TRA_TAC: { enabled: true, sellPrice: 15000 },
      SUA_DAU_DA: { enabled: true, sellPrice: 17000 }
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
    
    // Transaction history
    servedOrders: [], // Array of { ticketId, personId, name, recipe, sellPrice, cogs, ingredientsUsed }
    missedOrders: [], // Array of { ticketId, personId, name, recipe, reason }
    
    knownRecipeIds: ['BANH_MI_CHA', 'TRA_TAC', 'SUA_DAU_DA'],
    teasedRecipeIds: ['BANH_MI_TRUNG'],
    facts: {}
  };
}

export const totalBasketUnits = basket => Object.values(basket).reduce((sum, q) => sum + q, 0);
export const totalBasketCost = basket => Object.entries(basket).reduce((sum, [id, qty]) => sum + (ingredients[id]?.price || 0) * qty, 0);

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

  if (type === 'NAVIGATE') {
    const nextMap = {
      HOME: 'XOM_OI',
      XOM_OI: 'MARKET',
      MARKET: 'MENU',
      MENU: 'SHOP',
      SHOP: 'DAY_RESULT'
    };
    const next = nextMap[s.screen];
    if (!next) return fail('Không có bước tiếp theo ở màn này.');
    s.screen = next;
  } else if (type === 'REPLAY') {
    return { state: fresh() };
  } else if (type === 'BASKET') {
    if (s.screen !== 'MARKET' || !ingredients[payload.id] || !Number.isInteger(payload.qty) || payload.qty < 0) {
      return fail('Số lượng nguyên liệu không hợp lệ.');
    }
    const tentative = { ...s.basket, [payload.id]: payload.qty };
    if (totalBasketUnits(tentative) > BIKE_CAPACITY) {
      return fail(`Sức chở xe đạp tối đa ${BIKE_CAPACITY} đơn vị.`);
    }
    s.basket[payload.id] = payload.qty;
  } else if (type === 'BUNDLE_DAY1') {
    // 55k bundle for 6 customers: 19 units total
    if (s.screen !== 'MARKET') return fail('Chỉ chọn gói ở chợ.');
    const bundle = {
      bread: 3,
      cha: 4,
      vegetable: 3,
      ice: 3,
      sugar_syrup: 3,
      kumquat: 2,
      soy_milk: 1
    };
    if (totalBasketUnits(bundle) > BIKE_CAPACITY) return fail('Vượt sức chở.');
    s.basket = bundle;
  } else if (type === 'BUY') {
    if (s.screen !== 'MARKET') return fail('Chỉ mua hàng ở chợ.');
    const cost = totalBasketCost(s.basket);
    if (cost > s.cash) return fail('Không đủ tiền mặt để mua số hàng này.');
    if (totalBasketUnits(s.basket) === 0) return fail('Giỏ hàng đang trống.');
    
    // Add to stock
    for (const [k, qty] of Object.entries(s.basket)) {
      s.stock[k] = (s.stock[k] || 0) + qty;
    }
    s.cash -= cost;
    s.spent += cost;
    s.basket = Object.fromEntries(Object.keys(ingredients).map(k => [k, 0]));
    s.screen = 'MENU';
  } else if (type === 'CONFIG_MENU') {
    // payload: { recipeId, enabled?: boolean, sellPrice?: number }
    if (s.screen !== 'MENU' || !recipes[payload.recipeId]) return fail('Món không hợp lệ.');
    if (payload.enabled !== undefined) s.menu[payload.recipeId].enabled = Boolean(payload.enabled);
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
    const enabledDishes = Object.values(s.menu).filter(m => m.enabled);
    if (enabledDishes.length === 0) return fail('Cần bật ít nhất 1 món trong thực đơn.');
    s.screen = 'SHOP';
    s.clock = 0; // Starts at 08:00
    s.customerIndex = 0;
    s.activeCustomer = null;
    s.isPaused = false;
    s.activeDecision = null;
  } else if (type === 'SET_SPEED') {
    if (s.screen !== 'SHOP') return fail('Chỉ đổi tốc độ trong giờ bán.');
    s.speed = payload === 2 ? 2 : 1;
  } else if (type === 'TICK') {
    // Simulation step: deltaMinutes (typically 1 to 5 in-game minutes)
    if (s.screen !== 'SHOP') return fail('Quán chưa mở.');
    if (s.isPaused) return { state: s }; // Paused when decision is active
    
    const delta = Number(payload) || 2;
    s.clock = Math.min(360, s.clock + delta * s.speed);
    
    // Check Market News Ticker at minute 195 (11:15 AM)
    if (s.clock >= 195 && !s.newsTicker && s.clock < 240) {
      s.newsTicker = {
        id: 'KUMQUAT_PRICE_RUMOR',
        text: 'Bà Sáu chợ đầu ngõ: "Tắc chiều gom ép nước giá lên 3.000đ rồi đó nghen!"',
        endMinute: 235
      };
    } else if (s.newsTicker && s.clock >= s.newsTicker.endMinute) {
      s.newsTicker = null;
    }
    
    // Spawn next customer if no active customer and clock matches
    if (!s.activeCustomer && s.customerIndex < fixtureCustomers.length) {
      const nextCust = fixtureCustomers[s.customerIndex];
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
  } else if (type === 'DECIDE') {
    // Resolves a pending decision, e.g. payload: { choice: 'yes' | 'no' }
    if (s.screen !== 'SHOP' || !s.activeDecision) return fail('Không có quyết định đang chờ.');
    if (s.activeDecision.id === 'EXTRA_CHA') {
      s.extraCha = payload.choice === 'yes';
      s.activeDecision = null;
      s.isPaused = false;
    }
  } else if (type === 'SERVE_AUTO') {
    // Automatically prepare and serve the active customer
    if (s.screen !== 'SHOP' || !s.activeCustomer) return fail('Không có khách tại quầy.');
    const cust = s.activeCustomer;
    const recipeId = cust.recipe;
    const isExtra = cust.id === 'be_ti' && s.extraCha === true;
    const needs = recipeNeeds(recipeId, isExtra);
    const menuItem = s.menu[recipeId];
    
    // Check if recipe is enabled and has stock
    if (!menuItem || !menuItem.enabled || !hasEnoughStock(s.stock, needs)) {
      // Out of stock
      s.missedOrders.push({
        ticketId: cust.id + '_' + s.clock,
        personId: cust.id,
        name: cust.name,
        recipe: recipeId,
        reason: 'OUT_OF_STOCK',
        timestampMinute: s.clock
      });
      s.facts[cust.id] = {
        ...(s.facts[cust.id] || {}),
        missed_orders: ((s.facts[cust.id]?.missed_orders) || 0) + 1
      };
      s.activeCustomer.status = 'OUT_OF_STOCK';
    } else {
      // Fulfill order
      for (const [ing, qty] of Object.entries(needs)) {
        s.stock[ing] -= qty;
      }
      const cogs = calculateRecipeCost(needs);
      const sellPrice = menuItem.sellPrice;
      s.cash += sellPrice;
      s.revenue += sellPrice;
      
      s.servedOrders.push({
        ticketId: cust.id + '_' + s.clock,
        personId: cust.id,
        name: cust.name,
        recipe: recipeId,
        sellPrice,
        cogs,
        ingredientsUsed: needs,
        timestampMinute: s.clock
      });
      
      s.facts[cust.id] = {
        ...(s.facts[cust.id] || {}),
        successful_orders: ((s.facts[cust.id]?.successful_orders) || 0) + 1,
        times_given_extra: ((s.facts[cust.id]?.times_given_extra) || 0) + (isExtra ? 1 : 0)
      };
      s.activeCustomer.status = 'SERVED';
    }
  } else if (type === 'CUSTOMER_LEAVE') {
    if (s.screen !== 'SHOP' || !s.activeCustomer) return fail('Không có khách đang rời.');
    s.activeCustomer = null;
    s.customerIndex += 1;
    // If all customers processed, auto end or wait for close
    if (s.customerIndex >= fixtureCustomers.length) {
      // Ca bán hoàn tất
    }
  } else if (type === 'CLOSE') {
    if (s.screen !== 'SHOP') return fail('Quán chưa mở.');
    s.screen = 'DAY_RESULT';
  } else {
    return fail('Lệnh không hợp lệ.');
  }

  s.revision = state.revision + 1;
  return { state: s };
}

// Transparent Ledger Calculation strictly from actual transactions
export function calculateLedger(state) {
  const startingCash = 60000;
  const spentOnMorningStock = state.spent || 0;
  
  // Actual cash collected from sales
  const cashSalesCollected = (state.servedOrders || []).reduce((sum, o) => sum + o.sellPrice, 0);
  const uncollectedCreditSales = 0; // Day 1 fixture: zero debt
  const tipsCollected = 0; // Day 1 fixture: zero tips
  
  // Reconciled physical cash in drawer
  // finalCashInDrawer = startingCash - spentOnMorningStock + cashSalesCollected + tipsCollected
  const finalCashInDrawer = startingCash - spentOnMorningStock + cashSalesCollected + tipsCollected;
  const netCashDifferenceToday = finalCashInDrawer - startingCash;
  
  // Accrual P&L: COGS of sold items only
  const cogsSoldItemsOnly = (state.servedOrders || []).reduce((sum, o) => sum + o.cogs, 0);
  const totalSalesRevenue = cashSalesCollected;
  const grossOperatingProfit = totalSalesRevenue - cogsSoldItemsOnly;
  
  // Leftover stock value in pantry
  const retainedStockValueAtCost = Object.entries(state.stock || {}).reduce((sum, [id, qty]) => {
    return sum + (ingredients[id]?.price || 0) * Math.max(0, qty);
  }, 0);
  
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
  
  return {
    startingCash,
    spentOnMorningStock,
    cashSalesCollected,
    uncollectedCreditSales,
    tipsCollected,
    finalCashInDrawer,
    netCashDifferenceToday,
    totalSalesRevenue,
    cogsSoldItemsOnly,
    grossOperatingProfit,
    retainedStockValueAtCost,
    dishBreakdown,
    servedCount: (state.servedOrders || []).length,
    missedCount: (state.missedOrders || []).length,
    missedOrders: state.missedOrders || []
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
    return data.state;
  } catch {
    return null;
  }
}
