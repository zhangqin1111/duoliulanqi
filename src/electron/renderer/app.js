/** 与 src/automation/text-quality.js 保持一致（渲染进程不能 require 该文件） */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function looksLikeIdOrToken(s) {
  const t = String(s || '').trim();
  if (t.length < 8) return false;
  if (UUID_RE.test(t)) return true;
  if (t.length >= 20 && t.length <= 256 && /^[0-9a-f]+$/i.test(t)) return true;
  if (
    t.length >= 32 &&
    !/\s/.test(t) &&
    /^[a-zA-Z0-9_-]+$/.test(t) &&
    !/[\u4e00-\u9fff]/.test(t)
  ) {
    return true;
  }
  return false;
}

function isPlausibleReplyText(s) {
  const t = String(s || '').trim();
  if (t.length < 2) return false;
  if (looksLikeIdOrToken(t)) return false;
  if (/[\u4e00-\u9fff]/.test(t)) return true;
  if (/\s/.test(t) && t.length >= 8) return true;
  if (/[.。!！?？,，;；:'"「」]/.test(t) && t.length >= 6) return true;
  if (t.includes('\n') && t.length >= 16) return true;
  if (/[a-zA-Z]{4,}/.test(t) && t.length >= 16) return true;
  return false;
}

const $ = (sel) => document.querySelector(sel);
const statusEl = $('#status');
const qEl = $('#q');
const btnReload = $('#btnReload');
const btnSettings = $('#btnSettings');
const btnSend = $('#btnSend');
const btnCompare = $('#btnCompare');
const summaryBodyEl = $('#summary-body');
const summaryStatusEl = $('#summary-status');
const settingsPanel = $('#settings-panel');
const dashscopeKeyInput = $('#dashscope-key');
const settingsKeySourceEl = $('#settings-key-source');
const settingsMsgEl = $('#settings-msg');
const questionChipEl = $('#question-chip');
const threadScrollEl = $('#thread-scroll');
const btnOpenCompare = $('#btnOpenCompare');
const comparePanel = $('#compare-panel');
const compareSameEl = $('#compare-same');
const compareDiffEl = $('#compare-diff');
const compareRawEl = $('#compare-raw');
const toolMenuEl = $('#tool-menu');
const dockIconsEl = $('#dock-icons');
const mirrorSectionsEl = $('#mirror-sections');
const embedsRowRootEl = $('#embeds-row');
const licenseGateEl = $('#license-gate');
const licenseTokenInputEl = $('#license-token');
const licenseStateTextEl = $('#license-state-text');
const licenseExpiryTextEl = $('#license-expiry-text');
const licenseMsgEl = $('#license-msg');
const btnActivateLicense = $('#btnActivateLicense');
const btnClearLicense = $('#btnClearLicense');

let api = null;
/** @type {any[]} */
let platforms = [];
/** 是否已配置 DashScope 密钥（主进程检测） */
let qwenApiOk = false;
const guestLoaded = new Set();
const platformVisibility = {};
let workbenchBooted = false;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function syncQuestionChip(text) {
  if (!questionChipEl) return;
  const q = String(text || '').trim();
  questionChipEl.textContent = q || '等待输入问题';
}

function resizeComposerInput() {
  if (!qEl) return;
  qEl.style.height = 'auto';
  const nextHeight = Math.max(108, Math.min(qEl.scrollHeight, 220));
  qEl.style.height = `${nextHeight}px`;
}

function scrollThreadToBottom() {
  if (!threadScrollEl) return;
  threadScrollEl.scrollTop = threadScrollEl.scrollHeight;
}

function mirrorEl(id) {
  return document.getElementById(`mirror-${id}`);
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function platformAvatar(cfg) {
  return String(cfg && cfg.avatar ? cfg.avatar : (cfg && cfg.name ? cfg.name : '?')).slice(0, 2);
}

function platformAccentStyle(cfg) {
  const accent = cfg && cfg.accent ? cfg.accent : '#4d7bff';
  const avatarBg = cfg && cfg.avatarBg ? cfg.avatarBg : '#eef3ff';
  const avatarFg = cfg && cfg.avatarFg ? cfg.avatarFg : '#3167df';
  return `--platform-accent:${accent};--platform-avatar-bg:${avatarBg};--platform-avatar-fg:${avatarFg};`;
}

function mirrorPlaceholder(cfg) {
  return `发送后将在这里同步展示 ${cfg.name} 的回复。`;
}

function renderPlatformScaffold() {
  if (mirrorSectionsEl) {
    mirrorSectionsEl.innerHTML = platforms
      .map(
        (cfg) => `
          <section class="document-section document-section--reply" data-mirror-card="${cfg.id}">
            <div class="document-section__title">
              <span class="mirror-dot" style="${platformAccentStyle(cfg)}"></span>
              <span>${escapeHtml(cfg.name)}</span>
            </div>
            <pre id="mirror-${cfg.id}" class="document-pre">${escapeHtml(mirrorPlaceholder(cfg))}</pre>
          </section>
        `
      )
      .join('');
  }

  if (embedsRowRootEl) {
    embedsRowRootEl.innerHTML = platforms
      .map((cfg) => {
        const warn = cfg.warnText
          ? `<p class="embed-warn">${escapeHtml(cfg.warnText)}</p>`
          : '';
        return `
          <article class="embed-col" data-id="${cfg.id}">
            <div class="embed-shell" style="${platformAccentStyle(cfg)}">
              <div class="embed-head" data-drag-popout="${cfg.id}">
                <div class="embed-brand">
                  <span class="embed-avatar">${escapeHtml(platformAvatar(cfg))}</span>
                  <span>${escapeHtml(cfg.name)}</span>
                </div>
                <div class="embed-controls">
                  <button type="button" class="icon-btn" data-reload="${cfg.id}" aria-label="刷新 ${escapeHtml(cfg.name)}">↻</button>
                  <button type="button" class="icon-btn" data-collapse="${cfg.id}" aria-label="收起 ${escapeHtml(cfg.name)}">－</button>
                  <button type="button" class="icon-btn" data-close="${cfg.id}" aria-label="关闭 ${escapeHtml(cfg.name)}">×</button>
                </div>
              </div>
              ${warn}
              <div class="embed-slot-wrap">
                <div class="embed-slot" id="slot-${cfg.id}"></div>
              </div>
              <div class="embed-foot">
                <div class="col-status" data-status="${cfg.id}">加载中...</div>
                <pre class="col-body" data-body="${cfg.id}"></pre>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  }
}

function extractCompareSection(summaryText, heading) {
  const text = String(summaryText || '').trim();
  if (!text) return '';
  const lines = text.split(/\r?\n/);
  const out = [];
  let collecting = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (collecting && out.length) out.push('');
      continue;
    }
    if (line === heading || line === `${heading}:` || line === `${heading}：`) {
      collecting = true;
      continue;
    }
    if (collecting && (line === '相同观点' || line === '不同观点' || line === '相同观点：' || line === '不同观点：')) {
      break;
    }
    if (collecting) out.push(line.replace(/^[•·\-\d.\s]+/, '').trim());
  }
  return out.join('\n').trim();
}

function sectionItems(text) {
  return String(text || '')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function reportSectionHeadings() {
  return ['核心结论', '相同观点', '不同观点', '关键争议', '遗漏与盲区', '行动建议'];
}

function isReportHeading(line, heading) {
  return line === heading || line === `${heading}:` || line === `${heading}：`;
}

function parseReportSections(summaryText) {
  const text = String(summaryText || '').trim();
  const headings = reportSectionHeadings();
  const sections = Object.fromEntries(headings.map((heading) => [heading, '']));
  if (!text) return sections;

  const lines = text.split(/\r?\n/);
  const buckets = Object.fromEntries(headings.map((heading) => [heading, []]));
  let currentHeading = '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const matchedHeading = headings.find((heading) => isReportHeading(line, heading));
    if (matchedHeading) {
      currentHeading = matchedHeading;
      continue;
    }
    if (!currentHeading) continue;
    if (!line) {
      if (buckets[currentHeading].length) buckets[currentHeading].push('');
      continue;
    }
    buckets[currentHeading].push(line.replace(/^[•·\-\d.\)\(、\s]+/, '').trim());
  }

  for (const heading of headings) {
    sections[heading] = buckets[heading].join('\n').trim();
  }
  return sections;
}

function extractCompareSection(summaryText, heading) {
  return parseReportSections(summaryText)[heading] || '';
}

function reportSectionHeadings() {
  return ['核心结论', '相同观点', '不同观点', '关键争议', '遗漏与盲区', '行动建议'];
}

function isReportHeading(line, heading) {
  return line === heading || line === `${heading}:` || line === `${heading}：`;
}

function parseReportSections(summaryText) {
  const text = String(summaryText || '').trim();
  const headings = reportSectionHeadings();
  const sections = Object.fromEntries(headings.map((heading) => [heading, '']));
  if (!text) return sections;

  const lines = text.split(/\r?\n/);
  const buckets = Object.fromEntries(headings.map((heading) => [heading, []]));
  let currentHeading = '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const matchedHeading = headings.find((heading) => isReportHeading(line, heading));
    if (matchedHeading) {
      currentHeading = matchedHeading;
      continue;
    }
    if (!currentHeading) continue;
    if (!line) {
      if (buckets[currentHeading].length) buckets[currentHeading].push('');
      continue;
    }
    buckets[currentHeading].push(line.replace(/^[•\-\d.()（）\s]+/, '').trim());
  }

  for (const heading of headings) {
    sections[heading] = buckets[heading].join('\n').trim();
  }
  return sections;
}

function extractCompareSection(summaryText, heading) {
  return parseReportSections(summaryText)[heading] || '';
}

function renderCompareItems(target, items, emptyText) {
  if (!target) return;
  const list = Array.isArray(items) ? items : [];
  if (!list.length) {
    target.innerHTML = `<div class="compare-item"><div>${escapeHtml(emptyText)}</div></div>`;
    return;
  }
  target.innerHTML = list
    .map(
      (item, index) =>
        `<div class="compare-item"><span class="compare-item__index">${index + 1}</span><span>${escapeHtml(item)}</span></div>`
    )
    .join('');
}

function renderCompareRawCards() {
  if (!compareRawEl) return;
  compareRawEl.innerHTML = chatPlatforms()
    .map((cfg) => {
      const text = document.querySelector(`[data-body="${cfg.id}"]`)?.textContent?.trim() || '暂无回复';
      return `
        <article class="compare-raw__card">
          <h3>${escapeHtml(cfg.name)}</h3>
          <pre>${escapeHtml(text)}</pre>
        </article>
      `;
    })
    .join('');
}

function refreshComparePanel() {
  const summaryText = summaryBodyEl ? summaryBodyEl.textContent.trim() : '';
  const sameItems = sectionItems(extractCompareSection(summaryText, '相同观点'));
  const diffItems = sectionItems(extractCompareSection(summaryText, '不同观点'));
  renderCompareItems(compareSameEl, sameItems, '当前还没有可展示的相同观点。');
  renderCompareItems(compareDiffEl, diffItems, '当前还没有可展示的差异内容。');
  renderCompareRawCards();
}

function openComparePanel() {
  if (!comparePanel) return;
  refreshComparePanel();
  comparePanel.removeAttribute('hidden');
  document.body.classList.add('has-compare-open');
}

function closeComparePanel() {
  if (!comparePanel) return;
  comparePanel.setAttribute('hidden', '');
  document.body.classList.remove('has-compare-open');
}

function positionToolMenu() {
  const stageEl = document.querySelector('.browser-stage');
  const addToolBtn = document.getElementById('btnAddTool');
  if (!toolMenuEl || !stageEl || !addToolBtn || toolMenuEl.hasAttribute('hidden')) return;
  const stageRect = stageEl.getBoundingClientRect();
  const btnRect = addToolBtn.getBoundingClientRect();
  const bubbleWidth = Math.max(toolMenuEl.offsetWidth || 0, 184);
  const bubbleHeight = toolMenuEl.offsetHeight || 0;
  const gap = 8;
  const top = Math.max(
    18,
    Math.min(btnRect.top - stageRect.top + btnRect.height / 2 - bubbleHeight / 2, stageEl.clientHeight - bubbleHeight - 18)
  );
  const left = Math.max(
    18,
    Math.min(btnRect.left - stageRect.left - bubbleWidth - gap, stageEl.clientWidth - bubbleWidth - 18)
  );
  toolMenuEl.style.top = `${Math.round(top)}px`;
  toolMenuEl.style.left = `${Math.round(left)}px`;
  toolMenuEl.style.right = 'auto';
}

function setToolMenuOpen(open) {
  const stageEl = document.querySelector('.browser-stage');
  if (toolMenuEl) {
    if (open) {
      toolMenuEl.removeAttribute('hidden');
    } else {
      toolMenuEl.setAttribute('hidden', '');
    }
  }
  if (stageEl) {
    stageEl.classList.toggle('browser-stage--tool-open', !!open);
  }
  if (open) {
    requestAnimationFrame(() => requestAnimationFrame(() => positionToolMenu()));
  }
  schedulePushBounds();
}

function applyHostMode(id, host) {
  if (!id) return;
  if (!platformVisibility[id]) platformVisibility[id] = { mode: 'visible' };
  const nextMode = host === 'detached' ? 'detached' : 'visible';
  if (platformVisibility[id].mode === 'closed') return;
  if (platformVisibility[id].mode === 'collapsed' && nextMode === 'visible') return;
  platformVisibility[id].mode = nextMode;
}

function ensurePopoutButtons() {
  platforms.forEach((cfg) => {
    const controls = document.querySelector(`.embed-col[data-id="${cfg.id}"] .embed-controls`);
    if (!controls || controls.querySelector(`[data-popout="${cfg.id}"]`)) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-btn';
    btn.setAttribute('data-popout', cfg.id);
    btn.setAttribute('aria-label', `弹出 ${cfg.name}`);
    btn.innerHTML = '&#8599;';
    const collapseBtn = controls.querySelector(`[data-collapse="${cfg.id}"]`);
    controls.insertBefore(btn, collapseBtn || controls.firstChild);
  });
}

async function popoutPlatform(id, bounds) {
  if (!id || !api || typeof api.popoutGuest !== 'function') return;
  try {
    await api.popoutGuest(id, bounds || {});
    setPlatformMode(id, 'detached');
    setStatus(`已将 ${id} 弹出为独立窗口，可拖到其他屏幕。`);
  } catch (e) {
    setStatus(`弹出失败：${e.message || e}`);
  }
}

async function redockPlatform(id) {
  if (!id || !api || typeof api.redockGuest !== 'function') return;
  try {
    await api.redockGuest(id);
    setPlatformMode(id, 'visible');
    setStatus(`已将 ${id} 收回到主工作台。`);
  } catch (e) {
    setStatus(`收回失败：${e.message || e}`);
  }
}

function platformCardEl(id) {
  return document.querySelector(`.embed-col[data-id="${id}"]`);
}

function ensurePlatformVisibilityState() {
  platforms.forEach((cfg) => {
    if (!platformVisibility[cfg.id]) {
      platformVisibility[cfg.id] = { mode: cfg.defaultMode || 'visible' };
    }
  });
}

function restorePlatform(id) {
  if (!platformVisibility[id]) platformVisibility[id] = { mode: 'visible' };
  platformVisibility[id].mode = 'visible';
  renderPlatformVisibility();
}

function setPlatformMode(id, mode) {
  if (!platformVisibility[id]) platformVisibility[id] = { mode: 'visible' };
  platformVisibility[id].mode = mode;
  renderPlatformVisibility();
}

function renderToolMenu() {
  if (!toolMenuEl) return;
  const closeds = platforms.filter((cfg) => platformVisibility[cfg.id]?.mode === 'closed');
  if (!closeds.length) {
    toolMenuEl.innerHTML = '<button type="button" disabled>当前没有已关闭的 AI 工具</button>';
    return;
  }
  toolMenuEl.innerHTML = closeds
    .map((cfg) => `<button type="button" data-restore-tool="${cfg.id}"><span>${cfg.name}</span><span>恢复</span></button>`)
    .join('');
  toolMenuEl.querySelectorAll('[data-restore-tool]').forEach((btn) => {
    btn.addEventListener('click', () => {
      restorePlatform(btn.getAttribute('data-restore-tool'));
      setToolMenuOpen(false);
    });
  });
}

function renderDockIcons() {
  if (!dockIconsEl) return;
  const collapsed = platforms.filter((cfg) => platformVisibility[cfg.id]?.mode === 'collapsed');
  dockIconsEl.innerHTML = collapsed
    .map(
      (cfg) =>
        `<button type="button" class="dock-icon" data-platform="${cfg.id}" data-restore-collapsed="${cfg.id}" title="恢复 ${cfg.name}">${cfg.name.slice(0, 1)}</button>`
    )
    .join('');
  dockIconsEl.querySelectorAll('[data-restore-collapsed]').forEach((btn) => {
    btn.addEventListener('click', () => restorePlatform(btn.getAttribute('data-restore-collapsed')));
  });
}

function renderPlatformVisibility() {
  const embedsRowEl = embedsRowRootEl || document.getElementById('embeds-row');
  let visibleCount = 0;
  platforms.forEach((cfg) => {
    const card = platformCardEl(cfg.id);
    if (!card) return;
    const mode = platformVisibility[cfg.id]?.mode || 'visible';
    const isVisible = mode === 'visible';
    card.classList.toggle('is-hidden', !isVisible);
    if (isVisible) visibleCount += 1;
  });
  if (embedsRowEl) {
    embedsRowEl.dataset.visibleCount = String(Math.max(visibleCount, 1));
  }
  renderDockIcons();
  renderToolMenu();
  schedulePushBounds();
}

function renderDockIcons() {
  if (!dockIconsEl) return;
  const iconPlatforms = platforms.filter((cfg) => {
    const mode = platformVisibility[cfg.id]?.mode;
    return mode === 'collapsed' || mode === 'detached';
  });
  dockIconsEl.innerHTML = iconPlatforms
    .map((cfg) => {
      const mode = platformVisibility[cfg.id]?.mode;
      const actionAttr = mode === 'detached' ? `data-redock-platform="${cfg.id}"` : `data-restore-collapsed="${cfg.id}"`;
      const extraClass = mode === 'detached' ? ' dock-icon--detached' : '';
      const title = mode === 'detached' ? `收回 ${cfg.name}` : `恢复 ${cfg.name}`;
      return `<button type="button" class="dock-icon${extraClass}" data-platform="${cfg.id}" ${actionAttr} title="${title}">${cfg.name.slice(0, 1)}</button>`;
    })
    .join('');
  dockIconsEl.querySelectorAll('[data-restore-collapsed]').forEach((btn) => {
    btn.addEventListener('click', () => restorePlatform(btn.getAttribute('data-restore-collapsed')));
  });
  dockIconsEl.querySelectorAll('[data-redock-platform]').forEach((btn) => {
    btn.addEventListener('click', () => redockPlatform(btn.getAttribute('data-redock-platform')));
  });
}

function renderPlatformVisibility() {
  const embedsRowEl = embedsRowRootEl || document.getElementById('embeds-row');
  let visibleCount = 0;
  platforms.forEach((cfg) => {
    const card = platformCardEl(cfg.id);
    const mirrorCard = document.querySelector(`[data-mirror-card="${cfg.id}"]`);
    const mode = platformVisibility[cfg.id]?.mode || cfg.defaultMode || 'visible';
    const isVisible = mode === 'visible';
    if (card) {
      card.classList.toggle('is-hidden', !isVisible);
      card.classList.toggle('is-detached', mode === 'detached');
    }
    if (mirrorCard) {
      mirrorCard.classList.toggle('is-hidden', mode === 'closed');
    }
    if (isVisible) visibleCount += 1;
  });
  if (embedsRowEl) {
    const safeVisibleCount = Math.max(visibleCount, 1);
    const cols = safeVisibleCount === 1 ? 1 : safeVisibleCount === 2 ? 2 : 3;
    const rows = safeVisibleCount <= 3 ? 1 : Math.ceil(safeVisibleCount / 3);
    embedsRowEl.dataset.visibleCount = String(safeVisibleCount);
    embedsRowEl.dataset.visibleRows = String(rows);
    embedsRowEl.style.setProperty('--embed-cols', String(cols));
    embedsRowEl.style.setProperty('--embed-rows', String(rows));
    embedsRowEl.classList.toggle('embeds-row--matrix', safeVisibleCount > 3);
  }
  renderDockIcons();
  renderToolMenu();
  schedulePushBounds();
}

function getDifferenceText() {
  const summaryText = summaryBodyEl ? summaryBodyEl.textContent.trim() : '';
  const diffText = extractCompareSection(summaryText, '不同观点');
  return diffText || summaryText;
}

function setStatus(t) {
  statusEl.textContent = t || '';
}

function setColStatus(id, text, cls) {
  const el = document.querySelector(`[data-status="${id}"]`);
  const body = document.querySelector(`[data-body="${id}"]`);
  if (el) {
    el.textContent = text;
    el.className = 'col-status' + (cls ? ` ${cls}` : '');
  }
  if (body && !cls) body.textContent = '';
  const mirror = mirrorEl(id);
  if (mirror && !cls) {
    const platformName = chatPlatforms().find((cfg) => cfg.id === id)?.name || id;
    mirror.textContent = `等待 ${platformName} 返回内容…`;
  }
}

function setColBody(id, text) {
  const body = document.querySelector(`[data-body="${id}"]`);
  if (body) body.textContent = text || '';
  const mirror = mirrorEl(id);
  if (mirror) mirror.textContent = text || '发送后将在这里同步展示模型回复。';
  refreshComparePanel();
  scrollThreadToBottom();
}

function setSummaryStatus(t) {
  if (summaryStatusEl) summaryStatusEl.textContent = t || '';
  refreshComparePanel();
}

function chatPlatforms() {
  return platforms.filter((cfg) => platformVisibility[cfg.id]?.mode !== 'closed');
}

function buildReportPayload(questionText) {
  const summaryText = summaryBodyEl ? summaryBodyEl.textContent.trim() : '';
  const sections = parseReportSections(summaryText);
  return {
    question: String(questionText || '').trim(),
    generatedAt: new Date().toISOString(),
    summaryText,
    sections: {
      coreConclusion: sectionItems(sections['核心结论']),
      same: sectionItems(sections['相同观点']),
      diff: sectionItems(sections['不同观点']),
      keyDebates: sectionItems(sections['关键争议']),
      gaps: sectionItems(sections['遗漏与盲区']),
      actions: sectionItems(sections['行动建议']),
    },
    rawReplies: chatPlatforms().map((cfg) => ({
      id: cfg.id,
      name: cfg.name,
      text: document.querySelector(`[data-body="${cfg.id}"]`)?.textContent?.trim() || '',
    })),
  };
}

function buildReportPayload(questionText) {
  const summaryText = summaryBodyEl ? summaryBodyEl.textContent.trim() : '';
  const sections = parseReportSections(summaryText);
  return {
    question: String(questionText || '').trim(),
    generatedAt: new Date().toISOString(),
    summaryText,
    sections: {
      coreConclusion: sectionItems(sections['核心结论']),
      same: sectionItems(sections['相同观点']),
      diff: sectionItems(sections['不同观点']),
      keyDebates: sectionItems(sections['关键争议']),
      gaps: sectionItems(sections['遗漏与盲区']),
      actions: sectionItems(sections['行动建议']),
    },
    rawReplies: chatPlatforms().map((cfg) => ({
      id: cfg.id,
      name: cfg.name,
      text: document.querySelector(`[data-body="${cfg.id}"]`)?.textContent?.trim() || '',
    })),
  };
}

function applyQwenStatus(qc) {
  const st = qc || {};
  qwenApiOk = !!st.ok;
  if (btnCompare) btnCompare.disabled = !qwenApiOk;
  if (settingsKeySourceEl) {
    if (st.source === 'env') {
      settingsKeySourceEl.textContent =
        '当前使用：环境变量（DUOLI_DASHSCOPE_API_KEY / DASHSCOPE_API_KEY），优先级高于本地文件。';
    } else if (st.source === 'file') {
      settingsKeySourceEl.textContent = '当前使用：本地已保存的密钥文件。';
    } else {
      settingsKeySourceEl.textContent = '当前未配置可用密钥：请粘贴 DashScope API Key 并保存。';
    }
  }
}

function setBusy(busy) {
  btnSend.disabled = busy;
  btnCompare.disabled = busy || !qwenApiOk;
  btnReload.disabled = busy;
  if (btnSettings) btnSettings.disabled = busy;
  if (btnSend) btnSend.classList.toggle('is-busy', !!busy);
}

function buildComparePrompt(userQuestion, results) {
  const lines = [
    '你是分析助手。请根据下面三个大模型对「同一用户问题」的回答，输出结构化对比（全部使用中文）。',
    '',
    '请严格使用下列标题（标题单独占一行，其后每条观点用「- 」开头）：',
    '相同观点：',
    '',
    '不同观点：',
    '',
    '—— 原始材料 ——',
    '用户问题：',
    userQuestion,
    '',
  ];
  for (const { cfg, r } of results) {
    lines.push(`【${cfg.name}】`);
    lines.push(r.ok ? r.text : `（未能获取有效回答：${r.error || '未知'}）`);
    lines.push('');
  }
  return lines.join('\n');
}

/** 流式回复：多久无「更长」抽取文本才认为该站说完（过短易截断流式） */
function buildComparePrompt(userQuestion, results) {
  const modelNames = results.map(({ cfg }) => cfg.name).join(' / ');
  const lines = [
    '你是一名资深信息分析师、政策研究员和内容审校负责人。',
    '请仅基于下面提供的多模型原始回复，生成一份高密度、可执行、适合直接进入讨论会的中文对比报告。',
    '',
    '分析原则：',
    '1. 只能依据原始回复，不要补充外部事实，不要自行编造信息。',
    '2. 先提炼共识，再拆解分歧，再指出遗漏、风险和行动建议。',
    '3. 每条尽量写清楚涉及哪些模型；若有分歧，明确写出各模型差异。',
    '4. 区分事实、判断、建议三种层次；带推测性质的内容要明确标出来。',
    '5. 不写空话套话，不重复题目，不写泛泛而谈的免责声明。',
    '',
    '输出格式必须严格使用以下一级标题，标题单独占一行；每条内容必须以“- ”开头：',
    '核心结论',
    '相同观点',
    '不同观点',
    '关键争议',
    '遗漏与盲区',
    '行动建议',
    '',
    '写作要求：',
    '1. “核心结论”用 3-5 条总结最值得保留的判断。',
    '2. “相同观点”写共同结论，并在括号中标明模型，例如（模型：Kimi / Doubao）。',
    '3. “不同观点”要写成真正的对照，例如“DeepSeek 认为……；Kimi 更强调……；Doubao 未提及……”。',
    '4. “关键争议”聚焦那些会影响判断方向、风险评估或执行策略的分歧。',
    '5. “遗漏与盲区”指出被忽略的时间线、条件、限制、代价、风险或适用前提。',
    '6. “行动建议”给出下一步提问建议、核查建议或采纳建议。',
    '',
    `参与对比模型：${modelNames}`,
    '用户问题：',
    userQuestion,
    '',
    '以下是原始回复：',
    '',
  ];
  for (const { cfg, r } of results) {
    lines.push(`【${cfg.name}】`);
    lines.push(r.ok ? r.text : `（未能获取有效回复：${r.error || '未知'}）`);
    lines.push('');
  }
  return lines.join('\n');
}

function buildComparePrompt(userQuestion, results) {
  const modelNames = results.map(({ cfg }) => cfg.name).join(' / ');
  const lines = [
    '你是一名资深信息分析师、政策研究员和内容审校负责人。',
    '请仅基于下面提供的多模型原始回复，生成一份高密度、可执行、适合直接进入讨论会的中文对比报告。',
    '',
    '分析原则：',
    '1. 只能依据原始回复，不要补充外部事实，不要自行编造信息。',
    '2. 先提炼共识，再拆解分歧，再指出遗漏、风险和行动建议。',
    '3. 每条尽量写清楚涉及哪些模型；若有分歧，明确写出各模型差异。',
    '4. 区分事实、判断、建议三种层次；带推测性质的内容要明确标出。',
    '5. 不写空话套话，不重复题目，不写泛泛而谈的免责声明。',
    '',
    '输出格式必须严格使用以下一级标题，标题单独占一行；每条内容必须以“• ”开头：',
    '核心结论',
    '相同观点',
    '不同观点',
    '关键争议',
    '遗漏与盲区',
    '行动建议',
    '',
    '写作要求：',
    '1. “核心结论”用 3-5 条总结最值得保留的判断。',
    '2. “相同观点”只写多个模型真正达成一致的部分，并在括号中标明模型来源。',
    '3. “不同观点”要写成可直接对照的分歧，不只是罗列观点。',
    '4. “关键争议”聚焦会影响决策方向、风险判断或执行策略的冲突点。',
    '5. “遗漏与盲区”指出被忽略的前提、条件、代价、时间线或适用范围。',
    '6. “行动建议”给出下一步该怎么追问、核查、采用或规避。',
    '',
    `参与对比模型：${modelNames}`,
    '用户问题：',
    userQuestion,
    '',
    '以下是原始回复：',
    '',
  ];
  for (const { cfg, r } of results) {
    lines.push(`【${cfg.name}】`);
    lines.push(r.ok ? r.text : `（未能获取有效回复：${r.error || '未知'}）`);
    lines.push('');
  }
  return lines.join('\n');
}

function getReplyStableIdleMs() {
  const el = document.getElementById('chk-reply-idle');
  if (!el) return 12000;
  return el.checked ? 12000 : 0;
}

/** 自首次检测到回复变长起至少再等多久，才允许用「空闲」结束（避免首包就停） */
const MIN_QUIET_AFTER_FIRST_REPLY_MS = 8000;

function getAutoSummarizeAfterSend() {
  const el = document.getElementById('chk-auto-summarize');
  if (!el) return true;
  return el.checked;
}

async function runConcurrentAsk(question) {
  const idleMs = getReplyStableIdleMs();
  syncQuestionChip(question);
  if (summaryBodyEl) {
    summaryBodyEl.textContent =
      idleMs > 0
        ? '等待三站流式输出（正文长时间不再变长后才会进入下一步）…'
        : '等待三站回复…';
  }
  refreshComparePanel();
  setSummaryStatus('三站并发中…');
  const chats = chatPlatforms();
  await Promise.all(chats.map((c) => waitUntilGuestLoaded(c.id, 90000)));
  chats.forEach((c) => {
    setColStatus(c.id, '正在发送 / 等待回复…', '');
    setColBody(c.id, '');
  });
  // 单站超时 45s，不重试——避免某站卡住拖累整体
  const PER_PLATFORM_TIMEOUT = 45000;
  const results = await Promise.all(
    chats.map(async (cfg) => {
      const r = await askOnePlatform(cfg, question, {
        replyStableIdleMs: idleMs,
        responseTimeoutMs: PER_PLATFORM_TIMEOUT,
        retries: 0,
      });
      if (r.ok) {
        setColStatus(cfg.id, '完成', 'ok');
        setColBody(cfg.id, r.text || '');
      } else {
        setColStatus(cfg.id, `超时/错误：${r.error || ''}`, 'err');
      }
      return { cfg, r };
    })
  );
  return results;
}

/**
 * @param {string} question
 * @param {{ results?: Array<{ cfg: any, r: any }> }} [opt] 若已跑过 runConcurrentAsk 可传入，避免重复提问
 */
async function runCompareAndSummarize(question, opt) {
  if (!summaryBodyEl) return;
  if (!qwenApiOk) {
    summaryBodyEl.textContent =
      '未配置千问 API。请点击左侧「API 密钥设置」保存 DashScope Key，或设置环境变量后重启应用。';
    refreshComparePanel();
    setSummaryStatus('未配置 API Key。');
    return;
  }
  const resultsPreloaded = opt && Array.isArray(opt.results);
  if (!resultsPreloaded) {
    summaryBodyEl.textContent =
      '等待三站流式输出结束后，再用千问生成对比（见上文说明）…';
    setSummaryStatus('三模型并发提问中…');
  }
  const results = resultsPreloaded ? opt.results : await runConcurrentAsk(question);
  const anyOk = results.some((x) => x.r.ok);
  if (!anyOk) {
    summaryBodyEl.textContent =
      '无法生成对比：Kimi / 豆包 / 元宝 均未返回有效内容。请检查登录、验证与选择器。';
    refreshComparePanel();
    setSummaryStatus('无可用原文，已跳过 API 调用。');
    return;
  }
  const prompt = buildComparePrompt(question, results);
  summaryBodyEl.textContent = '';
  setSummaryStatus('通义千问流式生成中…');
  try {
    let accumulated = '';
    const r = await api.qwenStream(prompt, (delta) => {
      accumulated += delta;
      summaryBodyEl.textContent = accumulated;
      refreshComparePanel();
      // 自动滚动到底部
      summaryBodyEl.scrollTop = summaryBodyEl.scrollHeight;
    });
    if (r.ok) {
      if (!accumulated.trim()) summaryBodyEl.textContent = String(r.text || '').trim();
      refreshComparePanel();
      setSummaryStatus('对比总结已完成（请核对下方「相同观点 / 不同观点」格式）。');
    } else {
      const err = r.error || '未知错误';
      summaryBodyEl.textContent = `生成失败：${err}\n\n请检查密钥额度、模型名（DUOLI_QWEN_MODEL）与网络。`;
      refreshComparePanel();
      setSummaryStatus(`千问 API：${err}`);
    }
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    summaryBodyEl.textContent = `请求异常：${msg}`;
    refreshComparePanel();
    setSummaryStatus(msg);
  }
}

function pushEmbedBounds() {
  if (!api || !platforms.length) return;
  const slots = platforms
    .map((cfg) => {
      const el = document.getElementById(`slot-${cfg.id}`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        id: cfg.id,
        x: Math.round(r.left),
        y: Math.round(r.top),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    })
    .filter(Boolean);
  api.reportEmbedBounds(slots);
}

let boundsPushPending = false;
function schedulePushBounds() {
  if (boundsPushPending) return;
  boundsPushPending = true;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      boundsPushPending = false;
      pushEmbedBounds();
    });
  });
}

function pickFirstPlausible(candidates) {
  if (!Array.isArray(candidates)) return '';
  // 取最长的合格候选：主回答始终比推荐按钮/建议问题长
  let best = '';
  for (const t of candidates) {
    if (isPlausibleReplyText(t) && t.length > best.length) best = t;
  }
  return best;
}

function buildExtractScript(selectors, minLen) {
  return `(function() {
    var sels = ${JSON.stringify(selectors)};
    var min = ${Number(minLen)};
    var out = [];
    var seen = {};
    // 跳过"推荐问题 / 建议" 容器（class 里含这些关键词的节点通常是 suggestion chip）
    var skipClassRe = /suggest|recommend|related|question-chip|follow.?up|guessyoulike|猜你想问/i;
    function isSuggestionContainer(el) {
      try {
        var cls = (el.className || '') + ' ' + (el.getAttribute('data-testid') || '');
        if (skipClassRe.test(cls)) return true;
        // 若直接父节点也命中，则跳过
        var p = el.parentElement;
        if (p) {
          var pcls = (p.className || '') + ' ' + (p.getAttribute('data-testid') || '');
          if (skipClassRe.test(pcls)) return true;
        }
      } catch (e2) {}
      return false;
    }
    for (var si = 0; si < sels.length; si++) {
      try {
        var nodes = Array.prototype.slice.call(document.querySelectorAll(sels[si]));
        for (var i = nodes.length - 1; i >= 0; i--) {
          if (isSuggestionContainer(nodes[i])) continue;
          var t = (nodes[i].innerText || '').trim();
          if (t.length >= min && !seen[t]) { seen[t] = true; out.push(t); }
        }
      } catch (e) {}
    }
    return out;
  })()`;
}

/**
 * 在嵌入页内执行：React 受控输入需改 prototype setter；多数站不能只靠 Enter，要点「发送」。
 */
function buildFillScript(text, cfg) {
  const meta = {
    inputSelectors: cfg.inputSelectors || [],
    submitButtonSelectors: cfg.submitButtonSelectors || [],
    useComposerSubmit: !!cfg.useComposerSubmit,
    syncInputAggressive: !!cfg.syncInputAggressive,
    minimalSubmitClicks: !!cfg.minimalSubmitClicks,
    submitViaEnter: !!cfg.submitViaEnter,
    preSubmitDelayMs: Math.max(0, Number(cfg.preSubmitDelayMs) || 0),
  };
  return `(async function() {
    var text = ${JSON.stringify(text)};
    var inputSelectors = ${JSON.stringify(meta.inputSelectors)};
    var submitSelectors = ${JSON.stringify(meta.submitButtonSelectors)};
    var useComposerSubmit = ${JSON.stringify(meta.useComposerSubmit)};
    var syncInputAggressive = ${JSON.stringify(meta.syncInputAggressive)};
    var minimalSubmitClicks = ${JSON.stringify(meta.minimalSubmitClicks)};
    var submitViaEnter = ${JSON.stringify(meta.submitViaEnter)};
    var preSubmitDelayMs = ${JSON.stringify(meta.preSubmitDelayMs)};
    function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
    function visible(el) {
      if (!el || el.disabled) return false;
      var r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      var st = window.getComputedStyle(el);
      if (st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) === 0) return false;
      return true;
    }
    function setReactValue(el, val) {
      try {
        var tag = el.tagName;
        if (tag === 'TEXTAREA') {
          var ta = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
          if (ta && ta.set) ta.set.call(el, val);
          else el.value = val;
        } else if (tag === 'INPUT') {
          var inp = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
          if (inp && inp.set) inp.set.call(el, val);
          else el.value = val;
        } else {
          return false;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        try {
          el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: val }));
        } catch (e0) {}
        return true;
      } catch (e1) {
        return false;
      }
    }
    function simulateNativePaste(el, val) {
      try {
        el.focus();
        try {
          el.select();
        } catch (s0) {
          try {
            el.setSelectionRange(0, (el.value || '').length);
          } catch (s1) {}
        }
        var dt = new DataTransfer();
        dt.setData('text/plain', val);
        var pe = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt });
        return el.dispatchEvent(pe);
      } catch (eP) {
        return false;
      }
    }
    function fireCompositionEnd(el) {
      try {
        el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '' }));
      } catch (eC) {}
    }
    function fireAggressiveInputSync(el, val) {
      try {
        el.dispatchEvent(
          new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: val,
          })
        );
      } catch (e0) {}
      try {
        el.dispatchEvent(
          new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertFromPaste',
            data: val,
          })
        );
      } catch (e1) {}
      try {
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: val }));
      } catch (e2) {}
      try {
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: val }));
      } catch (e3) {}
      try {
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (e4) {}
      try {
        el.dispatchEvent(new KeyboardEvent('keyup', { key: 'End', bubbles: true }));
      } catch (e5) {}
    }
    function pickLargestVisibleTextarea() {
      var best = null;
      var bestArea = 0;
      var tas = document.querySelectorAll('textarea');
      for (var pi = 0; pi < tas.length; pi++) {
        if (!visible(tas[pi])) continue;
        var r = tas[pi].getBoundingClientRect();
        var a = r.width * r.height;
        if (a > bestArea) {
          bestArea = a;
          best = tas[pi];
        }
      }
      if (best && bestArea >= 400) return best;
      return null;
    }
    async function reactSetValueInChunks(el, full) {
      if (!full || (el.tagName !== 'TEXTAREA' && el.tagName !== 'INPUT')) return;
      var proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      var desc = Object.getOwnPropertyDescriptor(proto, 'value');
      var chunkSz = 8;
      el.focus();
      if (desc && desc.set) desc.set.call(el, '');
      else el.value = '';
      await sleep(40);
      for (var start = 0; start < full.length; start += chunkSz) {
        var end = Math.min(start + chunkSz, full.length);
        var acc = full.substring(0, end);
        var piece = full.substring(start, end);
        if (desc && desc.set) desc.set.call(el, acc);
        else el.value = acc;
        try {
          el.dispatchEvent(
            new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: piece })
          );
        } catch (ie) {}
        await sleep(20);
      }
      try {
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (ce) {}
    }
    async function waitValueSynced(el, want, maxMs) {
      var due = Date.now() + maxMs;
      var need = Math.max(4, Math.floor(want.length * 0.9));
      while (Date.now() < due) {
        var got = (el.value || '').length;
        if (got >= need) return true;
        await sleep(100);
      }
      return (el.value || '').length >= Math.min(need, 8);
    }
    function fireEnterOn(el) {
      if (!el) return;
      el.focus();
      var t = document.activeElement || el;
      var names = ['keydown', 'keypress', 'keyup'];
      for (var i = 0; i < names.length; i++) {
        t.dispatchEvent(
          new KeyboardEvent(names[i], {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
          })
        );
      }
    }
    function fireModEnterOn(el) {
      if (!el) return;
      el.focus();
      var t = document.activeElement || el;
      var mac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || '');
      for (var i = 0; i < 3; i++) {
        t.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
            ctrlKey: !mac,
            metaKey: mac,
          })
        );
      }
    }
    function tryClickConfigured() {
      for (var si = 0; si < submitSelectors.length; si++) {
        try {
          var nodes = Array.prototype.slice.call(document.querySelectorAll(submitSelectors[si]));
          for (var k = nodes.length - 1; k >= 0; k--) {
            var b = nodes[k];
            if (visible(b)) {
              b.click();
              return true;
            }
          }
        } catch (e2) {}
      }
      return false;
    }
    function tryClickComposerSend(inp) {
      if (!inp || !inp.getBoundingClientRect) return false;
      var r0 = inp.getBoundingClientRect();
      var p = inp.parentElement;
      function fireClick(n) {
        try {
          n.click();
          return true;
        } catch (e0) {}
        try {
          n.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return true;
        } catch (e1) {}
        return false;
      }
      for (var d = 0; d < 14 && p; d++) {
        var nodes = Array.prototype.slice.call(
          p.querySelectorAll('button, [role="button"], div[tabindex="0"]')
        );
        var candidates = [];
        for (var i = 0; i < nodes.length; i++) {
          var n = nodes[i];
          if (n === inp || inp.contains(n) || n.contains(inp)) continue;
          if (!visible(n)) continue;
          if (n.getAttribute && n.getAttribute('aria-disabled') === 'true') continue;
          var br = n.getBoundingClientRect();
          if (br.width < 4 || br.height < 4) continue;
          if (br.width > 480 || br.height > 160) continue;
          var cx = br.left + br.width / 2;
          var cy = br.top + br.height / 2;
          var row = cy >= r0.top - 40 && cy <= r0.bottom + 55;
          var rightish = cx >= r0.left + Math.min(100, r0.width * 0.25);
          if (row && rightish) {
            candidates.push({ n: n, area: br.width * br.height, cx: cx });
          }
        }
        if (candidates.length) {
          candidates.sort(function (a, b) {
            if (Math.abs(b.cx - a.cx) > 8) return b.cx - a.cx;
            return a.area - b.area;
          });
          for (var j = 0; j < candidates.length; j++) {
            if (fireClick(candidates[j].n)) return true;
          }
        }
        p = p.parentElement;
      }
      return false;
    }
    function tryClickByText() {
      var generic = [
        'button[type="submit"]',
        'button[aria-label*="发送"]',
        'button[aria-label*="Send"]',
        '[role="button"][aria-label*="发送"]',
        '[role="button"][aria-label*="Send"]',
      ];
      for (var gi = 0; gi < generic.length; gi++) {
        try {
          var ns = Array.prototype.slice.call(document.querySelectorAll(generic[gi]));
          for (var j = ns.length - 1; j >= 0; j--) {
            var btn = ns[j];
            if (!visible(btn) || btn.disabled) continue;
            btn.click();
            return true;
          }
        } catch (e3) {}
      }
      var all = Array.prototype.slice.call(document.querySelectorAll('button, [role="button"]'));
      all.sort(function (a, b) {
        return (b.getBoundingClientRect().bottom || 0) - (a.getBoundingClientRect().bottom || 0);
      });
      for (var a = 0; a < all.length; a++) {
        var bt = all[a];
        if (!visible(bt) || bt.disabled) continue;
        var tx = (bt.innerText || bt.textContent || '').replace(/\\s+/g, ' ').trim();
        if (tx === '发送' || tx === '提交' || /^发送$/i.test(tx) || tx === 'Send' || /^发送\\s*$/i.test(tx)) {
          bt.click();
          return true;
        }
      }
      return false;
    }
    var el = null;
    if (syncInputAggressive && useComposerSubmit) {
      el = pickLargestVisibleTextarea();
    }
    if (!el) {
      for (var s = 0; s < inputSelectors.length; s++) {
        var c = document.querySelector(inputSelectors[s]);
        if (visible(c)) {
          el = c;
          break;
        }
      }
    }
    if (!el) {
      el = pickLargestVisibleTextarea();
    }
    if (!el) {
      var tas = Array.prototype.slice.call(document.querySelectorAll('textarea'));
      for (var t = tas.length - 1; t >= 0; t--) {
        if (visible(tas[t])) {
          el = tas[t];
          break;
        }
      }
    }
    if (!el) {
      var eds = Array.prototype.slice.call(document.querySelectorAll('[contenteditable="true"], [role="textbox"]'));
      for (var e = eds.length - 1; e >= 0; e--) {
        if (visible(eds[e])) {
          el = eds[e];
          break;
        }
      }
    }
    if (!el) throw new Error('找不到输入框（需在页面内能看到输入区域）');
    el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    await sleep(80);
    el.focus();

    // ── 写入策略：execCommand('insertText') 是 React 受控组件最可靠的插入方式 ──
    async function fillByExecCommand(target, val) {
      target.focus();
      await sleep(30);
      // 先清空：全选后删除
      try { target.select(); } catch (es) {
        try { target.setSelectionRange(0, (target.value || target.textContent || '').length); } catch (es2) {}
      }
      try { document.execCommand('selectAll', false); } catch (es3) {}
      try { document.execCommand('delete', false); } catch (ed) {}
      var proto = target.tagName === 'TEXTAREA'
        ? window.HTMLTextAreaElement.prototype
        : (target.tagName === 'INPUT' ? window.HTMLInputElement.prototype : null);
      if (proto) {
        var desc = Object.getOwnPropertyDescriptor(proto, 'value');
        if (desc && desc.set) desc.set.call(target, '');
        else target.value = '';
      }
      target.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(40);
      // 写入
      var inserted = document.execCommand('insertText', false, val);
      if (!inserted) {
        // execCommand 不支持时退回 nativeSetter + input event
        if (proto) {
          var desc2 = Object.getOwnPropertyDescriptor(proto, 'value');
          if (desc2 && desc2.set) desc2.set.call(target, val);
          else target.value = val;
        } else {
          target.textContent = val;
        }
        try { target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: val })); } catch (ei) {}
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return true;
    }

    var ok = false;
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      if (submitViaEnter) {
        // submitViaEnter 模式：用最简单的 nativeSetter，不做任何额外事件，不破坏页面状态
        ok = setReactValue(el, text);
        if (!ok) { el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); ok = true; }
      } else {
        await fillByExecCommand(el, text);
        ok = true;
      }
    } else if (el.isContentEditable || el.getAttribute('role') === 'textbox') {
      try { el.innerHTML = ''; } catch (e4) {}
      el.focus();
      document.execCommand('insertText', false, text);
      try {
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      } catch (e5) {}
      ok = true;
    }
    if (!ok) throw new Error('无法写入输入框');

    // 如果开启积极同步（非 submitViaEnter 模式），再做一次兜底确认
    if (syncInputAggressive && !submitViaEnter && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) {
      await sleep(120);
      var vlen = (el.value || '').length;
      if (vlen < Math.max(4, Math.floor(text.length * 0.85))) {
        setReactValue(el, text);
        fireAggressiveInputSync(el, text);
        simulateNativePaste(el, text);
        fireCompositionEnd(el);
        await sleep(120);
      }
      await waitValueSynced(el, text, 2500);
    }

    await sleep(200 + Math.floor(Math.random() * 150) + preSubmitDelayMs);

    // ── 发送 ──
    function doSingleClick() {
      if (useComposerSubmit && tryClickComposerSend(el)) return true;
      if (tryClickConfigured()) return true;
      if (tryClickByText()) return true;
      return false;
    }
    if (submitViaEnter) {
      // Enter 键提交：最干净，React 合成事件一定能感知
      el.focus();
      fireEnterOn(el);
    } else if (minimalSubmitClicks) {
      await sleep(300 + Math.floor(Math.random() * 200));
      doSingleClick();
    } else {
      var clicked = doSingleClick();
      if (!clicked) fireEnterOn(el);
      await sleep(120);
      if (!clicked) fireModEnterOn(el);
      await sleep(120);
      if (!clicked) {
        tryClickByText() || (useComposerSubmit && tryClickComposerSend(el));
      }
      await sleep(450 + Math.floor(Math.random() * 200));
      doSingleClick();
      await sleep(180);
      tryClickConfigured() ||
        tryClickByText() ||
        (useComposerSubmit && tryClickComposerSend(el));
    }
    return 'ok';
  })()`;
}

async function guestExec(id, code) {
  return api.guestExec(id, code);
}

async function extractPlausible(id, selectors, minLen) {
  const candidates = await guestExec(id, buildExtractScript(selectors, minLen));
  return pickFirstPlausible(candidates) || '';
}

async function tryFillAndSubmit(cfg, text) {
  await guestExec(cfg.id, buildFillScript(text, cfg));
}

function extractMatchesCompareFormat(candidates, successHints) {
  if (!Array.isArray(candidates) || !successHints.length) return '';
  for (const t of candidates) {
    if (typeof t !== 'string' || !t.trim()) continue;
    if (!successHints.every((h) => t.includes(h))) continue;
    if (!isPlausibleReplyText(t) || t.length < 24) continue;
    return t.trim();
  }
  const merged = candidates
    .filter((x) => typeof x === 'string' && x.trim())
    .join('\n\n')
    .trim();
  if (merged && successHints.every((h) => merged.includes(h)) && isPlausibleReplyText(merged)) {
    return merged;
  }
  return '';
}

async function waitGuestReply(id, responseSelectors, snippetBefore, timeoutMs, successHints, stableOpts) {
  const hints = Array.isArray(successHints) && successHints.length ? successHints : null;
  const idleMs =
    stableOpts && typeof stableOpts.replyStableIdleMs === 'number' && stableOpts.replyStableIdleMs > 0
      ? stableOpts.replyStableIdleMs
      : 0;
  const minQuietAfterFirst =
    typeof stableOpts?.minQuietAfterFirstReplyMs === 'number'
      ? stableOpts.minQuietAfterFirstReplyMs
      : MIN_QUIET_AFTER_FIRST_REPLY_MS;
  const minStable = (stableOpts && stableOpts.minStableChars) || 14;
  const baseSnippet = String(snippetBefore || '');
  let stableStr = null;
  let stableSince = 0;
  let firstGrowthAt = null;
  let lastLen = baseSnippet.length;
  const deadline = Date.now() + timeoutMs;
  let lastDom = snippetBefore || '';
  while (Date.now() < deadline) {
    const candidates = await guestExec(id, buildExtractScript(responseSelectors, 8));
    if (hints) {
      const hit = extractMatchesCompareFormat(candidates, hints);
      if (hit) return hit;
    }
    const dom = pickFirstPlausible(candidates) || '';
    const domLen = dom.length;
    if (idleMs > 0 && dom && isPlausibleReplyText(dom) && dom.length >= minStable) {
      const grown =
        dom.length > baseSnippet.length + 6 || (baseSnippet.length < 10 && dom !== baseSnippet);
      if (grown) {
        if (!firstGrowthAt) firstGrowthAt = Date.now();
        if (domLen > lastLen) {
          lastLen = domLen;
          stableStr = dom;
          stableSince = Date.now();
        } else if (dom === stableStr && Date.now() - stableSince >= idleMs) {
          if (firstGrowthAt && Date.now() - firstGrowthAt >= minQuietAfterFirst) {
            return dom.trim();
          }
        }
      } else {
        stableStr = null;
      }
    } else {
      stableStr = null;
    }
    const domGrew = dom && dom.length > (lastDom?.length || 0) + 8;
    if (domGrew) {
      lastDom = dom;
      if (dom.length > lastLen) lastLen = dom.length;
    }
    // 未启用「空闲结束」时才允许「刚变长就立刻收一句」——否则会截断流式长回答
    if (idleMs <= 0 && domGrew && dom.trim().length >= 12) {
      await sleep(450 + Math.random() * 250);
      const c2 = await guestExec(id, buildExtractScript(responseSelectors, 8));
      if (hints) {
        const hit2 = extractMatchesCompareFormat(c2, hints);
        if (hit2) return hit2;
      }
      const dom2 = pickFirstPlausible(c2) || '';
      const best = dom2.length >= dom.length ? dom2 : dom;
      if (isPlausibleReplyText(best)) return best.trim();
    }
    await sleep(550 + Math.random() * 350);
  }
  const tail = await guestExec(id, buildExtractScript(responseSelectors, 12));
  if (hints && Array.isArray(tail)) {
    const hit = extractMatchesCompareFormat(tail, hints);
    if (hit) return hit;
  }
  return (await extractPlausible(id, responseSelectors, 12)).trim();
}

async function askOnePlatform(cfg, question, opts) {
  const retries = opts.retries ?? 2;
  const responseTimeoutMs = opts.responseTimeoutMs ?? 120000;
  const successHints = opts.compareSuccessHints || null;
  const replyStableIdleMs =
    typeof opts.replyStableIdleMs === 'number' ? opts.replyStableIdleMs : getReplyStableIdleMs();
  let snippetBefore = await extractPlausible(cfg.id, cfg.responseSelectors, 20);
  let lastErr = '';
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        await sleep(1500 + Math.random() * 2000);
        snippetBefore = await extractPlausible(cfg.id, cfg.responseSelectors, 20);
      }
      await tryFillAndSubmit(cfg, question);
      await sleep(cfg.settleMs + Math.floor(Math.random() * 600));
      const text = await waitGuestReply(
        cfg.id,
        cfg.responseSelectors,
        snippetBefore,
        responseTimeoutMs,
        successHints,
        {
          replyStableIdleMs,
          minStableChars: opts.minStableChars ?? 14,
          minQuietAfterFirstReplyMs:
            typeof opts.minQuietAfterFirstReplyMs === 'number'
              ? opts.minQuietAfterFirstReplyMs
              : MIN_QUIET_AFTER_FIRST_REPLY_MS,
        }
      );
      if (!text || !isPlausibleReplyText(text)) {
        throw new Error('未抓到有效回复（选择器可能已变）');
      }
      return { ok: true, text: text.trim() };
    } catch (e) {
      lastErr = e && e.message ? e.message : String(e);
    }
  }
  return { ok: false, error: lastErr };
}

async function waitUntilGuestLoaded(id, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (guestLoaded.has(id)) return;
    await sleep(80);
  }
}

async function syncEmbedHosts() {
  if (!api || typeof api.getEmbedHosts !== 'function') return;
  try {
    const hosts = (await api.getEmbedHosts()) || {};
    Object.entries(hosts).forEach(([id, host]) => applyHostMode(id, host));
    renderPlatformVisibility();
  } catch (e) {
    /* ignore */
  }
}

function wireDragPopout() {
  document.querySelectorAll('[data-drag-popout]').forEach((head) => {
    let dragState = null;
    head.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest('button')) return;
      const id = head.getAttribute('data-drag-popout');
      if (!id || platformVisibility[id]?.mode !== 'visible') return;
      try {
        head.setPointerCapture(event.pointerId);
      } catch (e) {
        /* ignore */
      }
      dragState = {
        id,
        startX: event.clientX,
        startY: event.clientY,
        popped: false,
      };
      head.classList.add('is-dragging');
    });
    head.addEventListener('pointermove', (event) => {
      if (!dragState || dragState.popped) return;
      const dx = event.clientX - dragState.startX;
      const dy = event.clientY - dragState.startY;
      if (Math.hypot(dx, dy) < 28) return;
      dragState.popped = true;
      head.classList.remove('is-dragging');
      popoutPlatform(dragState.id, {
        x: event.screenX - 180,
        y: event.screenY - 24,
        width: 520,
        height: 900,
      });
    });
    const clearDrag = () => {
      dragState = null;
      head.classList.remove('is-dragging');
    };
    head.addEventListener('pointerup', clearDrag);
    head.addEventListener('pointercancel', clearDrag);
    head.addEventListener('lostpointercapture', clearDrag);
  });
}

function wireUi() {
  ensurePlatformVisibilityState();
  ensurePopoutButtons();
  wireDragPopout();
  api.onEmbedEvent((ev) => {
    if (ev.type === 'dom-ready') {
      guestLoaded.add(ev.id);
      setColStatus(ev.id, '页面就绪（如未登录，请先在该栏完成登录）', '');
    }
    if (ev.type === 'fail-load') {
      setColStatus(ev.id, `加载失败：${ev.errorDescription || ev.errorCode}`, 'err');
    }
  });

  api.onEmbedEvent((ev) => {
    if (ev.type === 'host-changed') {
      applyHostMode(ev.id, ev.host);
      renderPlatformVisibility();
    }
  });

  const stackPanel = document.querySelector('.panel.right.stack');
  if (stackPanel) {
    const ro = new ResizeObserver(() => {
      schedulePushBounds();
      positionToolMenu();
    });
    ro.observe(stackPanel);
    platforms.forEach((cfg) => {
      const el = document.getElementById(`slot-${cfg.id}`);
      if (el) ro.observe(el);
    });
    const addToolBtn = document.getElementById('btnAddTool');
    if (addToolBtn) ro.observe(addToolBtn);
  }

  window.addEventListener('load', () => {
    schedulePushBounds();
    setTimeout(schedulePushBounds, 50);
    setTimeout(schedulePushBounds, 200);
    setTimeout(schedulePushBounds, 800);
    resizeComposerInput();
    if (qEl) qEl.focus();
  });

  window.addEventListener('resize', () => {
    schedulePushBounds();
    positionToolMenu();
  });

  if (qEl) {
    syncQuestionChip(qEl.value);
    resizeComposerInput();
    qEl.addEventListener('input', () => {
      syncQuestionChip(qEl.value);
      resizeComposerInput();
    });
    qEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        if (!btnSend.disabled) btnSend.click();
      }
    });
  }

  if (btnOpenCompare) {
    btnOpenCompare.addEventListener('click', () => openComparePanel());
  }

  $('#btnCloseCompare')?.addEventListener('click', () => closeComparePanel());
  comparePanel?.querySelectorAll('[data-close-compare]').forEach((node) => {
    node.addEventListener('click', () => closeComparePanel());
  });

  $('#btnCopyDiff')?.addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    if (!(btn instanceof HTMLButtonElement)) return;
    const text = getDifferenceText().trim();
    if (!text) {
      btn.textContent = '暂无差异';
      setTimeout(() => {
        btn.textContent = '复制差异内容';
      }, 1400);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = '已复制差异';
    } catch (e) {
      btn.textContent = '复制失败';
    } finally {
      setTimeout(() => {
        btn.textContent = '复制差异内容';
      }, 1600);
    }
  });

  document.querySelectorAll('[data-reload]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-reload');
      if (!id) return;
      guestLoaded.delete(id);
      setColStatus(id, '重新加载中…', '');
      try {
        await api.reloadGuest(id);
      } catch (e) {
        setColStatus(id, `刷新失败：${e.message || e}`, 'err');
      }
      schedulePushBounds();
    });
  });

  document.querySelectorAll('[data-popout]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-popout');
      if (!id) return;
      await popoutPlatform(id);
    });
  });

  document.querySelectorAll('[data-collapse]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-collapse');
      if (!id) return;
      setPlatformMode(id, 'collapsed');
      setStatus('已将 AI 工具收起到右侧工具栏。');
    });
  });

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-close');
      if (!id) return;
      setPlatformMode(id, 'closed');
      setStatus('已关闭该 AI 工具，可通过“添加 AI 工具”恢复。');
    });
  });

  btnReload.addEventListener('click', async () => {
    chatPlatforms().forEach((cfg) => {
      guestLoaded.delete(cfg.id);
      setColStatus(cfg.id, '重新加载中…', '');
    });
    if (!chatPlatforms().length) {
      setStatus('当前没有可刷新的 AI 工具。');
      return;
    }
    try {
      await Promise.all(chatPlatforms().map((cfg) => api.reloadGuest(cfg.id)));
    } catch (e) {
      setStatus(`重新加载失败：${e.message || e}`);
      return;
    }
    setStatus('已请求刷新全部可用 AI 工具。');
    schedulePushBounds();
  });

  $('#btnDockRefresh')?.addEventListener('click', () => btnReload.click());

  $('#btnAddTool')?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!toolMenuEl) return;
    const willOpen = toolMenuEl.hasAttribute('hidden');
    renderToolMenu();
    setToolMenuOpen(willOpen);
  });

  document.addEventListener('click', (event) => {
    if (!toolMenuEl || toolMenuEl.hasAttribute('hidden')) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    const addToolBtn = document.getElementById('btnAddTool');
    if (!toolMenuEl.contains(target) && !(addToolBtn && addToolBtn.contains(target))) {
      setToolMenuOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (comparePanel && !comparePanel.hasAttribute('hidden')) {
      closeComparePanel();
      return;
    }
    if (toolMenuEl && !toolMenuEl.hasAttribute('hidden')) {
      setToolMenuOpen(false);
    }
  });

  btnSend.addEventListener('click', async () => {
    const q = qEl.value.trim();
    if (!q) {
      setStatus('请先输入问题。');
      qEl.focus();
      return;
    }
    if (!chatPlatforms().length) {
      setStatus('请先恢复至少一个 AI 工具。');
      return;
    }
    setBusy(true);
    syncQuestionChip(q);
    setStatus('多模型并发执行中…');
    if (summaryBodyEl && !getAutoSummarizeAfterSend()) {
      summaryBodyEl.textContent = '本次仅发送到多模型，不自动打开对比弹层；如需结构化分析，请点击“对比”。';
      refreshComparePanel();
    }
    setSummaryStatus('');
    try {
      const results = await runConcurrentAsk(q);
      if (getAutoSummarizeAfterSend() && qwenApiOk) {
        setSummaryStatus('三站已有结果，正在自动生成结构化对比…');
        await runCompareAndSummarize(q, { results });
        setStatus('发送完成，并已生成结构化对比。');
      } else {
        setStatus('多模型发送完成，可继续点击“对比”生成结构化分析。');
      }
    } catch (e) {
      setStatus(`失败：${e.message || e}`);
    } finally {
      setBusy(false);
    }
  });

  btnCompare.addEventListener('click', async () => {
    const q = qEl.value.trim();
    if (!q) {
      setStatus('请先输入问题。');
      qEl.focus();
      return;
    }
    if (!qwenApiOk) {
      setStatus('未配置 DashScope API Key，当前无法使用对比。');
      return;
    }
    if (!chatPlatforms().length) {
      setStatus('请先恢复至少一个 AI 工具。');
      return;
    }
    setBusy(true);
    syncQuestionChip(q);
    setStatus('对比流程：多模型并发 -> 结构化总结');
    try {
      await runCompareAndSummarize(q);
      openComparePanel();
      setStatus('对比流程已完成。');
    } catch (e) {
      setStatus(`失败：${e.message || e}`);
      setSummaryStatus(e.message || String(e));
    } finally {
      setBusy(false);
    }
  });

  ensurePlatformVisibilityState();
  renderPlatformVisibility();
}

function wireExportPdf() {
  const btn = document.getElementById('btnExportPdf');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const text = summaryBodyEl ? summaryBodyEl.textContent.trim() : '';
    if (!text || text.startsWith('点击“对比”')) {
      btn.textContent = '暂无内容';
      setTimeout(() => {
        btn.textContent = '导出对比报告';
      }, 1500);
      return;
    }
    btn.disabled = true;
    btn.textContent = '生成中…';
    try {
      const q = qEl ? qEl.value.trim() : '';
      const payload = buildReportPayload(q);
      const r = await api.exportPdf(payload);
      if (r && r.ok) {
        btn.textContent = '✓ 已保存';
      } else if (r && r.error === 'canceled') {
        btn.textContent = '导出对比报告';
      } else {
        btn.textContent = `失败：${r && r.error || '未知'}`;
      }
    } catch (e) {
      btn.textContent = `失败：${e.message || e}`;
    } finally {
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = '导出对比报告';
      }, 2500);
    }
  });
}

function formatLicenseTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', { hour12: false });
}

function setLicenseLocked(locked) {
  document.body.classList.toggle('is-license-locked', !!locked);
  if (!licenseGateEl) return;
  if (locked) {
    licenseGateEl.removeAttribute('hidden');
  } else {
    licenseGateEl.setAttribute('hidden', '');
  }
}

function renderLicenseState(state) {
  const current = state || { ok: false, message: '请先输入应用密钥。' };
  if (licenseStateTextEl) {
    licenseStateTextEl.textContent = current.message || (current.ok ? '应用密钥有效。' : '请先输入应用密钥。');
  }
  if (licenseExpiryTextEl) {
    if (current.ok) {
      const timeText = formatLicenseTime(current.expiresAt);
      const daysText = Number.isFinite(current.daysLeft) ? `，剩余 ${current.daysLeft} 天` : '';
      licenseExpiryTextEl.textContent = timeText ? `到期时间：${timeText}${daysText}` : '';
      licenseExpiryTextEl.classList.remove('err');
    } else {
      licenseExpiryTextEl.textContent = current.code === 'clock-rollback' ? '系统时间异常时，应用会拒绝继续使用。' : '';
      licenseExpiryTextEl.classList.toggle('err', current.code === 'clock-rollback');
    }
  }
  setLicenseLocked(!current.ok);
}

async function syncLicenseState() {
  if (!api || typeof api.getLicenseState !== 'function') {
    const fallback = { ok: false, code: 'unsupported', message: '当前环境不支持应用密钥校验。' };
    renderLicenseState(fallback);
    return fallback;
  }
  const state = await api.getLicenseState();
  renderLicenseState(state);
  return state;
}

function wireLicenseGate() {
  if (!licenseGateEl || licenseGateEl.dataset.wired === '1') return;
  licenseGateEl.dataset.wired = '1';

  if (btnActivateLicense) {
    btnActivateLicense.addEventListener('click', async () => {
      if (!api || typeof api.activateLicense !== 'function' || !licenseTokenInputEl) return;
      if (licenseMsgEl) {
        licenseMsgEl.textContent = '';
        licenseMsgEl.classList.remove('err');
      }
      btnActivateLicense.disabled = true;
      try {
        const state = await api.activateLicense(licenseTokenInputEl.value.trim());
        renderLicenseState(state);
        if (state.ok) {
          if (licenseMsgEl) licenseMsgEl.textContent = '应用密钥已生效，正在解锁工作台。';
          licenseTokenInputEl.value = '';
          if (typeof api.ensureEmbedViews === 'function') {
            await api.ensureEmbedViews();
          }
          await ensureWorkbenchBoot();
        } else if (licenseMsgEl) {
          licenseMsgEl.textContent = state.message || '应用密钥校验失败。';
          licenseMsgEl.classList.add('err');
        }
      } catch (e) {
        if (licenseMsgEl) {
          licenseMsgEl.textContent = e && e.message ? e.message : String(e);
          licenseMsgEl.classList.add('err');
        }
      } finally {
        btnActivateLicense.disabled = false;
      }
    });
  }

  if (btnClearLicense) {
    btnClearLicense.addEventListener('click', async () => {
      if (!api || typeof api.clearLicense !== 'function') return;
      const state = await api.clearLicense();
      renderLicenseState(state);
      if (licenseTokenInputEl) licenseTokenInputEl.value = '';
      if (licenseMsgEl) {
        licenseMsgEl.textContent = '已清除本机应用密钥。';
        licenseMsgEl.classList.remove('err');
      }
    });
  }
}

async function ensureWorkbenchBoot() {
  if (workbenchBooted) return true;

  try {
    platforms = await api.getPlatforms();
  } catch (e) {
    setStatus(`读取站点配置失败：${e && e.message ? e.message : e}`);
    return false;
  }

  if (!Array.isArray(platforms) || platforms.length === 0) {
    setStatus('站点配置为空。');
    return false;
  }

  renderPlatformScaffold();
  wireUi();
  wireSettings();
  wireExportPdf();
  await syncEmbedHosts();
  try {
    if (typeof api.getQwenConfigured === 'function') {
      applyQwenStatus(await api.getQwenConfigured());
    }
  } catch (e) {
    applyQwenStatus({ ok: false, source: 'none' });
  }
  if (!qwenApiOk) {
    setSummaryStatus('未配置千问 API：请先在左侧 API 设置里保存 DashScope Key。');
  }
  schedulePushBounds();
  setTimeout(schedulePushBounds, 100);
  setTimeout(schedulePushBounds, 500);
  workbenchBooted = true;
  return true;
}

function collapseSettingsPanel() {
  if (settingsPanel) settingsPanel.setAttribute('hidden', '');
  if (btnSettings) btnSettings.setAttribute('aria-expanded', 'false');
}

function wireSettings() {
  if (!settingsPanel || !btnSettings) return;

  btnSettings.setAttribute('aria-expanded', 'false');
  btnSettings.setAttribute('aria-controls', 'settings-panel');

  btnSettings.addEventListener('click', async () => {
    const willOpen = settingsPanel.hasAttribute('hidden');
    if (willOpen) {
      try {
        if (typeof api.getQwenConfigured === 'function') {
          applyQwenStatus(await api.getQwenConfigured());
        }
      } catch (e) {
        applyQwenStatus({ ok: false, source: 'none' });
      }
      if (dashscopeKeyInput) dashscopeKeyInput.value = '';
      if (settingsMsgEl) {
        settingsMsgEl.textContent = '';
        settingsMsgEl.classList.remove('err');
      }
      settingsPanel.removeAttribute('hidden');
      btnSettings.setAttribute('aria-expanded', 'true');
    } else {
      collapseSettingsPanel();
    }
  });

  $('#settings-close').addEventListener('click', () => collapseSettingsPanel());

  $('#settings-save').addEventListener('click', async () => {
    if (!settingsMsgEl || !dashscopeKeyInput) return;
    const v = dashscopeKeyInput.value.trim();
    settingsMsgEl.classList.remove('err');
    if (typeof api.saveDashScopeKey !== 'function') {
      settingsMsgEl.textContent = '当前环境不支持保存密钥。';
      settingsMsgEl.classList.add('err');
      return;
    }
    try {
      const r = await api.saveDashScopeKey(v);
      applyQwenStatus(r);
      if (r.saveOk) {
        settingsMsgEl.textContent = '已保存到本机。';
        dashscopeKeyInput.value = '';
      } else {
        settingsMsgEl.textContent = r.error || '保存失败';
        settingsMsgEl.classList.add('err');
      }
    } catch (e) {
      settingsMsgEl.textContent = e && e.message ? e.message : String(e);
      settingsMsgEl.classList.add('err');
    }
  });

  $('#settings-clear').addEventListener('click', async () => {
    if (
      !confirm(
        '确定清除本地保存的密钥文件？\n（若设置了环境变量，清除文件后仍会使用环境变量中的密钥。）'
      )
    ) {
      return;
    }
    if (!settingsMsgEl || typeof api.clearDashScopeKeyFile !== 'function') return;
    settingsMsgEl.classList.remove('err');
    try {
      const r = await api.clearDashScopeKeyFile();
      applyQwenStatus(r);
      if (r.source === 'env') {
        settingsMsgEl.textContent = '已删除本地文件，当前仍使用环境变量中的密钥。';
      } else if (r.ok) {
        settingsMsgEl.textContent = '状态已更新。';
      } else {
        settingsMsgEl.textContent = '已清除本地文件。请保存新密钥或设置环境变量。';
      }
    } catch (e) {
      settingsMsgEl.textContent = e && e.message ? e.message : String(e);
      settingsMsgEl.classList.add('err');
    }
  });
}

async function boot() {
  api = window.duoliulan;
  if (!api || typeof api.getPlatforms !== 'function') {
    setStatus('未检测到 Electron 桥接：请关闭本窗口，在项目根目录执行 npm start（不要双击用浏览器打开 HTML）。');
    return;
  }

  try {
    platforms = await api.getPlatforms();
  } catch (e) {
    setStatus(`读取站点配置失败：${e && e.message ? e.message : e}`);
    return;
  }

  if (!Array.isArray(platforms) || platforms.length === 0) {
    setStatus('站点配置为空。');
    return;
  }

  renderPlatformScaffold();
  wireUi();
  wireSettings();
  wireExportPdf();
  await syncEmbedHosts();
  try {
    if (typeof api.getQwenConfigured === 'function') {
      applyQwenStatus(await api.getQwenConfigured());
    }
  } catch (e) {
    applyQwenStatus({ ok: false, source: 'none' });
  }
  if (!qwenApiOk) {
    setSummaryStatus('未配置千问 API：请点击左侧「API 密钥设置」保存 DashScope Key，或设置环境变量后重启。');
  }
  schedulePushBounds();
  setTimeout(schedulePushBounds, 100);
  setTimeout(schedulePushBounds, 500);
}

async function boot() {
  api = window.duoliulan;
  if (!api || typeof api.getPlatforms !== 'function') {
    setStatus('未检测到 Electron 桥接，请在项目目录运行 npm start。');
    return;
  }

  wireLicenseGate();

  try {
    const licenseState = await syncLicenseState();
    if (!licenseState.ok) {
      setStatus('请先输入应用密钥后再使用。');
      return;
    }
  } catch (e) {
    setStatus(`应用密钥校验失败：${e && e.message ? e.message : e}`);
    setLicenseLocked(true);
    return;
  }

  await ensureWorkbenchBoot();
}

boot();
