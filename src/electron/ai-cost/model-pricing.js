'use strict';

const PRICING = {
  qwen: { inputPer1k: 0.0008, outputPer1k: 0.002 },
  deepseek: { inputPer1k: 0.001, outputPer1k: 0.002 },
  openai: { inputPer1k: 0.005, outputPer1k: 0.015 },
  claude: { inputPer1k: 0.003, outputPer1k: 0.015 },
};

function getPricing(providerId) {
  return PRICING[providerId] || { inputPer1k: 0.002, outputPer1k: 0.006 };
}

module.exports = {
  PRICING,
  getPricing,
};
