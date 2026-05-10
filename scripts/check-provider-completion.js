const fs = require('fs');
const path = require('path');
const vm = require('vm');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadProviderCompletion() {
  const code = fs.readFileSync(path.join(__dirname, '..', 'src/electron/renderer/provider-completion.js'), 'utf8');
  const sandbox = { globalThis: {} };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'provider-completion.js' });
  return sandbox.DuoliProviderCompletion;
}

async function main() {
  const completion = loadProviderCompletion();
  assert(completion && typeof completion.completeText === 'function', 'provider completion module missing');

  const qwenApi = {
    qwenComplete: async () => ({ ok: true, text: 'qwen-ok' }),
  };
  const qwenResult = await completion.completeText(qwenApi, 'prompt');
  assert(qwenResult.text === 'qwen-ok' && qwenResult.source === 'qwen', 'qwen should be preferred when available');

  const fallbackApi = {
    qwenComplete: async () => ({ ok: false, error: 'missing qwen key' }),
    listAiProviders: async () => ({
      providers: [
        { id: 'zhipu', label: 'Zhipu', model: 'glm', capabilities: { complete: true }, status: { ok: true } },
        { id: 'deepseek', label: 'DeepSeek', model: 'deepseek-chat', capabilities: { complete: true }, status: { ok: true } },
      ],
    }),
    providerComplete: async (providerId) => ({ ok: true, result: { ok: true, text: `fallback-${providerId}` } }),
  };
  const fallbackResult = await completion.completeText(fallbackApi, 'prompt');
  assert(fallbackResult.text === 'fallback-deepseek', 'provider fallback should use priority order');

  let streamed = '';
  const streamResult = await completion.streamText(fallbackApi, 'prompt', (delta) => {
    streamed += delta;
  });
  assert(streamResult.ok && streamed === 'fallback-deepseek', 'stream fallback should emit provider text');

  console.log('Provider completion check passed');
}

main();
