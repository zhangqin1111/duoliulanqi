'use strict';

const { array, clipText, escapeHtml, renderTags, text } = require('../fact-template-utils');

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function withMeta(report, taskType, templateVariant) {
  const data = clone(report);
  data.meta = {
    ...(data.meta || {}),
    task_type: (data.meta && data.meta.task_type) || taskType,
    template_variant: templateVariant,
  };
  return data;
}

function appendUnique(list, items) {
  const seen = new Set(ensureArray(list).map((item) => String(item)));
  const out = ensureArray(list).slice();
  for (const item of items) {
    const text = String(item || '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function injectBeforeEvidenceGrid(html, scenarioHtml) {
  const source = String(html || '');
  const marker = '<div class="grid">';
  if (!scenarioHtml || !source.includes(marker)) return source;
  return source.replace(marker, `${scenarioHtml}\n        ${marker}`);
}

function renderScenarioShell({ eyebrow, title, subtitle, children, className }) {
  const extraClass = text(className);
  return `
        <section class="scenario-page page-break${extraClass ? ` ${escapeHtml(extraClass)}` : ''}">
          <section class="section-title card--wide">
            <span>${escapeHtml(eyebrow)}</span>
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(subtitle)}</p>
          </section>
          <div class="grid">
            ${children}
          </div>
        </section>`;
}

function renderScenarioCard(title, badge, body, tags) {
  return `
            <section class="card">
              <header class="card-head"><span>${escapeHtml(title)}</span><b>${escapeHtml(badge || 'Lens')}</b></header>
              <p>${escapeHtml(clipText(body, 180) || '暂无明确结论，建议继续补充证据。')}</p>
              <div class="tags">${renderTags(tags, '待补充')}</div>
            </section>`;
}

function renderScenarioList(title, badge, items, fallback) {
  const list = array(items)
    .map((item) => {
      if (typeof item === 'string') return { title: item, body: '' };
      return {
        title: text(item.label || item.title || item.name || item.step, '待核验事项'),
        body: text(item.note || item.body || item.description || item.reason || item.value, ''),
      };
    })
    .filter((item) => item.title || item.body)
    .slice(0, 5);
  const safeList = list.length ? list : array(fallback).slice(0, 5);
  return `
            <section class="card">
              <header class="card-head"><span>${escapeHtml(title)}</span><b>${escapeHtml(badge || 'List')}</b></header>
              <div class="fact-list">
                ${safeList
                  .map(
                    (item, index) => `
                      <article class="fact">
                        <b>${String(index + 1).padStart(2, '0')}</b>
                        <div>
                          <strong>${escapeHtml(text(item.title || item.label, '待核验事项'))}</strong>
                          <p>${escapeHtml(clipText(item.body || item.note || item.description, 120) || '需要继续核验证据来源。')}</p>
                        </div>
                      </article>`
                  )
                  .join('')}
              </div>
            </section>`;
}

module.exports = {
  appendUnique,
  ensureArray,
  injectBeforeEvidenceGrid,
  renderScenarioCard,
  renderScenarioList,
  renderScenarioShell,
  withMeta,
};
