'use strict';

const { validateReportSchema, inferTaskType } = require('./report-schema-registry');

function stripFence(text) {
  return String(text || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function parseJsonLoose(text) {
  const raw = stripFence(text);
  if (!raw) return null;
  const candidates = [
    raw,
    raw.replace(/,\s*([}\]])/g, '$1'),
    raw.replace(/^[^{]*/, '').replace(/[^}]*$/, ''),
  ];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (error) {
      /* try next candidate */
    }
  }
  return null;
}

function extractStructuredJson(text) {
  const source = String(text || '');
  if (!source.trim()) return null;
  const direct = parseJsonLoose(source);
  if (direct) return direct;

  const fenceRe = /```json\s*([\s\S]*?)```/gi;
  let lastFence = '';
  let match;
  while ((match = fenceRe.exec(source)) !== null) lastFence = match[1];
  if (lastFence) {
    const parsed = parseJsonLoose(lastFence);
    if (parsed) return parsed;
  }

  const markerIndex = source.lastIndexOf('"executive_conclusion"');
  const start = markerIndex >= 0 ? source.lastIndexOf('{', markerIndex) : source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start >= 0 && end > start) return parseJsonLoose(source.slice(start, end + 1));
  return null;
}

function safeText(value, fallback) {
  const text = String(value == null ? '' : value).trim();
  return text || fallback || '';
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function taskTypeFrom(payload, source) {
  return safeText(
    source && source.meta && source.meta.task_type,
    safeText(
      source && source.scenario_decision && source.scenario_decision.task_type,
      safeText(payload && payload.taskRoute && payload.taskRoute.task_type, 'general_compare')
    )
  );
}

function buildFallbackReport(payload, source) {
  const taskType = taskTypeFrom(payload, source);
  const question = safeText(payload && payload.question, safeText(payload && payload.questionText, '未命名问题'));
  const route = (payload && payload.taskRoute) || {};
  const rawReplies = safeArray(payload && payload.rawReplies);
  const usableReplies = rawReplies.filter((reply) => safeText(reply && reply.text));
  const claimCount = Math.max(usableReplies.length, rawReplies.length, 1);

  return {
    meta: {
      task_type: taskType,
      task_label: safeText(route.label, taskType),
      question_original: question,
      question_refined: question,
      generated_at: new Date().toISOString(),
      models: rawReplies.map((reply) => safeText(reply && reply.model, safeText(reply && reply.name))).filter(Boolean),
    },
    executive_conclusion: {
      one_sentence: '当前报告材料不完整，已基于现有多模型结果生成可恢复版本。',
      confidence_score: usableReplies.length ? 55 : 35,
      risk_level: 'medium',
      status: 'partial',
    },
    question_brief: {
      original: question,
      refined: question,
      constraints: [],
      analysis_goals: ['基于当前材料保留可用判断', '标注缺失字段和待核验信息'],
    },
    scenario_decision: {
      task_type: taskType,
      task_label: safeText(route.label, taskType),
      decision_object: question,
      direct_verdict: '当前材料不足以形成强裁决，建议补充证据后复核。',
      recommended_action: '先查看当前材料报告，再重试失败阶段或补充证据。',
      evidence_standard: '至少需要多模型一致性和可核验证据支持。',
      do_not_overread: ['不要把当前降级报告当作最终强结论。'],
      decision_factors: [{ label: '材料完整度', score: usableReplies.length ? 55 : 30, note: '由可用模型回复数量估算。' }],
      next_questions: ['是否需要重试失败模型？', '是否有权威来源或原始材料可补充？'],
    },
    user_issue_analysis: {
      direct_answer: '当前仅能给出阶段性判断。',
      public_opinion_temperature: 50,
      key_findings: usableReplies.length ? ['已有部分模型回复可用于阶段性分析。'] : ['尚未收集到有效模型回复。'],
      sentiment_distribution: [],
      stance_distribution: [],
      audience_segments: [],
      risk_matrix: [],
    },
    fact_map: {
      timeline: [],
      confirmed_facts: [],
      uncertain_claims: [],
      polluted_claims: [],
    },
    dispute_map: {
      summary: '当前未形成完整差异图谱。',
      items: [],
    },
    evidence_funnel: {
      raw_claims: claimCount,
      cross_checked: usableReplies.length,
      followup_retained: 0,
      pollution_removed: 0,
      final_evidence: Math.max(1, usableReplies.length),
    },
    model_profiles: [],
    source_diagnosis: {
      root_causes: ['结构化 JSON 缺失或不完整。'],
      pollution_factors: [],
      retained_judgment: '保留当前可用材料，等待后续复核。',
    },
    final_actions: ['重试失败阶段', '补充权威证据', '导出当前材料报告'],
  };
}

function mergeMissing(defaults, source) {
  if (Array.isArray(defaults)) {
    return Array.isArray(source) && source.length ? source : defaults;
  }
  if (!defaults || typeof defaults !== 'object') {
    return source == null || source === '' ? defaults : source;
  }
  const out = source && typeof source === 'object' && !Array.isArray(source) ? { ...source } : {};
  for (const [key, value] of Object.entries(defaults)) {
    out[key] = mergeMissing(value, out[key]);
  }
  return out;
}

function repairStructuredReport(payload = {}) {
  const source =
    payload.structuredReport && typeof payload.structuredReport === 'object'
      ? payload.structuredReport
      : extractStructuredJson(payload.summaryText);
  const fallback = buildFallbackReport(payload, source || {});
  const structured = mergeMissing(fallback, source || {});
  const taskType = inferTaskType(structured);
  const validation = validateReportSchema(structured, taskType);
  const warnings = [];
  if (!source) warnings.push('structured_json_missing');
  if (!validation.ok) warnings.push('schema_validation_failed');
  return {
    structured,
    validation,
    warnings,
    repaired: warnings.length > 0 || validation.warnings.length > 0,
  };
}

module.exports = {
  extractStructuredJson,
  parseJsonLoose,
  repairStructuredReport,
  buildFallbackReport,
  mergeMissing,
};
