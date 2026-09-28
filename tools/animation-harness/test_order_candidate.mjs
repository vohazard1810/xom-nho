// Minimal DOM smoke check for the candidate mode and ORDER one-shot boundary.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const base = 'assets/characters/named/be_ti/candidates/alternate_model_v1/order_four_frame_pilot/actor_crop/';
const nodes = new Map();
function node(id) {
  if (!nodes.has(id)) {
    const styles = {};
    nodes.set(id, {id, value: '', checked: false, hidden: false, innerHTML: '', textContent: '',
      style: {setProperty(k,v){styles[k]=v},removeProperty(k){delete styles[k]}, ...styles},
      classList: {toggle(){}}, add(option){this.value ||= option.value}, appendChild(child){this.child=child}});
  }
  return nodes.get(id);
}
let tick = null;
const context = vm.createContext({
  document: {getElementById: node}, location: {search: '?orderCandidate=1'},
  URLSearchParams,
  Option: class {constructor(text,value){this.value=value}},
  Image: class {set src(v){this._src=v;queueMicrotask(()=>this.onload?.())} get src(){return this._src}},
  fetch: async url => ({ok: true, json: async () => JSON.parse(fs.readFileSync(
    url.includes('manifest.json') ? 'tools/animation-harness/manifest.json' : base+'order_actor_crop_metadata.json','utf8'))}),
  setInterval: fn => {tick=fn;return 1},clearInterval:()=>{tick=null},clearTimeout:()=>{tick=null},console,
});
vm.runInContext(fs.readFileSync('tools/animation-harness/harness.js','utf8'),context);
for(let i=0;i<30 && !node('debug').textContent.includes('CANDIDATE_ACTOR_CROP_PIXEL');i++)
  await new Promise(resolve=>setTimeout(resolve,2));
assert.equal(node('npcState').value,'ORDER');
assert.equal(node('orderCandidate').checked,true);
assert.equal(JSON.parse(node('debug').textContent).npc.frame,1);
assert.equal(node('npc').style.left,(577/960*100)+'%');
assert.equal(node('npc').style.top,(954/1704*100)+'%');
node('play').onclick();
for(let i=0;i<3;i++)tick?.();
assert.equal(JSON.parse(node('debug').textContent).npc.frame,4);
assert.equal(tick,null,'One-shot must stop on frame 04');
node('next').onclick();
assert.equal(JSON.parse(node('debug').textContent).npc.frame,4,'Next must not wrap');
console.log('ORDER candidate loaded: 4 actor crops; origin=(577,954); one-shot stops at frame 04; next does not wrap.');
