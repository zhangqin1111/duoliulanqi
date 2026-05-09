(function attachAdaptiveWorkflows(global) {
  function formatReplies(modelReplies) {
    return (Array.isArray(modelReplies) ? modelReplies : [])
      .map((reply) =>
        [`【${reply.name || '未知模型'}】`, reply.ok ? reply.text : `未获得有效回答：${reply.error || 'unknown'}`, ''].join('\n')
      )
      .join('\n');
  }

  function formatDiffClaims(diff) {
    const claims = Array.isArray(diff && diff.claims) ? diff.claims : [];
    if (!claims.length) return '未能抽取到清晰 claim。';
    return claims.map((claim) => `- ${claim.model || '未知模型'}：${claim.claim || ''}`).join('\n');
  }

  function createAdaptiveWorkflow(config) {
    const cfg = config || {};
    function buildRefinePrompt(rawQuestion, context) {
      const hasDateHint = !!(context && context.hasDateHint);
      return [
        `你是“滤镜工作台”的${cfg.label}任务书生成器。`,
        `用户可能只说一句很短的问题。你的任务是把它补全成可分发给多个 AI 的“${cfg.label}”任务。`,
        '',
        `场景目标：${cfg.goal}`,
        '',
        '硬性约束：',
        '1. 不替用户预设最终结论；不编造外部事实、数据、引用、价格、病例、收益或法律结论。',
        hasDateHint
          ? '2. 用户给了明确时间或范围：必须沿用用户边界，不要自行扩大或替换。'
          : '2. 用户没有明确时间：按“当前/最近公开信息”理解，但不得编造具体日期。',
        `3. 必须要求模型输出：${cfg.requiredOutputs}`,
        `4. 必须显式区分：可验证事实、模型推断、主观建议、风险/不确定性、仍需补充的信息。`,
        '5. 不要要求网页模型输出 JSON；最终报告 JSON 由系统统一生成。',
        '6. 不要输出解释、标题、Markdown 包装、前后缀说明；只输出补全后的任务正文。',
        '7. 长度控制在 160-460 字。',
        '',
        `用户原始问题：\n${String(rawQuestion || '').trim()}`,
        '',
        `请直接输出补全后的${cfg.label}任务：`,
      ].join('\n');
    }

    function buildDiffExtractPrompt({ question, modelReplies }) {
      return [
        `你是“${cfg.label}”链路里的差异侦查员。`,
        '任务：只基于多个 AI 对同一问题的回答，抽取会影响最终报告结论的差异点。',
        '不要补充外部事实，不要直接裁决谁对谁错，只做差异拆解。',
        '',
        `优先识别这些差异：${cfg.diffFocus}`,
        '',
        `差异类型只能从这些值中选择：${cfg.diffTypes}、证据差异、风险差异、污染疑似、表达差异。`,
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
        `      "type": "${cfg.diffTypes} | 证据差异 | 风险差异 | 污染疑似 | 表达差异",`,
        '      "models": ["模型名"],',
        '      "claims": [{"model":"模型名","claim":"该模型的核心说法"}],',
        '      "severity": "high | medium | low",',
        '      "needs_followup": true,',
        '      "why_it_matters": "为什么这个差异会影响最终裁决"',
        '    }',
        '  ]',
        '}',
        '',
        `问题：${question}`,
        '',
        '模型回答：',
        formatReplies(modelReplies),
      ].join('\n');
    }

    function buildDiffFollowupQuestion({ question, diff, round }) {
      return [
        `原始问题：${question}`,
        '',
        `多个 AI 在「${diff.topic}」上出现不一致。`,
        `差异类型：${diff.type}`,
        `第 ${round} 轮追问目标：解释为什么这些 AI 会给出不同判断、方案、建议或表述。`,
        '',
        '各模型差异说法：',
        formatDiffClaims(diff),
        '',
        '请只回答“为什么不一致”，不要重新泛泛回答原始问题。',
        `必须区分以下原因：${cfg.causeFocus}`,
        '最后给出：最可能的差异源头、应剔除的污染因素、剔除后仍可采信的判断。',
      ].join('\n');
    }

    function buildPollutionPrompt({ question, modelReplies, diffAnalyses }) {
      return [
        `你是“${cfg.label}”链路里的污染剔除器。`,
        '任务：基于原始回答、差异追问和二次合并结果，识别并剔除会污染最终报告的内容。',
        '',
        `本场景污染类型包括：${cfg.pollutionTypes}`,
        '',
        '请严格输出 JSON，不要 Markdown：',
        '{',
        '  "pollution_removed": [{"source":"模型或阶段","type":"污染类型","content":"被剔除内容","reason":"剔除原因"}],',
        '  "kept_claims": ["保留下来的有效判断"],',
        '  "discarded_claims": ["剔除或降权的说法"],',
        '  "root_causes": ["差异源头归因"],',
        '  "unresolved": ["仍无法确定的点"]',
        '}',
        '',
        `原始问题：${question}`,
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
        `这是${cfg.label}场景。最终报告第一屏必须直接回答用户真正想解决的问题，而不是泛泛展示模型差异。`,
        `报告重点：${cfg.reportFocus}`,
        `user_issue_analysis.direct_answer 必须输出可执行裁决：${cfg.directAnswerRule}`,
        `scenario_decision.decision_factors 必须围绕这些因素评分：${cfg.factors}`,
        `user_issue_analysis.sentiment_distribution 改写为“${cfg.structureALabel}”；stance_distribution 改写为“${cfg.structureBLabel}”；audience_segments 改写为“${cfg.axisLabel}”；risk_matrix 改写为“${cfg.riskLabel}”。`,
        `dispute_map 只保留会改变最终建议的差异；final_actions 必须给出下一步可执行动作。`,
        cfg.safetyNote || '',
      ].filter(Boolean).join('\n');
    }

    return {
      id: cfg.id,
      taskType: cfg.taskType,
      label: cfg.label,
      buildRefinePrompt,
      buildDiffExtractPrompt,
      buildDiffFollowupQuestion,
      buildPollutionPrompt,
      buildReportPromptAddon,
    };
  }

  const workflows = {
    DuoliKnowledgeBriefWorkflow: createAdaptiveWorkflow({
      id: 'knowledge_brief_workflow',
      taskType: 'knowledge_brief',
      label: '知识简报',
      goal: '把宽泛知识问题转成有结论、有脉络、有边界、有可验证点的专业简报。',
      requiredOutputs: '核心答案、概念边界、关键机制、不同解释路径、适用场景、误区、仍需核验的信息',
      diffFocus: '定义口径、因果解释、时间边界、适用范围、证据强度、结论强弱',
      diffTypes: '定义差异 | 机制差异 | 范围差异 | 结论差异',
      causeFocus: '概念口径不同、知识来源不同、时间边界不同、抽象层级不同、证据强度不同、表达不同',
      pollutionTypes: '过度简化、概念偷换、无来源数据、把类比当事实、把推测当结论、过时知识、模板化废话',
      reportFocus: '直接答案、知识地图、分歧解释、可信结论和延伸阅读/核验方向。',
      directAnswerRule: '先给一句话答案，再给为什么、适用边界和常见误区。',
      factors: '准确性、解释力、完整度、可验证性、适用边界、误导风险',
      structureALabel: '知识结构',
      structureBLabel: '解释路径',
      axisLabel: '概念坐标',
      riskLabel: '误读风险',
    }),
    DuoliCreativeContentWorkflow: createAdaptiveWorkflow({
      id: 'creative_content_workflow',
      taskType: 'creative_content',
      label: '内容创作方案',
      goal: '把创作需求转成明确受众、渠道、风格、卖点、结构和交付物的创作任务。',
      requiredOutputs: '目标受众、传播目标、核心卖点、风格方向、内容结构、多个备选方案、风险词和修改建议',
      diffFocus: '受众定位、卖点选择、语气风格、内容结构、平台适配、转化目标',
      diffTypes: '受众差异 | 卖点差异 | 风格差异 | 结构差异 | 平台适配差异',
      causeFocus: '渠道假设不同、目标人群不同、转化目标不同、品牌调性不同、内容尺度不同、模板化表达',
      pollutionTypes: '空泛营销话术、夸大承诺、违规敏感表述、抄袭风险、平台不适配、目标受众错位',
      reportFocus: '给出最佳创意方向、备选风格、结构框架、可直接执行的文案/脚本策略。',
      directAnswerRule: '直接给推荐创作方向和可落地版本，不只评价模型写得好不好。',
      factors: '受众匹配、传播力、差异化、转化潜力、平台适配、风险控制',
      structureALabel: '创意构成',
      structureBLabel: '方案梯队',
      axisLabel: '受众坐标',
      riskLabel: '内容风险',
    }),
    DuoliTechnicalDiagnosisWorkflow: createAdaptiveWorkflow({
      id: 'technical_diagnosis_workflow',
      taskType: 'technical_diagnosis',
      label: '技术诊断',
      goal: '把技术问题转成可排查、可验证、可实施的工程诊断任务。',
      requiredOutputs: '问题复现条件、可能原因、证据、排查步骤、修复方案、风险、验证方法',
      diffFocus: '根因判断、修复路径、风险评估、实现复杂度、验证方法、依赖环境',
      diffTypes: '根因差异 | 修复方案差异 | 风险差异 | 验证差异 | 实现路径差异',
      causeFocus: '上下文不足、框架版本不同、运行环境不同、日志解读不同、假设链不同、经验偏好不同',
      pollutionTypes: '编造 API、忽略版本、危险命令、无验证修复、过度重构、把猜测当根因',
      reportFocus: '给出最可能根因、排查优先级、推荐修复方案和验证清单。',
      directAnswerRule: '先给最可能原因和第一步怎么查，再给修复路径。',
      factors: '根因可信度、修复成本、回归风险、可验证性、兼容性、实施优先级',
      structureALabel: '根因结构',
      structureBLabel: '修复梯队',
      axisLabel: '模块坐标',
      riskLabel: '工程风险',
    }),
    DuoliLearningResearchWorkflow: createAdaptiveWorkflow({
      id: 'learning_research_workflow',
      taskType: 'learning_research',
      label: '学习研究',
      goal: '把学习/研究问题转成有目标、有知识框架、有资料路径和输出标准的研究任务。',
      requiredOutputs: '学习目标、知识框架、关键概念、资料路径、学习计划、评估方法、常见误区',
      diffFocus: '知识框架、资料来源、学习顺序、重点权重、结论边界',
      diffTypes: '框架差异 | 来源差异 | 顺序差异 | 权重差异 | 结论差异',
      causeFocus: '学科口径不同、难度假设不同、资料范围不同、目标不同、时间预算不同',
      pollutionTypes: '伪引用、过时资料、空泛学习建议、忽略基础差异、把观点当共识',
      reportFocus: '输出学习/研究路线、核心资料、知识图谱、阶段目标和验证方式。',
      directAnswerRule: '直接给学习/研究路径和优先级。',
      factors: '准确性、系统性、可执行性、资料可信度、难度匹配、产出质量',
      structureALabel: '知识框架',
      structureBLabel: '学习路径',
      axisLabel: '能力坐标',
      riskLabel: '学习风险',
    }),
    DuoliTravelLifestyleWorkflow: createAdaptiveWorkflow({
      id: 'travel_lifestyle_workflow',
      taskType: 'travel_lifestyle',
      label: '旅行/本地生活',
      goal: '把旅行和本地生活问题转成可执行行程、选择理由、风险提醒和实时核验清单。',
      requiredOutputs: '目的地/需求、预算、时间、偏好、路线、备选方案、避坑点、实时核验项',
      diffFocus: '地点范围、预算口径、路线安排、偏好假设、实时营业/价格/交通信息',
      diffTypes: '地点差异 | 预算差异 | 路线差异 | 偏好差异 | 实时信息差异',
      causeFocus: '实时数据缺失、地区口径不同、预算假设不同、用户偏好不同、交通/营业信息变化',
      pollutionTypes: '过时营业信息、虚构价格、泛泛景点清单、忽略交通成本、忽略人群偏好',
      reportFocus: '输出推荐路线、备选方案、适合人群、预算拆解和出发前核验清单。',
      directAnswerRule: '直接给推荐方案和为什么适合。',
      factors: '匹配度、成本、交通便利性、体验密度、风险、实时核验必要性',
      structureALabel: '体验构成',
      structureBLabel: '方案梯队',
      axisLabel: '人群坐标',
      riskLabel: '出行风险',
    }),
    DuoliCareerRecruitingWorkflow: createAdaptiveWorkflow({
      id: 'career_recruiting_workflow',
      taskType: 'career_recruiting',
      label: '职业/招聘',
      goal: '把职业、简历、面试、招聘问题转成岗位匹配和行动建议任务。',
      requiredOutputs: '目标岗位、能力匹配、简历/经历亮点、短板、面试策略、行动计划、风险提醒',
      diffFocus: '岗位定位、能力评估、简历表达、面试策略、薪资/职业路径假设',
      diffTypes: '定位差异 | 能力评估差异 | 表达差异 | 策略差异 | 风险差异',
      causeFocus: '岗位理解不同、行业经验不同、样本信息不足、风险偏好不同、表达风格不同',
      pollutionTypes: '空泛鸡汤、夸大经历、虚假包装、忽略岗位要求、薪资臆测、歧视性建议',
      reportFocus: '输出岗位匹配结论、简历/面试优化重点、优先行动清单。',
      directAnswerRule: '直接给最该改什么、怎么准备、下一步做什么。',
      factors: '岗位匹配度、经历可信度、表达清晰度、竞争力、风险、执行优先级',
      structureALabel: '能力结构',
      structureBLabel: '行动梯队',
      axisLabel: '岗位坐标',
      riskLabel: '求职风险',
    }),
    DuoliMedicalHealthWorkflow: createAdaptiveWorkflow({
      id: 'medical_health_screening_workflow',
      taskType: 'medical_health',
      label: '医疗健康初筛',
      goal: '把健康问题转成非诊断性的风险分层、就医提示和信息补全任务。',
      requiredOutputs: '症状/指标摘要、危险信号、可能方向、不能确定的点、就医建议、需要补充的信息',
      diffFocus: '风险等级、危险信号、可能方向、就医紧急度、信息缺口',
      diffTypes: '风险分层差异 | 危险信号差异 | 建议差异 | 信息缺口差异',
      causeFocus: '信息不足、症状描述模糊、年龄/基础病未知、指标单位不同、医学风险偏好不同',
      pollutionTypes: '远程确诊、具体用药剂量、忽略急症信号、夸大或淡化风险、伪医学建议',
      reportFocus: '输出健康风险初筛、危险信号、就医/复诊建议和需补充信息。',
      directAnswerRule: '明确说明不能替代医生诊断；先给风险分层和是否需要及时就医。',
      factors: '危险信号、信息完整度、紧急程度、可解释性、误导风险、复核必要性',
      structureALabel: '症状结构',
      structureBLabel: '处理优先级',
      axisLabel: '风险坐标',
      riskLabel: '健康风险',
      safetyNote: '医疗健康问题不得输出确诊结论、处方剂量或替代医生意见；必须提示必要时线下就医。',
    }),
    DuoliFinancePlanningWorkflow: createAdaptiveWorkflow({
      id: 'finance_planning_workflow',
      taskType: 'finance_planning',
      label: '金融规划初筛',
      goal: '把金融/理财问题转成非个性化的风险分析、信息补全和决策框架任务。',
      requiredOutputs: '目标、期限、风险承受能力、现金流、候选方案、风险、费用、需补充信息',
      diffFocus: '风险假设、收益假设、期限、成本费用、产品适配、合规边界',
      diffTypes: '风险假设差异 | 收益假设差异 | 期限差异 | 产品适配差异 | 合规边界差异',
      causeFocus: '用户资产信息不足、市场假设不同、风险偏好不同、期限不同、费用口径不同',
      pollutionTypes: '承诺收益、具体买卖指令、忽略风险、虚构历史收益、过度确定性、个性化金融建议越界',
      reportFocus: '输出风险分层、决策框架、需要补充的信息和审慎行动建议。',
      directAnswerRule: '明确不是投资建议；先给风险框架和需要核验的信息。',
      factors: '风险承受能力、期限匹配、流动性、费用、收益不确定性、合规风险',
      structureALabel: '资产/目标结构',
      structureBLabel: '方案梯队',
      axisLabel: '风险坐标',
      riskLabel: '金融风险',
      safetyNote: '金融问题不得输出保证收益或个性化买卖指令；必须提示结合自身情况并咨询持牌专业人士。',
    }),
  };

  Object.assign(global, workflows);
})(window);
