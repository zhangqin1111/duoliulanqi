'use strict';

const path = require('path');

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
    const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const logo = (item) => {
      const fallback = escapeHtml(String(item.avatar || item.name || '?').slice(0, 2));
      if (!item.logoUrl) return '<span class="dock-logo is-fallback"><span>' + fallback + '</span></span>';
      return '<span class="dock-logo"><img src="' + escapeHtml(item.logoUrl) + '" alt="" onerror="this.parentElement.classList.add(\\'is-fallback\\');this.remove();" /><span>' + fallback + '</span></span>';
    };
    function renderMenu() {
      const closed = Array.isArray(state.closed) ? state.closed : [];
      if (!closed.length) {
        menu.innerHTML = '<button class="empty" disabled>当前没有已关闭的 AI 工具</button>';
        return;
      }
      menu.innerHTML = closed.map((item) => '<button data-restore="' + escapeHtml(item.id) + '"><span class="brand">' + logo(item) + '<span>' + escapeHtml(item.name) + '</span></span><span>恢复</span></button>').join('');
      menu.querySelectorAll('[data-restore]').forEach((btn) => {
        btn.addEventListener('click', () => {
          send({ type: 'restore', id: btn.getAttribute('data-restore') });
          menu.hidden = true;
        });
      });
    }
    function renderIcons() {
      const list = Array.isArray(state.icons) ? state.icons : [];
      icons.innerHTML = list.map((item) => '<button class="dock-icon" data-id="' + escapeHtml(item.id) + '" data-mode="' + escapeHtml(item.mode) + '" title="' + escapeHtml(item.name) + '">' + logo(item) + '</button>').join('');
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

function createDockOverlayWindowController({ BrowserWindow, preloadPath, getMainWindow }) {
  let dockOverlayWindow = null;
  let latestState = { visible: false };

  function position() {
    const mainWindow = getMainWindow();
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

  function ensure() {
    const mainWindow = getMainWindow();
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
        preload: path.resolve(preloadPath),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });
    dockOverlayWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(dockOverlayHtml())}`);
    dockOverlayWindow.webContents.once('did-finish-load', () => {
      if (dockOverlayWindow && !dockOverlayWindow.isDestroyed()) {
        dockOverlayWindow.webContents.send('dock-overlay:render', latestState);
      }
    });
    dockOverlayWindow.on('closed', () => {
      dockOverlayWindow = null;
    });
    position();
    return dockOverlayWindow;
  }

  function update(state) {
    latestState = state || { visible: false };
    const win = ensure();
    if (!win || win.isDestroyed()) return;
    position();
    if (latestState.visible === false) {
      win.hide();
      return;
    }
    if (!win.isVisible()) win.showInactive();
    win.webContents.send('dock-overlay:render', latestState);
  }

  function destroy() {
    if (dockOverlayWindow && !dockOverlayWindow.isDestroyed()) {
      dockOverlayWindow.destroy();
    }
    dockOverlayWindow = null;
  }

  return {
    destroy,
    getWindow: () => dockOverlayWindow,
    position,
    update,
  };
}

module.exports = {
  createDockOverlayWindowController,
};
