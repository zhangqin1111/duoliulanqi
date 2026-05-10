(function attachConsumerPurchaseWorkflow(global) {
  function formatReplies(modelReplies) {
    return (Array.isArray(modelReplies) ? modelReplies : [])
      .map((reply) =>
        [`【${reply.name || '未知模型'}】`, reply.ok ? reply.text : `未获得有效回答：${reply.error || 'unknown'}`, ''].join('\n')
      )
      .join('\n');
  }

  function formatDiffClaims(diff) {
    const claims = Array.isArray(diff && diff.claims) ? diff.claims : [];
    if (!claims.length) return '未能抽取到清晰购买建议 claim。';
    return claims.map((claim) => `- ${claim.model || '未知模型'}：${claim.claim || ''}`).join('\n');
  }

  function buildRefinePrompt(rawQuestion, context) {
    const hasDateHint = !!(context && context.hasDateHint);
    const timeRule =
      (context && context.timeBoundaryRule) ||
      (hasDateHint
        ? '用户给了明确时间或版本边界：必须沿用用户时间，不要自行扩大或替换时间范围。'
        : '用户没有给出明确时间边界：不要替用户补具体年份、月份、日期、起止时间或“最新/当前”等事实前提；只补核验维度、输出结构和需要 AI 自行确认的资料时效。');
    const noFactRule =
      (context && context.noFactInjectionRule) ||
      '补全只补任务维度、核验口径、输出字段和追问方向；不得替用户直接回答确定事实。';
    return [
      '你是“滤镜工作台”的消费选购决策任务书生成器。',
      '用户可能只问“iPhone 17哪个性价比最高”“iPhone17各个机型对比”“预算5000买什么手机”“A和B哪个值得买”。你的任务是把它补全成可分发给多个 AI 的“消费选购/同系列机型对比决策任务”。',
      '',
      '补全目标：只补用户没想到但会影响选购判断的分析维度、核验口径和输出结构，让后续多个 AI 自行给出候选、事实和建议；不要替用户预设最终答案、候选池或固定场景。',
      '',
      '补全边界：',
      `0. ${noFactRule}`,
      '1. 事实层只提出核验要求：型号、版本、价格、配置、发布时间、售卖状态、官方参数、渠道价格等必须由后续 AI 自行回答并标注“可核验/待核验”。',
      '2. 判断层允许裁决：性价比、值得买、适合谁，可以要求后续 AI 基于证据和用户场景做综合评分，不要因为它是价值判断就拒绝给建议。',
      `3. ${timeRule}`,
      '4. 不得新增用户未给出的具体年份、季度、月份、价格上下限、地区、渠道、能源偏好、用车场景或品牌范围；需要这些信息时，只要求后续 AI 分别说明假设条件并列为待核验项。',
      '5. 可以要求模型输出：候选产品/同系列机型清单、价格/配置/定位、价值权重、首选/备选/不推荐、不同人群怎么选、风险与待核验项；但候选清单和事实结论必须由后续 AI 自行给出，补全阶段不要预设。',
      '6. 如涉及未发布、传闻、区域价格或促销价，必须要求后续 AI 标注“待核验”，不能写成确定事实；但也不能仅因回答中未附官网 URL 就直接判定产品不存在。',
      '7. 如果用户已经明确指定某一代产品或系列（如 iPhone 17），必须围绕该系列提问；除非后续证据证明不存在，否则补全阶段不要改写成上一代替代方案。',
      '8. 不要要求网页模型输出 JSON；最终报告 JSON 由系统统一生成。',
      '9. 不要输出解释、标题、Markdown 包装、前后缀说明；只输出补全后的任务正文。',
      '10. 长度控制在 160-420 字。',
      '',
      `用户原始问题：\n${String(rawQuestion || '').trim()}`,
      '',
      '请直接输出补全后的消费选购决策任务：',
    ].join('\n');
  }

  function buildDiffExtractPrompt({ question, modelReplies }) {
    return [
      '你是“消费选购决策”链路里的差异侦查员。',
      '任务：只基于多个 AI 对同一购买问题的回答，抽取会影响最终购买建议的差异点。',
      '不要补充外部事实，不要直接裁决谁对谁错，只做差异拆解。',
      '',
      '优先识别这些购买决策差异：',
      '- 候选型号/版本/同系列机型范围是否不同',
      '- 价格、配置、发布时间、售卖状态是否存在冲突',
      '- 性价比权重是否不同：价格、性能、屏幕、影像、续航、重量、生态、保值、售后',
      '- 首选/备选/不推荐是否不同',
      '- 适合人群和预算分层是否不同',
      '- 是否把传闻、促销价、主观体验或营销话术写成确定事实',
      '- 是否因为缺少 URL 或知识截止而错误否定用户指定系列的存在',
      '- 是否遗漏关键场景导致推荐偏移',
      '',
      '差异类型只能从这些值中选择：候选范围差异、产品存在性误判、价格差异、配置差异、定位差异、场景权重差异、推荐结论差异、证据差异、污染疑似、表达差异。',
      '严重度只能从 high、medium、low 中选择。',
      '如果只是同义改写，type 必须是表达差异，needs_followup 为 false。',
      '',
      '请严格输出 JSON，不要 Markdown，不要解释：',
      '{',
      '  "overview": "一句话概括本轮选购差异情况",',
      '  "diffs": [',
      '    {',
      '      "id": "D1",',
      '      "topic": "差异主题",',
      '      "type": "候选范围差异 | 产品存在性误判 | 价格差异 | 配置差异 | 定位差异 | 场景权重差异 | 推荐结论差异 | 证据差异 | 污染疑似 | 表达差异",',
      '      "models": ["模型名"],',
      '      "claims": [{"model":"模型名","claim":"该模型的核心说法"}],',
      '      "severity": "high | medium | low",',
      '      "needs_followup": true,',
      '      "why_it_matters": "为什么这个差异会影响用户购买决策"',
      '    }',
      '  ]',
      '}',
      '',
      `消费选购问题：${question}`,
      '',
      '模型回答：',
      formatReplies(modelReplies),
    ].join('\n');
  }

  function buildDiffFollowupQuestion({ question, diff, round }) {
    return [
      `原始消费选购问题：${question}`,
      '',
      `多个 AI 在「${diff.topic}」上出现不一致。`,
      `差异类型：${diff.type}`,
      `第 ${round} 轮追问目标：解释为什么这些 AI 会给出不同购买建议、价值权重或候选范围。`,
      '',
      '各模型差异说法：',
      formatDiffClaims(diff),
      '',
      '请只回答“为什么不一致”，不要重新泛泛回答原始购买问题。',
      '必须区分以下原因：候选版本范围不同、价格口径不同、地区/渠道不同、促销价和官方价混用、配置认知过时、知识截止导致错误否定产品存在、用户场景假设不同、价值权重不同、营销话术污染、传闻信息污染、主观体验被当事实、只是表达不同。',
      '最后给出：最可能的差异源头、应剔除的污染因素、剔除后仍可采信的购买判断。',
    ].join('\n');
  }

  function buildPollutionPrompt({ question, modelReplies, diffAnalyses }) {
    return [
      '你是“消费选购决策”链路里的污染剔除器。',
      '任务：基于原始回答、差异追问和二次合并结果，识别并剔除会污染购买建议的内容。',
      '',
      '消费选购污染类型包括：未核验价格、促销价冒充官方价、区域价格混用、未发布传闻、过时配置、知识截止导致的产品不存在误判、营销话术、品牌偏见、单一用户体验放大、把主观喜好写成事实、忽略预算约束、忽略人群场景、把顶配等同于最值得买。',
      '',
      '请严格输出 JSON，不要 Markdown：',
      '{',
      '  "pollution_removed": [{"source":"模型或阶段","type":"污染类型","content":"被剔除内容","reason":"剔除原因"}],',
      '  "kept_claims": ["保留下来的有效配置/价格/购买判断"],',
      '  "discarded_claims": ["剔除或降权的说法"],',
      '  "root_causes": ["差异源头归因"],',
      '  "unresolved": ["仍无法确定的点"]',
      '}',
      '',
      `原始消费选购问题：${question}`,
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
      '这是消费选购/同系列机型对比场景。最终报告必须第一屏回答：有哪些候选机型、核心差异是什么、最值得买的是哪一款、为什么、什么人不适合、预算不同怎么选。',
      '事实层要严格核验：型号、价格、配置、发布时间、售卖状态、官方参数、区域差异；判断层要敢于给购买建议，不要把“性价比”误判为无法裁决。',
      '如果用户明确问某一代产品/系列（如 iPhone 17 各机型），报告必须围绕该系列展开对比；除非所有模型都给出强证据证明该系列不存在，否则不得把结论写成“尚未发布/不存在/改看上一代”。',
      '不得把“模型回答没有附苹果官网 URL”“某模型知识截止较早”“未看到 WWDC/开发者文档”单独作为产品不存在的裁决依据；这类情况只能写成待核验或信息缺口。',
      'user_issue_analysis.direct_answer 必须直接给出购买裁决，例如“普通用户首选 iPhone 17；预算敏感选 iPhone 17e；轻薄优先选 iPhone Air；影像/性能重度用户选 Pro/Pro Max”。',
      'scenario_decision.decision_factors 必须包含价格、核心配置、使用寿命、影像/性能、续航/重量、适合人群、风险/待核验，且每项给 0-100 分。',
      'user_issue_analysis.sentiment_distribution 改写为“价值构成”：价格价值、性能价值、影像价值、续航价值、生态/寿命价值。',
      'user_issue_analysis.stance_distribution 改写为“推荐梯队”：首选、备选、特定人群推荐、不建议购买/谨慎购买。',
      'user_issue_analysis.audience_segments 改写为“购买人群坐标”：预算敏感、普通用户、轻薄优先、影像重度、性能重度、长期持有等。',
      'risk_matrix 必须是购买风险矩阵：价格波动、传闻/未发售信息、配置代际差、渠道/地区差异、过度购买风险。',
      'dispute_map 必须突出会改变购买建议的差异，不要把简单表述差异放大。',
      'final_actions 必须给出下一步核验动作：查官方售价、查地区版本、查当前促销、确认用户预算和核心需求。',
    ].join('\n');
  }

  global.DuoliConsumerPurchaseWorkflow = {
    id: 'consumer_purchase_workflow',
    taskType: 'consumer_purchase',
    label: '消费选购决策',
    buildRefinePrompt,
    buildDiffExtractPrompt,
    buildDiffFollowupQuestion,
    buildPollutionPrompt,
    buildReportPromptAddon,
  };
})(window);
