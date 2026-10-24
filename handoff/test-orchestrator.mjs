import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {git,validateQueue,canCall,reviewDecision,committedAcks,checkCompletion} from './evidence.mjs';
import {Orchestrator,atomic} from './orchestrator.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'xom-orchestrator-test-'));
  t.after(()=>{
    const rel=path.relative(os.tmpdir(),root);
    assert.ok(rel&&!rel.startsWith('..')&&!path.isAbsolute(rel)&&path.basename(root).startsWith('xom-orchestrator-test-'));
    fs.rmSync(root,{recursive:true,force:true});
  });
  git(root,'init','-b','controller');git(root,'config','user.email','tests@example.invalid');git(root,'config','user.name','Orchestrator test');
  fs.mkdirSync(path.join(root,'handoff'));fs.writeFileSync(path.join(root,'.gitignore'),'handoff/.runtime/\nSTOP\n');
  const config=JSON.parse(fs.readFileSync(path.join(here,'config.json')));config.baseRef='controller';config.callTimeoutSeconds=1;
  config.tests={smoke:['node','-e',"console.log('PASS actual subprocess')"]};
  const task={id:'A-test',recipient:'Antigravity',status:'Đã gửi',review_round:0,attempt:1,kind:'edit',prompt:'Change product.txt',tests:['smoke'],allowedPaths:['product.txt']};
  atomic(path.join(root,'handoff/config.json'),config);atomic(path.join(root,'handoff/queue.json'),{schemaVersion:1,tasks:[task]});
  fs.writeFileSync(path.join(root,'handoff/ACK.md'),'# ACK\n');fs.writeFileSync(path.join(root,'handoff/orchestrator.log'),'');fs.writeFileSync(path.join(root,'product.txt'),'initial');
  git(root,'add','.');git(root,'commit','-m','initial');
  return {root,app:new Orchestrator(root),task,config};
}
function ack(work,task,event,result) {
  fs.appendFileSync(path.join(work,'handoff/ACK.md'),JSON.stringify({task_id:task.id,actor:task.recipient,attempt:task.attempt,base_commit:task.base_commit,event,...(result?{result_commit:result}:{})})+'\n');
  git(work,'add','handoff/ACK.md');git(work,'commit','-m',`ACK ${event}`);
}
function implement(app,task,version='updated') {
  const work=app.worktree(task.recipient);ack(work,task,'received');ack(work,task,'started');
  fs.writeFileSync(path.join(work,'product.txt'),version);git(work,'add','product.txt');git(work,'commit','-m','implement');
  const result=git(work,'rev-parse','HEAD');ack(work,task,'completed',result);return {work,result};
}
const manual={agents:{Antigravity:{headless:false,mode:'manual'},Codex:{headless:false,mode:'manual'}}};
test('schema, branches, rate limit and final third review',()=>{
  const config=JSON.parse(fs.readFileSync(path.join(here,'config.json')));
  validateQueue({schemaVersion:1,tasks:[]},config);
  const bad=structuredClone(config);bad.agents.Codex.branch='main';assert.throws(()=>validateQueue({schemaVersion:1,tasks:[]},bad));
  const now=Date.now(),log=[{event:'call_started',time:new Date(now-100).toISOString()}];
  assert.equal(canCall(log,now,1),false);assert.equal(canCall(log,now+3600000,1),true);
  assert.equal(reviewDecision(1,'FAIL'),'Đã gửi');assert.equal(reviewDecision(2,'FAIL'),'Đã gửi');assert.equal(reviewDecision(3,'FAIL'),'Blocked');assert.equal(reviewDecision(3,'PASS'),'Done');assert.throws(()=>reviewDecision(4,'PASS'));
});
test('CLI contracts use Light for read, Medium for edits; agy gets documented JSON stdin',async()=>{
  const config=JSON.parse(fs.readFileSync(path.join(here,'config.json')));config.agents.Antigravity.models.Medium='explicit-test-model';
  const calls=[],fake={config,prompt:()=> 'Task prompt',runProcess:async(...a)=>{calls.push(a);return {exitCode:0};}};
  await Orchestrator.prototype.execute.call(fake,{recipient:'Codex',kind:'read'},'workspace',{command:'codex'});
  await Orchestrator.prototype.execute.call(fake,{recipient:'Codex',kind:'edit'},'workspace',{command:'codex'});
  await Orchestrator.prototype.execute.call(fake,{recipient:'Antigravity',kind:'edit'},'workspace',{command:'agy'});
  assert.equal(calls[0][2].model,config.agents.Codex.models.Light);assert.equal(calls[1][2].model,config.agents.Codex.models.Medium);
  assert.ok(calls[0][1].includes('workspace-write'));assert.ok(calls[2][1].includes('--input-format'));
  assert.deepEqual(JSON.parse(calls[2][2].input),{event:'user',message:{content:'Task prompt'}});
});
test('dry-run creates no worktree, calls no model and never writes queue',t=>{
  const {root,app}=fixture(t),before=fs.readFileSync(path.join(root,'handoff/queue.json'));
  const report=app.dryRun(manual);assert.equal(report.calls,0);assert.equal(report.plans[0].mode,'manual');
  assert.deepEqual(fs.readFileSync(path.join(root,'handoff/queue.json')),before);assert.equal(git(root,'worktree','list','--porcelain').split('worktree ').length-1,1);
  fs.writeFileSync(path.join(root,'STOP'),'');assert.equal(app.dryRun(manual).stopped,true);
});
test('real committed ACKs + real test subprocess gate manual delivery; no self-declared PASS',async t=>{
  const {root,app}=fixture(t);await app.tick(manual);const task=app.queue.tasks[0];assert.equal(task.status,'Đã gửi');
  const {work,result}=implement(app,task);await app.tick(manual);assert.equal(task.status,'Chờ duyệt');assert.equal(task.completion.result_commit,result);
  assert.deepEqual(task.history.map(h=>h.to),['Đã nhận','Đang làm','Chờ duyệt']);
  const receipt=JSON.parse(git(root,'show',`${task.verification.commit}:${task.verification.file}`));assert.equal(receipt.clean,true);assert.equal(receipt.results[0].exitCode,0);assert.match(receipt.results[0].output_tail,/PASS actual subprocess/);
  fs.writeFileSync(path.join(work,'product.txt'),'uncommitted tampering');
  await app.review(task,task.completion,{headless:true});assert.equal(task.status,'Blocked');
});
test('reject missing ACK, ACK-only result, and product edits after tested commit',async t=>{
  const {root,app}=fixture(t);await app.tick(manual);const task=app.queue.tasks[0],work=app.worktree(task.recipient);
  assert.throws(()=>checkCompletion(root,task,git(work,'rev-parse','HEAD'),[]),/Missing/);
  ack(work,task,'received');ack(work,task,'started');let result=git(work,'rev-parse','HEAD');ack(work,task,'completed',result);
  let head=git(work,'rev-parse','HEAD');assert.throws(()=>checkCompletion(root,task,head,committedAcks(root,task,head)),/ACK-only/);
  // A fresh attempt cannot reuse old acknowledgements.
  task.attempt=2;task.base_commit=head;assert.deepEqual(committedAcks(root,task,head),[]);
  const done=implement(app,task);fs.writeFileSync(path.join(work,'product.txt'),'hidden change');git(work,'add','product.txt');git(work,'commit','-m','after result');
  head=git(work,'rev-parse','HEAD');assert.throws(()=>checkCompletion(root,task,head,committedAcks(root,task,head)),/after result_commit/);
  assert.ok(done.result);
});
test('review loop uses exact SHA; three failures block, never round four',async t=>{
  const {root,app}=fixture(t);await app.tick(manual);const task=app.queue.tasks[0];let modelCalls=0;
  const real=app.runProcess.bind(app);
  app.runProcess=async(command,args,options)=>{
    if(!options.modelCall)return real(command,args,options);
    modelCalls++;assert.equal(options.model,app.config.agents.Codex.models.Light);
    assert.ok(args.includes('read-only'));return {exitCode:0,output:JSON.stringify({verdict:'FAIL',reviewed_commit:task.completion.result_commit,findings:['Need correction']})};
  };
  const caps={agents:{...manual.agents,Codex:{headless:true,command:'fake-not-executed',mode:'headless'}}};
  for(let round=1;round<=3;round++) {
    implement(app,task,`revision ${round}`);await app.reconcile(task,app.worktree('Antigravity'),caps);
    assert.equal(task.review_round,round);assert.equal(task.status,round===3?'Blocked':'Đã gửi');
  }
  await app.tick(caps);assert.equal(modelCalls,3);assert.equal(task.attempt,3);assert.ok(git(root,'log','--oneline').includes('review evidence'));
});
test('STOP terminates a running subprocess and returns recorded failure',async t=>{
  const {root,app}=fixture(t);setTimeout(()=>fs.writeFileSync(path.join(root,'STOP'),''),150);
  const result=await app.runProcess(process.execPath,['-e','setInterval(()=>{},1000)'],{cwd:root,phase:'stop-test'});
  assert.equal(result.reason,'STOP');assert.notEqual(result.exitCode,0);
});
test('PASS text with failing exit code blocks before reviewer is invoked',async t=>{
  const {root,app}=fixture(t);app.config.tests.smoke=['node','-e',"console.log('PASS'); process.exit(1)"];
  await app.tick(manual);const task=app.queue.tasks[0];implement(app,task);
  await app.reconcile(task,app.worktree('Antigravity'),manual);
  assert.equal(task.status,'Blocked');assert.equal(task.review_round,0);
  const receipt=JSON.parse(git(root,'show',`${task.verification.commit}:${task.verification.file}`));assert.equal(receipt.results[0].exitCode,1);
});
test('independent review PASS for the exact tested commit completes task; queue tampering rejected',async t=>{
  const {root,app}=fixture(t);await app.tick(manual);const task=app.queue.tasks[0];implement(app,task);await app.reconcile(task,app.worktree('Antigravity'),manual);
  app.runProcess=async()=>({exitCode:0,output:JSON.stringify({verdict:'PASS',reviewed_commit:task.completion.result_commit,findings:[]})});
  await app.review(task,task.completion,{headless:true,command:'not-executed'});assert.equal(task.status,'Done');app.assertQueueEvidence();
  task.status='Đang làm';atomic(path.join(root,'handoff/queue.json'),app.queue);assert.throws(()=>app.assertQueueEvidence(),/Commit queue edits/);
});
