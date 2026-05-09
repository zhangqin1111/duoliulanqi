'use strict';

function escapeXml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function renderOpinionGauge(value, label) {
  const score = Math.round(clamp(value, 0, 100));
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  return `
    <svg viewBox="0 0 180 180" class="fact-chart fact-chart--gauge" role="img" aria-label="舆情温度 ${score}">
      <defs>
        <linearGradient id="gaugeGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#356bff" />
          <stop offset="100%" stop-color="#ffad33" />
        </linearGradient>
      </defs>
      <circle cx="90" cy="90" r="${radius}" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="16" />
      <circle cx="90" cy="90" r="${radius}" fill="none" stroke="url(#gaugeGradient)" stroke-width="16"
        stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${circumference.toFixed(1)}"
        transform="rotate(-90 90 90)" />
      <text x="90" y="84" text-anchor="middle" font-size="34" font-weight="900" fill="#fff">${score}</text>
      <text x="90" y="108" text-anchor="middle" font-size="12" font-weight="800" fill="rgba(255,255,255,.66)">${escapeXml(label || 'Opinion Heat')}</text>
    </svg>
  `;
}

function renderBarStrips(items, options) {
  const list = safeArray(items).filter((item) => item && String(item.label || '').trim());
  if (!list.length) return '<div class="mini-empty">暂无可视化数据</div>';
  const max = Math.max(...list.map((item) => Number(item.value) || 0), 1);
  const palette = (options && options.palette) || ['#356bff', '#ffad33', '#42c67a', '#ff5d5d', '#9b7cff'];
  return `
    <div class="bar-strips">
      ${list
        .slice(0, 8)
        .map((item, idx) => {
          const value = Math.max(0, Math.round(Number(item.value) || 0));
          const width = Math.max(6, Math.round((value / max) * 100));
          const color = palette[idx % palette.length];
          return `
            <div class="bar-strip">
              <div class="bar-strip__top"><span>${escapeXml(item.label)}</span><b>${value}${item.unit || ''}</b></div>
              <i><em style="width:${width}%;background:${color}"></em></i>
              ${item.note ? `<p>${escapeXml(item.note)}</p>` : ''}
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderRiskMatrix(items) {
  const list = safeArray(items).slice(0, 6);
  if (!list.length) return '<div class="mini-empty">暂无风险矩阵数据</div>';
  const cells = list
    .map((item) => {
      const impact = Math.round(clamp(item.impact, 0, 100));
      const probability = Math.round(clamp(item.probability, 0, 100));
      const severity = impact * probability;
      const level = severity >= 5200 ? 'high' : severity >= 2600 ? 'medium' : 'low';
      return `
        <article class="risk-cell risk-cell--${level}">
          <div><strong>${escapeXml(item.title || '未命名风险')}</strong><b>${impact}/${probability}</b></div>
          <p>${escapeXml(item.mitigation || item.note || '继续核验')}</p>
        </article>
      `;
    })
    .join('');
  return `<div class="risk-matrix">${cells}</div>`;
}

function renderAxisMap(items) {
  const list = safeArray(items).slice(0, 6);
  if (!list.length) return '<div class="mini-empty">暂无阵营分布数据</div>';
  return `
    <div class="axis-map">
      ${list
        .map((item, idx) => {
          const x = clamp(item.heat, 8, 92);
          const y = clamp(100 - clamp(item.credibility, 8, 92), 12, 72);
          const size = 11 + clamp(item.weight, 0, 100) / 7;
          const labelSide = y > 58 ? 'top' : 'bottom';
          return `
            <div class="axis-dot axis-dot--${idx % 5} axis-dot--label-${labelSide}" style="left:${x}%;top:${y}%;width:${size}px;height:${size}px">
              <span>${escapeXml(item.label || `阵营${idx + 1}`)}</span>
            </div>
          `;
        })
        .join('')}
      <span class="axis-label axis-label--x">讨论热度 →</span>
      <span class="axis-label axis-label--y">可信度 ↑</span>
    </div>
  `;
}

function renderCompressionChart(funnel) {
  const raw = Math.max(0, Math.round(Number(funnel && funnel.raw_claims) || 0));
  const checked = Math.max(0, Math.round(Number(funnel && funnel.cross_checked) || 0));
  const retained = Math.max(0, Math.round(Number(funnel && funnel.followup_retained) || 0));
  const final = Math.max(0, Math.round(Number(funnel && funnel.final_evidence) || 0));
  const removed = Math.max(0, raw - final);
  const removedRate = raw ? Math.round((removed / raw) * 100) : 0;
  const steps = [
    { label: '原始主张', value: raw, color: '#8b5cf6' },
    { label: '交叉确认', value: checked, color: '#3b82f6' },
    { label: '追问保留', value: retained, color: '#f59e0b' },
    { label: '最终证据', value: final, color: '#22c55e' },
  ];
  const max = Math.max(...steps.map((step) => step.value), 1);
  return `
    <div class="compression-chart">
      <div class="compression-score">
        <strong>${removedRate}%</strong>
        <span>信息被剔除/降权</span>
      </div>
      <div class="compression-steps">
        ${steps
          .map((step, idx) => {
            const height = Math.max(18, Math.round((step.value / max) * 100));
            return `
              <article>
                <div class="compression-bar" style="height:${height}%;--bar:${step.color}"><b>${step.value}</b></div>
                <span>${escapeXml(step.label)}</span>
                ${idx < steps.length - 1 ? '<i>→</i>' : ''}
              </article>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

module.exports = {
  renderCompressionChart,
  renderOpinionGauge,
  renderBarStrips,
  renderRiskMatrix,
  renderAxisMap,
};
