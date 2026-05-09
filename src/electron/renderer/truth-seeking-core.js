(function attachTruthSeekingCore(global) {
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

  async function qwenJson(api, prompt, fallback, options) {
    if (!api || typeof api.qwenComplete !== 'function') return fallback;
    const r = await api.qwenComplete(prompt, options || { timeoutMs: 120000, retries: 1 });
    if (!r || !r.ok) {
      throw new Error((r && r.error) || 'Qwen JSON request failed.');
    }
    return parseJsonLoose(r.text) || fallback;
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

  function clip(text, max) {
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    return value.length > max ? `${value.slice(0, max)}…` : value;
  }

  function deriveFallbackDiffs(modelReplies) {
    const replies = (Array.isArray(modelReplies) ? modelReplies : []).filter((reply) => reply.ok && reply.text);
    if (replies.length < 2) return [];
    return [
      {
        id: 'D1',
        topic: '各模型回答中的事实重点、核验路径与风险判断是否一致',
        type: '口径差异',
        models: replies.map((reply) => reply.name),
        claims: replies.map((reply) => ({
          model: reply.name,
          claim: clip(reply.text, 180),
        })),
        severity: 'medium',
        needs_followup: true,
        why_it_matters: '差异抽取器未返回明确差异时，仍需要让模型围绕事实源头、核验路径和污染因素进行二次自证，避免直接生成未经追问的报告。',
      },
    ];
  }

  function pickDiffsForFollowup(diffs) {
    const severityRank = { high: 0, medium: 1, low: 2 };
    return diffs
      .filter((diff) => diff.needs_followup)
      .sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9))
      .slice(0, 3);
  }

  function pollutionItemsForModel(pollution, modelName) {
    const removed = pollution && Array.isArray(pollution.pollution_removed) ? pollution.pollution_removed : [];
    const exact = removed.filter((item) => String(item.source || '').includes(modelName));
    if (exact.length) return exact;
    return removed.filter(
      (item) => !item.source || item.source === '阶段' || item.source === '所有模型' || item.source === '全部'
    );
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

  global.DuoliTruthSeekingCore = {
    normalizeModelResults,
    parseJsonLoose,
    qwenJson,
    normalizeDiffs,
    deriveFallbackDiffs,
    pickDiffsForFollowup,
    pollutionItemsForModel,
    renderFinalAnalysisText,
  };
})(window);
