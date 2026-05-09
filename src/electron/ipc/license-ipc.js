'use strict';

function registerLicenseIpc({ ipcMain, getLicenseState, activateLicense, clearLicense }) {
  ipcMain.handle('duoli:get-license-state', () => getLicenseState());
  ipcMain.handle('duoli:activate-license', (_event, { token } = {}) => activateLicense(token));
  ipcMain.handle('duoli:clear-license', () => clearLicense());
}

function registerPlatformIpc({ ipcMain, platforms, assertLicenseValid }) {
  ipcMain.handle('duoli:get-platforms', () => {
    assertLicenseValid();
    return platforms.map((platform) => ({ ...platform }));
  });
}

module.exports = {
  registerLicenseIpc,
  registerPlatformIpc,
};
