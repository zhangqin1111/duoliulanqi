(function attachReportSchema(global) {
  function safeArray(value) {
    return Array.isArray(value) ? value.filter((item) => item != null) : [];
  }

  function safeText(value, fallback) {
    const text = String(value == null ? '' : value).trim();
    return text || fallback || '';
  }

  function clampScore(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  function stripFence(text) {
    return String(text || '')
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }

  function parseJsonLoose(text) {
    const raw = stripFence(text);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      try {
        return JSON.parse(raw.replace(/,\s*([}\]])/g, '$1'));
      } catch (__) {
        return null;
      }
    }
  }

  function extractStructuredJson(text) {
    const source = String(text || '');
    if (!source.trim()) return null;
    const fenceRe = /```json\s*([\s\S]*?)```/gi;
    let lastFence = '';
    let match;
    while ((match = fenceRe.exec(source)) !== null) {
      lastFence = match[1];
    }
    if (lastFence) {
      const parsed = parseJsonLoose(lastFence);
      if (parsed && typeof parsed === 'object') return parsed;
    }

    const marker = '"executive_conclusion"';
    const markerIndex = source.lastIndexOf(marker);
    const start = markerIndex >= 0 ? source.lastIndexOf('{', markerIndex) : source.lastIndexOf('{');
    const end = source.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const parsed = parseJsonLoose(source.slice(start, end + 1));
      if (parsed && typeof parsed === 'object') return parsed;
    }
    return null;
  }

  function normalizeExecutiveConclusion(input) {
    const source = input || {};
    return {
      one_sentence: safeText(source.one_sentence || source.core_conclusion, '暂未形成明确裁决'),
      status: safeText(source.status, 'insufficient'),
      confidence_score: clampScore(source.confidence_score, 50),
      confidence_label: safeText(source.confidence_label, '待核验'),
      core_tension: safeText(source.core_tension, '多模型回答尚未形成清晰核心矛盾'),
      largest_uncertainty: safeText(source.largest_uncertainty, '缺少可交叉验证的一手证据'),
      risk_level: safeText(source.risk_level, 'medium'),
    };
  }

  function normalizeQuestionBrief(input, fallback) {
    const source = input || {};
    return {
      original: safeText(source.original, fallback.originalQuestion || fallback.question || ''),
      refined: safeText(source.refined, fallback.question || ''),
      constraints: safeArray(source.constraints).map((item) => safeText(item)).filter(Boolean),
      analysis_goals: safeArray(source.analysis_goals).map((item) => safeText(item)).filter(Boolean),
    };
  }

  function normalizeEvidenceFunnel(input) {
    const source = input || {};
    return {
      raw_claims: Math.max(0, Math.round(Number(source.raw_claims) || 0)),
      cross_checked: Math.max(0, Math.round(Number(source.cross_checked) || 0)),
      followup_retained: Math.max(0, Math.round(Number(source.followup_retained) || 0)),
      pollution_removed: Math.max(0, Math.round(Number(source.pollution_removed) || 0)),
      final_evidence: Math.max(0, Math.round(Number(source.final_evidence || source.final_judgments) || 0)),
    };
  }

  function normalizeUserIssueAnalysis(input) {
    const source = input || {};
    return {
      direct_answer: safeText(source.direct_answer, ''),
      public_opinion_temperature: clampScore(source.public_opinion_temperature, 50),
      temperature_label: safeText(source.temperature_label, '中等热度'),
      dominant_sentiment: safeText(source.dominant_sentiment, '未明确'),
      sentiment_distribution: safeArray(source.sentiment_distribution).map((item) => ({
        label: safeText(item && item.label),
        value: Math.max(0, Math.round(Number(item && item.value) || 0)),
        note: safeText(item && item.note),
      })).filter((item) => item.label),
      stance_distribution: safeArray(source.stance_distribution).map((item) => ({
        label: safeText(item && item.label),
        value: Math.max(0, Math.round(Number(item && item.value) || 0)),
        note: safeText(item && item.note),
      })).filter((item) => item.label),
      audience_segments: safeArray(source.audience_segments).map((item) => ({
        label: safeText(item && item.label),
        heat: clampScore(item && item.heat, 50),
        credibility: clampScore(item && item.credibility, 50),
        weight: clampScore(item && item.weight, 50),
        narrative: safeText(item && item.narrative),
      })).filter((item) => item.label),
      key_findings: safeArray(source.key_findings).map((v) => safeText(v)).filter(Boolean),
      narrative_summary: safeText(source.narrative_summary, ''),
      risk_matrix: safeArray(source.risk_matrix).map((item) => ({
        title: safeText(item && item.title),
        impact: clampScore(item && item.impact, 50),
        probability: clampScore(item && item.probability, 50),
        mitigation: safeText(item && item.mitigation),
      })).filter((item) => item.title),
      blindspots: safeArray(source.blindspots).map((v) => safeText(v)).filter(Boolean),
    };
  }

  function normalizeFactItem(item, index) {
    const source = item || {};
    return {
      id: safeText(source.id, `F${index + 1}`),
      time: safeText(source.time || source.date, '未指定时间/待核验'),
      event: safeText(source.event || source.claim || source.fact, '未命名事实点'),
      status: safeText(source.status, 'uncertain'),
      sources: safeArray(source.sources || source.models).map((v) => safeText(v)).filter(Boolean),
      note: safeText(source.note || source.reason),
    };
  }

  function normalizeDiffItem(item, index) {
    const source = item || {};
    return {
      id: safeText(source.id, `D${index + 1}`),
      title: safeText(source.title || source.topic, '未命名差异点'),
      type: safeText(source.type, '差异'),
      severity: safeText(source.severity, 'medium'),
      why_it_matters: safeText(source.why_it_matters, '该差异会影响最终可信判断'),
      model_claims: safeArray(source.model_claims || source.claims).map((claim, claimIndex) => ({
        model: safeText(claim && claim.model, `模型${claimIndex + 1}`),
        claim: safeText(claim && claim.claim),
        evidence_level: safeText(claim && claim.evidence_level, '中'),
        risk: safeText(claim && claim.risk),
      })),
      followup_question: safeText(source.followup_question),
      followup_summary: safeText(source.followup_summary || source.cleaned_interpretation),
      pollution_removed: safeArray(source.pollution_removed).map((v) => safeText(v)).filter(Boolean),
      retained_judgment: safeText(source.retained_judgment),
    };
  }

  function normalizeModelProfile(item, index) {
    const source = item || {};
    const scores = source.scores || {};
    return {
      model: safeText(source.model, `模型${index + 1}`),
      witness_type: safeText(source.witness_type || source.type, '待观察证人'),
      strengths: safeArray(source.strengths).map((v) => safeText(v)).filter(Boolean),
      risks: safeArray(source.risks).map((v) => safeText(v)).filter(Boolean),
      scores: {
        fact_fidelity: clampScore(scores.fact_fidelity || scores['事实保真度'], 50),
        time_sensitivity: clampScore(scores.time_sensitivity || scores['时间敏感度'], 50),
        logic_consistency: clampScore(scores.logic_consistency || scores['逻辑自洽度'], 50),
        information_density: clampScore(scores.information_density || scores['信息密度'], 50),
        verifiability: clampScore(scores.verifiability || scores['可核验性'], 50),
        pollution_control: clampScore(scores.pollution_control || scores['污染控制'], 50),
        followup_responsiveness: clampScore(scores.followup_responsiveness || scores['追问响应力'], 50),
      },
    };
  }

  function normalizeScenarioDecision(input, fallback) {
    const source = input || {};
    const route = (fallback && fallback.taskRoute) || {};
    return {
      task_type: safeText(source.task_type, fallback.taskType || route.task_type || 'general_compare'),
      task_label: safeText(source.task_label, route.label || ''),
      decision_object: safeText(source.decision_object || source.object, ''),
      direct_verdict: safeText(source.direct_verdict || source.verdict, ''),
      recommended_action: safeText(source.recommended_action || source.action, ''),
      evidence_standard: safeText(source.evidence_standard || source.standard, ''),
      do_not_overread: safeArray(source.do_not_overread || source.limits).map((v) => safeText(v)).filter(Boolean),
      decision_factors: safeArray(source.decision_factors || source.factors).map((item, index) => ({
        label: safeText(item && item.label, `因素${index + 1}`),
        score: clampScore(item && item.score, 50),
        note: safeText(item && item.note),
      })),
      next_questions: safeArray(source.next_questions || source.questions).map((v) => safeText(v)).filter(Boolean),
    };
  }

  function normalizeFactReport(raw, fallback) {
    if (!raw || typeof raw !== 'object') return null;
    const factMap = raw.fact_map || {};
    const disputeMap = raw.dispute_map || {};
    const sourceDiagnosis = raw.source_diagnosis || {};
    const report = {
      meta: {
        question_original: safeText(raw.meta && raw.meta.question_original, fallback.originalQuestion || fallback.question || ''),
        question_refined: safeText(raw.meta && raw.meta.question_refined, fallback.question || ''),
        generated_at: safeText(raw.meta && raw.meta.generated_at, new Date().toISOString()),
        models: safeArray(raw.meta && raw.meta.models).map((v) => safeText(v)).filter(Boolean),
        workflow_rounds: Math.max(1, Math.round(Number(raw.meta && raw.meta.workflow_rounds) || 1)),
        task_type: safeText(
          raw.meta && raw.meta.task_type,
          fallback.taskType || (fallback.taskRoute && fallback.taskRoute.task_type) || 'general_compare'
        ),
        task_label: safeText(raw.meta && raw.meta.task_label, fallback.taskRoute && fallback.taskRoute.label),
        workflow: safeText(raw.meta && raw.meta.workflow, fallback.taskRoute && fallback.taskRoute.recommended_workflow),
        template: safeText(raw.meta && raw.meta.template, fallback.taskRoute && fallback.taskRoute.recommended_template),
      },
      executive_conclusion: normalizeExecutiveConclusion(raw.executive_conclusion),
      user_issue_analysis: normalizeUserIssueAnalysis(raw.user_issue_analysis || raw.issue_analysis || raw.public_opinion_analysis),
      question_brief: normalizeQuestionBrief(raw.question_brief, fallback || {}),
      fact_map: {
        timeline: safeArray(factMap.timeline || raw.fact_timeline).map(normalizeFactItem),
        confirmed_facts: safeArray(factMap.confirmed_facts || raw.verified_facts).map(normalizeFactItem),
        uncertain_claims: safeArray(factMap.uncertain_claims || raw.uncertain_claims).map(normalizeFactItem),
        polluted_claims: safeArray(factMap.polluted_claims || raw.polluted_claims).map(normalizeFactItem),
      },
      dispute_map: {
        summary: safeText(disputeMap.summary, '暂未形成争议总览'),
        items: safeArray(disputeMap.items || raw.diff_details || raw.disputed_points).map(normalizeDiffItem),
      },
      evidence_funnel: normalizeEvidenceFunnel(raw.evidence_funnel),
      model_profiles: safeArray(raw.model_profiles || raw.model_reliability).map(normalizeModelProfile),
      source_diagnosis: {
        root_causes: safeArray(sourceDiagnosis.root_causes || raw.root_causes).map((v) => safeText(v)).filter(Boolean),
        pollution_factors: safeArray(sourceDiagnosis.pollution_factors || raw.pollution_removed).map((v) =>
          typeof v === 'string' ? v : safeText(v && (v.reason || v.content || v.type))
        ).filter(Boolean),
        retained_judgment: safeText(sourceDiagnosis.retained_judgment || raw.final_judgment, ''),
      },
      scenario_decision: normalizeScenarioDecision(raw.scenario_decision || raw.decision_brief, fallback || {}),
      scenario_payload: raw.scenario_payload && typeof raw.scenario_payload === 'object' ? raw.scenario_payload : {},
      final_actions: safeArray(raw.final_actions || raw.next_actions).map((v) => safeText(v)).filter(Boolean),
      raw,
    };
    report.isStructuredFactReport = true;
    return report;
  }

  global.DuoliReportSchema = {
    extractStructuredJson,
    normalizeFactReport,
    parseJsonLoose,
  };
})(window);
