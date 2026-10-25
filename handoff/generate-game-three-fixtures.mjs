import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fresh, encode, decode, SAVE_KEY, totalBasketUnits } from '../game/day1-core.mjs';
import { ensureEmpire, empireAction } from '../game/empire-engine.mjs';
import { loadFixture } from '../game/fixtures.mjs';
import { menuPricePreview, missedDemandSummary } from '../game/shop-insights.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const step = (s, type, payload) => { const r = empireAction(s,type,payload); assert.equal(r.error,undefined,type); return r.state; };
let market=ensureEmpire(fresh(20261025));
for(const [t,p] of [['SET_SHOP_NAME','Quán kiểm chứng'],['NAVIGATE'],['NAVIGATE'],['BUNDLE_DAY1']]) market=step(market,t,p);
assert.equal(totalBasketUnits(market.basket),19);
// Controlled fixture supplies the engine's default rating for pre-shift screens.
market.rating=3;market.empire.shops.home.state.rating=3;
const menu=step(market,'BUY');
const loss=step(menu,'CONFIG_MENU',{recipeId:'BANH_MI_CHA',sellPrice:22000});
loss.marketPrices.cha=17000;loss.empire.shops.home.state.marketPrices.cha=17000;
assert.equal(menuPricePreview(loss).find(x=>x.recipeId==='BANH_MI_CHA').risk,'loss');
const even=structuredClone(loss);even.marketPrices.cha=16000;even.empire.shops.home.state.marketPrices.cha=16000;
const result=step(step(menu,'START_DAY'),'CLOSE');
const zero=structuredClone(menu);zero.dayCustomers=[];zero.empire.shops.home.state.dayCustomers=[];
const resultZero=step(step(zero,'START_DAY'),'CLOSE');
assert.equal(missedDemandSummary(resultZero.empire.shops.home.state).totalMissed,0);
let multi=loadFixture('two_shops_mid_prep');
multi.empire.shops.school.state.dayCustomers=multi.empire.shops.school.state.dayCustomers.slice(0,2);
if(multi.empire.activeShopId==='school')multi.dayCustomers=structuredClone(multi.empire.shops.school.state.dayCustomers);
for(const id of ['home','school']){multi=step(multi,'SWITCH_SHOP',id);multi=step(multi,'CLOSE');}
assert.ok(multi.empire.report);
const counts=multi.empire.report.shops.map(s=>missedDemandSummary(multi.empire.shops[s.id].state).totalMissed);
assert.notEqual(counts[0],counts[1]);
const cases={market,menu,loss,even,result,resultZero,multi};
const hydrated = Object.fromEntries(Object.entries(cases).map(([name, state]) => [name, ensureEmpire(decode(encode(state)))]));
assert.equal(menuPricePreview(hydrated.loss).find(x=>x.recipeId==='BANH_MI_CHA').risk,'loss');
assert.equal(menuPricePreview(hydrated.even).find(x=>x.recipeId==='BANH_MI_CHA').risk,'break_even');
assert.equal(missedDemandSummary(hydrated.resultZero.empire.shops.home.state).totalMissed,0);
assert.equal(totalBasketUnits(hydrated.market.basket),19);
const out=path.join(root,'handoff','.runtime','game-three-fixtures');fs.mkdirSync(out,{recursive:true});
for(const [name,state] of Object.entries(cases)){
 fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify({label:'CONTROLLED FIXTURE, not natural gameplay',seed:20261025,saveKey:SAVE_KEY+':0',encodedSave:encode(state),state},null,2));
}
console.log(JSON.stringify({fixtures:Object.keys(cases),output:out,marketUnits:19,loss:menuPricePreview(loss)[0].estimatedGrossProfit,zeroMissed:0,multiMissed:counts}));
