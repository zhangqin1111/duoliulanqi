'use strict';

const { createScenarioTemplate } = require('./configured-template');

module.exports = createScenarioTemplate({
  taskType: 'finance_planning',
  variant: 'finance_planning_risk_v1',
  label: '金融规划初筛',
  eyebrow: 'FINANCE RISK BRIEF',
  title: '金融规划风险裁决台',
  subtitle: '把理财、基金、保险、贷款等问题拆成目标、期限、现金流、风险承受能力、方案选项和合规边界。',
  evidenceStandard: '需要个人现金流、风险测评、期限、产品说明、费率和合规文件；不得用模型文本替代持牌专业建议。',
  doNotOverread: ['不承诺收益', '不输出确定买卖指令', '不替代持牌投顾', '不忽略流动性和风险承受能力'],
  keyFindings: ['金融报告应给风险框架和待确认问题。', '具体产品建议必须基于用户风险画像和合规材料。'],
  finalActions: ['完成风险测评', '核验产品说明和费率', '咨询持牌专业人士'],
  payloadTitle: '金融风险结构',
  payloadFields: [
    { key: 'asset_snapshot', label: '资产' },
    { key: 'risk_profile', label: '风险画像' },
    { key: 'allocation_options', label: '方案' },
    { key: 'action_plan', label: '行动' },
  ],
  payloadFallback: [
    { title: '风险画像', body: '先确认期限、现金流和承受能力。' },
    { title: '方案边界', body: '只列选项，不承诺收益。' },
    { title: '合规核验', body: '产品说明和费率必须核验。' },
  ],
  factorFallback: [
    { title: '风险承受能力', body: '决定方案上限。' },
    { title: '流动性', body: '应急资金不能被锁死。' },
    { title: '成本费率', body: '长期收益受费用影响。' },
  ],
  riskFallback: [
    { title: '收益承诺', body: '任何保证收益都要警惕。' },
    { title: '期限错配', body: '短钱长投风险高。' },
    { title: '产品复杂度', body: '看不懂的产品不应轻易购买。' },
  ],
});
