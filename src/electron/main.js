const path = require('path');
const fs = require('fs');
const os = require('os');
const { app, BrowserWindow, BrowserView, ipcMain, dialog, screen } = require('electron');
const platforms = require('../config/platforms');
const {
  getQwenKeyStatus,
  qwenChatCompletion,
  qwenChatCompletionStream,
  saveDashScopeApiKeyToFile,
  clearDashScopeApiKeyFile,
} = require('./dashscope-qwen');

if (process.env.DUOLI_DISABLE_GPU === '1') {
  app.disableHardwareAcceleration();
}
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
  if (process.env.DUOLI_DISABLE_DCOMP === '1') {
    app.commandLine.appendSwitch('disable-direct-composition');
  }
}

ipcMain.handle('duoli:get-platforms', () => platforms.map((p) => ({ ...p })));

ipcMain.handle('duoli:qwen-configured', () => getQwenKeyStatus());

ipcMain.handle('duoli:save-dashscope-key', (_e, { key } = {}) => {
  const k = String(key || '').trim();
  const st = () => getQwenKeyStatus();
  if (k.length < 8) {
    return { saveOk: false, error: 'API key is too short.', ...st() };
  }
  try {
    saveDashScopeApiKeyToFile(k);
    return { saveOk: true, ...st() };
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    return { saveOk: false, error: msg, ...st() };
  }
});

ipcMain.handle('duoli:clear-dashscope-key-file', () => {
  try {
    clearDashScopeApiKeyFile();
  } catch (e) {
    /* ignore */
  }
  return getQwenKeyStatus();
});

ipcMain.handle('duoli:qwen-complete', async (_e, { prompt } = {}) => {
  const p = String(prompt || '').trim();
  if (!p) {
    return { ok: false, error: 'Prompt is empty.' };
  }
  try {
    const text = await qwenChatCompletion(p);
    return { ok: true, text };
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    return { ok: false, error: msg };
  }
});

ipcMain.handle('duoli:qwen-stream', async (event, { prompt, reqId } = {}) => {
  const p = String(prompt || '').trim();
  if (!p) return { ok: false, error: 'Prompt is empty.' };
  const sender = event.sender;
  try {
    const text = await qwenChatCompletionStream(p, (delta) => {
      if (!sender.isDestroyed()) {
        sender.send('duoli:qwen-stream-chunk', { reqId, delta });
      }
    });
    return { ok: true, text };
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    return { ok: false, error: msg };
  }
});

ipcMain.handle('duoli:export-pdf', async (_e, { question, text } = {}) => {
  const q = String(question || '').trim();
  const body = String(text || '').trim();
  if (!body) return { ok: false, error: 'Nothing to export.' };

  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: '保存对比结果 PDF',
    defaultPath: path.join(app.getPath('documents'), `多模型对比_${new Date().toISOString().slice(0, 10)}.pdf`),
    filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return { ok: false, error: 'canceled' };

  const escaped = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<!DOCTYPE html><html lang="zh-CN"><head>
<meta charset="UTF-8"/>
<style>
  body{font-family:"Microsoft YaHei","PingFang SC",sans-serif;font-size:14px;line-height:1.8;padding:32px 40px;color:#1a1a1a;white-space:pre-wrap;word-break:break-word;}
  h1{font-size:18px;margin-bottom:8px;color:#333;}
  .q{font-size:13px;color:#555;margin-bottom:20px;border-bottom:1px solid #ddd;padding-bottom:8px;}
  .date{font-size:11px;color:#999;margin-bottom:24px;}
</style></head><body>
<h1>滤镜 · 多源大模型内容对比结果</h1>
${q ? `<div class="q">问题：${q.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}
<div class="date">生成时间：${new Date().toLocaleString('zh-CN')}</div>
${escaped}
</body></html>`;

  const tmpHtml = path.join(os.tmpdir(), `duoli_pdf_${Date.now()}.html`);
  fs.writeFileSync(tmpHtml, html, 'utf8');

  const win = new BrowserWindow({ show: false, webPreferences: { javascript: false } });
  await win.loadFile(tmpHtml);
  try {
    const pdfBuf = await win.webContents.printToPDF({
      pageSize: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: false,
    });
    fs.writeFileSync(filePath, pdfBuf);
    return { ok: true, filePath };
  } finally {
    win.destroy();
    try {
      fs.unlinkSync(tmpHtml);
    } catch (_) {
      /* ignore */
    }
  }
});

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
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

function renderBulletList(items, emptyText) {
  const list = safeArray(items);
  if (!list.length) {
    return `<div class="empty-note">${escapeHtml(emptyText)}</div>`;
  }
  return `<ul class="bullet-list">${list.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderSectionCard(title, items, options = {}) {
  const className = options.className ? `section-card ${options.className}` : 'section-card';
  const intro = options.intro ? `<p class="section-intro">${escapeHtml(options.intro)}</p>` : '';
  return `
    <section class="${className}">
      <div class="section-eyebrow">${escapeHtml(options.eyebrow || 'FILTER REPORT')}</div>
      <h2>${escapeHtml(title)}</h2>
      ${intro}
      ${renderBulletList(items, options.emptyText || '本节暂无可导出的结构化内容。')}
    </section>
  `;
}

function renderSummaryFallback(summaryText) {
  const text = String(summaryText || '').trim();
  if (!text) return '';
  return `
    <section class="section-card section-card--full">
      <div class="section-eyebrow">FULL SUMMARY</div>
      <h2>完整对比文本</h2>
      <pre class="summary-pre">${escapeHtml(text)}</pre>
    </section>
  `;
}

function renderRawReplyCards(rawReplies) {
  const replies = Array.isArray(rawReplies) ? rawReplies : [];
  if (!replies.length) return '';
  const cards = replies
    .map((reply) => {
      const text = String(reply && reply.text ? reply.text : '').trim();
      if (!text) return '';
      return `
        <article class="reply-card">
          <div class="reply-card__head">
            <span class="reply-card__avatar">${escapeHtml(String(reply.name || '?').slice(0, 1))}</span>
            <div>
              <div class="reply-card__label">${escapeHtml(reply.name || '未命名模型')}</div>
              <div class="reply-card__sub">原始输出</div>
            </div>
          </div>
          <pre>${escapeHtml(text)}</pre>
        </article>
      `;
    })
    .filter(Boolean)
    .join('');
  if (!cards) return '';
  return `
    <section class="section-card section-card--full">
      <div class="section-eyebrow">MODEL APPENDIX</div>
      <h2>模型原始回复附录</h2>
      <div class="reply-grid">${cards}</div>
    </section>
  `;
}

function buildReportHtml(payload) {
  const question = String(payload && payload.question ? payload.question : '').trim();
  const summaryText = String(payload && payload.summaryText ? payload.summaryText : '').trim();
  const sections = payload && payload.sections ? payload.sections : {};
  const rawReplies = Array.isArray(payload && payload.rawReplies) ? payload.rawReplies : [];

  const coreConclusion = safeArray(sections.coreConclusion);
  const same = safeArray(sections.same);
  const diff = safeArray(sections.diff);
  const keyDebates = safeArray(sections.keyDebates);
  const gaps = safeArray(sections.gaps);
  const actions = safeArray(sections.actions);
  const sectionCount = [coreConclusion, same, diff, keyDebates, gaps, actions].filter((items) => items.length).length;
  const reportTime = formatLocalTime(payload && payload.generatedAt);

  const structuredSections = [
    renderSectionCard('核心结论', coreConclusion, {
      className: 'section-card--full',
      eyebrow: 'EXECUTIVE TAKE',
      intro: '保留最值得带走的判断，方便快速复盘或对外同步。',
      emptyText: '暂无核心结论，可查看后面的完整对比文本。',
    }),
    `
      <div class="section-grid">
        ${renderSectionCard('相同观点', same, {
          className: 'section-card--same',
          eyebrow: 'CONSENSUS',
          intro: '多个模型真正达成一致的部分。',
          emptyText: '暂未提炼出明确共识。',
        })}
        ${renderSectionCard('不同观点', diff, {
          className: 'section-card--diff',
          eyebrow: 'DIFFERENCES',
          intro: '模型之间的判断分歧、侧重点差异或结论冲突。',
          emptyText: '暂未提炼出明确分歧。',
        })}
      </div>
    `,
    `
      <div class="section-grid">
        ${renderSectionCard('关键争议', keyDebates, {
          eyebrow: 'DECISION TENSION',
          intro: '真正会影响决策方向和风险判断的冲突点。',
          emptyText: '暂未识别出关键争议。',
        })}
        ${renderSectionCard('遗漏与盲区', gaps, {
          eyebrow: 'BLIND SPOTS',
          intro: '被忽略的前提、限制、时间线、代价或适用条件。',
          emptyText: '暂未识别出明显盲区。',
        })}
      </div>
    `,
    renderSectionCard('行动建议', actions, {
      className: 'section-card--full',
      eyebrow: 'NEXT ACTIONS',
      intro: '下一步该怎么追问、核查、采用、规避或补证。',
      emptyText: '暂未生成行动建议。',
    }),
  ].join('');

  return `<!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>滤镜 - 多模型深度对比报告</title>
    <style>
      :root {
        --ink: #1f2430;
        --muted: #6a7387;
        --line: rgba(75, 92, 130, 0.12);
        --panel: rgba(255, 255, 255, 0.96);
        --panel-strong: #ffffff;
        --blue: #3c6df0;
        --amber: #b26b00;
        --green: #18794e;
        --shadow: 0 18px 48px rgba(30, 48, 93, 0.10);
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(255, 198, 112, 0.28), transparent 32%),
          radial-gradient(circle at top right, rgba(100, 128, 255, 0.18), transparent 26%),
          #f5f3ef;
      }

      .page { padding: 22mm 18mm 18mm; }

      .hero {
        position: relative;
        overflow: hidden;
        border-radius: 24px;
        padding: 22px 24px 24px;
        background:
          linear-gradient(140deg, rgba(255,255,255,0.98), rgba(255,255,255,0.94)),
          linear-gradient(135deg, rgba(71, 116, 255, 0.06), rgba(255, 196, 103, 0.08));
        border: 1px solid rgba(255,255,255,0.72);
        box-shadow: var(--shadow);
      }

      .hero::after {
        content: "";
        position: absolute;
        inset: auto -80px -80px auto;
        width: 220px;
        height: 220px;
        background: radial-gradient(circle, rgba(84, 123, 255, 0.18), transparent 68%);
      }

      .hero-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 18px;
      }

      .brand-wrap { display: flex; align-items: center; gap: 14px; }
      .brand-mark {
        width: 46px;
        height: 46px;
        border-radius: 16px;
        background: linear-gradient(135deg, #ffb54f, #5f82ff);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
      }

      .brand-kicker,
      .question-label,
      .metric-label,
      .section-eyebrow {
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .brand-kicker { margin-bottom: 5px; }
      .brand-title {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
      }

      .hero-time {
        padding: 10px 14px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.82);
        border: 1px solid rgba(88, 103, 145, 0.10);
        color: var(--muted);
        font-size: 12px;
      }

      .hero-grid {
        display: grid;
        grid-template-columns: 1.35fr 0.85fr;
        gap: 16px;
      }

      .question-card,
      .metric-card {
        background: rgba(255, 255, 255, 0.88);
        border: 1px solid rgba(88, 103, 145, 0.10);
        border-radius: 18px;
        padding: 18px;
      }

      .question-text {
        margin-top: 10px;
        font-size: 16px;
        line-height: 1.8;
        font-weight: 600;
      }

      .metric-stack {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .metric-value {
        margin-top: 8px;
        font-size: 24px;
        font-weight: 700;
      }

      .metric-note {
        margin-top: 6px;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.6;
      }

      .report-body {
        margin-top: 18px;
        display: grid;
        gap: 16px;
      }

      .section-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }

      .section-card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 22px;
        padding: 20px;
        box-shadow: 0 10px 30px rgba(31, 36, 48, 0.05);
      }

      .section-card--full { background: var(--panel-strong); }
      .section-card--same { background: linear-gradient(180deg, #fff, rgba(44, 168, 108, 0.05)); }
      .section-card--diff { background: linear-gradient(180deg, #fff, rgba(255, 185, 82, 0.10)); }

      .section-card h2 {
        margin: 8px 0 10px;
        font-size: 22px;
      }

      .section-intro {
        margin: 0 0 12px;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.7;
      }

      .bullet-list {
        margin: 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 10px;
      }

      .bullet-list li {
        position: relative;
        padding-left: 18px;
        line-height: 1.85;
        font-size: 14px;
      }

      .bullet-list li::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0.8em;
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: var(--blue);
      }

      .section-card--same .bullet-list li::before { background: var(--green); }
      .section-card--diff .bullet-list li::before { background: var(--amber); }

      .empty-note {
        padding: 14px 16px;
        border-radius: 14px;
        background: rgba(99, 112, 143, 0.06);
        color: var(--muted);
        font-size: 13px;
      }

      .summary-pre,
      .reply-card pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.8;
        font-size: 13px;
        color: #2f3441;
      }

      .summary-pre {
        padding: 16px 18px;
        border-radius: 16px;
        background: rgba(98, 112, 145, 0.05);
        border: 1px solid rgba(75, 92, 130, 0.08);
      }

      .reply-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }

      .reply-card {
        border-radius: 18px;
        padding: 18px;
        background: rgba(247, 248, 252, 0.96);
        border: 1px solid rgba(75, 92, 130, 0.10);
      }

      .reply-card__head {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 14px;
      }

      .reply-card__avatar {
        width: 34px;
        height: 34px;
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, rgba(255, 192, 101, 0.72), rgba(96, 129, 255, 0.72));
        color: #1f2430;
        font-weight: 700;
      }

      .reply-card__label {
        font-size: 15px;
        font-weight: 700;
      }

      .reply-card__sub {
        margin-top: 2px;
        font-size: 12px;
        color: var(--muted);
      }

      @media print {
        body { background: #f5f3ef; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <div class="hero-top">
          <div class="brand-wrap">
            <div class="brand-mark"></div>
            <div>
              <div class="brand-kicker">Filter Workbench</div>
              <h1 class="brand-title">滤镜 · 多模型深度对比报告</h1>
            </div>
          </div>
          <div class="hero-time">生成时间：${escapeHtml(reportTime)}</div>
        </div>
        <div class="hero-grid">
          <div class="question-card">
            <div class="question-label">USER QUESTION</div>
            <div class="question-text">${escapeHtml(question || '未记录问题')}</div>
          </div>
          <div class="metric-stack">
            <div class="metric-card">
              <div class="metric-label">MODELS</div>
              <div class="metric-value">${rawReplies.length || 0}</div>
              <div class="metric-note">纳入本次导出的模型数量</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">SECTIONS</div>
              <div class="metric-value">${sectionCount}</div>
              <div class="metric-note">成功抽取出的结构化章节数</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">CONSENSUS</div>
              <div class="metric-value">${same.length}</div>
              <div class="metric-note">模型之间达成一致的判断点</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">DIFFERENCES</div>
              <div class="metric-value">${diff.length}</div>
              <div class="metric-note">模型之间存在分歧的判断点</div>
            </div>
          </div>
        </div>
      </section>

      <section class="report-body">
        ${structuredSections}
        ${sectionCount ? '' : renderSummaryFallback(summaryText)}
        ${renderRawReplyCards(rawReplies)}
      </section>
    </main>
  </body>
  </html>`;
}

ipcMain.removeHandler('duoli:export-pdf');
ipcMain.handle('duoli:export-pdf', async (_e, payload = {}) => {
  const summaryText = String(payload && payload.summaryText ? payload.summaryText : '').trim();
  const rawReplies = Array.isArray(payload && payload.rawReplies) ? payload.rawReplies : [];
  const hasRawReply = rawReplies.some((reply) => String(reply && reply.text ? reply.text : '').trim());
  if (!summaryText && !hasRawReply) return { ok: false, error: 'Nothing to export.' };

  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: '保存深度对比 PDF 报告',
    defaultPath: path.join(app.getPath('documents'), `滤镜-多模型深度对比报告-${new Date().toISOString().slice(0, 10)}.pdf`),
    filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return { ok: false, error: 'canceled' };

  const html = buildReportHtml(payload);
  const tmpHtml = path.join(os.tmpdir(), `duoli_pdf_${Date.now()}.html`);
  fs.writeFileSync(tmpHtml, html, 'utf8');

  const win = new BrowserWindow({ show: false, webPreferences: { javascript: false } });
  await win.loadFile(tmpHtml);
  try {
    const pdfBuf = await win.webContents.printToPDF({
      pageSize: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: true,
      preferCSSPageSize: true,
    });
    fs.writeFileSync(filePath, pdfBuf);
    return { ok: true, filePath };
  } finally {
    win.destroy();
    try {
      fs.unlinkSync(tmpHtml);
    } catch (_) {
      /* ignore */
    }
  }
});

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {Record<string, BrowserView>} */
const embedViewsById = {};
/** @type {Record<string, { mode: 'main' | 'detached', window: BrowserWindow | null }>} */
const embedHostsById = {};
/** @type {Record<string, BrowserWindow>} */
const detachedWindowsById = {};
/** @type {Record<string, { x: number, y: number, width: number, height: number }>} */
const mainSlotBoundsById = {};
/** @type {Record<string, Electron.Rectangle>} */
const detachedBoundsById = {};
let isAppQuitting = false;

function stripElectronFromUA(ua) {
  return String(ua || '')
    .replace(/\s*Electron\/[^\s]+\s*/i, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function chromeLikeDesktopUa() {
  const chromeVer = process.versions.chrome || '120.0.0.0';
  if (process.platform === 'darwin') {
    return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`;
  }
  if (process.platform === 'linux') {
    return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`;
  }
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`;
}

/** @param {{ chromeOnlyUa?: boolean } | undefined} cfg */
function guestUserAgent(cfg, defaultFromContents) {
  if (cfg && cfg.chromeOnlyUa) return chromeLikeDesktopUa();
  return stripElectronFromUA(defaultFromContents);
}

function getPlatformById(id) {
  return platforms.find((cfg) => cfg.id === id) || null;
}

function sendEmbedEvent(payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('embed:event', payload);
}

function emitHostChanged(id) {
  const host = embedHostsById[id];
  sendEmbedEvent({
    type: 'host-changed',
    id,
    host: host && host.mode === 'detached' ? 'detached' : 'main',
  });
}

function safeRemoveBrowserView(win, view) {
  if (!win || win.isDestroyed() || !view) return;
  try {
    win.removeBrowserView(view);
  } catch (e) {
    /* ignore */
  }
}

function hideBrowserView(view) {
  if (!view) return;
  try {
    view.setBounds({ x: -10000, y: -10000, width: 1, height: 1 });
  } catch (e) {
    /* ignore */
  }
}

function fitViewToWindowContent(id, win) {
  const view = embedViewsById[id];
  if (!view || !win || win.isDestroyed()) return;
  const [width, height] = win.getContentSize();
  try {
    view.setBounds({
      x: 0,
      y: 0,
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
    });
  } catch (e) {
    /* ignore */
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rememberDetachedBounds(id, win) {
  if (!win || win.isDestroyed()) return;
  detachedBoundsById[id] = win.getBounds();
}

function rehostEmbedView(id, targetWindow, mode) {
  const view = embedViewsById[id];
  if (!view || !targetWindow || targetWindow.isDestroyed()) return;
  const currentHost = embedHostsById[id];
  if (currentHost && currentHost.window === targetWindow && currentHost.mode === mode) {
    if (mode === 'main') {
      const slotBounds = mainSlotBoundsById[id];
      if (slotBounds) {
        try {
          view.setBounds(slotBounds);
        } catch (e) {
          hideBrowserView(view);
        }
      } else {
        hideBrowserView(view);
      }
    } else {
      fitViewToWindowContent(id, targetWindow);
    }
    emitHostChanged(id);
    return;
  }
  if (currentHost && currentHost.window && !currentHost.window.isDestroyed()) {
    safeRemoveBrowserView(currentHost.window, view);
  }
  try {
    targetWindow.addBrowserView(view);
  } catch (e) {
    /* ignore */
  }
  embedHostsById[id] = { mode, window: targetWindow };
  if (mode === 'main') {
    const slotBounds = mainSlotBoundsById[id];
    if (slotBounds) {
      try {
        view.setBounds(slotBounds);
      } catch (e) {
        hideBrowserView(view);
      }
    } else {
      hideBrowserView(view);
    }
  } else {
    fitViewToWindowContent(id, targetWindow);
  }
  emitHostChanged(id);
}

function createDetachedWindow(id, options = {}) {
  const existing = detachedWindowsById[id];
  if (existing && !existing.isDestroyed()) {
    return existing;
  }
  const cfg = getPlatformById(id);
  if (!cfg) {
    throw new Error(`unknown-platform:${id}`);
  }
  const saved = detachedBoundsById[id];
  const pointer = {
    x: Number.isFinite(options.x) ? Math.round(options.x) : screen.getCursorScreenPoint().x,
    y: Number.isFinite(options.y) ? Math.round(options.y) : screen.getCursorScreenPoint().y,
  };
  const display = screen.getDisplayNearestPoint(pointer);
  const workArea = display && display.workArea ? display.workArea : { x: 0, y: 0, width: 1440, height: 960 };
  const width = clamp(
    Math.round(saved?.width || options.width || Math.min(560, Math.floor(workArea.width * 0.4))),
    380,
    Math.max(420, workArea.width - 48)
  );
  const height = clamp(
    Math.round(saved?.height || options.height || Math.min(980, Math.floor(workArea.height * 0.92))),
    520,
    Math.max(560, workArea.height - 48)
  );
  const x = clamp(
    Math.round(saved?.x ?? pointer.x - Math.floor(width / 2)),
    workArea.x + 12,
    workArea.x + Math.max(12, workArea.width - width - 12)
  );
  const y = clamp(
    Math.round(saved?.y ?? pointer.y - 24),
    workArea.y + 12,
    workArea.y + Math.max(12, workArea.height - height - 12)
  );
  const win = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: 380,
    minHeight: 520,
    autoHideMenuBar: true,
    title: `${cfg.name} · 滤镜`,
    backgroundColor: '#FFFFFFFF',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  try {
    win.setMenuBarVisibility(false);
  } catch (e) {
    /* ignore */
  }
  const syncBounds = () => {
    rememberDetachedBounds(id, win);
    fitViewToWindowContent(id, win);
  };
  win.on('resize', syncBounds);
  win.on('move', () => rememberDetachedBounds(id, win));
  win.on('close', (event) => {
    if (isAppQuitting || win.__duoliAllowClose) return;
    if (!mainWindow || mainWindow.isDestroyed()) return;
    event.preventDefault();
    redockEmbedView(id);
  });
  win.on('closed', () => {
    delete detachedWindowsById[id];
  });
  detachedWindowsById[id] = win;
  syncBounds();
  return win;
}

function createEmbedView(cfg) {
  if (embedViewsById[cfg.id]) {
    return embedViewsById[cfg.id];
  }
  const view = new BrowserView({
    webPreferences: {
      partition: cfg.partition,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });
  try {
    view.setBackgroundColor('#FFFFFFFF');
  } catch (e) {
    /* ignore */
  }
  const ua = guestUserAgent(cfg, view.webContents.getUserAgent());
  if (ua) view.webContents.setUserAgent(ua);

  view.webContents.setWindowOpenHandler(() => {
    const hostWindow =
      embedHostsById[cfg.id] && embedHostsById[cfg.id].window && !embedHostsById[cfg.id].window.isDestroyed()
        ? embedHostsById[cfg.id].window
        : mainWindow;
    const [baseWidth, baseHeight] =
      hostWindow && !hostWindow.isDestroyed() ? hostWindow.getContentSize() : [1280, 900];
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        parent: hostWindow || undefined,
        autoHideMenuBar: true,
        width: Math.min(1024, Math.floor(baseWidth * 0.92)),
        height: Math.min(900, Math.floor(baseHeight * 0.88)),
        webPreferences: {
          partition: cfg.partition,
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: false,
          backgroundThrottling: false,
        },
      },
    };
  });
  view.webContents.on('did-create-window', (childWin) => {
    try {
      const childUa = guestUserAgent(cfg, childWin.webContents.getUserAgent());
      if (childUa) childWin.webContents.setUserAgent(childUa);
      try {
        childWin.setBackgroundColor('#FFFFFFFF');
      } catch (e) {
        /* ignore */
      }
    } catch (e) {
      /* ignore */
    }
  });
  view.webContents.on('did-finish-load', () => {
    sendEmbedEvent({ type: 'dom-ready', id: cfg.id });
  });
  view.webContents.on('did-fail-load', (_event, errorCode, errorDescription, _validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return;
    sendEmbedEvent({
      type: 'fail-load',
      id: cfg.id,
      errorCode,
      errorDescription,
    });
  });

  embedViewsById[cfg.id] = view;
  if (!embedHostsById[cfg.id]) {
    embedHostsById[cfg.id] = { mode: 'main', window: null };
  }
  hideBrowserView(view);
  view.webContents.loadURL(cfg.url);
  return view;
}

function ensureEmbedViews(win) {
  platforms.forEach((cfg) => {
    createEmbedView(cfg);
    const host = embedHostsById[cfg.id];
    if (!host || host.mode !== 'detached') {
      rehostEmbedView(cfg.id, win, 'main');
    } else {
      emitHostChanged(cfg.id);
    }
  });
}

function popoutEmbedView(id, options = {}) {
  const cfg = getPlatformById(id);
  if (!cfg) {
    throw new Error(`unknown-platform:${id}`);
  }
  createEmbedView(cfg);
  const win = createDetachedWindow(id, options);
  rehostEmbedView(id, win, 'detached');
  try {
    win.focus();
  } catch (e) {
    /* ignore */
  }
  return { ok: true, host: 'detached' };
}

function redockEmbedView(id) {
  const cfg = getPlatformById(id);
  if (!cfg) {
    throw new Error(`unknown-platform:${id}`);
  }
  if (!mainWindow || mainWindow.isDestroyed()) {
    throw new Error('main-window-unavailable');
  }
  createEmbedView(cfg);
  rehostEmbedView(id, mainWindow, 'main');
  const detachedWin = detachedWindowsById[id];
  if (detachedWin && !detachedWin.isDestroyed()) {
    detachedWin.__duoliAllowClose = true;
    try {
      detachedWin.close();
    } catch (e) {
      try {
        detachedWin.destroy();
      } catch (e2) {
        /* ignore */
      }
    }
  }
  delete detachedWindowsById[id];
  return { ok: true, host: 'main' };
}

function destroyEmbedView(id) {
  const view = embedViewsById[id];
  const host = embedHostsById[id];
  if (host && host.window && !host.window.isDestroyed()) {
    safeRemoveBrowserView(host.window, view);
  }
  const detachedWin = detachedWindowsById[id];
  if (detachedWin && !detachedWin.isDestroyed()) {
    detachedWin.__duoliAllowClose = true;
    try {
      detachedWin.destroy();
    } catch (e) {
      /* ignore */
    }
  }
  if (view) {
    try {
      if (typeof view.webContents.close === 'function') view.webContents.close();
    } catch (e) {
      /* ignore */
    }
  }
  delete detachedWindowsById[id];
  delete embedViewsById[id];
  delete embedHostsById[id];
  delete mainSlotBoundsById[id];
  delete detachedBoundsById[id];
}

function removeEmbedViews() {
  Object.keys(embedViewsById).forEach((id) => destroyEmbedView(id));
}

function createWindow() {
  const preloadPath = path.resolve(__dirname, 'preload.js');
  if (!fs.existsSync(preloadPath)) {
    console.error('[duoliulanqi] preload file not found:', preloadPath);
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay ? primaryDisplay.workAreaSize : { width: 1680, height: 1080 };
  const initialWidth = Math.max(1440, Math.min(2200, workArea.width));
  const initialHeight = Math.max(900, Math.min(1400, workArea.height));

  mainWindow = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
    minWidth: 1320,
    minHeight: 860,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.webContents.once('did-finish-load', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.maximize();
    if (mainWindow && !mainWindow.isDestroyed()) ensureEmbedViews(mainWindow);
  });

  mainWindow.on('closed', () => {
    const closedWindow = mainWindow;
    mainWindow = null;
    Object.keys(embedHostsById).forEach((id) => {
      const host = embedHostsById[id];
      if (host && host.mode === 'main' && host.window === closedWindow) {
        destroyEmbedView(id);
      }
    });
  });
}

ipcMain.handle('duoli:get-embed-hosts', () =>
  Object.fromEntries(
    platforms.map((cfg) => [
      cfg.id,
      embedHostsById[cfg.id] && embedHostsById[cfg.id].mode === 'detached' ? 'detached' : 'main',
    ])
  )
);

ipcMain.handle('embed:popout', async (_event, { id, bounds } = {}) => popoutEmbedView(id, bounds || {}));

ipcMain.handle('embed:redock', async (_event, { id } = {}) => redockEmbedView(id));

ipcMain.on('embed:bounds', (event, slots) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!mainWindow || !win || win !== mainWindow || win.isDestroyed()) return;
  if (!Array.isArray(slots)) return;
  slots.forEach(({ id, x, y, width, height }) => {
    const view = embedViewsById[id];
    if (!view) return;
    const host = embedHostsById[id];
    if (width >= 4 && height >= 4) {
      mainSlotBoundsById[id] = {
        x: Math.max(0, Math.round(x)),
        y: Math.max(0, Math.round(y)),
        width: Math.round(width),
        height: Math.round(height),
      };
    }
    if (!host || host.mode !== 'main' || host.window !== win) return;
    if (width < 4 || height < 4) {
      hideBrowserView(view);
      return;
    }
    try {
      view.setBounds(mainSlotBoundsById[id]);
    } catch (e) {
      hideBrowserView(view);
    }
  });
});

function isDisposedFrameError(err) {
  const msg = err && err.message ? err.message : String(err || '');
  return /disposed|Render frame was disposed|frame.*gone|ERR_|WebFrameMain/i.test(msg);
}

ipcMain.handle('embed:exec', async (_event, { id, code }) => {
  const view = embedViewsById[id];
  if (!view) throw new Error('Embedded page is not ready yet.');
  const wc = view.webContents;
  if (wc.isDestroyed()) {
    throw new Error('Embedded page is reloading or already closed.');
  }
  try {
    return await wc.executeJavaScript(code, true);
  } catch (e) {
    if (wc.isDestroyed() || isDisposedFrameError(e)) {
      throw new Error('Embedded page is refreshing, please retry in a moment.');
    }
    throw e;
  }
});

ipcMain.handle('embed:reload', async (_event, { id } = {}) => {
  if (id) {
    const view = embedViewsById[id];
    if (view) view.webContents.reload();
    return;
  }
  Object.values(embedViewsById).forEach((view) => view.webContents.reload());
});

app.on('before-quit', () => {
  isAppQuitting = true;
  removeEmbedViews();
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
