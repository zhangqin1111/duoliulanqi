'use strict';

const { createScenarioTemplate } = require('./configured-template');

module.exports = createScenarioTemplate({
  taskType: 'investment_research',
  variant: 'investment_impact_v1',
  label: '投研影响分析',
  eyebrow: 'IMPACT & RISK BRIEF',
  title: '投研影响路径裁决台',
  subtitle: '把政策、行业或公司问题拆成事实边界、传导路径、受益受损主体、关键指标和风险情景，不输出买卖指令。',
  evidenceStandard: '优先采信公告、财报、政策原文、监管文件、行业数据和可复核指标；市场推断必须与事实层分离。',
  doNotOverread: ['不构成投资建议', '不承诺收益', '不把相关性写成因果', '不输出确定买卖指令'],
  keyFindings: ['投研报告应解释影响路径，而不是直接给收益结论。', '受益/受损判断必须绑定执行条件和时间窗口。'],
  finalActions: ['核验政策/公告原文', '补充财务和行业指标', '跟踪关键触发条件'],
  payloadTitle: '影响路径结构',
  payloadFields: [
    { key: 'target_table', label: '对象' },
    { key: 'financial_metrics', label: '指标' },
    { key: 'risk_factors', label: '风险' },
    { key: 'scenario_cases', label: '情景' },
  ],
  payloadFallback: [
    { title: '事件边界', body: '先确认事件、主体、时间和适用范围。' },
    { title: '传导路径', body: '拆分直接、间接和滞后影响。' },
    { title: '风险情景', body: '列出乐观、中性、悲观条件。' },
  ],
  factorFallback: [
    { title: '事实确定性', body: '公告/政策是否已经落地。' },
    { title: '暴露程度', body: '主体受影响的收入或成本占比。' },
    { title: '时间窗口', body: '短中长期影响不同。' },
  ],
  riskFallback: [
    { title: '政策执行不确定', body: '文件发布不等于落地效果。' },
    { title: '市场已定价', body: '信息可能已经反映在价格中。' },
    { title: '外部变量', body: '宏观、供需和竞争变化可能改变结论。' },
  ],
});
