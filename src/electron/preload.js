/**
 * 仅依赖 electron，避免 require 业务模块失败导致整段 preload 不执行、window.duoliulan 为空。
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('duoliulan', {
  getLicenseState: () => ipcRenderer.invoke('duoli:get-license-state'),
  activateLicense: (token) => ipcRenderer.invoke('duoli:activate-license', { token }),
  clearLicense: () => ipcRenderer.invoke('duoli:clear-license'),
  ensureEmbedViews: () => ipcRenderer.invoke('duoli:ensure-embed-views'),
  getPlatforms: () => ipcRenderer.invoke('duoli:get-platforms'),
  getQwenConfigured: () => ipcRenderer.invoke('duoli:qwen-configured'),
  saveDashScopeKey: (key) => ipcRenderer.invoke('duoli:save-dashscope-key', { key }),
  clearDashScopeKeyFile: () => ipcRenderer.invoke('duoli:clear-dashscope-key-file'),
  qwenComplete: (prompt) => ipcRenderer.invoke('duoli:qwen-complete', { prompt }),
  exportPdf: (payload) => ipcRenderer.invoke('duoli:export-pdf', payload),
  // 流式千问：返回 Promise<{ok,text,error}>，过程中 onChunk(delta) 实时回调
  qwenStream: (prompt, onChunk) => {
    const reqId = `qs_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const off = (_e, msg) => { if (msg.reqId === reqId && onChunk) onChunk(msg.delta); };
    ipcRenderer.on('duoli:qwen-stream-chunk', off);
    return ipcRenderer.invoke('duoli:qwen-stream', { prompt, reqId }).finally(() => {
      ipcRenderer.removeListener('duoli:qwen-stream-chunk', off);
    });
  },
  reportEmbedBounds: (slots) => ipcRenderer.send('embed:bounds', slots),
  getEmbedHosts: () => ipcRenderer.invoke('duoli:get-embed-hosts'),
  popoutGuest: (id, bounds) => ipcRenderer.invoke('embed:popout', { id, bounds }),
  redockGuest: (id) => ipcRenderer.invoke('embed:redock', { id }),
  guestExec: (id, code) => ipcRenderer.invoke('embed:exec', { id, code }),
  reloadGuest: (id) => ipcRenderer.invoke('embed:reload', id ? { id } : {}),
  onEmbedEvent: (fn) => {
    const ch = (_e, payload) => fn(payload);
    ipcRenderer.on('embed:event', ch);
    return () => ipcRenderer.removeListener('embed:event', ch);
  },
});
