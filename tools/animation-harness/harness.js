const $=id=>document.getElementById(id);
let manifest=null, frame=0, timer=null, handoff=false, orderCandidate=null, candidateError=null;
const CANDIDATE_METADATA="../../assets/characters/named/be_ti/candidates/alternate_model_v1/order_four_frame_pilot/actor_crop/order_actor_crop_metadata.json";
const PREVIEW_INTERVAL_MS=140; // Existing harness cadence, not approved runtime timing.

async function loadManifest(){
  const res=await fetch("./manifest.json",{cache:"no-store"});
  if(!res.ok) throw new Error("manifest.json HTTP "+res.status);
  manifest=await res.json();
  if(manifest.gate_status==="PASS") console.warn("PASS must be backed by all three validation tests.");
  populate();
  render();
  if(new URLSearchParams(location.search).get("orderCandidate")==="1"){
    $("orderCandidate").checked=true;
    await $("orderCandidate").onchange();
  }
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
  if(character==="be_ti" && state==="ORDER" && $("orderCandidate").checked && orderCandidate){
    return orderCandidate.frames.map(f=>({index:f.index,file:f.file,anchors:f.anchors,
      crop_origin:f.crop_origin,crop_size:f.crop_size,status:f.status}));
  }
  const spec=manifest.characters[character].states[state];
  if(spec.frames) return spec.frames;
  const variant=character==="be_ti" && state==="QUEUE_WAIT" ? $("waitReason").value :
    character==="be_ti" && state==="REACT" ? $("reaction").value :
    character==="shopkeeper" && state==="PREPARE_FOOD" ? $("prepFoodVariant").value :
    character==="shopkeeper" && state==="PREPARE_DRINK" ? "tra_tac" : null;
  return variant && spec.frames_by_variant ? (spec.frames_by_variant[variant]||[]) : [];
}
function currentFrame(frames,loop){ return frames.length ? frames[loop ? frame%frames.length : Math.min(frame,frames.length-1)] : null; }
function renderActor(el,frameData,fallback){
  el.innerHTML="";
  const crop=frameData?.crop_origin, size=frameData?.crop_size;
  el.classList.toggle("candidate",Boolean(crop && size));
  if(crop && size){
    el.style.left=(crop.x/manifest.canvas.width*100)+"%";
    el.style.top=(crop.y/manifest.canvas.height*100)+"%";
    el.style.width=(size[0]/manifest.canvas.width*100)+"%";
    el.style.height=(size[1]/manifest.canvas.height*100)+"%";
  }else{
    for(const key of ["left","top","width","height"])el.style.removeProperty(key);
  }
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
  const npcState=$("npcState").value,shopState=$("shopState").value;
  const nf=currentFrame(selectedFrames("be_ti",npcState),manifest.characters.be_ti.states[npcState].loop);
  const sf=currentFrame(selectedFrames("shopkeeper",shopState),manifest.characters.shopkeeper.states[shopState].loop);
  renderActor($("npc"),nf,"👦"); renderActor($("shop"),sf,"🧑‍🍳");
  placeAnchor($("npcFeet"),anchorPoint(nf,"feet"));
  placeAnchor($("npcHead"),anchorPoint(nf,"head"));
  placeAnchor($("npcHand"),anchorPoint(nf,"hand_right"));
  const receive=anchorPoint(nf,"receive_point");
  const hand=anchorPoint(sf,"hand_right");
  placeAnchor($("npcReceive"),receive); placeAnchor($("shopHand"),hand);
  $("product").textContent=$("productType").value;
  const p=handoff ? receive : hand;
  if(p){$("product").hidden=false;$("product").style.left=(p.x/manifest.canvas.width*100)+"%";$("product").style.top=(p.y/manifest.canvas.height*100)+"%"} else $("product").hidden=true;
  $("debug").textContent=JSON.stringify({
    gate_status:manifest.gate_status,
    candidate_mode:$("orderCandidate").checked ? (candidateError || orderCandidate?.status || "LOADING") : (candidateError || "OFF"),
    playback: {loop:manifest.characters.be_ti.states[npcState].loop,preview_interval_ms:PREVIEW_INTERVAL_MS,
      note:"Harness preview cadence only; no game timing approval"},
    npc:{state:$("npcState").value,frame:nf?.index??null,file:nf?.file??null,status:nf?.status??"NO_FRAME",anchors:nf?.anchors??null},
    shopkeeper:{state:$("shopState").value,frame:sf?.index??null,file:sf?.file??null,status:sf?.status??"NO_FRAME",anchors:sf?.anchors??null},
    handoff_overlay:handoff,
    validation_tests:manifest.validation_tests
  },null,2);
}
function stopPlayback(){if(timer)clearInterval(timer);timer=null;$("play").textContent="▶ Play"}
function npcPlayback(){const state=$("npcState").value;return {frames:selectedFrames("be_ti",state),loop:manifest.characters.be_ti.states[state].loop}}
$("next").onclick=()=>{const {frames,loop}=npcPlayback();frame=loop?frame+1:Math.min(frame+1,Math.max(0,frames.length-1));render()};
$("prev").onclick=()=>{frame=Math.max(0,frame-1);render()};
$("play").onclick=()=>{
  if(timer){stopPlayback();return}
  const {frames,loop}=npcPlayback();if(!frames.length)return;
  if(!loop && frame>=frames.length-1)frame=0;
  render();$("play").textContent="⏸ Pause";
  timer=setInterval(()=>{
    if(!loop && frame>=frames.length-1){stopPlayback();return}
    frame++;render();
    if(!loop && frame>=frames.length-1)stopPlayback();
  },PREVIEW_INTERVAL_MS);
};
$("handoff").onclick=()=>{handoff=!handoff;render()};
["npcState","shopState","waitReason","reaction","prepFoodVariant","productType","anchors"].forEach(id=>$(id).onchange=()=>{stopPlayback();frame=0;render()});
$("orderCandidate").onchange=async()=>{
  stopPlayback();frame=0;
  if($("orderCandidate").checked){
    $("npcState").value="ORDER";
    if(!orderCandidate){
      try{
        const response=await fetch(CANDIDATE_METADATA,{cache:"no-store"});
        if(!response.ok)throw new Error("HTTP "+response.status);
        const data=await response.json();
        if(data.stage_canvas[0]!==manifest.canvas.width || data.stage_canvas[1]!==manifest.canvas.height ||
          data.frames.length!==4 || data.loop!==false || data.comparison.stage_reconstruction_changed_pixels_total!==0 ||
          data.comparison.anchor_coordinate_delta_px!==0)throw new Error("candidate metadata contract mismatch");
        await Promise.all(data.frames.map(f=>new Promise((resolve,reject)=>{
          const img=new Image();img.onload=resolve;img.onerror=()=>reject(new Error("image load "+f.file));img.src="../../"+f.file;
        })));
        orderCandidate=data;candidateError=null;
      }catch(error){candidateError=String(error);$("orderCandidate").checked=false}
    }
  }
  render();
};
loadManifest().catch(e=>{$("debug").textContent="MANIFEST LOAD ERROR: "+e.message;});
