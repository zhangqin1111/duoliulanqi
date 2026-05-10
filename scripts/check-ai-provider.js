const { createProviderRegistry } = require('../src/electron/ai-providers/provider-registry');

async function main() {
  const registry = createProviderRegistry({
    getQwenKeyStatus: () => ({ ok: true, source: 'test' }),
    qwenChatCompletion: async (prompt) => `mock result for: ${prompt}`,
  });

  const list = registry.list();
  const requiredProviders = ['qwen', 'deepseek', 'openai', 'zhipu', 'claude'];
  const ids = new Set(list.map((provider) => provider.id));
  for (const id of requiredProviders) {
    if (!ids.has(id)) {
      throw new Error(`${id} provider is not registered`);
    }
  }
  for (const provider of list) {
    if (!provider.capabilities || provider.capabilities.complete !== true) {
      throw new Error(`${provider.id} provider missing completion capability`);
    }
    if (!provider.model) {
      throw new Error(`${provider.id} provider missing default model`);
    }
  }
  const result = await registry.complete('qwen', '测试 provider');
  if (!result.ok || !result.text || result.providerId !== 'qwen') {
    throw new Error('Qwen provider did not return normalized result');
  }
  if (!result.durationMs && result.durationMs !== 0) {
    throw new Error('Provider result missing duration');
  }
  console.log(`AI provider check passed: ${list.map((item) => item.id).join(', ')}`);
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
