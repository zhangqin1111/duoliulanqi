const path = require('path');
const fs = require('fs');
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
const reportTemplateRegistry = require('./report/report-template-registry');
const { createBrowserViewManager } = require('./browser-view-manager');
const { createDockOverlayWindowController } = require('./dock-overlay-window');
const { registerDashScopeIpc } = require('./ipc/dashscope-ipc');
const { registerLicenseIpc, registerPlatformIpc } = require('./ipc/license-ipc');
const { registerPdfExportIpc } = require('./ipc/pdf-export-ipc');
const { registerWindowIpc } = require('./ipc/window-ipc');
const { registerCommercialIpc } = require('./ipc/commercial-ipc');

if (process.env.DUOLI_DISABLE_GPU === '1') {
  app.disableHardwareAcceleration();
}
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
  if (process.env.DUOLI_DISABLE_DCOMP === '1') {
    app.commandLine.appendSwitch('disable-direct-composition');
  }
}

/** @type {BrowserWindow | null} */
let mainWindow = null;
let isAppQuitting = false;

const browserViewManager = createBrowserViewManager({
  BrowserWindow,
  BrowserView,
  screen,
  platforms,
  getMainWindow: () => mainWindow,
  isAppQuitting: () => isAppQuitting,
});

const dockOverlayWindow = createDockOverlayWindowController({
  BrowserWindow,
  preloadPath: path.resolve(__dirname, 'preload.js'),
  getMainWindow: () => mainWindow,
});

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
    if (mainWindow && !mainWindow.isDestroyed() && getLicenseState().ok) browserViewManager.ensureEmbedViews(mainWindow);
    dockOverlayWindow.update();
  });

  mainWindow.on('move', dockOverlayWindow.position);
  mainWindow.on('resize', dockOverlayWindow.position);
  mainWindow.on('maximize', dockOverlayWindow.position);
  mainWindow.on('unmaximize', dockOverlayWindow.position);

  mainWindow.on('closed', () => {
    const closedWindow = mainWindow;
    mainWindow = null;
    browserViewManager.handleMainWindowClosed(closedWindow);
    dockOverlayWindow.destroy();
  });
}

registerLicenseIpc({
  ipcMain,
  getLicenseState,
  activateLicense,
  clearLicense,
});

registerPlatformIpc({
  ipcMain,
  platforms,
  assertLicenseValid,
});

registerDashScopeIpc({
  ipcMain,
  assertLicenseValid,
  getQwenKeyStatus,
  qwenChatCompletion,
  qwenChatCompletionStream,
  saveDashScopeApiKeyToFile,
  clearDashScopeApiKeyFile,
});

registerPdfExportIpc({
  ipcMain,
  app,
  BrowserWindow,
  dialog,
  getMainWindow: () => mainWindow,
  assertLicenseValid,
  reportTemplateRegistry,
});

registerWindowIpc({
  ipcMain,
  assertLicenseValid,
  getMainWindow: () => mainWindow,
  browserViewManager,
  dockOverlayWindow,
});

registerCommercialIpc({
  ipcMain,
  app,
  assertLicenseValid,
  qwenChatCompletion,
  qwenChatCompletionStream,
  getQwenKeyStatus,
});

app.on('before-quit', () => {
  isAppQuitting = true;
  browserViewManager.removeEmbedViews();
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
