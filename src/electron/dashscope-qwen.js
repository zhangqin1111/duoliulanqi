const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const QWEN_COMPAT_URL =
  process.env.DUOLI_QWEN_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

function readKeyFromUserData() {
  try {
    if (!app || typeof app.getPath !== 'function') return '';
    const filePath = path.join(app.getPath('userData'), 'dashscope-api-key.txt');
    if (!fs.existsSync(filePath)) return '';
    return fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/)[0].trim();
  } catch (error) {
    return '';
  }
}

function getDashScopeApiKey() {
  const fromEnv = process.env.DUOLI_DASHSCOPE_API_KEY || process.env.DASHSCOPE_API_KEY || '';
  if (String(fromEnv).trim()) return String(fromEnv).trim();
  return readKeyFromUserData();
}

function getQwenKeyStatus() {
  const envRaw = process.env.DUOLI_DASHSCOPE_API_KEY || process.env.DASHSCOPE_API_KEY || '';
  if (envRaw && String(envRaw).trim().length >= 8) return { ok: true, source: 'env' };
  const file = readKeyFromUserData();
  if (file && file.length >= 8) return { ok: true, source: 'file' };
  return { ok: false, source: 'none' };
}

function isQwenConfigured() {
  return getQwenKeyStatus().ok;
}

function saveDashScopeApiKeyToFile(key) {
  const value = String(key || '').trim();
  if (value.length < 8) throw new Error('密钥无效或过短');
  const dir = app.getPath('userData');
  const filePath = path.join(dir, 'dashscope-api-key.txt');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, `${value}\n`, 'utf8');
}

function clearDashScopeApiKeyFile() {
  const filePath = path.join(app.getPath('userData'), 'dashscope-api-key.txt');
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function optionNumber(options, key, envName, fallback) {
  const fromOptions = options && Number(options[key]);
  if (Number.isFinite(fromOptions) && fromOptions > 0) return fromOptions;
  const fromEnv = Number(process.env[envName]);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return fallback;
}

function retryCount(options, envName, fallback) {
  const value = optionNumber(options, 'retries', envName, fallback);
  return Math.max(0, Math.min(4, Math.floor(value)));
}

function isRetryableError(error) {
  const status = Number(error && error.status);
  const message = String((error && error.message) || error || '');
  return (
    status === 429 ||
    status >= 500 ||
    /timeout|超时|AbortError|fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i.test(message)
  );
}

async function withRetry(operation, options, envName, fallbackRetries) {
  const retries = retryCount(options, envName, fallbackRetries);
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !isRetryableError(error)) break;
      await sleep(Math.min(1600 * (attempt + 1), 5000));
    }
  }
  throw lastError;
}

function requireApiKey() {
  const apiKey = getDashScopeApiKey();
  if (!apiKey) {
    throw new Error('未配置千问 API Key：请在应用内“API 设置”保存，或设置 DUOLI_DASHSCOPE_API_KEY / DASHSCOPE_API_KEY。');
  }
  return apiKey;
}

function timeoutError(timeoutMs) {
  return new Error(`DashScope 请求超时（${timeoutMs}ms）`);
}

function buildRequestBody(model, userPrompt, stream) {
  return JSON.stringify({
    model,
    stream: !!stream,
    messages: [{ role: 'user', content: userPrompt }],
  });
}

async function qwenChatCompletion(userPrompt, options = {}) {
  const apiKey = requireApiKey();
  const model = process.env.DUOLI_QWEN_MODEL || 'qwen-plus';
  const timeoutMs = Math.max(3000, optionNumber(options, 'timeoutMs', 'DUOLI_QWEN_COMPLETE_TIMEOUT_MS', 90000));

  return withRetry(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(QWEN_COMPAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: buildRequestBody(model, userPrompt, false),
      });
    } catch (error) {
      if (error && error.name === 'AbortError') throw timeoutError(timeoutMs);
      throw error;
    } finally {
      clearTimeout(timer);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        (data.error && (data.error.message || data.error.code)) ||
        data.message ||
        `${res.status} ${res.statusText || ''}`.trim();
      const error = new Error(msg || 'DashScope 请求失败');
      error.status = res.status;
      throw error;
    }

    const content = data.choices && data.choices[0] && data.choices[0].message;
    const text = content && content.content;
    if (!text || !String(text).trim()) throw new Error('千问 API 返回内容为空');
    return String(text).trim();
  }, options, 'DUOLI_QWEN_COMPLETE_RETRIES', 1);
}

function consumeSseLine(line, onChunk) {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.startsWith('data:')) return '';
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === '[DONE]') return '';
  try {
    const parsed = JSON.parse(payload);
    const delta = parsed.choices?.[0]?.delta?.content || '';
    if (delta && typeof onChunk === 'function') onChunk(delta);
    return delta;
  } catch (error) {
    return '';
  }
}

async function qwenChatCompletionStream(userPrompt, onChunk, options = {}) {
  const apiKey = requireApiKey();
  const model = process.env.DUOLI_QWEN_MODEL || 'qwen-plus';
  const timeoutMs = Math.max(3000, optionNumber(options, 'timeoutMs', 'DUOLI_QWEN_STREAM_TIMEOUT_MS', 240000));

  return withRetry(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(QWEN_COMPAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: buildRequestBody(model, userPrompt, true),
      });
    } catch (error) {
      clearTimeout(timer);
      if (error && error.name === 'AbortError') throw timeoutError(timeoutMs);
      throw error;
    }

    if (!res.ok) {
      clearTimeout(timer);
      const errData = await res.json().catch(() => ({}));
      const msg =
        (errData.error && (errData.error.message || errData.error.code)) ||
        errData.message ||
        `${res.status} ${res.statusText || ''}`.trim();
      const error = new Error(msg || 'DashScope 流式请求失败');
      error.status = res.status;
      throw error;
    }

    const decoder = new TextDecoder('utf-8');
    let full = '';
    let buf = '';
    try {
      for await (const chunk of res.body) {
        buf += decoder.decode(chunk, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          full += consumeSseLine(line, onChunk);
        }
      }
      full += consumeSseLine(buf, onChunk);
    } finally {
      clearTimeout(timer);
    }

    if (!full.trim()) throw new Error('千问 API 流式返回内容为空');
    return full.trim();
  }, options, 'DUOLI_QWEN_STREAM_RETRIES', 1);
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
