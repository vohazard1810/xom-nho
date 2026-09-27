const NPC_STATES={walk:6,arrive:4,queue_wait:4,order:4,conflict_wait:4,receive:4,refused:4,react:4,pay:4,leave:6};
const SHOP_STATES={idle:4,prepare_food_normal:8,prepare_food_extra_cha:9,prepare_drink:8,handoff:4};
const $=id=>document.getElementById(id); const npcState=$("npcState"),shopState=$("shopState");
Object.keys(NPC_STATES).forEach(s=>npcState.add(new Option(s,s)));Object.keys(SHOP_STATES).forEach(s=>shopState.add(new Option(s,s)));
let frame=0,timer=null,handoff=false;
const anchors={shopHand:{x:48,y:55},npcReceive:{x:59,y:55}};
function frameCount(){return Math.max(NPC_STATES[npcState.value],SHOP_STATES[shopState.value])}
function pos(el,p){el.style.left=p.x+"%";el.style.top=p.y+"%"}
function render(){
 frame%=frameCount(); pos($("shopHand"),anchors.shopHand);pos($("npcReceive"),anchors.npcReceive);
 const show=$("anchors").checked;$("shopHand").hidden=!show;$("npcReceive").hidden=!show;document.querySelector(".guide").hidden=!show;
 $("product").textContent=$("productType").value;$("product").style.left=(handoff?anchors.npcReceive.x:anchors.shopHand.x)+"%";
 $("product").style.top=(handoff?anchors.npcReceive.y:anchors.shopHand.y)+"%";
 $("npc").style.filter=npcState.value==="refused"?"grayscale(.35)":npcState.value==="conflict_wait"?"saturate(.7)":"none";
 $("debug").textContent=JSON.stringify({npc:{state:npcState.value,frame,wait_reason:$("waitReason").value,reaction:$("reaction").value,feet_anchor:[68,72],receive_anchor:anchors.npcReceive},shopkeeper:{state:shopState.value,frame,feet_anchor:[38,72],hand_anchor:anchors.shopHand},handoff_overlay:handoff},null,2);
}
$("next").onclick=()=>{frame++;render()};$("prev").onclick=()=>{frame=Math.max(0,frame-1);render()};
$("play").onclick=()=>{if(timer){clearInterval(timer);timer=null;$("play").textContent="▶ Play"}else{timer=setInterval(()=>{frame++;render()},140);$("play").textContent="⏸ Pause"}};
$("handoff").onclick=()=>{handoff=!handoff;render()};["npcState","shopState","waitReason","reaction","productType","anchors"].forEach(id=>$(id).onchange=()=>{frame=0;render()});render();