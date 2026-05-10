'use strict';

const { createScenarioTemplate } = require('./configured-template');

module.exports = createScenarioTemplate({
  taskType: 'travel_lifestyle',
  variant: 'travel_lifestyle_route_v1',
  label: '旅行/本地生活方案',
  eyebrow: 'TRAVEL & LOCAL LIFE BRIEF',
  title: '旅行生活方案裁决台',
  subtitle: '把路线、餐饮、住宿、本地生活问题拆成偏好、预算、时间、交通、体验密度、风险和出发前核验清单。',
  evidenceStandard: '优先采信官网、地图、票务平台、酒店/餐厅实时信息和用户近期评价；营业、价格、天气、交通必须出发前复核。',
  doNotOverread: ['不把过时营业信息当实时事实', '不虚构价格', '不忽略天气和交通变量'],
  keyFindings: ['旅行方案必须区分路线逻辑和实时信息。', '实时价格/营业/交通必须标注核验。'],
  finalActions: ['核验营业时间', '核验票价和预约', '检查天气交通'],
  payloadTitle: '路线与风险结构',
  payloadFields: [
    { key: 'option_table', label: '选项' },
    { key: 'itinerary_matrix', label: '行程' },
    { key: 'cost_table', label: '成本' },
    { key: 'risk_notes', label: '风险' },
  ],
  payloadFallback: [
    { title: '路线方案', body: '先给主路线和备选路线。' },
    { title: '成本拆解', body: '交通、门票、住宿、餐饮分开估算。' },
    { title: '出发前核验', body: '实时信息必须重新确认。' },
  ],
  factorFallback: [
    { title: '体验匹配', body: '是否符合人群偏好。' },
    { title: '时间效率', body: '避免路线过密。' },
    { title: '预算可控', body: '显性成本和隐藏成本都要看。' },
  ],
  riskFallback: [
    { title: '营业变化', body: '餐厅/景点可能临时调整。' },
    { title: '天气交通', body: '会直接改变体验。' },
    { title: '价格波动', body: '节假日和库存会影响预算。' },
  ],
});
