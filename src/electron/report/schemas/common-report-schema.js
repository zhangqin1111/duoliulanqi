'use strict';

const COMMON_FIELDS = [
  { path: 'meta.task_type', type: 'string', required: true },
  { path: 'meta.question_original', type: 'string', required: false },
  { path: 'meta.question_refined', type: 'string', required: false },
  { path: 'executive_conclusion.one_sentence', type: 'string', required: true },
  { path: 'executive_conclusion.confidence_score', type: 'number', required: true },
  { path: 'executive_conclusion.risk_level', type: 'string', required: false },
  { path: 'question_brief.original', type: 'string', required: true },
  { path: 'question_brief.refined', type: 'string', required: false },
  { path: 'scenario_decision.task_type', type: 'string', required: true },
  { path: 'scenario_decision.direct_verdict', type: 'string', required: true },
  { path: 'scenario_decision.recommended_action', type: 'string', required: false },
  { path: 'evidence_funnel.raw_claims', type: 'number', required: true },
  { path: 'evidence_funnel.final_evidence', type: 'number', required: true },
  { path: 'dispute_map.items', type: 'array', required: true, allowEmpty: true },
  { path: 'model_profiles', type: 'array', required: false, allowEmpty: true },
  { path: 'final_actions', type: 'array', required: true, allowEmpty: false },
];

const SCENARIO_FIELDS = {
  public_opinion: [
    { path: 'user_issue_analysis.public_opinion_temperature', type: 'number', required: true },
    { path: 'user_issue_analysis.sentiment_distribution', type: 'array', required: false, allowEmpty: true },
    { path: 'user_issue_analysis.risk_matrix', type: 'array', required: false, allowEmpty: true },
  ],
  fact_check: [
    { path: 'fact_map.confirmed_facts', type: 'array', required: true, allowEmpty: true },
    { path: 'fact_map.uncertain_claims', type: 'array', required: true, allowEmpty: true },
  ],
  competitor_analysis: [
    { path: 'scenario_decision.decision_object', type: 'string', required: true },
    { path: 'scenario_decision.decision_factors', type: 'array', required: true, allowEmpty: false },
  ],
  consumer_purchase: [
    { path: 'scenario_decision.decision_object', type: 'string', required: true },
    { path: 'scenario_decision.decision_factors', type: 'array', required: true, allowEmpty: false },
    { path: 'user_issue_analysis.key_findings', type: 'array', required: false, allowEmpty: true },
  ],
  investment_research: [
    { path: 'scenario_decision.decision_object', type: 'string', required: true },
    { path: 'scenario_decision.decision_factors', type: 'array', required: true, allowEmpty: false },
  ],
  legal_risk: [
    { path: 'scenario_decision.evidence_standard', type: 'string', required: true },
    { path: 'scenario_decision.do_not_overread', type: 'array', required: true, allowEmpty: false },
  ],
  medical_health: [
    { path: 'scenario_decision.evidence_standard', type: 'string', required: true },
    { path: 'scenario_decision.do_not_overread', type: 'array', required: true, allowEmpty: false },
  ],
  finance_planning: [
    { path: 'scenario_decision.evidence_standard', type: 'string', required: true },
    { path: 'scenario_decision.do_not_overread', type: 'array', required: true, allowEmpty: false },
  ],
};

function buildSchema(taskType) {
  return {
    id: taskType || 'general_compare',
    version: 1,
    fields: [...COMMON_FIELDS, ...(SCENARIO_FIELDS[taskType] || [])],
  };
}

module.exports = {
  COMMON_FIELDS,
  SCENARIO_FIELDS,
  buildSchema,
};
