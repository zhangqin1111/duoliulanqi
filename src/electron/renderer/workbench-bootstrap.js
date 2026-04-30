(function attachWorkbenchBootstrap(global) {
  function createWorkbenchBootstrap(deps) {
    let booted = false;

    async function ensureWorkbenchBoot() {
      if (booted) return true;

      const api = deps.getApi();
      try {
        deps.setPlatforms(await api.getPlatforms());
      } catch (error) {
        deps.setStatus(`读取站点配置失败：${error && error.message ? error.message : error}`);
        return false;
      }

      if (!deps.hasPlatforms()) {
        deps.setStatus('站点配置为空。');
        return false;
      }

      deps.renderPlatformScaffold();
      deps.wireUi();
      deps.wireSettings();
      deps.wireExportPdf();
      await deps.syncEmbedHosts();

      try {
        if (typeof api.getQwenConfigured === 'function') {
          deps.applyQwenStatus(await api.getQwenConfigured());
        }
      } catch (error) {
        deps.applyQwenStatus({ ok: false, source: 'none' });
      }

      if (!deps.isQwenApiOk()) {
        deps.setSummaryStatus('未配置千问 API：请先在左侧 API 设置里保存 DashScope Key。');
      }

      deps.schedulePushBounds();
      setTimeout(deps.schedulePushBounds, 100);
      setTimeout(deps.schedulePushBounds, 500);
      booted = true;
      return true;
    }

    async function boot() {
      const api = deps.getBridge();
      deps.setApi(api);

      if (!api || typeof api.getPlatforms !== 'function') {
        deps.setStatus('未检测到 Electron 桥接，请在项目目录运行 npm start。');
        return;
      }

      deps.wireLicenseGate();

      try {
        const licenseState = await deps.syncLicenseState();
        if (!licenseState.ok) {
          deps.setStatus('请先输入应用密钥后再使用。');
          return;
        }
      } catch (error) {
        deps.setStatus(`应用密钥校验失败：${error && error.message ? error.message : error}`);
        deps.setLicenseLocked(true);
        return;
      }

      await ensureWorkbenchBoot();
    }

    return {
      boot,
      ensureWorkbenchBoot,
    };
  }

  global.DuoliWorkbenchBootstrap = {
    createWorkbenchBootstrap,
  };
})(window);
