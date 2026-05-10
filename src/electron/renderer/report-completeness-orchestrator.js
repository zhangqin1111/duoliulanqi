(function attachReportCompletenessOrchestrator(root) {
  const REQUIRED_PAYLOAD_KEYS = {
    public_opinion: ['signal_matrix', 'verified_events', 'actor_map', 'risk_triggers'],
    fact_check: ['claim_table', 'source_table', 'verification_path'],
    competitor_analysis: ['candidate_table', 'dimension_scores', 'selection_matrix'],
    consumer_purchase: ['candidate_table', 'value_weights', 'persona_rankings', 'recommendations', 'manual_verification_items'],
    investment_research: ['target_table', 'financial_metrics', 'risk_factors', 'scenario_cases'],
    legal_risk: ['issue_table', 'evidence_table', 'risk_levels', 'lawyer_questions'],
    knowledge_brief: ['concept_map', 'consensus_points', 'open_questions'],
    creative_content: ['audience_table', 'creative_routes', 'risk_words', 'deliverables'],
    technical_diagnosis: ['symptom_table', 'root_cause_hypotheses', 'fix_plan', 'verification_steps'],
    learning_research: ['learning_path', 'resource_table', 'milestones', 'practice_plan'],
    travel_lifestyle: ['option_table', 'itinerary_matrix', 'cost_table', 'risk_notes'],
    career_recruiting: ['role_table', 'fit_matrix', 'gap_plan', 'action_plan'],
    medical_health: ['symptom_summary', 'risk_triage', 'care_actions', 'doctor_questions'],
    finance_planning: ['asset_snapshot', 'risk_profile', 'allocation_options', 'action_plan'],
    general_compare: ['comparison_table', 'decision_matrix', 'risk_notes'],
  };

  function taskTypeOf(report, session) {
    return String(
      (report && report.meta && report.meta.task_type) ||
        (report && report.scenario_decision && report.scenario_decision.task_type) ||
        (session && session.taskType) ||
        (session && session.taskRoute && session.taskRoute.task_type) ||
        'general_compare'
    ).trim();
  }

  function isEmpty(value) {
    if (value == null) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return String(value).trim() === '';
  }

  function extractStructuredReport(finalText) {
    const schema = root.DuoliReportSchema;
    if (!schema || typeof schema.extractStructuredJson !== 'function') return null;
    return schema.extractStructuredJson(finalText);
  }

  function auditStructuredReport(report, session) {
    const taskType = taskTypeOf(report, session);
    const payload = (report && report.scenario_payload) || {};
    const missingPayloadKeys = (REQUIRED_PAYLOAD_KEYS[taskType] || REQUIRED_PAYLOAD_KEYS.general_compare).filter((key) =>
      isEmpty(payload[key])
    );
    const missingTopLevel = [
      'meta',
      'executive_conclusion',
      'scenario_decision',
      'scenario_payload',
      'question_brief',
      'user_issue_analysis',
      'fact_map',
      'dispute_map',
      'evidence_funnel',
      'model_profiles',
      'source_diagnosis',
      'final_actions',
    ].filter((key) => !report || !(key in report));
    const hasJson = !!(report && typeof report === 'object');
    return {
      ok: hasJson && missingTopLevel.length === 0 && missingPayloadKeys.length === 0,
      taskType,
      hasJson,
      missingTopLevel,
      missingPayloadKeys,
    };
  }

  function compactReplies(session) {
    return (session && Array.isArray(session.initialResults) ? session.initialResults : [])
      .filter((reply) => reply && reply.ok !== false && reply.text)
      .slice(0, 5)
      .map((reply) => ({
        model: reply.name || reply.id || 'model',
        text: String(reply.text || '').slice(0, 2200),
      }));
  }

  function buildCompletionPrompt({ session, finalText, report, audit }) {
    return [
      '你是“滤镜·多源大模型内容对比分析”的报告质量总审稿人。',
      '当前最终报告的结构化 JSON 不完整。你的任务不是降级，不是解释失败，而是基于已有材料补齐一份可直接渲染、可用于决策的完整 JSON。',
      '',
      '硬性要求：',
      '1. 只输出一个 JSON 对象，不要 Markdown，不要解释。',
      '2. 必须保留用户原始问题，不得擅自编造确定事实、价格、时间、法规、医学或金融结论。',
      '3. 没有证据的事实字段可以写“待核验”，但必须补齐对应结构、核验口径、人工核验项和下一步动作。',
      '4. direct_answer / direct_verdict 必须直接回答用户真正想解决的问题。',
      '5. scenario_payload 必须完整；缺失字段必须全部补齐。',
      '',
      `任务类型：${audit.taskType}`,
      `用户原始问题：${(session && (session.originalQuestion || session.question)) || ''}`,
      `缺失顶层字段：${audit.missingTopLevel.join(', ') || '无'}`,
      `缺失场景字段：${audit.missingPayloadKeys.join(', ') || '无'}`,
      '',
      '已有结构化 JSON：',
      JSON.stringify(report || {}, null, 2).slice(0, 16000),
      '',
      '多模型原始回答摘要：',
      JSON.stringify(compactReplies(session), null, 2),
      '',
      '差异追问与污染剔除材料：',
      JSON.stringify(
        {
          diffAnalyses: session && session.diffAnalyses ? session.diffAnalyses : [],
          pollution: session && session.pollution ? session.pollution : null,
          selfCleansing: session && session.selfCleansing ? session.selfCleansing : null,
          evidencePack: session && session.evidencePack ? session.evidencePack : null,
        },
        null,
        2
      ).slice(0, 12000),
      '',
      '原报告文本摘录：',
      String(finalText || '').slice(0, 8000),
    ].join('\n');
  }

  function replaceStructuredJson(finalText, structured) {
    const jsonBlock = `\n\n\`\`\`json\n${JSON.stringify(structured, null, 2)}\n\`\`\``;
    const source = String(finalText || '');
    const re = /```json\s*[\s\S]*?```/gi;
    let match;
    let last = null;
    while ((match = re.exec(source)) !== null) last = { start: match.index, end: re.lastIndex };
    if (!last) return `${source.trim()}${jsonBlock}`;
    return `${source.slice(0, last.start).trim()}${jsonBlock}${source.slice(last.end)}`;
  }

  async function completeFinalReport({ api, core, session, finalText }) {
    const report = extractStructuredReport(finalText);
    const audit = auditStructuredReport(report, session);
    if (audit.ok) return { text: finalText, structured: report, audit, completed: false };
    if (!core || typeof core.qwenJson !== 'function') {
      throw new Error(`报告 JSON 不完整，且缺少补齐引擎：${audit.missingPayloadKeys.join(', ') || audit.missingTopLevel.join(', ')}`);
    }
    const prompt = buildCompletionPrompt({ session, finalText, report, audit });
    const completed = await core.qwenJson(api, prompt, report || {}, { timeoutMs: 180000, retries: 1, preferQwen: false });
    const completedAudit = auditStructuredReport(completed, session);
    if (!completedAudit.ok) {
      throw new Error(
        `报告质量补齐失败，仍缺少：${[...completedAudit.missingTopLevel, ...completedAudit.missingPayloadKeys].join(', ')}`
      );
    }
    return {
      text: replaceStructuredJson(finalText, completed),
      structured: completed,
      audit: completedAudit,
      completed: true,
    };
  }

  const api = {
    auditStructuredReport,
    buildCompletionPrompt,
    completeFinalReport,
    extractStructuredReport,
    replaceStructuredJson,
  };

  root.DuoliReportCompletenessOrchestrator = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
