(function attachFactCheckWorkflow(global) {
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
    return [
      '你是“滤镜工作台”的内容真假核验任务书生成器。',
      '用户可能输入一条爆料、截图、传闻、网传说法、视频描述或一句“是真的吗”。你的任务是把它补全成可分发给多个 AI 的“事实核验素材采集任务”。',
      '',
      '补全目标：后续系统要拆解原始主张，判断哪些可证实、哪些待核验、哪些应剔除，并输出可信度、反证线索和下一步核验动作。',
      '',
      '硬性约束：',
      '1. 不替用户预设真假，不编造证据，不把模型常识当外部信源。',
      hasDateHint
        ? '2. 用户原句包含日期或时间线索：必须沿用用户给出的时间，不要自行扩展、替换或新增时间范围。'
        : '2. 用户没有明确日期：按“最近/当前”理解，但不要添加具体年份、月份、日期或起止时间。',
      '3. 必须要求模型拆出可验证 claim，并区分：原始主张、可验证事实、反证/冲突点、信源等级、旧闻翻炒、张冠李戴、AI 生成痕迹、无证据推测。',
      '4. 必须要求模型输出：主张列表、每条主张的证据强度、支持材料、反证线索、核验难度、最终可信倾向、仍需补充的材料。',
      '5. 不要求网页模型输出严格 JSON；后续报告 JSON 由系统统一生成。',
      '6. 不要输出解释、标题、Markdown 包装、前后缀说明；只输出补全后的问题正文。',
      '7. 长度控制在 160-420 字。',
      '',
      `用户原始问题：\n${String(rawQuestion || '').trim()}`,
      '',
      '请直接输出补全后的真假核验任务：',
    ].join('\n');
  }

  function buildDiffExtractPrompt({ question, modelReplies }) {
    return [
      '你是“内容真假核验”链路里的主张差异侦查员。',
      '任务：只基于多个 AI 对同一核验问题的回答，抽取会影响真假判断的差异点。',
      '不要补充外部事实，不要直接裁决谁真谁假。',
      '',
      '优先识别这些核验差异：',
      '- 是否拆出了不同的核心 claim',
      '- 是否把传闻、截图、网友说法当成事实',
      '- 是否引用了不同来源等级或无法验证的来源',
      '- 是否存在时间错配、旧闻翻炒、张冠李戴、主体混淆',
      '- 是否遗漏反证或把无证据推测写成结论',
      '- 是否出现 AI 生成痕迹、平台摘要污染、二手转述污染',
      '',
      '差异类型只能从这些值中选择：主张拆解差异、证据差异、反证差异、时间差异、主体差异、信源差异、推理差异、污染疑似、表达差异。',
      '严重度只能从 high、medium、low 中选择。',
      '如果只是同义改写，type 必须是表达差异，needs_followup 为 false。',
      '',
      '请严格输出 JSON，不要 Markdown，不要解释：',
      '{',
      '  "overview": "一句话概括本轮真假核验差异情况",',
      '  "diffs": [',
      '    {',
      '      "id": "D1",',
      '      "topic": "差异主题",',
      '      "type": "主张拆解差异 | 证据差异 | 反证差异 | 时间差异 | 主体差异 | 信源差异 | 推理差异 | 污染疑似 | 表达差异",',
      '      "models": ["模型名"],',
      '      "claims": [{"model":"模型名","claim":"该模型的核心说法"}],',
      '      "severity": "high | medium | low",',
      '      "needs_followup": true,',
      '      "why_it_matters": "为什么这个差异影响真假裁决"',
      '    }',
      '  ]',
      '}',
      '',
      `核验问题：${question}`,
      '',
      '模型回答：',
      formatReplies(modelReplies),
    ].join('\n');
  }

  function buildDiffFollowupQuestion({ question, diff, round }) {
    return [
      `原始核验问题：${question}`,
      '',
      `多个 AI 在「${diff.topic}」上出现不一致。`,
      `差异类型：${diff.type}`,
      `第 ${round} 轮追问目标：解释为什么这些 AI 会得出不同真假判断、证据强度或主张拆解。`,
      '',
      '各模型差异说法：',
      formatDiffClaims(diff),
      '',
      '请只回答“为什么不一致”，不要重新泛泛回答原始问题。',
      '必须区分以下原因：原始 claim 拆解不同、信源等级不同、缺少一手来源、旧闻翻炒、主体/地点/时间错配、二手转述污染、截图/视频上下文缺失、AI 幻觉或无证据推测、只是表达不同。',
      '最后给出：最可能的差异源头、应剔除的污染因素、保留后仍可采信的核验判断。',
    ].join('\n');
  }

  function buildPollutionPrompt({ question, modelReplies, diffAnalyses }) {
    return [
      '你是“内容真假核验”链路里的污染剔除器。',
      '任务：基于原始回答、差异追问和二次合并结果，识别并剔除会污染真假判断的内容。',
      '',
      '真假核验污染类型包括：无原始信源、二手转述循环、旧闻翻炒、张冠李戴、主体混淆、时间错配、断章取义、截图/视频上下文缺失、AI 生成痕迹误判、模型幻觉补全、把观点当事实、把概率判断写成确定结论。',
      '',
      '请严格输出 JSON，不要 Markdown：',
      '{',
      '  "pollution_removed": [{"source":"模型或阶段","type":"污染类型","content":"被剔除内容","reason":"剔除原因"}],',
      '  "kept_claims": ["保留下来的有效事实或核验判断"],',
      '  "discarded_claims": ["剔除或降权的说法"],',
      '  "root_causes": ["差异源头归因"],',
      '  "unresolved": ["仍无法确定的点"]',
      '}',
      '',
      `原始核验问题：${question}`,
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
      '这是内容真假核验场景。最终报告必须第一屏回答：该内容当前可信/不可信/证据不足、可信度、核心依据、最大不确定性、下一步核验动作。',
      'user_issue_analysis.direct_answer 必须直接裁决用户关心的真假问题，不要写成泛泛综述。',
      'fact_map 必须按 claim 逻辑组织：confirmed_facts 放已交叉支持的事实，uncertain_claims 放证据不足的主张，polluted_claims 放旧闻翻炒/张冠李戴/无源转述/模型幻觉。',
      '如果材料不足，必须明确写“证据不足，不能判真”，不要用多模型一致性替代外部证据。',
    ].join('\n');
  }

  global.DuoliFactCheckWorkflow = {
    id: 'fact_check_truth_workflow',
    taskType: 'fact_check',
    label: '内容真假核验',
    buildRefinePrompt,
    buildDiffExtractPrompt,
    buildDiffFollowupQuestion,
    buildPollutionPrompt,
    buildReportPromptAddon,
  };
})(window);
