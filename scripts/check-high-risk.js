const { classifyHighRisk } = require('../src/electron/renderer/high-risk-classifier');
const { applyHighRiskPolicy } = require('../src/electron/report/high-risk-report-policy');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const medical = classifyHighRisk('体检血压150/95严重吗，需要吃什么药', 'medical_health');
assert(medical.highRisk && medical.riskDomain === 'medical', 'medical question should be high risk');
assert(medical.blockedClaims.includes('具体用药剂量'), 'medical policy should block dosage');

const finance = classifyHighRisk('现在买基金合适吗，会不会涨', 'finance_planning');
assert(finance.highRisk && finance.riskDomain === 'finance', 'finance question should be high risk');
assert(finance.blockedClaims.includes('收益承诺'), 'finance policy should block return promise');

const report = applyHighRiskPolicy(
  {
    executive_conclusion: { one_sentence: '示例', risk_level: 'medium' },
    scenario_decision: { direct_verdict: '示例' },
    final_actions: [],
  },
  medical
);
assert(report.compliance.highRisk, 'report should include compliance block');
assert(report.executive_conclusion.risk_level === 'high', 'report risk should be elevated');
assert(report.final_actions.length > 0, 'report should include escalation action');

console.log('High-risk guard check passed');
