'use strict';

const path = require('path');
const { createReportHistoryStore } = require('../report-history');
const { writeDiagnosticPackage } = require('../diagnostics/diagnostic-package');
const { createProviderRegistry } = require('../ai-providers/provider-registry');
const { configPathFor, loadRemoteConfig } = require('../config/remote-config');
const { createEvidenceSearchProvider } = require('../evidence/evidence-search-provider');

function registerCommercialIpc({
  ipcMain,
  app,
  assertLicenseValid,
  qwenChatCompletion,
  qwenChatCompletionStream,
  getQwenKeyStatus,
}) {
  const history = createReportHistoryStore(path.join(app.getPath('userData'), 'report-history.json'));
  const remoteConfigPath = configPathFor(app.getPath('userData'));
  const providers = createProviderRegistry({
    qwenChatCompletion,
    qwenChatCompletionStream,
    getQwenKeyStatus,
  });
  const evidenceSearch = createEvidenceSearchProvider();

  ipcMain.handle('duoli:report-history-list', () => {
    assertLicenseValid();
    return { ok: true, items: history.list() };
  });

  ipcMain.handle('duoli:report-history-add', (_event, item = {}) => {
    assertLicenseValid();
    return { ok: true, item: history.add(item) };
  });

  ipcMain.handle('duoli:report-history-remove', (_event, { id } = {}) => {
    assertLicenseValid();
    return { ok: history.remove(String(id || '')) };
  });

  ipcMain.handle('duoli:diagnostic-package', (_event, data = {}) => {
    assertLicenseValid();
    const dir = path.join(app.getPath('documents'), `滤镜-诊断包-${Date.now()}`);
    const files = writeDiagnosticPackage(dir, {
      task: data.task || {},
      environment: {
        platform: process.platform,
        arch: process.arch,
        node: process.version,
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        userData: app.getPath('userData'),
      },
      structuredReport: data.structuredReport || {},
      log: data.log || '',
    });
    return { ok: true, dir, files };
  });

  ipcMain.handle('duoli:ai-providers', () => {
    assertLicenseValid();
    return { ok: true, providers: providers.list() };
  });

  ipcMain.handle('duoli:ai-provider-complete', async (_event, { providerId, prompt, options } = {}) => {
    assertLicenseValid();
    const value = String(prompt || '').trim();
    if (!value) return { ok: false, error: 'Prompt is empty.' };
    try {
      const result = await providers.complete(String(providerId || 'qwen'), value, options || {});
      return { ok: true, result };
    } catch (error) {
      return { ok: false, error: error && error.message ? error.message : String(error) };
    }
  });

  ipcMain.handle('duoli:remote-config', () => {
    assertLicenseValid();
    return { ok: true, config: loadRemoteConfig(remoteConfigPath), path: remoteConfigPath };
  });

  ipcMain.handle('duoli:evidence-search', async (_event, data = {}) => {
    assertLicenseValid();
    try {
      const result = await evidenceSearch.searchEvidence({
        question: data.question || '',
        taskType: data.taskType || '',
        queries: data.queries || [],
        limit: data.limit || 5,
      });
      return { ok: true, result };
    } catch (error) {
      return { ok: false, error: error && error.message ? error.message : String(error) };
    }
  });
}

module.exports = {
  registerCommercialIpc,
};
