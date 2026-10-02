import assert from 'node:assert/strict';
import { action, fresh, decode, encode, calculateLedger, suggestBasket, recipes } from './day1-core.mjs';
import { advanceShift, serviceVisual } from './shift-engine.mjs';
const run = (s, t, p) => { const r = action(s,t,p); assert.equal(r.error, undefined, `${t}: ${r.error}`); return r.state; };
function prepared() {
  let s=fresh();
  for (const [t,p] of [['SET_SHOP_NAME','Quán Hẻm Nhỏ'],['NAVIGATE'],['NAVIGATE'],['BUNDLE_DAY1'],['BUY'],['START_DAY']]) s=run(s,t,p);
  return s;
}
function finish(s, control = () => {}) {
  for(let i=0; i<5000 && s.screen==='SHOP'; i++) {
    if(s.activeDecision) s=run(s,'DECIDE',{choice:s.activeDecision.id==='EXTRA_CHA' && s.stock.cha>=2?'yes':'no'});
    s=control(s) || s;
    s=advanceShift(s,200);
    assert.ok(Object.values(s.stock).every(q=>q>=0));
  }
  assert.equal(s.screen,'DAY_RESULT','A shift must finish');
  const l=calculateLedger(s);
  assert.equal(s.cash,l.finalCashInDrawer);
  assert.equal(l.servedCount+l.missedCount,s.dayCustomers.length);
  const ids=[...s.servedOrders,...s.missedOrders].map(o=>o.customerId);
  assert.equal(new Set(ids).size, ids.length, 'Each customer resolves exactly once');
  return s;
}
const tipped=fresh();tipped.servedOrders=[{sellPrice:15000,cogs:6000,tip:2000}];tipped.operatingExpenses=1000;
assert.equal(calculateLedger(tipped).resultAfterSpoilageAndExpenses,10000,'Tips count in business result, separately from menu revenue');
let baseline=finish(prepared());
assert.equal(baseline.cash,127000);
assert.equal(calculateLedger(baseline).grossOperatingProfit,67000);
assert.equal(baseline.servedOrders.length,6);
assert.equal(baseline.missedOrders.filter(o=>o.reason==='OUT_OF_STOCK').length,2);

// F5 at every production phase resumes the actual engine, not another simulator.
for(const phase of ['PREP','HANDOFF','REACTION']) {
  let s=prepared();
  for(let i=0;i<1000 && s.service?.phase!==phase;i++) s=advanceShift(s,100);
  assert.equal(s.service?.phase,phase);
  const before=structuredClone(s);
  s=decode(encode(s));
  assert.deepEqual(s.service,before.service);
  const done=finish(s);
  assert.equal(done.cash,baseline.cash);
  assert.deepEqual(done.stock,baseline.stock);
}
let paused=prepared();
for(let i=0;i<1000&&!paused.activeDecision;i++) paused=advanceShift(paused,100);
paused.focusBoost={active:true,remainingSeconds:7,cooldownSeconds:30,multiplier:2};
assert.deepEqual(advanceShift(paused,8000),paused,'Decision freezes everything');
paused=run(paused,'DECIDE',{choice:'yes'});
paused=run(paused,'TOGGLE_PAUSE');
assert.deepEqual(advanceShift(paused,8000),paused,'Manual pause freezes everything');
paused=run(paused,'TOGGLE_PAUSE');
const timer=paused.focusBoost.remainingSeconds;
paused=advanceShift(paused,1000);
assert.ok(Math.abs(paused.focusBoost.remainingSeconds-(timer-1))<.00001,'Boost has one seconds clock');

// Three real tickets share the same engine the UI uses.
function wave() {
  const s=prepared();
  s.dayCustomers=[
    {id:'wave_a',name:'Bác Ba',recipe:'BANH_MI_CHA',arrivalMinute:0,temperament:'NORMAL',priceSensitivity:'LOW'},
    {id:'wave_b',name:'Chị Mai',recipe:'TRA_TAC',arrivalMinute:5,temperament:'NORMAL',priceSensitivity:'LOW'},
    {id:'wave_c',name:'Anh Tùng',recipe:'SUA_DAU_DA',arrivalMinute:8,temperament:'RUSH',priceSensitivity:'LOW'}
  ];
  return s;
}
const idle=finish(wave());
assert.equal(idle.servedOrders.length,2);
assert.equal(idle.missedOrders[0].reason,'WAIT_TOO_LONG');
let selected=false;
const priority=finish(wave(),s=>{
  if(!selected&&s.waitingQueue.some(c=>c.id==='wave_c')) {selected=true; return run(s,'PRIORITIZE',{customerId:'wave_c'});}
});
assert.deepEqual(priority.servedOrders.map(o=>o.customerId),['wave_a','wave_c','wave_b']);
assert.equal(priority.missedOrders.length,0);
const boosted=finish(run(wave(),'FOCUS_BOOST'));
assert.equal(boosted.servedOrders.length,3);
assert.equal(boosted.missedOrders.length,0);
assert.equal(boosted.revenue-idle.revenue,17000);
const staffed=wave();staffed.staffHiredToday=true;
const staffResult=finish(staffed);
assert.ok(staffResult.servedOrders[1].startedAt<idle.servedOrders[1].startedAt,'Paid staff improves production speed');

// Closing after reordering must neither omit nor duplicate another customer's loss.
let closing=wave();
for(let i=0;i<1000&&!closing.servedOrders.some(o=>o.customerId==='wave_c');i++) {
  if(closing.waitingQueue.some(c=>c.id==='wave_c')) closing=run(closing,'PRIORITIZE',{customerId:'wave_c'});
  closing=advanceShift(closing,100);
}
closing=run(closing,'CLOSE');
assert.equal(closing.servedOrders.length+closing.missedOrders.length,3);
assert.equal(new Set([...closing.servedOrders,...closing.missedOrders].map(o=>o.customerId)).size,3);

// 21 playable days through the production engine. No waiting in real time.
let campaign=baseline;
for(let day=2;day<=21;day++) {
  campaign=run(campaign,'NEXT_DAY');
  if(day===2) campaign=run(campaign,'UPGRADE','bike_basket');
  if(day===3) {campaign=run(campaign,'UPGRADE','counter');campaign=run(campaign,'LEARN_RECIPE','BANH_MI_TRUNG');}
  if(day===4) campaign=run(campaign,'UPGRADE','bike_basket');
  if(day===5) campaign=run(campaign,'UPGRADE','canopy');
  if(day===10) campaign=run(campaign,'UPGRADE','cargo');
  if(day>=8) campaign=run(campaign,'HIRE_STAFF');
  if(day>=15) campaign=run(campaign,'ENABLE_ONLINE');
  campaign=run(campaign,'NAVIGATE');
  const suggestion=suggestBasket(campaign);
  const wanted=Object.values(suggestion).reduce((n,q)=>n+q,0);
  assert.ok(wanted<=campaign.upgrades.vehicleCapacity);
  campaign=run(campaign,'SUGGEST_BASKET');
  campaign=run(campaign,'BUY');
  campaign=run(campaign,'START_DAY');
  campaign=finish(campaign,s=>{
    const rush=s.waitingQueue.find(c=>c.temperament==='RUSH');
    if(rush) s=run(s,'PRIORITIZE',{customerId:rush.id});
    if(s.waitingQueue.length>=2&&!s.focusBoost.active&&s.focusBoost.cooldownSeconds<=0) s=run(s,'FOCUS_BOOST');
    return s;
  });
  assert.ok(campaign.cash>=0);
  assert.equal(campaign.currentDay,day);
  campaign=decode(encode(campaign));
}
console.log(JSON.stringify({gate:'production-shift',day1:{cash:baseline.cash,grossProfit:67000},rush:{idle:idle.servedOrders.length,priority:priority.servedOrders.length,boost:boosted.servedOrders.length},campaignDays:21,finalCash:campaign.cash,phasesReloaded:['PREP','HANDOFF','REACTION'],status:'PASS'},null,2));
