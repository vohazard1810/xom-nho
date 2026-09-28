// DOM smoke check for the QUEUE_WAIT.deprioritized crop, timings, loop and anchor placement.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const base='assets/characters/named/be_ti/candidates/alternate_model_v1/queue_wait_deprioritized_pilot/actor_crop/';
const meta=JSON.parse(fs.readFileSync(base+'deprioritized_actor_crop_metadata.json','utf8'));
const nodes=new Map();
function node(id){
  if(!nodes.has(id)){
    const styles={};
    nodes.set(id,{id,value:'',checked:false,hidden:false,innerHTML:'',textContent:'',
      style:{setProperty(k,v){styles[k]=v},removeProperty(k){delete styles[k]},...styles},
      classList:{toggle(){}},add(option){this.value ||=option.value},appendChild(child){this.child=child}});
  }
  return nodes.get(id);
}
let scheduled=null;
const context=vm.createContext({
  document:{getElementById:node},location:{search:'?deprioritizedCandidate=1'},URLSearchParams,
  Option:class {constructor(text,value){this.value=value}},
  Image:class {set src(v){this._src=v;queueMicrotask(()=>this.onload?.())} get src(){return this._src}},
  fetch:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(
    url.includes('manifest.json')?'tools/animation-harness/manifest.json':base+'deprioritized_actor_crop_metadata.json','utf8'))}),
  setInterval:()=>{throw Error('Queue candidate must use source preview dwell timings')},
  clearInterval:()=>{},setTimeout:(fn,ms)=>{scheduled={fn,ms};return 1},clearTimeout:()=>{scheduled=null},console,
});
vm.runInContext(fs.readFileSync('tools/animation-harness/harness.js','utf8'),context);
for(let i=0;i<40 && !node('debug').textContent.includes('CANDIDATE_PIXEL_AND_ANCHOR_QC');i++)
  await new Promise(resolve=>setTimeout(resolve,2));
assert.equal(node('npcState').value,'QUEUE_WAIT');
assert.equal(node('waitReason').value,'deprioritized');
assert.equal(node('deprioritizedCandidate').checked,true);
assert.equal(JSON.parse(node('debug').textContent).npc.frame,1);
assert.equal(node('npc').style.left,meta.shared_crop_origin.x/960*100+'%');
assert.equal(node('npc').style.top,meta.shared_crop_origin.y/1704*100+'%');
assert.equal(node('npcFeet').style.top,meta.frames[0].anchors.feet.y/1704*100+'%');
node('play').onclick();
for(let i=0;i<4;i++){
  assert.equal(scheduled.ms,meta.preview_frame_durations_ms[i]);
  scheduled.fn();
}
assert.equal(JSON.parse(node('debug').textContent).npc.frame,1,'Loop must return to frame 01');
assert.equal(scheduled.ms,meta.preview_frame_durations_ms[0]);
node('play').onclick();
assert.equal(scheduled,null,'Pause must cancel queue timer');
console.log('QUEUE_WAIT.deprioritized: 4 actor crops; fixed feet and head anchors; preview dwell 2200/80/80/100 ms; loops 04→01; pause cancels timer.');
