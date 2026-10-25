import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../docs/office_hub/app.js',import.meta.url),'utf8');
function setup(protocol='http:'){
 const records=[];let unavailable=false;
 const data={tasks:{updatedAt:'2026-10-25T10:41:00+07:00',tasks:[{id:'A-G3',status:'Done'}]},latest:{at:'2026-10-25T10:41:00+07:00',nonce:'NEW',tasks:{'A-G3':'Done'},reports:{},markdown:{antigravity:'new UI',codex:'new backend'},tests:{valid:true,passed:18,total:18}},evidence:{items:[]},antigravity:'legacy UI',codex:'legacy backend'};
 const bundle={tasks:{tasks:[{id:'A-G3',status:'Todo'}]},reports:{codex:'old offline'},latest:null};
 const keys={'tasks.json':'tasks','latest.json':'latest','evidence.json':'evidence','reports/ANTIGRAVITY_UI_REPORT.md':'antigravity','reports/CODEX_BACKEND_REPORT.md':'codex'};
 const context={document:{querySelector:()=>null,querySelectorAll:()=>[]},window:{OFFICE_HUB_BUNDLE:bundle},location:{protocol},console:{warn(){},log(){}},setTimeout,clearTimeout,fetch:async url=>({ok:!unavailable,status:unavailable?503:200,json:async()=>structuredClone(data[keys[url]]),text:async()=>data[keys[url]]})};
 const injected=source.replace('  boot();',`  renderKanban=()=>{};renderQALab=()=>{};updateDynamicMetrics=()=>{};updateSyncTicker=()=>{};showToast=()=>{};renderReports=(a,c)=>window.record(a,c);window.testHooks={state,loadAll,refreshData,pollTasks};`);
 context.window.record=(a,c)=>records.push([a,c]);vm.runInNewContext(injected,context);
 return {hooks:context.window.testHooks,data,records,offline:()=>{unavailable=true;}};
}
test('live refresh never rolls back Done to stale bundled Todo on network failure',async()=>{
 const t=setup();await t.hooks.refreshData(true);assert.equal(t.hooks.state.tasks.tasks[0].status,'Done');t.offline();await t.hooks.refreshData(true);assert.equal(t.hooks.state.tasks.tasks[0].status,'Done');assert.equal(t.hooks.state.latest.nonce,'NEW');
});
test('five-second poll refreshes reports even when tasks are unchanged, without rerendering unchanged content',async()=>{
 const t=setup();await t.hooks.pollTasks();const n=t.records.length;await t.hooks.pollTasks();assert.equal(t.records.length,n);t.data.latest.markdown.codex='report updated without task change';await t.hooks.pollTasks();assert.equal(t.records.at(-1)[1],'report updated without task change');
});
test('older response cannot overwrite newer accepted package',async()=>{
 const t=setup();await t.hooks.refreshData(true);t.data.latest.at='2026-10-24T10:41:00+07:00';t.data.latest.nonce='OLD';await t.hooks.refreshData(true);assert.equal(t.hooks.state.latest.nonce,'NEW');
});
test('file protocol retains explicitly offline bundle support',async()=>{
 const t=setup('file:');const r=await t.hooks.loadAll();assert.equal(r.data.tasks.tasks[0].status,'Todo');assert.ok(r.usedBundle>0);
});

test('poll reads changed report file without rebuilding manifest or changing tasks',async()=>{
 const t=setup();t.data.latest.reports.codex='reports/CODEX_BACKEND_REPORT.md';await t.hooks.pollTasks();assert.equal(t.records.at(-1)[1],'legacy backend');t.data.codex='updated live report body';await t.hooks.pollTasks();assert.equal(t.records.at(-1)[1],'updated live report body');
});
