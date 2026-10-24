/* Xóm Nhỏ Studio · Virtual Office Command Center Pro v2.0
   Handles Room Navigation, 2.5D Isometric Floorplan, Linear Kanban,
   Executive Split-view Reports, and Mobile QA Device Lab with Compare Mode.
*/
(() => {
  'use strict';

  const SOURCES = {
    tasks: 'tasks.json',
    evidence: 'evidence.json',
    antigravity: 'reports/ANTIGRAVITY_UI_REPORT.md',
    codex: 'reports/CODEX_BACKEND_REPORT.md',
  };

  const ROOM_NAMES = {
    lobby: '🏢 Sảnh Văn Phòng',
    kanban: '📋 Bảng Kanban',
    reports: '📑 Phòng Họp Báo Cáo',
    qa: '📱 Mobile QA Device Lab',
  };

  const KIND_LABEL = { fresh: 'Gameplay thật', fixture: 'Fixture có kiểm soát', other: 'Khác' };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Global State
  const state = {
    tasks: null,
    evidence: [],
    currentView: 'lobby',
    kanbanFilter: 'all',
    kanbanSearch: '',
    qaKindFilter: 'all',
    qaMode: 'grid', // 'grid' | 'compare'
    compareSlotA: 0,
    compareSlotB: 1,
    lightboxIndex: 0,
    visibleEvidence: [],
  };

  // ───────────────────────── 1. DATA LOADING ─────────────────────────
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

  // ───────────────────────── 2. MARKDOWN PARSER ─────────────────────────
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
    if (!md) return '';
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
        out.push(`<blockquote>${renderMarkdown(buf.join('\n'), base)}</blockquote>`);
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
        const items = [];
        while (i < lines.length && /^\s*([-*]|\d+\.)\s/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''));
          i++;
        }
        out.push(`<ul>${items.map((it) => `<li>${inline(it, base)}</li>`).join('')}</ul>`);
        continue;
      }
      const buf = [];
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) buf.push(lines[i++]);
      if (!buf.length) buf.push(lines[i++]);
      out.push(`<p>${buf.map((l, k) => inline(l.trimEnd(), base) + (k < buf.length - 1 ? (/\s{2,}$/.test(l) ? '<br>' : ' ') : '')).join('')}</p>`);
    }
    return out.join('\n');
  }

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

  // ───────────────────────── 3. NAVIGATION & APP SHELL ─────────────────────────
  function switchRoom(roomKey) {
    if (!ROOM_NAMES[roomKey]) return;
    state.currentView = roomKey;

    // Update Nav items
    $$('.nav-item').forEach((btn) => {
      const active = btn.dataset.view === roomKey;
      btn.classList.toggle('is-active', active);
      if (active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });

    // Update breadcrumb
    $('#current-room-name').textContent = ROOM_NAMES[roomKey];

    // Show active room view
    $$('.room-view').forEach((view) => {
      view.classList.toggle('is-active', view.id === `view-${roomKey}`);
    });
  }

  function showToast(msg) {
    const t = $('#studio-toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3000);
  }

  // ───────────────────────── 4. KANBAN BOARD ─────────────────────────
  function renderKanban() {
    const t = state.tasks;
    const board = $('#linear-kanban-board');
    if (!t) { board.innerHTML = '<p class="empty">Không đọc được tasks.json.</p>'; return; }

    const repo = t.repository || '';
    const statuses = t.statuses || ['Todo', 'In Progress', 'Review', 'Done'];
    const query = state.kanbanSearch.toLowerCase().trim();

    const tasks = t.tasks.filter((x) => {
      const matchOwner = state.kanbanFilter === 'all' || x.owner === state.kanbanFilter;
      const matchQuery = !query ||
        x.id.toLowerCase().includes(query) ||
        x.title.toLowerCase().includes(query) ||
        (x.notes && x.notes.toLowerCase().includes(query)) ||
        (x.commit && x.commit.toLowerCase().includes(query));
      return matchOwner && matchQuery;
    });

    const byId = Object.fromEntries(t.tasks.map((x) => [x.id, x]));

    // Update counts
    $('#count-all-tasks').textContent = t.tasks.length;
    $('#count-ag-tasks').textContent = t.tasks.filter((x) => x.owner === 'Antigravity').length;
    $('#count-cx-tasks').textContent = t.tasks.filter((x) => x.owner === 'Codex').length;
    $('#nav-count-kanban').textContent = t.tasks.length;

    board.innerHTML = statuses.map((st) => {
      const colTasks = tasks.filter((x) => x.status === st);
      const dotCls = st === 'Todo' ? 'dot-todo' : st === 'In Progress' ? 'dot-progress' : st === 'Review' ? 'dot-review' : 'dot-done';

      return `
        <div class="kanban-col">
          <div class="col-header">
            <div class="col-title-wrap">
              <span class="col-dot ${dotCls}"></span>
              <span>${esc(st)}</span>
            </div>
            <span class="col-badge-count">${colTasks.length}</span>
          </div>
          <div class="col-cards-scroll">
            ${colTasks.map((x) => {
              const blocked = (x.blockedBy || []).filter((id) => byId[id] && byId[id].status !== 'Done');
              const blocks = (x.blocks || []).map((id) => byId[id]).filter(Boolean);
              const ownerCls = x.owner === 'Antigravity' ? 'ag' : 'cx';
              const prioCls = x.priority === 'High' ? 'prio-high' : x.priority === 'Medium' ? 'prio-medium' : 'prio-low';

              return `
                <article class="linear-card">
                  <div class="card-tag-row">
                    <span class="task-id-badge">${esc(x.id)}</span>
                    <span class="owner-chip ${ownerCls}">${esc(x.owner)}</span>
                    ${x.priority ? `<span class="priority-pill ${prioCls}">● ${esc(x.priority)}</span>` : ''}
                  </div>
                  <h4 class="card-task-title">${esc(x.title)}</h4>
                  ${x.notes ? `<p class="card-task-notes">${esc(x.notes)}</p>` : ''}
                  ${blocked.length ? `<div class="dep-tag dep-blocked">⛔ Chờ: ${blocked.map(esc).join(', ')}</div>` : ''}
                  ${blocks.length ? `<div class="dep-tag dep-blocks">🔗 Mở khóa: ${blocks.map((b) => esc(b.id)).join(', ')}</div>` : ''}
                  <div class="card-footer-meta">
                    ${x.commit ? `<a href="${esc(repo)}/commit/${esc(x.commit)}" target="_blank" rel="noopener">⎇ ${esc(x.commit)}</a>` : '<span></span>'}
                    ${x.report ? `<a href="#reports" class="link-report" data-jump-report="${esc(x.report)}">Báo cáo ↗</a>` : ''}
                  </div>
                </article>
              `;
            }).join('') || '<div class="empty-card" style="text-align:center;padding:20px;color:var(--text-dim);font-size:12px;">Không có task</div>'}
          </div>
        </div>
      `;
    }).join('');
  }

  // ───────────────────────── 5. REPORTS SPLIT-VIEW ─────────────────────────
  function renderReports(antigravityMd, codexMd) {
    const agEl = $('#deck-content-ag');
    const cxEl = $('#deck-content-cx');

    const baseAg = new URL(SOURCES.antigravity, document.baseURI).href;
    const baseCx = new URL(SOURCES.codex, document.baseURI).href;

    agEl.innerHTML = renderMarkdown(antigravityMd, baseAg);
    highlightActionItems(agEl);

    cxEl.innerHTML = renderMarkdown(codexMd, baseCx);
    highlightActionItems(cxEl);
  }

  // ───────────────────────── 6. MOBILE QA DEVICE LAB ─────────────────────────
  function createPhoneBezelHtml(item, index, customWidth = null) {
    const is390 = item.viewport === '390x844';
    const isFresh = item.kind === 'fresh';
    const deviceName = is390 ? 'iPhone 14' : 'Android Pixel';
    const deviceClass = is390 ? 'device-390' : 'device-360';

    return `
      <div class="phone-bezel" data-device-index="${index}">
        <div class="phone-shell ${deviceClass}" ${customWidth ? `style="width:${customWidth}px"` : ''}>
          <div class="phone-top-bar">
            <span>09:41</span>
            <div class="phone-notch"></div>
            <span>5G 🔋</span>
          </div>
          <div class="phone-screen">
            <img src="${esc(item.file)}" alt="${esc(item.title)}" loading="lazy" decoding="async">
          </div>
          <div class="phone-home-indicator"></div>
        </div>
        <div class="phone-caption">
          <div class="caption-title" title="${esc(item.title)}">${esc(item.title)}</div>
          <div class="caption-tags">
            <span class="badge-vp">${deviceName} (${esc(item.viewport || '360x640')})</span>
            <span class="badge-kind ${isFresh ? 'kind-fresh' : 'kind-fixture'}">${esc(KIND_LABEL[item.kind] || item.kind)}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderQALab() {
    const grid = $('#phone-devices-grid');
    state.visibleEvidence = state.evidence.filter((e) => state.qaKindFilter === 'all' || e.kind === state.qaKindFilter);

    $('#nav-count-qa').textContent = state.evidence.length;
    $('#kpi-evidence-count').textContent = state.evidence.length;

    grid.innerHTML = state.visibleEvidence.map((item, i) => createPhoneBezelHtml(item, i)).join('');

    // Populate compare dropdowns
    const selectA = $('#select-slot-a');
    const selectB = $('#select-slot-b');

    const optionsHtml = state.evidence.map((item, idx) => `
      <option value="${idx}">${item.title} (${item.viewport}) · ${KIND_LABEL[item.kind] || item.kind}</option>
    `).join('');

    selectA.innerHTML = optionsHtml;
    selectB.innerHTML = optionsHtml;

    selectA.value = String(state.compareSlotA);
    selectB.value = String(state.compareSlotB);

    renderCompareStage();
  }

  function renderCompareStage() {
    const itemA = state.evidence[state.compareSlotA] || state.evidence[0];
    const itemB = state.evidence[state.compareSlotB] || state.evidence[1] || itemA;

    $('#compare-device-a').innerHTML = createPhoneBezelHtml(itemA, state.compareSlotA, 280);
    $('#compare-device-b').innerHTML = createPhoneBezelHtml(itemB, state.compareSlotB, 280);
  }

  function openLightbox(index) {
    const list = state.visibleEvidence.length ? state.visibleEvidence : state.evidence;
    if (!list.length) return;
    state.lightboxIndex = (index + list.length) % list.length;
    const item = list[state.lightboxIndex];

    $('#lightbox-large-img').src = item.file;
    $('#lightbox-large-img').alt = item.title;
    $('#lightbox-caption').textContent = `${state.lightboxIndex + 1}/${list.length} · ${item.title} (${item.viewport || ''}) · ${KIND_LABEL[item.kind] || item.kind}`;
    $('#lightbox-raw-link').href = item.file;

    const dlg = $('#qa-lightbox');
    if (!dlg.open) dlg.showModal();
  }

  // ───────────────────────── 7. PROMPT BÀN GIAO GENERATOR ─────────────────────────
  function copyHandoffPrompt() {
    const t = state.tasks;
    const h = t?.currentHandoff;
    const branch = t?.branch || 'codex/core-loop-completion';
    const commit = h?.resultCommit || '7e024a6';

    const promptText = `Gửi Codex: Antigravity đã hoàn thành giao diện vận hành UI (commit ${commit} trên nhánh ${branch}).
Mời bạn mở văn phòng điều hành docs/office_hub/index.html và thực hiện các Action Items sau:
1. [C1 - High] Chạy lại toàn bộ game/test-*.mjs trên commit ${commit} (máy Antigravity không có Node.js).
2. [C2 - High] Chốt luật quán vắng chủ khi không có quản lý (chặn rời quán hay tạm dừng đón khách hay cho lỡ khách).
3. [C3 - Med] Export selector isQuietInterval / currentMinuteRate cho UI trong main.mjs.
4. [C4 - Med] Export selector shopOperationalStatus(empire, shopId).
5. [C5 - Low] Ổn định enum area của operationalAdvice (stock, service, pricing, menu, hours, cost, staff, stable).
6. [C6 - Low] Cung cấp hook loadFixture(name) có seed cố định cho test trình duyệt đa quán.

Sau khi hoàn tất, vui lòng điền báo cáo vào docs/office_hub/reports/CODEX_BACKEND_REPORT.md và cập nhật docs/office_hub/tasks.json. Cảm ơn bạn!`;

    navigator.clipboard.writeText(promptText).then(() => {
      showToast('✓ Đã sao chép prompt bàn giao Codex vào Clipboard!');
    }).catch(() => {
      showToast('⚠️ Không thể tự động chép, vui lòng xem trong báo cáo.');
    });
  }

  // ───────────────────────── 8. EVENT BINDINGS ─────────────────────────
  function bindEvents() {
    // Room Navigation clicks
    document.addEventListener('click', (e) => {
      const navBtn = e.target.closest('[data-view]');
      if (navBtn) {
        switchRoom(navBtn.dataset.view);
        return;
      }

      // Sidebar desk clicks jump to lobby or focus
      const deskCard = e.target.closest('[data-target-desk]');
      if (deskCard) {
        switchRoom('lobby');
        const deskId = `desk-${deskCard.dataset.targetDesk}`;
        const el = document.getElementById(deskId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // Blocker button jumps to Kanban
      if (e.target.closest('#btn-goto-blockers')) {
        switchRoom('kanban');
        state.kanbanSearch = 'C2';
        $('#kanban-search').value = 'C2';
        renderKanban();
        return;
      }

      // Copy Prompt Button
      if (e.target.closest('#btn-copy-prompt')) {
        copyHandoffPrompt();
        return;
      }

      // Kanban owner filter buttons
      const ownerBtn = e.target.closest('[data-owner-filter]');
      if (ownerBtn) {
        state.kanbanFilter = ownerBtn.dataset.ownerFilter;
        $$('.btn-filter', ownerBtn.parentElement).forEach((b) => b.classList.toggle('is-active', b === ownerBtn));
        renderKanban();
        return;
      }

      // Jump to Action Items button in reports
      const jumpBtn = e.target.closest('[data-jump-to]');
      if (jumpBtn) {
        const targetId = jumpBtn.dataset.jumpTo;
        const target = document.getElementById('deck-content-ag-actions') || document.querySelector('.action-items');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      // QA Lab mode tabs (Grid vs Compare)
      const tabGrid = e.target.closest('#tab-mode-grid');
      if (tabGrid) {
        state.qaMode = 'grid';
        tabGrid.classList.add('is-active');
        $('#tab-mode-compare').classList.remove('is-active');
        $('#qa-grid-container').style.display = 'block';
        $('#qa-compare-container').style.display = 'none';
        $('#qa-grid-filters').style.display = 'flex';
        return;
      }
      const tabCompare = e.target.closest('#tab-mode-compare');
      if (tabCompare) {
        state.qaMode = 'compare';
        tabCompare.classList.add('is-active');
        $('#tab-mode-grid').classList.remove('is-active');
        $('#qa-grid-container').style.display = 'none';
        $('#qa-compare-container').style.display = 'block';
        $('#qa-grid-filters').style.display = 'none';
        return;
      }

      // QA kind filters
      const qaKindBtn = e.target.closest('[data-qa-kind]');
      if (qaKindBtn) {
        state.qaKindFilter = qaKindBtn.dataset.qaKind;
        $$('[data-qa-kind]', qaKindBtn.parentElement).forEach((b) => b.classList.toggle('is-active', b === qaKindBtn));
        renderQALab();
        return;
      }

      // Phone click opens Lightbox
      const phone = e.target.closest('.phone-bezel[data-device-index]');
      if (phone && !e.target.closest('select')) {
        openLightbox(Number(phone.dataset.deviceIndex));
        return;
      }

      // Lightbox navigation
      if (e.target.closest('#btn-lightbox-prev')) {
        openLightbox(state.lightboxIndex - 1);
        return;
      }
      if (e.target.closest('#btn-lightbox-next')) {
        openLightbox(state.lightboxIndex + 1);
        return;
      }

      // Compare presets
      const presetBtn = e.target.closest('[data-preset]');
      if (presetBtn) {
        $$('.btn-preset', presetBtn.parentElement).forEach((b) => b.classList.toggle('is-active', b === presetBtn));
        const p = presetBtn.dataset.preset;
        if (p === 'empire_360_vs_390') {
          state.compareSlotA = state.evidence.findIndex((x) => x.file.includes('empire_result_360x640'));
          state.compareSlotB = state.evidence.findIndex((x) => x.file.includes('empire_result_390x844'));
        } else if (p === 'regular_360_vs_390') {
          state.compareSlotA = state.evidence.findIndex((x) => x.file.includes('familiar_badge_360x640'));
          state.compareSlotB = state.evidence.findIndex((x) => x.file.includes('familiar_badge_390x844'));
        } else if (p === 'map_360_vs_390') {
          state.compareSlotA = state.evidence.findIndex((x) => x.file.includes('map_home_owner_360x640'));
          state.compareSlotB = state.evidence.findIndex((x) => x.file.includes('map_home_owner_390x844'));
        } else if (p === 'day1_fresh_vs_result') {
          state.compareSlotA = state.evidence.findIndex((x) => x.file.includes('fresh_day1_kitchen'));
          state.compareSlotB = state.evidence.findIndex((x) => x.file.includes('fresh_day1_result'));
        }
        if (state.compareSlotA < 0) state.compareSlotA = 0;
        if (state.compareSlotB < 0) state.compareSlotB = 1;
        $('#select-slot-a').value = String(state.compareSlotA);
        $('#select-slot-b').value = String(state.compareSlotB);
        renderCompareStage();
        return;
      }
    });

    // Compare slot select changes
    $('#select-slot-a').addEventListener('change', (e) => {
      state.compareSlotA = Number(e.target.value);
      renderCompareStage();
    });
    $('#select-slot-b').addEventListener('change', (e) => {
      state.compareSlotB = Number(e.target.value);
      renderCompareStage();
    });

    // Kanban search input
    $('#kanban-search').addEventListener('input', (e) => {
      state.kanbanSearch = e.target.value;
      renderKanban();
    });

    // Keyboard Shortcuts (1: Lobby, 2: Kanban, 3: Reports, 4: QA Lab)
    document.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === '1') switchRoom('lobby');
      else if (e.key === '2') switchRoom('kanban');
      else if (e.key === '3') switchRoom('reports');
      else if (e.key === '4') switchRoom('qa');
      else if (e.key === 'ArrowRight' && $('#qa-lightbox').open) openLightbox(state.lightboxIndex + 1);
      else if (e.key === 'ArrowLeft' && $('#qa-lightbox').open) openLightbox(state.lightboxIndex - 1);
    });

    // Lightbox backdrop click to close
    const dlg = $('#qa-lightbox');
    dlg.addEventListener('click', (ev) => { if (ev.target === dlg) dlg.close(); });
  }

  // ───────────────────────── 9. BOOTSTRAP ─────────────────────────
  async function boot() {
    bindEvents();
    const { data, usedBundle, bundleTime } = await loadAll();

    state.tasks = data.tasks;
    state.evidence = data.evidence?.items || [];

    // Calculate Sprint Progress
    if (state.tasks?.tasks) {
      const allTasks = state.tasks.tasks;
      const doneCount = allTasks.filter((t) => t.status === 'Done').length;
      const pct = Math.round((doneCount / allTasks.length) * 100);
      $('#sprint-progress-text').textContent = `${doneCount}/${allTasks.length} (${pct}%)`;
      $('#sprint-progress-bar').style.width = `${pct}%`;
    }

    // Git Branch & Status
    if (state.tasks?.branch) {
      $('#git-branch-text').textContent = state.tasks.branch;
    }

    // Data source indicator
    const badge = $('#data-source-badge');
    if (usedBundle) {
      badge.textContent = `Bản đóng gói (${bundleTime ? bundleTime.slice(11, 16) : 'Offline'})`;
      badge.className = 'source-pill src-bundle';
    } else {
      badge.textContent = 'Dữ liệu trực tiếp';
      badge.className = 'source-pill src-live';
    }

    // Sidebar update time
    if (state.tasks?.updatedAt) {
      $('#sidebar-updated-time').textContent = `Cập nhật: ${state.tasks.updatedAt.slice(0, 16).replace('T', ' ')}`;
    }

    // Render Rooms
    renderKanban();
    renderReports(data.antigravity, data.codex);
    renderQALab();
  }

  boot();
})();
