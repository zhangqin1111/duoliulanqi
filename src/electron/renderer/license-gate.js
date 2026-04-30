(function attachLicenseGate(global) {
  function createLicenseGate(deps) {
    function getApi() {
      return deps.getApi ? deps.getApi() : deps.api;
    }

    function formatLicenseTime(value) {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return date.toLocaleString('zh-CN', { hour12: false });
    }

    function setLocked(locked) {
      document.body.classList.toggle('is-license-locked', !!locked);
      const licenseGateEl = deps.getLicenseGateEl ? deps.getLicenseGateEl() : null;
      if (!licenseGateEl) return;
      if (locked) {
        licenseGateEl.removeAttribute('hidden');
      } else {
        licenseGateEl.setAttribute('hidden', '');
      }
    }

    function renderState(state) {
      const current = state || { ok: false, message: '请先输入应用密钥。' };
      const licenseStateTextEl = deps.getLicenseStateTextEl ? deps.getLicenseStateTextEl() : null;
      const licenseExpiryTextEl = deps.getLicenseExpiryTextEl ? deps.getLicenseExpiryTextEl() : null;
      if (licenseStateTextEl) {
        licenseStateTextEl.textContent = current.message || (current.ok ? '应用密钥有效。' : '请先输入应用密钥。');
      }
      if (licenseExpiryTextEl) {
        if (current.ok) {
          const timeText = formatLicenseTime(current.expiresAt);
          const daysText = Number.isFinite(current.daysLeft) ? `，剩余 ${current.daysLeft} 天` : '';
          licenseExpiryTextEl.textContent = timeText ? `到期时间：${timeText}${daysText}` : '';
          licenseExpiryTextEl.classList.remove('err');
        } else {
          licenseExpiryTextEl.textContent = current.code === 'clock-rollback' ? '系统时间异常时，应用会拒绝继续使用。' : '';
          licenseExpiryTextEl.classList.toggle('err', current.code === 'clock-rollback');
        }
      }
      setLocked(!current.ok);
    }

    async function syncState() {
      const api = getApi();
      if (!api || typeof api.getLicenseState !== 'function') {
        const fallback = { ok: false, code: 'unsupported', message: '当前环境不支持应用密钥校验。' };
        renderState(fallback);
        return fallback;
      }
      const state = await api.getLicenseState();
      renderState(state);
      return state;
    }

    function wire() {
      const licenseGateEl = deps.getLicenseGateEl ? deps.getLicenseGateEl() : null;
      const btnActivateLicense = deps.getActivateButton ? deps.getActivateButton() : null;
      const btnClearLicense = deps.getClearButton ? deps.getClearButton() : null;
      const licenseTokenInputEl = deps.getTokenInput ? deps.getTokenInput() : null;
      const licenseMsgEl = deps.getMessageEl ? deps.getMessageEl() : null;
      if (!licenseGateEl || licenseGateEl.dataset.wired === '1') return;
      licenseGateEl.dataset.wired = '1';

      if (btnActivateLicense) {
        btnActivateLicense.addEventListener('click', async () => {
          const api = getApi();
          if (!api || typeof api.activateLicense !== 'function' || !licenseTokenInputEl) return;
          if (licenseMsgEl) {
            licenseMsgEl.textContent = '';
            licenseMsgEl.classList.remove('err');
          }
          btnActivateLicense.disabled = true;
          try {
            const state = await api.activateLicense(licenseTokenInputEl.value.trim());
            renderState(state);
            if (state.ok) {
              if (licenseMsgEl) licenseMsgEl.textContent = '应用密钥已生效，正在解锁工作台。';
              licenseTokenInputEl.value = '';
              if (typeof api.ensureEmbedViews === 'function') {
                await api.ensureEmbedViews();
              }
              if (typeof deps.ensureWorkbenchBoot === 'function') {
                await deps.ensureWorkbenchBoot();
              }
            } else if (licenseMsgEl) {
              licenseMsgEl.textContent = state.message || '应用密钥校验失败。';
              licenseMsgEl.classList.add('err');
            }
          } catch (error) {
            if (licenseMsgEl) {
              licenseMsgEl.textContent = error && error.message ? error.message : String(error);
              licenseMsgEl.classList.add('err');
            }
          } finally {
            btnActivateLicense.disabled = false;
          }
        });
      }

      if (btnClearLicense) {
        btnClearLicense.addEventListener('click', async () => {
          const api = getApi();
          if (!api || typeof api.clearLicense !== 'function') return;
          const state = await api.clearLicense();
          renderState(state);
          if (licenseTokenInputEl) licenseTokenInputEl.value = '';
          if (licenseMsgEl) {
            licenseMsgEl.textContent = '已清除本机应用密钥。';
            licenseMsgEl.classList.remove('err');
          }
        });
      }
    }

    return {
      renderState,
      setLocked,
      syncState,
      wire,
    };
  }

  global.DuoliLicenseGate = {
    createLicenseGate,
  };
})(window);
