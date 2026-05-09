'use strict';

const { getPricing } = require('./model-pricing');

function estimateTaskCost(input) {
  const source = input || {};
  const providerId = String(source.providerId || 'qwen');
  const pricing = getPricing(providerId);
  const inputTokens = Math.max(0, Number(source.inputTokens) || 0);
  const outputTokens = Math.max(0, Number(source.outputTokens) || 0);
  const cost = (inputTokens / 1000) * pricing.inputPer1k + (outputTokens / 1000) * pricing.outputPer1k;
  return {
    providerId,
    inputTokens,
    outputTokens,
    cost: Number(cost.toFixed(6)),
    currency: 'CNY-estimated',
  };
}

function createTaskBudget(taskType) {
  const highValue = ['public_opinion', 'competitor_analysis', 'investment_research'].includes(taskType);
  return {
    taskType: taskType || 'general_compare',
    maxModels: highValue ? 4 : 3,
    maxFollowupRounds: highValue ? 3 : 2,
    maxReportTokens: highValue ? 9000 : 6000,
    fallbackPolicy: 'cheaper_model | fewer_rounds | partial_report',
  };
}

module.exports = {
  createTaskBudget,
  estimateTaskCost,
};
