(function attachQuestionRefiner(global) {
  const DEFAULT_TIMEOUT_MS = 15000;
  const MIN_LENGTH_FOR_REFINE = 2;
  const MAX_LENGTH_FOR_REFINE = 1200;
  const DATE_HINT_RE = /(\d{4}[-/.年]\d{1,2}([-/月.]\d{1,2}日?)?|\d{1,2}月\d{1,2}日|昨天|今天|明天|上周|本周|下周|去年|今年|明年|近\d+[天周月年]|最近\d+[天周月年])/;

  function resolveWorkflow(taskRoute) {
    const registry = global.DuoliWorkflowRegistry;
    return registry && typeof registry.resolve === 'function' ? registry.resolve(taskRoute) : null;
  }

  function buildRefinePrompt(rawQuestion, taskRoute) {
    const hasDateHint = DATE_HINT_RE.test(String(rawQuestion || ''));
    const workflow = resolveWorkflow(taskRoute);
    if (workflow && typeof workflow.buildRefinePrompt === 'function') {
      return workflow.buildRefinePrompt(rawQuestion, { hasDateHint, taskRoute });
    }
    return [
      '你是“滤镜工作台”的问题补全器。你的任务是把用户一句话问题补全成一条可以直接分发给多个 AI 窗口作答的高质量任务。',
      '',
      '补全目标：让后续系统能够基于多个 AI 的回答做差异抽取、原因追问、污染剔除和最终事实/观点报告。',
      '',
      '硬性约束：',
      '1. 不改变用户核心意图，不替用户预设事实结论，不补充未经用户给出的具体事实。',
      '2. 如果用户只是输入短话题、人物、事件或关键词，必须补全成“报告素材采集型问题”，不能原样返回。',
      '3. 如果用户已经写得足够完整，只做轻微澄清，仍然输出一条可直接发送的问题。',
      hasDateHint
        ? '4. 用户原句包含日期或时间线索：必须沿用用户给出的时间，不要自行扩展、替换或新增时间范围。'
        : '4. 用户没有明确日期：时间范围默认理解为“最近/当前”，不要添加具体年份、月份、日期或起止时间。',
      '5. 输出必须要求模型按结构化字段回答，字段包括：事实脉络、确认事实、待核验说法、争议焦点、不同观点阵营、可能源头、风险提示、后续核验问题。',
      '6. 不要求网页模型输出严格 JSON；后续报告 JSON 由系统统一生成。',
      '7. 不要输出解释、标题、Markdown 包装、前后缀说明；只输出补全后的问题正文。',
      '8. 长度控制在 120-360 字，复杂问题最多 800 字。',
      '',
      `用户原始问题：\n${String(rawQuestion || '').trim()}`,
      '',
      '请直接输出补全后的问题正文：',
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
      if (!api || typeof api.qwenComplete !== 'function') {
        throw new Error('千问补全接口不可用，无法进入多模型分发。');
      }

      const result = await withTimeout(api.qwenComplete(buildRefinePrompt(raw, opt && opt.taskRoute)), timeoutMs);
      if (!result || !result.ok || !result.text) {
        throw new Error((result && result.error) || '千问没有返回有效的补全问题。');
      }

      const refined = sanitizeRefinedText(result.text);
      if (!refined) {
        throw new Error('千问返回内容为空，无法进入多模型分发。');
      }

      return {
        refined,
        original: raw,
        fellBack: false,
        reason: '',
        source: 'qwen',
      };
    }

    return { refineQuestion };
  }

  global.DuoliQuestionRefiner = {
    createQuestionRefiner,
    buildRefinePrompt,
  };
})(window);
