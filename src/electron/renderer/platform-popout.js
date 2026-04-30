(function attachPlatformPopout(global) {
  function createPlatformPopoutController(deps) {
    function applyHostMode(id, host) {
      if (!id) return;
      const state = deps.getPlatformVisibility();
      if (!state[id]) state[id] = { mode: 'visible' };
      const nextMode = host === 'detached' ? 'detached' : 'visible';
      if (state[id].mode === 'closed') return;
      if (state[id].mode === 'collapsed' && nextMode === 'visible') return;
      state[id].mode = nextMode;
    }

    function ensurePopoutButtons() {
      deps.getPlatforms().forEach((cfg) => {
        const controls = document.querySelector(`.embed-col[data-id="${cfg.id}"] .embed-controls`);
        if (!controls || controls.querySelector(`[data-popout="${cfg.id}"]`)) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'icon-btn';
        btn.setAttribute('data-popout', cfg.id);
        btn.setAttribute('aria-label', `弹出 ${cfg.name}`);
        btn.innerHTML = '&#8599;';
        const collapseBtn = controls.querySelector(`[data-collapse="${cfg.id}"]`);
        controls.insertBefore(btn, collapseBtn || controls.firstChild);
      });
    }

    async function popoutPlatform(id, bounds) {
      const api = deps.getApi();
      if (!id || !api || typeof api.popoutGuest !== 'function') return;
      try {
        await api.popoutGuest(id, bounds || {});
        deps.setPlatformMode(id, 'detached');
        deps.setStatus(`已将 ${id} 弹出为独立窗口，可拖到其他屏幕。`);
      } catch (error) {
        deps.setStatus(`弹出失败：${error.message || error}`);
      }
    }

    async function redockPlatform(id) {
      const api = deps.getApi();
      if (!id || !api || typeof api.redockGuest !== 'function') return;
      try {
        await api.redockGuest(id);
        deps.setPlatformMode(id, 'visible');
        deps.setStatus(`已将 ${id} 收回到主工作台。`);
      } catch (error) {
        deps.setStatus(`收回失败：${error.message || error}`);
      }
    }

    return {
      applyHostMode,
      ensurePopoutButtons,
      popoutPlatform,
      redockPlatform,
    };
  }

  global.DuoliPlatformPopout = {
    createPlatformPopoutController,
  };
})(window);
