'use strict';

const factTemplate = require('../fact-template');
const {
  appendUnique,
  injectBeforeEvidenceGrid,
  renderScenarioCard,
  renderScenarioList,
  renderScenarioShell,
  withMeta,
} = require('./scenario-template-utils');

function buildTechnicalReport(report) {
  const data = withMeta(report, 'technical_diagnosis', 'technical_diagnosis_v1');
  data.scenario_decision = {
    ...(data.scenario_decision || {}),
    task_type: 'technical_diagnosis',
    task_label: (data.scenario_decision && data.scenario_decision.task_label) || '技术诊断',
    evidence_standard:
      (data.scenario_decision && data.scenario_decision.evidence_standard) ||
      '优先采信错误日志、复现步骤、环境版本、官方文档和可执行验证结果；未验证推测必须进入候选根因而非结论。',
  };
  data.final_actions = appendUnique(data.final_actions, ['按优先级执行修复', '补充回归验证清单', '记录复现环境']);
  data.user_issue_analysis = {
    ...(data.user_issue_analysis || {}),
    key_findings: appendUnique(data.user_issue_analysis && data.user_issue_analysis.key_findings, [
      '技术报告必须优先给出第一步排查动作。',
      '根因、修复、验证和回归风险必须分开呈现。',
    ]),
  };
  return data;
}

function renderTechnicalRunbook(report) {
  const decision = report.scenario_decision || {};
  const issue = report.user_issue_analysis || {};
  const diagnosis = report.source_diagnosis || {};
  return renderScenarioShell({
    eyebrow: 'TECHNICAL RUNBOOK',
    title: '技术排障台',
    subtitle: '把“可能原因”压缩成可复现、可修复、可验证的工程动作，避免模型只给泛泛建议。',
    children: `
      ${renderScenarioCard(
        '第一步动作',
        'Step 01',
        decision.recommended_action || issue.direct_answer || '先固定复现环境、收集日志与版本，再执行最小变更验证。',
        ['可复现', '小步修复', '可回滚']
      )}
      ${renderScenarioList('候选根因', 'Root Cause', diagnosis.root_causes, [
        { title: '环境差异', body: '版本、权限、路径、编码、网络和系统策略可能导致行为不一致。' },
        { title: '流程断点', body: '异步超时、状态未刷新、IPC 未返回或 UI 事件未绑定。' },
        { title: '数据形态', body: '输入为空、结构不一致或 JSON 修复失败会污染后续报告。' },
      ])}
      ${renderScenarioList('验证清单', 'Verify', report.final_actions, [
        { title: '复现前置', body: '记录系统、版本、配置和输入样例。' },
        { title: '修复验证', body: '跑最小检查脚本并保留日志。' },
        { title: '回归验证', body: '覆盖成功、失败、超时和重试路径。' },
      ])}
      ${renderScenarioCard(
        '风险边界',
        'Guardrail',
        '所有未复现结论只作为候选；只有能被日志、脚本或用户操作复验的内容才能进入最终裁决。',
        [decision.evidence_standard || '证据优先', '不把猜测写成结论']
      )}
    `,
  });
}

function buildReportHtml(payload, structured) {
  const report = buildTechnicalReport(structured);
  return injectBeforeEvidenceGrid(factTemplate.buildReportHtml(payload, report), renderTechnicalRunbook(report));
}

module.exports = {
  buildTechnicalReport,
  buildReportHtml,
};
