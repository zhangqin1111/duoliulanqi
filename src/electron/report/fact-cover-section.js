'use strict';

const { array, clipText, escapeHtml, time } = require('./fact-template-utils');

function renderPipeline(profile) {
  const steps = array(profile && profile.pipeline).slice(0, 6);
  return steps.map((step, index) => `${index ? '<i></i>' : ''}<span>${escapeHtml(step)}</span>`).join('');
}

function renderCover({ profile, confidence, originalQuestion, decisionParts, riskLabel, actionLabel, modelNames, meta, payload }) {
  return `
      <section class="cover">
        <div class="cover-grid"></div>
        <div class="cover-orb cover-orb--blue"></div>
        <div class="cover-orb cover-orb--gold"></div>
        <div class="cover-inner">
          <div class="cover-top">
            <p class="eyebrow">FACT BLACK BOX · FILTER WORKBENCH</p>
            <span>${escapeHtml(profile.coverBadge)}</span>
          </div>
          <div class="cover-main">
            <div>
              <h1>滤镜·多源大模型<br/>内容对比分析</h1>
              <p class="subtitle">多模型交叉验证 · 差异追问 · 污染剔除 · 证据链收敛</p>
            </div>
            <div class="cover-score">
              <strong>${confidence}</strong>
              <span>Confidence</span>
            </div>
          </div>
          <div class="cover-question">
            <span>用户问题 / Intelligence Target</span>
            <strong>${escapeHtml(originalQuestion)}</strong>
          </div>
          <div class="cover-decision">
            <span>核心结论</span>
            <strong>${escapeHtml(decisionParts.headline)}</strong>
            <p>${escapeHtml(decisionParts.detail)}</p>
            <div>
              <b>风险等级：${escapeHtml(riskLabel)}</b>
              <b>建议：${escapeHtml(clipText(actionLabel, 18))}</b>
            </div>
          </div>
          <div class="cover-pipeline">
            ${renderPipeline(profile)}
          </div>
          <div class="cover-foot">
            <span>${escapeHtml(array(modelNames).join(' / ') || '多模型')}</span>
            <span>${escapeHtml(time(meta.generated_at || (payload && payload.generatedAt)))}</span>
          </div>
        </div>
      </section>
  `;
}

module.exports = {
  renderCover,
};
