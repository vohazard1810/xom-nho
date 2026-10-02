import assert from 'node:assert/strict';
import { action, fresh, decode, encode, calculateLedger, suggestBasket } from './day1-core.mjs';
import { advanceShift, cookingAction, cookingNeeds } from './shift-engine.mjs';
const run=(s,t,p)=>{const r=cookingAction(s,t,p);assert.equal(r.error,undefined,`${t}: ${r.error}`);return r.state};
function prepared(){let s=fresh();for(const [t,p]of[['SET_SHOP_NAME','Quán Hẻm Nhỏ'],['NAVIGATE'],['NAVIGATE'],['BUNDLE_DAY1'],['BUY'],['START_DAY']])s=run(s,t,p);return s}
function toOrder(s){for(let i=0;i<1000&&!s.service;i++)s=advanceShift(s,100);return s}
let s=toOrder(prepared());assert.equal(s.service.phase,'SELECT');
const before=structuredClone(s);s=advanceShift(s,10000);assert.equal(s.cash,before.cash);assert.deepEqual(s.stock,before.stock);assert.equal(s.servedOrders.length,0);assert.equal(s.clock,before.clock,'First tutorial gives time to learn');
assert.match(cookingAction(s,'ADD_INGREDIENT','kumquat').error,/không có/);assert.deepEqual(cookingAction(s,'ADD_INGREDIENT','kumquat').state,s);
assert.ok(cookingAction(s,'COOK').error);assert.ok(cookingAction(s,'SERVE').error);assert.ok(action(s,'SERVE_AUTO').error,'Cannot bypass manual cooking');
s=run(s,'ADD_INGREDIENT','bread');assert.deepEqual(s.stock,before.stock);assert.ok(cookingAction(s,'ADD_INGREDIENT','bread').error);
s=decode(encode(s));assert.equal(s.service.selected.bread,1);s=run(s,'UNDO_INGREDIENTS');assert.deepEqual(s.service.selected,{});assert.deepEqual(s.stock,before.stock);
for(const[id,q]of Object.entries(cookingNeeds(s)))for(let i=0;i<q;i++)s=run(s,'ADD_INGREDIENT',id);
s=run(s,'COOK');s=decode(encode(s));assert.equal(s.service.phase,'PREP');s=advanceShift(s,1600);assert.equal(s.service.phase,'READY');const cash=s.cash;s=advanceShift(s,6000);assert.equal(s.cash,cash,'Ready food waits for player');s=decode(encode(s));assert.equal(s.service.phase,'READY');s=run(s,'SERVE');assert.ok(cookingAction(s,'SERVE').error);s=advanceShift(s,400);assert.equal(s.cash,cash+25000);assert.equal(s.stock.bread,before.stock.bread-1);assert.ok(cookingAction(s,'SERVE').error);s=decode(encode(s));s=advanceShift(s,1000);assert.equal(s.servedOrders.length,1);
function play(s){for(let i=0;i<10000&&s.screen==='SHOP';i++){
 if(s.activeDecision)s=run(s,'DECIDE',{choice:s.activeDecision.id==='EXTRA_CHA'&&s.stock.cha>=2?'yes':'no'});
 if(s.service?.phase==='SELECT') {for(const[id,q]of Object.entries(cookingNeeds(s)))for(let n=s.service.selected[id]||0;n<q;n++)s=run(s,'ADD_INGREDIENT',id);s=run(s,'COOK');}
 if(s.service?.phase==='READY')s=run(s,'SERVE');
 s=advanceShift(s,200);assert.ok(Object.values(s.stock).every(n=>n>=0));
 }assert.equal(s.screen,'DAY_RESULT');const l=calculateLedger(s);assert.equal(s.cash,l.finalCashInDrawer);const tickets=[...s.servedOrders,...s.missedOrders].map(o=>o.customerId);assert.equal(tickets.length,s.dayCustomers.length);assert.equal(new Set(tickets).size,tickets.length);return s}
let baseline=play(prepared());assert.equal(baseline.cash,127000);assert.equal(calculateLedger(baseline).grossOperatingProfit,67000);assert.equal(baseline.servedOrders.length,6);
// Both extra-cha branches are assembled by real player actions.
for(const yes of [true,false]){let b=toOrder(prepared());while(!b.activeDecision){if(b.service?.phase==='SELECT'){for(const[id,q]of Object.entries(cookingNeeds(b)))for(let n=0;n<q;n++)b=run(b,'ADD_INGREDIENT',id);b=run(b,'COOK')}if(b.service?.phase==='READY')b=run(b,'SERVE');b=advanceShift(b,200)}b=run(b,'DECIDE',{choice:yes?'yes':'no'});b=advanceShift(b,100);assert.equal(cookingNeeds(b).cha,yes?2:1)}
// Ordinary queues still lose patience while the player thinks; pause freezes it.
let neglected=toOrder(prepared());neglected.cookingTutorialDone=true;neglected=advanceShift(neglected,60000);assert.equal(neglected.servedOrders.length,0);assert.ok(neglected.waitingQueue.length);const paused=run(neglected,'TOGGLE_PAUSE');assert.deepEqual(advanceShift(paused,10000),paused);
// Migration converts old uncommitted automatic prep to manual, preserves money.
let old=toOrder(prepared());old.service={customerId:old.activeCustomer.id,recipeId:old.activeCustomer.recipe,phase:'PREP',elapsedMs:3000,prepMs:4200};old=advanceShift(decode(encode(old)),100);assert.equal(old.service.phase,'SELECT');assert.equal(old.cash,5000);
let campaign=baseline;
for(let day=2;day<=21;day++){
 campaign=run(campaign,'NEXT_DAY');if(day===2)campaign=run(campaign,'UPGRADE','bike_basket');if(day===3){campaign=run(campaign,'UPGRADE','counter');campaign=run(campaign,'LEARN_RECIPE','BANH_MI_TRUNG')}if(day===4)campaign=run(campaign,'UPGRADE','bike_basket');if(day===5)campaign=run(campaign,'UPGRADE','canopy');if(day===10)campaign=run(campaign,'UPGRADE','cargo');if(day>=8)campaign=run(campaign,'HIRE_STAFF');if(day>=15)campaign=run(campaign,'ENABLE_ONLINE');campaign=run(campaign,'NAVIGATE');assert.ok(Object.values(suggestBasket(campaign)).reduce((n,q)=>n+q,0)<=campaign.upgrades.vehicleCapacity);campaign=run(campaign,'SUGGEST_BASKET');campaign=run(campaign,'BUY');campaign=run(campaign,'START_DAY');
 if(day===8){assert.ok(!campaign.assistEnabled,'Hiring does not force auto play');campaign=run(campaign,'TOGGLE_ASSIST');for(let i=0;i<5000&&campaign.screen==='SHOP';i++){if(campaign.activeDecision)campaign=run(campaign,'DECIDE',{choice:'no'});campaign=advanceShift(campaign,200)}assert.equal(campaign.screen,'DAY_RESULT');assert.ok(campaign.servedOrders.length>0,'Paid assistant can automate');}else campaign=play(campaign);
 assert.ok(campaign.cash>=0);campaign=decode(encode(campaign));
}
console.log(JSON.stringify({status:'PASS',mode:'manual-ingredients-cook-serve',day1:{cash:baseline.cash,gross:67000,served:6},campaignDays:21,wrongTapSafe:true,duplicateServeGuard:true,savePhases:['SELECT','PREP','READY','REACTION'],staffAutomationOptional:true},null,2));
