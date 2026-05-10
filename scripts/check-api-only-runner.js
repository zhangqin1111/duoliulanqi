const { createApiOnlyAnalysisRunner, buildProviderPrompt } = require('../src/electron/renderer/api-only-analysis-runner');

function createMockApi(overrides = {}) {
  const providers =
    overrides.providers ||
    [
      {
        id: 'qwen',
        label: 'Qwen',
        model: 'qwen-plus',
        capabilities: { complete: true },
        status: { ok: true },
      },
      {
        id: 'deepseek',
        label: 'DeepSeek',
        model: 'deepseek-chat',
        capabilities: { complete: true },
        status: { ok: false },
      },
      {
        id: 'claude',
        label: 'Claude',
        model: 'claude-3-5-haiku-latest',
        capabilities: { complete: true },
        status: { ok: true },
      },
    ];
  return {
    listAiProviders: async () => ({ ok: true, providers }),
    providerComplete: async (providerId, prompt) => ({
      ok: true,
      result: {
        ok: true,
        text: `${providerId} answer for ${prompt.slice(0, 18)}`,
        providerId,
        model: providers.find((item) => item.id === providerId)?.model || '',
        durationMs: 12,
        cost: 0,
      },
    }),
  };
}

async function main() {
  const statuses = [];
  const stages = [];
  const runner = createApiOnlyAnalysisRunner({
    getApi: () => createMockApi(),
    setSummaryStatus: (text) => statuses.push(text),
    setFlowStage: (...args) => stages.push(args),
  });
  const prompt = buildProviderPrompt('iphone17各个机型对比，哪个性价比最高', {
    taskRoute: { label: '消费选购决策', task_type: 'consumer_purchase' },
  });
  if (!prompt.includes('消费选购决策') || !prompt.includes('iphone17')) {
    throw new Error('API-only provider prompt missing task context.');
  }

  const ready = await runner.listReadyProviders();
  if (ready.length !== 2 || ready[0].id !== 'qwen' || ready[1].id !== 'claude') {
    throw new Error(`Unexpected ready provider order: ${ready.map((item) => item.id).join(',')}`);
  }

  const results = await runner.runConcurrentAsk('iphone17各个机型对比，哪个性价比最高', {
    taskRoute: { label: '消费选购决策', task_type: 'consumer_purchase' },
  });
  if (results.length !== 2 || !results.every((item) => item.r && item.r.ok && item.cfg && item.cfg.providerMode === 'api')) {
    throw new Error('API-only runner did not return normalized model results.');
  }
  if (!statuses.length || !stages.length) {
    throw new Error('API-only runner did not emit progress signals.');
  }

  const emptyRunner = createApiOnlyAnalysisRunner({
    getApi: () => createMockApi({ providers: [] }),
  });
  let failed = false;
  try {
    await emptyRunner.runConcurrentAsk('测试');
  } catch (error) {
    failed = /没有可用的 API 模型/.test(error.message);
  }
  if (!failed) throw new Error('API-only runner should fail when no providers are ready.');

  console.log('API-only runner check passed');
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
