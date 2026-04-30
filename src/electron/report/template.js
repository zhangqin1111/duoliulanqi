'use strict';

const charts = require('./chart-svg');
const wordcloud = require('./wordcloud');

const escapeXml = charts.escapeXml;

function safeArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item == null ? '' : item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function formatLocalTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toLocaleString('zh-CN', { hour12: false });
  return date.toLocaleString('zh-CN', { hour12: false });
}

function stripInlineMarkdown(text) {
  let out = String(text || '');
  out = out.replace(/\*\*(.+?)\*\*/g, '$1');
  out = out.replace(/\*\*+/g, '');
  out = out.replace(/(^|[^\\])`([^`]+)`/g, '$1$2');
  return out.trim();
}

function renderBullet(line) {
  const text = stripInlineMarkdown(String(line || '').trim());
  if (!text) return '';
  const cleaned = text.replace(/^[-•·*\d.()（）、\s]+/, '').trim();
  if (!cleaned) return '';
  const cm = cleaned.match(/^([^:：]{2,18})[:：]\s*(.+)$/);
  if (cm) {
    return `<li><strong class="bullet-lead">${escapeXml(cm[1])}</strong><span class="bullet-sep">·</span><span class="bullet-body">${escapeXml(cm[2])}</span></li>`;
  }
  const idx = cleaned.search(/[。!?]/);
  if (idx > 4 && idx < 70) {
    const lead = cleaned.slice(0, idx + 1);
    const rest = cleaned.slice(idx + 1).trim();
    return `<li><strong class="bullet-lead">${escapeXml(lead)}</strong>${rest ? ` <span class="bullet-body">${escapeXml(rest)}</span>` : ''}</li>`;
  }
  if (cleaned.length <= 18) {
    return `<li><strong class="bullet-lead">${escapeXml(cleaned)}</strong></li>`;
  }
  return `<li><span class="bullet-body bullet-body--solo">${escapeXml(cleaned)}</span></li>`;
}

function isTableRow(line) {
  const t = String(line || '').trim();
  return /^\|.*\|$/.test(t);
}
function isTableSeparator(line) {
  const t = String(line || '').trim();
  return /^\|\s*[:\-]+[\s|:\-]*\|?$/.test(t) && t.includes('-');
}
function parseTableRow(line) {
  return String(line || '')
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => stripInlineMarkdown(c.trim()));
}
function renderMarkdownTable(rows) {
  if (!rows.length) return '';
  const header = rows[0];
  const bodyRows = rows.slice(1);
  const headHtml = `<thead><tr>${header.map((c) => `<th>${escapeXml(c)}</th>`).join('')}</tr></thead>`;
  const bodyHtml = `<tbody>${bodyRows
    .map((row) => `<tr>${row.map((c) => `<td>${escapeXml(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody>`;
  return `<div class="md-table-wrap"><table class="md-table">${headHtml}${bodyHtml}</table></div>`;
}

function renderBulletList(items, emptyText) {
  const list = safeArray(items);
  if (!list.length) return `<div class="empty-note">${escapeXml(emptyText || '本节暂无可导出的结构化内容。')}</div>`;

  const blocks = [];
  let bulletBuf = [];
  let tableBuf = [];
  const flushBullets = () => {
    if (!bulletBuf.length) return;
    blocks.push(`<ul class="bullet-list">${bulletBuf.map(renderBullet).filter(Boolean).join('')}</ul>`);
    bulletBuf = [];
  };
  const flushTable = () => {
    if (!tableBuf.length) return;
    const rows = tableBuf.filter((l) => !isTableSeparator(l)).map(parseTableRow);
    blocks.push(renderMarkdownTable(rows));
    tableBuf = [];
  };

  for (const item of list) {
    if (isTableRow(item) || (tableBuf.length && isTableSeparator(item))) {
      flushBullets();
      tableBuf.push(item);
    } else {
      flushTable();
      bulletBuf.push(item);
    }
  }
  flushBullets();
  flushTable();
  return blocks.join('') || `<div class="empty-note">${escapeXml(emptyText || '本节暂无可导出的结构化内容。')}</div>`;
}

const SECTION_ICONS = {
  compass: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="16" cy="16" r="12"/><polygon points="16,7 19,16 16,25 13,16" fill="currentColor" stroke="none" opacity="0.85"/><circle cx="16" cy="16" r="1.5" fill="#fff" stroke="none"/></svg>`,
  timeline: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="16" x2="27" y2="16"/><circle cx="9" cy="16" r="2.6" fill="currentColor"/><circle cx="16" cy="16" r="2.6" fill="currentColor"/><circle cx="23" cy="16" r="2.6" fill="currentColor"/><line x1="9" y1="11" x2="9" y2="7"/><line x1="16" y1="21" x2="16" y2="25"/><line x1="23" y1="11" x2="23" y2="7"/></svg>`,
  network: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="11" r="3.4" fill="currentColor"/><circle cx="24" cy="9" r="3.4"/><circle cx="22" cy="23" r="3.4" fill="currentColor"/><circle cx="9" cy="24" r="3.4"/><line x1="11" y1="13" x2="22" y2="11"/><line x1="11" y1="22" x2="20" y2="23"/><line x1="9" y1="14" x2="9" y2="21"/><line x1="24" y1="12" x2="22" y2="20"/></svg>`,
  prism: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="16,5 27,25 5,25" fill="currentColor" opacity="0.18"/><polygon points="16,5 27,25 5,25"/><line x1="3" y1="14" x2="11" y2="18" stroke-width="1.4"/><line x1="29" y1="11" x2="22" y2="14" stroke-width="1.4"/><line x1="29" y1="17" x2="22" y2="17" stroke-width="1.4"/></svg>`,
  lens: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="14" cy="14" r="8"/><circle cx="14" cy="14" r="4" fill="currentColor" opacity="0.35"/><line x1="20" y1="20" x2="27" y2="27"/></svg>`,
  target: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="6.5"/><circle cx="16" cy="16" r="2.4" fill="currentColor"/><line x1="16" y1="2" x2="16" y2="7"/><line x1="16" y1="25" x2="16" y2="30"/><line x1="2" y1="16" x2="7" y2="16"/><line x1="25" y1="16" x2="30" y2="16"/></svg>`,
  bars: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><rect x="6" y="14" width="4" height="13" rx="1.2" fill="currentColor"/><rect x="14" y="8" width="4" height="19" rx="1.2" fill="currentColor" opacity="0.7"/><rect x="22" y="18" width="4" height="9" rx="1.2" fill="currentColor" opacity="0.5"/><line x1="4" y1="27" x2="28" y2="27"/></svg>`,
};

const SECTION_THEME = {
  global: { tone: '#3c6df0', icon: 'compass' },
  trace: { tone: '#0ea5e9', icon: 'timeline' },
  logic: { tone: '#9b51e0', icon: 'network' },
  spectrum: { tone: '#f6a23a', icon: 'prism' },
  alignment: { tone: '#e35d6a', icon: 'lens' },
  selection: { tone: '#18794e', icon: 'target' },
  visualization: { tone: '#1f2430', icon: 'bars' },
};

function renderSection(opts) {
  const tone = opts.tone || '#3c6df0';
  const icon = SECTION_ICONS[opts.icon] || SECTION_ICONS.compass;
  const number = String(opts.number || '').padStart(2, '0');
  const charts = opts.charts ? `<div class="section-charts">${opts.charts}</div>` : '';
  const note = opts.note ? `<p class="section-note">${escapeXml(opts.note)}</p>` : '';
  return `
    <section class="report-section" style="--tone:${tone}">
      <header class="section-head">
        <div class="section-num">${escapeXml(number)}</div>
        <div class="section-icon" aria-hidden="true">${icon}</div>
        <div class="section-titles">
          <div class="section-eyebrow">${escapeXml(opts.eyebrow || 'CHAPTER')}</div>
          <h2 class="section-title">${escapeXml(opts.title || '')}</h2>
          ${opts.intro ? `<p class="section-intro">${escapeXml(opts.intro)}</p>` : ''}
        </div>
      </header>
      <div class="section-body">
        ${renderBulletList(opts.items, opts.emptyText)}
        ${note}
        ${charts}
      </div>
    </section>
  `;
}

function renderCoverPage(meta) {
  const question = String(meta.question || '').trim();
  const time = formatLocalTime(meta.generatedAt);
  const modelNames = (meta.modelNames || []).filter(Boolean);
  const modelChips = modelNames
    .map((n, idx) => `<span class="cover-chip" style="--chip:${charts.MODEL_COLORS[idx % charts.MODEL_COLORS.length] || '#3c6df0'}">${escapeXml(n)}</span>`)
    .join('');
  const tension = meta.coreTension || {};
  const tensionLine = tension && tension.summary ? String(tension.summary).trim() : '';
  const axisLine = tension && (tension.axis_x || tension.axis_y) ? `${String(tension.axis_x || '').trim()} ↔ ${String(tension.axis_y || '').trim()}` : '';

  return `
    <section class="cover-page">
      <div class="cover-bg" aria-hidden="true">
        <svg viewBox="0 0 800 1000" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="cover-grad-a" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#5f82ff" stop-opacity="0.55"/>
              <stop offset="100%" stop-color="#5f82ff" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="cover-grad-b" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ffb54f" stop-opacity="0.55"/>
              <stop offset="100%" stop-color="#ffb54f" stop-opacity="0"/>
            </linearGradient>
            <radialGradient id="cover-grad-c" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#18794e" stop-opacity="0.35"/>
              <stop offset="100%" stop-color="#18794e" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <rect width="800" height="1000" fill="#f5f3ef"/>
          <circle cx="160" cy="220" r="320" fill="url(#cover-grad-a)"/>
          <circle cx="660" cy="170" r="240" fill="url(#cover-grad-b)"/>
          <circle cx="640" cy="780" r="280" fill="url(#cover-grad-c)"/>
          <g stroke="#1f2430" stroke-width="0.4" opacity="0.18">
            <line x1="0" y1="320" x2="800" y2="320"/>
            <line x1="0" y1="640" x2="800" y2="640"/>
            <line x1="320" y1="0" x2="320" y2="1000"/>
            <line x1="640" y1="0" x2="640" y2="1000"/>
          </g>
        </svg>
      </div>
      <div class="cover-content">
        <div class="cover-mark">
          <span class="cover-mark__dot"></span>
          <span class="cover-mark__label">FILTER WORKBENCH · DEEP COMPARISON REPORT</span>
        </div>
        <h1 class="cover-title">滤镜<br/>多模型深度对比报告</h1>
        <p class="cover-subtitle">Multi-LLM Capability Audit & Routing Strategy</p>
        <div class="cover-meta">
          <div class="cover-meta__row">
            <div class="cover-meta__label">USER QUESTION</div>
            <div class="cover-meta__value">${escapeXml(question || '未记录提问')}</div>
          </div>
          ${
            tensionLine
              ? `
            <div class="cover-meta__row cover-meta__row--tension">
              <div class="cover-meta__label">CORE TENSION</div>
              <div class="cover-meta__value">${axisLine ? `<span class="cover-axis">${escapeXml(axisLine)}</span>` : ''}<span>${escapeXml(tensionLine)}</span></div>
            </div>`
              : ''
          }
          <div class="cover-meta__row">
            <div class="cover-meta__label">MODELS</div>
            <div class="cover-chips">${modelChips || '<span class="cover-chip">未识别模型</span>'}</div>
          </div>
          <div class="cover-meta__row">
            <div class="cover-meta__label">GENERATED</div>
            <div class="cover-meta__value">${escapeXml(time)}</div>
          </div>
        </div>
        <div class="cover-foot">
          <span>Powered by 千问 · DashScope</span>
          <span>Compiled by Filter Workbench</span>
        </div>
      </div>
    </section>
  `;
}

function renderTocPage(headings) {
  const items = headings
    .map(
      (entry, idx) => `
        <li class="toc-item">
          <span class="toc-num">${String(idx + 1).padStart(2, '0')}</span>
          <span class="toc-line"></span>
          <span class="toc-title">${escapeXml(entry.title)}</span>
          <span class="toc-tone" style="background:${entry.tone || '#3c6df0'}"></span>
        </li>
      `
    )
    .join('');
  return `
    <section class="toc-page">
      <div class="toc-eyebrow">CONTENTS</div>
      <h2 class="toc-title-main">阅读地图</h2>
      <p class="toc-desc">本报告共七章,从全景摘要到选型路由,逐层深入剖析模型能力差异,并附结构化数据看板与图表。</p>
      <ol class="toc-list">${items}</ol>
    </section>
  `;
}

function renderHeroDashboard(opts) {
  const scoreboard = charts.nonEmptyArray(opts.scoreboard);
  const tension = opts.coreTension || {};

  const avg = (key) => {
    if (!scoreboard.length) return null;
    let sum = 0;
    let n = 0;
    scoreboard.forEach((m) => {
      const v = m && m.scores && Number(m.scores[key]);
      if (Number.isFinite(v)) {
        sum += v;
        n += 1;
      }
    });
    if (!n) return null;
    return Math.round(sum / n);
  };

  const dimensions = [
    { key: '有效信息率', label: '有效信息率' },
    { key: '逻辑自洽度', label: '逻辑自洽度' },
    { key: '事实保真度', label: '事实保真度' },
    { key: '对齐噪音率', label: '对齐降噪', invert: true },
    { key: '综合可用性', label: '综合可用性' },
  ];

  const tiles = dimensions
    .map((d) => {
      const raw = avg(d.key);
      if (raw == null) return '';
      const display = d.invert ? 100 - raw : raw;
      return `
        <div class="kpi-tile">
          <div class="kpi-label">${escapeXml(d.label)}</div>
          <div class="kpi-value">${display}<span class="kpi-unit">%</span></div>
          <div class="kpi-track"><div class="kpi-fill" style="width:${display}%"></div></div>
        </div>
      `;
    })
    .filter(Boolean)
    .join('');

  const modelCount = scoreboard.length;
  const modelChips = scoreboard
    .map((m, idx) => {
      const score = (m && m.scores && Number(m.scores['综合可用性'])) || 0;
      return `
        <div class="model-chip" style="--tone:${charts.colorAt(idx)}">
          <div class="model-chip__name">${escapeXml(charts.pickModelName(m, idx))}</div>
          <div class="model-chip__score">${score}<span class="model-chip__unit">/100</span></div>
          <div class="model-chip__hint">综合可用性</div>
        </div>
      `;
    })
    .join('');

  const tensionLine = tension && tension.summary ? String(tension.summary) : '';
  const axisLine = tension && (tension.axis_x || tension.axis_y) ? `${String(tension.axis_x || '').trim()} ↔ ${String(tension.axis_y || '').trim()}` : '';

  return `
    <section class="hero-dashboard">
      <div class="hero-dashboard__head">
        <div class="hero-dashboard__eyebrow">EXECUTIVE DASHBOARD</div>
        <h2 class="hero-dashboard__title">${modelCount ? `${modelCount} 个模型 · 5 维量化看板` : '量化看板'}</h2>
        ${tensionLine ? `<div class="hero-dashboard__tension"><span class="hero-tension__axis">${escapeXml(axisLine)}</span><span class="hero-tension__sum">${escapeXml(tensionLine)}</span></div>` : ''}
      </div>
      ${tiles ? `<div class="kpi-row">${tiles}</div>` : ''}
      ${modelChips ? `<div class="model-row">${modelChips}</div>` : ''}
    </section>
  `;
}

function renderRawReplies(rawReplies) {
  const replies = (Array.isArray(rawReplies) ? rawReplies : []).filter(
    (reply) => reply && String(reply.text || '').trim()
  );
  if (!replies.length) return '';
  const cards = replies
    .map(
      (reply, idx) => `
      <article class="raw-card" style="--tone:${charts.colorAt(idx)}">
        <header class="raw-card__head">
          <span class="raw-card__avatar">${escapeXml(String(reply.name || '?').slice(0, 1))}</span>
          <div class="raw-card__head-text">
            <div class="raw-card__name">${escapeXml(reply.name || '未命名模型')}</div>
            <div class="raw-card__sub">原始输出 · ${String(reply.text).length} 字</div>
          </div>
        </header>
        <pre class="raw-card__body">${escapeXml(String(reply.text || '').trim())}</pre>
      </article>
    `
    )
    .join('');
  return `
    <section class="report-section report-section--appendix">
      <header class="section-head section-head--simple">
        <div class="section-eyebrow">APPENDIX</div>
        <h2 class="section-title">附录·模型原始回复</h2>
      </header>
      <div class="raw-grid">${cards}</div>
    </section>
  `;
}

function renderAnalysisSession(session) {
  if (!session || typeof session !== 'object') return '';
  const lines = [];
  const diffs = Array.isArray(session.diffs) ? session.diffs : [];
  if (diffs.length) {
    lines.push('差异点抽取结果');
    diffs.forEach((diff) => {
      lines.push(`- ${diff.id || ''}｜${diff.type || ''}｜${diff.topic || ''}`);
    });
  }
  const diffAnalyses = Array.isArray(session.diffAnalyses) ? session.diffAnalyses : [];
  if (diffAnalyses.length) {
    lines.push('差异追问与合并');
    diffAnalyses.forEach((item) => {
      const summary = item && item.merge && item.merge.cleaned_interpretation ? item.merge.cleaned_interpretation : (item && item.diff && item.diff.topic) || '';
      lines.push(`- ${(item && item.diff && item.diff.id) || ''}：${summary}`);
    });
  }
  const pollution = session && session.pollution ? session.pollution : null;
  if (pollution) {
    const removed = Array.isArray(pollution.pollution_removed) ? pollution.pollution_removed : [];
    if (removed.length) {
      lines.push('污染剔除');
      removed.slice(0, 8).forEach((item) => {
        lines.push(`- ${item.type || '污染因素'}：${item.reason || item.content || ''}`);
      });
    }
  }
  if (!lines.length) return '';
  return `
    <section class="report-section report-section--trace">
      <header class="section-head section-head--simple">
        <div class="section-eyebrow">TRACEBACK LOOP</div>
        <h2 class="section-title">附录·去伪存真闭环记录</h2>
      </header>
      <pre class="trace-pre">${escapeXml(lines.join('\n'))}</pre>
    </section>
  `;
}

function buildReportHtml(payload, structured) {
  const data = payload || {};
  const struct = structured || {};
  const question = String(data.question || '').trim();
  const sections = data.sections || {};
  const rawReplies = Array.isArray(data.rawReplies) ? data.rawReplies : [];
  const analysisSession = data.analysisSession || null;
  const summaryText = String(data.summaryText || '').trim();

  const globalSummary = safeArray(sections.globalSummary);
  const outputTrace = safeArray(sections.outputTrace);
  const logicVisibility = safeArray(sections.logicVisibility);
  const capabilitySpectrum = safeArray(sections.capabilitySpectrum);
  const alignmentCauses = safeArray(sections.alignmentCauses);
  const selectionStrategy = safeArray(sections.selectionStrategy);
  const visualizationSpec = safeArray(sections.visualizationSpec);

  const radarHtml = charts.renderRadarChart(struct.scoreboard);
  const sankeyHtml = charts.renderSankey(struct.fact_sankey);
  const funnelHtml = charts.renderFunnelChart(struct.info_funnel);
  const stackedHtml = charts.renderStackedBar(struct.alignment_tax);
  const quadrantHtml = charts.renderQuadrantChart(struct.selection_quadrant);
  const wordcloudHtml = wordcloud.renderWordcloud(rawReplies);

  const scoreboard = charts.nonEmptyArray(struct.scoreboard);
  const modelNamesFromBoard = scoreboard.map((m, i) => charts.pickModelName(m, i));
  const modelNamesFromReplies = rawReplies.map((r, i) => charts.pickModelName(r, i));
  const modelNames = (modelNamesFromBoard.length ? modelNamesFromBoard : modelNamesFromReplies).filter(Boolean);

  const heroDashboard = renderHeroDashboard({
    scoreboard: struct.scoreboard,
    coreTension: struct.core_tension,
  });

  const tocEntries = [
    { key: '全局摘要', title: '全局摘要：多模型能力全景与核心矛盾', tone: SECTION_THEME.global.tone },
    { key: '一', title: '一、 输出脉络与事实坐标对比', tone: SECTION_THEME.trace.tone },
    { key: '二', title: '二、 核心逻辑链路与信息能见度分析', tone: SECTION_THEME.logic.tone },
    { key: '三', title: '三、 能力光谱与场景割裂剖析', tone: SECTION_THEME.spectrum.tone },
    { key: '四', title: '四、 深层动因与价值观对齐探讨', tone: SECTION_THEME.alignment.tone },
    { key: '五', title: '五、 选型研判与调用策略推演', tone: SECTION_THEME.selection.tone },
    { key: '可视化', title: '数据可视化组件规格', tone: SECTION_THEME.visualization.tone },
  ];

  const sectionsHtml = [
    renderSection({
      number: 1,
      tone: SECTION_THEME.global.tone,
      icon: SECTION_THEME.global.icon,
      eyebrow: 'EXECUTIVE PANORAMA',
      title: '全局摘要 · 多模型能力全景与核心矛盾',
      intro: '一句话定调本轮模型表现,锁定核心矛盾、深层风险、信任支点,并附量化看板。',
      items: globalSummary,
      emptyText: '本次未生成全局摘要。',
      charts: `<div class="charts-grid charts-grid--full">${radarHtml}</div>`,
    }),
    renderSection({
      number: 2,
      tone: SECTION_THEME.trace.tone,
      icon: SECTION_THEME.trace.icon,
      eyebrow: 'FACT COORDINATES',
      title: '一、 输出脉络与事实坐标对比',
      intro: '比较模型如何理解意图、组织答题框架、建立事实链与抵抗幻觉。',
      items: outputTrace,
      emptyText: '暂无输出脉络分析。',
      charts: `<div class="charts-grid charts-grid--full">${sankeyHtml}</div>`,
    }),
    renderSection({
      number: 3,
      tone: SECTION_THEME.logic.tone,
      icon: SECTION_THEME.logic.icon,
      eyebrow: 'LOGIC VISIBILITY',
      title: '二、 核心逻辑链路与信息能见度分析',
      intro: '识别深度推理路径与套路化路径,量化信息能见度赤字。',
      items: logicVisibility,
      emptyText: '暂无逻辑链路分析。',
      charts: `<div class="charts-grid charts-grid--full">${funnelHtml}</div>`,
    }),
    renderSection({
      number: 4,
      tone: SECTION_THEME.spectrum.tone,
      icon: SECTION_THEME.spectrum.icon,
      eyebrow: 'CAPABILITY SPECTRUM',
      title: '三、 能力光谱与场景割裂剖析',
      intro: '从场景优势、风格受众和能力割裂角度拆解模型差异。',
      items: capabilitySpectrum,
      emptyText: '暂无能力光谱分析。',
      charts: `<div class="charts-grid charts-grid--full">${wordcloudHtml}</div>`,
    }),
    renderSection({
      number: 5,
      tone: SECTION_THEME.alignment.tone,
      icon: SECTION_THEME.alignment.icon,
      eyebrow: 'ALIGNMENT TAX',
      title: '四、 深层动因与价值观对齐探讨',
      intro: '分析 RLHF 偏好、认知冻结、知识时间切片与领域茧房。',
      items: alignmentCauses,
      emptyText: '暂无深层动因分析。',
      charts: `<div class="charts-grid charts-grid--full">${stackedHtml}</div>`,
    }),
    renderSection({
      number: 6,
      tone: SECTION_THEME.selection.tone,
      icon: SECTION_THEME.selection.icon,
      eyebrow: 'ROUTING STRATEGY',
      title: '五、 选型研判与调用策略推演',
      intro: '把评测结果转化为风险矩阵、提示词调优与混合编排方案。',
      items: selectionStrategy,
      emptyText: '暂无选型策略。',
      charts: `<div class="charts-grid charts-grid--full">${quadrantHtml}</div>`,
    }),
    renderSection({
      number: 7,
      tone: SECTION_THEME.visualization.tone,
      icon: SECTION_THEME.visualization.icon,
      eyebrow: 'VISUAL SPEC',
      title: '数据可视化组件规格',
      intro: '为前端可直接落地图表的字段、编码、交互建议。',
      items: visualizationSpec,
      emptyText: '暂无图表规格。',
    }),
  ].join('');

  const fallbackHtml = !globalSummary.length && summaryText
    ? `<section class="report-section report-section--fallback"><header class="section-head section-head--simple"><div class="section-eyebrow">FULL TEXT</div><h2 class="section-title">完整对比文本</h2></header><pre class="summary-pre">${escapeXml(summaryText)}</pre></section>`
    : '';

  return `<!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>滤镜 · 多模型深度对比报告</title>
    <style>
      ${getCss()}
    </style>
  </head>
  <body>
    ${renderCoverPage({ question, generatedAt: data.generatedAt, modelNames, coreTension: struct.core_tension })}
    ${renderTocPage(tocEntries)}
    <main class="report-body">
      ${heroDashboard}
      ${sectionsHtml}
      ${fallbackHtml}
      ${renderAnalysisSession(analysisSession)}
      ${renderRawReplies(rawReplies)}
    </main>
    <footer class="report-foot">
      <span>滤镜工作台 · ${escapeXml(formatLocalTime(data.generatedAt))}</span>
      <span>本报告由千问大模型对多模型回答联合分析生成,仅供参考</span>
    </footer>
  </body>
  </html>`;
}

function getCss() {
  return `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", -apple-system, sans-serif;
      color: #1f2430;
      background: #f5f3ef;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* COVER PAGE */
    .cover-page {
      position: relative;
      width: 210mm;
      height: 297mm;
      page-break-after: always;
      overflow: hidden;
      color: #1f2430;
    }
    .cover-bg { position: absolute; inset: 0; }
    .cover-bg svg { width: 100%; height: 100%; display: block; }
    .cover-content {
      position: relative;
      padding: 26mm 22mm;
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .cover-mark {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: 11px;
      letter-spacing: 0.22em;
      color: #4b5563;
      text-transform: uppercase;
    }
    .cover-mark__dot {
      width: 12px;
      height: 12px;
      border-radius: 4px;
      background: linear-gradient(135deg, #ffb54f, #5f82ff);
    }
    .cover-title {
      margin: 28mm 0 4mm;
      font-size: 56px;
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.5px;
    }
    .cover-subtitle {
      margin: 0;
      font-size: 14px;
      letter-spacing: 0.3em;
      color: #6a7387;
      text-transform: uppercase;
    }
    .cover-meta { margin-top: auto; display: grid; gap: 10mm; padding-top: 20mm; }
    .cover-meta__row {
      display: grid;
      grid-template-columns: 36mm 1fr;
      gap: 8mm;
      align-items: baseline;
      padding-bottom: 6mm;
      border-bottom: 1px solid rgba(31, 36, 48, 0.12);
    }
    .cover-meta__row:last-child { border-bottom: none; }
    .cover-meta__label {
      font-size: 10px;
      letter-spacing: 0.22em;
      color: #6a7387;
      text-transform: uppercase;
    }
    .cover-meta__value {
      font-size: 15px;
      line-height: 1.7;
      color: #1f2430;
      font-weight: 500;
    }
    .cover-meta__row--tension .cover-meta__value { display: grid; gap: 4px; }
    .cover-axis {
      font-size: 12px;
      letter-spacing: 0.16em;
      color: #3c6df0;
      text-transform: uppercase;
    }
    .cover-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .cover-chip {
      --chip: #3c6df0;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.78);
      border: 1px solid var(--chip);
      color: var(--chip);
      font-size: 12px;
      font-weight: 600;
    }
    .cover-foot {
      margin-top: 6mm;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      letter-spacing: 0.2em;
      color: #6a7387;
      text-transform: uppercase;
    }

    /* TOC PAGE */
    .toc-page {
      position: relative;
      width: 210mm;
      padding: 22mm 22mm 18mm;
      page-break-after: always;
      page-break-inside: avoid;
      background: #fff;
    }
    .toc-eyebrow { font-size: 11px; letter-spacing: 0.22em; color: #6a7387; text-transform: uppercase; }
    .toc-title-main { margin: 8px 0 8mm; font-size: 36px; font-weight: 800; }
    .toc-desc { margin: 0 0 10mm; color: #4b5563; font-size: 13.5px; line-height: 1.8; max-width: 130mm; }
    .toc-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 4mm; }
    .toc-item {
      display: grid;
      grid-template-columns: 16mm 1fr 8mm;
      gap: 5mm;
      align-items: center;
      padding: 4mm 0;
      border-bottom: 1px solid rgba(31, 36, 48, 0.10);
    }
    .toc-num { font-size: 20px; font-weight: 700; color: #1f2430; letter-spacing: 1px; }
    .toc-line { display: none; }
    .toc-title { font-size: 15px; font-weight: 600; color: #1f2430; }
    .toc-tone { width: 8mm; height: 8mm; border-radius: 50%; }

    /* HERO DASHBOARD */
    .hero-dashboard {
      margin: 18mm 16mm 12mm;
      padding: 12mm 12mm 14mm;
      background: linear-gradient(140deg, #fff, rgba(96, 129, 255, 0.05));
      border-radius: 18px;
      border: 1px solid rgba(31, 36, 48, 0.08);
      box-shadow: 0 18px 48px rgba(30, 48, 93, 0.08);
      page-break-inside: avoid;
    }
    .hero-dashboard__eyebrow { font-size: 11px; letter-spacing: 0.22em; color: #6a7387; text-transform: uppercase; }
    .hero-dashboard__title { margin: 4px 0 6mm; font-size: 26px; font-weight: 700; }
    .hero-dashboard__tension {
      display: grid;
      gap: 4px;
      padding: 10px 14px;
      background: rgba(60, 109, 240, 0.08);
      border-left: 3px solid #3c6df0;
      border-radius: 4px;
      margin-bottom: 8mm;
    }
    .hero-tension__axis { font-size: 11px; letter-spacing: 0.18em; color: #3c6df0; text-transform: uppercase; }
    .hero-tension__sum { font-size: 14px; color: #1f2430; line-height: 1.7; font-weight: 500; }
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 3mm;
      margin-bottom: 6mm;
    }
    .kpi-tile {
      padding: 3mm 3mm;
      background: rgba(255,255,255,0.95);
      border: 1px solid rgba(31, 36, 48, 0.08);
      border-radius: 10px;
      min-width: 0;
    }
    .kpi-label {
      font-size: 10.5px;
      letter-spacing: 0.04em;
      color: #6a7387;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 600;
    }
    .kpi-value { margin: 4px 0 5px; font-size: 22px; font-weight: 700; color: #1f2430; line-height: 1; }
    .kpi-unit { font-size: 12px; font-weight: 500; color: #6a7387; margin-left: 2px; }
    .kpi-track { height: 4px; background: #eef0f5; border-radius: 999px; overflow: hidden; }
    .kpi-fill { height: 100%; background: linear-gradient(90deg, #5f82ff, #ffb54f); border-radius: 999px; }
    .model-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 6mm;
    }
    .model-chip {
      --tone: #3c6df0;
      padding: 5mm;
      background: #fff;
      border: 1px solid rgba(31, 36, 48, 0.08);
      border-left: 4px solid var(--tone);
      border-radius: 10px;
    }
    .model-chip__name { font-size: 13px; color: #6a7387; }
    .model-chip__score { font-size: 22px; font-weight: 700; color: var(--tone); }
    .model-chip__unit { font-size: 12px; color: #6a7387; margin-left: 2px; }
    .model-chip__hint { font-size: 11px; color: #6a7387; }

    /* SECTIONS */
    .report-body { padding: 0 16mm 18mm; }
    .report-section {
      --tone: #3c6df0;
      position: relative;
      padding: 12mm 12mm 10mm;
      margin-bottom: 12mm;
      background: #fff;
      border-radius: 18px;
      border: 1px solid rgba(31, 36, 48, 0.06);
      box-shadow: 0 12px 32px rgba(30, 48, 93, 0.05);
      page-break-inside: avoid;
    }
    .report-section::before {
      content: "";
      position: absolute;
      left: 0;
      top: 14mm;
      bottom: 14mm;
      width: 4px;
      background: var(--tone);
      border-radius: 0 4px 4px 0;
    }
    .section-head {
      display: grid;
      grid-template-columns: 22mm 14mm 1fr;
      gap: 4mm;
      align-items: start;
      margin-bottom: 6mm;
    }
    .section-head--simple {
      grid-template-columns: 1fr;
      gap: 0;
    }
    .section-num {
      font-size: 38px;
      font-weight: 800;
      color: var(--tone);
      line-height: 1;
      letter-spacing: -1px;
    }
    .section-icon {
      width: 32px;
      height: 32px;
      color: var(--tone);
      margin-top: 4px;
    }
    .section-icon svg { width: 100%; height: 100%; }
    .section-eyebrow { font-size: 11px; letter-spacing: 0.22em; color: #6a7387; text-transform: uppercase; }
    .section-title { margin: 4px 0 6px; font-size: 22px; font-weight: 700; color: #1f2430; }
    .section-intro { margin: 0; color: #4b5563; font-size: 13px; line-height: 1.8; max-width: 130mm; }
    .section-body { display: grid; gap: 8mm; }
    .section-note { margin: 0; padding: 4mm 5mm; background: rgba(60, 109, 240, 0.05); border-radius: 8px; color: #4b5563; font-size: 12px; line-height: 1.7; }

    .bullet-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 6mm;
    }
    .bullet-list li {
      position: relative;
      padding: 4mm 4mm 4mm 8mm;
      background: rgba(248, 249, 252, 0.85);
      border-radius: 10px;
      border-left: 3px solid var(--tone);
      line-height: 1.85;
      font-size: 13.5px;
      color: #2f3441;
    }
    .bullet-lead { font-weight: 700; color: #1f2430; font-size: 14.5px; display: block; margin-bottom: 3px; }
    .bullet-body { color: #4b5563; }
    .bullet-body--solo { color: #2f3441; }
    .bullet-sep { color: #c9d1de; margin: 0 6px; }
    .empty-note {
      padding: 5mm 6mm;
      background: rgba(99, 112, 143, 0.06);
      border-radius: 10px;
      color: #6a7387;
      font-size: 13px;
      line-height: 1.7;
    }

    .md-table-wrap {
      overflow: hidden;
      border-radius: 12px;
      border: 1px solid rgba(31, 36, 48, 0.10);
      background: #fff;
      page-break-inside: avoid;
    }
    .md-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }
    .md-table th {
      background: linear-gradient(180deg, rgba(60, 109, 240, 0.10), rgba(60, 109, 240, 0.04));
      color: #1f2430;
      font-weight: 700;
      text-align: left;
      padding: 4mm 5mm;
      border-bottom: 1px solid rgba(31, 36, 48, 0.10);
      letter-spacing: 0.04em;
    }
    .md-table td {
      padding: 3.2mm 5mm;
      border-bottom: 1px solid rgba(31, 36, 48, 0.06);
      color: #2f3441;
      line-height: 1.7;
    }
    .md-table tr:last-child td { border-bottom: none; }
    .md-table tr:nth-child(even) td { background: rgba(248, 249, 252, 0.6); }

    /* CHARTS */
    .section-charts { margin-top: 4mm; }
    .charts-grid { display: grid; gap: 6mm; }
    .charts-grid--full > * { width: 100%; }
    .chart-figure {
      margin: 0;
      padding: 6mm 5mm;
      background: rgba(248, 249, 252, 0.7);
      border: 1px solid rgba(31, 36, 48, 0.06);
      border-radius: 14px;
      page-break-inside: avoid;
    }
    .chart-caption { margin-bottom: 4mm; }
    .chart-caption__title { font-size: 14px; font-weight: 700; color: #1f2430; }
    .chart-caption__sub { margin-top: 2px; font-size: 11.5px; color: #6a7387; line-height: 1.6; }
    .chart-svg-wrap { display: flex; justify-content: center; }
    .chart-svg { width: 100%; max-width: 600px; height: auto; }
    .chart-svg--quadrant { max-width: 540px; }
    .chart-svg--funnel { max-width: 580px; }
    .chart-svg--stack { max-width: 580px; }
    .chart-svg--sankey { max-width: 720px; }
    .chart-svg--radar { max-width: 460px; }
    .chart-empty { padding: 5mm 6mm; background: rgba(99, 112, 143, 0.05); border: 1px dashed rgba(99, 112, 143, 0.25); border-radius: 10px; color: #6a7387; font-size: 12.5px; }
    .chart-legend { display: flex; flex-wrap: wrap; gap: 12px 18px; justify-content: center; margin-top: 4mm; font-size: 12px; color: #4b5563; }
    .chart-legend__item { display: inline-flex; align-items: center; gap: 6px; }
    .chart-legend__swatch { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }

    /* WORD CLOUD */
    .cloud-grid {
      display: grid;
      gap: 5mm;
    }
    .cloud-grid[data-cols="2"] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .cloud-grid[data-cols="3"] { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .cloud-grid[data-cols="4"] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .cloud-col {
      padding: 5mm;
      background: #fff;
      border-radius: 12px;
      border: 1px solid rgba(31, 36, 48, 0.06);
    }
    .cloud-col__head {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding-bottom: 3mm;
      margin-bottom: 4mm;
      border-bottom: 2px solid;
      font-weight: 700;
      font-size: 13px;
    }
    .cloud-col__dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .cloud-col__words { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: baseline; line-height: 1.5; }
    .cloud-word { font-weight: 600; }
    .cloud-col__empty { font-size: 12.5px; color: #9ca3af; }

    /* APPENDIX */
    .report-section--appendix {
      background: #fafbfd;
      page-break-inside: auto;
    }
    .raw-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 6mm;
    }
    .raw-card {
      --tone: #3c6df0;
      padding: 5mm 6mm;
      background: #fff;
      border: 1px solid rgba(31, 36, 48, 0.08);
      border-left: 4px solid var(--tone);
      border-radius: 12px;
      page-break-inside: avoid;
    }
    .raw-card__head {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4mm;
    }
    .raw-card__avatar {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--tone);
      color: #fff;
      font-weight: 700;
    }
    .raw-card__name { font-size: 14px; font-weight: 700; }
    .raw-card__sub { font-size: 11px; color: #6a7387; }
    .raw-card__body, .summary-pre, .trace-pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.85;
      font-size: 12.5px;
      color: #2f3441;
      padding: 4mm 5mm;
      background: #f8f9fc;
      border-radius: 8px;
    }

    .report-foot {
      padding: 8mm 16mm;
      display: flex;
      justify-content: space-between;
      gap: 8mm;
      font-size: 11px;
      letter-spacing: 0.16em;
      color: #6a7387;
      border-top: 1px solid rgba(31, 36, 48, 0.08);
    }

    @media print {
      .cover-page, .toc-page { background: #f5f3ef; }
      body { background: #f5f3ef; }
    }
  `;
}

module.exports = {
  buildReportHtml,
  formatLocalTime,
};
