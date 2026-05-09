'use strict';

const { createEvidencePack } = require('./evidence-pack');
const { scoreEvidencePack } = require('./evidence-scorer');

function getEnv(env, key) {
  return env && Object.prototype.hasOwnProperty.call(env, key) ? env[key] : process.env[key];
}

function normalizeSearchResult(item, index, query) {
  const source = item || {};
  return {
    id: source.id || `S${index + 1}`,
    title: source.title || source.name || source.headline || '未命名证据',
    source: source.source || source.provider || source.displayLink || source.siteName || '',
    url: source.url || source.link || '',
    publishedAt: source.publishedAt || source.date || '',
    capturedAt: new Date().toISOString(),
    snippet: source.snippet || source.description || source.summary || '',
    evidenceType: source.evidenceType || 'search',
    credibility: source.credibility || 45,
    relatedClaims: source.relatedClaims || [query],
  };
}

function collectResultsFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  if (payload.webPages && Array.isArray(payload.webPages.value)) return payload.webPages.value;
  if (Array.isArray(payload.organic_results)) return payload.organic_results;
  return [];
}

function mapBingResult(item) {
  return {
    title: item.name,
    source: item.displayUrl || '',
    url: item.url,
    snippet: item.snippet,
    evidenceType: 'search',
    credibility: 55,
  };
}

function mapSerpApiResult(item) {
  return {
    title: item.title,
    source: item.displayed_link || item.source || '',
    url: item.link,
    snippet: item.snippet,
    evidenceType: 'search',
    credibility: 50,
  };
}

function createEvidenceSearchProvider(options = {}) {
  const fetchImpl = options.fetchImpl || global.fetch;
  const env = options.env || process.env;
  const endpoint = getEnv(env, 'DUOLI_EVIDENCE_SEARCH_ENDPOINT');
  const bingKey = getEnv(env, 'DUOLI_BING_SEARCH_KEY');
  const serpKey = getEnv(env, 'DUOLI_SERPAPI_KEY');

  function status() {
    if (endpoint) return { ok: true, provider: 'custom', source: 'DUOLI_EVIDENCE_SEARCH_ENDPOINT' };
    if (bingKey) return { ok: true, provider: 'bing', source: 'DUOLI_BING_SEARCH_KEY' };
    if (serpKey) return { ok: true, provider: 'serpapi', source: 'DUOLI_SERPAPI_KEY' };
    return {
      ok: false,
      provider: 'disabled',
      source: 'missing',
      message: '未配置搜索密钥，证据层将只生成待核验查询计划。',
    };
  }

  async function fetchJson(url, init) {
    if (typeof fetchImpl !== 'function') throw new Error('fetch is not available in this runtime.');
    const res = await fetchImpl(url, init);
    if (!res || !res.ok) {
      const code = res && res.status ? res.status : 'network';
      throw new Error(`Evidence search failed: ${code}`);
    }
    return res.json();
  }

  async function searchOne(query, limit) {
    const q = String(query || '').trim();
    if (!q) return [];
    if (endpoint) {
      const data = await fetchJson(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: q, limit }),
      });
      return collectResultsFromPayload(data).map((item, index) => normalizeSearchResult(item, index, q));
    }
    if (bingKey) {
      const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(q)}&count=${limit}`;
      const data = await fetchJson(url, { headers: { 'Ocp-Apim-Subscription-Key': bingKey } });
      return collectResultsFromPayload(data).map(mapBingResult).map((item, index) => normalizeSearchResult(item, index, q));
    }
    if (serpKey) {
      const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(q)}&num=${limit}&api_key=${encodeURIComponent(serpKey)}`;
      const data = await fetchJson(url);
      return collectResultsFromPayload(data).map(mapSerpApiResult).map((item, index) => normalizeSearchResult(item, index, q));
    }
    return [];
  }

  async function searchEvidence({ question, taskType, queries, limit = 5 } = {}) {
    const active = status();
    const queryList = Array.from(new Set((Array.isArray(queries) ? queries : []).map((q) => String(q || '').trim()).filter(Boolean)));
    if (!active.ok || !queryList.length) {
      return {
        ok: active.ok,
        status: active,
        pack: createEvidencePack({ question, queries: queryList, items: [] }),
        score: { level: 'none', score: 0 },
      };
    }
    const batches = await Promise.all(queryList.map((query) => searchOne(query, limit).catch(() => [])));
    const items = batches.flat().slice(0, Math.max(1, limit) * queryList.length);
    const pack = createEvidencePack({
      question,
      taskType,
      queries: queryList,
      items,
      summary: items.length ? `已从 ${active.provider} 获取 ${items.length} 条候选证据。` : '未检索到候选证据。',
    });
    return { ok: true, status: active, pack, score: scoreEvidencePack(pack) };
  }

  return {
    status,
    searchEvidence,
  };
}

module.exports = {
  createEvidenceSearchProvider,
  normalizeSearchResult,
};
