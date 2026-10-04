import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {fresh,encode,decode,calculateLedger} from './day1-core.mjs';
import {ensureEmpire,empireAction,advanceEmpire,operationalAdvice} from './empire-engine.mjs';
import {cookingNeeds,advanceShift,SHIFT_RULES} from './shift-engine.mjs';
import {dayConfig,rosterForDay} from './day-content.mjs';
const run=(s,type,payload)=>{const r=empireAction(s,type,payload);assert.equal(r.error,undefined,`${type}: ${r.error}`);return r.state};
function complete(s){let elapsed=0,reloaded=false;while(s.screen==='SHOP'&&elapsed<600000){
 if(s.activeDecision)s=run(s,'DECIDE',{choice:'yes'});
 if(s.service?.phase==='SELECT'&&s.activeCustomer?.status==='ARRIVED'){
  for(const[id,q]of Object.entries(cookingNeeds(s)))for(let n=s.service.selected[id]||0;n<q;n++)s=run(s,'ADD_INGREDIENT',id);
  s=run(s,'COOK');
  if(!reloaded){const before=structuredClone(s.service);s=decode(encode(s));assert.deepEqual(s.service,before);reloaded=true;}
 }
 if(s.service?.phase==='READY'){s=run(s,'SERVE');const double=empireAction(s,'SERVE');assert.ok(double.error);assert.deepEqual(double.state,s);}
 s=advanceEmpire(s,200);elapsed+=200;
 }assert.equal(s.screen,'DAY_RESULT');assert.ok(s.empire.report.reconciled);
 for(const branch of Object.values(s.empire.shops)){const b=branch.state;const ids=[...b.servedOrders,...b.missedOrders].map(x=>x.customerId);assert.equal(new Set(ids).size,ids.length);assert.equal(ids.length,b.dayCustomers.length);assert.ok(Object.values(b.stock).every(n=>n>=0));}
 return {state:s,simulatedSeconds:elapsed/1000};}
let first=ensureEmpire(fresh(20261004));for(const[t,p]of[['SET_SHOP_NAME','Quán E2E'],['NAVIGATE'],['NAVIGATE'],['BUNDLE_DAY1'],['BUY'],['START_DAY']])first=run(first,t,p);
const day1=complete(first);assert.equal(day1.state.cash,127000);assert.equal(calculateLedger(day1.state).grossOperatingProfit,67000);
let next=run(day1.state,'NEXT_DAY');next=run(next,'NAVIGATE');next=run(next,'REPEAT_BASKET');next=run(next,'BUY');assert.equal(next.currentDay,2);
// Explicit Day 8 boundary fixture; all purchases, staffing, shifts and transfers below use production actions.
let s=fresh(20261004);Object.assign(s,{shopName:'Quán E2E',screen:'XOM_OI',currentDay:8,cash:900000,dayStartingCash:900000,rating:4,dayEvent:dayConfig(8)});s.upgrades.vehicleCapacity=45;s.dayCustomers=rosterForDay(8,4,0,0,s.knownRecipeIds);s=ensureEmpire(s);
s=run(s,'STAFF_HIRE','manager');s=run(s,'OPEN_LOCATION','school');s=run(s,'SWITCH_SHOP','school');s=run(s,'STAFF_HIRE','manager');
for(const id of ['home','school']){s=run(s,'SWITCH_SHOP',id);s=run(s,'NAVIGATE');s=run(s,'SUGGEST_BASKET');s=run(s,'BUY');s=run(s,'START_DAY');}
const salary=s.cash;assert.ok(empireAction(s,'START_DAY').error);assert.equal(s.cash,salary);
for(let i=0;i<1000&&s.service?.phase!=='SELECT';i++)s=advanceEmpire(s,100);assert.equal(s.service.phase,'SELECT');
for(const[id,q]of Object.entries(cookingNeeds(s)))for(let n=0;n<q;n++)s=run(s,'ADD_INGREDIENT',id);s=run(s,'COOK');
const ticket=s.activeCustomer.id;const ownerSpeed=s.employeeSpeed;s=run(s,'SWITCH_SHOP','home');s=decode(encode(s));s=advanceEmpire(s,100);const managerSpeed=s.empire.shops.school.state.employeeSpeed;assert.ok(ownerSpeed>managerSpeed);
const paused=run(s,'OPEN_MAP');assert.deepEqual(advanceEmpire(paused,5000),paused);s=run(paused,'CLOSE_MAP');
const portfolio=complete(s);assert.equal(portfolio.state.empire.shops.school.state.servedOrders.filter(x=>x.customerId===ticket).length,1);
const cash=portfolio.state.cash;let morning=run(portfolio.state,'NEXT_DAY');assert.equal(morning.currentDay,9);assert.equal(morning.cash,cash);assert.ok(Object.values(morning.empire.shops).every(b=>b.state.currentDay===9));
const manager=morning.empire.employees.find(p=>p.shopId===morning.empire.activeShopId);morning=run(morning,'STAFF_BONUS',manager.id);assert.equal(morning.cash,cash-5000);assert.ok(empireAction(morning,'STAFF_BONUS',manager.id).error);morning=run(morning,'STAFF_REST',manager.id);assert.equal(morning.empire.employees.find(p=>p.id===manager.id).restingToday,true);
let quiet=fresh(1);Object.assign(quiet,{screen:'SHOP',clock:0,managedShift:true,cookingTutorialDone:true,dayCustomers:[{...quiet.dayCustomers[0],arrivalMinute:300}],spawnedIndex:0});const after=advanceShift(quiet,1000);assert.equal(after.clock,30);assert.equal(SHIFT_RULES.minutesPerSecond,2);
const advice=operationalAdvice({OUT_OF_STOCK:1,WAIT_TOO_LONG:5,PRICE_TOO_HIGH:2},-1000,[{id:'tired',name:'Dì Hạnh',fatigue:80,mood:80}]);assert.equal(advice[0].reason,'WAIT_TOO_LONG');assert.ok(advice.some(x=>x.area==='stock'));assert.ok(advice.some(x=>x.area==='cost'));assert.ok(advice.some(x=>x.employeeId==='tired'));
const report={status:'PASS',scope:'production-engine end-to-end; NOT browser/UI E2E',seed:20261004,day1:{cash:day1.state.cash,gross:67000,served:day1.state.servedOrders.length,simulatedSeconds:day1.simulatedSeconds},portfolio:{controlledStartingDay:8,shops:portfolio.state.empire.report.shops.map(x=>({id:x.id,served:x.served,missed:x.missed,profit:x.profit,recommendations:x.recommendations})),reconciled:true,simulatedSeconds:portfolio.simulatedSeconds,ownerSpeed,managerSpeed,transferredTicketExactlyOnce:true,nextDay:morning.currentDay},checks:{saveInPrep:true,pauseAllShops:true,doubleServeBlocked:true,wagesNotRepeated:true,bonusOnce:true,restAssigned:true,allCustomersAccounted:true,noNegativeStock:true},pacing:{emptyMinutesPerSecond:30,busyMinutesPerSecond:2,quietGapReductionPercent:40},browser:{status:'BLOCKED',reason:'Cloud browser rejected localhost with ERR_BLOCKED_BY_CLIENT'}};
if(process.argv.includes('--report'))writeFileSync('docs/operational_e2e_report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
