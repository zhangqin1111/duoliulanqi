(function attachAnalysisOrchestrator(global) {
  function createAnalysisOrchestrator(deps) {
    async function runCompareAndSummarize(question, opt) {
      const summaryBodyEl = deps.getSummaryBodyEl();
      if (!summaryBodyEl) return;

      if (false && !deps.isQwenApiOk()) {
        summaryBodyEl.textContent =
          '未配置千问 API。请点击左侧「API 密钥设置」保存 DashScope Key，或设置环境变量后重启应用。';
        if (typeof deps.failFlowStage === 'function') {
          deps.failFlowStage('report', '未配置 DashScope Key，无法生成结构化对比报告。');
        }
        if (typeof deps.showCompareReadyCard === 'function') {
          deps.showCompareReadyCard({
            title: '情报报告暂不可生成',
            detail: '还没有配置 DashScope Key。配置后我会继续生成事实黑匣子报告；当前可以先查看已收集的模型原始回答。',
            buttonText: '查看当前材料',
            tone: 'error',
          });
        }
        deps.refreshComparePanel();
        deps.setSummaryStatus('未配置 API Key。');
        return;
      }

      const resultsPreloaded = opt && Array.isArray(opt.results);
      if (!resultsPreloaded) {
        summaryBodyEl.textContent =
          '等待三站流式输出结束后，再用千问生成对比（见上文说明）…';
        if (typeof deps.setFlowStage === 'function') {
          deps.setFlowStage('dispatch', '正在分发给多个 AI', '多个 AI 正在并行作答，系统会等待回复稳定。', 'active');
        }
        deps.setSummaryStatus('三模型并发提问中…');
      }

      try {
        await deps.runTruthSeekingAnalysis(question, opt || {});
        deps.setSummaryStatus('去伪存真闭环已完成。');
      } catch (error) {
        const msg = error && error.message ? error.message : String(error);
        summaryBodyEl.textContent = `去伪存真分析失败：${msg}`;
        if (typeof deps.failFlowStage === 'function') {
          deps.failFlowStage('report', `流程中断：${msg}`);
        }
        if (typeof deps.showCompareReadyCard === 'function') {
          const recoveryActions =
            global.DuoliRecoveryActions && typeof global.DuoliRecoveryActions.actionsForFailure === 'function'
              ? global.DuoliRecoveryActions.actionsForFailure({
                  failedStage: 'reporting',
                  failedModels: [],
                  hasCurrentMaterials: true,
                })
              : [];
          deps.showCompareReadyCard({
            title: '去伪存真闭环被中断',
            detail: `流程中的某个分析环节遇到问题：${msg}。你仍然可以打开当前材料，查看已完成的多模型回答、差异记录和已完成阶段。`,
            buttonText: '查看当前材料',
            tone: 'error',
            actions: recoveryActions,
          });
        }
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
