(function attachTruthSeekingPrompts(global) {
  function formatDiffClaims(diff) {
    const claims = Array.isArray(diff.claims) ? diff.claims : [];
    if (!claims.length) return '未能抽取到清晰 claim。';
    return claims.map((claim) => `- ${claim.model || '未知模型'}：${claim.claim || ''}`).join('\n');
  }

  function resolveWorkflow(taskRoute) {
    const registry = global.DuoliWorkflowRegistry;
    return registry && typeof registry.resolve === 'function' ? registry.resolve(taskRoute) : null;
  }

  function appendFollowupSearchProtocol(prompt) {
    return [
      String(prompt || '').trim(),
      '',
      '# 联网核验协议（追问阶段强制）',
      '请搜索网络最新的信息来核验本轮差异，再回答。不要只凭记忆回答。',
      '请搜索网络最新公开资料，重点搜索：官方口径、发布时间、价格/参数/公告/声明/报道、最新售卖状态或事件进展。',
      '搜索完成后再说明：哪些信息被最新网络资料确认，哪些仍无法确认，哪些只是模型记忆或推理。',
      '如果你无法搜索网络、无法联网、没有搜索入口或搜索失败，必须在回答开头明确写出：“未联网，仅基于已有知识判断”。',
      '未搜索网络或无法联网时，不得把任何最新事实、价格、发布时间、售卖状态、事件进展写成确定事实。',
    ].filter(Boolean).join('\n');
  }

  function buildDiffExtractPrompt(question, modelReplies, taskRoute) {
    const workflow = resolveWorkflow(taskRoute);
    if (workflow && typeof workflow.buildDiffExtractPrompt === 'function') {
      return workflow.buildDiffExtractPrompt({ question, modelReplies, taskRoute });
    }
    return [
      '你是“去伪存真”分析流程里的差异抽取器。',
      '任务：只基于多个 AI 对同一问题的原始回答，抽取真正值得追问的差异点。',
      '不要补充外部事实，不要裁决谁对谁错，只做差异拆解。',
      '',
      '差异类型只能从这些值中选择：事实差异、时间差异、口径差异、因果差异、建议差异、表达差异、污染疑似。',
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
      '      "type": "事实差异 | 时间差异 | 口径差异 | 因果差异 | 建议差异 | 表达差异 | 污染疑似",',
      '      "models": ["模型名"],',
      '      "claims": [{"model":"模型名","claim":"该模型的核心说法"}],',
      '      "severity": "high | medium | low",',
      '      "needs_followup": true,',
      '      "why_it_matters": "为什么这个差异影响结论"',
      '    }',
      '  ]',
      '}',
      '',
      `原始问题：${question}`,
      '',
      '模型回答：',
      ...modelReplies.map((reply) =>
        [`【${reply.name}】`, reply.ok ? reply.text : `未获得有效回答：${reply.error || 'unknown'}`, ''].join('\n')
      ),
    ].join('\n');
  }

  function buildDiffFollowupQuestion(question, diff, round, taskRoute) {
    const workflow = resolveWorkflow(taskRoute);
    if (workflow && typeof workflow.buildDiffFollowupQuestion === 'function') {
      return workflow.buildDiffFollowupQuestion({ question, diff, round, taskRoute });
    }
    return [
      `原始问题：${question}`,
      '',
      `现在多个 AI 在「${diff.topic}」上出现不一致。`,
      `差异类型：${diff.type}`,
      `第 ${round} 轮追问目标：解释为什么这些 AI 会出现不同结论、结果或表述。`,
      '',
      '各模型差异说法：',
      formatDiffClaims(diff),
      '',
      '请只回答“为什么不一致”，不要重新回答原始问题。',
      '必须区分以下原因：事实来源不同、时间点不同、问题口径不同、推理链不同、安全策略或平台限制、AI 幻觉或无证据推测、只是表达不同。',
      '最后给出你认为最可能的差异源头，以及应该剔除哪些污染因素。',
    ].join('\n');
  }

  function buildSecondMergePrompt(question, diff, followupRounds) {
    const lines = [
      '你是“去伪存真”流程里的二次求同存异分析器。',
      '任务：基于多个 AI 对差异原因的解释，合并同类项，判断差异是否已经收敛。',
      '不要重新回答原始问题；只分析差异原因、污染因素和下一步动作。',
      '',
      'next_action 只能是 stop、ask_again、verify_external。',
      '如果只是表达不同或口径不同且已解释清楚，next_action=stop。',
      '如果仍有实质事实冲突且还有新问题可问，next_action=ask_again。',
      '如果需要外部证据或新增模型才能判断，next_action=verify_external。',
      '',
      '请严格输出 JSON，不要 Markdown：',
      '{',
      '  "diff_id": "D1",',
      '  "consensus_causes": ["共同认可的差异原因"],',
      '  "remaining_disputes": ["仍未解决的分歧"],',
      '  "likely_pollution": ["需要剔除的污染因素"],',
      '  "cleaned_interpretation": "剔除污染后的解释",',
      '  "confidence": 0.72,',
      '  "next_action": "stop | ask_again | verify_external",',
      '  "followup_question": "如果 next_action=ask_again，下一轮要问什么；否则为空"',
      '}',
      '',
      `原始问题：${question}`,
      `差异 ${diff.id}：${diff.topic}`,
      `差异类型：${diff.type}`,
      '原始差异说法：',
      formatDiffClaims(diff),
      '',
      '追问轮次与回答：',
    ];
    followupRounds.forEach((round) => {
      lines.push(`第 ${round.round} 轮追问：${round.question}`);
      round.replies.forEach((reply) => {
        lines.push(`【${reply.name}】`);
        lines.push(reply.ok ? reply.text : `未获得有效回答：${reply.error || 'unknown'}`);
        lines.push('');
      });
    });
    return lines.join('\n');
  }

  function buildSelfAuditPrompt(question, modelName, originalReply, attributedPollution) {
    const lines = [
      '这是去伪存真流程的“自我剔除污染”阶段。',
      `你是 ${modelName}。下面给出原始问题、你之前的回答，以及评测系统对你这次回答标注的疑似污染项。`,
      '',
      '请逐条做出裁定。不要重新回答原始问题，不要展开新论证；只针对每个污染项给出“接受/部分接受/拒绝”判断，并简要说明理由。最后给出“剔除污染后的净化版核心结论”。',
      '',
      '污染类型说明：模板话术、安全规避、幻觉补全、无证据补全细节、过度推测、上下文污染、时效污染、口径漂移、表达风格噪音。',
      '',
      '# 原始问题',
      String(question || '').trim() || '(空)',
      '',
      '# 你之前的回答',
      String(originalReply || '').trim() || '(空)',
      '',
      '# 系统标注的疑似污染项',
    ];
    const items = Array.isArray(attributedPollution) ? attributedPollution : [];
    if (!items.length) {
      lines.push('(系统未对你单独标注；请扫描自己上方回答，主动列出可能存在的污染并撤回。)');
    } else {
      items.forEach((item, idx) => {
        lines.push(`${idx + 1}. 类型:${item.type || '未分类'};内容:${item.content || ''};理由:${item.reason || ''}`);
      });
    }
    lines.push(
      '',
      '# 输出格式(请用纯文本，分两段)',
      '【污染逐项裁定】',
      '- 第 N 项：接受/部分接受/拒绝 —— 理由；若接受请明确撤回的措辞，若拒绝请说明你的证据或推理。',
      '...',
      '【净化后核心结论】',
      '不超过 200 字，只保留你坚持成立、且能给出依据的判断。'
    );
    return lines.join('\n');
  }

  function buildSelfCleansingMergePrompt(question, selfAudits) {
    return [
      '你是去伪存真流程的“自审合并器”。任务：把多个 AI 对系统标注污染的自我裁定合并成结构化数据，不要重新回答原始问题。',
      '',
      '请严格输出 JSON，不要 Markdown:',
      '{',
      '  "per_model": [',
      '    {"model":"模型名","accepted":["该模型接受撤回的污染描述"],"partial":["部分接受需要修订的"],"rejected":["明确拒绝并坚持的说法"],"cleaned_conclusion":"该模型净化后的核心结论"}',
      '  ],',
      '  "consensus_pollution": ["多模型自审中被共同接受撤回的污染项"],',
      '  "contested_pollution": ["仍有 AI 拒绝撤回的污染项"],',
      '  "self_cleansed_summary": "一句话总结自审环节的整体收敛情况"',
      '}',
      '',
      `原始问题:${String(question || '').trim() || '(空)'}`,
      '',
      '各模型的自我裁定:',
      ...selfAudits.map((audit) =>
        [`【${audit.modelName}】`, audit.ok ? audit.text : `未获得有效自审回答:${audit.error || 'unknown'}`, ''].join('\n')
      ),
    ].join('\n');
  }

  function buildPollutionPrompt(question, modelReplies, diffAnalyses, taskRoute) {
    const workflow = resolveWorkflow(taskRoute);
    if (workflow && typeof workflow.buildPollutionPrompt === 'function') {
      return workflow.buildPollutionPrompt({ question, modelReplies, diffAnalyses, taskRoute });
    }
    return [
      '你是“去伪存真”流程里的污染剔除器。',
      '任务：基于原始回答、差异追问和二次合并结果，识别并剔除污染因素。',
      '',
      '污染类型包括：模板话术、安全规避、幻觉补全、过度推测、上下文污染、时效污染、口径漂移、表达风格噪音。',
      '',
      '请严格输出 JSON，不要 Markdown：',
      '{',
      '  "pollution_removed": [{"source":"模型或阶段","type":"污染类型","content":"被剔除内容","reason":"剔除原因"}],',
      '  "kept_claims": ["保留下来的有效结论或判断"],',
      '  "discarded_claims": ["剔除或降权的说法"],',
      '  "root_causes": ["差异源头归因"],',
      '  "unresolved": ["仍无法确定的点"]',
      '}',
      '',
      `原始问题：${question}`,
      '',
      '原始回答：',
      ...modelReplies.map((reply) => `【${reply.name}】\n${reply.ok ? reply.text : `未获得有效回答：${reply.error || 'unknown'}`}\n`),
      '',
      '差异追问分析：',
      JSON.stringify(diffAnalyses, null, 2),
    ].join('\n');
  }

  function buildFinalTracePrompt(
    question,
    modelReplies,
    diffAnalyses,
    pollution,
    originalQuestion,
    selfCleansing,
    taskRoute,
    highRisk,
    evidencePlan,
    evidencePack,
    evidenceBoundaryGuard,
    externalEvidenceEnabled,
    consensus
  ) {
    const compressor = global.DuoliReportMaterialCompressor;
    const compact =
      compressor && typeof compressor.compactFinalTraceInput === 'function'
        ? compressor.compactFinalTraceInput({
            question,
            originalQuestion,
            modelReplies,
            diffAnalyses,
            pollution,
            selfCleansing,
            taskRoute,
            highRisk,
            evidencePlan,
            evidencePack,
            evidenceBoundaryGuard,
            externalEvidenceEnabled,
            consensus,
          })
        : {
            question,
            originalQuestion,
            modelReplies,
            diffAnalyses,
            pollution,
            selfCleansing,
            taskRoute,
            highRisk,
            evidencePlan,
            evidencePack,
            evidenceBoundaryGuard,
            externalEvidenceEnabled,
            consensus,
          };
    const api = global.DuoliEvaluationReportPrompt;
    if (api && typeof api.buildEvaluationReportPrompt === 'function') {
      return api.buildEvaluationReportPrompt({
        question: compact.question,
        originalQuestion: compact.originalQuestion,
        modelReplies: compact.modelReplies,
        diffAnalyses: compact.diffAnalyses,
        pollution: compact.pollution,
        selfCleansing: compact.selfCleansing,
        taskRoute: compact.taskRoute,
        highRisk: compact.highRisk,
        evidencePlan: compact.evidencePlan,
        evidencePack: compact.evidencePack,
        evidenceBoundaryGuard: compact.evidenceBoundaryGuard,
        externalEvidenceEnabled: compact.externalEvidenceEnabled,
        consensus: compact.consensus,
      });
    }
    return [
      '请基于完整去伪存真流程，生成多模型深度评测报告。',
      originalQuestion && originalQuestion !== question ? `用户原始提问：${originalQuestion}` : '',
      `实际下发问题：${question}`,
      ...modelReplies.map((reply) => `【${reply.name}】\n${reply.ok ? reply.text : `未获得有效回答：${reply.error || 'unknown'}`}\n`),
      '差异追问与二次合并：',
      JSON.stringify(diffAnalyses, null, 2),
      '污染剔除结果：',
      JSON.stringify(pollution, null, 2),
    ].filter(Boolean).join('\n');
  }

  global.DuoliTruthSeekingPrompts = {
    buildDiffExtractPrompt,
    buildDiffFollowupQuestion,
    buildSecondMergePrompt,
    buildSelfAuditPrompt,
    buildSelfCleansingMergePrompt,
    buildPollutionPrompt,
    buildFinalTracePrompt,
  };
})(window);
