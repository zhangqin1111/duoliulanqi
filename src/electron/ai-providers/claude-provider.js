'use strict';

const { estimateTaskCost } = require('../ai-cost/cost-estimator');
const { estimateTokens, normalizeProviderResult } = require('./provider-contract');

function readEnv(name) {
  return String(process.env[name] || '').trim();
}

function extractClaudeText(data) {
  const blocks = Array.isArray(data && data.content) ? data.content : [];
  return blocks
    .map((block) => {
      if (!block) return '';
      if (block.type === 'text') return block.text || '';
      return block.text || '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
}

function createClaudeProvider(config) {
  const apiKeyEnv = (config && config.apiKeyEnv) || 'DUOLI_CLAUDE_API_KEY';
  const modelEnv = (config && config.modelEnv) || 'DUOLI_CLAUDE_MODEL';
  const baseUrlEnv = (config && config.baseUrlEnv) || 'DUOLI_CLAUDE_API_URL';
  const model = readEnv(modelEnv) || 'claude-3-5-haiku-latest';
  const baseUrl = readEnv(baseUrlEnv) || 'https://api.anthropic.com/v1/messages';

  function apiKey() {
    return readEnv(apiKeyEnv);
  }

  return {
    id: 'claude',
    label: 'Claude',
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
      if (!key) throw new Error(`Claude API key is not configured. Set ${apiKeyEnv}.`);
      const started = Date.now();
      const timeoutMs = Math.max(3000, Number(options && options.timeoutMs) || 90000);
      const maxTokens = Math.max(256, Number(options && options.maxTokens) || 4096);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let res;
      try {
        res = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            messages: [{ role: 'user', content: prompt }],
          }),
        });
      } finally {
        clearTimeout(timer);
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = (data.error && (data.error.message || data.error.type)) || data.message || `${res.status}`;
        throw new Error(`Claude request failed: ${message}`);
      }
      const text = extractClaudeText(data);
      if (!text) throw new Error('Claude returned empty content.');
      const inputTokens = estimateTokens(prompt);
      const outputTokens = estimateTokens(text);
      const cost = estimateTaskCost({ providerId: 'claude', inputTokens, outputTokens });
      return normalizeProviderResult({
        ok: true,
        text,
        providerId: 'claude',
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
  createClaudeProvider,
  extractClaudeText,
};
