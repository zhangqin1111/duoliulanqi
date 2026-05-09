'use strict';

const factTemplate = require('./fact-template');

const TEMPLATE_BY_TASK = {
  public_opinion: factTemplate,
  fact_check: factTemplate,
  competitor_analysis: factTemplate,
  consumer_purchase: factTemplate,
  investment_research: factTemplate,
  legal_risk: factTemplate,
  knowledge_brief: factTemplate,
  creative_content: factTemplate,
  technical_diagnosis: factTemplate,
  learning_research: factTemplate,
  travel_lifestyle: factTemplate,
  career_recruiting: factTemplate,
  medical_health: factTemplate,
  finance_planning: factTemplate,
  general_compare: factTemplate,
};

function taskTypeOf(structured) {
  return String(
    (structured && structured.meta && structured.meta.task_type) ||
      (structured && structured.scenario_decision && structured.scenario_decision.task_type) ||
      'general_compare'
  ).trim();
}

function resolveTemplate(structured) {
  if (structured && structured.executive_conclusion) {
    return TEMPLATE_BY_TASK[taskTypeOf(structured)] || factTemplate;
  }
  return factTemplate;
}

function buildReportHtml(payload, structured) {
  return resolveTemplate(structured).buildReportHtml(payload, structured);
}

module.exports = {
  buildReportHtml,
  resolveTemplate,
  TEMPLATE_BY_TASK,
  taskTypeOf,
};
