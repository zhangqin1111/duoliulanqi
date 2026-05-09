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

    function formatTime(value) {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    function renderHistory(items) {
      const listEl = $('#settings-history-list');
      if (!listEl) return;
      listEl.textContent = '';
      const rows = Array.isArray(items) ? items : [];
      if (!rows.length) {
        const empty = document.createElement('div');
        empty.className = 'settings-history__empty';
        empty.textContent = '暂无导出记录。完成一次报告导出后，这里会自动出现历史。';
        listEl.appendChild(empty);
        return;
      }

      rows.slice(0, 8).forEach((item) => {
        const row = document.createElement('article');
        row.className = 'settings-history__item';

        const main = document.createElement('div');
        const title = document.createElement('p');
        title.className = 'settings-history__title';
        title.textContent = item.question || '未命名报告';
        const meta = document.createElement('p');
        meta.className = 'settings-history__meta';
        meta.textContent = `${formatTime(item.createdAt)} · ${item.taskType || 'general'} · ${item.reportPath || '未记录路径'}`;
        main.append(title, meta);

        const actions = document.createElement('div');
        actions.className = 'settings-history__actions';
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'ghost';
        copyBtn.textContent = '复制路径';
        copyBtn.addEventListener('click', async () => {
          const text = item.reportPath || item.structuredPath || '';
          if (!text) return;
          try {
            await navigator.clipboard.writeText(text);
            copyBtn.textContent = '已复制';
            setTimeout(() => {
              copyBtn.textContent = '复制路径';
            }, 1200);
          } catch (error) {
            copyBtn.textContent = '复制失败';
          }
        });

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'ghost';
        removeBtn.textContent = '移除';
        removeBtn.addEventListener('click', async () => {
          const api = getApi();
          if (!api || typeof api.removeReportHistory !== 'function') return;
          await api.removeReportHistory(item.id);
          await refreshHistory();
        });

        actions.append(copyBtn, removeBtn);
        row.append(main, actions);
        listEl.appendChild(row);
      });
    }

    async function refreshHistory() {
      const api = getApi();
      const listEl = $('#settings-history-list');
      if (!api || typeof api.listReportHistory !== 'function') {
        renderHistory([]);
        return;
      }
      if (listEl) listEl.textContent = '正在读取报告历史...';
      try {
        const result = await api.listReportHistory();
        renderHistory(result && result.ok ? result.items : []);
      } catch (error) {
        if (listEl) {
          listEl.textContent = error && error.message ? error.message : String(error);
        }
      }
    }

    function renderProviderStatus(providers, remoteConfig) {
      const listEl = $('#settings-provider-list');
      if (!listEl) return;
      listEl.textContent = '';

      const rows = Array.isArray(providers) ? providers : [];
      rows.forEach((provider) => {
        const row = document.createElement('article');
        row.className = 'settings-history__item';
        const main = document.createElement('div');
        const title = document.createElement('p');
        title.className = 'settings-history__title';
        title.textContent = `${provider.label || provider.id} · ${provider.model || 'default'}`;
        const status = provider.status || {};
        const meta = document.createElement('p');
        meta.className = 'settings-history__meta';
        meta.textContent = status.ok
          ? `已配置 · ${status.source || 'runtime'}`
          : `未配置 · ${status.env || status.source || 'missing key'}`;
        main.append(title, meta);

        const badge = document.createElement('span');
        badge.className = status.ok ? 'provider-badge provider-badge--ok' : 'provider-badge';
        badge.textContent = status.ok ? '可用' : '待配置';
        row.append(main, badge);
        listEl.appendChild(row);
      });

      const configRow = document.createElement('article');
      configRow.className = 'settings-history__item';
      const configMain = document.createElement('div');
      const configTitle = document.createElement('p');
      configTitle.className = 'settings-history__title';
      configTitle.textContent = '远程配置';
      const configMeta = document.createElement('p');
      configMeta.className = 'settings-history__meta';
      const config = remoteConfig && remoteConfig.config ? remoteConfig.config : {};
      configMeta.textContent = `版本 ${config.version || 'local'} · 工作流 ${Object.keys(config.workflows || {}).length} · Provider ${Object.keys(config.providers || {}).length}`;
      configMain.append(configTitle, configMeta);
      const configBadge = document.createElement('span');
      configBadge.className = 'provider-badge provider-badge--ok';
      configBadge.textContent = '已读取';
      configRow.append(configMain, configBadge);
      listEl.appendChild(configRow);
    }

    async function refreshProviderStatus() {
      const api = getApi();
      const listEl = $('#settings-provider-list');
      if (!api || typeof api.listAiProviders !== 'function') {
        if (listEl) listEl.textContent = '当前环境不支持模型底座检测。';
        return;
      }
      if (listEl) listEl.textContent = '正在检测模型底座...';
      try {
        const [providerResult, configResult] = await Promise.all([
          api.listAiProviders(),
          typeof api.getRemoteConfig === 'function' ? api.getRemoteConfig() : Promise.resolve(null),
        ]);
        renderProviderStatus(
          providerResult && providerResult.ok ? providerResult.providers : [],
          configResult && configResult.ok ? configResult : null
        );
      } catch (error) {
        if (listEl) {
          listEl.textContent = error && error.message ? error.message : String(error);
        }
      }
    }

    async function exportDiagnosticPackage() {
      const api = getApi();
      const btn = $('#settings-diagnostic-export');
      if (!api || typeof api.exportDiagnosticPackage !== 'function') return;
      const oldText = btn ? btn.textContent : '';
      if (btn) {
        btn.disabled = true;
        btn.textContent = '导出中...';
      }
      try {
        const result = await api.exportDiagnosticPackage({
          task: { source: 'settings-panel', createdAt: new Date().toISOString() },
          log: navigator.userAgent || '',
        });
        if (btn) btn.textContent = result && result.ok ? '已导出' : '导出失败';
      } catch (error) {
        if (btn) btn.textContent = '导出失败';
      } finally {
        setTimeout(() => {
          if (btn) {
            btn.disabled = false;
            btn.textContent = oldText || '导出诊断包';
          }
        }, 1800);
      }
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
          await Promise.all([refreshHistory(), refreshProviderStatus()]);
        } else {
          collapsePanel();
        }
      });

      $('#settings-close')?.addEventListener('click', () => collapsePanel());
      $('#settings-history-refresh')?.addEventListener('click', () => refreshHistory());
      $('#settings-provider-refresh')?.addEventListener('click', () => refreshProviderStatus());
      $('#settings-diagnostic-export')?.addEventListener('click', () => exportDiagnosticPackage());

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
