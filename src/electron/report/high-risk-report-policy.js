'use strict';

function applyHighRiskPolicy(report, highRisk) {
  if (!report || !highRisk || !highRisk.highRisk) return report;
  const next = JSON.parse(JSON.stringify(report));
  next.compliance = {
    highRisk: true,
    riskDomain: highRisk.riskDomain,
    allowedMode: highRisk.allowedMode,
    blockedClaims: highRisk.blockedClaims || [],
    requiredDisclaimers: highRisk.requiredDisclaimers || [],
    escalationAdvice: highRisk.escalationAdvice || '',
  };
  next.executive_conclusion = {
    ...(next.executive_conclusion || {}),
    risk_level: 'high',
  };
  next.scenario_decision = {
    ...(next.scenario_decision || {}),
    do_not_overread: Array.from(
      new Set([...(next.scenario_decision && next.scenario_decision.do_not_overread ? next.scenario_decision.do_not_overread : []), ...(highRisk.blockedClaims || [])])
    ),
    recommended_action:
      (next.scenario_decision && next.scenario_decision.recommended_action) ||
      highRisk.escalationAdvice ||
      '请补充权威材料后复核。',
  };
  next.final_actions = Array.from(new Set([...(next.final_actions || []), highRisk.escalationAdvice].filter(Boolean)));
  return next;
}

module.exports = {
  applyHighRiskPolicy,
};
