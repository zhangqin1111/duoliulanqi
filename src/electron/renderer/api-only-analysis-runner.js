(function attachApiOnlyAnalysisRunner(root) {
  const DEFAULT_PROVIDER_LIMIT = 4;
  const PROVIDER_PRIORITY = ['qwen', 'deepseek', 'openai', 'claude', 'zhipu'];

  function sortProviders(providers) {
    const rank = new Map(PROVIDER_PRIORITY.map((id, index) => [id, index]));
    return providers.slice().sort((a, b) => {
      const ar = rank.has(a.id) ? rank.get(a.id) : 99;
      const br = rank.has(b.id) ? rank.get(b.id) : 99;
      return ar - br || String(a.id).localeCompare(String(b.id));
    });
  }

  function isProviderReady(provider) {
    return !!(provider && provider.capabilities && provider.capabilities.complete && provider.status && provider.status.ok);
  }

  function buildProviderPrompt(question, context) {
    const taskRoute = context && context.taskRoute ? context.taskRoute : {};
    const label = taskRoute.label || taskRoute.task_type || '通用多源分析';
    return [
      '你是多源大模型内容对比系统中的一个独立模型证人。',
      '请直接回答用户问题，并尽量给出可核验的事实边界、依据、风险和不确定项。',
      '不要评价其他模型，不要输出 JSON，不要写成报告，只输出你自己的判断材料。',
      `任务类型：${label}`,
      taskRoute.risk_note ? `风险边界：${taskRoute.risk_note}` : '',
      '',
      `用户问题：${question}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  function normalizeProviderResult(provider, response) {
    const result = response && response.result ? response.result : response;
    if (response && response.ok === false) {
      return { ok: false, error: response.error || 'provider failed' };
    }
    if (!result || result.ok === false) {
      return { ok: false, error: (result && result.error) || 'provider returned no result' };
    }
    return {
      ok: true,
      text: String(result.text || '').trim(),
      providerId: result.providerId || provider.id,
      model: result.model || provider.model || '',
      durationMs: result.durationMs || 0,
      cost: result.cost || 0,
    };
  }

  function createApiOnlyAnalysisRunner(deps) {
    function api() {
      return typeof deps.getApi === 'function' ? deps.getApi() : deps.api;
    }

    function setSummaryStatus(text) {
      if (typeof deps.setSummaryStatus === 'function') deps.setSummaryStatus(text);
    }

    async function listReadyProviders(limit) {
      const bridge = api();
      if (!bridge || typeof bridge.listAiProviders !== 'function') {
        throw new Error('API provider bridge is not available.');
      }
      const response = await bridge.listAiProviders();
      const providers = response && Array.isArray(response.providers) ? response.providers : [];
      const ready = sortProviders(providers.filter(isProviderReady));
      return ready.slice(0, Math.max(1, Number(limit) || DEFAULT_PROVIDER_LIMIT));
    }

    async function askProvider(provider, question, context) {
      const bridge = api();
      if (!bridge || typeof bridge.providerComplete !== 'function') {
        throw new Error('API provider completion bridge is not available.');
      }
      const prompt = buildProviderPrompt(question, context || {});
      const started = Date.now();
      try {
        const response = await bridge.providerComplete(provider.id, prompt, {
          timeoutMs: (context && context.timeoutMs) || 120000,
          maxTokens: (context && context.maxTokens) || 4096,
        });
        const result = normalizeProviderResult(provider, response);
        if (!result.ok || !result.text) {
          return { ok: false, error: result.error || 'empty provider reply' };
        }
        return { ...result, durationMs: result.durationMs || Date.now() - started };
      } catch (error) {
        return { ok: false, error: error && error.message ? error.message : String(error) };
      }
    }

    async function runConcurrentAsk(question, context) {
      const providers = await listReadyProviders(context && context.maxProviders);
      if (!providers.length) {
        throw new Error('没有可用的 API 模型。请在 API 设置或环境变量里配置至少一个模型密钥。');
      }
      setSummaryStatus(`API-only 多模型并发中：${providers.map((item) => item.label || item.id).join(' / ')}`);
      if (typeof deps.setFlowStage === 'function') {
        deps.setFlowStage(
          'dispatch',
          '正在分发给 API 模型',
          `已选择 ${providers.length} 个可用 API 模型：${providers.map((item) => item.label || item.id).join('、')}`,
          'active'
        );
      }
      const results = await Promise.all(
        providers.map(async (provider) => {
          const r = await askProvider(provider, question, context || {});
          return {
            cfg: {
              id: provider.id,
              name: provider.label || provider.id,
              model: provider.model || '',
              providerMode: 'api',
            },
            r,
          };
        })
      );
      const okCount = results.filter((item) => item.r && item.r.ok).length;
      if (!okCount) {
        throw new Error('API-only 模式未获得任何有效模型回复。');
      }
      setSummaryStatus(`API-only 已收集 ${okCount}/${results.length} 个模型回复。`);
      return results;
    }

    return {
      askProvider,
      buildProviderPrompt,
      listReadyProviders,
      runConcurrentAsk,
    };
  }

  const api = {
    createApiOnlyAnalysisRunner,
    buildProviderPrompt,
    isProviderReady,
    sortProviders,
  };

  root.DuoliApiOnlyAnalysisRunner = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
