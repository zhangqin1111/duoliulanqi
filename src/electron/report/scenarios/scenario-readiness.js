'use strict';

function array(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value == null ? '' : value).trim();
}

function countValue(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.keys(value).length;
  return text(value) ? 1 : 0;
}

function evidenceSummary(report) {
  const summary = (report && report.evidence_binding_summary) || {};
  return {
    claims: Number(summary.claims) || 0,
    bound: Number(summary.bound) || 0,
    unbound: Number(summary.unbound) || 0,
    evidenceSources: Number(summary.evidence_sources) || 0,
  };
}

function payloadCoverage(report, config) {
  const payload = (report && report.scenario_payload) || {};
  const fields = array(config && config.payloadFields);
  const present = fields.filter((field) => countValue(payload[field.key]) > 0);
  const missing = fields.filter((field) => countValue(payload[field.key]) === 0);
  return {
    total: fields.length,
    present: present.length,
    missing: missing.map((field) => field.label || field.key),
  };
}

function scorePart(value, max) {
  return Math.max(0, Math.min(max, value));
}

function evaluateScenarioReadiness(report, config) {
  const decision = (report && report.scenario_decision) || {};
  const issue = (report && report.user_issue_analysis) || {};
  const coverage = payloadCoverage(report, config);
  const evidence = evidenceSummary(report);
  const factorCount = array(decision.decision_factors).length;
  const actionCount = array(report && report.final_actions).length;
  const guardrailCount = array(issue.blindspots || decision.do_not_overread).length;
  const coverageRatio = coverage.total ? coverage.present / coverage.total : 0;
  const evidenceRatio = evidence.claims ? evidence.bound / evidence.claims : evidence.evidenceSources ? 1 : 0;

  let score =
    scorePart(Math.round(coverageRatio * 35), 35) +
    scorePart(factorCount * 8, 20) +
    scorePart(actionCount * 7, 20) +
    scorePart(guardrailCount * 5, 15) +
    scorePart(Math.round(evidenceRatio * 10), 10);

  if (evidence.evidenceSources === 0) score = Math.min(score, 76);
  if (coverage.missing.length) score = Math.min(score, 82);

  const status =
    score >= 86
      ? '可直接进入决策复核'
      : score >= 68
        ? '可用，但需补齐关键核验'
        : '暂不建议直接拍板';

  const missing = coverage.missing.slice(0, 4);
  if (!factorCount) missing.push('决策因子');
  if (!actionCount) missing.push('下一步动作');
  if (!evidence.evidenceSources) missing.push('外部证据源');

  return {
    score,
    status,
    missing: Array.from(new Set(missing)).slice(0, 5),
    evidence,
    coverage,
    recommendation:
      score >= 86
        ? '结论可作为会议讨论版本，但仍需保留来源复核链路。'
        : '先补齐缺口，再输出强推荐或最终裁决，避免把模型共识误当事实。',
  };
}

module.exports = {
  evaluateScenarioReadiness,
};
