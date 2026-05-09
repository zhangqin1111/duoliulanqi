'use strict';

function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function text(value, fallback) {
  const out = String(value == null ? '' : value).trim();
  return out || fallback || '';
}

function score(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function clipText(value, max) {
  const out = text(value);
  if (!out || !max || out.length <= max) return out;
  return `${out.slice(0, max).trim()}…`;
}

function splitVerdict(value) {
  const source = text(value, '暂未形成明确裁决');
  const parts = source
    .replace(/[。；;]+/g, '。')
    .split('。')
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    headline: clipText(parts[0] || source, 42),
    detail: clipText(parts.slice(1).join('。') || source, 120),
  };
}

function time(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toLocaleString('zh-CN', { hour12: false });
  return date.toLocaleString('zh-CN', { hour12: false });
}

function statusLabel(status) {
  return (
    {
      strong: '强结论',
      weak: '弱结论',
      disputed: '存在分歧',
      insufficient: '信息不足',
    }[status] || status || '待核验'
  );
}

function renderTags(items, empty) {
  const list = array(items).map((item) => text(item)).filter(Boolean);
  if (!list.length) return `<span class="tag tag--muted">${escapeHtml(empty || '暂无')}</span>`;
  return list.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join('');
}

module.exports = {
  array,
  clipText,
  escapeHtml,
  renderTags,
  score,
  splitVerdict,
  statusLabel,
  text,
  time,
};
