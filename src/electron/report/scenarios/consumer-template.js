'use strict';

const factTemplate = require('../fact-template');
const { array, clipText, escapeHtml, text } = require('../fact-template-utils');
const {
  appendUnique,
  injectBeforeEvidenceGrid,
  renderScenarioCard,
  renderScenarioList,
  renderScenarioShell,
  withMeta,
} = require('./scenario-template-utils');

function buildConsumerReport(report) {
  const data = withMeta(report, 'consumer_purchase', 'consumer_purchase_decision_v1');
  data.scenario_decision = {
    ...(data.scenario_decision || {}),
    task_type: 'consumer_purchase',
    task_label: (data.scenario_decision && data.scenario_decision.task_label) || '消费选购决策',
    evidence_standard:
      (data.scenario_decision && data.scenario_decision.evidence_standard) ||
      '优先采信官方参数、官方价格、权威评测、主流渠道报价和真实用户长期反馈；未发布、缺实测或缺来源的数据必须标注为待核验。',
  };
  data.user_issue_analysis = {
    ...(data.user_issue_analysis || {}),
    key_findings: appendUnique(data.user_issue_analysis && data.user_issue_analysis.key_findings, [
      '先识别预算、使用场景和核心敏感项，再比较具体型号和版本差异。',
      '推荐结论必须拆成适合人群、价值构成、购买风险、替代方案和人工核验项。',
    ]),
  };
  return data;
}

function displayValue(value, fallback = '待核验') {
  return escapeHtml(text(value, fallback));
}

function renderConsumerCandidateTable(report) {
  const payload = (report && report.scenario_payload) || {};
  const rows = array(payload.candidate_table).slice(0, 8);
  const quality = (report && report.quality_gate) || {};
  if (!rows.length) {
    return `
            <section class="card card--wide consumer-table-card consumer-table-card--empty">
              <header class="card-head"><span>候选清单</span><b>Required</b></header>
              <div class="consumer-empty">
                <strong>候选车型表缺失，不能输出最终购买裁决</strong>
                <p>消费选购报告必须先拿到车型/版本、官方价、终端价、动力/续航、在售状态和核验口径。当前只能展示待核验动作，不能伪造“最值得买”。</p>
              </div>
            </section>`;
  }

  return `
            <section class="card card--wide consumer-table-card">
              <header class="card-head"><span>候选产品核验表</span><b>${escapeHtml(quality.ok ? 'Evidence' : 'Check')}</b></header>
              <table class="consumer-candidate-table">
                <thead>
                  <tr>
                    <th>车型 / 版本</th>
                    <th>官方价</th>
                    <th>终端价</th>
                    <th>核心参数</th>
                    <th>核验状态</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows
                    .map((item) => {
                      const name = [item.brand, item.model, item.version || item.name].filter(Boolean).join(' ');
                      const spec = [item.energy_type, item.powertrain, item.range, item.smart_driving, item.safety_rating]
                        .filter(Boolean)
                        .join(' / ');
                      return `
                        <tr>
                          <td><strong>${displayValue(name)}</strong><small>${displayValue(item.recommendation || item.fit, '候选')}</small></td>
                          <td>${displayValue(item.official_price)}</td>
                          <td>${displayValue(item.market_price || item.transaction_price)}</td>
                          <td>${escapeHtml(clipText(spec, 80) || '待核验')}</td>
                          <td><span class="verify-pill">${displayValue(item.verification_status || item.status, '待核验')}</span></td>
                        </tr>`;
                    })
                    .join('')}
                </tbody>
              </table>
            </section>`;
}

function renderConsumerRecommendationTable(report) {
  const quality = (report && report.quality_gate) || {};
  if (quality.level === 'blocked') {
    return `
            <section class="card card--wide consumer-table-card consumer-table-card--empty">
              <header class="card-head"><span>推荐裁决梯队</span><b>Blocked</b></header>
              <div class="consumer-empty">
                <strong>证据不足，暂不输出首选/备选/不推荐。</strong>
                <p>当前强推荐会误导用户。请先补齐候选车型、官方价、终端价、在售状态、配置差异和证据来源，再生成购买裁决。</p>
              </div>
            </section>`;
  }
  const payload = (report && report.scenario_payload) || {};
  const recommendations = payload.recommendations || {};
  const items = [
    { level: '首选', value: recommendations.primary },
    ...array(recommendations.alternatives).map((value) => ({ level: '备选', value })),
    ...array(recommendations.not_recommended).map((value) => ({ level: '不推荐', value })),
  ].filter((item) => item.value);
  if (!items.length) return '';
  return `
            <section class="card card--wide consumer-table-card">
              <header class="card-head"><span>推荐裁决梯队</span><b>Decision</b></header>
              <div class="consumer-rank-grid">
                ${items
                  .slice(0, 6)
                  .map((item) => {
                    const value = typeof item.value === 'string' ? { name: item.value } : item.value;
                    return `
                      <article>
                        <b>${escapeHtml(item.level)}</b>
                        <strong>${displayValue(value.name || value.model || value.title)}</strong>
                        <p>${escapeHtml(clipText(value.reason || value.note || value.fit_reason, 110) || '推荐理由待核验。')}</p>
                      </article>`;
                  })
                  .join('')}
              </div>
            </section>`;
}

function renderConsumerDecisionPage(report) {
  const decision = report.scenario_decision || {};
  const issue = report.user_issue_analysis || {};
  const factors = Array.isArray(decision.decision_factors) ? decision.decision_factors : [];
  const findings = Array.isArray(issue.key_findings) ? issue.key_findings : [];
  return renderScenarioShell({
    eyebrow: 'CONSUMER DECISION ROOM',
    title: '消费选购决策台',
    subtitle: '把“哪款更值得买”拆成候选清单、价格口径、价值权重、人群排序、购买风险和人工核验项，避免报告跑偏成泛泛信息罗列。',
    children: `
      ${renderScenarioCard(
        '直接裁决',
        'Verdict',
        decision.direct_verdict || issue.direct_answer || '暂无明确推荐，建议补齐价格、预算和核心需求后再裁决。',
        [decision.recommended_action || '按需求分层推荐', decision.evidence_standard || '参数与实测绑定']
      )}
      ${renderScenarioList('价值权重', 'Value', factors, [
        { title: '预算效率', body: '对比官方价、终端价、补贴价和生命周期成本。' },
        { title: '核心体验', body: '按用户真实场景拆分空间、能耗、智驾、安全、售后和保值。' },
        { title: '风险边界', body: '未上市、缺实测、地区价格差和营销口径必须独立标注。' },
      ])}
      ${renderScenarioList('适配人群', 'Audience', findings, [
        { title: '家庭通勤', body: '优先空间、安全、能耗和售后覆盖，不只看配置堆料。' },
        { title: '年轻首购', body: '优先终端价、智能座舱、主动安全和保养成本。' },
        { title: '长途/新能源', body: '单独核验补能、续航达成率、质保和交付周期。' },
      ])}
      ${renderConsumerCandidateTable(report)}
      ${renderConsumerRecommendationTable(report)}
      ${renderScenarioCard(
        '购买动作',
        'Action',
        decision.recommended_action || '等待官方价格与独立评测稳定后，再按预算档位决策。',
        ['不把传闻当事实', '不把旗舰当默认最优', '结论绑定预算']
      )}
    `,
  });
}

function buildReportHtml(payload, structured) {
  const report = buildConsumerReport(structured);
  return injectBeforeEvidenceGrid(factTemplate.buildReportHtml(payload, report), renderConsumerDecisionPage(report));
}

module.exports = {
  buildConsumerReport,
  buildReportHtml,
  renderConsumerCandidateTable,
  renderConsumerRecommendationTable,
};
