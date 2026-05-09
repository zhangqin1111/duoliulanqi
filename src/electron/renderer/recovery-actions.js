(function attachRecoveryActions(global) {
  const ACTIONS = {
    retry_stage: 'retry_stage',
    skip_failed_model: 'skip_failed_model',
    generate_with_current_materials: 'generate_with_current_materials',
    export_diagnostics: 'export_diagnostics',
  };

  function actionsForFailure(context) {
    const data = context || {};
    const actions = [];
    if (data.failedStage) {
      actions.push({
        id: ACTIONS.retry_stage,
        label: '重试当前阶段',
        reason: `当前失败阶段：${data.failedStage}`,
      });
    }
    if (data.failedModels && data.failedModels.length) {
      actions.push({
        id: ACTIONS.skip_failed_model,
        label: '跳过失败模型',
        reason: `失败模型：${data.failedModels.join('、')}`,
      });
    }
    if (data.hasCurrentMaterials) {
      actions.push({
        id: ACTIONS.generate_with_current_materials,
        label: '用当前材料生成报告',
        reason: '已有部分模型回复或阶段结果可用于生成降级报告。',
      });
    }
    actions.push({
      id: ACTIONS.export_diagnostics,
      label: '导出诊断信息',
      reason: '用于定位超时、验证码、API 或 PDF 导出问题。',
    });
    return actions;
  }

  const api = {
    ACTIONS,
    actionsForFailure,
  };

  global.DuoliRecoveryActions = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
