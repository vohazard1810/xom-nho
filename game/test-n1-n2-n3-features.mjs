import assert from 'node:assert/strict';
import { fresh, action, decode, encode, calculateLedger } from './day1-core.mjs';
import { dayConfig, rosterForDay, UPGRADE_CATALOG, WEATHER_TYPES } from './day-content.mjs';
import { ensureEmpire, empireAction, STAFF_SPECIALIZATIONS, employeeEffects } from './empire-engine.mjs';
import { advanceShift } from './shift-engine.mjs';

console.log('Testing N1: Dynamic Weather & Street Events...');
// 1. Weather types
assert.ok(WEATHER_TYPES.sunny && WEATHER_TYPES.hot_weather && WEATHER_TYPES.rain && WEATHER_TYPES.storm && WEATHER_TYPES.cool_breeze && WEATHER_TYPES.morning_drizzle);
assert.equal(WEATHER_TYPES.hot_weather.patienceMultiplier, 0.85);
assert.equal(WEATHER_TYPES.cool_breeze.patienceMultiplier, 1.15);

// 2. Day 1 weather is sunny
const day1Conf = dayConfig(1);
assert.equal(day1Conf.weather.id, 'sunny');
assert.equal(day1Conf.weather.patienceMultiplier, 1.0);

// 3. Weather bindings on days
assert.equal(dayConfig(2).weather.id, 'rain');
assert.equal(dayConfig(2).weather.icon, '🌧️');
assert.equal(dayConfig(4).weather.id, 'cool_breeze');
assert.equal(dayConfig(4).weather.icon, '🍃');
const day17Conf = dayConfig(17);
assert.equal(day17Conf.weather.id, 'hot_weather');
assert.equal(day17Conf.weather.icon, '🔥');

// 4. Hot weather drink preference in roster
const hotRoster = rosterForDay(17, 3, 0, 0, ['BANH_MI_CHA', 'TRA_TAC', 'SUA_DAU_DA']);
assert.ok(hotRoster.filter(c => c.recipe === 'TRA_TAC' || c.recipe === 'SUA_DAU_DA').length >= hotRoster.length * 0.6);

console.log('PASS: N1 weather definitions, dayConfig bindings, and demand biases verified.');

console.log('Testing N2: Shop Progression, Multi-slot Prep & Seating Decor...');
// 1. Upgrade catalog
assert.ok(UPGRADE_CATALOG.dual_pan);
assert.equal(UPGRADE_CATALOG.dual_pan.cost, 40000);
assert.equal(UPGRADE_CATALOG.dual_pan.unlockDay, 4);
assert.ok(UPGRADE_CATALOG.led_sign);
assert.equal(UPGRADE_CATALOG.led_sign.cost, 35000);
assert.equal(UPGRADE_CATALOG.led_sign.unlockDay, 6);

// 2. Dual pan preparation speed bonus
let sPan = fresh(101);
sPan.screen = 'SHOP';
sPan.dayEvent = dayConfig(5);
sPan.upgrades.dual_pan = 1;
sPan.service = { version: 2, customerId: 'c1', recipeId: 'BANH_MI_CHA', phase: 'PREP', elapsedMs: 0, prepMs: 2000, selected: {} };
sPan.activeCustomer = { id: 'c1', status: 'ARRIVED', recipe: 'BANH_MI_CHA' };
const advancedWithPan = advanceShift(sPan, 1000);
// With dual pan (1.33x speed), elapsedMs after 1000ms should be >= 1300ms
assert.ok(advancedWithPan.service.elapsedMs >= 1300, `Expected elapsedMs >= 1300 with dual_pan, got ${advancedWithPan.service.elapsedMs}`);

// 3. LED sign increases customer count
const baseRoster = rosterForDay(6, 3, 0, 0, null, 0);
const ledRoster = rosterForDay(6, 3, 0, 0, null, 1);
assert.equal(ledRoster.length, baseRoster.length + 1);

// 4. Seating tips bonus
let sSeat = fresh(102);
sSeat.currentDay = 3;
sSeat.screen = 'SHOP';
sSeat.upgrades.seating = 1;
sSeat.stock = { bread: 2, cha: 2, vegetable: 2 };
sSeat.stockBatches = {
  bread: [{ quantityRemaining: 2, unitCost: 4000, dayAcquired: 1 }],
  cha: [{ quantityRemaining: 2, unitCost: 5000, dayAcquired: 1 }],
  vegetable: [{ quantityRemaining: 2, unitCost: 2000, dayAcquired: 1 }]
};
sSeat.activeCustomer = { id: 'test_seat', name: 'Khách vui tính', recipe: 'BANH_MI_CHA', temperament: 'FRIENDLY', status: 'ARRIVED' };
sSeat.service = { version: 2, customerId: 'test_seat', recipeId: 'BANH_MI_CHA', phase: 'HANDOFF', elapsedMs: 0, prepMs: 1000, selected: {} };
const startCash = sSeat.cash;
const servedSeat = action(sSeat, 'SERVE_AUTO').state;
// Friendly base tip 1000 + seating tip (1 * 500) = 1500 tip
assert.equal(servedSeat.tips, 1500);
assert.equal(servedSeat.cash, startCash + 25000 + 1500);
const lSeat = calculateLedger(servedSeat);
assert.equal(lSeat.finalCashInDrawer, servedSeat.cash);

console.log('PASS: N2 upgrades catalog, dual pan cooking speed, led sign roster and seating tips verified.');

console.log('Testing N3: Advanced Multi-Shop Operations & Staff Skills...');
// 1. Staff specializations catalog
assert.ok(STAFF_SPECIALIZATIONS.speed && STAFF_SPECIALIZATIONS.craft && STAFF_SPECIALIZATIONS.charm);

// 2. Staff specialization action
let empState = fresh(200);
empState.screen = 'XOM_OI';
empState.currentDay = 8;
empState.cash = 500000;
empState.dayStartingCash = 500000;
empState.rating = 4;
empState = ensureEmpire(empState);
empState.empire.shops.home.state.screen = 'XOM_OI';
empState.dayCustomers = rosterForDay(8, 4, 0, 0, empState.knownRecipeIds);
empState = empireAction(empState, 'STAFF_HIRE', 'helper').state;
assert.equal(empState.empire.employees.length, 1);
const helper = empState.empire.employees[0];
assert.equal(helper.skill, 1);

// Cannot specialize at skill 1
const failSpec = empireAction(empState, 'STAFF_SPECIALIZE', `${helper.id}:speed`);
assert.ok(failSpec.error, 'Must require skill >= 2 to specialize');

// Train to level 2
helper.skill = 2;
empState.empire.shops.home.state.empire = empState.empire;
const okSpec = empireAction(empState, 'STAFF_SPECIALIZE', `${helper.id}:speed`);
assert.equal(okSpec.error, undefined);
assert.equal(okSpec.state.empire.employees[0].specialization, 'speed');

// Verify speed perk increases employeeSpeed
const speedShop = okSpec.state;
employeeEffects(speedShop.empire, 'home', speedShop);
assert.ok(speedShop.employeeSpeed > 1.35 * 1.2, `Expected speed > 1.62, got ${speedShop.employeeSpeed}`);

console.log('PASS: N3 staff specializations, requirement gates and employee speed perk verified.');
console.log('ALL N1, N2, N3 TESTS PASSED 100%!');
