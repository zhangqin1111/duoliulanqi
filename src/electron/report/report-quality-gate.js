'use strict';

const { hasPlaceholder, taskTypeOf, validateScenarioContract } = require('./scenario-contracts');

const STRONG_STATUS = new Set(['strong', 'confirmed', 'high']);
const MISLEADING_VERIFIED_RE = /(已核验|可核验|真实可购池|已上市并处于正常售卖|三重信源交叉验证)/g;

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function text(value) {
  return String(value == null ? '' : value).trim();
}

function evidenceSummary(report) {
  const summary = (report && report.evidence_binding_summary) || {};
  return {
    claims: Number(summary.claims) || 0,
    bound: Number(summary.bound) || 0,
    unbound: Number(summary.unbound) || 0,
    evidence_sources: Number(summary.evidence_sources) || 0,
  };
}

function hasStrongConclusion(report) {
  const executive = (report && report.executive_conclusion) || {};
  const decision = (report && report.scenario_decision) || {};
  const status = text(executive.status).toLowerCase();
  const combined = [executive.one_sentence, decision.direct_verdict, decision.recommended_action].map(text).join(' ');
  return STRONG_STATUS.has(status) || /(首选|最终裁决|唯一|必须|无需响应|直接购买|最佳|最值得)/.test(combined);
}

function scrubMisleadingVerifiedText(value) {
  if (typeof value === 'string') {
    return value.replace(MISLEADING_VERIFIED_RE, '待核验');
  }
  if (Array.isArray(value)) return value.map(scrubMisleadingVerifiedText);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, child] of Object.entries(value)) out[key] = scrubMisleadingVerifiedText(child);
    return out;
  }
  return value;
}

function markPlaceholderFields(value) {
  if (typeof value === 'string') {
    return hasPlaceholder(value) ? '待核验' : value;
  }
  if (Array.isArray(value)) return value.map(markPlaceholderFields);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, child] of Object.entries(value)) out[key] = markPlaceholderFields(child);
    return out;
  }
  return value;
}

function isEmptyCleanValue(value) {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function scrubCrossScenarioResidue(value, context) {
  const question = text(context && context.question);
  const taskType = text(context && context.taskType);
  const shouldRemoveAppleResidue = taskType === 'consumer_purchase' && !/(iphone|ipad|mac|apple|苹果|蘋果)/i.test(question);
  const appleResidueRe = /(iphone|ipad|mac|apple|苹果|蘋果)/i;

  if (typeof value === 'string') {
    if (shouldRemoveAppleResidue && appleResidueRe.test(value)) return '';
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => scrubCrossScenarioResidue(item, context))
      .filter((item) => !isEmptyCleanValue(item));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      const next = scrubCrossScenarioResidue(child, context);
      if (!isEmptyCleanValue(next)) out[key] = next;
    }
    return out;
  }
  return value;
}

function alignBlockedScenarioPayload(data, taskType) {
  if (taskType !== 'consumer_purchase') return;
  data.user_issue_analysis = {
    ...(data.user_issue_analysis || {}),
    direct_answer: data.executive_conclusion.one_sentence,
    dominant_sentiment: '材料不足，暂不输出强推荐',
    narrative_summary: data.scenario_decision.recommended_action,
    key_findings: [
      '当前只能保留待核验候选和价值权重，不能把模型共识直接写成购买裁决。',
      '先核验官方价、终端价、在售状态、配置差异和交付周期，再输出首选/备选/不推荐。',
    ],
    blindspots: [
      '缺少可绑定证据来源的价格、配置或在售状态。',
      '地区优惠、库存、补贴、质保和真实交付周期仍需人工确认。',
    ],
    sentiment_distribution: [
      { label: '待核验候选', value: 55 },
      { label: '证据缺口', value: 45 },
    ],
    stance_distribution: [
      { label: '暂不强推', value: 65 },
      { label: '继续核验', value: 35 },
    ],
    audience_segments: [
      { label: '价格敏感', x: 45, y: 55 },
      { label: '家用通勤', x: 55, y: 60 },
      { label: '长途自驾', x: 50, y: 50 },
    ],
  };
  data.scenario_payload = {
    ...(data.scenario_payload || {}),
    recommendations: {
      primary: null,
      alternatives: [],
      not_recommended: [],
      note: '证据不足，暂不输出购买推荐梯队。',
    },
  };
}

function downgradeForInsufficientEvidence(report, validation, summary) {
  const data = report;
  const taskType = validation.taskType;
  const decisionObject = text(data.scenario_decision && data.scenario_decision.decision_object) || text(data.meta && data.meta.question_original);

  data.executive_conclusion = {
    ...(data.executive_conclusion || {}),
    status: 'insufficient',
    confidence_score: Math.min(Number(data.executive_conclusion && data.executive_conclusion.confidence_score) || 58, 58),
    confidence_label: '材料不足，需核验',
    risk_level: (data.executive_conclusion && data.executive_conclusion.risk_level) || 'medium',
    one_sentence:
      taskType === 'consumer_purchase'
        ? `当前材料不足以对“${decisionObject || '本次选购问题'}”给出可直接执行的最终购买建议；请先补齐候选清单、价格、在售状态和证据来源。`
        : `当前材料不足以形成强裁决；请先补齐关键证据与来源后再输出最终结论。`,
  };

  data.scenario_decision = {
    ...(data.scenario_decision || {}),
    direct_verdict:
      taskType === 'consumer_purchase'
        ? '暂不输出“首选/最佳”强推荐；仅保留待核验候选、价值权重与下一步核验动作。'
        : '暂不输出强结论；先保留可核验线索和分歧点。',
    recommended_action:
      taskType === 'consumer_purchase'
        ? '先核验候选车型、版本、价格、配置、在售状态和交付周期，再生成最终推荐。'
        : '先补充权威来源、原始材料或业务上下文，再重新生成裁决。',
    do_not_overread: Array.from(
      new Set([
        ...((data.scenario_decision && data.scenario_decision.do_not_overread) || []),
        '不要把无证据绑定的模型共识当作事实。',
        '不要把待核验价格、配置、时间或型号当作确定结论。',
      ])
    ),
  };

  data.final_actions = Array.from(
    new Set([
      ...((Array.isArray(data.final_actions) ? data.final_actions : []) || []),
      '补齐至少 3 个权威来源或官方/主流渠道证据。',
      '将所有价格、版本、参数和售卖状态标注为可核验或待核验。',
    ])
  );

  alignBlockedScenarioPayload(data, taskType);

  data.quality_gate = {
    ok: false,
    level: 'blocked',
    reason: 'insufficient_evidence_for_strong_conclusion',
    evidence_summary: summary,
    errors: validation.errors,
    warnings: validation.warnings,
  };
}

function applyReportQualityGate(report) {
  const data = markPlaceholderFields(scrubMisleadingVerifiedText(clone(report)));
  const cleaned = scrubCrossScenarioResidue(data, {
    taskType: taskTypeOf(data),
    question: text(data.meta && data.meta.question_original),
  });
  const validation = validateScenarioContract(cleaned);
  const summary = evidenceSummary(cleaned);
  const evidenceMissing = summary.evidence_sources === 0 || (summary.claims > 0 && summary.bound === 0);
  const missingScenarioPayload = validation.warnings.some((warning) => String(warning).startsWith('scenario_payload.'));
  const shouldDowngrade = evidenceMissing && (hasStrongConclusion(cleaned) || validation.errors.length > 0 || missingScenarioPayload);

  if (shouldDowngrade) {
    downgradeForInsufficientEvidence(cleaned, validation, summary);
  } else {
    cleaned.quality_gate = {
      ok: validation.ok,
      level: validation.ok ? 'pass' : 'warn',
      evidence_summary: summary,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  return cleaned;
}

module.exports = {
  applyReportQualityGate,
  evidenceSummary,
  hasStrongConclusion,
};
