(function attachQuestionRefinementPolicy(global) {
  const ABSOLUTE_TIME_RE =
    /(\d{4}(?:\s*年|\s*款|\s*版|[-/.]\d{1,2}(?:[-/.]\d{1,2})?)?|\d{1,2}\s*月(?:\d{1,2}\s*日)?|Q[1-4]|第[一二三四1234]季度)/i;
  const RELATIVE_TIME_RE =
    /(最新|最近|当前|目前|现在|至今|截至|截止|今年|去年|明年|昨天|今天|明天|上周|本周|下周|近\d+[天周月年]|最近\d+[天周月年])/;
  function buildNoUnauthorizedTimeRule() {
    return '如果用户原问题没有明确年份、月份、日期或季度，补全结果不得新增任何具体年份、月份、日期、季度、年款或固定时间窗口；只能要求各 AI 按“截至本次查询时”自行核验价格、配置、在售状态、发布时间和资料时效。';
  }

  function analyzeTimeBoundary(rawQuestion) {
    const question = String(rawQuestion || '');
    const hasAbsoluteTime = ABSOLUTE_TIME_RE.test(question);
    const hasRelativeTime = !hasAbsoluteTime && RELATIVE_TIME_RE.test(question);
    const hasExplicitTime = hasAbsoluteTime;

    if (hasAbsoluteTime) {
      return {
        hasExplicitTime,
        hasRelativeTime: false,
        refineRule:
          '4. 用户原句包含明确年份、月份、日期、季度、年款或固定时间边界：必须原样沿用用户边界，不要自行扩展、替换或新增时间范围。',
        workflowRule:
          '用户给了明确年份、月份、日期、季度、年款或固定时间边界：必须原样沿用用户边界，不要自行扩大、替换或新增时间范围。',
      };
    }

    if (hasRelativeTime) {
      return {
        hasExplicitTime,
        hasRelativeTime,
        refineRule:
          '4. 用户原句包含“最新/当前/最近/目前”等相对时效词：只能保留为“截至本次查询时/本次查询时”的核验要求，不得换算成具体年份、月份、日期、季度、年款或固定起止时间，不得预设哪些事实已经成立。',
        workflowRule:
          '用户给的是“最新/当前/最近/目前”等相对时效需求：只能保留为截至本次查询时的核验要求，不得换算成具体年份、月份、日期、季度、年款或固定起止时间，不得预设事实结论。',
      };
    }

    return {
      hasExplicitTime,
      hasRelativeTime,
      refineRule:
        '4. 用户没有给出时间边界：不要替用户补具体年份、月份、日期、季度、年款、起止时间或“最新/当前”等事实前提；只要求各 AI 在回答中自行标注资料时效、可核验/待核验状态和需要人工确认的来源。',
      workflowRule:
        '用户没有给出时间边界：不得替用户补具体年份、月份、日期、季度、年款、起止时间或“最新/当前”等事实前提；只补核验维度、输出结构和需要 AI 自行确认的资料时效。',
    };
  }

  function buildNoFactInjectionRule() {
    return `补全只补任务维度、核验口径、输出字段和追问方向；不得替用户直接回答确定事实，不得预设候选清单、价格、参数、发布时间、销售状态、法律结论、医学结论或投资结论。事实判断交给后续多个 AI 回答与系统交叉核验。${buildNoUnauthorizedTimeRule()}`;
  }

  global.DuoliQuestionRefinementPolicy = {
    analyzeTimeBoundary,
    buildNoFactInjectionRule,
    buildNoUnauthorizedTimeRule,
  };
})(window);
