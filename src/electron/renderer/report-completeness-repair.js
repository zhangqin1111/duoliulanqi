(function attachReportCompletenessRepair(root) {
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

  function isEmpty(value) {
    if (value == null) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return String(value).trim() === '';
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

  function modelNames(session) {
    const names = compactReplies(session).map((reply) => reply.model).filter(Boolean);
    return names.length ? names : ['多模型材料'];
  }

  function firstReplyText(session) {
    const reply = compactReplies(session)[0];
    return reply && reply.text ? reply.text.slice(0, 180) : '当前材料未提供足够可核验细节';
  }

  function ensureTopLevelReport(report, session, taskType) {
    const source = report && typeof report === 'object' ? report : {};
    const question = (session && (session.originalQuestion || session.question)) || '';
    const names = modelNames(session);
    return {
      meta: {
        question_original: question,
        question_refined: (session && session.question) || question,
        generated_at: new Date().toISOString(),
        models: names,
        workflow_rounds: Math.max(1, (session && Array.isArray(session.diffAnalyses) && session.diffAnalyses.length) || 1),
        task_type: taskType,
        task_label: (session && session.taskRoute && session.taskRoute.label) || '',
        workflow: (session && session.taskRoute && session.taskRoute.recommended_workflow) || '',
        template: (session && session.taskRoute && session.taskRoute.recommended_template) || '',
        ...((source && source.meta) || {}),
        task_type: taskType,
      },
      executive_conclusion: {
        one_sentence: '当前材料可形成阶段性分析，但关键事实仍需来源核验后再拍板。',
        status: 'insufficient',
        confidence_score: 58,
        confidence_label: '待核验',
        core_tension: '多模型回答已收集，但场景化证据字段不完整。',
        largest_uncertainty: '缺少可交叉验证的一手来源或完整结构化字段。',
        risk_level: 'medium',
        ...((source && source.executive_conclusion) || {}),
      },
      scenario_decision: {
        task_type: taskType,
        task_label: (session && session.taskRoute && session.taskRoute.label) || '',
        decision_object: question,
        direct_verdict: '先保留阶段性判断，不输出无来源强裁决。',
        recommended_action: '先查看当前材料和缺口清单，补齐来源、时间、主体、证据和核验口径后再生成最终报告。',
        evidence_standard: '强结论必须绑定原始来源、权威来源或可复核材料；无法绑定的内容一律标注为待核验。',
        do_not_overread: ['不要把模型一致性当作事实证据', '不要把待核验内容写成确定事实'],
        decision_factors: [
          { label: '证据完整度', score: 52, note: '当前字段不完整，需要补齐场景 payload。' },
          { label: '可执行性', score: 58, note: '可以查看材料，但不宜直接拍板。' },
          { label: '风险边界', score: 64, note: '已保留待核验边界，避免误导。' },
        ],
        next_questions: ['哪些事实有原始来源？', '哪些说法只来自模型推测？', '下一步应核验哪些关键字段？'],
        ...((source && source.scenario_decision) || {}),
        task_type: taskType,
      },
      scenario_payload: { ...((source && source.scenario_payload) || {}) },
      question_brief: {
        original: question,
        refined: (session && session.question) || question,
        constraints: [],
        analysis_goals: ['直接回答用户问题', '标注事实边界', '输出下一步核验动作'],
        ...((source && source.question_brief) || {}),
      },
      user_issue_analysis: {
        direct_answer: '当前材料不足以输出强裁决；可先查看已收集材料与待核验缺口。',
        public_opinion_temperature: 50,
        temperature_label: '待核验',
        dominant_sentiment: '材料不足',
        sentiment_distribution: [{ label: '待核验信息', value: 100 }],
        stance_distribution: [{ label: '暂不强裁决', value: 100 }],
        audience_segments: [{ label: '决策者', heat: 50, credibility: 50, weight: 70 }],
        key_findings: ['报告结构字段缺失，系统已生成可审计缺口清单。'],
        narrative_summary: firstReplyText(session),
        risk_matrix: [{ title: '证据缺口', impact: 72, probability: 68, mitigation: '补齐来源后再生成最终裁决。' }],
        blindspots: ['缺少完整场景字段', '缺少外部来源绑定'],
        ...((source && source.user_issue_analysis) || {}),
      },
      fact_map: {
        timeline: [],
        confirmed_facts: [],
        uncertain_claims: [],
        polluted_claims: [],
        ...((source && source.fact_map) || {}),
      },
      dispute_map: {
        summary: '当前保留多模型差异和待核验缺口。',
        items: [],
        ...((source && source.dispute_map) || {}),
      },
      evidence_funnel: {
        raw_claims: compactReplies(session).length,
        cross_checked: 0,
        followup_retained: Array.isArray(session && session.diffAnalyses) ? session.diffAnalyses.length : 0,
        pollution_removed: 0,
        final_evidence: 0,
        ...((source && source.evidence_funnel) || {}),
      },
      model_profiles: source.model_profiles || [],
      source_diagnosis: {
        root_causes: ['结构化字段缺失', '证据来源不足'],
        pollution_factors: [],
        retained_judgment: '保留阶段性材料，不输出强事实裁决。',
        ...((source && source.source_diagnosis) || {}),
      },
      final_actions:
        Array.isArray(source.final_actions) && source.final_actions.length
          ? source.final_actions
          : ['查看当前材料', '补齐缺失场景字段', '重新生成最终报告'],
    };
  }

  function payloadItemForKey(key, session, taskType) {
    const note = '系统未从模型输出中取得该字段的可核验内容，已转为人工核验项。';
    const question = (session && (session.originalQuestion || session.question)) || '用户问题';
    const common = { verification_status: '待核验', source_note: note };
    const map = {
      signal_matrix: [{ signal: '待核验信号', status: 'uncertain', note, sources: modelNames(session) }],
      verified_events: [{ time: '待核验', event: '未形成可验证事件闭环', status: 'uncertain', sources: modelNames(session), note }],
      actor_map: [{ actor: question, role: '相关主体待核验', stance: 'uncertain', note }],
      risk_triggers: [{ trigger: '证据字段缺失', level: 'medium', action: '补齐来源后再判断风险等级' }],
      claim_table: [{ claim: question, status: 'uncertain', evidence_level: '待核验', note }],
      source_table: [{ source: '待补充来源', type: 'manual_check', reliability: '待核验', note }],
      verification_path: ['补齐原始来源', '交叉核验时间与主体', '重新生成最终裁决'],
      candidate_table: [{ name: '待核验候选', model: '待核验', status: 'uncertain', ...common }],
      dimension_scores: [{ label: '信息完整度', score: 50, note }],
      selection_matrix: [{ option: '待核验方案', fit: 50, risk: 70, note }],
      value_weights: [{ label: '事实可核验性', weight: 40, reason: '缺来源时优先级最高' }],
      persona_rankings: [{ persona: '通用用户', ranking: ['待核验候选'], reason: note }],
      recommendations: { primary: null, alternatives: [], not_recommended: [], note: '材料不足，暂不输出强推荐。' },
      manual_verification_items: ['来源', '时间', '主体', '价格/参数/配置（如适用）', '当前状态'],
      target_table: [{ target: question, status: '待核验', note }],
      financial_metrics: [{ metric: '关键指标', value: '待核验', note }],
      risk_factors: [{ risk: '证据不足', level: 'medium', note }],
      scenario_cases: [{ case: '基准情形', assumption: '待核验', implication: '暂不拍板' }],
      issue_table: [{ issue: question, risk: '待核验', note }],
      evidence_table: [{ evidence: '待补充证据', status: 'missing', note }],
      risk_levels: [{ level: 'medium', reason: '材料不足', action: '咨询专业人士/补齐证据' }],
      lawyer_questions: ['管辖地是什么？', '原始材料是否完整？', '是否需要律师复核？'],
      concept_map: [{ concept: question, boundary: '待核验', note }],
      consensus_points: ['当前只能保留多模型共同提到的方向，不能写成强事实。'],
      open_questions: ['哪些定义、边界或资料来源需要继续确认？'],
      audience_table: [{ audience: '目标受众待确认', need: '待核验', note }],
      creative_routes: [{ route: '保守可用方向', value: '待核验', note }],
      risk_words: ['夸大', '绝对化', '无来源事实'],
      deliverables: [{ deliverable: '可复核草案', status: '待补充素材' }],
      symptom_table: [{ symptom: question, evidence: '待核验', note }],
      root_cause_hypotheses: [{ hypothesis: '证据不足导致无法定位根因', confidence: 50, note }],
      fix_plan: [{ step: '补齐日志/环境/复现路径', status: 'next' }],
      verification_steps: ['补齐复现信息', '定位最小失败样本', '验证修复结果'],
      learning_path: [{ step: '明确学习目标', output: '待核验', note }],
      resource_table: [{ resource: '待选择资料', reliability: '待核验', note }],
      milestones: [{ milestone: '阶段成果', criteria: '待定义' }],
      practice_plan: [{ practice: '输出练习', frequency: '待定' }],
      option_table: [{ option: '待核验方案', fit: 50, note }],
      itinerary_matrix: [{ day: '待规划', plan: '待核验', risk: '实时信息缺失' }],
      cost_table: [{ item: '预算项', cost: '待核验', note }],
      risk_notes: [{ risk: '实时信息缺失', mitigation: '出行/购买/决策前二次核验' }],
      role_table: [{ role: '目标岗位待确认', fit: 50, note }],
      fit_matrix: [{ dimension: '匹配度', score: 50, note }],
      gap_plan: [{ gap: '信息缺口', action: '补齐材料' }],
      action_plan: [{ action: '补齐关键材料', owner: '用户/系统', status: 'next' }],
      symptom_summary: [{ symptom: question, severity: '待分诊', note }],
      risk_triage: [{ level: 'unknown', action: '如有急重症信号请及时就医', note }],
      care_actions: ['记录症状时间线', '补充年龄/基础病/用药信息', '必要时线下就医'],
      doctor_questions: ['症状持续多久？', '是否有基础病？', '是否出现急重症信号？'],
      asset_snapshot: [{ asset: '资产/负债待确认', value: '待核验', note }],
      risk_profile: [{ dimension: '风险承受能力', value: '待评估', note }],
      allocation_options: [{ option: '保守观察', risk: 'low', note: '不构成投资建议' }],
      comparison_table: [{ object: question, dimension: '待明确', value: '待核验' }],
      decision_matrix: [{ option: '待核验方案', score: 50, reason: note }],
    };
    return map[key] || [{ key, value: '待核验', task_type: taskType, note }];
  }

  function completeMissingFieldsDeterministically(report, session, audit) {
    const taskType = (audit && audit.taskType) || (session && session.taskType) || 'general_compare';
    const out = ensureTopLevelReport(report, session, taskType);
    out.scenario_payload = out.scenario_payload || {};
    for (const key of REQUIRED_PAYLOAD_KEYS[taskType] || REQUIRED_PAYLOAD_KEYS.general_compare) {
      if (isEmpty(out.scenario_payload[key])) out.scenario_payload[key] = payloadItemForKey(key, session, taskType);
    }
    const actionContracts =
      root.DuoliScenarioActionContracts ||
      (typeof require === 'function' ? require('../shared/scenario-action-contracts') : null);
    if (actionContracts && typeof actionContracts.ensureActionablePayload === 'function') {
      actionContracts.ensureActionablePayload(out, {
        taskType,
        question: session && (session.originalQuestion || session.question),
      });
    }
    return out;
  }

  const api = {
    completeMissingFieldsDeterministically,
  };

  root.DuoliReportCompletenessRepair = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
