'use strict';

const { renderAxisMap, renderBarStrips, renderOpinionGauge, renderRiskMatrix } = require('./fact-charts');
const { array, clipText, escapeHtml, text } = require('./fact-template-utils');

function renderIssueDecisionPanels(profile) {
  const panels = array(profile && profile.decisionPanels);
  return panels
    .slice(0, 4)
    .map(
      ([title, body]) => `
        <article>
          <span>${escapeHtml(text(title, '决策说明'))}</span>
          <p>${escapeHtml(text(body, '暂无说明。'))}</p>
        </article>
      `
    )
    .join('');
}

function renderUserIssueAnalysis(analysis, profile) {
  const data = analysis || {};
  const chartLabels = array(profile && profile.chartLabels);
  const findings = array(data.key_findings).filter(Boolean);
  const blindspots = array(data.blindspots).filter(Boolean);
  return `
    <section class="issue-analysis card--wide">
      <div class="issue-hero">
        <div>
          <span class="issue-kicker">${escapeHtml(text(profile && profile.issueKicker, 'User Question Verdict'))}</span>
          <h2>${escapeHtml(text(profile && profile.issueTitle, '用户问题结果研判'))}</h2>
          <strong class="issue-answer-line">${escapeHtml(clipText(text(data.direct_answer, '结论：当前材料不足以形成强结论。'), 30))}</strong>
          <p>${escapeHtml(text(data.direct_answer, '当前材料不足以形成强结论，需要继续等待多模型证据链收敛。'))}</p>
        </div>
        <div class="issue-gauge">
          ${renderOpinionGauge(data.public_opinion_temperature, data.temperature_label || (profile && profile.gaugeLabel) || '结论强度')}
        </div>
      </div>

      <div class="issue-grid">
        <article class="issue-panel issue-panel--dark">
          <span>主导判断</span>
          <strong>${escapeHtml(text(data.dominant_sentiment, '未形成稳定主导情绪'))}</strong>
          <p>${escapeHtml(text(data.narrative_summary, '模型回答尚未给出足够稳定的舆论叙事链。'))}</p>
        </article>
        <article class="issue-panel">
          <span>关键发现</span>
          <ul>${(findings.length ? findings : ['存在讨论热度，但证据强度不足以直接写成强结论']).slice(0, 5).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </article>
        <article class="issue-panel">
          <span>盲区提示</span>
          <ul>${(blindspots.length ? blindspots : ['缺少外部一手来源与平台热度数据']).slice(0, 5).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </article>
      </div>

      <div class="issue-decision-grid">
        ${renderIssueDecisionPanels(profile)}
      </div>

      <div class="issue-chart-board">
        <div class="issue-chart-title">
          <span>Visual Intelligence Board</span>
          <h3>${escapeHtml(text(profile && profile.chartTitle, '多源信息结构看板'))}</h3>
          <p><strong>结论：${escapeHtml(text(data.dominant_sentiment, '未形成稳定主导判断'))}</strong>。${escapeHtml(text(profile && profile.chartConclusionSuffix, '图表只用于辅助理解，不替代最终裁决。'))}</p>
        </div>
        <div class="chart-grid">
        <article class="chart-card">
          <header><span>Structure A</span><b>${escapeHtml(chartLabels[0] || '判断结构')}</b></header>
          ${renderBarStrips(data.sentiment_distribution, { palette: ['#42c67a', '#356bff', '#ffad33', '#ff5d5d', '#8b5cf6'] })}
        </article>
        <article class="chart-card">
          <header><span>Structure B</span><b>${escapeHtml(chartLabels[1] || '立场分布')}</b></header>
          ${renderBarStrips(data.stance_distribution, { palette: ['#356bff', '#42c67a', '#ffad33', '#ff5d5d', '#64748b'] })}
        </article>
        <article class="chart-card">
          <header><span>Axis Map</span><b>${escapeHtml(chartLabels[2] || '信息群体')}</b></header>
          ${renderAxisMap(data.audience_segments)}
        </article>
        <article class="chart-card">
          <header><span>Risk Matrix</span><b>${escapeHtml(chartLabels[3] || '风险矩阵')}</b></header>
          ${renderRiskMatrix(data.risk_matrix)}
        </article>
        </div>
      </div>
    </section>
  `;
}

module.exports = {
  renderUserIssueAnalysis,
};
