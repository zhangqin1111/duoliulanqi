const { createProviderRegistry } = require('../src/electron/ai-providers/provider-registry');

async function main() {
  const registry = createProviderRegistry({
    getQwenKeyStatus: () => ({ ok: true, source: 'test' }),
    qwenChatCompletion: async (prompt) => `mock result for: ${prompt}`,
  });

  const list = registry.list();
  if (!list.some((provider) => provider.id === 'qwen')) {
    throw new Error('Qwen provider is not registered');
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
