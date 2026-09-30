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

const visitorNames = ['Cô Bảy', 'Chú Tư', 'Dì Hạnh', 'Anh Bảo', 'Chị Lành', 'Bác Phúc', 'Cô Vân', 'Chú Mười', 'Bạn Thảo', 'Anh Khoa', 'Dì Năm', 'Bác Tám', 'Chị Ngọc', 'Chú Bình'];
const softQuote = ['Cho tôi một phần nhé, quán mình thơm quá!', 'Nay ghé ủng hộ quán một phần nha!'];
const rushQuote = ['Làm nhanh giúp mình nhé, đang vội đi làm!', 'Mình còn cuốc xe nữa, cho mình mua mang đi!'];

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
  const extra = Math.max(0, Math.min(8, day - 1)) + seatingLevel * 2 + (rating >= 4 ? 2 : 0) + config.demandDelta + (config.event === 'rain' ? canopy : 0);
  const count = Math.max(6, Math.min(20, 8 + extra));
  const recipes = ['BANH_MI_CHA', 'TRA_TAC', 'SUA_DAU_DA', 'BANH_MI_CHA', 'TRA_TAC', 'BANH_MI_TRUNG'];
  return Array.from({ length: count }, (_, i) => {
    const index = (day * 7 + i) % visitorNames.length;
    const temperament = (day + i * 3) % 5 === 0 ? 'RUSH' : (day + i) % 4 === 0 ? 'FRIENDLY' : 'NORMAL';
    const recipe = recipes[(day + i) % recipes.length];
    return {
      id: `walkin_d${day}_${i}`,
      personId: `visitor_${index}`,
      visualVariantId: `walkin_variant_${index % 4}`,
      name: visitorNames[index],
      isRegular: false,
      recipe,
      arrivalMinute: 25 + Math.round(i * 290 / Math.max(1, count - 1)),
      priceSensitivity: config.event === 'payday' ? 'LOW' : config.event === 'roadwork' ? (i % 2 ? 'HIGH' : 'MEDIUM') : temperament === 'RUSH' ? 'LOW' : (i % 3 === 0 ? 'HIGH' : 'MEDIUM'),
      temperament,
      dialogue: (temperament === 'RUSH' ? rushQuote : softQuote)[i % 2]
    };
  });
}
