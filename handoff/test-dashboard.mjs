import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const script=fs.readFileSync(new URL('../docs/office_hub/orchestrator-panel.js',import.meta.url),'utf8');
test('dashboard displays evidence as text, handles missing live files with offline snapshot',async()=>{
  const nodes=[];
  const create=()=>{const n={children:[],style:{},textContent:'',append(...children){this.children.push(...children);}};nodes.push(n);return n;};
  const main=create(),nav=create();let refresh;
  const fallback={queue:{tasks:[{id:'<img src=x onerror=alert(1)>',recipient:'Antigravity',status:'Đã gửi',review_round:0}]},dryRun:{time:'2026-10-24',capabilities:{agents:{Codex:{mode:'headless'},Antigravity:{mode:'manual'}}}},log:'{"event":"dry_run","calls":0}'};
  const context={document:{createElement:create,querySelector:s=>s==='main'?main:nav},window:{OFFICE_HUB_BUNDLE:{orchestrator:fallback}},fetch:async()=>({ok:false,status:404}),setInterval:fn=>{refresh=fn;}};
  vm.runInNewContext(script,context);await new Promise(r=>setImmediate(r));
  const section=main.children[0],summary=section.children[1],output=section.children[2];
  assert.match(summary.textContent,/Antigravity: manual/);assert.match(output.textContent,/<img src=x onerror=alert\(1\)>/);
  assert.equal(Object.hasOwn(output,'innerHTML'),false);assert.match(output.textContent,/dry_run/);assert.equal(nav.children[0].href,'#orchestrator');
  await refresh();assert.match(summary.textContent,/chưa gọi model/);
});
