(function attachGeneralCompareWorkflow(global) {
  function formatReplies(modelReplies) {
    return (Array.isArray(modelReplies) ? modelReplies : [])
      .map((reply) =>
        [
          `【${reply.name || '未知模型'}】`,
          reply.ok ? reply.text : `未获得有效回答：${reply.error || 'unknown'}`,
          '',
        ].join('\n')
      )
      .join('\n');
  }

  function formatDiffClaims(diff) {
    const claims = Array.isArray(diff && diff.claims) ? diff.claims : [];
    if (!claims.length) return '未能抽取到清晰 claim。';
    return claims.map((claim) => `- ${claim.model || '未知模型'}：${claim.claim || ''}`).join('\n');
  }

  function buildRefinePrompt(rawQuestion, context) {
    const timeRule =
      (context && context.timeBoundaryRule) ||
      '如果用户没有明确时间边界，不要补具体年份、月份、季度、版本周期或“最新事实”；只要求后续 AI 自行核验时效。';
    const noFactRule =
      (context && context.noFactInjectionRule) ||
      '补全只补任务维度、核验口径、输出字段和追问方向；不得替用户直接回答确定事实。';

    return [
      '你是“滤镜工作台”的通用对比任务书生成器。',
      '用户可能只说“A和B哪个好”“这个方案怎么样”“帮我对比一下”。你的任务是把它补全成可分发给多个 AI 的通用对比/决策任务。',
      '',
      '补全目标：只补用户没想到但会影响判断的分析维度、核验口径和输出结构；不要替用户预设最终答案、候选对象、时间范围或评价倾向。',
      '',
      '硬性约束：',
      `1. ${noFactRule}`,
      `2. ${timeRule}`,
      '3. 如果用户没有给出候选对象，只要求 AI 先识别候选对象并标注“待核验”，不要自行锁死候选池。',
      '4. 如果用户没有给出场景、预算、地区、版本、身份、偏好，只能要求 AI 列为“需要确认的条件”，不要擅自补成确定前提。',
      '5. 必须要求模型输出：候选对象、比较维度、证据/来源状态、优势劣势、适配场景、风险点、最终建议、仍需人工确认项。',
      '6. 必须区分：可核验事实、模型推断、主观偏好、风险/不确定性、待补充信息。',
      '7. 不要要求网页模型输出 JSON；最终报告 JSON 由系统统一生成。',
      '8. 不要输出解释、标题、Markdown 包装、前后缀说明；只输出补全后的任务正文。',
      '9. 长度控制在 160-420 字。',
      '',
      `用户原始问题：\n${String(rawQuestion || '').trim()}`,
      '',
      '请直接输出补全后的通用对比任务：',
    ].join('\n');
  }

  function buildDiffExtractPrompt({ question, modelReplies }) {
    return [
      '你是“通用对比决策”链路里的差异侦查员。',
      '任务：只基于多个 AI 对同一问题的回答，抽取会影响最终建议的差异点。',
      '不要补充外部事实，不要直接裁决谁对谁错，只做差异拆解。',
      '',
      '优先识别这些差异：',
      '- 候选对象范围是否不同',
      '- 比较维度和权重是否不同',
      '- 事实、价格、版本、参数、时间边界或适用条件是否冲突',
      '- 推荐结论是否不同',
      '- 是否把主观偏好、营销话术、未经核验信息写成事实',
      '- 是否遗漏用户真正需要解决的决策问题',
      '',
      '差异类型只能从这些值中选择：候选范围差异、事实差异、权重差异、场景假设差异、推荐结论差异、风险判断差异、证据差异、污染疑似、表达差异。',
      '严重度只能从 high、medium、low 中选择。',
      '如果只是同义改写，type 必须是表达差异，needs_followup 为 false。',
      '',
      '请严格输出 JSON，不要 Markdown，不要解释：',
      '{',
      '  "overview": "一句话概括本轮差异情况",',
      '  "diffs": [',
      '    {',
      '      "id": "D1",',
      '      "topic": "差异主题",',
      '      "type": "候选范围差异 | 事实差异 | 权重差异 | 场景假设差异 | 推荐结论差异 | 风险判断差异 | 证据差异 | 污染疑似 | 表达差异",',
      '      "models": ["模型名"],',
      '      "claims": [{"model":"模型名","claim":"该模型的核心说法"}],',
      '      "severity": "high | medium | low",',
      '      "needs_followup": true,',
      '      "why_it_matters": "为什么这个差异会影响用户决策"',
      '    }',
      '  ]',
      '}',
      '',
      `原始问题：${question}`,
      '',
      '模型回答：',
      formatReplies(modelReplies),
    ].join('\n');
  }

  function buildDiffFollowupQuestion({ question, diff, round }) {
    return [
      `原始问题：${question}`,
      '',
      `多个 AI 在“${diff.topic}”上出现不一致。`,
      `差异类型：${diff.type}`,
      `第 ${round} 轮追问目标：解释为什么这些 AI 会给出不同判断、推荐或表述。`,
      '',
      '各模型差异说法：',
      formatDiffClaims(diff),
      '',
      '请只回答“为什么不一致”，不要重新泛泛回答原始问题。',
      '必须区分：候选范围不同、事实口径不同、用户场景假设不同、价值权重不同、信息时效不同、证据强度不同、主观偏好污染、营销话术污染、只是表达不同。',
      '最后给出：最可能的差异源头、应剔除的污染因素、剔除后仍可采信的判断。',
    ].join('\n');
  }

  function buildPollutionPrompt({ question, modelReplies, diffAnalyses }) {
    return [
      '你是“通用对比决策”链路里的污染剔除器。',
      '任务：基于原始回答、差异追问和二次合并结果，识别并剔除会污染最终建议的内容。',
      '',
      '通用污染类型包括：未经核验的事实、过期信息、营销话术、主观偏好伪装成事实、遗漏用户场景、候选范围偷换、把不确定写成确定、把多数模型一致当成证据、模板化废话。',
      '',
      '请严格输出 JSON，不要 Markdown：',
      '{',
      '  "pollution_removed": [{"source":"模型或阶段","type":"污染类型","content":"被剔除内容","reason":"剔除原因"}],',
      '  "kept_claims": ["保留下来的有效判断"],',
      '  "discarded_claims": ["剔除或降权的说法"],',
      '  "root_causes": ["差异源头归因"],',
      '  "unresolved": ["仍无法确定的点"]',
      '}',
      '',
      `原始问题：${question}`,
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
      '这是通用对比/决策场景。最终报告第一屏必须直接回答用户真正要做的选择，而不是只展示模型差异。',
      '报告重点：候选对象、对比维度、核心差异、证据状态、适配场景、风险点、最终建议、需要补充确认的信息。',
      'user_issue_analysis.direct_answer 必须输出可执行判断：如果证据足够，给首选/备选/不推荐；如果证据不足，明确说明缺什么证据以及下一步怎么核验。',
      'scenario_payload.comparison_table 必须列出候选对象与关键维度；decision_matrix 必须体现权重或适配逻辑；risk_notes 必须列出会改变结论的风险。',
      'scenario_decision.decision_factors 必须围绕准确性、适配度、成本/收益、风险、不确定性、可执行性评分。',
      '不要把模型一致性当作事实证据；事实结论必须绑定来源或标注待核验。',
    ].join('\n');
  }

  global.DuoliGeneralCompareWorkflow = {
    id: 'general_compare_workflow',
    taskType: 'general_compare',
    label: '通用多源对比',
    buildRefinePrompt,
    buildDiffExtractPrompt,
    buildDiffFollowupQuestion,
    buildPollutionPrompt,
    buildReportPromptAddon,
  };
})(window);
