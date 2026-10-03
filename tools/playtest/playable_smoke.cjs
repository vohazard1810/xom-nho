// Targeted browser smoke. Uses the real UI and fake time, never records video.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
 const b=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']} : {})});
 const http=require('node:http'), path=require('node:path');
 const root=process.cwd();
 const server=http.createServer((req,res)=>{ const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0])); if(!file.startsWith(root+path.sep)) {res.writeHead(403).end();return;} const target=req.url.split('?')[0].endsWith('/')?file+'/index.html':file; fs.readFile(target,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'}[path.extname(target)]||'application/octet-stream'));res.end(data);});});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const errors=[],failures=[];
 const p=await b.newPage({viewport:{width:390,height:844}});
 p.on('pageerror',e=>errors.push(e.message));
 p.on('response',r=>{if(r.status()>=400) failures.push(`${r.status()} ${r.url()}`)});
 await p.clock.install();
 await p.clock.pauseAt(new Date(await p.evaluate(()=>Date.now())));
 await p.goto(process.env.XOM_GAME_URL || `http://127.0.0.1:${server.address().port}/game/`);
 await p.locator('#shop-name-input').fill('Quán Bé Mây Ở Đầu Hẻm');
 await p.locator('[data-type=SET_SHOP_NAME]').click();
 await p.locator('[data-type=NAVIGATE]').click();
 await p.locator('[data-type=BUNDLE_DAY1]').click();
 await p.locator('[data-type=BUY]').click();
 await p.locator('[data-type=START_DAY]').click();

 await p.clock.runFor(2000);
 const get=()=>p.evaluate(()=>window.__xomNho.getState());
 assert.equal((await get()).service?.phase,'SELECT');
 const initial=await get();await p.clock.runFor(8000);assert.equal((await get()).servedOrders.length,0);
 await p.locator('[data-type=ADD_INGREDIENT][data-payload=kumquat]').click();assert.deepEqual((await get()).stock,initial.stock);
 await p.locator('[data-type=ADD_INGREDIENT][data-payload=bread]').click();
 await p.reload();assert.equal((await get()).service.selected.bread,1);
 const viewports=[];
 for(const [width,height] of [[360,640],[390,700],[430,932]]) {
  await p.setViewportSize({width,height});
  const metrics=await p.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,buttons:[...document.querySelectorAll('.ingredient-button,.cook-actions button,.play-pause')].map(e=>{const r=e.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{label:e.textContent.trim(),width:r.width,height:r.height,bottom:r.bottom,reachable:hit===e||e.contains(hit)}})}));
  assert.ok(metrics.scrollWidth<=width);assert.ok(metrics.scrollHeight<=height+1,'Cooking screen must not need page scrolling');
  for(const m of metrics.buttons){assert.ok(m.width>=44&&m.height>=44,JSON.stringify(m));assert.ok(m.bottom<=height&&m.reachable,JSON.stringify(m));}
  viewports.push({width,height,controls:metrics.buttons.length});
 }
 await p.setViewportSize({width:390,height:700});
 fs.mkdirSync('docs/playable_evidence',{recursive:true});
 await p.locator('[data-type=ADD_INGREDIENT][data-payload=cha]').click();await p.locator('[data-type=ADD_INGREDIENT][data-payload=vegetable]').click();
 await p.clock.runFor(250);
 assert.equal(await p.locator('[data-type=COOK]').isEnabled(),true);
 await p.screenshot({path:'docs/playable_evidence/shop.png',animations:'disabled'});
 await p.locator('[data-type=COOK]').click();await p.clock.runFor(1800);assert.equal((await get()).service.phase,'READY');
 await p.reload();assert.equal((await get()).service.phase,'READY');
 const cash=(await get()).cash;await p.clock.runFor(3000);assert.equal((await get()).cash,cash);
 await p.locator('[data-type=SERVE]').click();await p.clock.runFor(400);assert.equal((await get()).cash,cash+25000);await p.clock.runFor(1000);
 let drinkPlayed=false, priorityPlayed=false, boostPlayed=false;
 for(let i=0;i<3000&&(await get()).screen==='SHOP';i++) {
  let state=await get();
  if(state.activeDecision){await p.locator('[data-type=DECIDE][data-payload=yes]').click();state=await get();}
  if(state.service?.phase==='SELECT') {
   if(state.activeCustomer.id==='be_ti'&&!priorityPlayed){
    await p.clock.runFor(3600);
    assert.equal((await get()).waitingQueue.length,2);
    await p.locator('[data-type=PRIORITIZE][data-payload=anh_tung]').click();
    assert.equal((await get()).prioritizedCustomerId,'anh_tung');priorityPlayed=true;
    await p.locator('[data-type=FOCUS_BOOST]').click();boostPlayed=true;
    await p.locator('[data-type=TOGGLE_PAUSE]').click();const frozen=await get();await p.clock.runFor(5000);assert.equal((await get()).clock,frozen.clock);assert.equal((await get()).focusBoost.remainingSeconds,frozen.focusBoost.remainingSeconds);
    await p.locator('[data-type=TOGGLE_PAUSE]').click();state=await get();
   }
   const needs=await p.evaluate(async()=>{const {cookingNeeds}=await import('./shift-engine.mjs');return cookingNeeds(window.__xomNho.getState())});
   for(const[id,q] of Object.entries(needs))for(let n=state.service.selected[id]||0;n<q;n++)await p.locator(`[data-type=ADD_INGREDIENT][data-payload=${id}]`).click();
   if(state.activeCustomer.recipe==='TRA_TAC'&&!drinkPlayed){await p.clock.runFor(250);await p.screenshot({path:'docs/playable_evidence/drink.png',animations:'disabled'});drinkPlayed=true;}
   await p.locator('[data-type=COOK]').click();
  }
  if((await get()).service?.phase==='READY')await p.locator('[data-type=SERVE]').click();
  await p.clock.runFor(200);
 }
 assert.equal((await get()).screen,'DAY_RESULT');
 const result=await p.evaluate(()=>({cash:window.__xomNho.getState().cash,served:window.__xomNho.getState().servedOrders.length,missed:window.__xomNho.getState().missedOrders.length}));
 assert.deepEqual(result,{cash:127000,served:6,missed:2});assert.ok(drinkPlayed);
 await p.screenshot({path:'docs/playable_evidence/result.png',animations:'disabled'});
 await p.locator('#day-ledger-details summary').click();const left=(await get()).resultRemainingMs;await p.clock.runFor(15000);assert.equal((await get()).resultRemainingMs,left);
 await p.reload();assert.equal(await p.locator('#day-ledger-details').getAttribute('open'),'');
 await p.locator('#day-ledger-details summary').click();await p.clock.runFor(left+500);assert.equal((await get()).currentDay,2);
 await p.locator('[data-type=NAVIGATE]').click();await p.locator('[data-type=SUGGEST_BASKET]').click();assert.ok(Object.values((await get()).basket).some(n=>n>0));
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 const report={status:'PASS',mode:'manual-ingredient-cook-serve',uiDay1:result,viewports,errors,failures,realReload:['SELECT','READY','DAY_RESULT'],wrongTapSafe:true,idleDoesNotServe:true,drinkPlayed,priorityPlayed,boostPlayed,resultCountdownPreserved:true,videoRecorded:false};
 fs.writeFileSync('docs/playable_evidence/browser_smoke.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 await b.close();await new Promise(resolve=>server.close(resolve));
})().catch(e=>{console.error(e);process.exit(1)});
