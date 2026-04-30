(function attachQuestionRefiner(global) {
  const DEFAULT_TIMEOUT_MS = 8000;
  const MIN_LENGTH_FOR_REFINE = 4;
  const MAX_LENGTH_FOR_REFINE = 1200;

  function buildRefinePrompt(rawQuestion) {
    return [
      '你是一名 prompt 工程师,负责把用户写得过于简短或模糊的提问,补全成一份适合直接交给多家大模型作答的"高质量提问"。',
      '',
      '硬性约束:',
      '1. 不得改变用户的核心意图、立场和领域;不得替用户补充事实结论。',
      '2. 只在原问题明显缺背景/约束/期望粒度时才补全;原问题已经足够清晰就直接原样返回。',
      '3. 补全方向只能在以下范围内:必要的背景前提、关键约束(语言/平台/受众/规模)、期望的输出结构与粒度、需要避免的误区。',
      '4. 不要加礼貌用语、不要加前后缀说明,不要使用 Markdown 标题,不要"以下是补全后的问题"这种引导语。',
      '5. 输出必须是单独一段或几段问题正文本身,直接可发送给模型。',
      '6. 长度上限不超过原问题的 4 倍,且不超过 800 字。',
      '',
      `用户原始问题:\n${rawQuestion}`,
      '',
      '请直接输出补全后的问题正文:',
    ].join('\n');
  }

  function shouldSkipRefine(text) {
    const t = String(text || '').trim();
    if (!t) return true;
    if (t.length < MIN_LENGTH_FOR_REFINE) return true;
    if (t.length > MAX_LENGTH_FOR_REFINE) return true;
    return false;
  }

  function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`question refine timeout after ${ms}ms`)), ms);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }

  function sanitizeRefinedText(refined, raw) {
    let out = String(refined || '').trim();
    out = out.replace(/^```[\w]*\s*/i, '').replace(/\s*```$/i, '').trim();
    out = out.replace(/^(补全后的问题[:：]?\s*|以下是补全后的问题[:：]?\s*)/i, '').trim();
    if (!out) return raw;
    return out;
  }

  function createQuestionRefiner(deps) {
    const getApi = () => (typeof deps.getApi === 'function' ? deps.getApi() : null);
    const timeoutMs = Number(deps.timeoutMs) > 0 ? Number(deps.timeoutMs) : DEFAULT_TIMEOUT_MS;

    async function refineQuestion(rawQuestion) {
      const raw = String(rawQuestion || '').trim();
      const api = getApi();
      if (!api || typeof api.qwenComplete !== 'function') {
        return { refined: raw, original: raw, fellBack: true, reason: 'qwenComplete unavailable' };
      }
      if (shouldSkipRefine(raw)) {
        return { refined: raw, original: raw, fellBack: true, reason: 'skip-by-length' };
      }
      try {
        const r = await withTimeout(api.qwenComplete(buildRefinePrompt(raw)), timeoutMs);
        if (!r || !r.ok || !r.text) {
          return { refined: raw, original: raw, fellBack: true, reason: (r && r.error) || 'empty refine response' };
        }
        const refined = sanitizeRefinedText(r.text, raw);
        const changed = refined !== raw;
        return { refined, original: raw, fellBack: !changed, reason: changed ? '' : 'unchanged' };
      } catch (error) {
        return {
          refined: raw,
          original: raw,
          fellBack: true,
          reason: (error && error.message) || String(error),
        };
      }
    }

    return { refineQuestion };
  }

  global.DuoliQuestionRefiner = {
    createQuestionRefiner,
    buildRefinePrompt,
  };
})(window);
