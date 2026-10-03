// Tunable prototype fixtures for Days 1–21. All variation is deterministic by day
// and save state so the same day remains reproducible after reload.
export const extraIngredient = { egg: { name: 'Trứng gà', price: 3000, unit: 'quả', shelfLife: 'fresh' } };
export const extraRecipe = {
  BANH_MI_TRUNG: { name: 'Bánh mì ốp la', basePrice: 27000, priceTiers: [24000, 27000, 30000], needs: { bread: 1, egg: 1, vegetable: 1 } }
};
export const UPGRADE_CATALOG = Object.freeze({
  bike_basket: { name: 'Rổ đèo hàng', cost: 30000, nextCost: 45000, description: 'Sức chở 20 → 30 → 45 đơn vị', maxLevel: 2 },
  counter: { name: 'Nới quầy', cost: 25000, description: 'Mở slot thứ 4 và món bánh mì ốp la', maxLevel: 1 },
  seating: { name: 'Ghế nhựa thêm', cost: 20000, description: 'Thêm 2 chỗ ngồi, thu hút thêm khách', maxLevel: 2 },
  canopy: { name: 'Mái che quán', cost: 35000, description: 'Giữ khách trú mưa và tránh chậm chế biến vì mưa', maxLevel: 1, unlockDay: 5 },
  cargo: { name: 'Thùng hàng xe máy', cost: 95000, description: 'Thêm 30 đơn vị sức chở, cần rổ hàng cấp 2', maxLevel: 1, unlockDay: 10 }
});
export const FRESH_INGREDIENTS = new Set(['bread', 'cha', 'vegetable', 'ice', 'kumquat', 'soy_milk', 'egg']);

export const WALK_IN_ARCHETYPES = {
  teen: {
    archetype: 'teen',
    visualVariantId: 'walkin_variant_0',
    names: ['Em Nam', 'Em Bình', 'Bạn Thảo', 'Em Tuấn', 'Bé Vy'],
    quotes: {
      NORMAL: 'Cho em một phần mang đi nhanh để kịp giờ vào lớp nha!',
      RUSH: 'Em sắp trễ giờ học rồi, làm nhanh giùm em nha anh!',
      FRIENDLY: 'Quán hôm nay đông vui quá, cho em phần quen thuộc nha!'
    }
  },
  office: {
    archetype: 'office',
    visualVariantId: 'walkin_variant_1',
    names: ['Chị Mai', 'Anh Khoa', 'Chị Ngọc', 'Anh Bảo', 'Chị Lành'],
    quotes: {
      NORMAL: 'Cho mình một phần ăn sáng mang đến văn phòng nhé.',
      RUSH: 'Mình sắp vào giờ họp đầu tuần rồi, lấy nhanh giùm mình nghen!',
      FRIENDLY: 'Món của quán làm sạch sẽ tươm tất lắm, mình ghé ủng hộ tiếp nè.'
    }
  },
  driver: {
    archetype: 'driver',
    visualVariantId: 'walkin_variant_2',
    names: ['Chú Bảy', 'Chú Mười', 'Chú Bình', 'Anh Lâm xe ôm', 'Bác Tư grab'],
    quotes: {
      NORMAL: 'Lấy cho chú phần ăn sáng lót dạ trước cuốc xe nhé.',
      RUSH: 'Khách nổ cuốc gấp rồi, cho chú xin mang đi liền nha con!',
      FRIENDLY: 'Sáng ra ghé quán làm miếng bánh mì/ly nước cho tỉnh táo chạy xe.'
    }
  },
  elder: {
    archetype: 'elder',
    visualVariantId: 'walkin_variant_3',
    names: ['Bác Năm', 'Cô Vân', 'Dì Hạnh', 'Bác Phúc', 'Bác Tám'],
    quotes: {
      NORMAL: 'Sáng nay tập thể dục về thấy quán thơm quá, lấy bác một phần nha.',
      RUSH: 'Lấy bác phần sớm để bác còn về kịp mở cửa nhà nhé.',
      FRIENDLY: 'Quán dạo này khang trang sạch sẽ ghê, xóm mình ai cũng khen!'
    }
  }
};

const archetypeKeys = ['teen', 'office', 'driver', 'elder'];

// 21-Day Complete Event Schedule (Tuần 1: Khởi Nghiệp, Tuần 2: Nâng Cấp & Hội Nhập, Tuần 3: Vững Vàng)
export const TWENTY_ONE_DAY_EVENTS = [
  // Day 1
  { event: 'opening', forecast: 'Ngày đầu mở quán, khách trong xóm ghé thử.', demandDelta: 0, costDelta: 0, tipBonus: 0 },
  // Day 2–7 (Tuần 1)
  { event: 'rain', forecast: 'Mưa trưa, khách vãng lai có thể ít hơn 2 người.', demandDelta: -2, costDelta: 0, tipBonus: 0 },
  { event: 'school', forecast: 'Tan học đông, dự kiến thêm 2 lượt khách.', demandDelta: 2, costDelta: 0, tipBonus: 0 },
  { event: 'sleepy', forecast: 'Mở từ 6h hôm nay tốn 3.000đ nước và điện chuẩn bị.', demandDelta: 0, costDelta: 3000, tipBonus: 0 },
  { event: 'friendly', forecast: 'Xóm có hội nhỏ, khách vui vẻ dễ để lại tiền tip.', demandDelta: 1, costDelta: 0, tipBonus: 1000 },
  { event: 'roadwork', forecast: 'Đầu hẻm sửa đường: bớt 1 lượt khách, người ghé có thể dè dặt giá.', demandDelta: -1, costDelta: 0, tipBonus: 0 },
  { event: 'payday', forecast: 'Ngày lãnh lương: thêm 2 lượt khách, khách dễ chi tiêu hơn.', demandDelta: 2, costDelta: 0, tipBonus: 500 },
  // Day 8–14 (Tuần 2)
  { event: 'hot_weather', forecast: 'Nắng nóng gay gắt: bà con khát nước, nhu cầu trà tắc & sữa đậu tăng cao.', demandDelta: 3, costDelta: 0, tipBonus: 500 },
  { event: 'market_deal', forecast: 'Chợ đầu mối ưu đãi: tắc và đường hạ nhiệt, nhập hàng thuận lợi.', demandDelta: 1, costDelta: 0, tipBonus: 0 },
  { event: 'office_order', forecast: 'Công ty đầu hẻm đặt đồ ăn sáng mang đi, thêm 3 lượt khách văn phòng.', demandDelta: 3, costDelta: 0, tipBonus: 1000 },
  { event: 'cleanup_day', forecast: 'Ngày hội dọn vệ sinh xóm: xóm làng gắn kết, khách ghé trò chuyện xôm tụ.', demandDelta: 1, costDelta: 0, tipBonus: 1000 },
  { event: 'power_maintenance', forecast: 'Bảo trì trạm điện ngõ trưa: khách ra quán ngồi hóng gió mát đông hơn.', demandDelta: 2, costDelta: 0, tipBonus: 0 },
  { event: 'weekend_rush', forecast: 'Thứ Bảy xóm nhỏ nhộn nhịp: gia đình đưa con nhỏ đi ăn sáng đông vui.', demandDelta: 4, costDelta: 0, tipBonus: 500 },
  { event: 'elder_gathering', forecast: 'Hội người cao tuổi xóm tập dưỡng sinh về ngang ủng hộ quán.', demandDelta: 2, costDelta: 0, tipBonus: 1000 },
  // Day 15–21 (Tuần 3)
  { event: 'mid_month_fair', forecast: 'Rằm xóm phố: chợ đông đúc từ sáng sớm, khách ghé ăn sáng nhộn nhịp.', demandDelta: 3, costDelta: 0, tipBonus: 500 },
  { event: 'delivery_app', forecast: 'Shipper công nghệ ghé lấy đơn dồn dập, thêm 3 lượt khách vội.', demandDelta: 3, costDelta: 0, tipBonus: 0 },
  { event: 'morning_drizzle', forecast: 'Mưa phùn rả rích đầu ngày: khách trú mưa trước hiên quán, chuộng trà ấm.', demandDelta: -1, costDelta: 0, tipBonus: 1000 },
  { event: 'food_review', forecast: 'Trang tin đời sống giới thiệu quán bánh mì góc phố: khách tò mò ghé trải nghiệm.', demandDelta: 4, costDelta: 0, tipBonus: 1000 },
  { event: 'cool_breeze', forecast: 'Gió mùa trong lành: cả con hẻm rộn rã tiếng cười nói, buôn bán đắt khách.', demandDelta: 2, costDelta: 0, tipBonus: 500 },
  { event: 'month_end_bonus', forecast: 'Kỳ phát thưởng cuối tháng: khách hào phóng để lại tiền tip cảm ơn.', demandDelta: 3, costDelta: 0, tipBonus: 1500 },
  { event: 'anniversary_day', forecast: 'Tròn 3 tuần quán mở: bà con chòm xóm ghé chúc mừng tấp nập!', demandDelta: 5, costDelta: 0, tipBonus: 2000 }
];

export function dayConfig(day, progress = {}) {
  if (day === 1) return { marketPrices: null, ...TWENTY_ONE_DAY_EVENTS[0] };
  // Seven introductory days, then a seeded calendar independent of a 21-day loop.
  const seed = Math.imul(day, 2654435761) >>> 0;
  const pool = TWENTY_ONE_DAY_EVENTS.slice(7,20);
  const rivalDay = day > 7 && day % 6 === 2;
  const choice = day <= 7 ? TWENTY_ONE_DAY_EVENTS[day-1] : rivalDay ? {
    event:'rival_offer',forecast:'Xe bánh mì cô Tư có giá ưu đãi hôm nay. Khách cân nhắc giá; bạn có thể giữ giá, chọn giá mềm hoặc tập trung thức uống.',
    demandDelta:0,costDelta:0,tipBonus:0
  } : pool[seed % pool.length];
  
  // Market price dynamics
  const prices = {
    kumquat: choice.event === 'market_deal' ? 2000 : choice.event === 'hot_weather' ? 4000 : 3000,
    sugar_syrup: choice.event === 'market_deal' ? 2000 : day >= 5 ? 3000 : 2000,
    egg: day >= 4 && day % 3 === 1 ? 4000 : 3000,
    ...(day > 7 ? {cha:5000+(seed%3)*500,soy_milk:4000+((seed>>>4)%3)*500}: {})
  };

  return {
    ...choice,
    generated:day>7,
    seed,
    rival:rivalDay?{id:'co_tu',name:'Xe bánh mì cô Tư',offer:'BANH_MI_CHA',suggestedPrice:22000}:null,
    marketPrices: prices,
    forecast: `Tin chợ: tắc ${prices.kumquat.toLocaleString('vi-VN')}đ/trái, nước đường ${prices.sugar_syrup.toLocaleString('vi-VN')}đ/muỗng. ${choice.forecast}`
  };
}

export function rosterForDay(day, rating = 3, seatingLevel = 0, canopy = 0, knownRecipes = null) {
  if (day === 1) return null; // Day 1 retains its approved eight-customer fixture.
  const config = dayConfig(day);
  const reputationDemand = rating >= 4 ? 2 : rating < 2 ? -3 : rating < 3 ? -1 : 0;
  const growth = day <= 7 ? day-1 : 3 + Math.max(0,Math.floor((rating-3)*3)) + Math.min(4,(knownRecipes?.length||3)-3);
  const extra = growth + seatingLevel * 2 + reputationDemand + config.demandDelta + (config.event === 'rain' ? canopy : 0);
  const count = Math.max(6, Math.min(20, 8 + extra));
  const recipes = ['BANH_MI_CHA', 'TRA_TAC', 'SUA_DAU_DA', 'BANH_MI_CHA', 'TRA_TAC', 'BANH_MI_TRUNG'];
  return Array.from({ length: count }, (_, i) => {
    // Select archetype deterministically first
    const archKey = archetypeKeys[((config.seed>>>8) + i + Math.floor(rating*2)) % archetypeKeys.length];
    const arch = WALK_IN_ARCHETYPES[archKey];
    const nameIndex = (day * 7 + i) % arch.names.length;
    const name = arch.names[nameIndex];
    const temperament = day >= 3 && i === 2 ? 'RUSH' : (day + i * 3) % 5 === 0 ? 'RUSH' : (day + i) % 4 === 0 ? 'FRIENDLY' : 'NORMAL';
    let recipe = config.event === 'hot_weather' ? (i % 3 ? 'TRA_TAC' : 'SUA_DAU_DA') : recipes[(day + i) % recipes.length];
    if (knownRecipes && !knownRecipes.includes(recipe)) recipe = 'BANH_MI_CHA';
    const dialogue = arch.quotes[temperament] || arch.quotes.NORMAL;

    return {
      id: `walkin_d${day}_${i}`,
      personId: `${archKey}_${nameIndex}`,
      visualVariantId: arch.visualVariantId,
      archetype: arch.archetype,
      name,
      isRegular: false,
      recipe,
      arrivalMinute: day >= 3 ? (i < 3 ? 25 + [0, 5, 8][i] : 100 + Math.round((i - 3) * 215 / Math.max(1, count - 4))) : 25 + Math.round(i * 290 / Math.max(1, count - 1)),
      priceSensitivity: config.event === 'rival_offer' && recipe==='BANH_MI_CHA' ? (i%2?'HIGH':'MEDIUM') : config.event === 'payday' || config.event === 'month_end_bonus' ? 'LOW' : config.event === 'roadwork' ? (i % 2 ? 'HIGH' : 'MEDIUM') : temperament === 'RUSH' ? 'LOW' : (i % 3 === 0 ? 'HIGH' : 'MEDIUM'),
      temperament,
      dialogue
    };
  });
}
