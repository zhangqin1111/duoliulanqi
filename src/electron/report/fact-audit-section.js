'use strict';

const { array, clipText, escapeHtml, text } = require('./fact-template-utils');

function renderAuditAppendix(rawReplies, models) {
  const replies = array(rawReplies).filter((reply) => text(reply && reply.text));
  const profiles = array(models);
  const names = new Set([...replies.map((reply) => reply.name), ...profiles.map((model) => model.model)].filter(Boolean));
  const list = Array.from(names);
  if (!list.length) return '';
  return `
    <section class="card card--wide audit-appendix page-break">
      <header class="card-head"><span>审计附录 · 模型证词摘要</span><b>${list.length}</b></header>
      <p class="summary-line">正文不展开模型原文，只保留每个模型的证词倾向、可信特征和主要风险，供复核使用。</p>
      <div class="raw-list raw-list--audit">
        ${list
          .map((name) => {
            const profile = profiles.find((item) => item.model === name) || {};
            const reply = replies.find((item) => item.name === name) || {};
            const s = profile.scores || {};
            const avg = Math.round(
              ['fact_fidelity', 'logic_consistency', 'information_density', 'pollution_control']
                .map((key) => Number(s[key]) || 0)
                .reduce((a, b) => a + b, 0) / 4
            );
            const traits = [
              text(profile.witness_type, '证词摘要'),
              array(profile.strengths).slice(0, 1).join(''),
              array(profile.risks).slice(0, 1).join(''),
            ].filter(Boolean);
            return `
              <article class="raw raw--audit">
                <div>
                  <h4>${escapeHtml(text(name, '未知模型'))}</h4>
                  <b>${avg || '--'}<small>/100</small></b>
                </div>
                <p>${escapeHtml(traits.join('；') || clipText(reply.text, 160))}</p>
              </article>
            `;
          })
          .join('')}
      </div>
    </section>
  `;
}

module.exports = {
  renderAuditAppendix,
};
