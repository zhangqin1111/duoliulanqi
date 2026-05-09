'use strict';

function createBrowserViewManager({ BrowserWindow, BrowserView, screen, platforms, getMainWindow, isAppQuitting }) {
  const embedViewsById = {};
  const embedHostsById = {};
  const detachedWindowsById = {};
  const mainSlotBoundsById = {};
  const detachedBoundsById = {};

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

  function guestUserAgent(cfg, defaultFromContents) {
    if (cfg && cfg.chromeOnlyUa) return chromeLikeDesktopUa();
    return stripElectronFromUA(defaultFromContents);
  }

  function getPlatformById(id) {
    return platforms.find((cfg) => cfg.id === id) || null;
  }

  function sendEmbedEvent(payload) {
    const mainWindow = getMainWindow();
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
    } catch (error) {
      /* ignore */
    }
  }

  function hideBrowserView(view) {
    if (!view) return;
    try {
      view.setBounds({ x: -20000, y: -20000, width: 1280, height: 900 });
    } catch (error) {
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
    } catch (error) {
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
          } catch (error) {
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
    } catch (error) {
      /* ignore */
    }
    embedHostsById[id] = { mode, window: targetWindow };
    if (mode === 'main') {
      const slotBounds = mainSlotBoundsById[id];
      if (slotBounds) {
        try {
          view.setBounds(slotBounds);
        } catch (error) {
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
    if (existing && !existing.isDestroyed()) return existing;
    const cfg = getPlatformById(id);
    if (!cfg) throw new Error(`unknown-platform:${id}`);

    const saved = detachedBoundsById[id];
    const cursor = screen.getCursorScreenPoint();
    const pointer = {
      x: Number.isFinite(options.x) ? Math.round(options.x) : cursor.x,
      y: Number.isFinite(options.y) ? Math.round(options.y) : cursor.y,
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
    } catch (error) {
      /* ignore */
    }
    const syncBounds = () => {
      rememberDetachedBounds(id, win);
      fitViewToWindowContent(id, win);
    };
    win.on('resize', syncBounds);
    win.on('move', () => rememberDetachedBounds(id, win));
    win.on('close', (event) => {
      const mainWindow = getMainWindow();
      if (isAppQuitting() || win.__duoliAllowClose) return;
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
    if (embedViewsById[cfg.id]) return embedViewsById[cfg.id];
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
    } catch (error) {
      /* ignore */
    }
    const ua = guestUserAgent(cfg, view.webContents.getUserAgent());
    if (ua) view.webContents.setUserAgent(ua);

    view.webContents.setWindowOpenHandler(() => {
      const mainWindow = getMainWindow();
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
        } catch (error) {
          /* ignore */
        }
      } catch (error) {
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
    if (!cfg) throw new Error(`unknown-platform:${id}`);
    createEmbedView(cfg);
    const win = createDetachedWindow(id, options);
    rehostEmbedView(id, win, 'detached');
    try {
      win.focus();
    } catch (error) {
      /* ignore */
    }
    return { ok: true, host: 'detached' };
  }

  function redockEmbedView(id) {
    const cfg = getPlatformById(id);
    if (!cfg) throw new Error(`unknown-platform:${id}`);
    const mainWindow = getMainWindow();
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
      } catch (error) {
        try {
          detachedWin.destroy();
        } catch (innerError) {
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
      } catch (error) {
        /* ignore */
      }
    }
    if (view) {
      try {
        if (typeof view.webContents.close === 'function') view.webContents.close();
      } catch (error) {
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

  function getEmbedHosts() {
    return Object.fromEntries(
      platforms.map((cfg) => [
        cfg.id,
        embedHostsById[cfg.id] && embedHostsById[cfg.id].mode === 'detached' ? 'detached' : 'main',
      ])
    );
  }

  function handleBounds(event, slots) {
    const mainWindow = getMainWindow();
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
      } catch (error) {
        hideBrowserView(view);
      }
    });
  }

  function isDisposedFrameError(err) {
    const msg = err && err.message ? err.message : String(err || '');
    return /disposed|Render frame was disposed|frame.*gone|ERR_|WebFrameMain/i.test(msg);
  }

  async function executeInGuest(id, code) {
    const view = embedViewsById[id];
    if (!view) throw new Error('Embedded page is not ready yet.');
    const wc = view.webContents;
    if (wc.isDestroyed()) {
      throw new Error('Embedded page is reloading or already closed.');
    }
    try {
      return await wc.executeJavaScript(code, true);
    } catch (error) {
      if (wc.isDestroyed() || isDisposedFrameError(error)) {
        throw new Error('Embedded page is refreshing, please retry in a moment.');
      }
      throw error;
    }
  }

  function reloadGuest(id) {
    if (id) {
      const view = embedViewsById[id];
      if (view) view.webContents.reload();
      return;
    }
    Object.values(embedViewsById).forEach((view) => view.webContents.reload());
  }

  function handleMainWindowClosed(closedWindow) {
    Object.keys(embedHostsById).forEach((id) => {
      const host = embedHostsById[id];
      if (host && host.mode === 'main' && host.window === closedWindow) {
        destroyEmbedView(id);
      }
    });
  }

  return {
    ensureEmbedViews,
    executeInGuest,
    getEmbedHosts,
    handleBounds,
    handleMainWindowClosed,
    popoutEmbedView,
    redockEmbedView,
    reloadGuest,
    removeEmbedViews,
  };
}

module.exports = {
  createBrowserViewManager,
};
