(function attachStatusPresenter(global) {
  function createStatusPresenter(deps) {
    function setStatus(text) {
      const el = deps.getStatusEl();
      if (el) el.textContent = text || '';
    }

    function setColStatus(id, text, cls) {
      const el = document.querySelector(`[data-status="${id}"]`);
      const body = document.querySelector(`[data-body="${id}"]`);
      if (el) {
        el.textContent = text;
        el.className = 'col-status' + (cls ? ` ${cls}` : '');
      }
      if (body && !cls) body.textContent = '';

      const mirror = deps.getMirrorEl(id);
      if (mirror && !cls) {
        const platformName = deps.chatPlatforms().find((cfg) => cfg.id === id)?.name || id;
        mirror.textContent = `等待 ${platformName} 返回内容…`;
      }
    }

    function setColBody(id, text) {
      const body = document.querySelector(`[data-body="${id}"]`);
      if (body) body.textContent = text || '';
      const mirror = deps.getMirrorEl(id);
      if (mirror) mirror.textContent = text || '发送后将在这里同步展示模型回复。';
      try {
        deps.refreshComparePanel();
      } catch (error) {
        console.warn('[duoli] refreshComparePanel failed in setColBody', error);
      }
      deps.scrollThreadToBottom();
    }

    function setSummaryStatus(text) {
      const el = deps.getSummaryStatusEl();
      if (el) el.textContent = text || '';
      try {
        deps.refreshComparePanel();
      } catch (error) {
        console.warn('[duoli] refreshComparePanel failed in setSummaryStatus', error);
      }
    }

    function setBusy(busy) {
      const btnSend = deps.getSendButton();
      const btnCompare = deps.getCompareButton();
      const btnReload = deps.getReloadButton();
      const btnSettings = deps.getSettingsButton();
      if (btnSend) {
        btnSend.disabled = busy;
        btnSend.classList.toggle('is-busy', !!busy);
      }
      if (btnCompare) btnCompare.disabled = busy || !deps.isQwenApiOk();
      if (btnReload) btnReload.disabled = busy;
      if (btnSettings) btnSettings.disabled = busy;
    }

    return {
      setBusy,
      setColBody,
      setColStatus,
      setStatus,
      setSummaryStatus,
    };
  }

  global.DuoliStatusPresenter = {
    createStatusPresenter,
  };
})(window);
