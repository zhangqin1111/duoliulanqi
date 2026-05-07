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
const {
  getLicenseState,
  activateLicense,
  clearLicense,
  assertLicenseValid,
} = require('./license');
const reportTemplate = require('./report/template');
const factReportTemplate = require('./report/fact-template');

function extractStructuredJson(summaryText) {
  const text = String(summaryText || '');
  if (!text) return null;
  const re = /```json\s*([\s\S]*?)```/gi;
  let last = null;
  let m;
  while ((m = re.exec(text)) !== null) {
    last = m[1];
  }
  if (!last) {
    const start = text.lastIndexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) last = text.slice(start, end + 1);
  }
  if (!last) return null;
  try {
    const parsed = JSON.parse(last.trim());
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    try {
      const cleaned = last
        .trim()
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/(['"])\s*\n\s*\+\s*['"]/g, '');
      return JSON.parse(cleaned);
    } catch (__) {
      return null;
    }
  }
}

if (process.env.DUOLI_DISABLE_GPU === '1') {
  app.disableHardwareAcceleration();
}
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
  if (process.env.DUOLI_DISABLE_DCOMP === '1') {
    app.commandLine.appendSwitch('disable-direct-composition');
  }
}

ipcMain.handle('duoli:get-license-state', () => getLicenseState());
ipcMain.handle('duoli:activate-license', (_e, { token } = {}) => activateLicense(token));
ipcMain.handle('duoli:clear-license', () => clearLicense());

ipcMain.handle('duoli:get-platforms', () => {
  assertLicenseValid();
  return platforms.map((p) => ({ ...p }));
});

ipcMain.handle('duoli:qwen-configured', () => {
  assertLicenseValid();
  return getQwenKeyStatus();
});

ipcMain.handle('duoli:save-dashscope-key', (_e, { key } = {}) => {
  assertLicenseValid();
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
  assertLicenseValid();
  try {
    clearDashScopeApiKeyFile();
  } catch (e) {
    /* ignore */
  }
  return getQwenKeyStatus();
});

ipcMain.handle('duoli:qwen-complete', async (_e, { prompt } = {}) => {
  assertLicenseValid();
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
  assertLicenseValid();
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

ipcMain.handle('duoli:export-pdf', async (_e, payload = {}) => {
  assertLicenseValid();
  const summaryText = String(payload && payload.summaryText ? payload.summaryText : '').trim();
  const rawReplies = Array.isArray(payload && payload.rawReplies) ? payload.rawReplies : [];
  const hasRawReply = rawReplies.some((reply) => String(reply && reply.text ? reply.text : '').trim());
  if (!summaryText && !hasRawReply) return { ok: false, error: 'Nothing to export.' };

  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: '保存滤镜·多源大模型内容对比分析',
    defaultPath: path.join(app.getPath('documents'), `滤镜·多源大模型内容对比分析-${new Date().toISOString().slice(0, 10)}.pdf`),
    filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return { ok: false, error: 'canceled' };

  const structured = extractStructuredJson(summaryText);
  const html =
    structured && structured.executive_conclusion
      ? factReportTemplate.buildReportHtml(payload, structured)
      : reportTemplate.buildReportHtml(payload, structured);
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
/** @type {BrowserWindow | null} */
let dockOverlayWindow = null;
let latestDockOverlayState = { visible: false };
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
    view.setBounds({ x: -20000, y: -20000, width: 1280, height: 900 });
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

function dockOverlayHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: transparent; font-family: "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif; }
    body { display: grid; place-items: center end; padding: 10px 14px; color: #332d27; }
    .dock { display: inline-flex; flex-direction: column; align-items: center; gap: 12px; padding: 14px 10px; border-radius: 999px; background: radial-gradient(circle at top, rgba(47,109,244,.16), transparent 42%), rgba(255,255,255,.88); border: 1px solid rgba(255,255,255,.72); box-shadow: 0 22px 54px rgba(72,58,44,.18), inset 0 0 0 1px rgba(61,41,20,.04); backdrop-filter: blur(18px) saturate(1.1); }
    button { border: 0; font: inherit; cursor: pointer; }
    .dock-btn, .dock-icon { width: 46px; height: 46px; border-radius: 999px; display: grid; place-items: center; background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(247,243,238,.94)); border: 1px solid rgba(61,41,20,.06); box-shadow: 0 8px 18px rgba(117,102,88,.1), inset 0 1px 0 rgba(255,255,255,.9); color: #463f39; font-weight: 800; }
    .dock-btn--primary { background: linear-gradient(180deg, #3d7cff 0%, #2f6df4 100%); color: #fff; box-shadow: 0 18px 28px rgba(47,109,244,.28); font-size: 24px; }
    .dock-icons { display: flex; flex-direction: column; gap: 10px; }
    .dock-logo { width: 24px; height: 24px; border-radius: 999px; display: grid; place-items: center; overflow: hidden; font-size: 12px; font-weight: 900; }
    .dock-logo img { width: 100%; height: 100%; object-fit: contain; display: block; }
    .dock-logo span { display: none; }
    .dock-logo.is-fallback span { display: inline; }
    .menu { position: absolute; right: 78px; top: 50%; min-width: 214px; max-width: 236px; padding: 10px; border-radius: 22px; transform: translateY(-50%); background: radial-gradient(circle at top right, rgba(47,109,244,.12), transparent 36%), rgba(255,255,255,.97); border: 1px solid rgba(255,255,255,.7); box-shadow: 0 24px 60px rgba(72,58,44,.2); backdrop-filter: blur(18px) saturate(1.08); }
    .menu[hidden] { display: none !important; }
    .menu::after { content: ""; position: absolute; top: 50%; right: -7px; width: 14px; height: 14px; transform: translateY(-50%) rotate(45deg); border-top: 1px solid rgba(61,41,20,.06); border-right: 1px solid rgba(61,41,20,.06); background: rgba(255,255,255,.98); border-radius: 4px; }
    .menu button { width: 100%; min-height: 42px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 14px; border-radius: 14px; background: transparent; color: #4b433c; font-size: 13px; font-weight: 700; }
    .menu button:hover { background: linear-gradient(180deg, #faf7f3 0%, #f3eee8 100%); }
    .brand { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
    .brand .dock-logo { width: 20px; height: 20px; }
    .empty { color: #857a70; justify-content: center !important; cursor: default; }
  </style>
</head>
<body>
  <div id="menu" class="menu" hidden></div>
  <div class="dock">
    <button id="refresh" class="dock-btn" title="刷新全部">↻</button>
    <button id="add" class="dock-btn dock-btn--primary" title="添加 AI 工具">+</button>
    <div id="icons" class="dock-icons"></div>
  </div>
  <script>
    let state = { closed: [], icons: [] };
    const menu = document.getElementById('menu');
    const icons = document.getElementById('icons');
    const send = (payload) => window.duoliulan && window.duoliulan.sendDockOverlayAction(payload);
    const logo = (item) => {
      const fallback = String(item.avatar || item.name || '?').slice(0, 2);
      if (!item.logoUrl) return '<span class="dock-logo is-fallback"><span>' + fallback + '</span></span>';
      return '<span class="dock-logo"><img src="' + item.logoUrl + '" alt="" onerror="this.parentElement.classList.add(\\'is-fallback\\');this.remove();" /><span>' + fallback + '</span></span>';
    };
    function renderMenu() {
      const closed = Array.isArray(state.closed) ? state.closed : [];
      if (!closed.length) {
        menu.innerHTML = '<button class="empty" disabled>当前没有已关闭的 AI 工具</button>';
        return;
      }
      menu.innerHTML = closed.map((item) => '<button data-restore="' + item.id + '"><span class="brand">' + logo(item) + '<span>' + item.name + '</span></span><span>恢复</span></button>').join('');
      menu.querySelectorAll('[data-restore]').forEach((btn) => {
        btn.addEventListener('click', () => {
          send({ type: 'restore', id: btn.getAttribute('data-restore') });
          menu.hidden = true;
        });
      });
    }
    function renderIcons() {
      const list = Array.isArray(state.icons) ? state.icons : [];
      icons.innerHTML = list.map((item) => '<button class="dock-icon" data-id="' + item.id + '" data-mode="' + item.mode + '" title="' + item.name + '">' + logo(item) + '</button>').join('');
      icons.querySelectorAll('[data-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const mode = btn.getAttribute('data-mode');
          send({ type: mode === 'detached' ? 'redock' : 'restore', id: btn.getAttribute('data-id') });
        });
      });
    }
    document.getElementById('refresh').addEventListener('click', () => send({ type: 'refresh' }));
    document.getElementById('add').addEventListener('click', () => {
      renderMenu();
      menu.hidden = !menu.hidden;
    });
    window.duoliulan && window.duoliulan.onDockOverlayState((next) => {
      state = next || {};
      renderIcons();
      if (!menu.hidden) renderMenu();
    });
  </script>
</body>
</html>`;
}

function positionDockOverlayWindow() {
  if (!mainWindow || mainWindow.isDestroyed() || !dockOverlayWindow || dockOverlayWindow.isDestroyed()) return;
  const mainBounds = mainWindow.getBounds();
  const width = 320;
  const height = 460;
  dockOverlayWindow.setBounds({
    x: mainBounds.x + Math.max(0, mainBounds.width - width - 16),
    y: mainBounds.y + Math.max(0, Math.round((mainBounds.height - height) / 2)),
    width,
    height,
  });
}

function ensureDockOverlayWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  if (dockOverlayWindow && !dockOverlayWindow.isDestroyed()) return dockOverlayWindow;
  dockOverlayWindow = new BrowserWindow({
    parent: mainWindow,
    width: 320,
    height: 460,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    hasShadow: false,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.resolve(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  dockOverlayWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(dockOverlayHtml())}`);
  dockOverlayWindow.webContents.once('did-finish-load', () => {
    if (dockOverlayWindow && !dockOverlayWindow.isDestroyed()) {
      dockOverlayWindow.webContents.send('dock-overlay:render', latestDockOverlayState);
    }
  });
  dockOverlayWindow.on('closed', () => {
    dockOverlayWindow = null;
  });
  positionDockOverlayWindow();
  return dockOverlayWindow;
}

function updateDockOverlayWindow(state) {
  latestDockOverlayState = state || { visible: false };
  const win = ensureDockOverlayWindow();
  if (!win || win.isDestroyed()) return;
  positionDockOverlayWindow();
  if (latestDockOverlayState.visible === false) {
    win.hide();
    return;
  }
  if (!win.isVisible()) win.showInactive();
  win.webContents.send('dock-overlay:render', latestDockOverlayState);
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
    if (mainWindow && !mainWindow.isDestroyed() && getLicenseState().ok) ensureEmbedViews(mainWindow);
    updateDockOverlayWindow(latestDockOverlayState);
  });

  mainWindow.on('move', positionDockOverlayWindow);
  mainWindow.on('resize', positionDockOverlayWindow);
  mainWindow.on('maximize', positionDockOverlayWindow);
  mainWindow.on('unmaximize', positionDockOverlayWindow);

  mainWindow.on('closed', () => {
    const closedWindow = mainWindow;
    mainWindow = null;
    Object.keys(embedHostsById).forEach((id) => {
      const host = embedHostsById[id];
      if (host && host.mode === 'main' && host.window === closedWindow) {
        destroyEmbedView(id);
      }
    });
    if (dockOverlayWindow && !dockOverlayWindow.isDestroyed()) {
      dockOverlayWindow.destroy();
    }
    dockOverlayWindow = null;
  });
}

ipcMain.handle('duoli:ensure-embed-views', () => {
  assertLicenseValid();
  if (mainWindow && !mainWindow.isDestroyed()) ensureEmbedViews(mainWindow);
  return { ok: true };
});

ipcMain.handle('duoli:get-embed-hosts', () => {
  assertLicenseValid();
  return Object.fromEntries(
    platforms.map((cfg) => [
      cfg.id,
      embedHostsById[cfg.id] && embedHostsById[cfg.id].mode === 'detached' ? 'detached' : 'main',
    ])
  );
});

ipcMain.handle('embed:popout', async (_event, { id, bounds } = {}) => {
  assertLicenseValid();
  return popoutEmbedView(id, bounds || {});
});

ipcMain.handle('embed:redock', async (_event, { id } = {}) => {
  assertLicenseValid();
  return redockEmbedView(id);
});

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

ipcMain.on('dock-overlay:state', (event, state) => {
  if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) return;
  updateDockOverlayWindow(state || {});
});

ipcMain.on('dock-overlay:action', (event, action) => {
  if (!dockOverlayWindow || dockOverlayWindow.isDestroyed() || event.sender !== dockOverlayWindow.webContents) return;
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('dock-overlay:action', action || {});
});

function isDisposedFrameError(err) {
  const msg = err && err.message ? err.message : String(err || '');
  return /disposed|Render frame was disposed|frame.*gone|ERR_|WebFrameMain/i.test(msg);
}

ipcMain.handle('embed:exec', async (_event, { id, code }) => {
  assertLicenseValid();
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
  assertLicenseValid();
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
