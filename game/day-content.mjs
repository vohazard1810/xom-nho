// Tunable prototype fixtures for Days 2–7. All variation is deterministic by day
// and save state so the same day remains reproducible after reload.
export const extraIngredient = { egg: { name: 'Trứng gà', price: 3000, unit: 'quả', shelfLife: 'fresh' } };
export const extraRecipe = {
  BANH_MI_TRUNG: { name: 'Bánh mì ốp la', basePrice: 27000, priceTiers: [24000, 27000, 30000], needs: { bread: 1, egg: 1, vegetable: 1 } }
};
export const UPGRADE_CATALOG = Object.freeze({
  bike_basket: { name: 'Rổ đèo hàng', cost: 30000, nextCost: 45000, description: 'Sức chở 20 → 30 → 45 đơn vị', maxLevel: 2 },
  counter: { name: 'Nới quầy', cost: 25000, description: 'Mở slot thứ 4 và món bánh mì ốp la', maxLevel: 1 },
  seating: { name: 'Ghế nhựa thêm', cost: 20000, description: 'Thêm 2 chỗ ngồi, thu hút thêm khách', maxLevel: 2 },
  canopy: { name: 'Mái che quán', cost: 35000, description: 'Từ ngày 5: giữ thêm 1 khách vào ngày mưa', maxLevel: 1, unlockDay: 5 }
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

export function dayConfig(day) {
  if (day === 1) return { marketPrices: null, event: 'opening', forecast: 'Ngày đầu mở quán, khách trong xóm ghé thử.', demandDelta: 0, costDelta: 0, tipBonus: 0 };
  const events = [
    { event: 'rain', forecast: 'Mưa trưa, khách vãng lai có thể ít hơn 2 người.', demandDelta: -2, costDelta: 0, tipBonus: 0 },
    { event: 'school', forecast: 'Tan học đông, dự kiến thêm 2 lượt khách.', demandDelta: 2, costDelta: 0, tipBonus: 0 },
    { event: 'sleepy', forecast: 'Mở từ 6h hôm nay tốn 3.000đ nước và điện chuẩn bị.', demandDelta: 0, costDelta: 3000, tipBonus: 0 },
    { event: 'friendly', forecast: 'Xóm có hội nhỏ, khách vui vẻ dễ để lại tiền tip.', demandDelta: 1, costDelta: 0, tipBonus: 1000 },
    { event: 'roadwork', forecast: 'Đầu hẻm sửa đường: bớt 1 lượt khách, người ghé có thể dè dặt giá.', demandDelta: -1, costDelta: 0, tipBonus: 0 },
    { event: 'payday', forecast: 'Ngày lãnh lương: thêm 2 lượt khách, khách dễ chi tiêu hơn.', demandDelta: 2, costDelta: 0, tipBonus: 500 }
  ];
  const choice = events[day <= 7 ? day - 2 : (day * 7 + 3) % events.length];
  return {
    ...choice,
    marketPrices: { kumquat: 3000, sugar_syrup: day >= 5 ? 3000 : 2000, ...(day >= 4 && day % 3 === 1 ? { egg: 4000 } : {}) },
    forecast: `Tin chợ: tắc 3.000đ/trái${day >= 5 ? ', nước đường 3.000đ/muỗng' : ''}. ${choice.forecast}`
  };
}

export function rosterForDay(day, rating = 3, seatingLevel = 0, canopy = 0) {
  if (day === 1) return null; // Day 1 retains its approved eight-customer fixture.
  const config = dayConfig(day);
  const reputationDemand = rating >= 4 ? 2 : rating < 2 ? -3 : rating < 3 ? -1 : 0;
  const extra = Math.max(0, Math.min(8, day - 1)) + seatingLevel * 2 + reputationDemand + config.demandDelta + (config.event === 'rain' ? canopy : 0);
  const count = Math.max(6, Math.min(20, 8 + extra));
  const recipes = ['BANH_MI_CHA', 'TRA_TAC', 'SUA_DAU_DA', 'BANH_MI_CHA', 'TRA_TAC', 'BANH_MI_TRUNG'];
  return Array.from({ length: count }, (_, i) => {
    // Select archetype deterministically first
    const archKey = archetypeKeys[(day * 3 + i) % archetypeKeys.length];
    const arch = WALK_IN_ARCHETYPES[archKey];
    const nameIndex = (day * 7 + i) % arch.names.length;
    const name = arch.names[nameIndex];
    const temperament = (day + i * 3) % 5 === 0 ? 'RUSH' : (day + i) % 4 === 0 ? 'FRIENDLY' : 'NORMAL';
    const recipe = recipes[(day + i) % recipes.length];
    const dialogue = arch.quotes[temperament] || arch.quotes.NORMAL;

    return {
      id: `walkin_d${day}_${i}`,
      personId: `${archKey}_${nameIndex}`,
      visualVariantId: arch.visualVariantId,
      name,
      isRegular: false,
      recipe,
      arrivalMinute: 25 + Math.round(i * 290 / Math.max(1, count - 1)),
      priceSensitivity: config.event === 'payday' ? 'LOW' : config.event === 'roadwork' ? (i % 2 ? 'HIGH' : 'MEDIUM') : temperament === 'RUSH' ? 'LOW' : (i % 3 === 0 ? 'HIGH' : 'MEDIUM'),
      temperament,
      dialogue
    };
  });
}
