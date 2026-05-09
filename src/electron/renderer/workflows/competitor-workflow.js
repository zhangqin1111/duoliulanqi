(function attachCompetitorWorkflow(global) {
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
      '你是“滤镜工作台”的竞品对比任务书生成器。',
      '用户可能只问“A 和 B 哪个好”“某产品和竞品有什么区别”“怎么选型”。你的任务是把它补全成可分发给多个 AI 的“竞品选型与差异分析任务”。',
      '',
      '补全目标：后续系统要明确对比对象、对比维度、适用场景、优势短板、风险不确定性和最终选型建议。',
      '',
      '硬性约束：',
      '1. 不替用户预设最终选型，不编造价格、功能、市场数据或用户反馈。',
      hasDateHint
        ? '2. 用户原句包含日期或时间线索：必须沿用用户给出的时间，不要自行扩展、替换或新增时间范围。'
        : '2. 用户没有明确日期：按“最近/当前版本与公开信息”理解，不要添加具体年份、月份、日期或起止时间。',
      '3. 必须要求模型区分：可验证功能差异、定价/定位差异、目标用户、适用场景、生态/渠道、限制条件、主观体验和待核验信息。',
      '4. 必须要求模型输出：对比对象定义、维度矩阵、核心差异、优势短板、风险点、适合谁/不适合谁、最终建议、仍需核验的问题。',
      '5. 不要求网页模型输出严格 JSON；后续报告 JSON 由系统统一生成。',
      '6. 不要输出解释、标题、Markdown 包装、前后缀说明；只输出补全后的问题正文。',
      '7. 长度控制在 160-420 字。',
      '',
      `用户原始问题：\n${String(rawQuestion || '').trim()}`,
      '',
      '请直接输出补全后的竞品对比任务：',
    ].join('\n');
  }

  function buildDiffExtractPrompt({ question, modelReplies }) {
    return [
      '你是“竞品对比”链路里的差异侦查员。',
      '任务：只基于多个 AI 对同一竞品问题的回答，抽取会影响选型建议的差异点。',
      '不要补充外部事实，不要直接裁决谁更好。',
      '',
      '优先识别这些竞品差异：',
      '- 对比对象或版本范围是否不一致',
      '- 对比维度是否缺失或权重不同',
      '- 功能、价格、定位、生态、渠道、用户反馈是否说法冲突',
      '- 是否把主观体验当成事实优势',
      '- 是否引用过时信息、未验证数据或营销话术',
      '- 是否遗漏关键场景，导致选型建议偏移',
      '',
      '差异类型只能从这些值中选择：对象范围差异、功能差异、价格差异、定位差异、场景差异、证据差异、选型建议差异、污染疑似、表达差异。',
      '严重度只能从 high、medium、low 中选择。',
      '如果只是同义改写，type 必须是表达差异，needs_followup 为 false。',
      '',
      '请严格输出 JSON，不要 Markdown，不要解释：',
      '{',
      '  "overview": "一句话概括本轮竞品差异情况",',
      '  "diffs": [',
      '    {',
      '      "id": "D1",',
      '      "topic": "差异主题",',
      '      "type": "对象范围差异 | 功能差异 | 价格差异 | 定位差异 | 场景差异 | 证据差异 | 选型建议差异 | 污染疑似 | 表达差异",',
      '      "models": ["模型名"],',
      '      "claims": [{"model":"模型名","claim":"该模型的核心说法"}],',
      '      "severity": "high | medium | low",',
      '      "needs_followup": true,',
      '      "why_it_matters": "为什么这个差异影响选型裁决"',
      '    }',
      '  ]',
      '}',
      '',
      `竞品问题：${question}`,
      '',
      '模型回答：',
      formatReplies(modelReplies),
    ].join('\n');
  }

  function buildDiffFollowupQuestion({ question, diff, round }) {
    return [
      `原始竞品问题：${question}`,
      '',
      `多个 AI 在「${diff.topic}」上出现不一致。`,
      `差异类型：${diff.type}`,
      `第 ${round} 轮追问目标：解释为什么这些 AI 会得出不同竞品判断、差异矩阵或选型建议。`,
      '',
      '各模型差异说法：',
      formatDiffClaims(diff),
      '',
      '请只回答“为什么不一致”，不要重新泛泛回答原始问题。',
      '必须区分以下原因：对比对象/版本不同、评价维度不同、权重不同、场景假设不同、价格或功能信息过时、营销话术污染、主观体验当事实、证据不足、只是表达不同。',
      '最后给出：最可能的差异源头、应剔除的污染因素、保留后仍可采信的选型判断。',
    ].join('\n');
  }

  function buildPollutionPrompt({ question, modelReplies, diffAnalyses }) {
    return [
      '你是“竞品对比”链路里的污染剔除器。',
      '任务：基于原始回答、差异追问和二次合并结果，识别并剔除会污染选型判断的内容。',
      '',
      '竞品对比污染类型包括：营销话术、过时版本、无来源价格、主观体验当事实、单一用户样本放大、维度权重不透明、遗漏关键场景、把定位差异写成功能优劣、AI 幻觉补全、品牌偏见。',
      '',
      '请严格输出 JSON，不要 Markdown：',
      '{',
      '  "pollution_removed": [{"source":"模型或阶段","type":"污染类型","content":"被剔除内容","reason":"剔除原因"}],',
      '  "kept_claims": ["保留下来的有效差异或选型判断"],',
      '  "discarded_claims": ["剔除或降权的说法"],',
      '  "root_causes": ["差异源头归因"],',
      '  "unresolved": ["仍无法确定的点"]',
      '}',
      '',
      `原始竞品问题：${question}`,
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
      '这是竞品对比场景。最终报告必须第一屏回答：推荐选择、适用场景、关键差异、最大风险、下一步核验动作。',
      'user_issue_analysis.direct_answer 必须直接给出“在什么条件下选谁”，不能只罗列优缺点。',
      'dispute_map 必须突出会改变选型结果的差异；fact_map 必须区分可验证功能/价格信息与主观体验或营销话术。',
      '如果材料不足，必须明确写“暂不具备单一推荐条件”，并给出需要补充的对比维度。',
    ].join('\n');
  }

  global.DuoliCompetitorWorkflow = {
    id: 'competitor_analysis_workflow',
    taskType: 'competitor_analysis',
    label: '竞品对比',
    buildRefinePrompt,
    buildDiffExtractPrompt,
    buildDiffFollowupQuestion,
    buildPollutionPrompt,
    buildReportPromptAddon,
  };
})(window);
