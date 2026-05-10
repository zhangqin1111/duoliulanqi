'use strict';

const { renderAxisMap, renderBarStrips, renderOpinionGauge, renderRiskMatrix } = require('./fact-charts');
const { array, clipText, escapeHtml, text } = require('./fact-template-utils');

const ISSUE_LABELS = {
  public_opinion: {
    primary: '主导判断',
    findings: '关键发现',
    blindspots: '盲区提示',
    chartTitle: '多源信息结构看板',
    chartNote: '图表只用于辅助理解，不替代最终裁决。',
  },
  fact_check: {
    primary: '采信判断',
    findings: '证据依据',
    blindspots: '核验盲区',
    chartTitle: '证据可信度看板',
    chartNote: '图表用于展示主张压缩和可采信边界。',
  },
  consumer_purchase: {
    primary: '购买裁决',
    findings: '推荐依据',
    blindspots: '购买盲区',
    chartTitle: '价值与风险决策看板',
    chartNote: '图表用于把价格、配置、适合人群和购买风险压缩成可执行判断。',
  },
  technical_diagnosis: {
    primary: '根因判断',
    findings: '修复线索',
    blindspots: '排障盲区',
    chartTitle: '诊断与修复看板',
    chartNote: '图表用于定位根因、验证动作和回滚风险。',
  },
  legal_risk: {
    primary: '风险判断',
    findings: '风险线索',
    blindspots: '材料缺口',
    chartTitle: '法律风险看板',
    chartNote: '图表只用于风险分层，不替代律师意见。',
  },
  medical_health: {
    primary: '健康风险判断',
    findings: '症状线索',
    blindspots: '就医盲区',
    chartTitle: '健康风险看板',
    chartNote: '图表只用于整理信息，不构成诊断或治疗建议。',
  },
  finance_planning: {
    primary: '规划判断',
    findings: '规划依据',
    blindspots: '风险盲区',
    chartTitle: '财务规划看板',
    chartNote: '图表只用于规划框架，不构成个性化投资建议。',
  },
};

function taskTypeOf(profile) {
  return text(profile && (profile.taskType || profile.task_type || profile.id), 'general_compare');
}

function issueLabelsFor(profile) {
  const taskType = taskTypeOf(profile);
  return (
    ISSUE_LABELS[taskType] || {
      primary: '问题裁决',
      findings: '关键依据',
      blindspots: '待补变量',
      chartTitle: text(profile && profile.chartTitle, '决策结构看板'),
      chartNote: '图表用于压缩关键变量，最终仍以裁决与行动清单为准。',
    }
  );
}

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

function renderUserIssueAnalysis(analysis, profile, decision, conclusion) {
  const data = analysis || {};
  const labels = issueLabelsFor(profile);
  const chartLabels = array(profile && profile.chartLabels);
  const findings = array(data.key_findings).filter(Boolean);
  const blindspots = array(data.blindspots).filter(Boolean);
  const directAnswer = text(
    data.direct_answer ||
      (decision && decision.direct_verdict) ||
      (conclusion && conclusion.one_sentence),
    '结论：当前材料不足以形成强结论。'
  );
  const primaryJudgment = text(
    data.dominant_sentiment ||
      (decision && decision.direct_verdict) ||
      (conclusion && conclusion.one_sentence),
    '需要补充关键材料后再裁决。'
  );
  const narrative = text(
    data.narrative_summary || (decision && decision.recommended_action),
    '系统将先压缩关键变量，再给出可执行的下一步。'
  );

  return `
    <section class="issue-analysis card--wide">
      <div class="issue-hero">
        <div>
          <span class="issue-kicker">${escapeHtml(text(profile && profile.issueKicker, 'User Question Verdict'))}</span>
          <h2>${escapeHtml(text(profile && profile.issueTitle, '用户问题结果研判'))}</h2>
          <strong class="issue-answer-line">${escapeHtml(clipText(directAnswer, 64))}</strong>
          <p>${escapeHtml(directAnswer)}</p>
        </div>
        <div class="issue-gauge">
          ${renderOpinionGauge(data.public_opinion_temperature, data.temperature_label || (profile && profile.gaugeLabel) || '决策强度')}
        </div>
      </div>

      <div class="issue-grid">
        <article class="issue-panel issue-panel--dark">
          <span>${escapeHtml(labels.primary)}</span>
          <strong>${escapeHtml(primaryJudgment)}</strong>
          <p>${escapeHtml(narrative)}</p>
        </article>
        <article class="issue-panel">
          <span>${escapeHtml(labels.findings)}</span>
          <ul>${(findings.length ? findings : ['先锁定用户真实目标，再比较关键变量，最后给出可执行动作。'])
            .slice(0, 5)
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join('')}</ul>
        </article>
        <article class="issue-panel">
          <span>${escapeHtml(labels.blindspots)}</span>
          <ul>${(blindspots.length ? blindspots : ['缺少目标、约束、时间范围、预算或成功标准。'])
            .slice(0, 5)
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join('')}</ul>
        </article>
      </div>

      <div class="issue-decision-grid">
        ${renderIssueDecisionPanels(profile)}
      </div>

      <div class="issue-chart-board">
        <div class="issue-chart-title">
          <span>Visual Intelligence Board</span>
          <h3>${escapeHtml(text(profile && profile.chartTitle, labels.chartTitle))}</h3>
          <p><strong>结论：${escapeHtml(primaryJudgment)}</strong>。${escapeHtml(text(profile && profile.chartConclusionSuffix, labels.chartNote))}</p>
        </div>
        <div class="chart-grid">
          <article class="chart-card">
            <header><span>Structure A</span><b>${escapeHtml(chartLabels[0] || '判断结构')}</b></header>
            ${renderBarStrips(data.sentiment_distribution, { palette: ['#42c67a', '#356bff', '#ffad33', '#ff5d5d', '#8b5cf6'] })}
          </article>
          <article class="chart-card">
            <header><span>Structure B</span><b>${escapeHtml(chartLabels[1] || '行动分布')}</b></header>
            ${renderBarStrips(data.stance_distribution, { palette: ['#356bff', '#42c67a', '#ffad33', '#ff5d5d', '#64748b'] })}
          </article>
          <article class="chart-card">
            <header><span>Axis Map</span><b>${escapeHtml(chartLabels[2] || '用户/信息坐标')}</b></header>
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
