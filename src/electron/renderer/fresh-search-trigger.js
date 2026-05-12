(function attachFreshSearchTrigger(global) {
  function buildFreshSearchTrigger(question) {
    return [
      '请联网搜索最新信息，核验你刚才的回答是否准确。',
      '如果有新信息、官方口径、价格参数、发布时间、售卖状态或事件进展，请直接给出修正版答案。',
      '如果无法联网搜索，请明确写出：未联网，仅基于已有知识判断。',
      '',
      `原问题：${question}`,
    ].join('\n');
  }

  function mergeResults(modelReplies, freshSearchResults) {
    const supplements = new Map(
      (Array.isArray(freshSearchResults) ? freshSearchResults : []).map((reply) => [reply.id || reply.name, reply])
    );
    return modelReplies.map((reply) => {
      const supplement = supplements.get(reply.id) || supplements.get(reply.name);
      if (!supplement || !supplement.ok || !String(supplement.text || '').trim()) return reply;
      const originalText = String(reply.text || '').trim();
      const freshText = String(supplement.text || '').trim();
      return {
        ...reply,
        text: [originalText, '【联网搜索补充】', freshText].filter(Boolean).join('\n\n'),
        freshSearch: supplement,
      };
    });
  }

  async function run(options) {
    const deps = options.deps;
    const session = options.session;
    const modelReplies = options.modelReplies;
    const chats = deps.chatPlatforms();
    if (!chats.length) return { replies: [], mergedReplies: modelReplies };

    const prompt = buildFreshSearchTrigger(session.question);
    if (typeof deps.setFlowStage === 'function') {
      deps.setFlowStage('fresh_search', '正在触发联网搜索', '首轮回答完成后，系统正在单独发送短指令触发各 AI 联网核验。', 'active');
    }
    options.auditRecord(session, 'fresh_search', 'broadcast_prompt', {
      prompt,
      modelCount: chats.length,
      baseReplies: options.compactReplies(modelReplies),
    });
    chats.forEach((cfg) => deps.setColStatus(cfg.id, '正在联网核验', 'pending'));

    const replies = await Promise.all(
      chats.map(async (cfg) => {
        await deps.waitUntilGuestLoaded(cfg.id, 3000).catch(() => null);
        const startedAt = options.auditTimer();
        const r = await deps.askOnePlatform(
          cfg,
          prompt,
          options.stageAskOptions(cfg, {
            responseTimeoutMs: Number(cfg && cfg.freshSearchTimeoutMs) || 70000,
            noResponseTimeoutMs: Number(cfg && cfg.noResponseTimeoutMs) || 26000,
          })
        );
        deps.setColStatus(cfg.id, r.ok ? '联网核验完成' : options.stageFailureLabel('联网核验', r), r.ok ? 'ok' : 'err');
        options.auditRecord(
          session,
          'fresh_search',
          'model_reply',
          {
            model: cfg.name,
            ok: !!r.ok,
            text: r.ok ? String(r.text || '').trim() : '',
            error: r.ok ? '' : String(r.error || ''),
          },
          r.ok ? 'ok' : 'error',
          startedAt
        );
        return {
          id: cfg.id,
          name: cfg.name,
          ok: !!r.ok,
          text: r.ok ? String(r.text || '').trim() : '',
          error: r.ok ? '' : String(r.error || ''),
        };
      })
    );

    if (typeof deps.completeFlowStage === 'function') {
      deps.completeFlowStage('fresh_search', '联网核验补充已收集，开始进入差异识别。');
    }
    return { replies, mergedReplies: mergeResults(modelReplies, replies) };
  }

  global.DuoliFreshSearchTrigger = {
    buildFreshSearchTrigger,
    mergeResults,
    run,
  };
})(window);
