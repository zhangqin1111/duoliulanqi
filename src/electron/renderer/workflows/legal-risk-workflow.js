(function attachLegalRiskWorkflow(global) {
  function formatReplies(modelReplies) {
    return (Array.isArray(modelReplies) ? modelReplies : [])
      .map((reply) =>
        [`【${reply.name || '未知模型'}】`, reply.ok ? reply.text : `未获得有效回答：${reply.error || 'unknown'}`, ''].join('\n')
      )
      .join('\n');
  }

  function formatDiffClaims(diff) {
    const claims = Array.isArray(diff && diff.claims) ? diff.claims : [];
    if (!claims.length) return '未能抽取到清晰 claim。';
    return claims.map((claim) => `- ${claim.model || '未知模型'}：${claim.claim || ''}`).join('\n');
  }

  function buildRefinePrompt(rawQuestion, context) {
    const hasDateHint = !!(context && context.hasDateHint);
    const timeRule =
      (context && context.timeBoundaryRule) ||
      (hasDateHint
        ? '用户原句包含日期或时间线索：必须沿用用户给出的时间，不要自行扩展、替换或新增时间范围。'
        : '用户没有给出明确时间边界：不要替用户补具体年份、月份、日期、起止时间或“最新/当前”等事实前提；只补核验维度、输出结构和需要 AI 自行确认的资料时效。');
    const noFactRule =
      (context && context.noFactInjectionRule) ||
      '补全只补任务维度、核验口径、输出字段和追问方向；不得替用户直接回答确定事实。';
    return [
      '你是“滤镜工作台”的法律/合规初筛任务书生成器。',
      '用户可能询问合同条款、业务行为、宣传文案、平台规则、劳动/知识产权/数据合规等风险。你的任务是把它补全成可分发给多个 AI 的“法律合规风险初筛任务”。',
      '',
      '补全目标：后续系统要识别风险点、涉及主体、争议事实、可能适用的规则方向、风险等级、待核验证据和需要专业人士复核的问题。',
      '',
      '硬性约束：',
      '1. 只能做风险初筛和信息整理，不输出正式法律意见，不替代律师判断，不承诺结论。',
      `1A. ${noFactRule}`,
      `2. ${timeRule}`,
      '3. 必须要求模型区分：用户提供事实、模型推断、法律/规则方向、关键证据缺口、需要律师复核的问题。',
      '4. 必须要求模型输出：风险点列表、可能触发规则、风险等级、成立条件、反向抗辩/例外、证据缺口、合规建议、专业复核问题。',
      '5. 不要求网页模型输出严格 JSON；后续报告 JSON 由系统统一生成。',
      '6. 不要输出解释、标题、Markdown 包装、前后缀说明；只输出补全后的问题正文。',
      '7. 长度控制在 180-460 字。',
      '',
      `用户原始问题：\n${String(rawQuestion || '').trim()}`,
      '',
      '请直接输出补全后的法律/合规初筛任务：',
    ].join('\n');
  }

  function buildDiffExtractPrompt({ question, modelReplies }) {
    return [
      '你是“法律/合规初筛”链路里的风险差异侦查员。',
      '任务：只基于多个 AI 对同一法律/合规问题的回答，抽取会影响风险判断的差异点。',
      '不要补充外部事实，不要输出正式法律意见。',
      '',
      '优先识别这些合规差异：',
      '- 风险点拆解是否不同',
      '- 适用规则方向是否不一致或过度确定',
      '- 成立条件、例外、抗辩理由是否遗漏',
      '- 是否把事实假设当成已证事实',
      '- 风险等级是否被夸大或低估',
      '- 是否缺少管辖地、合同全文、行为证据、主体身份等关键条件',
      '',
      '差异类型只能从这些值中选择：风险点差异、规则方向差异、成立条件差异、证据缺口差异、例外抗辩差异、风险等级差异、污染疑似、表达差异。',
      '严重度只能从 high、medium、low 中选择。',
      '如果只是同义改写，type 必须是表达差异，needs_followup 为 false。',
      '',
      '请严格输出 JSON，不要 Markdown，不要解释：',
      '{',
      '  "overview": "一句话概括本轮合规风险差异情况",',
      '  "diffs": [',
      '    {',
      '      "id": "D1",',
      '      "topic": "差异主题",',
      '      "type": "风险点差异 | 规则方向差异 | 成立条件差异 | 证据缺口差异 | 例外抗辩差异 | 风险等级差异 | 污染疑似 | 表达差异",',
      '      "models": ["模型名"],',
      '      "claims": [{"model":"模型名","claim":"该模型的核心说法"}],',
      '      "severity": "high | medium | low",',
      '      "needs_followup": true,',
      '      "why_it_matters": "为什么这个差异影响风险初筛"',
      '    }',
      '  ]',
      '}',
      '',
      `法律/合规问题：${question}`,
      '',
      '模型回答：',
      formatReplies(modelReplies),
    ].join('\n');
  }

  function buildDiffFollowupQuestion({ question, diff, round }) {
    return [
      `原始法律/合规问题：${question}`,
      '',
      `多个 AI 在「${diff.topic}」上出现不一致。`,
      `差异类型：${diff.type}`,
      `第 ${round} 轮追问目标：解释为什么这些 AI 会得出不同风险判断、适用规则方向或成立条件。`,
      '',
      '各模型差异说法：',
      formatDiffClaims(diff),
      '',
      '请只回答“为什么不一致”，不要重新泛泛回答原始问题，不要输出正式法律意见。',
      '必须区分以下原因：事实前提不同、管辖地/规则范围不同、条款上下文缺失、证据条件缺失、成立条件不同、例外/抗辩遗漏、风险等级口径不同、模型过度确定、只是表达不同。',
      '最后给出：最可能的差异源头、应剔除的污染因素、保留后仍可采信的初筛判断，以及必须交给律师/合规人员复核的问题。',
    ].join('\n');
  }

  function buildPollutionPrompt({ question, modelReplies, diffAnalyses }) {
    return [
      '你是“法律/合规初筛”链路里的污染剔除器。',
      '任务：基于原始回答、差异追问和二次合并结果，识别并剔除会污染风险初筛的内容。',
      '',
      '法律/合规污染类型包括：正式法律意见伪装、过度确定结论、缺少管辖地、缺少合同全文、事实假设当事实、规则误读、忽略例外/抗辩、风险等级夸大、模板免责声明过量、AI 幻觉补全。',
      '',
      '请严格输出 JSON，不要 Markdown：',
      '{',
      '  "pollution_removed": [{"source":"模型或阶段","type":"污染类型","content":"被剔除内容","reason":"剔除原因"}],',
      '  "kept_claims": ["保留下来的有效风险初筛判断"],',
      '  "discarded_claims": ["剔除或降权的说法"],',
      '  "root_causes": ["差异源头归因"],',
      '  "unresolved": ["仍无法确定的点"]',
      '}',
      '',
      `原始法律/合规问题：${question}`,
      '',
      '原始回答：',
      formatReplies(modelReplies),
      '',
      '差异追问分析：',
      JSON.stringify(diffAnalyses || [], null, 2),
    ].join('\n');
  }

  function buildReportPromptAddon() {
    return [
      '这是法律/合规初筛场景。最终报告必须第一屏回答：初筛风险等级、核心风险点、成立条件、证据缺口、建议动作和必须专业复核的问题。',
      '不得输出正式法律意见、胜诉/败诉承诺、处罚必然性判断；必须明确“仅为多模型信息初筛，不替代律师/合规人员复核”。',
      'user_issue_analysis.direct_answer 必须直接说明“当前看起来有什么风险、风险成立依赖哪些前提、哪些事实缺口会改变判断”。',
      'fact_map 必须区分用户已给事实、模型推断、待补证据；dispute_map 必须突出会改变风险等级的分歧。',
      '如果材料不足，必须明确写“证据不足，不能形成正式判断”，并给出补充材料清单。',
    ].join('\n');
  }

  global.DuoliLegalRiskWorkflow = {
    id: 'legal_risk_screening_workflow',
    taskType: 'legal_risk',
    label: '法律/合规初筛',
    buildRefinePrompt,
    buildDiffExtractPrompt,
    buildDiffFollowupQuestion,
    buildPollutionPrompt,
    buildReportPromptAddon,
  };
})(window);
