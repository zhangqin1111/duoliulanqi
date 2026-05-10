'use strict';

const { createScenarioTemplate } = require('./configured-template');

module.exports = createScenarioTemplate({
  taskType: 'general_compare',
  variant: 'general_compare_decision_v1',
  label: '通用多源对比',
  eyebrow: 'MULTI-MODEL DECISION BRIEF',
  title: '通用对比决策裁决台',
  subtitle: '把开放式问题拆成候选对象、比较维度、证据状态、适配场景、风险边界和最终建议，避免只输出模型摘要。',
  evidenceStandard: '事实项必须绑定来源或标注待核验；价值判断必须说明权重和适用场景。',
  doNotOverread: ['不把多数模型一致当事实', '不替用户擅自设定偏好', '不忽略候选范围和条件限制'],
  keyFindings: ['通用对比必须先明确比较对象和用户目标。', '如果证据不足，应输出核验路径而不是强裁决。'],
  finalActions: ['确认候选对象', '确认评价权重', '补充关键证据'],
  payloadTitle: '通用对比结构',
  payloadFields: [
    { key: 'comparison_table', label: '对比表' },
    { key: 'decision_matrix', label: '决策矩阵' },
    { key: 'risk_notes', label: '风险' },
  ],
  payloadFallback: [
    { title: '候选对象', body: '明确要比较什么。' },
    { title: '评价权重', body: '说明为什么这样比较。' },
    { title: '最终动作', body: '给用户下一步可执行建议。' },
  ],
  factorFallback: [
    { title: '适配度', body: '是否解决用户问题。' },
    { title: '证据强度', body: '事实是否可核验。' },
    { title: '风险边界', body: '什么条件会改变结论。' },
  ],
  riskFallback: [
    { title: '候选范围不清', body: '对象不清会导致结论无效。' },
    { title: '偏好未确认', body: '价值判断依赖用户权重。' },
    { title: '证据不足', body: '不能用模型共识替代事实。' },
  ],
});
