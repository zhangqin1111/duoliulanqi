'use strict';

function registerDashScopeIpc({
  ipcMain,
  assertLicenseValid,
  getQwenKeyStatus,
  qwenChatCompletion,
  qwenChatCompletionStream,
  saveDashScopeApiKeyToFile,
  clearDashScopeApiKeyFile,
}) {
  ipcMain.handle('duoli:qwen-configured', () => {
    assertLicenseValid();
    return getQwenKeyStatus();
  });

  ipcMain.handle('duoli:save-dashscope-key', (_event, { key } = {}) => {
    assertLicenseValid();
    const value = String(key || '').trim();
    const status = () => getQwenKeyStatus();
    if (value.length < 8) {
      return { saveOk: false, error: 'API key is too short.', ...status() };
    }
    try {
      saveDashScopeApiKeyToFile(value);
      return { saveOk: true, ...status() };
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      return { saveOk: false, error: message, ...status() };
    }
  });

  ipcMain.handle('duoli:clear-dashscope-key-file', () => {
    assertLicenseValid();
    try {
      clearDashScopeApiKeyFile();
    } catch (error) {
      /* ignore */
    }
    return getQwenKeyStatus();
  });

  ipcMain.handle('duoli:qwen-complete', async (_event, { prompt, options } = {}) => {
    assertLicenseValid();
    const value = String(prompt || '').trim();
    if (!value) {
      return { ok: false, error: 'Prompt is empty.' };
    }
    try {
      const text = await qwenChatCompletion(value, options || {});
      return { ok: true, text };
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      return { ok: false, error: message };
    }
  });

  ipcMain.handle('duoli:qwen-stream', async (event, { prompt, reqId, options } = {}) => {
    assertLicenseValid();
    const value = String(prompt || '').trim();
    if (!value) return { ok: false, error: 'Prompt is empty.' };
    const sender = event.sender;
    try {
      const text = await qwenChatCompletionStream(
        value,
        (delta) => {
          if (!sender.isDestroyed()) {
            sender.send('duoli:qwen-stream-chunk', { reqId, delta });
          }
        },
        options || {}
      );
      return { ok: true, text };
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      return { ok: false, error: message };
    }
  });
}

module.exports = {
  registerDashScopeIpc,
};
