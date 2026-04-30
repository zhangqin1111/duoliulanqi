(function attachTruthSeeking(global) {
  function normalizeModelResults(results) {
    return (Array.isArray(results) ? results : []).map(({ cfg, r }) => ({
      id: cfg && cfg.id ? cfg.id : '',
      name: cfg && cfg.name ? cfg.name : 'Unknown',
      ok: !!(r && r.ok),
      text: r && r.ok ? String(r.text || '').trim() : '',
      error: r && !r.ok ? String(r.error || '') : '',
    }));
  }

  function stripMarkdownFence(text) {
    return String(text || '')
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }

  function parseJsonLoose(text) {
    const raw = stripMarkdownFence(text);
    try {
      return JSON.parse(raw);
    } catch (e) {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(raw.slice(start, end + 1));
        } catch (e2) {
          /* fall through */
        }
      }
    }
    return null;
  }

  async function qwenJson(api, prompt, fallback) {
    if (!api || typeof api.qwenComplete !== 'function') return fallback;
    const r = await api.qwenComplete(prompt);
    if (!r || !r.ok) {
      throw new Error((r && r.error) || 'Qwen JSON request failed.');
    }
    return parseJsonLoose(r.text) || fallback;
  }

  function buildDiffExtractPrompt(question, modelReplies) {
    return [
      '你是“去伪存真”分析流程里的差异抽取器。',
      '任务：只基于下方多个 AI 对同一问题的原始回答，抽取真正值得追问的差异点。',
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
      ...modelReplies.map((reply) => [
        `【${reply.name}】`,
        reply.ok ? reply.text : `未获得有效回答：${reply.error || 'unknown'}`,
        '',
      ].join('\n')),
    ].join('\n');
  }

  function normalizeDiffs(payload) {
    const diffs = Array.isArray(payload && payload.diffs) ? payload.diffs : [];
    return diffs
      .map((diff, index) => ({
        id: String(diff.id || `D${index + 1}`),
        topic: String(diff.topic || `差异 ${index + 1}`).trim(),
        type: String(diff.type || '表达差异').trim(),
        models: Array.isArray(diff.models) ? diff.models.map(String) : [],
        claims: Array.isArray(diff.claims) ? diff.claims : [],
        severity: String(diff.severity || 'low').trim(),
        needs_followup: diff.needs_followup !== false,
        why_it_matters: String(diff.why_it_matters || '').trim(),
      }))
      .filter((diff) => diff.topic);
  }

  function pickDiffsForFollowup(diffs) {
    const severityRank = { high: 0, medium: 1, low: 2 };
    return diffs
      .filter((diff) => diff.needs_followup && diff.type !== '表达差异')
      .sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9))
      .slice(0, 3);
  }

  function formatDiffClaims(diff) {
    const claims = Array.isArray(diff.claims) ? diff.claims : [];
    if (!claims.length) return '未能抽取到清晰 claim。';
    return claims
      .map((claim) => `- ${claim.model || '未知模型'}：${claim.claim || ''}`)
      .join('\n');
  }

  function buildDiffFollowupQuestion(question, diff, round) {
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
      '任务：基于多个 AI 对差异原因的解释，合并同类项，判断差异是否已收敛。',
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

  function buildPollutionPrompt(question, modelReplies, diffAnalyses) {
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

  function buildFinalTracePrompt(question, modelReplies, diffAnalyses, pollution, originalQuestion) {
    const api = global.DuoliEvaluationReportPrompt;
    if (api && typeof api.buildEvaluationReportPrompt === 'function') {
      return api.buildEvaluationReportPrompt({
        question,
        originalQuestion,
        modelReplies,
        diffAnalyses,
        pollution,
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

  function renderFinalAnalysisText(finalText, session) {
    const lines = [String(finalText || '').trim()];
    if (session && session.diffAnalyses && session.diffAnalyses.length) {
      lines.push('', '差异追问记录');
      session.diffAnalyses.forEach((item) => {
        lines.push(`- ${item.diff.id}｜${item.diff.type}｜${item.diff.topic}`);
        if (item.merge && item.merge.cleaned_interpretation) {
          lines.push(`  剔除污染后的解释：${item.merge.cleaned_interpretation}`);
        }
        if (item.merge && Array.isArray(item.merge.likely_pollution) && item.merge.likely_pollution.length) {
          lines.push(`  污染因素：${item.merge.likely_pollution.join('；')}`);
        }
      });
    }
    if (session && session.pollution) {
      lines.push('', '污染剔除摘要');
      const removed = Array.isArray(session.pollution.pollution_removed) ? session.pollution.pollution_removed : [];
      if (removed.length) {
        removed.slice(0, 8).forEach((item) => {
          lines.push(`- ${item.type || '污染因素'}：${item.reason || item.content || ''}`);
        });
      } else {
        lines.push('- 暂未识别到需要显式剔除的污染内容。');
      }
    }
    return lines.join('\n');
  }

  function createTruthSeekingRunner(deps) {
    let currentSession = null;
    const getApi = () => (typeof deps.getApi === 'function' ? deps.getApi() : deps.api);
    const getSummaryBodyEl = () =>
      typeof deps.getSummaryBodyEl === 'function' ? deps.getSummaryBodyEl() : deps.summaryBodyEl;
    const refreshComparePanel = () => {
      if (typeof deps.refreshComparePanel === 'function') deps.refreshComparePanel();
    };

    function setSession(session) {
      currentSession = session;
      if (typeof deps.onSessionUpdate === 'function') deps.onSessionUpdate(session);
    }

    function renderAnalysisProgress(session, message) {
      const summaryBodyEl = getSummaryBodyEl();
      if (!summaryBodyEl) return;
      const wasRefined = session.originalQuestion && session.originalQuestion !== session.question;
      const lines = ['去伪存真分析中', ''];
      if (wasRefined) {
        lines.push(`用户原始提问：${session.originalQuestion}`);
        lines.push(`实际下发问题（千问已补全）：${session.question}`);
      } else {
        lines.push(`原始问题：${session.question}`);
      }
      lines.push('', `当前阶段：${message}`, '');
      if (session.diffs && session.diffs.length) {
        lines.push('已识别差异');
        session.diffs.forEach((diff) => {
          lines.push(`- ${diff.id}｜${diff.type}｜${diff.topic}`);
        });
        lines.push('');
      }
      if (session.diffAnalyses && session.diffAnalyses.length) {
        lines.push('已完成追问');
        session.diffAnalyses.forEach((item) => {
          const summary =
            item.merge && item.merge.cleaned_interpretation
              ? item.merge.cleaned_interpretation
              : item.diff.topic;
          lines.push(`- ${item.diff.id}：${summary}`);
        });
      }
      summaryBodyEl.textContent = lines.join('\n');
      refreshComparePanel();
      summaryBodyEl.scrollTop = summaryBodyEl.scrollHeight;
    }

    async function askAllModelsForDiff(session, diff, prompt, round) {
      const chats = deps.chatPlatforms();
      await Promise.all(chats.map((cfg) => deps.waitUntilGuestLoaded(cfg.id, 90000)));
      chats.forEach((cfg) => deps.setColStatus(cfg.id, `追问 ${diff.id} 第 ${round} 轮`, 'pending'));
      const replies = await Promise.all(
        chats.map(async (cfg) => {
          const r = await deps.askOnePlatform(cfg, prompt, {
            replyStableIdleMs: Math.min(deps.getReplyStableIdleMs(), 8000),
            responseTimeoutMs: 60000,
            retries: 0,
            minStableChars: 10,
            minQuietAfterFirstReplyMs: 5000,
          });
          deps.setColStatus(
            cfg.id,
            r.ok ? `完成 ${diff.id}` : `追问失败：${r.error || ''}`,
            r.ok ? 'ok' : 'err'
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
      return { round, question: prompt, replies };
    }

    async function resolveDiffClosedLoop(session, diff) {
      const api = getApi();
      const followupRounds = [];
      let currentPrompt = buildDiffFollowupQuestion(session.question, diff, 1);
      let merge = null;
      for (let round = 1; round <= 2; round++) {
        renderAnalysisProgress(session, `正在追问 ${diff.id}：${diff.topic}`);
        const followup = await askAllModelsForDiff(session, diff, currentPrompt, round);
        followupRounds.push(followup);
        renderAnalysisProgress(session, `正在合并 ${diff.id} 的追问结果`);
        merge = await qwenJson(api, buildSecondMergePrompt(session.question, diff, followupRounds), {
          diff_id: diff.id,
          consensus_causes: [],
          remaining_disputes: [],
          likely_pollution: [],
          cleaned_interpretation: '',
          confidence: 0,
          next_action: 'verify_external',
          followup_question: '',
        });
        const action = String(merge.next_action || 'stop');
        if (action !== 'ask_again' || round === 2) break;
        currentPrompt =
          String(merge.followup_question || '').trim() ||
          buildDiffFollowupQuestion(session.question, diff, round + 1);
      }
      return { diff, followupRounds, merge };
    }

    async function run(question, opt) {
      const api = getApi();
      const resultsPreloaded = opt && Array.isArray(opt.results);
      const initialResults = resultsPreloaded ? opt.results : await deps.runConcurrentAsk(question);
      const modelReplies = normalizeModelResults(initialResults);
      const originalQuestion = String((opt && opt.originalQuestion) || question || '').trim();
      const session = {
        id: `analysis_${Date.now()}`,
        question,
        originalQuestion,
        createdAt: new Date().toISOString(),
        initialResults: modelReplies,
        diffs: [],
        diffAnalyses: [],
        pollution: null,
        finalText: '',
      };
      setSession(session);

      if (!modelReplies.some((reply) => reply.ok && reply.text)) {
        throw new Error('没有可用于分析的模型回答。');
      }

      renderAnalysisProgress(session, '正在抽取差异点');
      const diffPayload = await qwenJson(api, buildDiffExtractPrompt(question, modelReplies), {
        overview: '',
        diffs: [],
      });
      session.diffs = normalizeDiffs(diffPayload);
      setSession(session);

      const followupDiffs = pickDiffsForFollowup(session.diffs);
      if (!followupDiffs.length) {
        renderAnalysisProgress(session, '没有发现需要追问的实质差异，正在生成最终报告');
      }

      for (const diff of followupDiffs) {
        const analysis = await resolveDiffClosedLoop(session, diff);
        session.diffAnalyses.push(analysis);
        setSession(session);
        renderAnalysisProgress(session, `完成 ${diff.id} 的追问闭环`);
      }

      renderAnalysisProgress(session, '正在剔除污染因素');
      session.pollution = await qwenJson(api, buildPollutionPrompt(question, modelReplies, session.diffAnalyses), {
        pollution_removed: [],
        kept_claims: [],
        discarded_claims: [],
        root_causes: [],
        unresolved: [],
      });
      setSession(session);

      renderAnalysisProgress(session, '正在生成追根溯源结论');
      let accumulated = '';
      const summaryBodyEl = getSummaryBodyEl();
      const r = await api.qwenStream(
        buildFinalTracePrompt(question, modelReplies, session.diffAnalyses, session.pollution, session.originalQuestion),
        (delta) => {
          accumulated += delta;
          if (summaryBodyEl) {
            summaryBodyEl.textContent = renderFinalAnalysisText(accumulated, session);
            refreshComparePanel();
            summaryBodyEl.scrollTop = summaryBodyEl.scrollHeight;
          }
        }
      );
      if (!r.ok) {
        throw new Error(r.error || '最终裁决生成失败。');
      }
      session.finalText = (accumulated || r.text || '').trim();
      setSession(session);
      if (summaryBodyEl) {
        summaryBodyEl.textContent = renderFinalAnalysisText(session.finalText, session);
        refreshComparePanel();
      }
      return session;
    }

    return {
      getCurrentSession: () => currentSession,
      run,
    };
  }

  global.DuoliTruthSeeking = {
    createTruthSeekingRunner,
    parseJsonLoose,
  };
})(window);
