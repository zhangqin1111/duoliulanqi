'use strict';

const TYPE_WEIGHT = {
  official: 95,
  docs: 88,
  media: 76,
  user_file: 72,
  search: 58,
  social: 42,
};

function scoreEvidenceItem(item) {
  const typeScore = TYPE_WEIGHT[item && item.evidenceType] || 50;
  const hasUrl = item && item.url ? 8 : 0;
  const hasDate = item && (item.publishedAt || item.capturedAt) ? 6 : 0;
  const hasSnippet = item && item.snippet && item.snippet.length > 20 ? 6 : 0;
  const manual = Number(item && item.credibility);
  const base = Number.isFinite(manual) && manual > 0 ? manual : typeScore;
  return Math.max(0, Math.min(100, Math.round(base * 0.8 + hasUrl + hasDate + hasSnippet)));
}

function scoreEvidencePack(pack) {
  const items = pack && Array.isArray(pack.items) ? pack.items : [];
  if (!items.length) {
    return {
      score: 0,
      level: 'none',
      reason: '没有可用证据。',
    };
  }
  const scores = items.map(scoreEvidenceItem);
  const avg = Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
  const level = avg >= 80 ? 'strong' : avg >= 60 ? 'medium' : avg >= 40 ? 'weak' : 'insufficient';
  return {
    score: avg,
    level,
    reason: `证据数量 ${items.length}，平均可信度 ${avg}。`,
  };
}

module.exports = {
  TYPE_WEIGHT,
  scoreEvidenceItem,
  scoreEvidencePack,
};
