/* Xóm Nhỏ · Office Control Center
 * Reads live files over HTTP; falls back to data.bundle.js when opened via file://.
 * No dependencies so it works offline and directly from the repo.
 */
(() => {
  'use strict';

  const SOURCES = {
    tasks: 'tasks.json',
    evidence: 'evidence.json',
    antigravity: 'reports/ANTIGRAVITY_UI_REPORT.md',
    codex: 'reports/CODEX_BACKEND_REPORT.md',
  };
  const STATUS_META = {
    'Todo': { icon: '○', cls: 'todo' },
    'In Progress': { icon: '◐', cls: 'progress' },
    'Review': { icon: '◑', cls: 'review' },
    'Done': { icon: '●', cls: 'done' },
  };
  const KIND_LABEL = { fresh: 'Gameplay thật', fixture: 'Fixture có kiểm soát', other: 'Khác' };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const state = { tasks: null, evidence: [], ownerFilter: 'all', kindFilter: 'all', lightboxIndex: 0, visibleEvidence: [] };

  // ───────────────────────── Data loading ─────────────────────────
  async function loadOne(key, asJson) {
    const res = await fetch(SOURCES[key], { cache: 'no-store' });
    if (!res.ok) throw new Error(`${SOURCES[key]}: HTTP ${res.status}`);
    return asJson ? res.json() : res.text();
  }

  async function loadAll() {
    const bundle = window.OFFICE_HUB_BUNDLE || null;
    const fromBundle = {
      tasks: bundle?.tasks,
      evidence: bundle?.evidence,
      antigravity: bundle?.reports?.antigravity,
      codex: bundle?.reports?.codex,
    };
    const keys = Object.keys(SOURCES);
    // Browsers block fetch() on file:// — go straight to the bundle there.
    const canFetch = location.protocol !== 'file:' || !bundle;
    const settled = canFetch
      ? await Promise.allSettled(keys.map((k) => loadOne(k, k === 'tasks' || k === 'evidence')))
      : keys.map(() => ({ status: 'rejected' }));
    const data = {};
    let usedBundle = 0;
    settled.forEach((r, i) => {
      const k = keys[i];
      if (r.status === 'fulfilled') data[k] = r.value;
      else if (fromBundle[k] != null) { data[k] = fromBundle[k]; usedBundle++; }
      else data[k] = null;
    });
    return { data, usedBundle, bundleTime: bundle?.generatedAt };
  }

  // ───────────────────────── Markdown ─────────────────────────
  // Small, safe renderer for the subset used in reports: headings, lists,
  // tables, quotes, code, links, bold/italic. All text is escaped first.
  function resolveUrl(href, base) {
    if (/^\s*(javascript|data|vbscript):/i.test(href)) return '#';
    try { return new URL(href, base).href; } catch { return '#'; }
  }

  function inline(text, base) {
    const codes = [];
    let s = esc(text).replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
      const url = resolveUrl(href.replace(/&amp;/g, '&'), base);
      const isImg = /\.(png|jpe?g|webp|gif)$/i.test(url);
      return `<a href="${esc(url)}"${isImg ? ' data-evidence-link' : ' target="_blank" rel="noopener"'}>${label}</a>`;
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\w)/g, '$1<em>$2</em>')
      .replace(/(^|[^\w])_([^_\s][^_]*)_(?!\w)/g, '$1<em>$2</em>');
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
  }

  function splitRow(line) {
    return line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim());
  }

  function renderMarkdown(md, base) {
    const lines = md.replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let i = 0;
    const isBlockStart = (l) => /^(#{1,6}\s|>|\s*[-*]\s|\s*\d+\.\s|```|\||-{3,}\s*$)/.test(l);
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      if (/^```/.test(line)) {
        const buf = []; i++;
        while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
        i++; out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`); continue;
      }
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) { const n = h[1].length; out.push(`<h${n}>${inline(h[2], base)}</h${n}>`); i++; continue; }
      if (/^-{3,}\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
      if (/^>/.test(line)) {
        const buf = [];
        while (i < lines.length && /^>/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
        const alert = buf[0]?.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/);
        if (alert) buf.shift();
        out.push(`<blockquote${alert ? ` class="alert alert-${alert[1].toLowerCase()}"` : ''}>${renderMarkdown(buf.join('\n'), base)}</blockquote>`);
        continue;
      }
      if (/^\|/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1])) {
        const head = splitRow(line); i += 2;
        const rows = [];
        while (i < lines.length && /^\|/.test(lines[i])) rows.push(splitRow(lines[i++]));
        out.push(`<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th>${inline(c, base)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c, base).replace(/&lt;br&gt;/g, '<br>')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
        continue;
      }
      if (/^\s*([-*]|\d+\.)\s/.test(line)) {
        out.push(renderList(lines, i, base, (next) => { i = next; }));
        continue;
      }
      const buf = [];
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) buf.push(lines[i++]);
      if (!buf.length) buf.push(lines[i++]);
      out.push(`<p>${buf.map((l, k) => inline(l.trimEnd(), base) + (k < buf.length - 1 ? (/\s{2,}$/.test(l) ? '<br>' : ' ') : '')).join('')}</p>`);
    }
    return out.join('\n');
  }

  function renderList(lines, start, base, setIndex) {
    const indentOf = (l) => l.match(/^\s*/)[0].length;
    const baseIndent = indentOf(lines[start]);
    const ordered = /^\s*\d+\./.test(lines[start]);
    const items = [];
    let i = start;
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) { if (i + 1 < lines.length && /^\s*([-*]|\d+\.)\s/.test(lines[i + 1]) && indentOf(lines[i + 1]) >= baseIndent) { i++; continue; } break; }
      const ind = indentOf(l);
      const m = l.match(/^\s*([-*]|\d+\.)\s+(.*)$/);
      if (m && ind === baseIndent) { items.push({ text: m[2], children: '' }); i++; continue; }
      if (ind > baseIndent && items.length) {
        if (m) { let next = i; items.at(-1).children += renderList(lines, i, base, (n) => { next = n; }); i = next; continue; }
        items.at(-1).text += ' ' + l.trim(); i++; continue;
      }
      break;
    }
    setIndex(i);
    const tag = ordered ? 'ol' : 'ul';
    return `<${tag}>${items.map((it) => `<li>${inline(it.text, base)}${it.children}</li>`).join('')}</${tag}>`;
  }

  // Wrap every "## Action Items…" section so it stands out.
  function highlightActionItems(root) {
    let section = null;
    for (const el of [...root.children]) {
      if (el.tagName === 'H2') {
        section = null;
        if (/^\s*action items for\b/i.test(el.textContent)) {
          section = document.createElement('section');
          section.className = 'action-items';
          section.id = `${root.id}-actions`;
          el.before(section);
          section.append(el);
          continue;
        }
      }
      if (section) section.append(el);
    }
  }

  function renderReport(id, md, path) {
    const root = document.getElementById(id);
    if (md == null) { root.innerHTML = `<p class="empty">Không đọc được <code>${esc(path)}</code>.</p>`; return; }
    const base = new URL(path, document.baseURI).href;
    root.innerHTML = renderMarkdown(md, base);
    if (/^>\s*\*\*TEMPLATE/m.test(md)) root.closest('.report-pane').classList.add('is-template');
    highlightActionItems(root);
  }

  // ───────────────────────── Kanban ─────────────────────────
  function repoLink(path) {
    if (!path) return '';
    const local = path.startsWith('docs/') ? '../' + path.slice(5) : path;
    return `<a href="${esc(local)}" target="_blank" rel="noopener">${esc(path.replace(/^docs\//, ''))}</a>`;
  }

  function renderBoard() {
    const t = state.tasks;
    const board = $('#kanban');
    if (!t) { board.innerHTML = '<p class="empty">Không đọc được tasks.json.</p>'; return; }
    const repo = t.repository || '';
    const statuses = t.statuses || Object.keys(STATUS_META);
    const tasks = t.tasks.filter((x) => state.ownerFilter === 'all' || x.owner === state.ownerFilter);
    const byId = Object.fromEntries(t.tasks.map((x) => [x.id, x]));

    board.innerHTML = statuses.map((st) => {
      const meta = STATUS_META[st] || { icon: '•', cls: 'other' };
      const col = tasks.filter((x) => x.status === st);
      return `<div class="column col-${meta.cls}">
        <h3><span aria-hidden="true">${meta.icon}</span> ${esc(st)} <span class="count">${col.length}</span></h3>
        <ul class="cards">${col.map((x) => {
          const blocked = (x.blockedBy || []).filter((id) => byId[id] && byId[id].status !== 'Done');
          return `<li class="card owner-${esc(x.owner.toLowerCase())}${blocked.length ? ' is-blocked' : ''}">
            <div class="card-top"><code class="task-id">${esc(x.id)}</code><span class="owner-badge">${esc(x.owner)}</span>${x.area ? `<span class="area">${esc(x.area)}</span>` : ''}${x.priority ? `<span class="prio prio-${esc(x.priority.toLowerCase())}">${esc(x.priority)}</span>` : ''}</div>
            <p class="card-title">${esc(x.title)}</p>
            ${x.notes ? `<p class="card-notes">${esc(x.notes)}</p>` : ''}
            <div class="card-meta">
              ${x.commit ? `<a href="${esc(repo)}/commit/${esc(x.commit)}" target="_blank" rel="noopener">⎇ ${esc(x.commit)}</a>` : ''}
              ${x.report ? repoLink(x.report) : ''}
              ${blocked.length ? `<span class="blocked">⛔ chờ ${blocked.map(esc).join(', ')}</span>` : ''}
              ${(x.blocks || []).length ? `<span class="blocks">→ mở khóa ${x.blocks.map(esc).join(', ')}</span>` : ''}
            </div>
          </li>`;
        }).join('') || '<li class="card-empty">—</li>'}</ul>
      </div>`;
    }).join('');

    const h = t.currentHandoff;
    const banner = $('#handoff-banner');
    if (h) {
      const counts = (owner) => t.tasks.filter((x) => x.owner === owner && x.status !== 'Done').length;
      banner.hidden = false;
      banner.innerHTML = `<span class="label">Đợt bàn giao hiện tại</span>
        <b>${esc(h.title)}</b>
        <span>${esc(h.from)} → ${esc(h.to)}</span>
        ${h.baseCommit ? `<a href="${esc(repo)}/commit/${esc(h.baseCommit)}" target="_blank" rel="noopener">base ${esc(h.baseCommit)}</a>` : ''}
        ${h.resultCommit ? `<a href="${esc(repo)}/commit/${esc(h.resultCommit)}" target="_blank" rel="noopener">result ${esc(h.resultCommit)}</a>` : ''}
        <span class="open-count owner-antigravity">Antigravity còn ${counts('Antigravity')}</span>
        <span class="open-count owner-codex">Codex còn ${counts('Codex')}</span>`;
    }
  }

  // ───────────────────────── Gallery ─────────────────────────
  function renderGallery() {
    const grid = $('#evidence-grid');
    state.visibleEvidence = state.evidence.filter((e) => state.kindFilter === 'all' || e.kind === state.kindFilter);
    if (!state.evidence.length) { grid.innerHTML = '<p class="empty">Không đọc được evidence.json. Chạy <code>python docs/office_hub/build_bundle.py</code>.</p>'; return; }
    grid.innerHTML = state.visibleEvidence.map((e, i) => `
      <figure class="shot kind-${esc(e.kind)}">
        <button type="button" class="shot-open" data-index="${i}" aria-label="Phóng to: ${esc(e.title)} ${esc(e.viewport || '')}">
          <img src="${esc(e.file)}" alt="${esc(e.title)}" loading="lazy" decoding="async">
        </button>
        <figcaption>
          <b>${esc(e.title)}</b>
          <span class="shot-tags">${e.viewport ? `<span class="vp">${esc(e.viewport)}</span>` : ''}<span class="kind">${esc(KIND_LABEL[e.kind] || e.kind)}</span></span>
        </figcaption>
      </figure>`).join('');
  }

  function openLightbox(index) {
    const list = state.visibleEvidence;
    if (!list.length) return;
    state.lightboxIndex = (index + list.length) % list.length;
    const e = list[state.lightboxIndex];
    $('#lightbox-img').src = e.file;
    $('#lightbox-img').alt = e.title;
    $('#lightbox-caption').textContent = `${state.lightboxIndex + 1}/${list.length} · ${e.title}${e.viewport ? ' · ' + e.viewport : ''} · ${KIND_LABEL[e.kind] || e.kind}`;
    $('#lightbox-open').href = e.file;
    const dlg = $('#lightbox');
    if (!dlg.open) dlg.showModal();
  }

  // ───────────────────────── Events ─────────────────────────
  function bindEvents() {
    document.addEventListener('click', (ev) => {
      const owner = ev.target.closest('[data-owner]');
      if (owner) {
        state.ownerFilter = owner.dataset.owner;
        setActive(owner); renderBoard(); return;
      }
      const kind = ev.target.closest('[data-kind]');
      if (kind) {
        state.kindFilter = kind.dataset.kind;
        setActive(kind); renderGallery(); return;
      }
      const shot = ev.target.closest('.shot-open');
      if (shot) { openLightbox(Number(shot.dataset.index)); return; }
      const step = ev.target.closest('[data-step]');
      if (step) { openLightbox(state.lightboxIndex + Number(step.dataset.step)); return; }
      const jump = ev.target.closest('.jump');
      if (jump) {
        const target = document.getElementById(`${jump.dataset.target}-actions`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const evLink = ev.target.closest('a[data-evidence-link]');
      if (evLink) {
        const name = evLink.href.split('/').pop();
        state.kindFilter = 'all';
        setActive($('[data-kind="all"]')); renderGallery();
        const idx = state.visibleEvidence.findIndex((e) => e.file.endsWith('/' + name));
        if (idx >= 0) { ev.preventDefault(); openLightbox(idx); }
      }
    });

    const dlg = $('#lightbox');
    // Fallback for browsers without closedby="any": click on the backdrop closes.
    dlg.addEventListener('click', (ev) => { if (ev.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowRight') openLightbox(state.lightboxIndex + 1);
      if (ev.key === 'ArrowLeft') openLightbox(state.lightboxIndex - 1);
    });
  }

  function setActive(btn) {
    $$('button', btn.parentElement).forEach((b) => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
  }

  // ───────────────────────── Boot ─────────────────────────
  async function boot() {
    bindEvents();
    const { data, usedBundle, bundleTime } = await loadAll();
    state.tasks = data.tasks;
    state.evidence = data.evidence?.items || [];
    renderBoard();
    renderReport('report-antigravity', data.antigravity, SOURCES.antigravity);
    renderReport('report-codex', data.codex, SOURCES.codex);
    renderGallery();

    const t = data.tasks;
    const source = usedBundle
      ? `<span class="src src-bundle" title="Trình duyệt chặn đọc file trực tiếp; đang dùng bản đóng gói">Bản đóng gói ${esc(bundleTime || '')}</span>`
      : '<span class="src src-live">Dữ liệu trực tiếp</span>';
    $('#hub-meta').innerHTML = t
      ? `Nhánh <code>${esc(t.branch)}</code> · cập nhật ${esc(t.updatedAt)} bởi ${esc(t.updatedBy)} · ${source}`
      : source;
  }

  boot();
})();
