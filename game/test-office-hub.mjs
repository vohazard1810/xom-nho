import assert from 'node:assert/strict';
import {loadFixture,FIXTURE_SEED} from './fixtures.mjs';
import {fresh} from './day1-core.mjs';
import {ensureEmpire,empireAction,advanceEmpire,isQuietInterval,currentMinuteRate,shopOperationalStatus,operationalAdvice,OPERATIONAL_ADVICE_AREAS} from './empire-engine.mjs';
const a=loadFixture('two_shops_mid_prep');assert.deepEqual(a,loadFixture('two_shops_mid_prep'));assert.equal(a.population.seed,FIXTURE_SEED);assert.throws(()=>loadFixture('unknown'));
assert.equal(a.empire.shops.home.state.service.phase,'PREP');assert.equal(shopOperationalStatus(a.empire,'home').status,'managed');assert.equal(shopOperationalStatus(a.empire,'school').status,'owner');
const e=structuredClone(a.empire);e.employees=[];assert.deepEqual(shopOperationalStatus(e,'home'),{status:'waiting',managerId:null});
const bad=structuredClone(a);bad.empire.employees=[];const rejected=empireAction(bad,'SWITCH_SHOP','home');assert.ok(rejected.error);assert.deepEqual(rejected.state,bad);
const morning=loadFixture('two_shops_mid_prep');morning.screen='MENU';morning.empire.shiftRunning=false;morning.empire.employees=[];for(const b of Object.values(morning.empire.shops)){b.ready=true;b.state.screen='MENU';}assert.match(empireAction(morning,'START_DAY').error,/quản lý/);
e.shops.home.closedToday=true;assert.equal(shopOperationalStatus(e,'home').status,'closed');e.shops.home.closedToday=false;e.shops.home.state.screen='DAY_RESULT';assert.equal(shopOperationalStatus(e,'home').status,'done');assert.equal(shopOperationalStatus(e,'missing').status,'unavailable');e.shiftRunning=false;assert.equal(shopOperationalStatus(e,'school').status,'waiting');
let q=structuredClone(a);for(const b of Object.values(q.empire.shops)){b.state.activeCustomer=null;b.state.waitingQueue=[];b.state.clock=q.clock;b.state.dayCustomers=[];b.state.spawnedIndex=0;}
assert.ok(isQuietInterval(q));assert.equal(currentMinuteRate(q),30);const advanced=advanceEmpire(q,100);assert.ok(Math.abs(advanced.clock-q.clock-3)<1e-6);
q.empire.shops.home.state.waitingQueue=[{}];assert.equal(currentMinuteRate(q),2);q.empire.shops.home.closedToday=true;assert.equal(currentMinuteRate(q),30);q.empire.mapOpen=true;assert.equal(currentMinuteRate(q),0);q.empire.mapOpen=false;q.empire.staffOpen=true;assert.equal(currentMinuteRate(q),0);q.empire.staffOpen=false;q.manualPaused=true;assert.equal(currentMinuteRate(q),0);
let one=ensureEmpire(fresh(1));one.screen='SHOP';one.empire.shops.home.state.screen='SHOP';assert.equal(currentMinuteRate(one),30);one.empire.shops.home.state.activeCustomer={status:'ARRIVED'};assert.equal(currentMinuteRate(one),0);
for(const reasons of [{},{OUT_OF_STOCK:4},{WAIT_TOO_LONG:8,OUT_OF_STOCK:7,PRICE_TOO_HIGH:6,MENU_DISABLED:5,MISSED_LATE_OPENING:4,MISSED_EARLY_CLOSING:3}]){
 const advice=operationalAdvice(reasons,-100,[{id:'t',name:'Test',fatigue:90}]);assert.ok(advice.length<=3);assert.ok(advice.every(x=>OPERATIONAL_ADVICE_AREAS.includes(x.area)));const stock=advice.find(x=>x.area==='stock');if(stock)assert.match(stock.text,/không phải lỗi nhân viên/);
}
console.log('Office selectors, manager guards, advice cap and deterministic shared fixture PASS');
