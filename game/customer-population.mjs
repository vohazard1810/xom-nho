// Identity is independent of the production sprite and transaction/ticket ID.
const names={child:['Bé An','Bé Minh','Bé Khang','Bé Huy','Bé Phúc','Bé Sơn','Bé Hải','Bé Long'],teen:['Em Linh','Em Vy','Em Thảo','Em Ngân','Em Trâm','Em Chi','Em Hân','Em Nhi'],office:['Chị Lan','Chị Ngọc','Chị Mai','Chị Hương','Chị Thư','Chị Hà','Chị Yến','Chị Trang'],driver:['Anh Vũ','Anh Lâm','Anh Hùng','Anh Phong','Anh Tuấn','Anh Dũng','Anh Khánh','Anh Quân'],elder:['Bác Ba','Bác Năm','Bác Phúc','Bác Sơn','Bác Bình','Bác Tám','Bác Hải','Bác Thành'],neighbor:['Cô Chín','Cô Hoa','Cô Liên','Cô Hạnh','Cô Thu','Cô Nga','Cô Huệ','Cô Sáu'],professional:['Anh Tùng','Anh Khoa','Anh Bảo','Anh Nam','Anh Đức','Anh Trung','Anh Hoàng','Anh Việt']};
const hash=value=>{let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
const variants={child:'be_ti',teen:'walkin_student',office:'walkin_office',driver:'walkin_driver',elder:'walkin_elder',neighbor:'co_chin',professional:'anh_tung'};
export const populationSeed=()=>Math.floor(Math.random()*4294967296)>>>0;
export function migratePopulation(state){
 if(state.population)return;
 state.population={version:1,seed:hash(state.shopName||'legacy'),people:{}};
 for(const c of [...(state.dayCustomers||[]),...(state.waitingQueue||[]),...(state.activeCustomer?[state.activeCustomer]:[])]){
  if(c.isOnline||!c.personId)continue;
  const kind=c.visualVariantId==='be_ti'?'child':c.visualVariantId==='co_chin'?'neighbor':c.visualVariantId==='anh_tung'?'professional':c.archetype||'office';
  state.population.people[c.personId]={personId:c.personId,name:c.name,archetype:kind,visualVariantId:c.visualVariantId||variants[kind],temperament:c.temperament||'NORMAL',preferredRecipe:c.recipe};
 }
}
export function identifyRoster(state,list,district='home'){
 state.population ||= {version:1,seed:hash(state.shopName||'legacy'),people:{}};
 const population=state.population;
 return list.map((ticket,i)=>{
  if(ticket.isOnline)return ticket;
  let kind=ticket.id==='be_ti'?'child':ticket.id==='co_chin'?'neighbor':ticket.id==='anh_tung'?'professional':ticket.archetype|| (ticket.visualVariantId==='walkin_elder'?'elder':ticket.visualVariantId==='walkin_driver'?'driver':'office');
  if(!names[kind])kind='office';
  // Preserve the Day 1 story slots, but rotate those visual templates into later days.
  if(district==='home'&&state.currentDay>1&&i<3&&!['be_ti','co_chin','anh_tung'].includes(ticket.personId))kind=['child','neighbor','professional'][(state.currentDay+i)%3];
  const source=kind==='child'?'be_ti':kind==='neighbor'?'co_chin':kind==='professional'?'anh_tung':ticket.personId||`${kind}_${i}`;
  const personId=district==='home'?source:`${district}:${source}`;
  let person=population.people[personId];
  if(!person){const seed=hash(`${population.seed}:${personId}`);const used=new Set(Object.values(population.people).map(p=>p.name));const options=names[kind];let name=options[seed%options.length];for(let n=0;n<options.length&&used.has(name);n++)name=options[(seed+n)%options.length];
   if(used.has(name)){const prefix=options[0].split(' ')[0];const given=options.map(x=>x.slice(x.indexOf(' ')+1));const compound=given.flatMap(first=>given.filter(last=>last!==first).map(last=>`${prefix} ${first} ${last}`));name=compound.find(n=>!used.has(n))||`${prefix} Khách ${Object.keys(population.people).length+1}`;}
   person=population.people[personId]={personId,name,archetype:kind,visualVariantId:variants[kind],temperament:state.currentDay===1?ticket.temperament||'NORMAL':['NORMAL','FRIENDLY','RUSH'][seed%3],preferredRecipe:['BANH_MI_CHA','TRA_TAC','SUA_DAU_DA'][ (seed>>>5)%3]};
  }
  const visits=state.facts?.[personId]?.successful_orders||0;
  const regular=visits>=3;
  const recipe=state.currentDay>7&&i%2===0&&state.knownRecipeIds?.includes(person.preferredRecipe)?person.preferredRecipe:ticket.recipe;
  const temperament=state.currentDay===1?ticket.temperament:person.temperament;
  const dialogue=state.currentDay===1?ticket.dialogue:regular?'Mình ghé lại nè, làm giúp mình món hôm nay nhé!':temperament==='RUSH'?'Mình đang vội, làm giúp mình mang đi nhé!':'Cho mình món này mang đi nhé!';
  return {...ticket,personId,name:person.name,archetype:person.archetype,visualVariantId:person.visualVariantId,preferredRecipe:person.preferredRecipe,temperament,recipe,isRegular:regular,successfulVisits:visits,dialogue};
 });
}
