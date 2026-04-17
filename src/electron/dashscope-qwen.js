const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const QWEN_COMPAT_URL =
  process.env.DUOLI_QWEN_API_URL ||
  'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

function readKeyFromUserData() {
  try {
    if (!app || typeof app.getPath !== 'function') return '';
    const p = path.join(app.getPath('userData'), 'dashscope-api-key.txt');
    if (!fs.existsSync(p)) return '';
    const line = fs.readFileSync(p, 'utf8').trim().split(/\r?\n/)[0];
    return line ? line.trim() : '';
  } catch (e) {
    return '';
  }
}

const BUILTIN_KEY = 'sk-a04ccc4fdca044fd81a2ad1900d1573e';

function getDashScopeApiKey() {
  const fromEnv =
    process.env.DUOLI_DASHSCOPE_API_KEY || process.env.DASHSCOPE_API_KEY || '';
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();
  const fromFile = readKeyFromUserData();
  if (fromFile && fromFile.trim()) return fromFile.trim();
  return BUILTIN_KEY;
}

function getQwenKeyStatus() {
  const envRaw = process.env.DUOLI_DASHSCOPE_API_KEY || process.env.DASHSCOPE_API_KEY || '';
  if (envRaw && String(envRaw).trim().length >= 8) {
    return { ok: true, source: 'env' };
  }
  const file = readKeyFromUserData();
  if (file && file.length >= 8) return { ok: true, source: 'file' };
  return { ok: true, source: 'builtin' };
}

function isQwenConfigured() {
  return getQwenKeyStatus().ok;
}

function saveDashScopeApiKeyToFile(key) {
  const k = String(key || '').trim();
  if (k.length < 8) throw new Error('密钥无效或过短');
  const dir = app.getPath('userData');
  const p = path.join(dir, 'dashscope-api-key.txt');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, `${k}\n`, 'utf8');
}

function clearDashScopeApiKeyFile() {
  const p = path.join(app.getPath('userData'), 'dashscope-api-key.txt');
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

async function qwenChatCompletion(userPrompt) {
  const apiKey = getDashScopeApiKey();
  if (!apiKey) {
    throw new Error(
      '未配置千问 API Key：请在应用内「API 密钥设置」保存，或设置环境变量 DUOLI_DASHSCOPE_API_KEY / DASHSCOPE_API_KEY。'
    );
  }
  const model = process.env.DUOLI_QWEN_MODEL || 'qwen-plus';
  const res = await fetch(QWEN_COMPAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data.error && (data.error.message || data.error.code)) ||
      data.message ||
      `${res.status} ${res.statusText || ''}`.trim();
    throw new Error(msg || 'DashScope 请求失败');
  }
  const content = data.choices && data.choices[0] && data.choices[0].message;
  const text = content && content.content;
  if (!text || !String(text).trim()) {
    throw new Error('千问 API 返回内容为空');
  }
  return String(text).trim();
}

/**
 * 流式调用千问：每收到一段 delta 就调用 onChunk(delta: string)，结束时 resolve 全文。
 * @param {string} userPrompt
 * @param {(delta: string) => void} onChunk
 * @returns {Promise<string>} 完整文本
 */
async function qwenChatCompletionStream(userPrompt, onChunk) {
  const apiKey = getDashScopeApiKey();
  if (!apiKey) {
    throw new Error(
      '未配置千问 API Key：请在应用内「API 密钥设置」保存，或设置环境变量 DUOLI_DASHSCOPE_API_KEY / DASHSCOPE_API_KEY。'
    );
  }
  const model = process.env.DUOLI_QWEN_MODEL || 'qwen-plus';
  const res = await fetch(QWEN_COMPAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg =
      (errData.error && (errData.error.message || errData.error.code)) ||
      errData.message ||
      `${res.status} ${res.statusText || ''}`.trim();
    throw new Error(msg || 'DashScope 流式请求失败');
  }

  // 读取 SSE 流
  const decoder = new TextDecoder('utf-8');
  let full = '';
  let buf = '';

  for await (const chunk of res.body) {
    buf += decoder.decode(chunk, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop(); // 最后一行可能不完整，留到下次
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') break;
      try {
        const parsed = JSON.parse(payload);
        const delta = parsed.choices?.[0]?.delta?.content || '';
        if (delta) {
          full += delta;
          onChunk(delta);
        }
      } catch (_) {}
    }
  }
  // 处理缓冲区剩余
  if (buf.trim().startsWith('data:')) {
    const payload = buf.trim().slice(5).trim();
    if (payload && payload !== '[DONE]') {
      try {
        const parsed = JSON.parse(payload);
        const delta = parsed.choices?.[0]?.delta?.content || '';
        if (delta) { full += delta; onChunk(delta); }
      } catch (_) {}
    }
  }

  if (!full.trim()) throw new Error('千问 API 流式返回内容为空');
  return full.trim();
}

module.exports = {
  getDashScopeApiKey,
  getQwenKeyStatus,
  isQwenConfigured,
  saveDashScopeApiKeyToFile,
  clearDashScopeApiKeyFile,
  qwenChatCompletion,
  qwenChatCompletionStream,
};
