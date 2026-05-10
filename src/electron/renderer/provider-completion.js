(function attachProviderCompletion(root) {
  const PROVIDER_PRIORITY = ['qwen', 'deepseek', 'openai', 'claude', 'zhipu'];

  function isProviderReady(provider) {
    return !!(provider && provider.capabilities && provider.capabilities.complete && provider.status && provider.status.ok);
  }

  function sortProviders(providers) {
    const rank = new Map(PROVIDER_PRIORITY.map((id, index) => [id, index]));
    return providers.slice().sort((a, b) => {
      const ar = rank.has(a.id) ? rank.get(a.id) : 99;
      const br = rank.has(b.id) ? rank.get(b.id) : 99;
      return ar - br || String(a.id).localeCompare(String(b.id));
    });
  }

  async function listReadyProviders(api) {
    if (!api || typeof api.listAiProviders !== 'function') return [];
    const response = await api.listAiProviders();
    const providers = response && Array.isArray(response.providers) ? response.providers : [];
    return sortProviders(providers.filter(isProviderReady));
  }

  function normalizeProviderText(response) {
    const result = response && response.result ? response.result : response;
    if (response && response.ok === false) return { ok: false, error: response.error || 'provider failed' };
    if (!result || result.ok === false) return { ok: false, error: (result && result.error) || 'provider returned no result' };
    return {
      ok: true,
      text: String(result.text || '').trim(),
      providerId: result.providerId || '',
      model: result.model || '',
    };
  }

  async function completeWithProvider(api, prompt, options) {
    if (!api || typeof api.providerComplete !== 'function') {
      throw new Error('API provider completion bridge is not available.');
    }
    const providers = await listReadyProviders(api);
    if (!providers.length) throw new Error('没有可用的 API 模型。请先配置至少一个 Provider Key。');
    const provider = providers[0];
    const response = await api.providerComplete(provider.id, prompt, options || {});
    const normalized = normalizeProviderText(response);
    if (!normalized.ok || !normalized.text) {
      throw new Error(normalized.error || `${provider.label || provider.id} returned empty text.`);
    }
    return {
      ok: true,
      text: normalized.text,
      source: provider.id,
      model: normalized.model || provider.model || '',
    };
  }

  async function completeText(api, prompt, options) {
    const opts = options || {};
    let qwenError = null;
    if (opts.preferQwen !== false && api && typeof api.qwenComplete === 'function') {
      const r = await api.qwenComplete(prompt, opts);
      if (r && r.ok && String(r.text || '').trim()) {
        return { ok: true, text: String(r.text || '').trim(), source: 'qwen', model: r.model || '' };
      }
      qwenError = (r && r.error) || 'Qwen completion failed.';
    }
    try {
      return await completeWithProvider(api, prompt, opts);
    } catch (error) {
      if (qwenError) throw new Error(`${qwenError}；Provider fallback failed: ${error.message || error}`);
      throw error;
    }
  }

  async function streamText(api, prompt, onDelta, options) {
    const opts = options || {};
    let qwenError = null;
    if (opts.preferQwen !== false && api && typeof api.qwenStream === 'function') {
      const r = await api.qwenStream(prompt, onDelta, opts);
      if (r && r.ok) return r;
      qwenError = (r && r.error) || 'Qwen stream failed.';
    }
    try {
      const r = await completeWithProvider(api, prompt, { ...opts, stream: false });
      if (typeof onDelta === 'function') onDelta(r.text);
      return { ok: true, text: r.text, source: r.source, model: r.model };
    } catch (error) {
      if (qwenError) return { ok: false, error: `${qwenError}；Provider fallback failed: ${error.message || error}` };
      return { ok: false, error: error.message || String(error) };
    }
  }

  root.DuoliProviderCompletion = {
    completeText,
    completeWithProvider,
    isProviderReady,
    listReadyProviders,
    sortProviders,
    streamText,
  };
})(typeof window !== 'undefined' ? window : globalThis);
