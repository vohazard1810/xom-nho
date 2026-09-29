// Day 1 vertical slice. Prices and quantities are explicit playtest fixtures,
// not an approved economy balance. All money is integer VND.
export const ingredients = Object.freeze({
  bread:{name:'Bánh mì',price:4000}, cha:{name:'Chả',price:5000},
  vegetable:{name:'Rau',price:2000}, ice:{name:'Đá',price:1000},
  sugar_syrup:{name:'Nước đường',price:2000}, kumquat:{name:'Tắc',price:2000},
  soy_milk:{name:'Sữa đậu',price:4000}
});
export const recipes = Object.freeze({
  BANH_MI_CHA:{name:'Bánh mì chả',price:25000,needs:{bread:1,cha:1,vegetable:1}},
  TRA_TAC:{name:'Trà tắc',price:15000,needs:{ice:1,sugar_syrup:1,kumquat:1}},
  SUA_DAU_DA:{name:'Sữa đậu đá',price:17000,needs:{ice:1,sugar_syrup:1,soy_milk:1}}
});
export const customers = Object.freeze([
  {id:'be_ti',name:'Bé Tí',recipe:'BANH_MI_CHA',request:'Xin thêm chả được không ạ?'},
  {id:'co_chin',name:'Cô Chín',recipe:'TRA_TAC'},
  {id:'anh_tung',name:'Anh Tùng',recipe:'SUA_DAU_DA'}
]);
export const SAVE_KEY='xom_nho_day1_vertical_slice_v1';
export function fresh(){return {revision:0,screen:'HOME',cash:60000,debt:0,revenue:0,cogs:0,spent:0,
  basket:Object.fromEntries(Object.keys(ingredients).map(k=>[k,0])),
  stock:Object.fromEntries(Object.keys(ingredients).map(k=>[k,0])),
  arrivals:0,served:[],missed:[],selected:null,draft:{},extraCha:null,
  knownRecipeIds:[],teasedRecipeIds:['BANH_MI_TRUNG'],facts:{}}}
export const total = basket=>Object.entries(basket).reduce((sum,[id,qty])=>sum+ingredients[id].price*qty,0);
export const needFor=(id,extraCha)=>({...recipes[customers.find(c=>c.id===id).recipe].needs,
  ...(id==='be_ti'&&extraCha?{cha:2}:{})});
export const equalCounts=(a,b)=>Object.keys(ingredients).every(k=>(a[k]||0)===(b[k]||0));
const copy=s=>structuredClone(s);
export function action(state,type,payload){
  const s=copy(state);const fail=message=>({state,error:message});
  if(type==='NAVIGATE'){
    const next={HOME:'XOM_OI',XOM_OI:'MARKET'}[s.screen];
    if(!next)return fail('Không có bước tiếp theo ở màn này.');s.screen=next;
  }else if(type==='REPLAY')return {state:fresh()};
  else if(type==='BASKET'){
    if(s.screen!=='MARKET'||!ingredients[payload.id]||!Number.isInteger(payload.qty)||payload.qty<0||payload.qty>12)return fail('Số lượng mua không hợp lệ.');
    s.basket[payload.id]=payload.qty;
  }else if(type==='BUY'){
    if(s.screen!=='MARKET')return fail('Chỉ mua hàng ở chợ.');
    const cost=total(s.basket);if(cost>s.cash)return fail('Không đủ tiền mặt.');
    for(const k of Object.keys(ingredients))s.stock[k]+=s.basket[k];
    s.cash-=cost;s.spent+=cost;s.cogs+=cost;s.basket=Object.fromEntries(Object.keys(ingredients).map(k=>[k,0]));s.screen='SHOP';s.arrivals=3;
  }else if(type==='SELECT'){
    if(s.screen!=='SHOP'||!customers.some(c=>c.id===payload)||s.served.includes(payload)||s.missed.includes(payload))return fail('Khách không có trong hàng chờ.');
    s.selected=payload;s.draft={};
  }else if(type==='EXTRA'){
    if(s.screen!=='SHOP'||s.selected!=='be_ti'||s.served.includes('be_ti'))return fail('Chỉ quyết định yêu cầu thêm chả khi Bé Tí đang chờ.');
    s.extraCha=Boolean(payload);s.draft={};
  }else if(type==='TAP'){
    if(s.screen!=='SHOP'||!s.selected||!ingredients[payload])return fail('Chọn khách và nguyên liệu trước.');
    if(s.selected==='be_ti'&&s.extraCha===null)return fail('Hãy trả lời yêu cầu của Bé Tí trước.');
    s.draft[payload]=(s.draft[payload]||0)+1;
  }else if(type==='CLEAR'){
    if(s.screen!=='SHOP')return fail('Không có món đang làm.');s.draft={};
  }else if(type==='COMMIT'){
    if(s.screen!=='SHOP'||!s.selected)return fail('Chưa chọn khách.');
    if(s.selected==='be_ti'&&s.extraCha===null)return fail('Hãy trả lời yêu cầu của Bé Tí trước.');
    const need=needFor(s.selected,s.extraCha);
    if(!equalCounts(s.draft,need))return fail('Nguyên liệu chưa đúng công thức. Giỏ nháp không tiêu hao hàng.');
    if(Object.keys(need).some(k=>s.stock[k]<need[k]))return fail('Không đủ nguyên liệu trong quầy.');
    for(const [k,qty] of Object.entries(need))s.stock[k]-=qty;
    const npc=customers.find(c=>c.id===s.selected);const price=recipes[npc.recipe].price;
    s.cash+=price;s.revenue+=price;s.served.push(npc.id);s.knownRecipeIds=[...new Set([...s.knownRecipeIds,npc.recipe])];
  }else if(type==='SKIP'){
    if(s.screen!=='SHOP'||!s.selected)return fail('Chưa chọn khách.');
    const npc=customers.find(c=>c.id===s.selected);
    s.missed.push(npc.id);
    s.facts[npc.id]={successful_orders:0,missed_orders:1,times_given_extra:0};
    s.selected=null;s.draft={};
    if(s.served.length + s.missed.length >= customers.length){
      s.screen='DAY_RESULT';
    }
  }else if(type==='CLOSE'){
    if(s.screen!=='SHOP')return fail('Quán chưa mở.');
    s.missed=customers.filter(c=>!s.served.includes(c.id)).map(c=>c.id);
    for(const id of s.missed)s.facts[id]={successful_orders:0,missed_orders:1,times_given_extra:0};
    s.screen='DAY_RESULT';s.selected=null;s.draft={};
  }else return fail('Lệnh không hợp lệ.');
  s.revision=state.revision+1;return {state:s};
}
// Canonical serialization is stable because every state transition clones the same schema.
export function checksum(value){let n=2166136261;for(const ch of JSON.stringify(value)){n=Math.imul(n^ch.charCodeAt(0),16777619)}return (n>>>0).toString(16)}
export function encode(state){return JSON.stringify({saveRevision:state.revision,checksum:checksum(state),state})}
export function decode(raw){try{const data=JSON.parse(raw);if(data.saveRevision!==data.state.revision||data.checksum!==checksum(data.state)||!['HOME','XOM_OI','MARKET','SHOP','DAY_RESULT'].includes(data.state.screen))return null;return data.state}catch{return null}}
