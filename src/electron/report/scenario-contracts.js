'use strict';

const { UNIVERSAL_KEYS } = require('../shared/scenario-action-contracts');

const TASK_CONTRACTS = {
  public_opinion: {
    payload: ['signal_matrix', 'verified_events', 'actor_map', 'risk_triggers'],
    decision: ['direct_verdict', 'recommended_action'],
  },
  fact_check: {
    payload: ['claim_table', 'source_table', 'verification_path'],
    decision: ['direct_verdict', 'recommended_action'],
  },
  competitor_analysis: {
    payload: ['candidate_table', 'dimension_scores', 'selection_matrix'],
    decision: ['direct_verdict', 'recommended_action'],
  },
  consumer_purchase: {
    payload: ['candidate_table', 'value_weights', 'persona_rankings', 'recommendations', 'manual_verification_items'],
    decision: ['direct_verdict', 'recommended_action'],
  },
  investment_research: {
    payload: ['target_table', 'financial_metrics', 'risk_factors', 'scenario_cases'],
    decision: ['direct_verdict', 'recommended_action'],
  },
  legal_risk: {
    payload: ['issue_table', 'evidence_table', 'risk_levels', 'lawyer_questions'],
    decision: ['direct_verdict', 'recommended_action'],
  },
  knowledge_brief: {
    payload: ['concept_map', 'consensus_points', 'open_questions'],
    decision: ['direct_verdict', 'recommended_action'],
  },
  creative_content: {
    payload: ['audience_table', 'creative_routes', 'risk_words', 'deliverables'],
    decision: ['direct_verdict', 'recommended_action'],
  },
  technical_diagnosis: {
    payload: ['symptom_table', 'root_cause_hypotheses', 'fix_plan', 'verification_steps'],
    decision: ['direct_verdict', 'recommended_action'],
  },
  learning_research: {
    payload: ['learning_path', 'resource_table', 'milestones', 'practice_plan'],
    decision: ['direct_verdict', 'recommended_action'],
  },
  travel_lifestyle: {
    payload: ['option_table', 'itinerary_matrix', 'cost_table', 'risk_notes'],
    decision: ['direct_verdict', 'recommended_action'],
  },
  career_recruiting: {
    payload: ['role_table', 'fit_matrix', 'gap_plan', 'action_plan'],
    decision: ['direct_verdict', 'recommended_action'],
  },
  medical_health: {
    payload: ['symptom_summary', 'risk_triage', 'care_actions', 'doctor_questions'],
    decision: ['direct_verdict', 'recommended_action'],
  },
  finance_planning: {
    payload: ['asset_snapshot', 'risk_profile', 'allocation_options', 'action_plan'],
    decision: ['direct_verdict', 'recommended_action'],
  },
  general_compare: {
    payload: ['comparison_table', 'decision_matrix', 'risk_notes'],
    decision: ['direct_verdict', 'recommended_action'],
  },
};

const PLACEHOLDER_RE = /(xxxx|xxx|待定编号|示例编号|2024xxxx|2025xxxx|2026xxxx|n\/a|tbd|placeholder)/i;

function taskTypeOf(report) {
  return String(
    (report && report.meta && report.meta.task_type) ||
      (report && report.scenario_decision && report.scenario_decision.task_type) ||
      'general_compare'
  ).trim();
}

function getScenarioContract(taskType) {
  return TASK_CONTRACTS[taskType] || TASK_CONTRACTS.general_compare;
}

function isEmptyValue(value) {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return String(value).trim() === '';
}

function hasPlaceholder(value) {
  if (value == null) return false;
  if (typeof value === 'string' || typeof value === 'number') return PLACEHOLDER_RE.test(String(value));
  if (Array.isArray(value)) return value.some(hasPlaceholder);
  if (typeof value === 'object') return Object.values(value).some(hasPlaceholder);
  return false;
}

function itemCount(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.keys(value).length;
  if (value == null || String(value).trim() === '') return 0;
  return 1;
}

function requireCount(errors, value, min, code) {
  if (itemCount(value) < min) errors.push(code);
}

function requireDecisionSafety(errors, decision, taskType) {
  if (isEmptyValue(decision.evidence_standard)) errors.push(`${taskType}.evidence_standard_missing`);
  if (!Array.isArray(decision.do_not_overread) || decision.do_not_overread.length < 1) {
    errors.push(`${taskType}.do_not_overread_missing`);
  }
}

function validateScenarioContract(report) {
  const taskType = taskTypeOf(report);
  const contract = getScenarioContract(taskType);
  const payload = (report && report.scenario_payload) || {};
  const decision = (report && report.scenario_decision) || {};
  const errors = [];
  const warnings = [];

  for (const key of contract.payload) {
    if (isEmptyValue(payload[key])) warnings.push(`scenario_payload.${key}_missing`);
  }
  for (const key of UNIVERSAL_KEYS) {
    if (isEmptyValue(payload[key])) warnings.push(`scenario_payload.${key}_missing`);
  }

  for (const key of contract.decision) {
    if (isEmptyValue(decision[key])) warnings.push(`scenario_decision.${key}_missing`);
  }

  if (taskType === 'consumer_purchase') {
    const candidateTable = Array.isArray(payload.candidate_table) ? payload.candidate_table : [];
    if (candidateTable.length < 3) errors.push('consumer_purchase.candidate_table_requires_at_least_3_items');
    if (isEmptyValue(payload.recommendations)) errors.push('consumer_purchase.recommendations_missing');
    if (isEmptyValue(payload.value_weights)) warnings.push('consumer_purchase.value_weights_missing');
    if (isEmptyValue(payload.price_ladder)) warnings.push('consumer_purchase.price_ladder_missing');
    if (isEmptyValue(payload.offer_strategy)) warnings.push('consumer_purchase.offer_strategy_missing');
  }

  if (taskType === 'general_compare') {
    requireCount(errors, payload.comparison_table, 1, 'general_compare.comparison_table_missing');
    requireCount(errors, payload.decision_matrix, 1, 'general_compare.decision_matrix_missing');
    requireCount(errors, payload.risk_notes, 1, 'general_compare.risk_notes_missing');
  }

  if (taskType === 'fact_check') {
    requireCount(errors, payload.claim_table, 1, 'fact_check.claim_table_missing');
    requireCount(errors, payload.source_table, 1, 'fact_check.source_table_missing');
    requireCount(errors, payload.verification_path, 1, 'fact_check.verification_path_missing');
  }

  if (taskType === 'competitor_analysis') {
    requireCount(errors, payload.candidate_table, 1, 'competitor_analysis.candidate_table_missing');
    requireCount(errors, payload.dimension_scores, 1, 'competitor_analysis.dimension_scores_missing');
    requireCount(errors, payload.selection_matrix, 1, 'competitor_analysis.selection_matrix_missing');
  }

  if (taskType === 'travel_lifestyle') {
    requireCount(errors, payload.option_table, 1, 'travel_lifestyle.option_table_missing');
    requireCount(errors, payload.risk_notes, 1, 'travel_lifestyle.risk_notes_missing');
  }

  if (taskType === 'legal_risk' || taskType === 'medical_health' || taskType === 'finance_planning') {
    requireDecisionSafety(errors, decision, taskType);
  }

  if (hasPlaceholder(report)) errors.push('report_contains_placeholder_token');

  return {
    ok: errors.length === 0,
    taskType,
    errors,
    warnings,
  };
}

module.exports = {
  TASK_CONTRACTS,
  getScenarioContract,
  hasPlaceholder,
  taskTypeOf,
  validateScenarioContract,
};
