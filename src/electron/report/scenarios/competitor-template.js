'use strict';

const { createScenarioTemplate } = require('./configured-template');

module.exports = createScenarioTemplate({
  taskType: 'competitor_analysis',
  variant: 'competitor_selection_v1',
  label: '竞品选型分析',
  eyebrow: 'COMPETITIVE DECISION BRIEF',
  title: '竞品选型裁决台',
  subtitle: '把“谁更好”拆成对象范围、对比维度、价值权重、适用场景、迁移成本和风险边界，输出可执行选型建议。',
  evidenceStandard: '优先采信官网文档、产品价格页、公开案例、实测体验和用户反馈；营销口径必须降权处理。',
  doNotOverread: ['不把单一维度优势写成总体胜出', '不忽略版本/套餐差异', '不把营销话术当能力证据'],
  keyFindings: ['竞品结论必须绑定使用场景和权重。', '候选对象、版本和价格口径不清时不能单一强推。'],
  finalActions: ['确认候选版本', '核验价格和套餐限制', '做关键场景试用'],
  payloadTitle: '竞品决策矩阵',
  payloadFields: [
    { key: 'candidate_table', label: '候选' },
    { key: 'dimension_scores', label: '评分' },
    { key: 'selection_matrix', label: '选型矩阵' },
  ],
  payloadFallback: [
    { title: '候选范围', body: '明确比较对象和版本。' },
    { title: '维度评分', body: '按价格、能力、生态、风险分别评分。' },
    { title: '选型条件', body: '说明什么条件下选谁。' },
  ],
  factorFallback: [
    { title: '能力匹配', body: '核心能力是否覆盖真实业务。' },
    { title: '成本结构', body: '价格、迁移和维护成本。' },
    { title: '锁定风险', body: '生态依赖和替换难度。' },
  ],
  riskFallback: [
    { title: '套餐隐藏限制', body: '不同版本能力可能差异很大。' },
    { title: '试用样本偏差', body: 'Demo好不代表长期稳定。' },
    { title: '迁移成本低估', body: '数据、流程和团队习惯都会影响落地。' },
  ],
});
