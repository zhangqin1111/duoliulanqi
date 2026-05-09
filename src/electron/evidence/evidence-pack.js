'use strict';

function normalizeEvidenceItem(item, index) {
  const source = item || {};
  return {
    id: String(source.id || `E${index + 1}`),
    title: String(source.title || source.source || '未命名证据'),
    source: String(source.source || ''),
    url: String(source.url || ''),
    publishedAt: String(source.publishedAt || ''),
    capturedAt: String(source.capturedAt || new Date().toISOString()),
    snippet: String(source.snippet || ''),
    evidenceType: String(source.evidenceType || 'search'),
    credibility: Math.max(0, Math.min(100, Math.round(Number(source.credibility) || 0))),
    relatedClaims: Array.isArray(source.relatedClaims) ? source.relatedClaims.map(String) : [],
  };
}

function createEvidencePack(input) {
  const source = input || {};
  const items = Array.isArray(source.items) ? source.items.map(normalizeEvidenceItem) : [];
  return {
    id: String(source.id || `evidence_${Date.now()}`),
    question: String(source.question || ''),
    taskType: String(source.taskType || ''),
    createdAt: String(source.createdAt || new Date().toISOString()),
    queries: Array.isArray(source.queries) ? source.queries.map(String) : [],
    items,
    summary: String(source.summary || ''),
  };
}

function evidenceByClaim(pack, claimId) {
  const id = String(claimId || '');
  return (pack && Array.isArray(pack.items) ? pack.items : []).filter((item) => item.relatedClaims.includes(id));
}

module.exports = {
  createEvidencePack,
  evidenceByClaim,
  normalizeEvidenceItem,
};
