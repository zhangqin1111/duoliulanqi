'use strict';

const { createScenarioTemplate } = require('./configured-template');

module.exports = createScenarioTemplate({
  taskType: 'creative_content',
  variant: 'creative_strategy_v1',
  label: '内容创作方案',
  eyebrow: 'CREATIVE STRATEGY BRIEF',
  title: '创意方案裁决台',
  subtitle: '把创作需求拆成目标受众、传播目标、核心卖点、风格路线、可交付物和风险词，避免输出空泛文案。',
  evidenceStandard: '优先绑定品牌事实、产品卖点、平台规则、受众画像和历史素材；夸张承诺和无依据卖点必须剔除。',
  doNotOverread: ['不夸大产品能力', '不虚构案例', '不使用违规承诺', '不脱离平台语境'],
  keyFindings: ['创意结果要能直接落稿或指导拍摄。', '每个创意路线必须说明适合人群和转化目标。'],
  finalActions: ['确认品牌调性', '核验卖点事实', '做A/B测试'],
  payloadTitle: '创意交付结构',
  payloadFields: [
    { key: 'audience_table', label: '受众' },
    { key: 'creative_routes', label: '路线' },
    { key: 'risk_words', label: '风险词' },
    { key: 'deliverables', label: '交付物' },
  ],
  payloadFallback: [
    { title: '受众定位', body: '明确给谁看。' },
    { title: '创意路线', body: '给出可执行方向。' },
    { title: '风险控制', body: '规避夸张和违规表达。' },
  ],
  factorFallback: [
    { title: '传播力', body: '是否容易被理解和转发。' },
    { title: '差异化', body: '是否避免模板化。' },
    { title: '转化目标', body: '是否服务真实业务目标。' },
  ],
  riskFallback: [
    { title: '空泛鸡汤', body: '看似高级但不能落地。' },
    { title: '卖点失真', body: '脱离产品事实。' },
    { title: '平台不适配', body: '语气和形式不符合渠道。' },
  ],
});
