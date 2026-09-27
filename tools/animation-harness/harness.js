const $=id=>document.getElementById(id);
let manifest=null, frame=0, timer=null, handoff=false;

async function loadManifest(){
  const res=await fetch("./manifest.json",{cache:"no-store"});
  if(!res.ok) throw new Error("manifest.json HTTP "+res.status);
  manifest=await res.json();
  if(manifest.gate_status==="PASS") console.warn("PASS must be backed by all three validation tests.");
  populate();
  render();
}
function stateKeys(character){
  return Object.keys(manifest.characters[character].states);
}
function populate(){
  const npc=$("npcState"), shop=$("shopState");
  npc.innerHTML=""; shop.innerHTML="";
  stateKeys("be_ti").forEach(s=>npc.add(new Option(s,s)));
  stateKeys("shopkeeper").forEach(s=>shop.add(new Option(s,s)));
}
function selectedFrames(character,state){
  const spec=manifest.characters[character].states[state];
  if(spec.frames) return spec.frames;
  const variant=character==="be_ti" && state==="QUEUE_WAIT" ? $("waitReason").value :
    character==="be_ti" && state==="REACT" ? $("reaction").value :
    character==="shopkeeper" && state==="PREPARE_FOOD" ? $("prepFoodVariant").value :
    character==="shopkeeper" && state==="PREPARE_DRINK" ? "tra_tac" : null;
  return variant && spec.frames_by_variant ? (spec.frames_by_variant[variant]||[]) : [];
}
function currentFrame(frames){ return frames.length ? frames[frame%frames.length] : null; }
function renderActor(el,frameData,fallback){
  el.innerHTML="";
  if(frameData?.file){
    const img=new Image(); img.src="../../"+frameData.file; img.alt=frameData.file;
    img.onerror=()=>{el.innerHTML='<div class="placeholder">'+fallback+'</div>'};
    el.appendChild(img);
  } else el.innerHTML='<div class="placeholder">'+fallback+'</div>';
}
function anchorPoint(frameData,name){
  const a=frameData?.anchors?.[name];
  return a && Number.isFinite(a.x) && Number.isFinite(a.y) ? a : null;
}
function placeAnchor(el,a){
  if(!a){el.hidden=true;return}
  el.hidden=!$("anchors").checked;
  el.style.left=(a.x/manifest.canvas.width*100)+"%";
  el.style.top=(a.y/manifest.canvas.height*100)+"%";
}
function render(){
  if(!manifest)return;
  const nf=currentFrame(selectedFrames("be_ti",$("npcState").value));
  const sf=currentFrame(selectedFrames("shopkeeper",$("shopState").value));
  renderActor($("npc"),nf,"👦"); renderActor($("shop"),sf,"🧑‍🍳");
  const receive=anchorPoint(nf,"receive_point");
  const hand=anchorPoint(sf,"hand_right");
  placeAnchor($("npcReceive"),receive); placeAnchor($("shopHand"),hand);
  $("product").textContent=$("productType").value;
  const p=handoff ? receive : hand;
  if(p){$("product").hidden=false;$("product").style.left=(p.x/manifest.canvas.width*100)+"%";$("product").style.top=(p.y/manifest.canvas.height*100)+"%"} else $("product").hidden=true;
  $("debug").textContent=JSON.stringify({
    gate_status:manifest.gate_status,
    npc:{state:$("npcState").value,frame:nf?.index??null,file:nf?.file??null,status:nf?.status??"NO_FRAME",anchors:nf?.anchors??null},
    shopkeeper:{state:$("shopState").value,frame:sf?.index??null,file:sf?.file??null,status:sf?.status??"NO_FRAME",anchors:sf?.anchors??null},
    handoff_overlay:handoff,
    validation_tests:manifest.validation_tests
  },null,2);
}
$("next").onclick=()=>{frame++;render()}; $("prev").onclick=()=>{frame=Math.max(0,frame-1);render()};
$("play").onclick=()=>{if(timer){clearInterval(timer);timer=null;$("play").textContent="▶ Play"}else{timer=setInterval(()=>{frame++;render()},140);$("play").textContent="⏸ Pause"}};
$("handoff").onclick=()=>{handoff=!handoff;render()};
["npcState","shopState","waitReason","reaction","prepFoodVariant","productType","anchors"].forEach(id=>$(id).onchange=()=>{frame=0;render()});
loadManifest().catch(e=>{$("debug").textContent="MANIFEST LOAD ERROR: "+e.message;});
