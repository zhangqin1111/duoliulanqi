(function attachPublicOpinionWorkflow(global) {
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
      '你是“滤镜工作台”的舆情裁决任务书生成器。',
      '用户通常只输入一个人物、品牌、事件或一句短问题。你的任务是把它补全成可分发给多个 AI 的“舆情情报素材采集任务”。',
      '',
      '补全目标：后续系统要判断是否存在真实舆情事件、当前舆论温度、情绪/阵营结构、主要叙事、风险等级、是否需要回应、下一步核验动作。',
      '',
      '硬性约束：',
      '1. 不替用户预设结论，不把传闻当事实，不编造具体事件。',
      `1A. ${noFactRule}`,
      `2. ${timeRule}`,
      '3. 必须要求模型区分：可验证事实、历史旧闻、未证实传言、网友观点、粉丝/黑粉情绪、媒体叙事、AI 推测。',
      '4. 必须要求模型输出：事实脉络、确认事实、待核验说法、舆论温度、情绪结构、阵营/群体、主要叙事、污染风险、后续核验问题。',
      '5. 不要求网页模型输出严格 JSON；后续报告 JSON 由系统统一生成。',
      '6. 不要输出解释、标题、Markdown 包装、前后缀说明；只输出补全后的问题正文。',
      '7. 长度控制在 160-420 字。',
      '',
      `用户原始问题：\n${String(rawQuestion || '').trim()}`,
      '',
      '请直接输出补全后的舆情裁决任务：',
    ].join('\n');
  }

  function buildDiffExtractPrompt({ question, modelReplies }) {
    return [
      '你是“舆情裁决”链路里的差异侦查员。',
      '任务：只基于多个 AI 对同一舆情问题的回答，抽取会影响最终裁决的差异点。',
      '不要补充外部事实，不要直接裁决谁对谁错。',
      '',
      '优先识别这些舆情差异：',
      '- 是否把历史事件误判为最新舆情',
      '- 是否把网友评论/粉丝情绪误判为公共舆情事件',
      '- 是否存在传播规模、情绪方向、阵营结构判断不一致',
      '- 是否有主体混淆、时间漂移、信源缺失、单一信源循环',
      '- 是否出现模型幻觉、无证据补全细节、夸大风险',
      '',
      '差异类型只能从这些值中选择：事实差异、时间差异、口径差异、因果差异、舆情热度差异、阵营差异、污染疑似、表达差异。',
      '严重度只能从 high、medium、low 中选择。',
      '如果只是同义改写，type 必须是表达差异，needs_followup 为 false。',
      '',
      '请严格输出 JSON，不要 Markdown，不要解释：',
      '{',
      '  "overview": "一句话概括本轮舆情差异情况",',
      '  "diffs": [',
      '    {',
      '      "id": "D1",',
      '      "topic": "差异主题",',
      '      "type": "事实差异 | 时间差异 | 口径差异 | 因果差异 | 舆情热度差异 | 阵营差异 | 污染疑似 | 表达差异",',
      '      "models": ["模型名"],',
      '      "claims": [{"model":"模型名","claim":"该模型的核心说法"}],',
      '      "severity": "high | medium | low",',
      '      "needs_followup": true,',
      '      "why_it_matters": "为什么这个差异影响舆情裁决"',
      '    }',
      '  ]',
      '}',
      '',
      `舆情问题：${question}`,
      '',
      '模型回答：',
      formatReplies(modelReplies),
    ].join('\n');
  }

  function buildDiffFollowupQuestion({ question, diff, round }) {
    return [
      `原始舆情问题：${question}`,
      '',
      `多个 AI 在「${diff.topic}」上出现不一致。`,
      `差异类型：${diff.type}`,
      `第 ${round} 轮追问目标：解释为什么这些 AI 会得出不同舆情结论、事实结果或表述。`,
      '',
      '各模型差异说法：',
      formatDiffClaims(diff),
      '',
      '请只回答“为什么不一致”，不要重新泛泛回答原始问题。',
      '必须区分以下原因：时间边界不同、把旧闻当最新、事实来源不同、把观点当事实、传播规模证据不足、粉丝/黑粉情绪污染、平台/安全限制、AI 幻觉或无证据推测、只是表达不同。',
      '最后给出：最可能的差异源头、应剔除的污染因素、保留后仍可采信的舆情判断。',
    ].join('\n');
  }

  function buildPollutionPrompt({ question, modelReplies, diffAnalyses }) {
    return [
      '你是“舆情裁决”链路里的污染剔除器。',
      '任务：基于原始回答、差异追问和二次合并结果，识别并剔除会污染舆情判断的内容。',
      '',
      '舆情污染类型包括：旧闻当新、网友评论当事实、粉丝/黑粉情绪放大、单一信源循环、主体混淆、时间漂移、传播规模夸大、AI 幻觉补全、模板话术、安全规避、无证据风险升级。',
      '',
      '请严格输出 JSON，不要 Markdown：',
      '{',
      '  "pollution_removed": [{"source":"模型或阶段","type":"污染类型","content":"被剔除内容","reason":"剔除原因"}],',
      '  "kept_claims": ["保留下来的有效舆情事实或判断"],',
      '  "discarded_claims": ["剔除或降权的说法"],',
      '  "root_causes": ["差异源头归因"],',
      '  "unresolved": ["仍无法确定的点"]',
      '}',
      '',
      `原始舆情问题：${question}`,
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
      '这是舆情裁决场景。最终报告必须第一屏回答：是否形成真实舆情事件、舆论温度、风险等级、是否需要回应、下一步核验动作。',
      'user_issue_analysis 必须按舆情字段填充：public_opinion_temperature、sentiment_distribution、stance_distribution、audience_segments、narrative_summary、risk_matrix。',
      '如果材料不足以证明形成真实舆情事件，必须明确写“未形成可验证舆情事件/仅为讨论或历史事件延续”，不能为了显得完整而制造事件。',
    ].join('\n');
  }

  global.DuoliPublicOpinionWorkflow = {
    id: 'public_opinion_truth_workflow',
    taskType: 'public_opinion',
    label: '舆情裁决',
    buildRefinePrompt,
    buildDiffExtractPrompt,
    buildDiffFollowupQuestion,
    buildPollutionPrompt,
    buildReportPromptAddon,
  };
})(window);
