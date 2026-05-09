'use strict';

function registerWindowIpc({
  ipcMain,
  assertLicenseValid,
  getMainWindow,
  browserViewManager,
  dockOverlayWindow,
}) {
  ipcMain.handle('duoli:ensure-embed-views', () => {
    assertLicenseValid();
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) browserViewManager.ensureEmbedViews(mainWindow);
    return { ok: true };
  });

  ipcMain.handle('duoli:get-embed-hosts', () => {
    assertLicenseValid();
    return browserViewManager.getEmbedHosts();
  });

  ipcMain.handle('embed:popout', async (_event, { id, bounds } = {}) => {
    assertLicenseValid();
    return browserViewManager.popoutEmbedView(id, bounds || {});
  });

  ipcMain.handle('embed:redock', async (_event, { id } = {}) => {
    assertLicenseValid();
    return browserViewManager.redockEmbedView(id);
  });

  ipcMain.on('embed:bounds', (event, slots) => {
    browserViewManager.handleBounds(event, slots);
  });

  ipcMain.on('dock-overlay:state', (event, state) => {
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) return;
    dockOverlayWindow.update(state || {});
  });

  ipcMain.on('dock-overlay:action', (event, action) => {
    const mainWindow = getMainWindow();
    const overlay = dockOverlayWindow.getWindow();
    if (!overlay || overlay.isDestroyed() || event.sender !== overlay.webContents) return;
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('dock-overlay:action', action || {});
  });

  ipcMain.handle('embed:exec', async (_event, { id, code }) => {
    assertLicenseValid();
    return browserViewManager.executeInGuest(id, code);
  });

  ipcMain.handle('embed:reload', async (_event, { id } = {}) => {
    assertLicenseValid();
    browserViewManager.reloadGuest(id);
  });
}

module.exports = {
  registerWindowIpc,
};
