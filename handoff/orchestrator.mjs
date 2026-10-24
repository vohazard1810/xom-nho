#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {git,validateQueue,canCall,reviewDecision,committedAcks,checkCompletion,sha256} from './evidence.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const stamp = () => new Date().toISOString();
const read = p => JSON.parse(fs.readFileSync(p,'utf8'));
const exists = p => fs.existsSync(p);
export function atomic(file,data) {
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp,JSON.stringify(data,null,2)+'\n'); fs.renameSync(tmp,file);
}
export function resolveCommand(name) {
  if (path.isAbsolute(name)) return exists(name)?name:null;
  const r=spawnSync(process.platform==='win32'?'where.exe':'which',[process.platform==='win32'&&!name.endsWith('.exe')?`${name}.exe`:name],{encoding:'utf8',windowsHide:true});
  const found=r.status===0?r.stdout.trim().split(/\r?\n/)[0]:null;
  if(found)return found;
  if(name==='agy') {
    for(const candidate of [path.join(os.homedir(),'.local','bin',process.platform==='win32'?'agy.exe':'agy'),path.join(os.homedir(),'AppData','Local','Programs','Antigravity CLI','agy.exe')])if(exists(candidate))return candidate;
  }
  return null;
}
export function doctor(config) {
  const result={time:stamp(),agents:{}};
  for(const [name,a]of Object.entries(config.agents)) {
    const command=resolveCommand(a.command);
    const probe=command?spawnSync(command,[...(name==='Codex'?['exec']:[]),'--help'],{encoding:'utf8',windowsHide:true,timeout:10000}):null;
    const help=(probe?.stdout||'')+(probe?.stderr||'');
    const headless=probe?.status===0&&(name==='Codex'?/non-interactively/i.test(help):/--input-format\b/.test(help)&&/--output-format\b/.test(help));
    result.agents[name]={command,headless:Boolean(headless),mode:headless?'headless':'manual',models:a.models,authentication:'not tested (dry-run never calls a model)',reason:!command?'CLI executable not found':!headless?'Help did not establish a supported headless contract':'Headless flags found; authentication not yet verified'};
  }
  const internal=path.join(os.homedir(),'AppData','Local','Programs','antigravity','resources','bin','language_server.exe');
  if(exists(internal)) {
    const p=spawnSync(internal,['agentapi','--help'],{encoding:'utf8',windowsHide:true,timeout:10000});
    result.antigravityInternal={path:internal,help:(p.stdout||p.stderr||'').slice(0,3000),supportedAdapter:false,reason:'Conversation messaging is not a verified synchronous workspace execution protocol; not used automatically.'};
  }
  return result;
}
export class Orchestrator {
  constructor(root,options={}) {
    this.root=path.resolve(root);this.dir=path.join(this.root,'handoff');this.options=options;
    this.config=read(path.join(this.dir,'config.json'));this.queue=read(path.join(this.dir,'queue.json'));
    validateQueue(this.queue,this.config);this.runtime=path.join(this.dir,'.runtime');this.lock=null;
  }
  log(event,data={}) {
    const row={time:stamp(),event,...data};fs.appendFileSync(path.join(this.dir,'orchestrator.log'),JSON.stringify(row)+'\n');return row;
  }
  logs() {
    const p=path.join(this.dir,'orchestrator.log');
    // Fail closed on a corrupt ledger: never reset the hourly budget silently.
    return exists(p)?fs.readFileSync(p,'utf8').split(/\r?\n/).filter(Boolean).map(l=>JSON.parse(l)):[];
  }
  stopped(){return exists(path.join(this.root,'STOP'))||exists(path.join(this.dir,'STOP'));}
  acquire() {
    fs.mkdirSync(this.runtime,{recursive:true});this.lock=path.join(this.runtime,'orchestrator.lock');
    fs.writeFileSync(this.lock,JSON.stringify({pid:process.pid,time:stamp()}),{flag:'wx'});
  }
  release(){if(this.lock){fs.unlinkSync(this.lock);this.lock=null;}}
  assertController() {
    const branch=git(this.root,'branch','--show-current');
    if(!branch||['main','master',...Object.values(this.config.agents).map(a=>a.branch)].includes(branch))throw Error('Controller must use its own non-main, non-worker branch');
  }
  assertQueueEvidence() {
    if(JSON.stringify(this.queue)!==JSON.stringify(JSON.parse(git(this.root,'show','HEAD:handoff/queue.json'))))throw Error('Commit queue edits on the controller before execution');
    for(const task of this.queue.tasks) {
      if(task.status==='Đã gửi'&&task.review_round===0)continue;
      const last=task.history?.at(-1);
      if(last?.to!==task.status||!last.evidence?.commit)throw Error(`${task.id}: status has no evidence history`);
      git(this.root,'cat-file','-e',`${last.evidence.commit}^{commit}`);
      if(last.evidence.file)git(this.root,'cat-file','-e',`${last.evidence.commit}:${last.evidence.file}`);
    }
  }
  commit(files,message) {
    this.assertController();
    // Refuse unrelated staged files rather than accidentally committing somebody else's work.
    const staged=git(this.root,'diff','--cached','--name-only');if(staged)throw Error('Controller index is not empty');
    git(this.root,'add','--',...files);
    if(git(this.root,'diff','--cached','--name-only'))git(this.root,'commit','-m',message);
    return git(this.root,'rev-parse','HEAD');
  }
  save(message) {
    validateQueue(this.queue,this.config);atomic(path.join(this.dir,'queue.json'),this.queue);
    return this.commit(['handoff/queue.json','handoff/orchestrator.log'],message);
  }
  proof(kind,data) {
    const file=`handoff/evidence/${Date.now()}-${process.pid}-${kind}-${Math.random().toString(16).slice(2,8)}.json`;
    atomic(path.join(this.root,file),{time:stamp(),kind,...data});
    const commit=this.commit([file,'handoff/orchestrator.log'],`handoff: record ${kind} evidence`);
    return {commit,file,kind};
  }
  transition(task,status,evidence) {
    if(!evidence?.commit)throw Error('Transition requires committed evidence');
    git(this.root,'cat-file','-e',`${evidence.commit}^{commit}`);
    const from=task.status;task.status=status;task.updatedAt=stamp();
    (task.history??=[]).push({time:task.updatedAt,from,to:status,evidence});
    this.log('transition',{task:task.id,from,to:status,evidence});this.save(`handoff: ${task.id} ${status}`);
  }
  importOffice(dry=false) {
    if(!dry&&git(this.root,'diff','HEAD','--','docs/office_hub/tasks.json'))throw Error('Office tasks must be committed before import');
    const office=read(path.join(this.root,'docs/office_hub/tasks.json'));
    const added=[];
    for(const t of office.tasks.filter(t=>t.status==='Todo'&&this.config.agents[t.owner])) {
      const id=`office-${t.id}`;if(this.queue.tasks.some(q=>q.id===id))continue;
      const task={id,recipient:t.owner,status:'Đã gửi',review_round:0,attempt:1,kind:'edit',prompt:`${t.title}\n${t.notes||''}\nRead AGENTS.md and ${t.report||'docs/office_hub/reports/CODEX_BACKEND_REPORT.md'}. Keep ownership boundaries.`,tests:['game'],allowedPaths:t.owner==='Antigravity'?['game/main.mjs','game/style.css','assets/','docs/']:['game/','docs/'],source:{path:'docs/office_hub/tasks.json',task:t.id,commit:git(this.root,'rev-parse','HEAD')}};
      this.queue.tasks.push(task);added.push(id);
    }
    if(!dry&&added.length){this.log('enqueued',{tasks:added,source:'committed Office Hub Todo tasks'});this.save('handoff: enqueue Office Hub tasks');}
    return added;
  }
  worktree(name) {
    const branch=this.config.agents[name].branch;
    const work=path.join(this.runtime,'worktrees',name.toLowerCase());
    const registrations=git(this.root,'worktree','list','--porcelain');
    if(!exists(work)) {
      if(registrations.includes(`branch refs/heads/${branch}\n`))throw Error(`${branch} is checked out elsewhere`);
      let present=true;try{git(this.root,'rev-parse','--verify',`refs/heads/${branch}`);}catch{present=false;}
      fs.mkdirSync(path.dirname(work),{recursive:true});
      if(present)git(this.root,'worktree','add',work,branch);
      else git(this.root,'worktree','add','-b',branch,work,this.config.baseRef);
    }
    if(git(work,'branch','--show-current')!==branch)throw Error('Unexpected worker branch');
    return work;
  }
  prompt(task,work) {
    return `Read AGENTS.md. Task ${task.id}, attempt ${task.attempt}, recipient ${task.recipient}.
Workspace: ${work}\nBranch: ${this.config.agents[task.recipient].branch}\nBase commit: ${task.base_commit}
Task: ${task.prompt}
Allowed product paths: ${task.allowedPaths.join(', ')}. Never change handoff controller/config/queue/tests.
Do not push, merge main, change branch, or launch another agent. Check STOP in controller ${this.root} before work and between steps.
ACK protocol: append a single JSON line to handoff/ACK.md for each event. Fields task_id=${task.id}, attempt=${task.attempt}, actor=${task.recipient}, base_commit=${task.base_commit}.
First event received; commit it. Next event started; commit it before editing. Then implement, run tests, commit product changes.
Finally append event completed with result_commit=the full implementation commit SHA; commit ACK separately. Do not change product after result_commit.
An ACK or PASS claim alone cannot complete the task. The orchestrator runs tests and Codex reviews the exact SHA.
Review feedback: ${task.feedback||'none'}
`;
  }
  async runProcess(command,args,{cwd,input='',modelCall=false,task,phase,model,outputFile}={}) {
    if(this.stopped())throw Error('STOP present');
    if(modelCall&&!canCall(this.logs(),Date.now(),this.config.maxCallsPerHour))return {deferred:'hourly limit'};
    const id=`${task?.id||'test'}-${phase}-${Date.now()}`;
    const start=this.log(modelCall?'call_started':'test_started',{id,task:task?.id,attempt:task?.attempt,phase,command,args,model});
    if(modelCall)this.commit(['handoff/orchestrator.log'],'handoff: reserve hourly call slot');
    fs.mkdirSync(this.runtime,{recursive:true});
    const transcript=path.join(this.runtime,`${id}.log`);const fd=fs.openSync(transcript,'w');
    let reason=null;
    const result=await new Promise(resolve=>{
      const child=spawn(command,args,{cwd,windowsHide:true,shell:false,detached:process.platform!=='win32',stdio:['pipe','pipe','pipe']});
      const terminate=()=>{
        if(child.pid&&process.platform==='win32')spawnSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
        else if(child.pid){try{process.kill(-child.pid,'SIGKILL');}catch{child.kill('SIGKILL');}}
      };
      const timer=setInterval(()=>{if(this.stopped()||Date.now()-Date.parse(start.time)>this.config.callTimeoutSeconds*1000){reason=this.stopped()?'STOP':'timeout';terminate();}},500);
      child.stdout.on('data',b=>fs.writeSync(fd,b));child.stderr.on('data',b=>fs.writeSync(fd,b));
      child.on('error',e=>{reason=e.message;});child.on('close',code=>{clearInterval(timer);resolve({exitCode:code,reason});});
      child.stdin.on('error',()=>{});child.stdin.end(input);
    });
    fs.closeSync(fd);
    this.log(modelCall?'call_finished':'test_finished',{id,task:task?.id,phase,...result,transcript,transcript_hash:sha256(fs.readFileSync(transcript))});
    return {...result,id,transcript,output_tail:fs.readFileSync(transcript,'utf8').slice(-20000),output:outputFile&&exists(outputFile)?fs.readFileSync(outputFile,'utf8'):null};
  }
  async execute(task,work,cap) {
    const tier=task.kind==='read'?'Light':'Medium',model=this.config.agents[task.recipient].models[tier];
    if(!model)throw Error(`${task.recipient} ${tier} model must be configured explicitly`);
    const prompt=this.prompt(task,work);
    const args=task.recipient==='Codex'?['exec','--json','--sandbox','workspace-write','--model',model,'-c',`model_reasoning_effort="${tier==='Light'?'low':'medium'}"`,'-C',work,'-']:['--input-format','stream-json','--output-format','stream-json','--model',model];
    const input=task.recipient==='Codex'?prompt:JSON.stringify({event:'user',message:{content:prompt}})+'\n';
    return this.runProcess(cap.command,args,{cwd:work,input,modelCall:true,task,phase:'work',model});
  }
  async tests(task,work,completion) {
    if(git(work,'status','--porcelain'))throw Error('Worker must be clean before verification');
    const results=[];
    for(const id of task.tests) {
      const [cmd,...parts]=this.config.tests[id];
      // Run the controller's trusted runner against the worker CWD. No task-supplied shell.
      const args=parts.map(p=>p.startsWith('handoff/')?path.join(this.root,p):p);
      const r=await this.runProcess(cmd==='node'?process.execPath:cmd,args,{cwd:work,task,phase:`test-${id}`});
      results.push({suite:id,...r});
      if(r.exitCode!==0)break;
    }
    const clean=!git(work,'status','--porcelain');
    const unchanged=git(work,'rev-parse','HEAD')===completion.ack_commit;
    const passed=results.length===task.tests.length&&results.every(r=>r.exitCode===0)&&clean&&unchanged;
    return {passed,evidence:this.proof('tests',{task:task.id,attempt:task.attempt,...completion,clean,unchanged,results})};
  }
  async review(task,completion,cap) {
    if(!cap.headless){this.log('review_waiting',{task:task.id,reason:'Codex CLI unavailable'});return;}
    const work=this.worktree('Codex');if(git(work,'status','--porcelain'))throw Error('Codex review worktree is dirty');
    const worker=this.worktree(task.recipient);
    const unchanged=()=>git(worker,'rev-parse','HEAD')===completion.ack_commit&&!git(worker,'status','--porcelain');
    if(!unchanged()){this.transition(task,'Blocked',this.proof('stale-result',{task:task.id,completion}));return;}
    const round=task.review_round+1;if(round>3)throw Error('Review limit reached');
    const output=path.join(this.runtime,`${task.id}-review-${round}.json`);if(exists(output))fs.unlinkSync(output);
    const model=this.config.agents.Codex.models.Light;
    const prompt=`Read AGENTS.md. Review task ${task.id}, round ${round}/3. Do not edit files or run other agents.
Requested change: ${task.prompt}\nReview feedback: ${task.feedback||'none'}
Inspect git diff ${task.base_commit} ${completion.result_commit}; inspect exact files with git show SHA:path. Your checkout is a separate Codex branch; do not review its working copy as if it were the result.
Verified test receipt: ${JSON.stringify(task.verification)}. Verify the receipt via git show ${task.verification.commit}:${task.verification.file}.
Conclude with ONLY JSON {"verdict":"PASS" or "FAIL","reviewed_commit":"${completion.result_commit}","findings":["specific finding"]}. Pass only if requirements and ownership are met. Round 3 is final; do not request a fourth round.`;
    const call=await this.runProcess(cap.command,['exec','--sandbox','read-only','--model',model,'-c','model_reasoning_effort="low"','-C',work,'--output-last-message',output,'-'],{cwd:work,input:prompt,modelCall:true,task,phase:`review-${round}`,model,outputFile:output});
    if(call.deferred)return;
    let verdict;try{verdict=JSON.parse(call.output);}catch{}
    if(call.exitCode!==0||!verdict||!['PASS','FAIL'].includes(verdict.verdict)||verdict.reviewed_commit!==completion.result_commit||!Array.isArray(verdict.findings)||!unchanged()) {
      const proof=this.proof('review-error',{task:task.id,round,call});this.transition(task,'Blocked',proof);return;
    }
    const proof=this.proof('review',{task:task.id,round,call,verdict});task.review_round=round;
    const status=reviewDecision(round,verdict.verdict);
    if(status==='Đã gửi'){task.attempt++;task.feedback=verdict.findings.join('\n');task.base_commit=completion.ack_commit;delete task.dispatched;delete task.verification;delete task.completion;}
    this.transition(task,status,proof);
  }
  async reconcile(task,work,caps) {
    const head=git(work,'rev-parse','HEAD');const acks=committedAcks(this.root,task,head);
    for(const [event,status]of [['received','Đã nhận'],['started','Đang làm']]) {
      if(acks.some(e=>e.event===event)&&['Đã gửi','Đã nhận'].indexOf(task.status)>=0) {
        if(event==='started'&&!acks.some(e=>e.event==='received'))break;
        if(task.status!==status)this.transition(task,status,{kind:`ack-${event}`,commit:head});
      }
    }
    if(task.status==='Chờ duyệt'&&task.completion){await this.review(task,task.completion,caps.agents.Codex);return;}
    if(!acks.some(e=>e.event==='completed'))return;
    let completion;
    try{completion=checkCompletion(this.root,task,head,acks);}catch(e){const proof=this.proof('invalid-evidence',{task:task.id,message:e.message,head});this.transition(task,'Blocked',proof);return;}
    const checked=await this.tests(task,work,completion);task.verification=checked.evidence;task.completion=completion;
    this.transition(task,checked.passed?'Chờ duyệt':'Blocked',checked.evidence);
    if(checked.passed)await this.review(task,completion,caps.agents.Codex);
  }
  async tick(caps) {
    if(this.stopped()){this.log('stopped');return;}
    if(this.config.fetch)for(const a of Object.values(this.config.agents))git(this.root,'fetch',this.config.remote,`refs/heads/${a.branch}:refs/remotes/${this.config.remote}/${a.branch}`);
    // One outstanding task per recipient; a human/manual task cannot be overwritten by the next one.
    for(const recipient of Object.keys(this.config.agents)) {
      const task=this.queue.tasks.find(t=>t.recipient===recipient&&!['Done','Blocked'].includes(t.status));if(!task)continue;
      const work=this.worktree(recipient),cap=caps.agents[recipient];
      if(this.config.fetch){if(git(work,'status','--porcelain'))throw Error('Cannot sync a dirty worker');git(work,'merge','--ff-only',`${this.config.remote}/${this.config.agents[recipient].branch}`);}
      if(!task.dispatched) {
        if(git(work,'status','--porcelain'))throw Error('Worker has uncommitted changes');
        task.base_commit=git(work,'rev-parse','HEAD');task.dispatched=true;
        const file=`handoff/outbox/${task.id}.md`;fs.mkdirSync(path.dirname(path.join(this.root,file)),{recursive:true});fs.writeFileSync(path.join(this.root,file),this.prompt(task,work));
        this.log(cap.headless?'dispatch_planned':'manual_handoff',{task:task.id,recipient,worktree:work,branch:this.config.agents[recipient].branch,outbox:file});
        this.commit([file,'handoff/orchestrator.log'],`handoff: prepare ${task.id}`);this.save(`handoff: record ${task.id} baseline`);
      }
      await this.reconcile(task,work,caps);
      if(['Done','Blocked','Chờ duyệt'].includes(task.status)||!cap.headless)continue;
      const started=this.logs().findLast(l=>l.event==='call_started'&&l.task===task.id&&l.phase==='work'&&l.attempt===task.attempt);
      // Dispatch receipt is persisted before invocation; recovery never silently repeats a paid call.
      if(task.calledAttempt===task.attempt||started){
        // A previous invocation may have crashed before recording a final receipt.
        // Never launch it again blindly; make the interruption reviewable in Git.
        this.transition(task,'Blocked',this.proof('interrupted-call',{task:task.id,attempt:task.attempt,reason:'Reserved attempt has no complete ACK chain; inspect logs and worktree before a new task'}));continue;
      }
      if(!canCall(this.logs(),Date.now(),this.config.maxCallsPerHour)){this.log('rate_limited',{task:task.id});continue;}
      if(!this.config.agents[recipient].models[task.kind==='read'?'Light':'Medium']){this.log('configuration_required',{task:task.id,reason:'Set explicit model for this tier'});continue;}
      task.calledAttempt=task.attempt;this.save(`handoff: reserve ${task.id} attempt ${task.attempt}`);
      const call=await this.execute(task,work,cap);
      if(call.deferred)continue;
      const proof=this.proof('worker-call',{task:task.id,attempt:task.attempt,call});
      if(call.exitCode!==0){this.transition(task,'Blocked',proof);continue;}
      await this.reconcile(task,work,caps);
      if(['Đã gửi','Đã nhận','Đang làm'].includes(task.status)){this.transition(task,'Blocked',this.proof('missing-evidence',{task:task.id,attempt:task.attempt,call,reason:'CLI exited without a complete committed ACK chain'}));}
    }
  }
  dryRun(caps) {
    const plans=this.queue.tasks.filter(t=>!['Done','Blocked'].includes(t.status)).map(t=>({task:t.id,recipient:t.recipient,status:t.status,mode:caps.agents[t.recipient].mode,tier:t.kind==='read'?'Light':'Medium',model:this.config.agents[t.recipient].models[t.kind==='read'?'Light':'Medium'],branch:this.config.agents[t.recipient].branch,tests:t.tests,reviewer:'Codex / Light',maxReviewRounds:3,invokesModel:false}));
    const report={time:stamp(),dryRun:true,stopped:this.stopped(),calls:0,queueWritten:false,worktreesCreated:false,capabilities:caps,plans};
    this.log('dry_run',{tasks:plans.map(p=>p.task),calls:0});atomic(path.join(this.dir,'dry-run.json'),report);return report;
  }
}

async function main() {
  const args=process.argv.slice(2),rootArg=args.indexOf('--repo');
  const root=rootArg<0?path.dirname(here):path.resolve(args[rootArg+1]);
  const allowed=new Set(['--repo','--doctor','--dry-run','--once','--watch','--import-office']);
  for(let i=0;i<args.length;i++){if(args[i]==='--repo'){i++;continue;}if(!allowed.has(args[i]))throw Error(`Unknown option ${args[i]}`);}
  const app=new Orchestrator(root),caps=doctor(app.config);
  for(const [agent,cap]of Object.entries(caps.agents))app.log('cli_probe',{agent,command:cap.command,headless:cap.headless,mode:cap.mode,modelCall:false});
  if(caps.antigravityInternal)app.log('cli_probe',{agent:'Antigravity agentapi',command:caps.antigravityInternal.path,mode:'unsupported',modelCall:false});
  if(args.includes('--doctor')){console.log(JSON.stringify(caps,null,2));return;}
  if(args.includes('--dry-run')){if(args.includes('--import-office'))app.importOffice(true);console.log(JSON.stringify(app.dryRun(caps),null,2));return;}
  if(!args.includes('--once')&&!args.includes('--watch'))throw Error('Choose --dry-run, --doctor, --once or --watch');
  app.assertController();app.acquire();
  try {
    if(app.stopped()){app.log('stopped');return;}
    if(args.includes('--import-office'))app.importOffice();
    do {
      // Reload only between ticks. Validate before using any repo-supplied task.
      app.queue=read(path.join(app.dir,'queue.json'));validateQueue(app.queue,app.config);app.assertQueueEvidence();
      await app.tick(caps);
      if(!args.includes('--watch')||app.stopped())break;
      await new Promise(r=>setTimeout(r,Math.min(app.config.pollSeconds*1000,60000)));
    }while(true);
  }finally{app.release();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
