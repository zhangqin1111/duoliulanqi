'use strict';

const { assertProvider } = require('./provider-contract');
const { createQwenProvider } = require('./qwen-provider');
const { createOpenAICompatibleProvider } = require('./openai-compatible-provider');

function createProviderRegistry(deps) {
  const providers = new Map();

  function register(provider) {
    const checked = assertProvider(provider);
    providers.set(checked.id, checked);
    return checked;
  }

  function get(id) {
    return providers.get(id);
  }

  function list() {
    return Array.from(providers.values()).map((provider) => ({
      id: provider.id,
      label: provider.label,
      model: provider.model || '',
      capabilities: provider.capabilities,
      status: typeof provider.status === 'function' ? provider.status() : { ok: true },
    }));
  }

  async function complete(id, prompt, options) {
    const provider = get(id);
    if (!provider) throw new Error(`Unknown AI provider: ${id}`);
    return provider.complete(prompt, options || {});
  }

  register(createQwenProvider(deps || {}));
  register(
    createOpenAICompatibleProvider({
      id: 'deepseek',
      label: 'DeepSeek',
      apiKeyEnv: 'DUOLI_DEEPSEEK_API_KEY',
      modelEnv: 'DUOLI_DEEPSEEK_MODEL',
      defaultModel: 'deepseek-chat',
      baseUrlEnv: 'DUOLI_DEEPSEEK_API_URL',
      baseUrl: 'https://api.deepseek.com/chat/completions',
    })
  );
  register(
    createOpenAICompatibleProvider({
      id: 'openai',
      label: 'OpenAI',
      apiKeyEnv: 'DUOLI_OPENAI_API_KEY',
      modelEnv: 'DUOLI_OPENAI_MODEL',
      defaultModel: 'gpt-4.1-mini',
      baseUrlEnv: 'DUOLI_OPENAI_API_URL',
      baseUrl: 'https://api.openai.com/v1/chat/completions',
    })
  );
  register(
    createOpenAICompatibleProvider({
      id: 'zhipu',
      label: '智谱 GLM',
      apiKeyEnv: 'DUOLI_ZHIPU_API_KEY',
      modelEnv: 'DUOLI_ZHIPU_MODEL',
      defaultModel: 'glm-4-flash',
      baseUrlEnv: 'DUOLI_ZHIPU_API_URL',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    })
  );

  return {
    register,
    get,
    list,
    complete,
  };
}

module.exports = {
  createProviderRegistry,
};
