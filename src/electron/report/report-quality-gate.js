'use strict';

const { hasPlaceholder, taskTypeOf, validateScenarioContract } = require('./scenario-contracts');
const { ensureActionablePayload } = require('../shared/scenario-action-contracts');

const STRONG_STATUS = new Set(['strong', 'confirmed', 'high']);
const MISLEADING_VERIFIED_RE =
  /(已核验|可核验|真实可购|已上市并处于正常售卖|三重信源交叉验证|宸叉牳楠|鍙牳楠|鐪熷疄鍙喘|宸蹭笂甯傚苟澶勪簬姝ｅ父鍞崠|涓夐噸淇℃簮浜ゅ弶楠岃瘉)/g;

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function text(value) {
  return String(value == null ? '' : value).trim();
}

function array(value) {
  return Array.isArray(value) ? value : [];
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

function reportTextPool(report) {
  const executive = (report && report.executive_conclusion) || {};
  const decision = (report && report.scenario_decision) || {};
  const issue = (report && report.user_issue_analysis) || {};
  const diagnosis = (report && report.source_diagnosis) || {};
  return [
    executive.one_sentence,
    executive.core_tension,
    executive.largest_uncertainty,
    decision.direct_verdict,
    decision.recommended_action,
    issue.direct_answer,
    issue.narrative_summary,
    diagnosis.retained_judgment,
  ]
    .map(text)
    .join(' ');
}

function hasStrongConclusion(report) {
  const executive = (report && report.executive_conclusion) || {};
  const decision = (report && report.scenario_decision) || {};
  const status = text(executive.status).toLowerCase();
  const combined = [executive.one_sentence, decision.direct_verdict, decision.recommended_action].map(text).join(' ');
  return (
    STRONG_STATUS.has(status) ||
    /(首选|最终裁决|唯一|必须|无需响应|不需要响应|直接购买|最佳|最值得|无任何可验证|均为AI幻觉|不构成真实舆情事件)/.test(
      combined
    )
  );
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
  const shouldRemoveAppleResidue = taskType === 'consumer_purchase' && !/(iphone|ipad|mac|apple|苹果)/i.test(question);
  const appleResidueRe = /(iphone|ipad|mac|apple|苹果|鑻规灉|铇嬫灉)/i;

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

function isExternalEvidenceEnabled(context) {
  const session = context && (context.analysisSession || context.session);
  return !!(context && context.externalEvidenceEnabled === true) || !!(session && session.externalEvidenceEnabled === true);
}

function scrubDisabledExternalEvidenceCopy(value) {
  if (typeof value === 'string') {
    return value
      .replace(/待外部核验/g, '待AI交叉复核')
      .replace(/外部核验/g, 'AI交叉复核')
      .replace(/外部可信来源/g, '多模型来源')
      .replace(/可信来源/g, '模型来源')
      .replace(/权威来源/g, '高可信模型共识')
      .replace(/权威信源/g, '高可信模型共识')
      .replace(/搜索\/官方\/媒体源/g, '多模型回答')
      .replace(/搜索接口/g, '外部来源模块')
      .replace(/官方\/主流渠道证据/g, '多模型一致材料')
      .replace(/后续接入可信来源后/g, '后续开启外部来源模块后')
      .replace(/后续如接入可信来源/g, '后续如开启外部来源模块')
      .replace(/尚未接入/g, '当前未启用')
      .replace(/未接入/g, '未启用')
      .replace(/已接入多模型来源/g, '已启用外部来源模块')
      .replace(/待后续模型来源增强/g, '来自 AI 模型')
      .replace(/第一版暂以 AI 交叉研判为准；后续开启外部来源模块后可升级为外部证据裁决。/g, '当前按 AI 交叉研判输出可用结论。')
      .replace(/后续开启外部来源模块后再升级为可核验裁决。/g, '当前按 AI 交叉研判输出可用结论。');
  }
  if (Array.isArray(value)) {
    return value
      .map(scrubDisabledExternalEvidenceCopy)
      .filter((item) => !(typeof item === 'string' && /补齐至少\s*3\s*个|可信来源|外部来源|外部证据/.test(item)));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, child] of Object.entries(value)) out[key] = scrubDisabledExternalEvidenceCopy(child);
    return out;
  }
  return value;
}

function normalizeAiOnlyActionList(value) {
  const externalActionRe = /(官网|官方网站|新华社|白宫|外交部|权威|可信来源|外部来源|外部证据|信源交叉核验|原始文件索引|搜索|检索接口)/;
  const list = array(value)
    .map((item) => (typeof item === 'string' ? scrubDisabledExternalEvidenceCopy(item) : item))
    .filter((item) => !(typeof item === 'string' && externalActionRe.test(item)));
  if (!list.some((item) => typeof item === 'string' && /AI|多模型|交叉/.test(item))) {
    list.push('按多 AI 一致性、差异追问和污染剔除结果复核关键判断。');
  }
  return list;
}

function applyDisabledExternalEvidencePolicy(report) {
  const cleaned = scrubDisabledExternalEvidenceCopy(report);
  cleaned.evidence_binding_summary = {
    ...((cleaned && cleaned.evidence_binding_summary) || {}),
    analysis_basis: 'ai_cross_analysis',
    external_sources_connected: false,
    external_evidence_enabled: false,
  };
  cleaned.quality_gate = {
    ...((cleaned && cleaned.quality_gate) || {}),
    external_evidence_enabled: false,
    evidence_policy: 'ai_cross_analysis_only',
  };
  cleaned.final_actions = normalizeAiOnlyActionList(cleaned.final_actions);
  if (cleaned.scenario_decision && typeof cleaned.scenario_decision === 'object') {
    cleaned.scenario_decision.next_questions = normalizeAiOnlyActionList(cleaned.scenario_decision.next_questions);
    cleaned.scenario_decision.do_not_overread = normalizeAiOnlyActionList(cleaned.scenario_decision.do_not_overread);
  }
  if (cleaned.scenario_payload && typeof cleaned.scenario_payload === 'object') {
    cleaned.scenario_payload.manual_verification_items = normalizeAiOnlyActionList(
      cleaned.scenario_payload.manual_verification_items
    );
  }
  return cleaned;
}

function userQuestionText(report) {
  const meta = (report && report.meta) || {};
  const brief = (report && report.question_brief) || {};
  return [meta.question_original, meta.question_refined, brief.original, brief.refined].map(text).join(' ');
}

function userSpecifiedTimeBoundary(report) {
  return /(\d{4}年|\d{4}[-/.]\d{1,2}|最近|最新|当前|今天|昨日|昨天|本周|本月|今年|近[期日周月年]|过去|目前)/.test(
    userQuestionText(report)
  );
}

function publicOpinionStrongClaim(report) {
  return /(无任何可验证|均为AI幻觉|AI幻觉虚构|不构成真实舆情事件|不存在真实舆情|不存在可验证舆情|无需响应|不需要响应|全部为污染|全部不可采信)/.test(
    reportTextPool(report)
  );
}

function unsupportedSpecificTimeClaim(report) {
  return /(\d{4}年|\d{4}[-/.]\d{1,2}|悉尼|演出争议|约谈|处罚|官方通报)/.test(reportTextPool(report)) && !userSpecifiedTimeBoundary(report);
}

function needsPublicOpinionDowngrade(report, summary) {
  if (taskTypeOf(report) !== 'public_opinion') return false;
  const evidenceMissing = summary.evidence_sources === 0 || (summary.claims > 0 && summary.bound === 0);
  const confidence = Number(report && report.executive_conclusion && report.executive_conclusion.confidence_score) || 0;
  return evidenceMissing && (confidence > 80 || publicOpinionStrongClaim(report) || unsupportedSpecificTimeClaim(report));
}

function hasAiAnalysisBasis(report) {
  const metaModels = array(report && report.meta && report.meta.models);
  const modelProfiles = array(report && report.model_profiles);
  const disputes = array(report && report.dispute_map && report.dispute_map.items);
  const rootCauses = array(report && report.source_diagnosis && report.source_diagnosis.root_causes);
  const retained = text(report && report.source_diagnosis && report.source_diagnosis.retained_judgment);
  const conclusion = text(report && report.executive_conclusion && report.executive_conclusion.one_sentence);
  const directAnswer = text(report && report.user_issue_analysis && report.user_issue_analysis.direct_answer);
  const modelCount = Math.max(metaModels.length, modelProfiles.length);
  const hasModelConsensusMaterial = modelCount >= 2 && (conclusion.length >= 18 || directAnswer.length >= 24);
  const hasClosedLoopMaterial = disputes.length >= 1 && (rootCauses.length >= 1 || retained.length >= 16);
  return hasModelConsensusMaterial || (modelProfiles.length >= 2 && hasClosedLoopMaterial);
}

function hasSessionAiBasis(context) {
  const session = context && (context.analysisSession || context.session);
  const replies = array(session && session.initialResults).filter((reply) => reply && reply.ok !== false && text(reply.text).length >= 12);
  const diffAnalyses = array(session && session.diffAnalyses);
  const diffs = array(session && session.diffs);
  return replies.length >= 2 || diffAnalyses.length >= 1 || diffs.length >= 1;
}

function buildBlockedCopy(data, taskType, decisionObject) {
  if (taskType === 'public_opinion') {
    const target = decisionObject || text(data.meta && data.meta.question_original) || '该对象';
    return {
      confidenceLabel: '证据不足，需核验',
      oneSentence: `当前材料不足以证明“${target}”存在可验证的新发或复发舆情事件；所有具体事件、时间线和处置细节必须补齐原始来源后再写成结论。`,
      directVerdict: '暂不输出“有舆情/无舆情”的强裁决；当前只能保留待核验线索、模型差异和污染风险。',
      recommendedAction: '先核验原始发布源、权威媒体或官方回应、平台热度曲线和关键传播节点，再判断是否需要响应。',
      coreTension: '多模型给出了结论性表述，但缺少可绑定证据来源，不能把模型一致性直接等同于事实成立。',
      largestUncertainty: '缺少原始信源、平台热度、权威回应和事件时间线的交叉验证。',
    };
  }

  if (taskType === 'consumer_purchase') {
    const target = decisionObject || '本次选购问题';
    return {
      confidenceLabel: '材料不足，需核验',
      oneSentence: `当前材料不足以对“${target}”给出可直接执行的最终购买建议；请先补齐候选清单、价格、在售状态和证据来源。`,
      directVerdict: '暂不输出“首选/最佳”的强推荐；仅保留待核验候选、价值权重与下一步核验动作。',
      recommendedAction: '先核验候选车型、版本、价格、配置、在售状态和交付周期，再生成最终推荐。',
      coreTension: '候选与价格事实尚未完成证据绑定，不能把模型共识直接写成购买决策。',
      largestUncertainty: '缺少官方价格、终端成交、配置差异和交付状态的可追溯来源。',
    };
  }

  return {
    confidenceLabel: '材料不足，需核验',
    oneSentence: '当前材料不足以形成强裁决；请先补齐关键证据与来源后再输出最终结论。',
    directVerdict: '暂不输出强结论；先保留可核验线索和分歧点。',
    recommendedAction: '先补充权威来源、原始材料或业务上下文，再重新生成裁决。',
    coreTension: '模型输出与证据绑定不足，当前更适合做线索整理而不是最终判断。',
    largestUncertainty: '缺少可绑定的一手来源或外部验证材料。',
  };
}

function softenAiOnlyStrongText(value) {
  return text(value)
    .replace(/当前无任何可验证的?/g, 'AI交叉研判暂未确认')
    .replace(/均为AI幻觉虚构/g, '存在明显AI幻觉或时间污染风险')
    .replace(/不构成真实舆情事件/g, '暂不能按真实舆情事件处理')
    .replace(/无真实舆情事件/g, '暂未确认真实舆情事件')
    .replace(/无需响应/g, '暂不建议直接升级响应');
}

function applyAiAnalysisOnlyGate(data, validation, summary) {
  const conclusion = data.executive_conclusion || {};
  const decision = data.scenario_decision || {};
  const diagnosis = data.source_diagnosis || {};
  const baseSentence =
    softenAiOnlyStrongText(conclusion.one_sentence) ||
    softenAiOnlyStrongText(diagnosis.retained_judgment) ||
    'AI交叉研判已形成阶段性判断，但尚未接入外部可信来源，所有事实项仍需人工或权威来源复核。';

  data.executive_conclusion = {
    ...conclusion,
    status: text(conclusion.status).toLowerCase() === 'strong' ? 'weak' : text(conclusion.status, 'weak'),
    confidence_score: Math.min(Number(conclusion.confidence_score) || 68, 72),
    confidence_label: 'AI交叉研判，待外部核验',
    one_sentence: baseSentence.startsWith('AI交叉研判') ? baseSentence : `AI交叉研判：${baseSentence}`,
    core_tension: text(conclusion.core_tension) || '多模型分析已收敛，但当前缺少外部可信来源绑定。',
    largest_uncertainty: text(conclusion.largest_uncertainty) || '尚未接入权威信源、搜索接口或人工核验结果。',
  };

  data.scenario_decision = {
    ...decision,
    direct_verdict: softenAiOnlyStrongText(decision.direct_verdict) || 'AI研判可作为阶段性参考，但不能视作外部事实核验结论。',
    recommended_action:
      softenAiOnlyStrongText(decision.recommended_action) ||
      '先按AI研判进行风险分层，再补充可信来源或人工核验后输出最终裁决。',
    do_not_overread: Array.from(
      new Set([
        ...array(decision.do_not_overread),
        '当前版本结论来自AI交叉分析，不等同于外部可信来源核验。',
        '没有接入搜索/官方/媒体源时，不得写成“已核验事实”。',
      ])
    ),
  };

  data.evidence_binding_summary = {
    ...summary,
    analysis_basis: 'ai_cross_analysis',
    external_sources_connected: false,
  };
  data.final_actions = Array.from(
    new Set([
      ...array(data.final_actions),
      '第一版按AI交叉研判输出阶段性结论；后续接入可信来源后再升级为可核验裁决。',
      '对所有关键事实保留“待外部核验”标识，避免把AI一致性包装成可信来源。',
    ])
  );
  data.quality_gate = {
    ok: true,
    level: 'ai_analysis_only',
    reason: 'external_evidence_missing_but_ai_cross_analysis_available',
    evidence_summary: data.evidence_binding_summary,
    errors: validation.errors,
    warnings: [
      ...validation.warnings,
      'external_evidence_source_not_connected',
      'conclusion_based_on_ai_cross_analysis_only',
    ],
  };
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
    blindspots: ['缺少可绑定证据来源的价格、配置或在售状态。', '地区优惠、库存、补贴、质保和真实交付周期仍需人工确认。'],
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
      { label: '家庭通勤', x: 55, y: 60 },
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

function applyAiCrossAnalysisGate(data, validation, summary) {
  const conclusion = data.executive_conclusion || {};
  const decision = data.scenario_decision || {};
  const diagnosis = data.source_diagnosis || {};
  const baseSentence =
    softenAiOnlyStrongText(conclusion.one_sentence) ||
    softenAiOnlyStrongText(diagnosis.retained_judgment) ||
    'AI 交叉研判已形成可用裁决，当前报告按多模型回答、差异追问和污染剔除结果给出判断。';
  const scoreValue = Number(conclusion.confidence_score);

  data.executive_conclusion = {
    ...conclusion,
    status: text(conclusion.status, 'strong'),
    confidence_score: Math.max(65, Math.min(Number.isFinite(scoreValue) ? scoreValue : 76, 88)),
    confidence_label: 'AI交叉研判',
    one_sentence: /^AI/.test(baseSentence) ? baseSentence : `AI交叉研判：${baseSentence}`,
    core_tension:
      text(conclusion.core_tension) ||
      '多模型回答已经形成可用判断，报告依据为模型回答、差异追问与污染剔除，而非外部信源检索。',
    largest_uncertainty:
      text(conclusion.largest_uncertainty) ||
      '第一版暂以 AI 交叉研判为准；后续接入可信来源后可升级为外部证据裁决。',
  };

  data.scenario_decision = {
    ...decision,
    direct_verdict: softenAiOnlyStrongText(decision.direct_verdict) || '按多模型 AI 交叉研判输出当前裁决。',
    recommended_action:
      softenAiOnlyStrongText(decision.recommended_action) ||
      '先按 AI 交叉研判结论给用户可执行建议；可信来源接入后再做证据增强。',
    do_not_overread: Array.from(
      new Set([
        ...array(decision.do_not_overread),
        '当前结论来自 AI 交叉研判；不要误写成已接入外部可信来源。',
        '事实项可以按模型一致性和追问结果裁决，但来源字段应标注 AI 模型或待后续可信来源增强。',
      ])
    ),
  };

  data.evidence_binding_summary = {
    ...summary,
    analysis_basis: 'ai_cross_analysis',
    external_sources_connected: false,
  };
  data.final_actions = Array.from(
    new Set([
      ...array(data.final_actions),
      '第一版按 AI 交叉研判输出可用结论。',
      '后续如接入可信来源，再把 AI 裁决升级为外部证据裁决。',
    ])
  );
  data.quality_gate = {
    ok: true,
    level: 'ai_cross_analysis_pass',
    reason: 'ai_cross_analysis_available',
    evidence_summary: data.evidence_binding_summary,
    errors: validation.errors,
    warnings: Array.from(new Set([...validation.warnings, 'conclusion_based_on_ai_cross_analysis_only'])),
  };
}

function alignBlockedEvidenceFunnel(data, summary) {
  const funnel = data.evidence_funnel || {};
  const bound = Number(summary && summary.bound) || 0;
  data.evidence_funnel = {
    ...funnel,
    cross_checked: Math.min(Number(funnel.cross_checked) || 0, bound),
    followup_retained: Math.min(Number(funnel.followup_retained) || 0, bound),
    final_evidence: Math.min(Number(funnel.final_evidence) || 0, bound),
    pollution_removed: Number(funnel.pollution_removed) || Number(summary && summary.unbound) || 0,
  };
}

function downgradeForInsufficientEvidence(report, validation, summary) {
  const data = report;
  const taskType = validation.taskType;
  const decisionObject = text(data.scenario_decision && data.scenario_decision.decision_object) || text(data.meta && data.meta.question_original);
  const copy = buildBlockedCopy(data, taskType, decisionObject);
  const currentConclusion = data.executive_conclusion || {};

  data.executive_conclusion = {
    ...currentConclusion,
    status: 'insufficient',
    confidence_score: Math.min(Number(currentConclusion.confidence_score) || 58, 58),
    confidence_label: copy.confidenceLabel,
    risk_level: currentConclusion.risk_level || 'medium',
    one_sentence: copy.oneSentence,
    core_tension: copy.coreTension,
    largest_uncertainty: copy.largestUncertainty,
  };

  data.scenario_decision = {
    ...(data.scenario_decision || {}),
    direct_verdict: copy.directVerdict,
    recommended_action: copy.recommendedAction,
    do_not_overread: Array.from(
      new Set([
        ...array(data.scenario_decision && data.scenario_decision.do_not_overread),
        '不要把无证据绑定的模型共识当作事实。',
        '不要把待核验价格、配置、时间或事件细节当作确定结论。',
      ])
    ),
  };

  data.final_actions = Array.from(
    new Set([
      ...array(data.final_actions),
      '补齐至少 3 个权威来源或官方/主流渠道证据。',
      '将所有事实项标注为可核验或待核验，禁止把模型推断写成事实。',
    ])
  );

  alignBlockedScenarioPayload(data, taskType);
  alignBlockedEvidenceFunnel(data, summary);

  data.quality_gate = {
    ok: false,
    level: 'blocked',
    reason: 'insufficient_evidence_for_strong_conclusion',
    evidence_summary: summary,
    errors: validation.errors,
    warnings: validation.warnings,
  };
}

function applyReportQualityGate(report, context) {
  const externalEvidenceEnabled = isExternalEvidenceEnabled(context);
  const data = markPlaceholderFields(scrubMisleadingVerifiedText(clone(report)));
  const cleaned = scrubCrossScenarioResidue(data, {
    taskType: taskTypeOf(data),
    question: text(data.meta && data.meta.question_original),
  });
  ensureActionablePayload(cleaned, {
    taskType: taskTypeOf(cleaned),
    question: userQuestionText(cleaned),
  });
  const validation = validateScenarioContract(cleaned);
  const summary = evidenceSummary(cleaned);
  const evidenceMissing = summary.evidence_sources === 0 || (summary.claims > 0 && summary.bound === 0);
  const missingScenarioPayload = validation.warnings.some((warning) => String(warning).startsWith('scenario_payload.'));
  const aiAnalysisOnly = evidenceMissing && (hasAiAnalysisBasis(cleaned) || hasSessionAiBasis(context));
  const shouldDowngrade =
    !aiAnalysisOnly &&
    (needsPublicOpinionDowngrade(cleaned, summary) ||
      (evidenceMissing && (hasStrongConclusion(cleaned) || validation.errors.length > 0 || missingScenarioPayload)));

  if (aiAnalysisOnly) {
    applyAiCrossAnalysisGate(cleaned, validation, summary);
  } else if (shouldDowngrade) {
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

  ensureActionablePayload(cleaned, {
    taskType: taskTypeOf(cleaned),
    question: userQuestionText(cleaned),
  });
  return externalEvidenceEnabled ? cleaned : applyDisabledExternalEvidencePolicy(cleaned);
}

module.exports = {
  applyReportQualityGate,
  evidenceSummary,
  hasStrongConclusion,
};
