(function attachQwenSettings(global) {
  function createQwenSettingsController(deps) {
    function $(sel) {
      return document.querySelector(sel);
    }

    function getApi() {
      return deps.getApi ? deps.getApi() : deps.api;
    }

    function applyStatus(qc) {
      const st = qc || {};
      const ok = !!st.ok;
      const compareButton = deps.getCompareButton ? deps.getCompareButton() : null;
      const settingsKeySourceEl = deps.getKeySourceEl ? deps.getKeySourceEl() : null;
      if (compareButton) compareButton.disabled = !ok;
      if (settingsKeySourceEl) {
        if (st.source === 'env') {
          settingsKeySourceEl.textContent =
            '当前使用：环境变量（DUOLI_DASHSCOPE_API_KEY / DASHSCOPE_API_KEY），优先级高于本地文件。';
        } else if (st.source === 'file') {
          settingsKeySourceEl.textContent = '当前使用：本地已保存的密钥文件。';
        } else {
          settingsKeySourceEl.textContent = '当前未配置可用密钥：请粘贴 DashScope API Key 并保存。';
        }
      }
      if (typeof deps.onStatusChange === 'function') deps.onStatusChange(ok, st);
      return ok;
    }

    function collapsePanel() {
      const settingsPanel = deps.getSettingsPanel ? deps.getSettingsPanel() : null;
      const settingsButton = deps.getSettingsButton ? deps.getSettingsButton() : null;
      if (settingsPanel) settingsPanel.setAttribute('hidden', '');
      if (settingsButton) settingsButton.setAttribute('aria-expanded', 'false');
    }

    function wire() {
      const settingsPanel = deps.getSettingsPanel ? deps.getSettingsPanel() : null;
      const settingsButton = deps.getSettingsButton ? deps.getSettingsButton() : null;
      const dashscopeKeyInput = deps.getDashscopeInput ? deps.getDashscopeInput() : null;
      const settingsMsgEl = deps.getMessageEl ? deps.getMessageEl() : null;
      if (!settingsPanel || !settingsButton || settingsPanel.dataset.wired === '1') return;
      settingsPanel.dataset.wired = '1';

      settingsButton.setAttribute('aria-expanded', 'false');
      settingsButton.setAttribute('aria-controls', 'settings-panel');

      settingsButton.addEventListener('click', async () => {
        const api = getApi();
        const willOpen = settingsPanel.hasAttribute('hidden');
        if (willOpen) {
          try {
            if (typeof api.getQwenConfigured === 'function') {
              applyStatus(await api.getQwenConfigured());
            }
          } catch (e) {
            applyStatus({ ok: false, source: 'none' });
          }
          if (dashscopeKeyInput) dashscopeKeyInput.value = '';
          if (settingsMsgEl) {
            settingsMsgEl.textContent = '';
            settingsMsgEl.classList.remove('err');
          }
          settingsPanel.removeAttribute('hidden');
          settingsButton.setAttribute('aria-expanded', 'true');
        } else {
          collapsePanel();
        }
      });

      $('#settings-close')?.addEventListener('click', () => collapsePanel());

      $('#settings-save')?.addEventListener('click', async () => {
        const api = getApi();
        if (!settingsMsgEl || !dashscopeKeyInput) return;
        const value = dashscopeKeyInput.value.trim();
        settingsMsgEl.classList.remove('err');
        if (typeof api.saveDashScopeKey !== 'function') {
          settingsMsgEl.textContent = '当前环境不支持保存密钥。';
          settingsMsgEl.classList.add('err');
          return;
        }
        try {
          const result = await api.saveDashScopeKey(value);
          applyStatus(result);
          if (result.saveOk) {
            settingsMsgEl.textContent = '已保存到本机。';
            dashscopeKeyInput.value = '';
          } else {
            settingsMsgEl.textContent = result.error || '保存失败';
            settingsMsgEl.classList.add('err');
          }
        } catch (error) {
          settingsMsgEl.textContent = error && error.message ? error.message : String(error);
          settingsMsgEl.classList.add('err');
        }
      });

      $('#settings-clear')?.addEventListener('click', async () => {
        if (
          !confirm(
            '确定清除本地保存的密钥文件？\n（若设置了环境变量，清除文件后仍会使用环境变量中的密钥。）'
          )
        ) {
          return;
        }
        const api = getApi();
        if (!settingsMsgEl || typeof api.clearDashScopeKeyFile !== 'function') return;
        settingsMsgEl.classList.remove('err');
        try {
          const result = await api.clearDashScopeKeyFile();
          applyStatus(result);
          if (result.source === 'env') {
            settingsMsgEl.textContent = '已删除本地文件，当前仍使用环境变量中的密钥。';
          } else if (result.ok) {
            settingsMsgEl.textContent = '状态已更新。';
          } else {
            settingsMsgEl.textContent = '已清除本地文件。请保存新密钥或设置环境变量。';
          }
        } catch (error) {
          settingsMsgEl.textContent = error && error.message ? error.message : String(error);
          settingsMsgEl.classList.add('err');
        }
      });
    }

    return {
      applyStatus,
      collapsePanel,
      wire,
    };
  }

  global.DuoliQwenSettings = {
    createQwenSettingsController,
  };
})(window);
