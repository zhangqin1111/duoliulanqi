'use strict';

const { createScenarioTemplate } = require('./configured-template');

module.exports = createScenarioTemplate({
  taskType: 'career_recruiting',
  variant: 'career_recruiting_strategy_v1',
  label: '职业/招聘策略',
  eyebrow: 'CAREER DECISION BRIEF',
  title: '职业招聘策略裁决台',
  subtitle: '把简历、岗位、面试或招聘问题拆成岗位匹配、能力差距、表达优化、行动计划和风险边界。',
  evidenceStandard: '优先采信 JD、真实经历、项目数据、岗位要求、招聘反馈和行业薪酬信息；不鼓励虚假包装。',
  doNotOverread: ['不虚构经历', '不承诺录用', '不把个案反馈当行业规律'],
  keyFindings: ['职业建议必须围绕岗位和证据。', '简历优化应增强真实表达而不是造假。'],
  finalActions: ['补充目标岗位JD', '量化项目成果', '制定面试准备清单'],
  payloadTitle: '职业匹配结构',
  payloadFields: [
    { key: 'role_table', label: '岗位' },
    { key: 'fit_matrix', label: '匹配' },
    { key: 'gap_plan', label: '差距' },
    { key: 'action_plan', label: '行动' },
  ],
  payloadFallback: [
    { title: '岗位定位', body: '明确目标岗位和评价标准。' },
    { title: '能力差距', body: '识别硬技能、项目和表达短板。' },
    { title: '行动计划', body: '给出简历、面试和投递步骤。' },
  ],
  factorFallback: [
    { title: '岗位匹配', body: '能力和经历是否对齐JD。' },
    { title: '证据强度', body: '成果是否可量化。' },
    { title: '执行优先级', body: '先改最影响机会的部分。' },
  ],
  riskFallback: [
    { title: '过度包装', body: '会损害面试可信度。' },
    { title: '岗位理解偏差', body: 'JD关键词不等于真实工作。' },
    { title: '薪酬样本偏差', body: '地区、公司和级别差异明显。' },
  ],
});
