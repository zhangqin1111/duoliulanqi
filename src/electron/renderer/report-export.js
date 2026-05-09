(function attachReportExport(global) {
  function createReportExporter(deps) {
    function wire() {
      const btn = deps.getButton ? deps.getButton() : document.getElementById('btnExportPdf');
      if (!btn) return;
      btn.addEventListener('click', async () => {
        const summaryText = deps.getSummaryText ? deps.getSummaryText() : '';
        if (!summaryText || summaryText.startsWith('点击“对比”')) {
          btn.textContent = '暂无内容';
          setTimeout(() => {
            btn.textContent = '导出情报报告';
          }, 1500);
          return;
        }
        btn.disabled = true;
        btn.textContent = '生成中…';
        try {
          const api = deps.getApi ? deps.getApi() : deps.api;
          const payload =
            typeof deps.buildReportPayload === 'function'
              ? deps.buildReportPayload(deps.getQuestionText ? deps.getQuestionText() : '')
              : null;
          if (!payload) {
            throw new Error('报告数据为空，无法导出。');
          }
          const result = await api.exportPdf(payload);
          if (result && result.ok) {
            if (api && typeof api.addReportHistory === 'function') {
              api.addReportHistory({
                question: payload.question || '',
                taskType:
                  (payload.structuredReport && payload.structuredReport.meta && payload.structuredReport.meta.task_type) ||
                  (payload.taskRoute && payload.taskRoute.task_type) ||
                  'general_compare',
                models: (payload.rawReplies || []).map((reply) => reply.name || reply.model).filter(Boolean),
                reportPath: result.filePath,
                structuredPath: result.structuredPath || '',
                status: 'exported',
              }).catch(() => null);
            }
            btn.textContent = '✓ 已保存';
          } else if (result && result.error === 'canceled') {
            btn.textContent = '导出情报报告';
          } else {
            btn.textContent = `失败：${(result && result.error) || '未知'}`;
          }
        } catch (error) {
          btn.textContent = `失败：${error.message || error}`;
        } finally {
          setTimeout(() => {
            btn.disabled = false;
            btn.textContent = '导出情报报告';
          }, 2500);
        }
      });
    }

    return { wire };
  }

  global.DuoliReportExport = {
    createReportExporter,
  };
})(window);
