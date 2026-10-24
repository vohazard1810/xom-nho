/* Read-only orchestration status. textContent avoids treating logs as HTML. */
(() => {
  const section = document.createElement('section');
  section.className = 'zone'; section.id = 'orchestrator';
  const title = document.createElement('h2'); title.textContent = '④ Điều phối local';
  const summary = document.createElement('p');
  const output = document.createElement('pre');
  output.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;max-height:28rem;overflow:auto';
  section.append(title, summary, output); document.querySelector('main').append(section);
  const a = document.createElement('a'); a.href = '#orchestrator'; a.textContent = '④ Điều phối';
  document.querySelector('.hub-nav').append(a);
  async function refresh() {
    const fallback = window.OFFICE_HUB_BUNDLE?.orchestrator || {};
    const resources = [['queue','queue.json',true],['dryRun','dry-run.json',true],['log','orchestrator.log',false]];
    const results = await Promise.allSettled(resources.map(async ([,file,json]) => {
      const r = await fetch(`../../handoff/${file}`, {cache:'no-store'});
      if (!r.ok) throw Error(`HTTP ${r.status}`);
      return json ? r.json() : r.text();
    }));
    const data = {};
    resources.forEach(([key],i) => { data[key] = results[i].status === 'fulfilled' ? results[i].value : fallback[key]; });
    const tasks = data.queue?.tasks || [];
    const capabilities = data.dryRun?.capabilities?.agents;
    summary.textContent = capabilities
      ? `Codex: ${capabilities.Codex?.mode || '?'} · Antigravity: ${capabilities.Antigravity?.mode || '?'} · ${tasks.length} task · Kiểm tra CLI: ${data.dryRun.time} (chưa gọi model).`
      : 'Chưa có kết quả doctor/dry-run. Trang chỉ hiển thị bằng chứng từ repo.';
    const rows = tasks.map(t => `${t.id} → ${t.recipient}: ${t.status} · review ${t.review_round}/3`);
    const log = (data.log || '').trim().split(/\r?\n/).filter(Boolean).slice(-25);
    output.textContent = [...rows, '', 'Log gần nhất:', ...log].join('\n');
  }
  refresh().catch(e => { summary.textContent = e.message; });
  setInterval(() => refresh().catch(e => { summary.textContent = e.message; }), 10000);
})();
