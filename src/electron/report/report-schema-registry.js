'use strict';

const { buildSchema } = require('./schemas/common-report-schema');

const TASK_TYPES = [
  'public_opinion',
  'fact_check',
  'competitor_analysis',
  'consumer_purchase',
  'investment_research',
  'legal_risk',
  'knowledge_brief',
  'creative_content',
  'technical_diagnosis',
  'learning_research',
  'travel_lifestyle',
  'career_recruiting',
  'medical_health',
  'finance_planning',
  'general_compare',
];

const SCHEMAS = Object.fromEntries(TASK_TYPES.map((taskType) => [taskType, buildSchema(taskType)]));

function valueAt(source, path) {
  return String(path || '')
    .split('.')
    .filter(Boolean)
    .reduce((current, key) => (current == null ? undefined : current[key]), source);
}

function isEmpty(value) {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function typeOf(value) {
  if (Array.isArray(value)) return 'array';
  if (value == null) return 'missing';
  return typeof value;
}

function validateField(report, field) {
  const value = valueAt(report, field.path);
  const actualType = typeOf(value);
  if (field.required && actualType === 'missing') {
    return { level: 'error', path: field.path, message: `Missing required field: ${field.path}` };
  }
  if (actualType === 'missing') return null;
  if (field.type && actualType !== field.type) {
    return {
      level: field.required ? 'error' : 'warning',
      path: field.path,
      message: `Invalid field type at ${field.path}: expected ${field.type}, got ${actualType}`,
    };
  }
  if (field.required && !field.allowEmpty && isEmpty(value)) {
    return { level: 'error', path: field.path, message: `Required field is empty: ${field.path}` };
  }
  return null;
}

function inferTaskType(report) {
  return String(
    valueAt(report, 'meta.task_type') ||
      valueAt(report, 'scenario_decision.task_type') ||
      'general_compare'
  ).trim();
}

function getReportSchema(taskType) {
  return SCHEMAS[taskType] || SCHEMAS.general_compare;
}

function validateReportSchema(report, taskType) {
  const schema = getReportSchema(taskType || inferTaskType(report));
  const issues = schema.fields.map((field) => validateField(report, field)).filter(Boolean);
  return {
    ok: issues.every((issue) => issue.level !== 'error'),
    schemaId: schema.id,
    issues,
    errors: issues.filter((issue) => issue.level === 'error'),
    warnings: issues.filter((issue) => issue.level === 'warning'),
  };
}

module.exports = {
  TASK_TYPES,
  SCHEMAS,
  getReportSchema,
  validateReportSchema,
  inferTaskType,
  valueAt,
};
