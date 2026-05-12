'use strict';

const factTemplate = require('./fact-template');
const consumerTemplate = require('./scenarios/consumer-template');
const publicOpinionTemplate = require('./scenarios/public-opinion-template');
const technicalTemplate = require('./scenarios/technical-template');
const factCheckTemplate = require('./scenarios/fact-check-template');
const competitorTemplate = require('./scenarios/competitor-template');
const investmentTemplate = require('./scenarios/investment-template');
const legalTemplate = require('./scenarios/legal-template');
const knowledgeTemplate = require('./scenarios/knowledge-template');
const creativeTemplate = require('./scenarios/creative-template');
const learningTemplate = require('./scenarios/learning-template');
const travelTemplate = require('./scenarios/travel-template');
const careerTemplate = require('./scenarios/career-template');
const medicalTemplate = require('./scenarios/medical-template');
const financeTemplate = require('./scenarios/finance-template');
const generalTemplate = require('./scenarios/general-template');
const { enrichReportOutcome } = require('./report-outcome-enricher');
const { applyReportQualityGate } = require('./report-quality-gate');

const TEMPLATE_BY_TASK = {
  public_opinion: publicOpinionTemplate,
  fact_check: factCheckTemplate,
  competitor_analysis: competitorTemplate,
  consumer_purchase: consumerTemplate,
  investment_research: investmentTemplate,
  legal_risk: legalTemplate,
  knowledge_brief: knowledgeTemplate,
  creative_content: creativeTemplate,
  technical_diagnosis: technicalTemplate,
  learning_research: learningTemplate,
  travel_lifestyle: travelTemplate,
  career_recruiting: careerTemplate,
  medical_health: medicalTemplate,
  finance_planning: financeTemplate,
  general_compare: generalTemplate,
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
  const enriched = applyReportQualityGate(enrichReportOutcome(structured), {
    analysisSession: payload && payload.analysisSession ? payload.analysisSession : null,
  });
  return resolveTemplate(enriched).buildReportHtml(payload, enriched);
}

module.exports = {
  buildReportHtml,
  resolveTemplate,
  TEMPLATE_BY_TASK,
  taskTypeOf,
};
