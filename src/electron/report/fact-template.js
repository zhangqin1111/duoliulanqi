'use strict';

const { renderCompressionChart } = require('./fact-charts');
const { renderAuditAppendix } = require('./fact-audit-section');
const { css } = require('./fact-template-styles');
const { renderCover } = require('./fact-cover-section');
const {
  filterRenderableFacts,
  renderDiffs,
  renderEvidenceSources,
  renderFactRows,
  renderFunnel,
  renderModels,
} = require('./fact-evidence-section');
const { renderScenarioDecision } = require('./fact-decision-section');
const { renderUserIssueAnalysis } = require('./fact-issue-section');
const { getScenarioProfile } = require('./scenario-report-profiles');
const {
  array,
  clipText,
  escapeHtml,
  renderTags,
  score,
  splitVerdict,
  statusLabel,
  text,
} = require('./fact-template-utils');

function renderBriefingMap(profile) {
  const steps = array(profile && profile.briefingSteps);
  return `
    <section class="briefing-map">
      ${steps
        .slice(0, 3)
        .map(
          ([title, body], index) => `
            <div><b>${String(index + 1).padStart(2, '0')}</b><span>${escapeHtml(text(title, '\u5206\u6790\u6b65\u9aa4'))}</span><p>${escapeHtml(text(body, '\u56f4\u7ed5\u8bc1\u636e\u94fe\u548c\u6c61\u67d3\u5254\u9664\u5b8c\u6210\u88c1\u51b3\u3002'))}</p></div>
          `
        )
        .join('')}
    </section>
  `;
}

function buildReportHtml(payload, report) {
  const data = report || {};
  const meta = data.meta || {};
  const conclusion = data.executive_conclusion || {};
  const userIssue = data.user_issue_analysis || {};
  const brief = data.question_brief || {};
  const factMap = data.fact_map || {};
  const disputeMap = data.dispute_map || {};
  const diagnosis = data.source_diagnosis || {};
  const scenarioDecision = data.scenario_decision || {};
  const timelineFacts = filterRenderableFacts(factMap.timeline);
  const confirmedFacts = filterRenderableFacts(factMap.confirmed_facts);
  const profile = getScenarioProfile(meta.task_type || scenarioDecision.task_type);
  const funnel = data.evidence_funnel || {};
  const rawReplies = array(payload && payload.rawReplies);
  const confidence = score(conclusion.confidence_score);
  const modelNames = array(meta.models).length
    ? array(meta.models)
    : rawReplies.map((r) => r.name).filter(Boolean);
  const originalQuestion = text(meta.question_original || (payload && payload.question), '未记录');
  const refinedQuestion = text(brief.refined || meta.question_refined, '未记录');
  const decision = text(conclusion.one_sentence || diagnosis.retained_judgment, '暂未形成明确裁决');
  const decisionParts = splitVerdict(decision);
  const riskLabel = text(conclusion.risk_level, 'medium').toUpperCase();
  const actionLabel = array(data.final_actions)[0] || '继续核验';

  return `<!doctype html>
  <html lang="zh-CN">
    <head>
      <meta charset="UTF-8" />
      <title>滤镜·多源大模型内容对比分析</title>
      <style>${css()}</style>
    </head>
    <body>
      ${renderCover({
        profile,
        confidence,
        originalQuestion,
        decisionParts,
        riskLabel,
        actionLabel,
        modelNames,
        meta,
        payload,
      })}

      <main class="report">
        <section class="executive-page">
          <section class="hero">
            <div>
              <p class="eyebrow">EXECUTIVE WAR ROOM</p>
              <div class="war-room-verdict">一句话裁决</div>
              <h2>${escapeHtml(text(conclusion.one_sentence, '暂未形成明确裁决'))}</h2>
              <p>${escapeHtml(text(conclusion.core_tension, '多模型回答尚未形成清晰核心矛盾'))}</p>
              <div class="tags">${renderTags([statusLabel(conclusion.status), conclusion.confidence_label, `风险 ${conclusion.risk_level}`])}</div>
            </div>
            <div class="gauge" style="--score:${confidence}">
              <strong>${confidence}</strong>
              <span>可信度</span>
            </div>
          </section>

          <section class="brief">
            <div><span>原始问题</span><p>${escapeHtml(clipText(brief.original || originalQuestion, 120))}</p></div>
            <div><span>系统补全</span><p>${escapeHtml(clipText(refinedQuestion, 260))}</p></div>
            <div><span>分析约束</span><div class="tags">${renderTags(array(brief.constraints).slice(0, 5), '暂无')}</div></div>
          </section>

          <section class="metrics">
            <div><span>原始 claim</span><b>${escapeHtml(String(funnel.raw_claims || 0))}</b></div>
            <div><span>交叉确认</span><b>${escapeHtml(String(funnel.cross_checked || 0))}</b></div>
            <div><span>差异点</span><b>${array(disputeMap.items).length}</b></div>
            <div><span>污染剔除</span><b>${escapeHtml(String(funnel.pollution_removed || 0))}</b></div>
          </section>

          <section class="executive-compression">
            <div>
              <span>证据压缩</span>
              <strong>${escapeHtml(String(funnel.raw_claims || 0))} → ${escapeHtml(String(funnel.final_evidence || 0))}</strong>
              <p>所有细节性主张必须经过交叉验证、追问保留和污染剔除，不能直接进入裁决。</p>
            </div>
            ${renderCompressionChart(funnel)}
          </section>

          ${renderBriefingMap(profile)}
          ${renderScenarioDecision(scenarioDecision, conclusion)}
        </section>

        ${renderUserIssueAnalysis(userIssue, profile, scenarioDecision, conclusion)}

        <div class="grid">
          <section class="section-title card--wide">
            <span>Evidence Matrix</span>
            <h2>证据矩阵与模型证词</h2>
            <p>把模型回答拆成可核验事实、交叉确认、差异争议和污染剔除四组资产，避免直接把“看起来像答案”的文本当成结论。</p>
          </section>
          ${renderFactRows('事实时间轴', factMap.timeline, { weighted: true })}
          ${renderFactRows('多模型确认事实', factMap.confirmed_facts)}
          ${renderFunnel(funnel)}
          ${renderEvidenceSources(data)}
          ${renderDiffs(disputeMap)}
          <section class="card card--wide">
            <header class="card-head"><span>源头分析与最终裁决</span><b>Verdict</b></header>
            <div class="verdict">
              <div class="final-verdict-lockup">
                <span>最终结论</span>
                <strong>${escapeHtml(decisionParts.headline)}</strong>
                <p>${escapeHtml(decisionParts.detail || text(conclusion.largest_uncertainty, '缺少外部一手来源核验'))}</p>
              </div>
              <div class="final-verdict-grid">
                <article><b>其余主张</b><span>不可直接采信</span></article>
                <article><b>差异源头</b><span>${escapeHtml(clipText(array(diagnosis.root_causes).join(' / '), 72) || '待核验')}</span></article>
                <article><b>下一步行动</b><span>${escapeHtml(clipText(actionLabel, 72))}</span></article>
              </div>
            </div>
          </section>
          ${renderAuditAppendix(rawReplies, data.model_profiles)}
        </div>
      </main>
    </body>
  </html>`;
}

module.exports = {
  buildReportHtml,
};
