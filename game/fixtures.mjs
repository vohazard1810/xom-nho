import {fresh} from './day1-core.mjs';
import {dayConfig,rosterForDay} from './day-content.mjs';
import {ensureEmpire,empireAction,advanceEmpire} from './empire-engine.mjs';
export const FIXTURE_SEED=20261024;
// Controlled fixture, never evidence of natural progression. No random/global mutations.
export function loadFixture(name){
 if(name!=='two_shops_mid_prep')throw new Error(`Unknown fixture: ${name}`);
 const run=(s,t,p)=>{const r=empireAction(s,t,p);if(r.error)throw new Error(`${t}: ${r.error}`);return r.state};
 let s=fresh(FIXTURE_SEED);
 Object.assign(s,{shopName:'Quán fixture',screen:'XOM_OI',currentDay:8,cash:900000,dayStartingCash:900000,rating:4,cookingTutorialDone:true,dayEvent:dayConfig(8)});
 s.upgrades.vehicleCapacity=45;s.dayCustomers=rosterForDay(8,4,0,0,s.knownRecipeIds);s=ensureEmpire(s);
 s=run(s,'STAFF_HIRE','manager');s=run(s,'OPEN_LOCATION','school');s=run(s,'SWITCH_SHOP','school');s=run(s,'STAFF_HIRE','manager');
 for(const id of ['home','school']){s=run(s,'SWITCH_SHOP',id);s=run(s,'NAVIGATE');s=run(s,'SUGGEST_BASKET');s=run(s,'BUY');s=run(s,'START_DAY');}
 for(let i=0;i<4000;i++){
  const b=s.empire.shops.home.state;
  if(b.service?.phase==='PREP')return s;
  s=advanceEmpire(s,100);
 }
 throw new Error('Fixture could not reach managed PREP');
}
