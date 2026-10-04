import {fresh, calculateLedger} from './day1-core.mjs';
import {dayConfig, rosterForDay, WALK_IN_ARCHETYPES} from './day-content.mjs';
import {advanceShift, cookingAction} from './shift-engine.mjs';

export const LOCATIONS=Object.freeze({
 home:{name:'Quán đầu hẻm',district:'Hẻm nhà',unlockDay:1,deposit:0,reserve:0,description:'Bánh mì và nước · khách quen trong xóm'},
 school:{name:'Quán cổng trường',district:'Đường tới trường',unlockDay:8,deposit:120000,reserve:80000,description:'Khách học sinh dồn giờ tan học · bánh mì, trà tắc'},
 office:{name:'Quán khu văn phòng',district:'Cuối đường lớn',unlockDay:15,deposit:250000,reserve:120000,description:'Khách vội, đơn mang đi · đồ ăn sáng và sữa đậu'}
});
export const STAFF_ROLES=Object.freeze({
 helper:{name:'Phụ bếp',wage:6000,unlockDay:4,description:'Làm món nhanh hơn; giảm quá tải'},
 manager:{name:'Quản lý',wage:10000,unlockDay:8,description:'Tự vận hành quán khi chủ vắng'},
 cleaner:{name:'Phụ dọn bàn',wage:4000,unlockDay:6,seating:true,description:'Khách ngồi được phục vụ nhanh hơn'},
 keeper:{name:'Giữ xe',wage:4000,unlockDay:10,seating:true,description:'Đón thêm khách ngồi; hỗ trợ lối vào'},
 buyer:{name:'Tiếp hàng',wage:5000,unlockDay:10,description:'Thêm sức chở khi nhập hàng; không tự mua'},
 packer:{name:'Đóng gói',wage:4000,unlockDay:15,online:true,description:'Làm đơn mang đi nhanh hơn'},
 driver:{name:'Giao hàng',wage:2500,unlockDay:15,online:true,description:'Giảm phí đơn giao ngoài; vẫn cần đủ nguyên liệu'}
});
const staffNames=['Dì Hạnh','Anh Phúc','Chị Lan','Chú Sơn','Bé Út','Cô Liên','Anh Bình'];
export const STAFF_MILESTONES=Object.freeze({helper:15,manager:30,cleaner:30,buyer:50,keeper:50,packer:100,driver:100});
export function staffRoleAvailable(s,role){
 const def=STAFF_ROLES[role];if(!def)return false;
 const served=Object.values(s.empire?.shops||{}).reduce((n,x)=>n+(x.state.lifetimeServed||0),0);
 return s.currentDay>=def.unlockDay || (s.currentDay>=4 && served>=STAFF_MILESTONES[role]);
}
const strip=s=>{const n=structuredClone(s);delete n.empire;return n};
const liveEmployees=(e,id)=>e.employees.filter(x=>x.shopId===id&&!x.restingToday);
export function staffCondition(p){
 const fatigue=Math.max(0,Math.min(100,p.fatigue??0));
 const mood=Math.max(0,Math.min(100,p.mood??80));
 return {efficiency:(1-fatigue/150)*(.8+.2*mood/100),
  advice:fatigue>=70?'Cho nghỉ một ca để hồi sức.':mood<50?'Động viên hoặc thưởng; tránh tăng tải ngay.':p.skill<3?'Có thể đào tạo để cải thiện tay nghề.':'Giữ phân ca hiện tại.'};
}
const cargoBonus=(e,id)=>{const p=liveEmployees(e,id).find(x=>x.role==='buyer');return p?10+5*p.skill:0};
function keeperTraffic(e,id,s){
 s.dayCustomers=s.dayCustomers.filter(c=>!c.id.startsWith('keeper_'));
 const keeper=liveEmployees(e,id).find(x=>x.role==='keeper');
 if(keeper){const base=s.dayCustomers.slice(0,2);for(let i=0;i<1+keeper.skill;i++){const c=base[i%base.length];if(c)s.dayCustomers.push({...c,id:`keeper_${id}_${s.currentDay}_${i}`,arrivalMinute:200+i*15,dialogue:'Có người giữ xe tiện quá, ghé ăn một phần nha!'})}}
 s.dayCustomers.sort((a,b)=>a.arrivalMinute-b.arrivalMinute);
}
export function ensureEmpire(input){
 if(input.empire?.version===1)return input;
 const s=structuredClone(input);s.legacyHelperToday=Boolean(input.staffHiredToday);s.empire={version:1,revisionCounter:input.revision,activeShopId:'home',shops:{home:{id:'home',state:strip(s),ready:false}},employees:[],nextEmployeeId:1,mapOpen:false,staffOpen:false,shiftRunning:input.screen==='SHOP',worldClock:input.clock,openingCash:input.dayStartingCash,report:null,history:[],notifications:[]};return s;
}
function pack(e, s, cash){s.cash=cash;e.revisionCounter=Math.max(e.revisionCounter||0,s.revision)+1;s.revision=e.revisionCounter;e.shops[e.activeShopId].state=strip(s);const out=strip(s);out.cash=cash;out.empire=e;if(e.shiftRunning){out.screen='SHOP';out.clock=e.worldClock;out.speed=e.speed||s.speed||1;}return out}
function employeeEffects(e,id,s,away=false){
 const workers=liveEmployees(e,id), manager=workers.find(x=>x.role==='manager');
 s.staffHiredToday=workers.some(x=>x.role==='helper'||x.role==='manager')||Boolean(s.legacyHelperToday);
 if(away)s.assistEnabled=Boolean(manager);
 const boost=workers.reduce((n,x)=>n+({manager:.06,helper:.14,cleaner:.05}[x.role]||0)*x.skill*staffCondition(x).efficiency,0);
 const hands=away?Math.max(.5,(.65+.12*(manager?.skill||0)-.002*(manager?.fatigue||0))*(manager?(.8+.2*(manager.mood??80)/100):1)):1.25;
 s.employeeSpeed=(1+boost+(s.legacyHelperToday?.35:0))*hands;s.packingSpeed=1+workers.filter(x=>x.role==='packer').reduce((n,x)=>n+.2*x.skill*staffCondition(x).efficiency,0);
 const driver=workers.find(x=>x.role==='driver');s.deliverySaving=driver?Math.min(1900,1200+300*driver.skill):0;
 return manager;
}
function roster(id,s){
 const list=rosterForDay(s.currentDay,s.rating??3,s.upgrades.seating,s.upgrades.canopy,s.knownRecipeIds)||s.dayCustomers;
 if(id==='home')return list;
 const arch=WALK_IN_ARCHETYPES[id==='school'?'teen':'office'];
 return list.map((c,i)=>({...c,id:`${id}_${c.id}`,personId:`${id}_${arch.archetype}_${i}`,archetype:arch.archetype,visualVariantId:arch.visualVariantId,name:arch.names[(s.currentDay+i)%arch.names.length],temperament:id==='office'&&i%3===0?'RUSH':c.temperament,recipe:id==='school'?(i%2?'TRA_TAC':'BANH_MI_CHA'):(i%3===0?'SUA_DAU_DA':i%3===1?'BANH_MI_CHA':'TRA_TAC'),dialogue:arch.quotes[id==='office'?'RUSH':'NORMAL']}));
}
const payloadThreshold=id=>id==='school'?30:100;
export function openingEligibility(input,id){const s=ensureEmpire(input),e=s.empire,loc=LOCATIONS[id];if(!loc||e.shops[id])return 'Đã có quán này.';const totalServed=Object.values(e.shops).reduce((n,x)=>n+(x.state.lifetimeServed||0),0);const achievement=payloadThreshold(id);if(s.currentDay<loc.unlockDay && !(s.currentDay>=4&&totalServed>=achievement))return `Mở ngày ${loc.unlockDay} hoặc phục vụ ${achievement} đơn từ ngày 4.`;const owned=Object.values(e.shops);if(owned.some(x=>(x.state.rating??0)<4))return 'Mỗi quán đang có cần đạt 4 sao.';if(owned.some(x=>!liveEmployees(e,x.id).some(p=>p.role==='manager')))return 'Thuê quản lý cho quán hiện tại trước khi mở rộng.';if(s.cash<loc.deposit+loc.reserve)return `Cần ${loc.deposit.toLocaleString('vi-VN')}đ đầu tư và giữ ${loc.reserve.toLocaleString('vi-VN')}đ vốn dự phòng.`;return null}
export function empireAction(input,type,payload){
 let root=ensureEmpire(input),e=structuredClone(root.empire),s=strip(e.shops[e.activeShopId].state);e.revisionCounter=Math.max(root.revision,e.revisionCounter||0);s.cash=root.cash;s.resultDetailsOpen=Boolean(root.resultDetailsOpen);if(root.resultRemainingMs!==undefined)s.resultRemainingMs=root.resultRemainingMs;
 const fail=error=>({state:input,error});const safe=['XOM_OI','MARKET','MENU'].includes(root.screen)&&!e.shiftRunning;
 if(type==='OPEN_MAP'){e.mapOpen=true;e.mapFocusId=e.activeShopId;return{state:pack(e,s,root.cash)}}
 if(type==='MAP_FOCUS'){if(!Object.hasOwn(LOCATIONS,payload))return fail('Địa điểm không hợp lệ.');e.mapFocusId=payload;return{state:pack(e,s,root.cash)}}
 if(type==='CLOSE_MAP'){e.mapOpen=false;return{state:pack(e,s,root.cash)}}
 if(type==='OPEN_STAFF'){if(!safe)return fail('Xem nhân sự trước ca bán.');e.staffOpen=true;return{state:pack(e,s,root.cash)}}
 if(type==='CLOSE_STAFF'){e.staffOpen=false;return{state:pack(e,s,root.cash)}}
 if(type==='TOGGLE_SHOP_DAY'){
  if(!safe||!e.shops[payload])return fail('Chọn ngày nghỉ cho quán trước ca bán.');
  e.shops[payload].closedToday=!e.shops[payload].closedToday;e.shops[payload].ready=false;
  return{state:pack(e,s,root.cash)};
 }
 if(type==='SWITCH_SHOP'){
  if(!e.shops[payload])return fail('Quán chưa mở.');
  if(e.shiftRunning&&e.shops[payload].closedToday)return fail('Quán này nghỉ hôm nay; chọn quán đang mở.');
  if(e.shiftRunning&&root.activeDecision)return fail('Chọn quyết định đang mở trước khi chuyển quán.');
  if(e.shiftRunning&&!employeeEffects(e,e.activeShopId,s,true)&&s.screen==='SHOP')return fail('Quán đang bán cần quản lý trước khi bạn rời đi.');
  e.shops[e.activeShopId].state=s;e.activeShopId=payload;e.mapOpen=false;e.staffOpen=false;
  const dest=strip(e.shops[payload].state);if(e.shiftRunning){dest.assistEnabled=false;dest.manualPaused=false;employeeEffects(e,payload,dest,false)}return{state:pack(e,dest,root.cash)};
 }
 if(type==='OPEN_LOCATION'){
  if(!safe)return fail('Thuê mặt bằng trước ca.');const reason=openingEligibility(root,payload);if(reason)return fail(reason);
  const loc=LOCATIONS[payload],n=fresh();n.shopName=loc.name;n.currentDay=root.currentDay;n.dayStartingCash=root.cash;n.cash=root.cash-loc.deposit;n.screen='XOM_OI';n.cookingTutorialDone=true;n.rating=3;n.upgrades.vehicleCapacity=30;n.upgrades.bike_basket=1;n.upgrades.seating=1;n.upgrades.seatingLevel=1;n.dayEvent=dayConfig(n.currentDay);n.marketPrices=structuredClone(s.marketPrices);n.dayCustomers=roster(payload,n);n.menu.SUA_DAU_DA.enabled=payload!=='school';
  s.cash=n.cash;s.upgradeSpent+=loc.deposit;e.shops[payload]={id:payload,state:n,ready:false};e.mapOpen=true;e.mapFocusId=payload;return{state:pack(e,s,n.cash)};
 }
 if(type.startsWith('STAFF_')){
  if(!safe)return fail('Chỉnh nhân sự trước ca.');
  if(type==='STAFF_HIRE'){
   const role=payload,def=STAFF_ROLES[role];if(!def||!staffRoleAvailable(root,role))return fail('Vị trí này chưa mở.');if(def.seating&&!s.upgrades.seating)return fail('Quán có chỗ ngồi mới cần vị trí này.');if(def.online&&!s.onlineEnabledToday)return fail('Bật nhận đơn online trước khi thuê vị trí này.');if(e.employees.some(x=>x.shopId===e.activeShopId&&x.role===role))return fail('Quán đã có người ở vị trí này.');if(root.cash<5000+def.wage+15000)return fail('Cần phí tuyển 5k, tiền lương và ít nhất 15k vốn hàng.');
   const n=e.nextEmployeeId++;e.employees.push({id:`employee_${n}`,name:staffNames[(n-1)%staffNames.length],role,shopId:e.activeShopId,skill:1,fatigue:0,mood:80,restingToday:false,daysWorked:0,lastTrainedDay:0});s.cash-=5000;s.operatingExpenses+=5000;
  }else{
   const [id,target]=String(payload||'').split(':');const x=e.employees.find(p=>p.id===id);if(!x)return fail('Không tìm thấy nhân viên.');
   if(type==='STAFF_TRAIN'){if(x.skill>=3||x.lastTrainedDay===root.currentDay)return fail('Tối đa cấp 3; mỗi người học một lần/ngày.');if(root.cash<8000)return fail('Cần 8k đào tạo.');x.skill++;x.lastTrainedDay=root.currentDay;x.mood=Math.min(100,x.mood+5);s.cash-=8000;s.operatingExpenses+=8000}
   else if(type==='STAFF_BONUS'){if(x.lastBonusDay===root.currentDay)return fail('Đã thưởng người này hôm nay.');if(root.cash<5000)return fail('Cần 5.000đ để thưởng động viên.');x.lastBonusDay=root.currentDay;x.mood=Math.min(100,x.mood+20);s.cash-=5000;s.operatingExpenses+=5000}
   else if(type==='STAFF_REST')x.restingToday=!x.restingToday;
   else if(type==='STAFF_MOVE'){const to=e.shops[target]?.state,def=STAFF_ROLES[x.role];if(!to||e.employees.some(p=>p.id!==id&&p.shopId===target&&p.role===x.role))return fail('Quán đích không hợp lệ hoặc đã có vị trí đó.');if(def.seating&&!to.upgrades.seating)return fail('Quán đích chưa có chỗ ngồi.');if(def.online&&!to.onlineEnabledToday)return fail('Quán đích chưa bật online.');x.shopId=target}
   else if(type==='STAFF_RELEASE')e.employees=e.employees.filter(p=>p.id!==id);
   else return fail('Lệnh nhân sự không hợp lệ.');
  }
  e.shops[e.activeShopId].state=s;
  for(const branch of Object.values(e.shops)){const bonus=cargoBonus(e,branch.id);branch.state.upgrades.vehicleCapacity+=bonus-(branch.state.employeeCargoBonus||0);branch.state.employeeCargoBonus=bonus;keeperTraffic(e,branch.id,branch.state);}
  return{state:pack(e,e.shops[e.activeShopId].state,s.cash)};
 }
 if(type==='START_DAY'){
  if(root.screen!=='MENU'||e.shiftRunning)return fail('Hoàn tất nhập hàng và menu trước khi mở ca.');
  if(e.shops[e.activeShopId].closedToday)return fail('Mở lại quán này hoặc chọn một quán mở bán.');
  e.shops[e.activeShopId].ready=true;
  if(Object.values(e.shops).some(x=>!x.closedToday&&(!x.ready||x.state.screen!=='MENU'))){e.mapOpen=true;return{state:pack(e,s,root.cash)}}
  for(const x of Object.values(e.shops))if(!x.closedToday&&x.id!==e.activeShopId&&!liveEmployees(e,x.id).some(p=>p.role==='manager'))return fail(`${LOCATIONS[x.id].name} cần quản lý để bán khi bạn vắng. Chuyển sang quán này hoặc thuê quản lý.`);
  const wages=e.employees.filter(x=>!x.restingToday&&!e.shops[x.shopId].closedToday).reduce((n,x)=>n+STAFF_ROLES[x.role].wage,0);
  if(root.cash<wages)return fail(`Chưa đủ ${wages.toLocaleString('vi-VN')}đ trả lương các quán. Cho nghỉ hoặc giảm nhân sự trước ca.`);
  e.shops[e.activeShopId].state=s;let cash=root.cash;
  for(const x of Object.values(e.shops)){
   if(x.closedToday){let branch=strip(x.state);branch.cash=cash;branch.screen='SHOP';branch.dayCustomers=[];const rating=branch.rating;branch=cookingAction(branch,'CLOSE').state;branch.rating=rating;x.state=branch;continue;}
   let branch=strip(x.state);branch.cash=cash;const wage=liveEmployees(e,x.id).reduce((n,p)=>n+STAFF_ROLES[p.role].wage,0);branch.cash-=wage;branch.operatingExpenses+=wage;
   const oldCapacity=branch.employeeCargoBonus||0,bonus=cargoBonus(e,x.id);branch.upgrades.vehicleCapacity+=bonus-oldCapacity;branch.employeeCargoBonus=bonus;
   if(x.id!=='home')branch.dayCustomers=roster(x.id,branch);
   keeperTraffic(e,x.id,branch);
   const r=cookingAction(branch,'START_DAY');if(r.error)return fail(`${LOCATIONS[x.id].name}: ${r.error}`);branch=r.state;cash=branch.cash;employeeEffects(e,x.id,branch,x.id!==e.activeShopId);x.state=branch;
  }
  e.shiftRunning=true;e.worldClock=Math.min(...Object.values(e.shops).map(x=>x.state.clock));e.mapOpen=false;e.report=null;e.notifications=[];return{state:pack(e,e.shops[e.activeShopId].state,cash)};
 }
 if(type==='NEXT_DAY'&&e.report){
  if(root.screen!=='DAY_RESULT')return fail('Kết thúc ngày trước khi tiếp tục.');
  e.shops[e.activeShopId].state=s;
  for(const x of Object.values(e.shops)){const r=cookingAction({...x.state,cash:root.cash},'NEXT_DAY');if(r.error)return fail(r.error);x.state=r.state;x.state.dayStartingCash=root.cash;x.ready=false;x.closedToday=false;if(x.id!=='home')x.state.dayCustomers=roster(x.id,x.state)}
  for(const x of e.employees)x.restingToday=false;
  e.openingCash=root.cash;e.worldClock=0;e.speed=1;e.shiftRunning=false;e.report=null;e.mapOpen=false;e.staffOpen=false;return{state:pack(e,e.shops[e.activeShopId].state,root.cash)};
 }
 const r=cookingAction(s,type,payload);if(r.error)return fail(r.error);s=r.state;
 if(type==='HIRE_STAFF')s.legacyHelperToday=true;
 if(type==='SET_SPEED')e.speed=s.speed;
 if(type==='NEXT_DAY'){e.shops[e.activeShopId].ready=false;e.openingCash=s.cash;e.shiftRunning=false;e.report=null;}
 if(type==='CLOSE'&&e.shiftRunning){e.shops[e.activeShopId].state=s;if(Object.values(e.shops).every(x=>x.state.screen==='DAY_RESULT'))return{state:finishDay(e,s.cash)};}
 if(type==='REPEAT_BASKET'||type==='SUGGEST_BASKET'||type==='BASKET'||type==='BUY'||type==='CONFIG_MENU'||type==='SET_OPENING_TIME')e.shops[e.activeShopId].ready=false;
 return{state:pack(e,s,s.cash)};
}
function shopReport(e,x){const s=x.state,l=calculateLedger(s),workers=e.employees.filter(p=>p.shopId===x.id);const reasons=Object.fromEntries(Object.entries(l.missedByReason).filter(([,a])=>a.length).map(([k,a])=>[k,a.length]));const advice=reasons.OUT_OF_STOCK?'Tăng lượng nhập hoặc sức chở; không phải lỗi nhân viên.':reasons.PRICE_TOO_HIGH?'Thử hạ giá món bị từ chối.':reasons.WAIT_TOO_LONG?'Đào tạo phụ bếp, bổ sung người hoặc chủ hỗ trợ giờ đông.':l.resultAfterSpoilageAndExpenses<0?'Chi phí đang cao: kiểm tra lương và lượng hàng hỏng.':'Quán vận hành ổn; giữ đủ hàng và vốn dự phòng.';return{id:x.id,name:LOCATIONS[x.id].name,served:l.servedCount,missed:l.missedCount,revenue:l.totalSalesRevenue,cogs:l.cogsSoldItemsOnly,gross:l.grossOperatingProfit,profit:l.resultAfterSpoilageAndExpenses,spent:l.spentOnMorningStock,ops:l.operatingExpenses,investment:l.upgradeOutlay,spoilage:l.spoilageLoss,fees:l.onlineFees,tips:l.tipsCollected,sideIncome:l.sideJobIncome,rating:s.rating,reasons,advice,feedback:s.lastDayReport?.feedback.slice(0,3)||[],employees:workers.map(p=>({id:p.id,name:p.name,role:p.role,skill:p.skill,fatigue:p.fatigue,mood:p.mood,lastShift:p.lastShift,advice:staffCondition(p).advice}))}}
function finishDay(e,cash){
 for(const p of e.employees){
  const branch=e.shops[p.shopId],rested=p.restingToday||branch.closedToday;
  const before={fatigue:p.fatigue,mood:p.mood};
  const served=branch.state.servedOrders.length;
  const fatigueGain=Math.min(28,8+Math.ceil(served*.7));
  if(rested){p.fatigue=Math.max(0,p.fatigue-30);p.mood=Math.min(100,p.mood+8)}
  else{p.daysWorked++;p.fatigue=Math.min(100,p.fatigue+fatigueGain);p.mood=Math.max(20,p.mood-(p.fatigue>=70?6:0))}
  p.lastShift={day:branch.state.currentDay,rested,served:rested?0:served,fatigueChange:p.fatigue-before.fatigue,moodChange:p.mood-before.mood,advice:staffCondition(p).advice};
 }
 const shops=Object.values(e.shops).map(x=>shopReport(e,x));const movement=shops.reduce((n,x)=>n-x.spent-x.ops-x.investment-x.fees+x.revenue+x.tips+x.sideIncome,0);
 e.report={day:e.shops[e.activeShopId].state.currentDay,openingCash:e.openingCash,closingCash:cash,cashMovement:movement,reconciled:e.openingCash+movement===cash,profit:shops.reduce((n,x)=>n+x.profit,0),shops};e.history.push(e.report);e.history=e.history.slice(-21);e.shiftRunning=false;e.mapOpen=false;e.staffOpen=false;
 const s=strip(e.shops[e.activeShopId].state);s.screen='DAY_RESULT';s.resultRemainingMs=12000;return pack(e,s,cash);
}
export function advanceEmpire(input,elapsedMs){
 const root=ensureEmpire(input);if(root.screen!=='SHOP'||root.isPaused||root.manualPaused||root.empire.mapOpen||root.empire.staffOpen)return root;
 const e=structuredClone(root.empire);e.revisionCounter=Math.max(root.revision,e.revisionCounter||0);let cash=root.cash;
 if(Object.keys(e.shops).length===1){let s=strip(e.shops.home.state);s.cash=cash;employeeEffects(e,'home',s,false);s=advanceShift(s,elapsedMs);cash=s.cash;e.shops.home.state=s;e.worldClock=s.clock;if(s.screen==='DAY_RESULT')return finishDay(e,cash);return pack(e,s,cash)}
 let left=elapsedMs*(root.speed||1);
 while(left>0&&e.shiftRunning){const ms=Math.min(100,left);left-=ms;
  const active=e.shops[e.activeShopId].state;if(active.isPaused||active.manualPaused)break;
  const rate=Object.values(e.shops).some(x=>x.state.activeCustomer||x.state.waitingQueue.length)?2:18;
  const tutorial=active.currentDay===1&&!active.cookingTutorialDone&&active.activeCustomer?.status==='ARRIVED';
  const effectiveRate=tutorial?0:rate;
  const beforeClock=e.worldClock; e.worldClock=Math.min(360,e.worldClock+ms/1000*effectiveRate);
  for(const x of Object.values(e.shops)){
   let s=strip(x.state);if(s.screen!=='SHOP'||beforeClock<s.clock-.0001)continue;
   s.cash=cash;s.clock=beforeClock;s.speed=1;
   employeeEffects(e,x.id,s,x.id!==e.activeShopId);
   if(x.id!==e.activeShopId&&s.activeDecision){const r=cookingAction(s,'DECIDE',{choice:'no'});s=r.state;e.notifications.push(`${LOCATIONS[x.id].name}: quản lý giữ phương án thường.`)}
   s=advanceShift(s,ms,{minuteRate:effectiveRate});cash=s.cash;x.state=s;
  }
  if(e.worldClock>=360){for(const x of Object.values(e.shops))if(x.state.screen==='SHOP'){x.state=cookingAction({...x.state,cash},'CLOSE').state;cash=x.state.cash}return finishDay(e,cash)}
  if(e.shops[e.activeShopId].state.isPaused)break;
 }
 return pack(e,e.shops[e.activeShopId].state,cash);
}
