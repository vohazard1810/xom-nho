import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export const STATUSES = Object.freeze(['Đã gửi','Đã nhận','Đang làm','Chờ duyệt','Done','Blocked']);
export const sha256 = s => createHash('sha256').update(s).digest('hex');
export function git(root, ...args) {
  return execFileSync('git', args, {cwd: root, encoding:'utf8', windowsHide:true, timeout:30000, stdio:['ignore','pipe','pipe']}).trim();
}
export function validateQueue(queue, config) {
  if (queue.schemaVersion !== 1 || !Array.isArray(queue.tasks)) throw Error('Invalid queue schema');
  const ids = new Set();
  for (const t of queue.tasks) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(t.id) || ids.has(t.id)) throw Error('Invalid/duplicate task id');
    ids.add(t.id);
    if (!config.agents[t.recipient] || !STATUSES.includes(t.status)) throw Error(`Invalid recipient/status: ${t.id}`);
    if (!Number.isInteger(t.review_round) || t.review_round < 0 || t.review_round > 3) throw Error('Invalid review_round');
    if (!Number.isInteger(t.attempt) || t.attempt < 1 || t.attempt > 3) throw Error('Invalid attempt');
    if (!['read','edit'].includes(t.kind) || !t.prompt?.trim()) throw Error('Missing kind/prompt');
    if (!Array.isArray(t.tests) || !t.tests.length || t.tests.some(k => !Object.hasOwn(config.tests,k))) throw Error('Unknown/missing test suite');
    if (!Array.isArray(t.allowedPaths) || !t.allowedPaths.length || t.allowedPaths.some(p => !p || p.startsWith('/') || p.includes('..') || p.includes('\\'))) throw Error('Invalid allowedPaths');
    if(t.kind==='read'&&t.allowedPaths.some(p=>!p.startsWith('docs/')))throw Error('Read tasks may only produce docs reports plus ACK');
  }
  const branches = Object.values(config.agents).map(a => a.branch);
  if (new Set(branches).size !== branches.length || branches.some(b => !/^agents\/[a-z0-9/_-]+$/.test(b))) throw Error('Agents need distinct agents/* branches');
  if (!Number.isInteger(config.maxCallsPerHour) || config.maxCallsPerHour < 1 || !Number.isFinite(config.callTimeoutSeconds) || config.callTimeoutSeconds < 1) throw Error('Invalid limits');
}
export function canCall(log, now, limit) {
  return log.filter(e => e.event === 'call_started' && now-Date.parse(e.time) >= 0 && now-Date.parse(e.time) < 3600000).length < limit;
}
export function reviewDecision(round, verdict) {
  if (!Number.isInteger(round) || round < 1 || round > 3 || !['PASS','FAIL'].includes(verdict)) throw Error('Invalid review');
  return verdict === 'PASS' ? 'Done' : round === 3 ? 'Blocked' : 'Đã gửi';
}
export function committedAcks(root, task, head) {
  const base = task.base_commit;
  if (!/^[a-f0-9]{40}$/.test(base || '') || git(root,'merge-base',base,head) !== base) throw Error('Worker history diverged from task baseline');
  let text = '';
  try { text = git(root,'show',`${head}:handoff/ACK.md`); } catch { return []; }
  let old = '';
  try { old = git(root,'show',`${base}:handoff/ACK.md`); } catch {}
  const previous = new Set(old.split(/\r?\n/).map(x => x.trim()));
  return text.split(/\r?\n/).map(x => x.trim()).filter(x => x.startsWith('{') && !previous.has(x)).flatMap(line => {
    try { const e = JSON.parse(line); return e.task_id === task.id && e.attempt === task.attempt && e.actor === task.recipient && e.base_commit === base ? [e] : []; } catch { return []; }
  });
}
export function checkCompletion(root,task,head,acks) {
  if (!acks.some(e=>e.event==='received') || !acks.some(e=>e.event==='started')) throw Error('Missing committed received/started ACK');
  const done = acks.findLast(e=>e.event==='completed');
  if (!done || !/^[a-f0-9]{40}$/.test(done.result_commit || '')) throw Error('Missing completed ACK/result SHA');
  const sha = done.result_commit;
  if (sha === task.base_commit || git(root,'merge-base',task.base_commit,sha) !== task.base_commit || git(root,'merge-base',sha,head) !== sha) throw Error('Result is not a new descendant commit');
  const changed = git(root,'diff','--name-only',task.base_commit,sha).split('\n').filter(Boolean);
  const product = changed.filter(p=>p!=='handoff/ACK.md');
  if (!product.length) throw Error('ACK-only commit is not an implementation');
  if (product.some(p=>p.startsWith('handoff/') || !task.allowedPaths.some(a=>a.endsWith('/')?p.startsWith(a):p===a))) throw Error('Result changed protected/out-of-scope paths');
  // ACK commits may only add acknowledgements, never hide untested code after result_commit.
  const tail = git(root,'diff','--name-only',sha,head).split('\n').filter(Boolean);
  if (tail.some(p=>p!=='handoff/ACK.md')) throw Error('Untested product changes after result_commit');
  return {result_commit:sha, ack_commit:head, changed:product, ack_hash:sha256(JSON.stringify(acks))};
}
