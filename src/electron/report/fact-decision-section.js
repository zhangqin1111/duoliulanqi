'use strict';

const { array, escapeHtml, score, text } = require('./fact-template-utils');

function renderScenarioDecision(scenario, conclusion) {
  const data = scenario || {};
  const factors = array(data.decision_factors);
  const limits = array(data.do_not_overread);
  const questions = array(data.next_questions);
  const verdict = text(data.direct_verdict || (conclusion && conclusion.one_sentence), '暂未形成场景裁决');
  return `
    <section class="scenario-decision">
      <div class="scenario-main">
        <span>Scenario Decision Layer</span>
        <h3>${escapeHtml(text(data.task_label, '场景化裁决'))}</h3>
        <strong>${escapeHtml(verdict)}</strong>
        <p>${escapeHtml(text(data.evidence_standard, '本报告只采信可交叉验证、可解释来源和经过污染剔除后仍能成立的判断。'))}</p>
        <b>建议动作：${escapeHtml(text(data.recommended_action, '继续核验'))}</b>
      </div>
      <div class="scenario-factors">
        ${(factors.length ? factors : [{ label: '证据强度', score: 50, note: '等待更多可核验材料' }])
          .slice(0, 4)
          .map(
            (item) => `
              <article>
                <div><span>${escapeHtml(text(item.label, '关键因素'))}</span><b>${score(item.score)}</b></div>
                <i><em style="width:${score(item.score)}%"></em></i>
                <p>${escapeHtml(text(item.note, '该因素会影响最终裁决强度。'))}</p>
              </article>
            `
          )
          .join('')}
      </div>
      <div class="scenario-guardrails">
        <article>
          <span>不可误读</span>
          <ul>${(limits.length ? limits : ['不能把模型一致性直接等同于事实成立']).slice(0, 4).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </article>
        <article>
          <span>下一步问题</span>
          <ul>${(questions.length ? questions : ['补充一手信源、原始材料或业务上下文后再提高结论强度']).slice(0, 4).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </article>
      </div>
    </section>
  `;
}

module.exports = {
  renderScenarioDecision,
};
