(function attachAnalysisOrchestrator(global) {
  function createAnalysisOrchestrator(deps) {
    async function runCompareAndSummarize(question, opt) {
      const summaryBodyEl = deps.getSummaryBodyEl();
      if (!summaryBodyEl) return;

      if (!deps.isQwenApiOk()) {
        summaryBodyEl.textContent =
          '未配置千问 API。请点击左侧「API 密钥设置」保存 DashScope Key，或设置环境变量后重启应用。';
        deps.refreshComparePanel();
        deps.setSummaryStatus('未配置 API Key。');
        return;
      }

      const resultsPreloaded = opt && Array.isArray(opt.results);
      if (!resultsPreloaded) {
        summaryBodyEl.textContent =
          '等待三站流式输出结束后，再用千问生成对比（见上文说明）…';
        deps.setSummaryStatus('三模型并发提问中…');
      }

      try {
        await deps.runTruthSeekingAnalysis(question, opt || {});
        deps.setSummaryStatus('去伪存真闭环已完成。');
      } catch (error) {
        const msg = error && error.message ? error.message : String(error);
        summaryBodyEl.textContent = `去伪存真分析失败：${msg}`;
        deps.refreshComparePanel();
        deps.setSummaryStatus(msg);
      }
    }

    return {
      runCompareAndSummarize,
    };
  }

  global.DuoliAnalysisOrchestrator = {
    createAnalysisOrchestrator,
  };
})(window);
