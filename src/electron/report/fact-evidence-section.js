'use strict';

const { renderCompressionChart } = require('./fact-charts');
const { array, clipText, escapeHtml, renderTags, text } = require('./fact-template-utils');

function keyFactItems(items) {
  return array(items)
    .slice()
    .sort((a, b) => {
      const statusScore = { confirmed: 0, disputed: 1, uncertain: 2, polluted: 3 };
      return (statusScore[a && a.status] ?? 2) - (statusScore[b && b.status] ?? 2);
    })
    .slice(0, 4);
}

function renderFactRows(title, items, options = {}) {
  const list = array(items);
  const important = options.weighted ? keyFactItems(list) : [];
  return `
    <section class="card">
      <header class="card-head">
        <span>${escapeHtml(title)}</span>
        <b>${list.length}</b>
      </header>
      ${
        important.length
          ? `<div class="weighted-timeline">${important
              .map(
                (item, idx) => `
                  <article class="${idx === 0 ? 'is-core' : ''}">
                    <b>${idx === 0 ? '核心节点' : '次级节点'}</b>
                    <strong>${escapeHtml(text(item.time, '最近/当前'))}</strong>
                    <span>${escapeHtml(clipText(item.event || item.claim || item.fact, 34))}</span>
                  </article>
                `
              )
              .join('')}</div>`
          : ''
      }
      <div class="fact-list">
        ${
          list.length
            ? list
                .slice(0, 10)
                .map(
                  (item, idx) => `
                    <article class="fact fact--${escapeHtml(text(item.status, 'uncertain'))}">
                      <div class="fact-num">${String(idx + 1).padStart(2, '0')}</div>
                      <div>
                        <div class="fact-time">${escapeHtml(text(item.time, '最近/当前'))}</div>
                        <h4>${escapeHtml(text(item.event || item.claim || item.fact, '待核验事实点'))}</h4>
                        ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ''}
                        <div class="tags">${renderTags(item.sources || item.models, '未标注来源')}</div>
                      </div>
                    </article>
                  `
                )
                .join('')
            : '<p class="empty">暂无结构化事实。</p>'
        }
      </div>
    </section>
  `;
}

function renderFunnel(funnel) {
  const rows = [
    ['原始 claim', funnel && funnel.raw_claims],
    ['交叉确认', funnel && funnel.cross_checked],
    ['追问保留', funnel && funnel.followup_retained],
    ['污染剔除', funnel && funnel.pollution_removed],
    ['最终证据', funnel && funnel.final_evidence],
  ];
  const max = Math.max(...rows.map(([, value]) => Number(value) || 0), 1);
  return `
    <section class="card card--wide funnel-hero-card">
      <header class="card-head"><span>去伪存真证据漏斗</span><b>Funnel</b></header>
      ${renderCompressionChart(funnel)}
      <div class="funnel">
        ${rows
          .map(([label, value]) => {
            const width = Math.max(14, Math.round(((Number(value) || 0) / max) * 100));
            return `
              <div class="funnel-row">
                <span>${escapeHtml(label)}</span>
                <i><em style="width:${width}%"></em></i>
                <b>${escapeHtml(String(value || 0))}</b>
              </div>
            `;
          })
          .join('')}
      </div>
    </section>
  `;
}

function renderDiffs(disputeMap) {
  const items = array(disputeMap && disputeMap.items);
  return `
    <section class="card card--wide page-break">
      <header class="card-head"><span>差异详情侦查台</span><b>${items.length}</b></header>
      <p class="summary-line">${escapeHtml(text(disputeMap && disputeMap.summary, '暂未形成争议总览'))}</p>
      <div class="diff-list">
        ${
          items.length
            ? items
                .map(
                  (diff) => `
                    <article class="diff diff--${escapeHtml(text(diff.severity, 'medium'))}">
                      <div class="diff-title">
                        <span>${escapeHtml(text(diff.id))}</span>
                        <h4>问题：${escapeHtml(text(diff.title || diff.topic, '未命名差异点'))}</h4>
                        <b>${escapeHtml(text(diff.type, '差异'))} · ${escapeHtml(text(diff.severity, 'medium'))}</b>
                      </div>
                      <div class="diff-verdict-lines">
                        <p><strong>裁决：</strong>${escapeHtml(text(diff.retained_judgment || diff.followup_summary, '仅保留可交叉验证部分'))}</p>
                        <p><strong>原因：</strong>${escapeHtml(text(diff.why_it_matters, '信源不满足交叉验证，影响最终可信判断'))}</p>
                      </div>
                      <div class="claim-grid">
                        ${array(diff.model_claims || diff.claims)
                          .map(
                            (claim) => `
                              <div class="claim">
                                <strong>${escapeHtml(text(claim && claim.model, '未知模型'))}</strong>
                                <p>${escapeHtml(text(claim && claim.claim))}</p>
                              </div>
                            `
                          )
                          .join('')}
                      </div>
                    </article>
                  `
                )
                .join('')
            : '<p class="empty">暂无差异详情。</p>'
        }
      </div>
    </section>
  `;
}

function renderModels(models) {
  const list = array(models);
  return `
    <section class="card">
      <header class="card-head"><span>模型证人画像</span><b>${list.length}</b></header>
      <div class="model-list">
        ${
          list.length
            ? list
                .map((model) => {
                  const s = model.scores || {};
                  const avg = Math.round(
                    ['fact_fidelity', 'logic_consistency', 'information_density', 'pollution_control']
                      .map((key) => Number(s[key]) || 0)
                      .reduce((a, b) => a + b, 0) / 4
                  );
                  return `
                    <article class="model">
                      <div>
                        <h4>${escapeHtml(text(model.model, '未知模型'))}</h4>
                        <span>${escapeHtml(text(model.witness_type, '待观察证人'))}</span>
                      </div>
                      <b>${avg}<small>/100</small></b>
                      <p>优势：${escapeHtml(array(model.strengths).slice(0, 2).join('；') || '待观察')}</p>
                      <p>风险：${escapeHtml(array(model.risks).slice(0, 2).join('；') || '待观察')}</p>
                    </article>
                  `;
                })
                .join('')
            : '<p class="empty">暂无模型画像。</p>'
        }
      </div>
    </section>
  `;
}

module.exports = {
  renderDiffs,
  renderFactRows,
  renderFunnel,
  renderModels,
};
