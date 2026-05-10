(function attachQuestionRefiner(global) {
  const DEFAULT_TIMEOUT_MS = 15000;
  const MIN_LENGTH_FOR_REFINE = 2;
  const MAX_LENGTH_FOR_REFINE = 1200;
  const MAX_SOURCE_CHARS_FOR_PROMPT = 5200;
  const DATE_HINT_RE =
    /(\d{4}[-/.年]\d{1,2}([-/月]\d{1,2}日?)?|\d{1,2}月\d{1,2}日|昨天|今天|明天|上周|本周|下周|去年|今年|明年|近\d+[天周月年]|最近\d+[天周月年])/;

  function resolveWorkflow(taskRoute) {
    const registry = global.DuoliWorkflowRegistry;
    return registry && typeof registry.resolve === 'function' ? registry.resolve(taskRoute) : null;
  }

  function compactForRefinePrompt(rawQuestion) {
    const text = String(rawQuestion || '').trim();
    if (text.length <= MAX_SOURCE_CHARS_FOR_PROMPT) return text;
    const head = text.slice(0, 3200);
    const tail = text.slice(-1400);
    return [
      head,
      '',
      `【中间内容因原始素材过长已折叠：原文共 ${text.length} 字。补全阶段只做任务整理，不得把折叠造成的信息缺口当成事实结论。】`,
      '',
      tail,
    ].join('\n');
  }

  function wrapLongMaterialPrompt(prompt, rawQuestion) {
    const raw = String(rawQuestion || '').trim();
    if (raw.length <= MAX_LENGTH_FOR_REFINE) return prompt;
    return [
      '【长素材输入处理规则】',
      '用户这次不是只输入了一个短问题，而是粘贴了一段新闻、观点或案件材料。',
      '补全目标不是判断材料真假，也不是替用户下结论；只把它整理成可分发给多个 AI 的分析任务书。',
      '必须保留用户材料里的核心对象、事件、金额、主体、关键日期和待核验争议点；不得新增用户没有给出的年份、月份、案例、法律结论或事实判断。',
      '实际下发问题应要求各 AI 分别输出：事实链条、可核验事实、待核验说法、责任/因果争议、舆情焦点、风险点、需人工核验项和最终可采信边界。',
      '',
      prompt,
    ].join('\n');
  }

  function buildRefinePrompt(rawQuestion, taskRoute) {
    const rawForPrompt = compactForRefinePrompt(rawQuestion);
    const policy = global.DuoliQuestionRefinementPolicy;
    const timeContext =
      policy && typeof policy.analyzeTimeBoundary === 'function'
        ? policy.analyzeTimeBoundary(rawQuestion)
        : {
            hasExplicitTime: DATE_HINT_RE.test(String(rawQuestion || '')),
            refineRule: DATE_HINT_RE.test(String(rawQuestion || ''))
              ? '4. 用户原句包含日期或时间线索：必须沿用用户给出的时间，不要自行扩展、替换或新增时间范围。'
              : '4. 用户没有给出明确时间边界：不要替用户补具体年份、月份、日期、起止时间或“最新/当前”等事实前提；只要求各 AI 自行标注资料时效和可核验状态。',
            workflowRule: '',
          };
    const noFactRule =
      policy && typeof policy.buildNoFactInjectionRule === 'function'
        ? policy.buildNoFactInjectionRule()
        : '补全只补任务维度、核验口径、输出字段和追问方向；不得替用户直接回答确定事实。';
    const workflow = resolveWorkflow(taskRoute);
    if (workflow && typeof workflow.buildRefinePrompt === 'function') {
      return wrapLongMaterialPrompt(workflow.buildRefinePrompt(rawForPrompt, {
        hasDateHint: timeContext.hasExplicitTime,
        timeBoundaryRule: timeContext.workflowRule,
        noFactInjectionRule: noFactRule,
        taskRoute,
        sourceMaterial: String(rawQuestion || '').trim().length > MAX_LENGTH_FOR_REFINE,
        sourceOriginalLength: String(rawQuestion || '').trim().length,
      }), rawQuestion);
    }
    return wrapLongMaterialPrompt([
      '你是“滤镜工作台”的问题补全器。你的任务是把用户一句话问题补全成一条可以直接分发给多个 AI 的高质量任务。',
      '',
      '补全目标：让后续系统能够基于多个 AI 的回答做差异抽取、原因追问、污染剔除和最终报告。',
      '',
      '硬性约束：',
      '1. 不改变用户核心意图，不替用户预设事实结论，不补充未经用户给出的具体事实。',
      `1A. ${noFactRule}`,
      '2. 如果用户只输入短语、人物、事件或关键词，必须补全成“报告素材采集型问题”，不能原样返回。',
      '3. 如果用户已经写得足够完整，只做轻微澄清，仍然输出一条可直接发送的问题。',
      timeContext.refineRule,
      '5. 输出必须要求模型按结构化字段回答，字段包括：事实脉络、确认事实、待核验说法、争议焦点、不同观点阵营、可能源头、风险提示、后续核验问题。',
      '6. 不要要求网页模型输出严格 JSON；后续报告 JSON 由系统统一生成。',
      '7. 不要输出解释、标题、Markdown 包装、前后缀说明；只输出补全后的问题正文。',
      '8. 长度控制在 120-360 字，复杂问题最多 800 字。',
      '',
      `用户原始问题：\n${rawForPrompt}`,
      '',
      '请直接输出补全后的问题正文：',
    ].join('\n'), rawQuestion);
  }

  function shouldSkipRefine(text) {
    const t = String(text || '').trim();
    return !t || t.length < MIN_LENGTH_FOR_REFINE;
  }

  function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`问题补全超时（${ms}ms）`)), ms);
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

  function sanitizeRefinedText(refined) {
    return String(refined || '')
      .trim()
      .replace(/^```[\w]*\s*/i, '')
      .replace(/\s*```$/i, '')
      .replace(/^(补全后的问题[:：]?\s*|以下是补全后的问题[:：]?\s*)/i, '')
      .trim();
  }

  function createQuestionRefiner(deps) {
    const getApi = () => (typeof deps.getApi === 'function' ? deps.getApi() : null);
    const timeoutMs = Number(deps.timeoutMs) > 0 ? Number(deps.timeoutMs) : DEFAULT_TIMEOUT_MS;

    async function refineQuestion(rawQuestion, opt) {
      const raw = String(rawQuestion || '').trim();
      if (shouldSkipRefine(raw)) {
        throw new Error('问题为空或过短，无法进入补全流程。');
      }
      const api = getApi();
      const completion = global.DuoliProviderCompletion;
      if (!api || (!api.qwenComplete && (!completion || typeof completion.completeText !== 'function'))) {
        throw new Error('问题补全接口不可用，无法进入多模型分发。');
      }

      const prompt = buildRefinePrompt(raw, opt && opt.taskRoute);
      const result =
        completion && typeof completion.completeText === 'function'
          ? await withTimeout(completion.completeText(api, prompt, { timeoutMs }), timeoutMs)
          : await withTimeout(api.qwenComplete(prompt), timeoutMs);
      if (!result || !result.ok || !result.text) {
        throw new Error((result && result.error) || '模型没有返回有效的补全问题。');
      }

      const refined = sanitizeRefinedText(result.text);
      if (!refined) {
        throw new Error('模型返回内容为空，无法进入多模型分发。');
      }

      return {
        refined,
        original: raw,
        fellBack: false,
        reason: '',
        source: result.source || 'qwen',
      };
    }

    return { refineQuestion };
  }

  global.DuoliQuestionRefiner = {
    createQuestionRefiner,
    buildRefinePrompt,
  };
})(window);
