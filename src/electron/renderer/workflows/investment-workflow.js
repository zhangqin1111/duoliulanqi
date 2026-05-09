(function attachInvestmentWorkflow(global) {
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
      '你是“滤镜工作台”的投研/政策影响任务书生成器。',
      '用户可能询问某政策、行业事件、公司事件、市场变化对行业/公司/产业链的影响。你的任务是把它补全成可分发给多个 AI 的“影响路径与风险研判任务”。',
      '',
      '补全目标：后续系统要识别事件事实坐标、影响主体、影响路径、受益/受损环节、关键不确定性、风险等级和后续观察指标。',
      '',
      '硬性约束：',
      '1. 不输出买卖建议，不承诺收益，不把模型推测写成投资结论。',
      hasDateHint
        ? '2. 用户原句包含日期或时间线索：必须沿用用户给出的时间，不要自行扩展、替换或新增时间范围。'
        : '2. 用户没有明确日期：按“最近/当前公开信息”理解，不要添加具体年份、月份、日期或起止时间。',
      '3. 必须要求模型区分：已发生事实、政策文本/公告、行业推论、市场情绪、受益受损假设、待核验数据。',
      '4. 必须要求模型输出：事件摘要、影响主体、影响路径、短中长期影响、受益方、受损方、传导条件、关键不确定性、风险提示、后续观察指标。',
      '5. 不要求网页模型输出严格 JSON；后续报告 JSON 由系统统一生成。',
      '6. 不要输出解释、标题、Markdown 包装、前后缀说明；只输出补全后的问题正文。',
      '7. 长度控制在 180-460 字。',
      '',
      `用户原始问题：\n${String(rawQuestion || '').trim()}`,
      '',
      '请直接输出补全后的投研/政策影响研判任务：',
    ].join('\n');
  }

  function buildDiffExtractPrompt({ question, modelReplies }) {
    return [
      '你是“投研/政策影响”链路里的差异侦查员。',
      '任务：只基于多个 AI 对同一投研/政策影响问题的回答，抽取会影响最终研判的差异点。',
      '不要补充外部事实，不要直接给投资建议。',
      '',
      '优先识别这些投研差异：',
      '- 事件事实坐标、政策范围或公司主体是否不一致',
      '- 影响路径是否不同或跳过关键传导条件',
      '- 受益/受损主体是否存在过度推断',
      '- 时间窗口、短中长期影响是否错配',
      '- 是否把市场情绪、媒体解读或模型猜测当成事实',
      '- 是否遗漏关键风险、监管约束、执行条件或观察指标',
      '',
      '差异类型只能从这些值中选择：事实坐标差异、影响路径差异、主体差异、时间窗口差异、受益受损差异、风险差异、证据差异、污染疑似、表达差异。',
      '严重度只能从 high、medium、low 中选择。',
      '如果只是同义改写，type 必须是表达差异，needs_followup 为 false。',
      '',
      '请严格输出 JSON，不要 Markdown，不要解释：',
      '{',
      '  "overview": "一句话概括本轮投研差异情况",',
      '  "diffs": [',
      '    {',
      '      "id": "D1",',
      '      "topic": "差异主题",',
      '      "type": "事实坐标差异 | 影响路径差异 | 主体差异 | 时间窗口差异 | 受益受损差异 | 风险差异 | 证据差异 | 污染疑似 | 表达差异",',
      '      "models": ["模型名"],',
      '      "claims": [{"model":"模型名","claim":"该模型的核心说法"}],',
      '      "severity": "high | medium | low",',
      '      "needs_followup": true,',
      '      "why_it_matters": "为什么这个差异影响影响研判"',
      '    }',
      '  ]',
      '}',
      '',
      `投研/政策影响问题：${question}`,
      '',
      '模型回答：',
      formatReplies(modelReplies),
    ].join('\n');
  }

  function buildDiffFollowupQuestion({ question, diff, round }) {
    return [
      `原始投研/政策影响问题：${question}`,
      '',
      `多个 AI 在「${diff.topic}」上出现不一致。`,
      `差异类型：${diff.type}`,
      `第 ${round} 轮追问目标：解释为什么这些 AI 会得出不同影响路径、受益受损判断或风险判断。`,
      '',
      '各模型差异说法：',
      formatDiffClaims(diff),
      '',
      '请只回答“为什么不一致”，不要重新泛泛回答原始问题，不要给买卖建议。',
      '必须区分以下原因：事件事实坐标不同、政策范围不同、产业链假设不同、传导条件缺失、时间窗口不同、把情绪当事实、把相关性当因果、使用过时数据、证据不足、只是表达不同。',
      '最后给出：最可能的差异源头、应剔除的污染因素、保留后仍可采信的影响研判。',
    ].join('\n');
  }

  function buildPollutionPrompt({ question, modelReplies, diffAnalyses }) {
    return [
      '你是“投研/政策影响”链路里的污染剔除器。',
      '任务：基于原始回答、差异追问和二次合并结果，识别并剔除会污染影响研判的内容。',
      '',
      '投研/政策影响污染类型包括：买卖建议伪装、收益承诺、相关性当因果、政策范围误读、过时数据、情绪当事实、单一媒体解读放大、产业链传导跳步、主体混淆、时间窗口错配、AI 幻觉补全。',
      '',
      '请严格输出 JSON，不要 Markdown：',
      '{',
      '  "pollution_removed": [{"source":"模型或阶段","type":"污染类型","content":"被剔除内容","reason":"剔除原因"}],',
      '  "kept_claims": ["保留下来的有效事实或影响判断"],',
      '  "discarded_claims": ["剔除或降权的说法"],',
      '  "root_causes": ["差异源头归因"],',
      '  "unresolved": ["仍无法确定的点"]',
      '}',
      '',
      `原始投研/政策影响问题：${question}`,
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
      '这是投研/政策影响场景。最终报告必须第一屏回答：影响方向、影响路径、受益/受损主体、风险等级、关键不确定性和后续观察指标。',
      '不得输出股票买卖建议、收益承诺或确定性投资结论；必须写成风险研判与信息核验报告。',
      'user_issue_analysis.direct_answer 必须直接说明“影响是否成立、通过什么路径成立、哪些条件未满足”。',
      'fact_map 必须区分已发生事实、政策/公告信息、行业推论、待核验数据；dispute_map 必须突出会改变影响判断的分歧。',
      '如果材料不足，必须明确写“影响路径尚未闭环/证据不足”，并给出需要补充的观察指标。',
    ].join('\n');
  }

  global.DuoliInvestmentWorkflow = {
    id: 'investment_research_workflow',
    taskType: 'investment_research',
    label: '投研/政策影响',
    buildRefinePrompt,
    buildDiffExtractPrompt,
    buildDiffFollowupQuestion,
    buildPollutionPrompt,
    buildReportPromptAddon,
  };
})(window);
