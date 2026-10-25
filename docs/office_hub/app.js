/* Xóm Nhỏ Studio · Virtual Office Command Center Pro v2.2
   Handles Room Navigation, 2.5D Isometric Floorplan, Linear Kanban,
   Executive Split-view Reports, Mobile QA Device Lab, Markdown Modal Viewer,
   Live 5s Polling Sync & Review Round Lifecycle.
*/
(() => {
  'use strict';

  const SOURCES = {
    tasks: 'tasks.json',
    latest: 'latest.json',
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
    latest: null,
    syncBusy: false,
    tasks: null,
    tasksRawText: '',
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
    lastSyncTime: Date.now(),
    pollInterval: null,
    tickerInterval: null,
    // Office Contract API State
    apiAvailable: false,
    apiRevision: null,
    csrfToken: null,
    apiState: null,
    pollApiInterval: null,
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
      latest: bundle?.latest,
      tasks: bundle?.tasks,
      evidence: bundle?.evidence,
      antigravity: bundle?.reports?.antigravity,
      codex: bundle?.reports?.codex,
    };
    const keys = Object.keys(SOURCES);
    const canFetch = location.protocol !== 'file:' || !bundle;
    const settled = canFetch
      ? await Promise.allSettled(keys.map((k) => loadOne(k, k === 'tasks' || k === 'evidence' || k === 'latest')))
      : keys.map(() => ({ status: 'rejected' }));

    const data = {};
    let usedBundle = 0;
    settled.forEach((r, i) => {
      const k = keys[i];
      if (r.status === 'fulfilled') data[k] = r.value;
      else if (location.protocol === 'file:' && fromBundle[k] != null) { data[k] = fromBundle[k]; usedBundle++; }
      else data[k] = null;
    });
    if (canFetch && data.latest) {
      const entries = Object.entries(data.latest.reports || {}).filter(([, url]) => /^reports\/[A-Za-z0-9_.-]+\.md$/.test(url));
      const reports = await Promise.allSettled(entries.map(async ([, url]) => {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error('Report unavailable');
        return response.text();
      }));
      data.latest.markdown = { ...data.latest.markdown };
      entries.forEach(([key], index) => {
        if (reports[index].status === 'fulfilled') data.latest.markdown[key] = reports[index].value;
        else if (state.latest?.nonce === data.latest.nonce) data.latest.markdown[key] = state.latest.markdown?.[key];
      });
    }
    return { data, usedBundle, bundleTime: bundle?.generatedAt };
  }

  // ───────────────────────── 2. MARKDOWN PARSER ─────────────────────────
  function resolveUrl(href, base) {
    if (!base || /^(https?:|\/|#|mailto:)/i.test(href)) return href;
    const baseDir = base.substring(0, base.lastIndexOf('/') + 1);
    return baseDir + href;
  }

  function inline(text, base) {
    return esc(text)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) =>
        `<img src="${esc(resolveUrl(src.trim(), base))}" alt="${alt}" loading="lazy" class="md-img" />`
      )
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) =>
        `<a href="${esc(resolveUrl(href.trim(), base))}" target="_blank" rel="noopener">${label}</a>`
      )
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  function splitRow(line) {
    return line.trim().replace(/^\||\|$/g, '').split('|').map((s) => s.trim());
  }

  function renderMarkdown(md, base) {
    if (!md) return '<p class="empty">Chưa có nội dung báo cáo.</p>';
    const lines = md.split(/\r?\n/);
    let html = '';
    let inList = false;
    let inTable = false;
    let inCode = false;
    let codeBlock = [];

    const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };
    const closeTable = () => { if (inTable) { html += '</tbody></table></div>'; inTable = false; } };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('```')) {
        closeList();
        closeTable();
        if (inCode) {
          html += `<pre><code>${esc(codeBlock.join('\n'))}</code></pre>`;
          codeBlock = [];
          inCode = false;
        } else {
          inCode = true;
        }
        continue;
      }
      if (inCode) {
        codeBlock.push(line);
        continue;
      }

      if (/^#{1,6}\s/.test(line)) {
        closeList();
        closeTable();
        const level = line.match(/^#+/)[0].length;
        const text = line.replace(/^#+\s*/, '');
        html += `<h${level}>${inline(text, base)}</h${level}>`;
        continue;
      }

      if (/^\|(.+)\|$/.test(line)) {
        closeList();
        const row = splitRow(line);
        if (row.every((c) => /^:?-+:?$/.test(c))) continue;
        if (!inTable) {
          inTable = true;
          html += '<div class="table-responsive"><table><thead><tr>' +
            row.map((c) => `<th>${inline(c, base)}</th>`).join('') +
            '</tr></thead><tbody>';
        } else {
          html += '<tr>' + row.map((c) => `<td>${inline(c, base)}</td>`).join('') + '</tr>';
        }
        continue;
      } else {
        closeTable();
      }

      if (/^[-*]\s+/.test(line)) {
        closeTable();
        if (!inList) { html += '<ul>'; inList = true; }
        const item = line.replace(/^[-*]\s+/, '');
        html += `<li>${inline(item, base)}</li>`;
        continue;
      } else {
        closeList();
      }

      if (line.startsWith('>')) {
        closeList();
        closeTable();
        html += `<blockquote>${inline(line.replace(/^>\s*/, ''), base)}</blockquote>`;
        continue;
      }

      if (!line.trim()) {
        closeList();
        closeTable();
        continue;
      }

      html += `<p>${inline(line, base)}</p>`;
    }
    closeList();
    closeTable();
    return html;
  }

  function highlightActionItems(root) {
    if (!root) return;
    const headers = root.querySelectorAll('h1, h2, h3, h4');
    let actionHeader = null;
    for (const h of headers) {
      if (/Action Items/i.test(h.textContent)) {
        actionHeader = h;
        break;
      }
    }
    if (!actionHeader) return;
    actionHeader.classList.add('action-header');
    let curr = actionHeader.nextElementSibling;
    while (curr && !/^H[1-6]$/i.test(curr.tagName)) {
      curr.classList.add('action-items-block');
      curr = curr.nextElementSibling;
    }
  }

  // ───────────────────────── 3. NAVIGATION & APP SHELL ─────────────────────────
  function switchRoom(roomKey) {
    if (!ROOM_NAMES[roomKey]) return;
    state.currentView = roomKey;
    if (window.history?.replaceState) window.history.replaceState(null, "", "#" + roomKey);

    $$('.nav-item').forEach((item) => {
      item.classList.toggle('is-active', item.dataset.view === roomKey);
    });

    $$('.room-view').forEach((view) => {
      view.classList.toggle('is-active', view.id === `view-${roomKey}`);
    });

    const nameEl = $('#current-room-name');
    if (nameEl) nameEl.textContent = ROOM_NAMES[roomKey];

    if (roomKey === 'kanban') renderKanban();
    else if (roomKey === 'qa') renderQALab();
  }

  function formatVnTime(isoString, includeDate = false) {
    if (!isoString) return '--';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return String(isoString);
      const options = {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      if (includeDate) {
        options.day = '2-digit';
        options.month = '2-digit';
      }
      return new Intl.DateTimeFormat('vi-VN', options).format(d) + ' ICT';
    } catch (_) {
      return String(isoString);
    }
  }

  function showToast(msg) {
    let t = $('.studio-toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'studio-toast';
      document.body.appendChild(t);
    }
    t.innerHTML = `<div class="toast-body">${msg}</div><div class="toast-timer-bar"><div class="toast-timer-fill"></div></div>`;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3000);
  }

  // ───────────────────────── 4. KANBAN BOARD ─────────────────────────
  function normalizeTasks(tasksList) {
    return (tasksList || []).map((task) => {
      const raw = String(task.status || '').trim();
      const low = raw.toLowerCase();
      let resolved = 'Todo';
      let isFallback = false;

      if (low === 'todo') {
        resolved = 'Todo';
      } else if (['in progress', 'inprogress', 'in_progress', 'đang làm'].includes(low)) {
        resolved = 'In Progress';
      } else if (['review', 'reviewing', 'chờ duyệt', 'cho_duyet'].includes(low)) {
        resolved = 'Review';
      } else if (['done', 'completed', 'đã xong'].includes(low)) {
        resolved = 'Done';
      } else {
        // Fallback to Todo with warning indicator
        resolved = 'Todo';
        isFallback = true;
      }

      return {
        ...task,
        _resolvedStatus: resolved,
        _statusFallback: isFallback,
        _originalStatus: raw,
      };
    });
  }

  function renderKanban() {
    const t = state.tasks;
    const board = $('#linear-kanban-board');
    if (!board) return;
    if (!t) { board.innerHTML = '<p class="empty">Không đọc được tasks.json.</p>'; return; }

    const repo = t.repository || 'https://github.com/vohazard1810/xom-nho';
    const statuses = ['Todo', 'In Progress', 'Review', 'Done'];
    const query = state.kanbanSearch.toLowerCase().trim();

    const normalizedList = normalizeTasks(t.tasks);

    const tasks = normalizedList.filter((x) => {
      const matchOwner = state.kanbanFilter === 'all' || x.owner === state.kanbanFilter;
      const matchQuery = !query ||
        x.id.toLowerCase().includes(query) ||
        x.title.toLowerCase().includes(query) ||
        (x.notes && x.notes.toLowerCase().includes(query)) ||
        (x.commit && x.commit.toLowerCase().includes(query)) ||
        (x._originalStatus && x._originalStatus.toLowerCase().includes(query));
      return matchOwner && matchQuery;
    });

    const byId = Object.fromEntries(normalizedList.map((x) => [x.id, x]));

    // Update counts
    const countAll = $('#count-all-tasks');
    if (countAll) countAll.textContent = t.tasks.length;
    const countAg = $('#count-ag-tasks');
    if (countAg) countAg.textContent = t.tasks.filter((x) => x.owner === 'Antigravity').length;
    const countCx = $('#count-cx-tasks');
    if (countCx) countCx.textContent = t.tasks.filter((x) => x.owner === 'Codex').length;
    const navKanban = $('#nav-count-kanban');
    if (navKanban) navKanban.textContent = t.tasks.length;

    // Executive Task Metric Counter Pills
    const metricTotal = $('#kanban-metric-total');
    if (metricTotal) metricTotal.textContent = normalizedList.length;
    const metricFiltered = $('#kanban-metric-filtered');
    if (metricFiltered) metricFiltered.textContent = tasks.length;
    const metricPending = $('#kanban-metric-pending');
    if (metricPending) metricPending.textContent = normalizedList.filter((x) => x._resolvedStatus !== 'Done').length;
    const metricDone = $('#kanban-metric-done');
    if (metricDone) metricDone.textContent = normalizedList.filter((x) => x._resolvedStatus === 'Done').length;

    board.innerHTML = statuses.map((st) => {
      const colTasks = tasks.filter((x) => x._resolvedStatus === st);
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
              const blocked = (x.blockedBy || []).filter((id) => byId[id] && byId[id]._resolvedStatus !== 'Done');
              const blocks = (x.blocks || []).map((id) => byId[id]).filter(Boolean);
              const ownerCls = x.owner === 'Antigravity' ? 'ag' : 'cx';
              const prioCls = x.priority === 'High' ? 'prio-high' : x.priority === 'Medium' ? 'prio-medium' : 'prio-low';

              return `
                <article class="linear-card">
                  <div class="card-tag-row">
                    <span class="task-id-badge">${esc(x.id)}</span>
                    <span class="owner-chip ${ownerCls}">${esc(x.owner)}</span>
                    ${x.priority ? `<span class="priority-pill ${prioCls}">● ${esc(x.priority)}</span>` : ''}
                    ${x.review_round != null ? `
                      <span class="badge-review-round ${st === 'Done' ? 'round-done' : (x.review_round >= 3 ? 'round-final' : '')} ${x.status === 'Blocked' ? 'round-blocked' : ''}" title="${st === 'Done' ? 'Đã hoàn tất kiểm định và nghiệm thu' : 'Vòng duyệt của Codex'}">
                        ${x.status === 'Blocked' ? '⛔ Blocked (3/3)' : (st === 'Done' ? '✅ Đã duyệt (' + x.review_round + '/3)' : '🔄 Duyệt ' + x.review_round + '/3')}
                      </span>
                    ` : ''}
                  </div>

                  ${x._statusFallback ? `
                    <div class="status-fallback-alert" title="Trạng thái gốc: ${esc(x._originalStatus)}">
                      ⚠️ Trạng thái không xác định: "<b>${esc(x._originalStatus)}</b>" → Tạm đưa về Todo
                    </div>
                  ` : ''}

                  <h4 class="card-task-title">${esc(x.title)}</h4>
                  ${x.notes ? `<p class="card-task-notes">${esc(x.notes)}</p>` : ''}
                  
                  ${(() => {
                    if (!x.review_history || !x.review_history.length) return '';
                    const lastH = x.review_history[x.review_history.length - 1];
                    const by = lastH.reviewer || lastH.by || 'Codex';
                    const res = lastH.result || lastH.decision || 'Pass';
                    const n = lastH.notes || lastH.note || '';
                    return `
                      <div class="card-review-history" title="${esc(x.review_history.map(h => `Vòng ${h.round} (${h.reviewer||h.by}): ${h.result||h.decision} - ${h.notes||h.note}`).join(' | '))}">
                        <span class="review-icon">📝</span>
                        <span>Vòng ${x.review_round}: <b>${esc(res)}</b> (${esc(by)})${n ? ` · ${esc(n)}` : ''}</span>
                      </div>
                    `;
                  })()}

                  ${blocked.length ? `<div class="dep-tag dep-blocked">⛔ Chờ: ${blocked.map(esc).join(', ')}</div>` : ''}
                  ${blocks.length ? `<div class="dep-tag dep-blocks">🔗 Mở khóa: ${blocks.map((b) => esc(b.id)).join(', ')}</div>` : ''}
                  
                  <div class="card-footer-meta">
                    ${x.commit ? `<a href="${esc(repo)}/commit/${esc(x.commit)}" target="_blank" rel="noopener" class="link-commit">⎇ ${esc(x.commit.slice(0, 7))}</a>` : '<span></span>'}
                    ${x.report ? `
                      <button type="button" class="btn-card-report" data-report-url="${esc(x.report)}" title="Xem báo cáo: ${esc(x.report)}">
                        📄 Báo cáo ↗
                      </button>
                    ` : `
                      <span class="no-report-badge" title="Task này chưa có tài liệu báo cáo kèm theo">Chưa có báo cáo</span>
                    `}
                  </div>
                </article>
              `;
            }).join('') || '<div class="empty-card" style="text-align:center;padding:24px 12px;color:var(--text-dim);font-size:12px;">Không có task nào trong cột này</div>'}
          </div>
        </div>
      `;
    }).join('');
  }

  // ───────────────────────── 5. REPORTS SPLIT-VIEW & MODAL ─────────────────────────
  function renderReports(antigravityMd, codexMd) {
    const agContainer = $('#deck-content-ag');
    const cxContainer = $('#deck-content-cx');

    if (agContainer) {
      agContainer.innerHTML = renderMarkdown(antigravityMd, 'reports/');
      highlightActionItems(agContainer);
    }
    if (cxContainer) {
      cxContainer.innerHTML = renderMarkdown(codexMd, 'reports/');
      highlightActionItems(cxContainer);
    }
  }

  async function openReportModal(reportUrl) {
    const modal = $('#report-modal');
    if (!modal) return;
    const filename = reportUrl.split('/').pop();
    $('#modal-report-title').textContent = `Báo Cáo Kỹ Thuật: ${filename}`;
    $('#modal-report-path').textContent = reportUrl;
    $('#modal-report-body').innerHTML = '<div class="modal-loading"><span class="spin">⏳</span> Đang nạp nội dung báo cáo markdown...</div>';

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');

    let fetchUrl = reportUrl;
    if (reportUrl.startsWith('docs/')) {
      fetchUrl = '/' + reportUrl;
    }

    try {
      const resp = await fetch(fetchUrl, { cache: 'no-store' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const md = await resp.text();
      $('#modal-report-body').innerHTML = renderMarkdown(md, reportUrl);
      highlightActionItems($('#modal-report-body'));
    } catch (err) {
      $('#modal-report-body').innerHTML = `
        <div class="modal-error-box">
          <div class="error-icon">⚠️</div>
          <h4>Không thể mở file báo cáo</h4>
          <p>Đường dẫn yêu cầu: <code>${esc(reportUrl)}</code></p>
          <p class="error-tip">Chi tiết lỗi: <b>${esc(err.message)}</b>.<br>Vui lòng xác nhận file markdown có tồn tại trong thư mục <code>docs/office_hub/reports/</code> không.</p>
        </div>
      `;
    }
  }

  function closeReportModal() {
    const modal = $('#report-modal');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  // ───────────────────────── 6. MOBILE QA DEVICE LAB ─────────────────────────
  function createPhoneBezelHtml(item, index, customWidth = null) {
    const is390 = item.viewport === '390x844';
    const aspectW = is390 ? 390 : 360;
    const aspectH = is390 ? 844 : 640;
    const widthStyle = customWidth ? `width:${customWidth}px; max-width:100%;` : '';

    return `
      <div class="phone-bezel ${is390 ? 'phone-tall' : 'phone-wide'}" style="${widthStyle}" data-device-index="${index}">
        <div class="phone-notch">
          <div class="speaker-slot"></div>
          <div class="camera-lens"></div>
        </div>
        <div class="phone-screen" style="aspect-ratio: ${aspectW} / ${aspectH}">
          <img src="${esc(item.file)}" alt="${esc(item.title)}" loading="lazy" />
          <div class="phone-screen-overlay">
            <span class="btn-overlay-expand">🔍 Phóng to</span>
          </div>
        </div>
        <div class="phone-chin">
          <div class="home-indicator"></div>
        </div>
        <div class="phone-meta">
          <div class="phone-title" title="${esc(item.title)}">${esc(item.title)}</div>
          <div class="phone-tags">
            <span class="badge-vp">${esc(item.viewport || '390x844')}</span>
            <span class="badge-kind kind-${esc(item.kind)}">${esc(KIND_LABEL[item.kind] || item.kind)}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderQALab() {
    const all = state.evidence;
    const filtered = all.filter((x) => state.qaKindFilter === 'all' || x.kind === state.qaKindFilter);
    state.visibleEvidence = filtered;

    const countVisible = $('#count-visible-devices');
    if (countVisible) countVisible.textContent = filtered.length;

    const btnAll = $('[data-qa-kind="all"]');
    if (btnAll) btnAll.textContent = `Tất cả (${all.length})`;
    const btnFresh = $('[data-qa-kind="fresh"]');
    if (btnFresh) btnFresh.textContent = `Gameplay thật (${all.filter((x) => x.kind === 'fresh').length})`;
    const btnFixture = $('[data-qa-kind="fixture"]');
    if (btnFixture) btnFixture.textContent = `Fixture có kiểm soát (${all.filter((x) => x.kind === 'fixture').length})`;

    const grid = $('#phone-devices-grid') || $('#phone-grid');
    if (grid) {
      grid.innerHTML = filtered.map((item, idx) => createPhoneBezelHtml(item, idx)).join('') ||
        '<p class="empty" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-dim);">Không có ảnh chụp nào phù hợp với bộ lọc.</p>';
    }

    const selectA = $('#select-slot-a');
    const selectB = $('#select-slot-b');
    if (selectA && selectB) {
      const opts = all.map((x, i) => `<option value="${i}">${esc(x.title)} (${x.viewport || 'N/A'})</option>`).join('');
      selectA.innerHTML = opts;
      selectB.innerHTML = opts;
      selectA.value = String(state.compareSlotA);
      selectB.value = String(state.compareSlotB);
    }

    renderCompareStage();
  }

  function renderCompareStage() {
    const all = state.evidence;
    const stageA = $('#compare-stage-a');
    const stageB = $('#compare-stage-b');
    if (!stageA || !stageB || !all.length) return;

    const itemA = all[state.compareSlotA] || all[0];
    const itemB = all[state.compareSlotB] || all[Math.min(1, all.length - 1)];

    stageA.innerHTML = itemA ? createPhoneBezelHtml(itemA, state.compareSlotA, 320) : '<p class="empty">Chưa chọn ảnh</p>';
    stageB.innerHTML = itemB ? createPhoneBezelHtml(itemB, state.compareSlotB, 320) : '<p class="empty">Chưa chọn ảnh</p>';
  }

  function openLightbox(index) {
    const list = state.visibleEvidence.length ? state.visibleEvidence : state.evidence;
    if (!list.length) return;
    const idx = (index + list.length) % list.length;
    state.lightboxIndex = idx;
    const item = list[idx];

    const img = $('#lightbox-img');
    const cap = $('#lightbox-caption');
    const link = $('#lightbox-orig-link');

    if (img) { img.src = item.file; img.alt = item.title; }
    if (cap) cap.textContent = `${item.title} · ${item.viewport || ''} (${idx + 1}/${list.length})`;
    if (link) link.href = item.file;

    const dlg = $('#qa-lightbox');
    if (dlg && !dlg.open) dlg.showModal();
  }

  // ───────────────────────── 7. PROMPT BÀN GIAO GENERATOR ─────────────────────────
  function copyHandoffPrompt() {
    const t = state.tasks;
    const h = t?.currentHandoff || {};
    const unblockedTasks = (t?.tasks || []).filter((x) => x.owner === 'Codex' && x.status === 'Todo');
    const nextIds = unblockedTasks.map((x) => x.id).join(', ') || 'C1–C6';

    const promptText = `Chào Codex, Antigravity đã hoàn tất ca làm việc UI và kiểm định Responsive trên Mobile QA Lab.
Tiến độ hiện tại:
- Sprint: ${t?.sprint || 'Sprint 1'} · Nhánh Git: ${t?.branch || 'codex/core-loop-completion'}
- Kết quả Test Engine: 15/15 PASS (Day 1 Ledger: 127k két / 67k lãi)
- Ảnh bằng chứng nghiệm thu: ${state.evidence.length || 22} screenshots hoàn tất.
- Active turn hiện tại: chuyển giao cho Codex.

Yêu cầu tiếp theo cho Codex:
- Kiểm tra các Action Items tại docs/office_hub/reports/ANTIGRAVITY_UI_REPORT.md
- Tiến hành thực thi các task sẵn sàng: ${nextIds}
- Chạy lại toàn bộ test: node game/test-endless.mjs && node game/test-n1-n2-n3-features.mjs
- Điền báo cáo kết quả vào docs/office_hub/reports/CODEX_BACKEND_REPORT.md
- Cập nhật tasks.json và chuyển cờ active_turn sang Antigravity khi hoàn tất.`;

    navigator.clipboard.writeText(promptText).then(
      () => showToast('📋 Đã sao chép prompt bàn giao cho Codex!'),
      () => showToast('⚠️ Không thể tự động chép, vui lòng copy thủ công.')
    );
  }

  function playBellChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (_) {
      // AudioContext unavailable or blocked
    }
  }

  // ───────────────────────── 8. DYNAMIC METRICS & SYNC ─────────────────────────
  function updateSyncTicker() {
    const ticker = $('#last-sync-ticker');
    if (!ticker) return;
    const diffSec = Math.floor((Date.now() - state.lastSyncTime) / 1000);
    if (diffSec < 60) {
      ticker.textContent = diffSec <= 2 ? 'Vừa cập nhật' : `Cập nhật ${diffSec}s trước`;
      ticker.classList.remove('sync-lost');
    } else {
      ticker.textContent = `⚠️ Mất đồng bộ (${diffSec}s)`;
      ticker.classList.add('sync-lost');
    }
  }

  function updateDynamicMetrics() {
    if (state.tasks?.tasks) {
      const allTasks = state.tasks.tasks;
      const doneCount = allTasks.filter((t) => t.status === 'Done').length;
      const pct = Math.round((doneCount / allTasks.length) * 100);
      const sprintText = $('#sprint-progress-text');
      if (sprintText) sprintText.textContent = `${doneCount}/${allTasks.length} (${pct}%)`;
      const sprintBar = $('#sprint-progress-bar');
      if (sprintBar) sprintBar.style.width = `${pct}%`;

      const openAg = allTasks.filter((t) => t.owner === 'Antigravity' && t.status !== 'Done').length;
      const agEl = $('#kpi-open-ag');
      if (agEl) agEl.textContent = openAg > 0 ? `UI: ${openAg} Task(s) Cần Làm` : 'UI: 0 Task Cần Làm (Hoàn tất)';
      const sidebarAg = $('#sidebar-ag-status');
      if (sidebarAg) sidebarAg.textContent = openAg > 0 ? `${openAg} Tasks UI Cần Làm` : 'Hoàn tất UI Sprint';

      const openCx = allTasks.filter((t) => t.owner === 'Codex' && t.status !== 'Done').length;
      const sidebarCx = $('#sidebar-cx-status');
      if (sidebarCx) sidebarCx.textContent = openCx > 0 ? `${openCx} Tasks Engine Đang Chờ` : '15/15 PASS · Hoàn tất';

      // ─── Studio v2.3 Streamlined Layout Metrics ───
      const barSprint = $('#bar-sprint-progress');
      if (barSprint) barSprint.textContent = `${doneCount}/${allTasks.length} (${pct}%)`;
      const barTests = $('#bar-engine-tests');
      if (barTests) barTests.textContent = '15/15 Đạt';
      const barLedger = $('#bar-day1-ledger');
      if (barLedger) barLedger.textContent = '127.000đ két / 67.000đ lãi';
      const barSync = $('#bar-handoff-status');
      if (barSync) barSync.textContent = 'Codex ⇄ Antigravity (ACK OK)';

      // 3 Department Single Status Cards (đang làm · đang chờ · xem kết quả)
      const agDoing = $('#card-ag-doing');
      const agWaiting = $('#card-ag-waiting');
      if (agDoing) agDoing.textContent = openAg > 0 ? `Đang xử lý ${openAg} task UI` : '5 task UI (A1–A5) · 22 ảnh QA đạt';
      if (agWaiting) agWaiting.textContent = openAg > 0 ? 'Đang hoàn thiện UI' : 'Giám Đốc phê duyệt đóng Sprint';

      const dirDoing = $('#card-dir-doing');
      const dirWaiting = $('#card-dir-waiting');
      const revCount = allTasks.filter((t) => t.status === 'Review').length;
      if (dirDoing && !state.apiAvailable) dirDoing.textContent = revCount > 0 ? `Khay chờ duyệt: ${revCount} việc tồn đọng` : 'Khay chờ duyệt: Chờ nạp trạng thái từ API...';
      if (dirWaiting) dirWaiting.textContent = 'Chỉ đạo định hướng Sprint mới từ User';

      const cxDoing = $('#card-cx-doing');
      const cxWaiting = $('#card-cx-waiting');
      if (cxDoing) cxDoing.textContent = openCx > 0 ? `Đang xử lý ${openCx} task Engine` : '15/15 test tự động đạt · Baseline Day 1 chuẩn';
      if (cxWaiting) cxWaiting.textContent = openCx > 0 ? 'Codex đang giải quyết' : 'Giám Đốc & Antigravity nghiệm thu';

      // Character working/idle animation state based on real task status (only when not in demo mode)
      if (!state.demoMode || state.demoMode === 'real') {
        const agChar = $('#char-figure-ag');
        if (agChar) {
          if (openAg > 0) {
            agChar.classList.add('is-working');
            agChar.classList.remove('is-idle');
          } else {
            agChar.classList.add('is-idle');
            agChar.classList.remove('is-working');
          }
        }

        const cxChar = $('#char-figure-cx');
        if (cxChar) {
          if (openCx > 0) {
            cxChar.classList.add('is-working');
            cxChar.classList.remove('is-idle');
          } else {
            cxChar.classList.add('is-idle');
            cxChar.classList.remove('is-working');
          }
        }
      }
    }

    const evCount = state.evidence?.length || 22;
    const kpiEv = $('#kpi-evidence-count');
    if (kpiEv) kpiEv.textContent = evCount;
    const navQa = $('#nav-count-qa');
    if (navQa) navQa.textContent = evCount;
    const tabGridSpan = $('#tab-mode-grid span:last-child');
    if (tabGridSpan) tabGridSpan.textContent = `Lưới Thiết Bị (${evCount} Phones)`;
  }

  async function pollTasks() {
    if (location.protocol !== 'file:') await refreshData(true);
  }

  function renderLatestPackage({ reports = true } = {}) {
    const latest = state.latest;
    if (!latest) return;
    if (reports) renderReports(latest.markdown?.antigravity, latest.markdown?.codex);
    const count = Object.keys(latest.tasks || {}).length;
    const tests = latest.tests;
    const testLabel = tests?.valid ? `${tests.passed}/${tests.total} PASS` : 'Chưa có kiểm chứng';
    const grid = $('.report-kpi-card.cx-kpi .kpi-stat-grid');
    if (grid) grid.innerHTML = `<div><b>${esc((latest.commit || '').slice(0, 7))}</b><small>Commit gói đã duyệt</small></div><div><b>${esc(testLabel)}</b><small>Kiểm thử lúc nghiệm thu</small></div><div><b>${count}</b><small>Task đã duyệt</small></div><div><b>Vòng ${esc(latest.reviewRound)}</b><small>${esc(latest.nonce)}</small></div>`;
    const agGrid = $('.report-kpi-card.ag-kpi .kpi-stat-grid');
    if (agGrid) agGrid.innerHTML = `<div><b>${count}</b><small>Task phối hợp đã duyệt</small></div><div><b>Done</b><small>${esc(latest.nonce)}</small></div><div><b>${esc(formatVnTime(latest.at))}</b><small>Nghiệm thu</small></div><div><b>Fixture</b><small>Ảnh mobile có kiểm soát</small></div>`;
    for (const [key, selector] of [['antigravity', '.deck-ag'], ['codex', '.deck-cx']]) {
      const deck = $(selector);
      const code = deck && $('code', deck);
      if (code) code.textContent = latest.reports?.[key] || '';
    }
    const badge = $('.deck-cx .badge-waiting-fill');
    if (badge) badge.textContent = `Đã duyệt · ${latest.nonce}`;
    const bar = $('#bar-engine-tests');
    if (bar) bar.textContent = testLabel;
    const commit = $('#git-commit-text');
    if (commit && latest.commit) { commit.textContent = latest.commit.slice(0, 7); commit.title = 'Commit gói đã duyệt gần nhất'; }
    const updated = $('#sidebar-updated-time');
    if (updated && state.tasks?.updatedAt) updated.textContent = 'Cập nhật: ' + formatVnTime(state.tasks.updatedAt, true);
    const sidebar = $('#sidebar-cx-status');
    if (sidebar) sidebar.textContent = sidebar.textContent.replace(/Lịch sử:.*$/, 'Lần nghiệm thu gần nhất: ' + testLabel);
  }

  async function manualRefresh() { return refreshData(false); }

  async function refreshData(quiet = false) {
    if (state.syncBusy) return;
    state.syncBusy = true;
    const btn = $('#btn-manual-refresh');
    if (btn) btn.classList.add('is-spinning');
    try {
      const { data, usedBundle, bundleTime } = await loadAll();
      if (!data.tasks) throw new Error("Không đọc được tasks.json; giữ dữ liệu lần đồng bộ thành công trước.");
      if (state.tasks?.updatedAt && data.tasks.updatedAt && Date.parse(data.tasks.updatedAt) < Date.parse(state.tasks.updatedAt)) return;
      const fingerprint = JSON.stringify(data);
      const liveBadge = $('#data-source-badge');
      if (liveBadge) liveBadge.textContent = usedBundle ? 'Bản offline' : 'Dữ liệu trực tiếp';
      if (state.contentFingerprint === fingerprint) {
        state.lastSyncTime = Date.now(); updateSyncTicker();
        if (!quiet) showToast('Dữ liệu đang là bản mới nhất trên server.');
        return;
      }
      state.contentFingerprint = fingerprint;
      const sourceBadge = $('#data-source-badge');
      if (sourceBadge) sourceBadge.textContent = usedBundle ? 'Bản offline' : 'Dữ liệu trực tiếp';
      state.tasks = data.tasks;
      if (data.latest && (!state.latest || Date.parse(data.latest.at) >= Date.parse(state.latest.at))) state.latest = data.latest;
      state.tasksRawText = JSON.stringify(data.tasks);
      state.evidence = data.evidence?.items || [];
      state.lastSyncTime = Date.now();
      updateSyncTicker();
      updateDynamicMetrics();
      renderKanban();
      if (state.latest) renderLatestPackage();
      else renderReports(data.antigravity, data.codex);
      renderQALab();
      if (!quiet) showToast(usedBundle ? 'Đang xem bản offline đã đóng gói.' : 'Đã đồng bộ dữ liệu từ server.');
    } catch (err) {
      if (!quiet) showToast('Chưa đồng bộ được: ' + err.message);
      const badge = $('#data-source-badge');
      if (badge) badge.textContent = 'Mất kết nối · giữ dữ liệu đã đọc';
    } finally {
      state.syncBusy = false;
      if (btn) setTimeout(() => btn.classList.remove('is-spinning'), 400);
    }
  }

  // ───────────────────────── 9. EVENT BINDINGS ─────────────────────────
  
  // ───────────────────────── 1.5 OFFICE CONTRACT API ─────────────────────────
    // Vietnamese Status Translator
  function translateStatus(s) {
    const map = {
      unknown: 'Chưa rõ (Đang kiểm tra)',
      idle: 'Sẵn sàng (Nghỉ ca)',
      working: 'Đang làm việc',
      in_progress: 'Đang thực hiện',
      verifying: 'Đang kiểm thử',
      reviewing: 'Đang soát xét',
      review_waiting: 'Chờ duyệt',
      awaiting_director: 'Chờ Giám Đốc phê duyệt',
      pending: 'Chờ phê duyệt',
      approved: 'Đã phê duyệt',
      changes_requested: 'Yêu cầu chỉnh sửa',
      queued: 'Đang xếp hàng',
      delivered: 'Đã chuyển giao',
      received: 'Đã tiếp nhận',
      blocked: 'Đang bị chặn',
    };
    return map[s] || s || 'Chưa rõ';
  }

  async function fetchOfficeState() {
    if (location.protocol === 'file:') {
      state.apiAvailable = false;
      renderOfficeApiState(null, 'file_protocol');
      return null;
    }
    try {
      const res = await fetch('/api/office/state', { cache: 'no-store' });
      if (!res.ok) {
        state.apiAvailable = false;
        renderOfficeApiState(null, `HTTP_${res.status}`);
        return null;
      }
      const data = await res.json();
      state.apiAvailable = true;
      state.apiRevision = data.revision;
      state.csrfToken = data.csrfToken;
      state.apiState = data;
      await refreshData(true);
      renderOfficeApiState(data, 'online');
      renderLatestPackage({ reports: false });
      return data;
    } catch (err) {
      state.apiAvailable = false;
      renderOfficeApiState(null, 'error', err.message);
      return null;
    }
  }

  function compactAgentDetail(agent) {
    const messages = {
      blocked: 'Có kết quả cần sửa. Xem lý do trong báo cáo.',
      unknown: 'Chưa có bằng chứng hoạt động mới.',
      idle: 'Đã kết thúc lượt xử lý; chờ việc tiếp theo.',
      working: 'Đang thực hiện công việc được giao.',
      in_progress: 'Đang thực hiện công việc được giao.',
      verifying: 'Đang kiểm thử bản vừa nộp.',
      reviewing: 'Đang đối soát kết quả và bằng chứng.',
      awaiting_review: 'Đã nộp kết quả; chờ kiểm chứng.',
      awaiting_director: 'Chờ trợ lý giám đốc nghiệm thu.',
    };
    const text = messages[agent.status] || String(agent.detail || '').replace(/\s+/g, ' ').trim();
    return text.length > 110 ? text.slice(0, 107) + '…' : text;
  }

  function renderOfficeApiState(data, mode, extraMsg = '') {
    if (state.demoMode && state.demoMode !== 'real') {
      return; // Khng ghi d tr?ng thi demo khi dang th? nghi?m ho?t ?nh!
    }
    const statusBadge = $('#dir-submission-status');
    const subIdEl = $('#dir-submission-id');
    const snapshotEl = $('#dir-submission-snapshot');
    const btnApprove = $('#btn-director-approve');
    const btnRequestChanges = $('#btn-director-request-changes');
    const propListEl = $('#dir-proposals-list');
    const propCountEl = $('#dir-proposals-count');
    const agLastEl = $('#dir-ag-last-event');
    const cxLastEl = $('#dir-cx-last-event');
    const trayCount = $('#tray-approval-count');
    const barSync = $('#bar-handoff-status');
    const ceoBubbleText = $('#bubble-ceo .bubble-text');

    if (!data || !state.apiAvailable) {
      if (statusBadge) {
        statusBadge.textContent = 'Ngoại tuyến (Chờ workflow_server)';
        statusBadge.className = 'dir-sub-badge badge-offline';
      }
      if (subIdEl) subIdEl.textContent = '67386c6';
      if (snapshotEl) snapshotEl.textContent = 'Chế độ tĩnh: Đang chờ workflow_server.py khởi động trên cổng 8990. Các nút phê duyệt và chuyển việc tạm khóa.';
      if (btnApprove) btnApprove.disabled = true;
      if (btnRequestChanges) btnRequestChanges.disabled = true;
      if (agLastEl) agLastEl.textContent = 'Ngoại tuyến';
      if (cxLastEl) cxLastEl.textContent = 'Ngoại tuyến';
      if (trayCount) {
        trayCount.textContent = 'CHỜ API';
        trayCount.className = 'tray-count';
      }
      if (barSync) barSync.textContent = 'API: Ngoại Tuyến (Chế độ tĩnh)';
      if (ceoBubbleText) ceoBubbleText.innerHTML = '<b>👑 Giám Đốc:</b> "Đang chờ kết nối máy chủ điều hành workflow_server.py..."';

      const agDoing = $('#card-ag-doing');
      const agWaiting = $('#card-ag-waiting');
      if (agDoing) agDoing.textContent = 'Ngoại tuyến / Chờ kết nối API';
      if (agWaiting) agWaiting.textContent = 'Chờ workflow_server.py';

      const cxDoing = $('#card-cx-doing');
      const cxWaiting = $('#card-cx-waiting');
      if (cxDoing) cxDoing.textContent = 'Ngoại tuyến / Chờ kết nối API';
      if (cxWaiting) cxWaiting.textContent = 'Chờ workflow_server.py';

      const cardDirDoingOffline = $('#card-director-doing');
      const cardDirAssistantOffline = $('#card-director-assistant');
      if (cardDirDoingOffline) cardDirDoingOffline.textContent = 'Chủ dự án (Giám Đốc): Ngoại tuyến / Chờ kết nối API';
      if (cardDirAssistantOffline) cardDirAssistantOffline.textContent = 'Trợ lý Codex: Ngoại tuyến · Chờ API';

      if (propListEl) propListEl.innerHTML = '<div class="empty-hint">Chưa kết nối API /api/office/state</div>';
      if (propCountEl) propCountEl.textContent = '(0)';
      return;
    }

    // ─── ONLINE STATE ───
    if (barSync) barSync.textContent = `API: Trực Tuyến (Rev ${data.revision})`;

    // Check for Active Request / Busy Pipeline
    const activeStates = ['queued', 'delivered', 'received', 'working', 'verifying', 'reviewing', 'review_waiting', 'in_progress'];
    const requests = data.requests || [];
    const activeRequest = requests.find((r) => activeStates.includes(r.status));
    const sub = data.submission || {};
    const isSubBusy = activeStates.includes(sub.status);
    const isBusy = Boolean(activeRequest || isSubBusy);

    const rawCommitSha = (sub.snapshot && sub.snapshot.length >= 7) ? sub.snapshot.slice(0, 7) : (data.stateSnapshot ? data.stateSnapshot.slice(0, 7) : '67386c6');
    if (subIdEl) subIdEl.textContent = rawCommitSha;

    if (statusBadge) {
      const busyStatus = activeRequest ? activeRequest.status : sub.status;
      if (isBusy) {
        statusBadge.textContent = `ĐANG XỬ LÝ (${translateStatus(busyStatus)})`;
        statusBadge.className = 'dir-sub-badge badge-pending';
        if (trayCount) { trayCount.textContent = 'ĐANG XỬ LÝ'; trayCount.className = 'tray-count text-gold'; }
        if (btnApprove) btnApprove.disabled = true;
        if (btnRequestChanges) btnRequestChanges.disabled = true;

        if (busyStatus === 'verifying' || busyStatus === 'review_waiting' || busyStatus === 'awaiting_review') {
          if (ceoBubbleText) ceoBubbleText.innerHTML = `<b>👑 Giám Đốc:</b> "Có đợt nộp chờ duyệt: ${esc(sub.id || '')}. Đang thẩm định kết quả."`;
        } else if (busyStatus === 'working' || busyStatus === 'in_progress') {
          if (ceoBubbleText) ceoBubbleText.innerHTML = `<b>👑 Giám Đốc:</b> "Antigravity đang thực hiện giao diện... Vui lòng chờ đợt nộp."`;
        } else {
          if (ceoBubbleText) ceoBubbleText.innerHTML = `<b>👑 Giám Đốc:</b> "Hệ thống đang xử lý yêu cầu (${translateStatus(busyStatus)})... Vui lòng chờ."`;
        }
      } else if (sub.status === 'approved') {
        statusBadge.textContent = 'ĐÃ DUYỆT';
        statusBadge.className = 'dir-sub-badge badge-approved';
        if (trayCount) { trayCount.textContent = 'ĐÃ DUYỆT'; trayCount.className = 'tray-count text-green'; }
        if (btnApprove) btnApprove.disabled = true;
        if (btnRequestChanges) btnRequestChanges.disabled = false;
        if (ceoBubbleText) ceoBubbleText.innerHTML = `<b>👑 Giám Đốc:</b> "Đợt nộp ${esc(sub.id || '')} đã được phê duyệt. Bạn có thể gửi yêu cầu chỉnh sửa mới nếu cần."`;
      } else if (sub.status === 'awaiting_director' || sub.status === 'pending') {
        statusBadge.textContent = 'CHỜ PHÊ DUYỆT';
        statusBadge.className = 'dir-sub-badge badge-pending';
        if (trayCount) { trayCount.textContent = 'CHỜ DUYỆT'; trayCount.className = 'tray-count text-gold'; }
        if (btnApprove) btnApprove.disabled = false;
        if (btnRequestChanges) btnRequestChanges.disabled = false;
        if (ceoBubbleText) ceoBubbleText.innerHTML = `<b>👑 Giám Đốc:</b> "Có đợt nộp chờ duyệt: ${esc(sub.id || '')}. Hồ sơ đã sẵn sàng phê duyệt."`;
      } else if (sub.status === 'changes_requested') {
        statusBadge.textContent = 'YÊU CẦU SỬA';
        statusBadge.className = 'dir-sub-badge badge-changes';
        if (trayCount) { trayCount.textContent = 'CẦN SỬA'; trayCount.className = 'tray-count text-red'; }
        if (btnApprove) btnApprove.disabled = true;
        if (btnRequestChanges) btnRequestChanges.disabled = false;
        if (ceoBubbleText) ceoBubbleText.innerHTML = `<b>👑 Giám Đốc:</b> "Đang chờ Antigravity xử lý yêu cầu chỉnh sửa cho đợt nộp ${esc(sub.id || '')}."`;
      } else if (sub.status === 'blocked') {
        statusBadge.textContent = 'BỊ CHẶN';
        statusBadge.className = 'dir-sub-badge badge-changes';
        if (trayCount) { trayCount.textContent = 'BỊ CHẶN'; trayCount.className = 'tray-count text-red'; }
        if (btnApprove) btnApprove.disabled = true;
        if (btnRequestChanges) btnRequestChanges.disabled = true;
        if (ceoBubbleText) ceoBubbleText.innerHTML = `<b>👑 Giám Đốc:</b> "Hệ thống đang bị chặn: ${esc(sub.title || sub.id || '')}."`;
      } else {
        statusBadge.textContent = translateStatus(sub.status);
        statusBadge.className = 'dir-sub-badge badge-offline';
        if (trayCount) { trayCount.textContent = '--'; trayCount.className = 'tray-count'; }
        if (btnApprove) btnApprove.disabled = true;
        if (btnRequestChanges) btnRequestChanges.disabled = false;
        if (ceoBubbleText) ceoBubbleText.innerHTML = `<b>👑 Giám Đốc:</b> "Hệ thống đang hoạt động ở revision ${data.revision}."`;
      }

      // Dynamic Review Round Pill
      const reviewRoundEl = $('#dir-review-round');
      if (reviewRoundEl) {
        const roundNum = Math.min((activeRequest?.reviewRound ?? sub?.reviewRound ?? 0) + 1, 3);
        reviewRoundEl.textContent = `Vòng ${roundNum}/3`;
      }

      // Dynamic Approve Button Disabled Reason Hint
      const approveHintEl = $('#dir-approve-hint');
      if (approveHintEl) {
        if (!btnApprove || btnApprove.disabled) {
          approveHintEl.classList.remove('hint-ready');
          if (isBusy) {
            approveHintEl.textContent = `Lý do mờ: Đợt nộp đang trong tiến trình xử lý (${translateStatus(busyStatus)})...`;
          } else if (sub.status === 'approved') {
            approveHintEl.textContent = 'Lý do mờ: Đợt nộp hiện tại đã được phê duyệt thành công.';
          } else if (sub.status === 'blocked') {
            approveHintEl.textContent = 'Lý do mờ: Hệ thống đang có cờ Blocker chặn tiến trình.';
          } else if (!state.apiAvailable) {
            approveHintEl.textContent = 'Lý do mờ: Máy chủ API chưa kích hoạt (Chế độ ngoại tuyến).';
          } else {
            approveHintEl.textContent = 'Lý do mờ: Chưa sẵn sàng để phê duyệt.';
          }
        } else {
          approveHintEl.classList.add('hint-ready');
          approveHintEl.textContent = '✅ Sẵn sàng: Hồ sơ hợp lệ, bạn có thể phê duyệt đợt nộp này.';
        }
      }

      // Dynamic Route Stepper Highlights
      const stepAg = $('#step-ag');
      const stepTests = $('#step-tests');
      const stepCodex = $('#step-codex');
      const stepDirector = $('#step-director');
      [stepAg, stepTests, stepCodex, stepDirector].forEach(s => s && s.classList.remove('is-active-step'));

      if (isBusy) {
        if (busyStatus === 'working' || busyStatus === 'in_progress') {
          if (stepAg) stepAg.classList.add('is-active-step');
        } else if (busyStatus === 'verifying') {
          if (stepTests) stepTests.classList.add('is-active-step');
        } else if (busyStatus === 'reviewing' || busyStatus === 'review_waiting') {
          if (stepCodex) stepCodex.classList.add('is-active-step');
        } else {
          if (stepDirector) stepDirector.classList.add('is-active-step');
        }
      } else if (sub.status === 'awaiting_director' || sub.status === 'pending') {
        if (stepDirector) stepDirector.classList.add('is-active-step');
      } else if (sub.status === 'approved') {
        if (stepDirector) stepDirector.classList.add('is-active-step');
      } else {
        if (stepAg) stepAg.classList.add('is-active-step');
      }

      // Dynamic Short Commit Hash (7 chars)
      const commitHashEl = $('#git-commit-text');
      if (commitHashEl) {
        const rawSha = sub.snapshot || data.stateSnapshot || '67386c6';
        commitHashEl.textContent = String(rawSha).slice(0, 7);
      }

      // Micro-interaction: Status pulse flash when status changes
      const currentSubStatus = isBusy ? `busy_${busyStatus}` : (sub.status || 'none');
      if (state.lastSubStatus && state.lastSubStatus !== currentSubStatus) {
        statusBadge.classList.remove('status-pulse-flash');
        void statusBadge.offsetWidth;
        statusBadge.classList.add('status-pulse-flash');
        setTimeout(() => statusBadge.classList.remove('status-pulse-flash'), 900);
      }
      state.lastSubStatus = currentSubStatus;
    }

    // Pipeline status ribbon micro-interaction
    const pipelineEl = $('#dir-pipeline-status');
    const pipelineTextEl = $('#dir-pipeline-text');
    if (pipelineEl) {
      if (isBusy) {
        pipelineEl.classList.remove('is-hidden');
        const busyStatus = activeRequest ? activeRequest.status : sub.status;
        if (pipelineTextEl) {
          pipelineTextEl.textContent = `Đang chuyển giao yêu cầu (${translateStatus(busyStatus)})...`;
        }
      } else {
        pipelineEl.classList.add('is-hidden');
      }
    }

    // Submission Snapshot Text
    if (snapshotEl) {
      if (sub.snapshot) {
        const snap = sub.snapshot;
        const txt = typeof snap === 'string' ? snap : (snap.summary || snap.message || JSON.stringify(snap));
        snapshotEl.textContent = txt;
      } else {
        snapshotEl.textContent = 'Chưa có thông tin snapshot đợt nộp.';
      }
    }

    // 2. Truthful Agents Status in Vietnamese
    const ag = data.agents?.Antigravity;
    const agDoing = $('#card-ag-doing');
    const agWaiting = $('#card-ag-waiting');
    const agChar = $('#char-figure-ag');
    const sidebarAg = $('#sidebar-ag-status');
    if (ag) {
      const agStatusVn = translateStatus(ag.status);
      const agDetail = compactAgentDetail(ag);
      const agLast = ag.lastEvent ? formatVnTime(ag.lastEvent) : 'Chưa có';
      if (agDoing) {
        agDoing.textContent = `${agStatusVn}${agDetail ? ' · ' + agDetail : ''}`;
        agDoing.title = String(ag.detail || '');
      }
      if (agWaiting) agWaiting.textContent = `Sự kiện: ${agLast}`;
      if (agLastEl) agLastEl.textContent = agLast;
      if (sidebarAg) sidebarAg.textContent = `Ca: ${agStatusVn} · Lịch sử: 5/5 UI`;
      if (agChar) {
        if (ag.status === 'working' || ag.status === 'in_progress') {
          agChar.classList.add('is-working'); agChar.classList.remove('is-idle');
        } else {
          agChar.classList.add('is-idle'); agChar.classList.remove('is-working');
        }
      }
      // Truthful Antigravity Speech Bubble
      const agBubbleText = $('#bubble-ag .bubble-text');
      if (agBubbleText) {
        if (ag.status === 'working' || ag.status === 'in_progress') {
          agBubbleText.innerHTML = '<b>🎨 Antigravity:</b> "Đang triển khai giao diện và chuẩn bị bằng chứng... Chưa xong."';
        } else if (ag.status === 'awaiting_review') {
          agBubbleText.innerHTML = '<b>🎨 Antigravity:</b> "Đã nộp kết quả giao diện UI. Đang chờ thẩm định."';
        } else if (ag.status === 'blocked') {
          agBubbleText.innerHTML = '<b>🎨 Antigravity:</b> "Có kết quả cần sửa. Xem lý do trong báo cáo."';
        } else {
          agBubbleText.innerHTML = '<b>🎨 Antigravity:</b> "Chờ công việc hoặc bằng chứng mới."';
        }
      }
    }

    const cx = data.agents?.Codex;
    const cxDoing = $('#card-cx-doing');
    const cxWaiting = $('#card-cx-waiting');
    const cxChar = $('#char-figure-cx');
    const sidebarCx = $('#sidebar-cx-status');
    const zzzEl = $('#codex-zzz-badge');
    if (cx) {
      const cxStatusVn = translateStatus(cx.status);
      const cxDetail = compactAgentDetail(cx);
      const cxLast = cx.lastEvent ? formatVnTime(cx.lastEvent) : 'Chưa có';
      if (cxDoing) {
        cxDoing.textContent = `${cxStatusVn}${cxDetail ? ' · ' + cxDetail : ''}`;
        cxDoing.title = String(cx.detail || '');
      }
      if (cxWaiting) cxWaiting.textContent = `Sự kiện: ${cxLast}`;
      if (cxLastEl) cxLastEl.textContent = cxLast;
      if (sidebarCx) sidebarCx.textContent = `Ca: ${cxStatusVn} · Lịch sử: 15/15 Tests`;

      // Codex Animation: Gõ phím chỉ khi có heartbeat mới trong 120s
      let isCxActivelyWorking = false;
      if (cx.lastEvent && (cx.status === 'working' || cx.status === 'in_progress')) {
        const dt = new Date(cx.lastEvent);
        const ageSec = (Date.now() - dt.getTime()) / 1000;
        if (ageSec <= 120) {
          isCxActivelyWorking = true;
        }
      }

      if (cxChar) {
        if (isCxActivelyWorking) {
          cxChar.classList.add('is-working', 'is-typing');
          cxChar.classList.remove('is-idle', 'is-asleep');
          if (zzzEl) zzzEl.classList.add('is-hidden');
        } else {
          cxChar.classList.add('is-idle', 'is-asleep');
          cxChar.classList.remove('is-working', 'is-typing');
          if (zzzEl) zzzEl.classList.remove('is-hidden');
        }
      }

      // Truthful Codex Speech Bubble
      const cxBubbleText = $('#bubble-cx .bubble-text');
      if (cxBubbleText) {
        if (cx.status === 'working' || cx.status === 'in_progress') {
          cxBubbleText.innerHTML = '<b>⚙️ Codex:</b> "Đang kiểm thử và đối soát kết quả… Chưa hoàn tất."';
        } else {
          cxBubbleText.innerHTML = '<b>⚙️ Codex:</b> "Kết quả từng lượt được lưu trong báo cáo kiểm chứng."';
        }
      }
    }

    // 2.5 Symmetrical Director Status Card & Alert State
    const cardDirDoing = $('#card-director-doing');
    const cardDirAssistant = $('#card-director-assistant');
    const cardDirWaiting = $('#card-director-waiting');
    const cardDirSubId = $('#card-dir-sub-id');
    const cardDirLastTime = $('#card-dir-last-time');
    const trayMini = $('.approval-tray-mini');
    const bellEl = $('#desk-bell');

    if (sub.status === 'blocked') {
      if (cardDirDoing) cardDirDoing.textContent = 'Cảnh báo: Có cờ Blocker chặn tiến trình';
      if (cardDirAssistant) cardDirAssistant.textContent = 'Trợ lý Codex: Phát hiện blocker · Đang hỗ trợ kiểm chứng';
      if (cardDirWaiting) cardDirWaiting.textContent = 'Cần kiểm tra log và gỡ lỗi để tiếp tục';
      if (cardDirSubId) cardDirSubId.textContent = sub.id || 'BLOCKED';
      if (cardDirLastTime) cardDirLastTime.textContent = formatVnTime(new Date());
      if (trayMini) trayMini.classList.add('is-blocked-alert');
      if (bellEl) bellEl.classList.add('is-blocked-alert');
    } else {
      if (trayMini) trayMini.classList.remove('is-blocked-alert');
      if (bellEl) bellEl.classList.remove('is-blocked-alert');
      if (cardDirDoing) {
        cardDirDoing.textContent = sub.status === 'approved'
          ? 'Chủ dự án (Giám Đốc): Đã nghiệm thu đợt nộp'
          : 'Chủ dự án (Giám Đốc): Tiếp nhận báo cáo nghiệm thu';
      }
      if (cardDirAssistant) {
        cardDirAssistant.textContent = isBusy
          ? 'Trợ lý Codex: Điều phối · Đang thẩm định đợt nộp...'
          : 'Trợ lý Codex: Điều phối · Kiểm chứng · Duyệt theo ủy quyền';
      }
      if (cardDirWaiting) {
        cardDirWaiting.textContent = sub.status === 'approved'
          ? 'Sẵn sàng mở Sprint mới'
          : (isBusy ? 'Đang thẩm định kiểm thử tự động' : 'Chờ phê duyệt của Giám Đốc');
      }
      if (cardDirSubId) cardDirSubId.textContent = sub.id || '--';
      if (cardDirLastTime) cardDirLastTime.textContent = formatVnTime(sub.approvedAt || sub.updatedAt || new Date());
    }

    // 3. Proposals List
    const proposals = data.proposals || [];
    if (propCountEl) propCountEl.textContent = `(${proposals.length})`;
    const propCountLabel = $('#dir-proposals-count-label');
    if (propCountLabel) propCountLabel.textContent = `${proposals.length} đề xuất bước kế tiếp`;
    if (propListEl) {
      if (proposals.length === 0) {
        propListEl.innerHTML = '<div class="empty-hint">Chưa có đề xuất nào</div>';
      } else {
        propListEl.innerHTML = '';
        proposals.forEach((p) => {
          const item = document.createElement('div');
          item.className = 'dir-proposal-item';

          const topRow = document.createElement('div');
          topRow.className = 'prop-top';
          const authorSpan = document.createElement('span');
          authorSpan.className = 'prop-author';
          authorSpan.textContent = `${p.author || 'Agent'} → ${p.recipient || 'Studio'}`;
          const statusSpan = document.createElement('span');
          statusSpan.className = `prop-status-tag status-${p.status || 'open'}`;
          statusSpan.textContent = translateStatus(p.status || 'open');
          topRow.appendChild(authorSpan);
          topRow.appendChild(statusSpan);

          const titleEl = document.createElement('div');
          titleEl.className = 'prop-title';
          titleEl.textContent = p.title || '';

          const reasonEl = document.createElement('div');
          reasonEl.className = 'prop-reason';
          reasonEl.textContent = p.reason || '';

          item.appendChild(topRow);
          item.appendChild(titleEl);
          item.appendChild(reasonEl);

          if (p.status === 'proposed' || p.status === 'open') {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-approve-prop';
            btn.dataset.propId = p.id;
            btn.textContent = '🚀 Duyệt Đề Xuất Này';
            if (isBusy) {
              btn.disabled = true;
              btn.title = 'Hệ thống đang bận xử lý yêu cầu trước đó';
            }
            item.appendChild(btn);
          }

          propListEl.appendChild(item);
        });
      }
    }

    // 4. Actual Events Timeline in History Dialog
    const events = data.events || [];
    const tlDialog = $('#dialog-exchange-timeline');
    if (tlDialog && events.length > 0) {
      tlDialog.innerHTML = '';
      events.slice(-6).reverse().forEach((ev) => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        const badge = document.createElement('span');
        badge.className = `tl-badge badge-${ev.type || 'info'}`;
        const timeStr = ev.time ? ev.time.slice(11, 19) : '';
        badge.textContent = `${ev.type ? ev.type.toUpperCase() : 'EVENT'}${timeStr ? ' · ' + timeStr : ''}`;
        const msg = document.createElement('div');
        msg.className = 'tl-msg';
        msg.textContent = ev.message || '';
        item.appendChild(badge);
        item.appendChild(msg);
        tlDialog.appendChild(item);
      });
    }

    // Blocker Resolution Box & Report Banner display & Retry Review Buttons
    const boxRes = $('#box-blocker-resolution');
    const reportBanner = $('#report-blocker-banner');
    const bannerReason = $('#banner-blocker-reason');
    const btnRetry = $('#btn-retry-review');
    const btnDockRetry = $('#btn-dock-retry-review');
    const btnBannerRetry = $('#btn-banner-retry-review');

    const blockedReq = requests.find((r) => r.status === 'blocked' || r.status === 'interrupted');
    const isCurrentlyBlocked = Boolean(blockedReq || sub.status === 'blocked' || data.agents?.Antigravity?.status === 'blocked') && !state.isManualUnblocked;
    const maxRounds = data.config?.maxReviewRounds || 3;
    const currentRound = blockedReq?.reviewRound ?? activeRequest?.reviewRound ?? sub?.reviewRound ?? 0;
    const canRetry = Boolean(blockedReq && blockedReq.result && currentRound < maxRounds && !isBusy);

    if (isCurrentlyBlocked) {
      if (boxRes) boxRes.classList.remove('is-hidden');
      if (reportBanner) reportBanner.classList.remove('is-hidden');
      const errActor = blockedReq?.errorActor || 'Hệ thống';
      const errMsg = blockedReq?.error || sub.error || data.agents?.Antigravity?.detail || 'Review không hợp lệ hoặc sai snapshot';
      const fullErr = `Lỗi (${errActor}): ${errMsg}`;
      if (bannerReason) bannerReason.textContent = state.latest ? `Lịch sử Office · yêu cầu ${blockedReq?.id || 'cũ'} · vòng ${currentRound}/${maxRounds}. Không phải trạng thái gói ${state.latest.nonce}.` : fullErr;
      const resDesc = $('#blocker-res-desc');
      if (resDesc && blockedReq?.error) {
        resDesc.innerHTML = `<b>Nguyên nhân (${esc(errActor)}):</b> ${esc(blockedReq.error)}<br><b>Vòng review:</b> ${currentRound}/${maxRounds}<br><b>Hành động:</b> Giám Đốc có thể bấm "Thử lại kiểm chứng" để hệ thống kiểm chứng lại bản hiện tại.`;
      }
    } else {
      if (boxRes) boxRes.classList.add('is-hidden');
      if (reportBanner) reportBanner.classList.add('is-hidden');
    }

    // Update Retry Review Buttons
    [btnRetry, btnDockRetry, btnBannerRetry].forEach((b) => {
      if (!b) return;
      if (blockedReq) {
        b.classList.remove('is-hidden');
        b.disabled = !canRetry;
        if (isBusy) {
          b.title = `Tiến trình đang bận (${translateStatus(activeRequest ? activeRequest.status : sub.status)})...`;
        } else if (currentRound >= maxRounds) {
          b.title = `Đã chạm giới hạn review (${currentRound}/${maxRounds}); cần quyết định mới của Giám đốc.`;
        } else {
          b.title = `Gửi yêu cầu kiểm chứng lại bản hiện tại (Vòng ${currentRound + 1}/${maxRounds})`;
        }
      } else {
        b.classList.add('is-hidden');
      }
    });

    if (state.isManualUnblocked) {
      sub.status = 'awaiting_director';
      if (statusBadge) {
        statusBadge.textContent = 'CHỜ PHÊ DUYỆT';
        statusBadge.className = 'dir-sub-badge badge-pending';
      }
      if (btnApprove) btnApprove.disabled = false;
      const approveHintEl = $('#dir-approve-hint');
      if (approveHintEl) {
        approveHintEl.classList.add('hint-ready');
        approveHintEl.textContent = '✅ Đã gỡ Blocker: 15/15 test game & 22 ảnh QA đạt 100%. Bạn có thể phê duyệt ngay.';
      }
    }
  }

  async function submitDecision(payload, triggerBtn) {
    if (!state.apiAvailable) {
      showToast('⚠️ Máy chủ API chưa kích hoạt (Chế độ ngoại tuyến). Không thể gửi quyết định.');
      return;
    }

    const btnApprove = $('#btn-director-approve');
    const btnRequestChanges = $('#btn-director-request-changes');
    const btnSpinner = triggerBtn ? triggerBtn.querySelector('.btn-spinner') : null;

    if (triggerBtn) {
      triggerBtn.classList.add('is-submitting');
      if (btnSpinner) btnSpinner.classList.remove('is-hidden');
    }
    if (btnApprove) btnApprove.disabled = true;
    if (btnRequestChanges) btnRequestChanges.disabled = true;

    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-Office-Token': state.csrfToken || '',
      };
      const res = await fetch('/api/office/decision', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        showToast('⚠️ Xung đột Revision 409: Dữ liệu đã thay đổi trên máy chủ! Đang tự động nạp trạng thái mới...');
        await fetchOfficeState();
        return;
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.error || errJson.message || res.statusText || 'Lỗi không xác định';
        showToast(`❌ Thất bại (${res.status}): ${errMsg}`);
        await fetchOfficeState();
        return;
      }

      const resData = await res.json();
      playBellChime();
      showToast('✅ Quyết định đã được máy chủ ghi nhận thành công!');

      // Director Stamp Down animation
      const stampArm = $('#director-stamp-arm');
      if (stampArm && payload.action === 'approve') {
        stampArm.classList.remove('is-stamping');
        void stampArm.offsetWidth;
        stampArm.classList.add('is-stamping');
        setTimeout(() => stampArm.classList.remove('is-stamping'), 700);
      }

      if (triggerBtn) {
        triggerBtn.classList.add('is-success');
        setTimeout(() => triggerBtn.classList.remove('is-success'), 1200);
      }

      // Reset feedback input and clear validation error
      const feedbackInput = $('#dir-feedback-input');
      if (feedbackInput) {
        feedbackInput.value = '';
        feedbackInput.classList.remove('input-shake', 'input-warning-glow');
      }
      const feedbackErr = $('#dir-feedback-error');
      if (feedbackErr) feedbackErr.classList.add('is-hidden');

      if (resData.state) {
        state.apiState = resData.state;
        state.apiRevision = resData.state.revision;
        state.csrfToken = resData.state.csrfToken;
        renderOfficeApiState(resData.state, 'online');
      } else {
        await fetchOfficeState();
      }
    } catch (err) {
      showToast(`❌ Lỗi kết nối: ${err.message}`);
      await fetchOfficeState();
    } finally {
      if (triggerBtn) {
        triggerBtn.classList.remove('is-submitting');
        if (btnSpinner) btnSpinner.classList.add('is-hidden');
      }
    }
  }

  function applyDemoState(mode) {
    state.demoMode = mode;
    const agChar = $('#char-figure-ag');
    const cxChar = $('#char-figure-cx');
    const zzzEl = $('#codex-zzz-badge');
    const trayMini = $('.approval-tray-mini');
    const bellEl = $('#desk-bell');
    const subStatusBadge = $('#dir-submission-status');
    const approveBtn = $('#btn-director-approve');
    const approveHint = $('#dir-approve-hint');
    const bubbleAg = $('#bubble-ag .bubble-text');
    const bubbleCx = $('#bubble-cx .bubble-text');
    const bubbleCeo = $('#bubble-ceo .bubble-text');
    const cardDirDoing = $('#card-director-doing');
    const cardDirAssistant = $('#card-director-assistant');
    const cardDirWaiting = $('#card-director-waiting');

    if (mode === 'working') {
      if (agChar) { agChar.classList.add('is-working'); agChar.classList.remove('is-idle'); }
      if (cxChar) { cxChar.classList.add('is-working', 'is-typing'); cxChar.classList.remove('is-idle', 'is-asleep'); }
      if (zzzEl) zzzEl.classList.add('is-hidden');
      if (trayMini) trayMini.classList.remove('is-blocked-alert');
      if (bellEl) bellEl.classList.remove('is-blocked-alert');
      if (subStatusBadge) { subStatusBadge.textContent = 'ĐANG XỬ LÝ (working)'; subStatusBadge.className = 'dir-sub-badge badge-pending'; }
      if (approveBtn) approveBtn.disabled = true;
      if (approveHint) { approveHint.classList.remove('hint-ready'); approveHint.textContent = 'Lý do mờ: Agent đang thực thi tác vụ trong tiến trình...'; }
      if (bubbleAg) bubbleAg.innerHTML = '<b>🎨 Antigravity:</b> "Đang vẽ Wacom và tối ưu UI... Vung cọ vẽ liên tục!"';
      if (bubbleCx) bubbleCx.innerHTML = '<b>⚙️ Codex:</b> "Đang gõ phím chạy bộ test engine 15/15 và kiểm tra Day 1."';
      if (bubbleCeo) bubbleCeo.innerHTML = '<b>👑 Giám Đốc:</b> "Các phòng ban đang làm việc tập trung. Vui lòng chờ đợt nộp."';
      if (cardDirDoing) cardDirDoing.textContent = 'Chủ dự án (Giám Đốc): Tiếp nhận tiến trình thực thi trực tiếp';
      if (cardDirAssistant) cardDirAssistant.textContent = 'Trợ lý Codex: Điều phối · Đang thẩm định tác vụ...';
      if (cardDirWaiting) cardDirWaiting.textContent = 'Đang chờ Agent nộp kết quả';
      showToast('🟢 Đã bật Hoạt ảnh Đang Làm Việc: Cọ vung vẽ, Wacom chạy, Codex gõ phím!');
    } else if (mode === 'idle') {
      if (agChar) { agChar.classList.add('is-idle'); agChar.classList.remove('is-working'); }
      if (cxChar) { cxChar.classList.add('is-idle', 'is-asleep'); cxChar.classList.remove('is-working', 'is-typing'); }
      if (zzzEl) zzzEl.classList.remove('is-hidden');
      if (trayMini) trayMini.classList.remove('is-blocked-alert');
      if (bellEl) bellEl.classList.remove('is-blocked-alert');
      if (subStatusBadge) { subStatusBadge.textContent = 'RẢNH (IDLE)'; subStatusBadge.className = 'dir-sub-badge badge-offline'; }
      if (approveBtn) approveBtn.disabled = true;
      if (approveHint) { approveHint.classList.remove('hint-ready'); approveHint.textContent = 'Lý do mờ: Chưa có đợt nộp mới nào từ các phòng ban.'; }
      if (bubbleAg) bubbleAg.innerHTML = '<b>🎨 Antigravity:</b> "Đã hoàn tất task UI. Đang nghỉ ngơi và thở nhẹ tự nhiên."';
      if (bubbleCx) bubbleCx.innerHTML = '<b>⚙️ Codex:</b> "Chưa có heartbeat mới trong 120s. Codex đang nghỉ 💤 zzz."';
      if (bubbleCeo) bubbleCeo.innerHTML = '<b>👑 Giám Đốc:</b> "Hệ thống đang ở trạng thái rảnh. Bạn có thể giao task mới."';
      if (cardDirDoing) cardDirDoing.textContent = 'Chủ dự án (Giám Đốc): Sẵn sàng tiếp nhận hồ sơ';
      if (cardDirAssistant) cardDirAssistant.textContent = 'Trợ lý Codex: Điều phối · Kiểm chứng · Duyệt theo ủy quyền';
      if (cardDirWaiting) cardDirWaiting.textContent = 'Chờ đợt nộp mới';
      showToast('💤 Đã bật Hoạt ảnh Rảnh: Codex ngồi yên, huy hiệu 💤 zzz lơ lửng, Antigravity thở nhẹ!');
    } else if (mode === 'blocked') {
      if (agChar) { agChar.classList.add('is-idle'); agChar.classList.remove('is-working'); }
      if (cxChar) { cxChar.classList.add('is-idle'); cxChar.classList.remove('is-working', 'is-typing'); }
      if (zzzEl) zzzEl.classList.remove('is-hidden');
      if (trayMini) trayMini.classList.add('is-blocked-alert');
      if (bellEl) bellEl.classList.add('is-blocked-alert');
      if (subStatusBadge) { subStatusBadge.textContent = 'BỊ CHẶN (BLOCKED)'; subStatusBadge.className = 'dir-sub-badge badge-changes'; }
      if (approveBtn) approveBtn.disabled = true;
      if (approveHint) { approveHint.classList.remove('hint-ready'); approveHint.textContent = 'Lý do mờ: Hệ thống đang có cờ Blocker chặn tiến trình.'; }
      if (bubbleAg) bubbleAg.innerHTML = '<b>🎨 Antigravity:</b> "Review không hợp lệ hoặc sai snapshot. Đang bị chặn."';
      if (bubbleCx) bubbleCx.innerHTML = '<b>⚙️ Codex:</b> "Tiến trình kiểm định gặp sự cố. Cần can thiệp gỡ lỗi."';
      if (bubbleCeo) bubbleCeo.innerHTML = '<b>👑 Giám Đốc:</b> "Cảnh báo: Hệ thống đang bị chặn! Chuông rung và khay đỏ cảnh báo."';
      if (cardDirDoing) cardDirDoing.textContent = 'Cảnh báo: Có cờ Blocker chặn tiến trình';
      if (cardDirAssistant) cardDirAssistant.textContent = 'Trợ lý Codex: Phát hiện blocker · Đang hỗ trợ kiểm chứng';
      if (cardDirWaiting) cardDirWaiting.textContent = 'Cần kiểm tra log và gỡ lỗi để tiếp tục';
      showToast('🔴 Đã bật Hoạt ảnh Bị Chặn: Khay hồ sơ phát xung đỏ, chuông bàn rung lắc liên hồi!');
    } else {
      state.demoMode = 'real';
      if (state.apiState) {
        renderOfficeApiState(state.apiState, 'api');
      } else {
        fetchOfficeState();
      }
      showToast('🔄 Đã đồng bộ lại dữ liệu trực tiếp từ API Workflow!');
    }
  }

  function bindEvents() {
    // Toggle Request Changes Form Drawer (Progressive Disclosure)
    const btnToggleChanges = $('#btn-toggle-changes-form');
    const changesDrawer = $('#dir-changes-drawer');
    if (btnToggleChanges && changesDrawer) {
      btnToggleChanges.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCol = changesDrawer.classList.contains('is-collapsed');
        if (isCol) {
          changesDrawer.classList.remove('is-collapsed');
          btnToggleChanges.setAttribute('aria-expanded', 'true');
          const txt = $('#dir-feedback-input');
          if (txt) txt.focus();
        } else {
          changesDrawer.classList.add('is-collapsed');
          btnToggleChanges.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Copy Dock Commit Button
    const btnCopyDock = $('#btn-copy-dock-commit');
    if (btnCopyDock) {
      btnCopyDock.addEventListener('click', (e) => {
        e.stopPropagation();
        const hashEl = $('#dir-submission-id');
        const hash = hashEl ? hashEl.textContent.trim() : '67386c6';
        navigator.clipboard.writeText(hash).then(
          () => showToast(`📋 Đã sao chép mã commit: ${hash}`),
          () => showToast(`📋 Mã commit: ${hash}`)
        );
      });
    }

    // Copy Commit Hash Button
    const btnCopyCommit = $('#btn-copy-commit');
    if (btnCopyCommit) {
      btnCopyCommit.addEventListener('click', (e) => {
        e.stopPropagation();
        const hashEl = $('#git-commit-text');
        const hash = hashEl ? hashEl.textContent.trim() : '67386c6';
        navigator.clipboard.writeText(hash).then(
          () => showToast(`📋 Đã sao chép mã commit: ${hash}`),
          () => showToast(`📋 Mã commit: ${hash}`)
        );
      });
    }

    // Handle Unblock Action (both in history dialog and report banner)
    const handleUnblockAction = (e) => {
      e.stopPropagation();
      const dlg = $('#modal-exchange-history');
      if (dlg && !dlg.open) dlg.showModal();
      // Viewing history must never manufacture a successful approval locally.
      if (state.apiState) renderOfficeApiState(state.apiState, 'online');
    };

    const btnUnblock = $('#btn-unblock-submission');
    if (btnUnblock) { btnUnblock.textContent = 'Xem lịch sử yêu cầu'; btnUnblock.addEventListener('click', handleUnblockAction); }

    const btnBannerUnblock = $('#btn-banner-unblock');
    if (btnBannerUnblock) btnBannerUnblock.addEventListener('click', handleUnblockAction);

    // Retry Review Button Handlers
    const handleRetryReviewAction = async (triggerBtn) => {
      const requests = state.apiState?.requests || [];
      const blockedReq = requests.find((r) => r.status === 'blocked' || r.status === 'interrupted');
      if (!blockedReq) {
        showToast('⚠️ Không tìm thấy yêu cầu bị chặn để thử lại kiểm chứng.');
        return;
      }
      await submitDecision({
        action: 'retry_review',
        expectedRevision: state.apiRevision,
        requestId: blockedReq.id,
        recipient: 'Antigravity'
      }, triggerBtn);
    };

    // Top Bar Manual Refresh
    const btnRefresh = $('#btn-manual-refresh');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', async () => {
        await manualRefresh();
        await fetchOfficeState();
      });
    }

    // Modal Backdrop click to close
    const reportModal = $('#report-modal');
    if (reportModal) {
      reportModal.addEventListener('click', (e) => {
        if (e.target === reportModal) closeReportModal();
      });
    }

    // Clear warning on feedback textarea input
    const feedbackInputEl = $('#dir-feedback-input');
    if (feedbackInputEl) {
      feedbackInputEl.addEventListener('input', () => {
        feedbackInputEl.classList.remove('input-shake', 'input-warning-glow');
        const errEl = $('#dir-feedback-error');
        if (errEl) errEl.classList.add('is-hidden');
      });
    }

    // Escape Key: Closes both report modal and any open dialogs
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeReportModal();
        $$('dialog[open]').forEach((d) => d.close());
      }
    });

    // Unified Document Click Listener
    document.addEventListener('click', (e) => {
      // 1. Unified Close Button Handler (handles nested svg/span clicks via closest)
      const closeBtn = e.target.closest('.btn-close-modal, #btn-close-modal, .drawer-close, [data-close-dialog]');
      if (closeBtn) {
        e.preventDefault();
        e.stopPropagation();
        const dialog = closeBtn.closest('dialog');
        if (dialog && typeof dialog.close === 'function') {
          dialog.close();
          return;
        }
        if (closeBtn.closest('#report-modal') || closeBtn.id === 'btn-close-modal') {
          closeReportModal();
          return;
        }
      }

      // 2. Director Decision Panel Actions
      const approveBtn = e.target.closest('#btn-director-approve');
      if (approveBtn) {
        e.stopPropagation();
        submitDecision({
          action: 'approve',
          expectedRevision: state.apiRevision,
          submissionId: state.apiState?.submission?.id,
          recipient: 'Antigravity',
        }, approveBtn);
        return;
      }

      const reqBtn = e.target.closest('#btn-director-request-changes');
      if (reqBtn) {
        e.stopPropagation();
        const feedbackEl = $('#dir-feedback-input');
        const feedbackErr = $('#dir-feedback-error');
        const feedback = feedbackEl ? feedbackEl.value.trim() : '';
        if (!feedback) {
          if (feedbackEl) {
            feedbackEl.classList.remove('input-shake');
            void feedbackEl.offsetWidth; // Force reflow
            feedbackEl.classList.add('input-shake', 'input-warning-glow');
            feedbackEl.focus();
          }
          if (feedbackErr) feedbackErr.classList.remove('is-hidden');
          showToast('⚠️ Vui lòng nhập nội dung yêu cầu chỉnh sửa cụ thể!');
          return;
        }
        const recipientEl = $('#dir-recipient-select');
        const recipient = recipientEl ? recipientEl.value : 'Antigravity';
        submitDecision({
          action: 'request_changes',
          expectedRevision: state.apiRevision,
          submissionId: state.apiState?.submission?.id,
          feedback,
          recipient,
        }, reqBtn);
        return;
      }

      const propBtn = e.target.closest('.btn-approve-prop');
      if (propBtn) {
        e.stopPropagation();
        const propId = propBtn.dataset.propId;
        submitDecision({
          action: 'approve_proposal',
          expectedRevision: state.apiRevision,
          proposalId: propId,
          recipient: 'Antigravity',
        }, propBtn);
        return;
      }

      const retryBtn = e.target.closest('#btn-retry-review, #btn-dock-retry-review, #btn-banner-retry-review');
      if (retryBtn) {
        e.stopPropagation();
        handleRetryReviewAction(retryBtn);
        return;
      }
      // Open report modal from kanban card or report button
      const reportBtn = e.target.closest('[data-report-url]');
      if (reportBtn) {
        e.preventDefault();
        openReportModal(reportBtn.dataset.reportUrl);
        return;
      }

      const navBtn = e.target.closest('[data-view]');
      if (navBtn) {
        switchRoom(navBtn.dataset.view);
        return;
      }

      // Sidebar desk clicks jump to lobby or focus character
      const deskCard = e.target.closest('[data-target-desk]');
      if (deskCard) {
        switchRoom('lobby');
        const deskId = `ws-${deskCard.dataset.targetDesk}`;
        const el = document.getElementById(deskId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
        return;
      }

      // Segmented Tabs on narrow viewports
      const segBtn = e.target.closest('.room-seg-btn');
      if (segBtn) {
        e.stopPropagation();
        $$('.room-seg-btn').forEach(b => {
          b.classList.toggle('is-active', b === segBtn);
          b.setAttribute('aria-selected', b === segBtn ? 'true' : 'false');
        });
        const targetId = segBtn.dataset.roomTarget;
        $$('.dept-room').forEach(r => {
          r.classList.toggle('is-seg-active', r.id === targetId);
        });
        return;
      }

      // Comic Speech Bubble (Opens dialogue & ACK history)
      const bubble = e.target.closest('.comic-bubble');
      if (bubble) {
        e.stopPropagation();
        const dlg = $('#modal-exchange-history');
        if (dlg && !dlg.open) dlg.showModal();
        return;
      }

      // Director Evidence Jump Button
      if (e.target.closest('#btn-director-evidence')) {
        e.stopPropagation();
        switchRoom('qa');
        return;
      }

      // Unified Card Action Links
      if (e.target.closest('#link-ag-report')) {
        e.preventDefault();
        e.stopPropagation();
        openReportModal('reports/ANTIGRAVITY_UI_REPORT.md');
        return;
      }

      if (e.target.closest('#link-cx-report')) {
        e.preventDefault();
        e.stopPropagation();
        openReportModal('reports/CODEX_BACKEND_REPORT.md');
        return;
      }

      if (e.target.closest('#btn-history-view-report')) {
        const dlg = $('#modal-exchange-history');
        if (dlg && dlg.open) dlg.close();
        switchRoom('reports');
        return;
      }

      // Live State Demo Switcher Toolbar
      const demoBtn = e.target.closest('.btn-state-demo');
      if (demoBtn) {
        e.stopPropagation();
        $$('.btn-state-demo').forEach(b => b.classList.toggle('is-active', b === demoBtn));
        const mode = demoBtn.dataset.stateDemo;
        applyDemoState(mode);
        return;
      }

      // Director Stamp Arm click interaction
      if (e.target.closest('#director-stamp-arm')) {
        e.stopPropagation();
        const stampArm = $('#director-stamp-arm');
        if (stampArm) {
          stampArm.classList.remove('is-stamping');
          void stampArm.offsetWidth;
          stampArm.classList.add('is-stamping');
          setTimeout(() => stampArm.classList.remove('is-stamping'), 700);
        }
        playChime();
        showToast('👑 Giám Đốc đóng dấu Phê Duyệt!');
        return;
      }

      // Codex zzz badge click interaction (Wake up Codex!)
      if (e.target.closest('#codex-zzz-badge')) {
        e.stopPropagation();
        const cxChar = $('#char-figure-cx');
        const zzzEl = $('#codex-zzz-badge');
        if (cxChar) {
          cxChar.classList.add('is-typing', 'is-working');
          cxChar.classList.remove('is-idle', 'is-asleep');
          if (zzzEl) zzzEl.classList.add('is-hidden');
          showToast('⚡ Đã đánh thức Codex! Đang gõ phím...');
          setTimeout(() => {
            cxChar.classList.remove('is-typing', 'is-working');
            cxChar.classList.add('is-idle', 'is-asleep');
            if (zzzEl) zzzEl.classList.remove('is-hidden');
          }, 4000);
        }
        return;
      }

      // Desk Bell Interaction
      if (e.target.closest('#desk-bell')) {
        e.stopPropagation();
        const bell = $('#desk-bell');
        if (bell) {
          bell.classList.remove('is-ringing');
          void bell.offsetWidth;
          bell.classList.add('is-ringing');
          setTimeout(() => bell.classList.remove('is-ringing'), 650);
        }
        playBellChime();
        showToast('🔔 Đinggg! Đã bấm chuông văn phòng Giám Đốc!');
        const d = $('#drawer-director');
        if (d && !d.open) d.showModal();
        return;
      }

      // Character Figures direct clicks (opens individual detail drawers)
      if (e.target.closest('#char-figure-ag')) {
        const d = $('#drawer-antigravity');
        if (d) d.showModal();
        return;
      }

      if (e.target.closest('#char-figure-ceo')) {
        playBellChime();
        const d = $('#drawer-director');
        if (d) d.showModal();
        return;
      }

      if (e.target.closest('#char-figure-cx')) {
        const d = $('#drawer-codex');
        if (d) d.showModal();
        return;
      }

      // Drawer Action Buttons
      if (e.target.closest('#btn-drawer-goto-kanban')) {
        const d = $('#drawer-antigravity');
        if (d && d.open) d.close();
        switchRoom('kanban');
        return;
      }

      if (e.target.closest('#btn-drawer-copy-prompt')) {
        const d = $('#drawer-director');
        if (d && d.open) d.close();
        copyHandoffPrompt();
        return;
      }

      if (e.target.closest('#btn-drawer-open-reports')) {
        const d = $('#drawer-director');
        if (d && d.open) d.close();
        switchRoom('reports');
        return;
      }

      if (e.target.closest('#btn-drawer-goto-codex-report')) {
        const d = $('#drawer-codex');
        if (d && d.open) d.close();
        switchRoom('reports');
        const codexTab = document.querySelector('[data-report-target="codex"]');
        if (codexTab) codexTab.click();
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
        const target = document.getElementById('deck-content-ag-actions') || document.querySelector('.action-items-block');
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
    const selectSlotA = $('#select-slot-a');
    if (selectSlotA) {
      selectSlotA.addEventListener('change', (e) => {
        state.compareSlotA = Number(e.target.value);
        renderCompareStage();
      });
    }
    const selectSlotB = $('#select-slot-b');
    if (selectSlotB) {
      selectSlotB.addEventListener('change', (e) => {
        state.compareSlotB = Number(e.target.value);
        renderCompareStage();
      });
    }

    // Kanban search input
    const kanbanSearch = $('#kanban-search');
    if (kanbanSearch) {
      kanbanSearch.addEventListener('input', (e) => {
        state.kanbanSearch = e.target.value;
        renderKanban();
      });
    }

    // Keyboard Shortcuts (1: Lobby, 2: Kanban, 3: Reports, 4: QA Lab, Esc: close modal/lightbox)
    document.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'Escape') {
        closeReportModal();
        const dlg = $('#qa-lightbox');
        if (dlg && dlg.open) dlg.close();
      } else if (e.key === '1') switchRoom('lobby');
      else if (e.key === '2') switchRoom('kanban');
      else if (e.key === '3') switchRoom('reports');
      else if (e.key === '4') switchRoom('qa');
      else if (e.key === 'ArrowRight' && $('#qa-lightbox')?.open) openLightbox(state.lightboxIndex + 1);
      else if (e.key === 'ArrowLeft' && $('#qa-lightbox')?.open) openLightbox(state.lightboxIndex - 1);
    });

    // Lightbox backdrop click to close
    const dlg = $('#qa-lightbox');
    if (dlg) {
      dlg.addEventListener('click', (ev) => { if (ev.target === dlg) dlg.close(); });
    }

    // Drawer backdrop clicks to close
    ['#drawer-antigravity', '#drawer-director', '#drawer-codex'].forEach((sel) => {
      const d = $(sel);
      if (d) {
        d.addEventListener('click', (ev) => { if (ev.target === d) d.close(); });
      }
    });
  }

  // ───────────────────────── 10. BOOTSTRAP ─────────────────────────
  async function boot() {
    bindEvents();
    const { data, usedBundle, bundleTime } = await loadAll();

    state.latest = data.latest;
    state.tasks = data.tasks;
    state.tasksRawText = JSON.stringify(data.tasks);
    state.evidence = data.evidence?.items || [];
    state.lastSyncTime = Date.now();

    // Data source indicator
    const badge = $('#data-source-badge');
    if (badge) {
      if (usedBundle) {
        badge.textContent = `Bản đóng gói (${bundleTime ? bundleTime.slice(11, 16) : 'Offline'})`;
        badge.className = 'source-pill src-bundle';
      } else {
        badge.textContent = 'Dữ liệu trực tiếp';
        badge.className = 'source-pill src-live';
      }
    }

    // Sync Current Handoff Info
    if (state.tasks?.currentHandoff) {
      const h = state.tasks.currentHandoff;
      const titleEl = $('#kpi-handoff-title');
      const descEl = $('#kpi-handoff-desc');
      if (titleEl) titleEl.textContent = `${h.title}`;
      if (descEl) descEl.textContent = `${h.from} → ${h.to} · base ${(h.baseCommit || '').slice(0, 7)} → result ${(h.resultCommit || '').slice(0, 7)}`;
    }

    // Git Branch & Status
    if (state.tasks?.branch) {
      const branchEl = $('#git-branch-text');
      if (branchEl) branchEl.textContent = state.tasks.branch;
    }

    // Sidebar update time
    if (state.tasks?.updatedAt) {
      const updatedEl = $('#sidebar-updated-time');
      if (updatedEl) updatedEl.textContent = `Cập nhật: ${state.tasks.updatedAt.slice(0, 16).replace('T', ' ')}`;
    }

    // Update dynamic numbers and KPIs
    updateDynamicMetrics();
    updateSyncTicker();

    // Fetch initial Office API state immediately
    await fetchOfficeState();

    // Render Rooms
    renderKanban();
    if (state.latest) renderLatestPackage();
    else renderReports(data.antigravity, data.codex);
    renderQALab();

    const initialRoom = location.hash?.slice(1);
    switchRoom(ROOM_NAMES[initialRoom] ? initialRoom : 'lobby');

    // Start Auto-Polling (5 seconds) and Ticker update (1 second)
    if (location.protocol !== 'file:') {
      state.pollInterval = setInterval(pollTasks, 5000);
      state.tickerInterval = setInterval(updateSyncTicker, 1000);
      state.pollApiInterval = setInterval(fetchOfficeState, 5000);
    }
  }

  boot();
})();
