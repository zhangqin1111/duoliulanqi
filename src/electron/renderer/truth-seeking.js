(function attachTruthSeeking(global) {
  const MAX_FOLLOWUP_ROUNDS = 4;

  function core() {
    return global.DuoliTruthSeekingCore;
  }

  function prompts() {
    return global.DuoliTruthSeekingPrompts;
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

    async function askAllModelsForDiff(diff, prompt, round) {
      const chats = deps.chatPlatforms();
      chats.forEach((cfg) => deps.setColStatus(cfg.id, `追问 ${diff.id} 第 ${round} 轮`, 'pending'));
      const replies = await Promise.all(
        chats.map(async (cfg) => {
          await deps.waitUntilGuestLoaded(cfg.id, 3000).catch(() => null);
          const r = await deps.askOnePlatform(cfg, prompt, {
            replyStableIdleMs: Math.max(deps.getReplyStableIdleMs(), 18000),
            responseTimeoutMs: 150000,
            retries: 0,
            minStableChars: 10,
            minQuietAfterFirstReplyMs: 18000,
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

    async function runSelfCleansingRound(session, modelReplies, pollution) {
      const api = getApi();
      const chats = deps.chatPlatforms();
      if (!chats.length || !pollution) return null;
      chats.forEach((cfg) => deps.setColStatus(cfg.id, '正在自审污染', 'pending'));

      const audits = await Promise.all(
        chats.map(async (cfg) => {
          await deps.waitUntilGuestLoaded(cfg.id, 3000).catch(() => null);
          const reply = modelReplies.find((r) => r.id === cfg.id || r.name === cfg.name);
          const originalText = reply && reply.ok ? reply.text : '';
          const attributed = core().pollutionItemsForModel(pollution, cfg.name);
          const prompt = prompts().buildSelfAuditPrompt(session.question, cfg.name, originalText, attributed);
          const r = await deps.askOnePlatform(cfg, prompt, {
            replyStableIdleMs: Math.max(deps.getReplyStableIdleMs(), 18000),
            responseTimeoutMs: 150000,
            retries: 0,
            minStableChars: 10,
            minQuietAfterFirstReplyMs: 18000,
          });
          deps.setColStatus(cfg.id, r.ok ? '自审完成' : `自审失败:${r.error || ''}`, r.ok ? 'ok' : 'err');
          return {
            id: cfg.id,
            modelName: cfg.name,
            ok: !!r.ok,
            text: r.ok ? String(r.text || '').trim() : '',
            error: r.ok ? '' : String(r.error || ''),
            attributedPollution: attributed,
          };
        })
      );

      const merged = await core().qwenJson(api, prompts().buildSelfCleansingMergePrompt(session.question, audits), {
        per_model: audits.map((a) => ({
          model: a.modelName,
          accepted: [],
          partial: [],
          rejected: [],
          cleaned_conclusion: '',
        })),
        consensus_pollution: [],
        contested_pollution: [],
        self_cleansed_summary: '',
      });

      return { audits, merged };
    }

    async function resolveDiffClosedLoop(session, diff) {
      const api = getApi();
      const followupRounds = [];
      let currentPrompt = prompts().buildDiffFollowupQuestion(session.question, diff, 1);
      let merge = null;
      let round = 1;
      let stopReason = '';
      while (round <= MAX_FOLLOWUP_ROUNDS) {
        if (typeof deps.setFlowStage === 'function') {
          deps.setFlowStage(
            'followup',
            '正在追问原因',
            `正在追问 ${diff.id}：${diff.topic}，第 ${round} 轮。`,
            'active'
          );
        }
        renderAnalysisProgress(session, `正在第 ${round} 轮追问 ${diff.id}：${diff.topic}`);
        const followup = await askAllModelsForDiff(diff, currentPrompt, round);
        followupRounds.push(followup);
        renderAnalysisProgress(session, `正在合并 ${diff.id} 第 ${round} 轮追问结果`);
        merge = await core().qwenJson(api, prompts().buildSecondMergePrompt(session.question, diff, followupRounds), {
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
        if (action !== 'ask_again') {
          stopReason = `merge=${action}`;
          break;
        }
        if (round >= MAX_FOLLOWUP_ROUNDS) {
          stopReason = `cap=${MAX_FOLLOWUP_ROUNDS}`;
          break;
        }
        const nextPrompt = String(merge.followup_question || '').trim();
        currentPrompt = nextPrompt || prompts().buildDiffFollowupQuestion(session.question, diff, round + 1);
        round += 1;
      }
      return { diff, followupRounds, merge, rounds: round, stopReason };
    }

    async function run(question, opt) {
      const api = getApi();
      const resultsPreloaded = opt && Array.isArray(opt.results);
      const initialResults = resultsPreloaded ? opt.results : await deps.runConcurrentAsk(question);
      const modelReplies = core().normalizeModelResults(initialResults);
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
        selfCleansing: null,
        finalText: '',
      };
      setSession(session);

      if (!modelReplies.some((reply) => reply.ok && reply.text)) {
        throw new Error('没有可用于分析的模型回答。');
      }
      if (typeof deps.completeFlowStage === 'function') {
        deps.completeFlowStage('dispatch', '多模型回复已收集，开始进入差异识别。');
      }

      if (typeof deps.setFlowStage === 'function') {
        deps.setFlowStage('extract', '正在抽取差异', '系统正在从多模型回答里识别事实、口径、因果和建议差异。', 'active');
      }
      renderAnalysisProgress(session, '正在抽取差异点');
      const diffPayload = await core().qwenJson(api, prompts().buildDiffExtractPrompt(question, modelReplies), {
        overview: '',
        diffs: [],
      });
      session.diffs = core().normalizeDiffs(diffPayload);
      if (!session.diffs.length) {
        session.diffs = core().deriveFallbackDiffs(modelReplies);
      }
      setSession(session);
      if (typeof deps.completeFlowStage === 'function') {
        deps.completeFlowStage(
          'extract',
          session.diffs.length ? `已识别 ${session.diffs.length} 个差异点，准备追问关键分歧。` : '未获得有效回答差异，无法继续追问。'
        );
      }
      if (session.diffs.length && typeof deps.showDiffDetailsCard === 'function') {
        deps.showDiffDetailsCard(session.diffs);
      }

      const followupDiffs = core().pickDiffsForFollowup(session.diffs);
      if (!followupDiffs.length) {
        throw new Error('差异抽取后没有可追问对象，无法进入去伪存真闭环。');
      }

      for (const diff of followupDiffs) {
        const analysis = await resolveDiffClosedLoop(session, diff);
        session.diffAnalyses.push(analysis);
        setSession(session);
        renderAnalysisProgress(session, `完成 ${diff.id} 的追问闭环`);
      }
      if (typeof deps.completeFlowStage === 'function') {
        deps.completeFlowStage(
          'followup',
          followupDiffs.length ? '关键差异已完成多轮追问和合并。' : '没有实质差异需要追问，跳过该阶段。'
        );
      }

      if (typeof deps.setFlowStage === 'function') {
        deps.setFlowStage('pollution', '正在剔除污染', '正在识别模板话术、过度推测、幻觉补全和口径漂移。', 'active');
      }
      renderAnalysisProgress(session, '正在剔除污染因素(千问初判)');
      session.pollution = await core().qwenJson(api, prompts().buildPollutionPrompt(question, modelReplies, session.diffAnalyses), {
        pollution_removed: [],
        kept_claims: [],
        discarded_claims: [],
        root_causes: [],
        unresolved: [],
      });
      setSession(session);

      renderAnalysisProgress(session, '让多家 AI 自审并剔除自身污染');
      try {
        session.selfCleansing = await runSelfCleansingRound(session, modelReplies, session.pollution);
      } catch (e) {
        session.selfCleansing = { audits: [], merged: null, error: (e && e.message) || String(e) };
      }
      setSession(session);
      if (typeof deps.completeFlowStage === 'function') {
        deps.completeFlowStage('pollution', '污染剔除和模型自审已完成，准备生成最终报告。');
      }

      if (typeof deps.setFlowStage === 'function') {
        deps.setFlowStage('report', '正在生成报告', '正在把源头分析、污染剔除和模型选型建议整合成最终报告。', 'active');
      }
      renderAnalysisProgress(session, '正在生成追根溯源结论');
      let accumulated = '';
      const summaryBodyEl = getSummaryBodyEl();
      const r = await api.qwenStream(
        prompts().buildFinalTracePrompt(
          question,
          modelReplies,
          session.diffAnalyses,
          session.pollution,
          session.originalQuestion,
          session.selfCleansing
        ),
        (delta) => {
          accumulated += delta;
          if (summaryBodyEl) {
            summaryBodyEl.textContent = core().renderFinalAnalysisText(accumulated, session);
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
      if (typeof deps.completeFlowStage === 'function') {
        deps.completeFlowStage('report', '最终报告已生成，可以打开对比弹层查看完整内容。');
      }
      if (typeof deps.showCompareReadyCard === 'function') {
        deps.showCompareReadyCard({
          title: '情报报告已准备好',
          detail: '已完成补全、分发、差异追问、污染剔除和追根溯源分析。',
          buttonText: '打开情报报告',
        });
      }
      if (summaryBodyEl) {
        summaryBodyEl.textContent = core().renderFinalAnalysisText(session.finalText, session);
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
    parseJsonLoose: (text) => core().parseJsonLoose(text),
  };
})(window);
