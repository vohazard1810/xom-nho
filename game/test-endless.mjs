import assert from 'node:assert/strict';
import {dayConfig,rosterForDay} from './day-content.mjs';
import {fresh,action,encode,decode,calculateLedger} from './day1-core.mjs';
import {advanceShift,orderBlocker} from './shift-engine.mjs';
import {ensureEmpire,openingEligibility} from './empire-engine.mjs';
for(let day=8;day<=120;day++){
 assert.deepEqual(dayConfig(day),dayConfig(day));
 assert.ok(dayConfig(day).generated);assert.notEqual(dayConfig(day).event,'opening');
 const a=rosterForDay(day,3,0,0,['BANH_MI_CHA','TRA_TAC','SUA_DAU_DA']);
 assert.equal(new Set(a.map(c=>c.id)).size,a.length);assert.ok(a.every(c=>Number.isFinite(c.arrivalMinute)));
 assert.ok(a.length<=20);assert.ok(!a.some(c=>c.recipe==='BANH_MI_TRUNG'));
}
assert.notDeepEqual(dayConfig(22),dayConfig(1));
let rival=fresh();rival.currentDay=8;rival.dayEvent=dayConfig(8);const customer={recipe:'BANH_MI_CHA',priceSensitivity:'HIGH'};
assert.equal(orderBlocker(rival,customer),'PRICE_TOO_HIGH');rival.menu.BANH_MI_CHA.sellPrice=22000;rival.stock={bread:1,cha:1,vegetable:1};assert.equal(orderBlocker(rival,customer),null);
let early=ensureEmpire(fresh());early.currentDay=5;early.cash=500000;early.empire.shops.home.state.rating=4;early.empire.shops.home.state.lifetimeServed=30;early.empire.employees=[{shopId:'home',role:'manager',restingToday:false}];assert.equal(openingEligibility(early,'school'),null);
let s=fresh();s.shopName='Quán kiểm tra';s.screen='DAY_RESULT';s.cash=1000000;s.cookingTutorialDone=true;s.upgrades.vehicleCapacity=75;s.upgrades.bike_basket=2;s.upgrades.cargo=1;
const run=(t,p)=>{const r=action(s,t,p);assert.equal(r.error,undefined,r.error);s=r.state;};
for(let day=2;day<=100;day++){
 run('NEXT_DAY');run('NAVIGATE');run('SUGGEST_BASKET');run('BUY');run('START_DAY');s.staffHiredToday=true;s.assistEnabled=true;
 for(let i=0;i<20&&s.screen==='SHOP';i++){if(s.activeDecision)run('DECIDE',{choice:'no'});s=advanceShift(s,60000);}
 assert.equal(s.screen,'DAY_RESULT');assert.equal(s.currentDay,day);assert.ok(Object.values(s.stock).every(q=>q>=0));assert.equal(s.cash,calculateLedger(s).finalCashInDrawer);
 s=decode(encode(s));
}
assert.ok(s.lifetimeServed>0);console.log('PASS: seeded endless calendar, rival price response, achievement unlock and 100-day saved campaign ledger');
