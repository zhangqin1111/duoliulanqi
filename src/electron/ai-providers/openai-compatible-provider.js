'use strict';

const { estimateTaskCost } = require('../ai-cost/cost-estimator');
const { estimateTokens, normalizeProviderResult } = require('./provider-contract');

function readEnv(name) {
  return String(process.env[name] || '').trim();
}

function createOpenAICompatibleProvider(config) {
  const id = config.id;
  const label = config.label;
  const model = readEnv(config.modelEnv) || config.defaultModel;
  const baseUrl = readEnv(config.baseUrlEnv) || config.baseUrl;
  const apiKeyEnv = config.apiKeyEnv;

  function apiKey() {
    return readEnv(apiKeyEnv);
  }

  return {
    id,
    label,
    model,
    capabilities: {
      complete: true,
      stream: false,
      webSearch: false,
      json: true,
      realtime: false,
    },
    status() {
      return apiKey() ? { ok: true, source: `env:${apiKeyEnv}` } : { ok: false, source: 'missing_env', env: apiKeyEnv };
    },
    async complete(prompt, options) {
      const key = apiKey();
      if (!key) throw new Error(`${label} API key is not configured. Set ${apiKeyEnv}.`);
      const started = Date.now();
      const timeoutMs = Math.max(3000, Number(options && options.timeoutMs) || 90000);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let res;
      try {
        res = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
          }),
        });
      } finally {
        clearTimeout(timer);
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = (data.error && (data.error.message || data.error.code)) || data.message || `${res.status}`;
        throw new Error(`${label} request failed: ${message}`);
      }
      const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (!String(text || '').trim()) throw new Error(`${label} returned empty content.`);
      const inputTokens = estimateTokens(prompt);
      const outputTokens = estimateTokens(text);
      const cost = estimateTaskCost({ providerId: id, inputTokens, outputTokens });
      return normalizeProviderResult({
        ok: true,
        text,
        providerId: id,
        model,
        durationMs: Date.now() - started,
        estimatedTokens: inputTokens + outputTokens,
        cost: cost.cost,
        raw: { usage: data.usage || null },
      });
    },
  };
}

module.exports = {
  createOpenAICompatibleProvider,
};
