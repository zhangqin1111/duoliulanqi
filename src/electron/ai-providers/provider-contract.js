'use strict';

function createProviderError(providerId, message, details) {
  const error = new Error(message || 'AI provider error');
  error.providerId = providerId;
  error.details = details || null;
  return error;
}

function normalizeProviderResult(input) {
  const source = input || {};
  return {
    ok: source.ok !== false,
    text: String(source.text || '').trim(),
    providerId: String(source.providerId || ''),
    model: String(source.model || ''),
    durationMs: Math.max(0, Math.round(Number(source.durationMs) || 0)),
    estimatedTokens: Math.max(0, Math.round(Number(source.estimatedTokens) || 0)),
    cost: Math.max(0, Number(source.cost) || 0),
    raw: source.raw || null,
  };
}

function estimateTokens(text) {
  const value = String(text || '');
  if (!value) return 0;
  return Math.ceil(value.length / 1.6);
}

function assertProvider(provider) {
  const required = ['id', 'label', 'capabilities', 'complete'];
  for (const key of required) {
    if (!provider || provider[key] == null) {
      throw createProviderError(provider && provider.id, `Provider missing required field: ${key}`);
    }
  }
  if (typeof provider.complete !== 'function') {
    throw createProviderError(provider.id, 'Provider complete must be a function');
  }
  return provider;
}

module.exports = {
  assertProvider,
  createProviderError,
  estimateTokens,
  normalizeProviderResult,
};
