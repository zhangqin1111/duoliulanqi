'use strict';

const { estimateTokens, normalizeProviderResult } = require('./provider-contract');
const { estimateTaskCost } = require('../ai-cost/cost-estimator');

function createQwenProvider(deps) {
  const qwenChatCompletion = deps && deps.qwenChatCompletion;
  const qwenChatCompletionStream = deps && deps.qwenChatCompletionStream;
  const getQwenKeyStatus = deps && deps.getQwenKeyStatus;
  const model = process.env.DUOLI_QWEN_MODEL || 'qwen-plus';

  return {
    id: 'qwen',
    label: '通义千问',
    model,
    capabilities: {
      complete: true,
      stream: typeof qwenChatCompletionStream === 'function',
      webSearch: false,
      json: true,
      realtime: false,
    },
    status() {
      return typeof getQwenKeyStatus === 'function' ? getQwenKeyStatus() : { ok: false, source: 'unknown' };
    },
    async complete(prompt, options) {
      if (typeof qwenChatCompletion !== 'function') {
        throw new Error('Qwen completion dependency is not configured.');
      }
      const started = Date.now();
      const text = await qwenChatCompletion(prompt, options || {});
      const inputTokens = estimateTokens(prompt);
      const outputTokens = estimateTokens(text);
      const cost = estimateTaskCost({ providerId: 'qwen', inputTokens, outputTokens });
      return normalizeProviderResult({
        ok: true,
        text,
        providerId: 'qwen',
        model,
        durationMs: Date.now() - started,
        estimatedTokens: inputTokens + outputTokens,
        cost: cost.cost,
      });
    },
    async stream(prompt, onChunk, options) {
      if (typeof qwenChatCompletionStream !== 'function') {
        throw new Error('Qwen streaming dependency is not configured.');
      }
      const started = Date.now();
      const text = await qwenChatCompletionStream(prompt, onChunk, options || {});
      const inputTokens = estimateTokens(prompt);
      const outputTokens = estimateTokens(text);
      const cost = estimateTaskCost({ providerId: 'qwen', inputTokens, outputTokens });
      return normalizeProviderResult({
        ok: true,
        text,
        providerId: 'qwen',
        model,
        durationMs: Date.now() - started,
        estimatedTokens: inputTokens + outputTokens,
        cost: cost.cost,
      });
    },
  };
}

module.exports = {
  createQwenProvider,
};
