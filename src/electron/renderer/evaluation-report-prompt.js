(function attachEvaluationReportPrompt(global) {
  const HEADINGS = [
    '战情驾驶舱',
    '问题补全与分析任务书',
    '用户问题结果研判',
    '事实脉络与证据地图',
    '争议焦点热力图',
    '差异详情侦查台',
    '去伪存真证据漏斗',
    '模型证人画像',
    '源头分析与最终裁决',
    '数据可视化组件规格',
  ];

  function normalizeReplies(replies) {
    return (Array.isArray(replies) ? replies : []).map((reply, index) => ({
      name: reply.name || (reply.cfg && reply.cfg.name) || `模型${index + 1}`,
      ok: reply.ok !== false && !(reply.r && reply.r.ok === false),
      text: reply.text || (reply.r && reply.r.text) || '',
      error: reply.error || (reply.r && reply.r.error) || '',
    }));
  }

  function formatReplies(replies) {
    return normalizeReplies(replies)
      .map((reply) => `【${reply.name}】\n${reply.ok ? reply.text : `未获得有效回答：${reply.error || 'unknown'}`}`)
      .join('\n\n');
  }

  function buildEvaluationReportPrompt(input) {
    const data = input || {};
    const question = String(data.question || data.userQuestion || '').trim();
    const originalQuestion = String(data.originalQuestion || '').trim();
    const wasRefined = !!originalQuestion && originalQuestion !== question;
    const modelReplies = normalizeReplies(data.modelReplies || data.results || []);
    const modelNames = modelReplies.map((reply) => reply.name).join(' / ');
    const diffAnalyses = data.diffAnalyses ? JSON.stringify(data.diffAnalyses, null, 2) : '[]';
    const pollution = data.pollution ? JSON.stringify(data.pollution, null, 2) : '{}';
    const selfCleansing = data.selfCleansing ? JSON.stringify(data.selfCleansing, null, 2) : 'null';
    const taskRoute = data.taskRoute || {};
    const taskLabel = taskRoute.label || taskRoute.task_type || '通用多源对比';
    const taskWorkflow = taskRoute.recommended_workflow || 'general_compare_workflow';
    const taskTemplate = taskRoute.recommended_template || 'general_compare_report';
    const highRisk = data.highRisk || {};
    const evidencePlan = data.evidencePlan || {};
    const evidencePack = data.evidencePack || {};
    const workflowRegistry = global.DuoliWorkflowRegistry;
    const workflow =
      workflowRegistry && typeof workflowRegistry.resolve === 'function' ? workflowRegistry.resolve(taskRoute) : null;
    const workflowReportAddon =
      workflow && typeof workflow.buildReportPromptAddon === 'function' ? workflow.buildReportPromptAddon({ taskRoute }) : '';

    const lines = [
      '# 角色与任务',
      '你是一名多模型事实审讯官、舆情情报分析师和证据链架构师。',
      '你的任务不是判断哪个模型更会写，而是围绕【用户原始问题】生成一份“滤镜·多源大模型内容对比分析”。',
      '报告必须像 Fact Black Box · 多模型事实黑匣子的输出：先给用户能采用的裁决，再展示证据链、差异追问、污染剔除和模型证人画像。',
      '',
      '# 硬约束',
      '1. 第一优先级：直接回答用户真正关心的问题；第二优先级：解释结论如何由多模型回答、差异追问和污染剔除推导出来；第三优先级：评价各模型表现。',
      '2. 只能基于本次输入材料分析；不能编造外部事实、不能伪造引用、不能假装做过搜索。',
      '3. 必须显式区分：强结论、弱结论、污染结论、待核验结论。',
      '4. 必须形成一个贯穿全文的“核心矛盾”，例如事实坐标不一致、时间边界漂移、因果链路失配、证据强度不足等。',
      '5. 所有量化指标必须给出 0-100 分或整数数量；若依据不足，用保守估算，但不可假装精确测量。',
      '6. 用户没有明确日期时，不得替用户补具体年份、月份、日期、起止时间或“最新/当前”等事实前提；只能要求各模型标注资料时效、可核验/待核验状态。用户给了明确日期时，严格使用用户日期。',
      '6.1 如果是消费选购或同系列机型对比，不能因为模型未附官网 URL、知识截止较早、或缺少发布会/开发者文档证据，就直接判定用户指定产品不存在；应把这类问题写成信息缺口，并继续围绕用户指定系列给出条件化对比和待核验项。',
      '7. 语言要像咨询公司 + 舆情情报室 + AI 实验室联合出品：极度精炼、专业、高信息密度，优先使用“结构化失配”“信息能见度赤字”“证据链收敛”“污染剔除”“模型证人”等术语。',
      '8. 写法必须是“裁决式”，不是“解释式”：优先短句、强判断、少铺垫。每个核心页面都要让老板 30 秒内知道有没有事件、要不要响应、下一步做什么。',
      highRisk && highRisk.highRisk
        ? `8.1 高风险边界：本题属于 ${highRisk.riskDomain || 'high_risk'}，允许模式为 ${highRisk.allowedMode || 'screening'}。严禁输出：${(highRisk.blockedClaims || []).join('、') || '越权承诺'}。必须写入边界提示：${(highRisk.requiredDisclaimers || []).join('；') || '仅作风险筛查'}。下一步建议必须包含：${highRisk.escalationAdvice || '补充权威材料后复核'}。`
        : '',
      '9. executive_conclusion.one_sentence 必须是可拍板句式，例如“当前仅存在 1 个闭环事实，其余主张全部降权/不可采信”。不要写成温和综述。',
      '10. user_issue_analysis.direct_answer 第一行必须直接回答用户真正问题。舆情题回答有没有舆情；事实题回答真假；消费选购题回答最值得买；技术题回答根因和第一步；创作题回答首选方案；医疗/金融题先给风险分层和审慎边界。',
      '11. dispute_map.items 每项必须能被压缩成三行：问题、裁决、原因；retained_judgment 写“裁决”，why_it_matters 写“原因”，避免论文式长段落。',
      `12. 系统已识别任务类型为“${taskLabel}”，推荐工作流为“${taskWorkflow}”，推荐报告模板为“${taskTemplate}”。报告结构必须优先服务这个场景。`,
      workflowReportAddon ? `13. 场景化报告规则：${workflowReportAddon}` : '',
    ];
    if (wasRefined) {
      lines.push(
        '14. 用户原始提问与系统补全后的下发问题不一致：必须说明补全是否影响了模型回答和最终判断。'
      );
    }
    lines.push(
      '',
      '# 输出格式',
      '先输出一份可读的专业报告正文，必须严格使用以下一级标题，标题单独占一行；标题下用短段落和项目符号展开。',
      ...HEADINGS,
      '',
      '# 每章写作要求',
      '战情驾驶舱：必须包含一句话裁决、可信度、结论状态、核心矛盾、最大不确定性、证据资产统计。',
      '问题补全与分析任务书：展示用户原始问题、实际下发问题、系统补全约束、模型需要产出的分析材料。',
      '事实脉络与证据地图：列出多模型确认事实、单模型未确认信息、冲突事实、污染事实。不得把待核验内容写成确定事实。',
      '争议焦点热力图：按事实差异、时间差异、口径差异、因果差异、推理差异、污染疑似分类。',
      '差异详情侦查台：逐个差异说明各模型说法、影响、追问结果、剔除污染后的保留判断。',
      '去伪存真证据漏斗：必须突出“原始 claim → 最终证据”的压缩，例如“38 → 5，86.8% 信息被剔除/降权”，这张图是主角。',
      '模型证人画像：评价每个模型在本题中的可信度，而不是泛泛排名。',
      '源头分析与最终裁决：给出污染剔除后的最终判断、仍需核验点和下一步行动。',
      '数据可视化组件规格：列出可信度仪表盘、事实时间轴、争议热力图、证据漏斗、模型雷达、风险矩阵等组件字段。',
      '',
      '# 结构化 JSON(必填,放在所有章节之后)',
      '在【数据可视化组件规格】之后，必须追加一个独立代码块，起止严格用 ```json 和 ```，内容为单个 JSON 对象。前端报告完全依赖这个 JSON 渲染，结构必须完整可解析。',
      'JSON 顶层字段必须包含：meta、executive_conclusion、scenario_decision、scenario_payload、question_brief、user_issue_analysis、fact_map、dispute_map、evidence_funnel、model_profiles、source_diagnosis、final_actions。',
      '其中 user_issue_analysis 为核心字段，必须用于直接回答用户问题；如果用户问舆论，就输出舆情温度、情绪结构、阵营/群体、主要叙事、风险矩阵；如果用户问消费选购，就把 sentiment_distribution 写成价值构成，把 stance_distribution 写成推荐梯队，把 audience_segments 写成购买人群坐标，把 risk_matrix 写成购买风险矩阵；如果不是舆论题，也要转写为该问题的结果研判、关键发现、风险矩阵。',
      'scenario_payload 必须按 task_type 填充可渲染数据：consumer_purchase 必须给候选产品表、价值权重、人群排序、首选/备选/不推荐、人工核验项；public_opinion 必须给舆论信号、已验证事件、主体/群体和风险触发器；technical_diagnosis 必须给症状、根因假设、修复方案和验证步骤。不要用空泛段落替代结构化表格。',
      '不要输出旧版模型评测字段，不要输出 scoreboard/core_tension/selection_quadrant/info_funnel/alignment_tax/fact_sankey。报告数据以事实黑匣子新结构为准。',
      '',
      'JSON schema：',
      '{',
      '  "meta": {"question_original":"用户原始问题","question_refined":"实际下发问题","generated_at":"ISO 时间或空字符串","models":["模型名"],"workflow_rounds":3,"task_type":"public_opinion | fact_check | competitor_analysis | consumer_purchase | investment_research | legal_risk | knowledge_brief | creative_content | technical_diagnosis | learning_research | travel_lifestyle | career_recruiting | medical_health | finance_planning | general_compare","task_label":"任务中文名","workflow":"推荐工作流","template":"推荐报告模板"},',
      '  "executive_conclusion": {"one_sentence":"直接回答用户问题","status":"strong | weak | disputed | insufficient","confidence_score":0,"confidence_label":"中高可信/待核验等","core_tension":"核心矛盾","largest_uncertainty":"最大不确定性","risk_level":"low | medium | high"},',
      '  "scenario_decision": {"task_type":"任务类型","task_label":"任务中文名","decision_object":"本次裁决对象","direct_verdict":"一句话场景裁决","recommended_action":"建议动作","evidence_standard":"本场景采信标准","do_not_overread":["不能误读/不能外推的点"],"decision_factors":[{"label":"关键因素","score":0,"note":"为什么重要"}],"next_questions":["还必须追问或核验的问题"]},',
      '  "scenario_payload": {"candidate_table":[{"brand":"品牌","model":"型号","version":"具体版本","official_price":"官方指导价或待核验","market_price":"终端参考价或待核验","energy_type":"燃油/混动/纯电等","powertrain":"动力总成","range":"续航/油耗/电耗","smart_driving":"智驾配置","safety_rating":"安全评级来源或待核验","availability":"在售/待核验","verification_status":"可核验/待核验","source_note":"核验口径"}],"value_weights":[{"label":"空间/能耗/安全/售后/智能/保值等","weight":0,"reason":"权重理由"}],"persona_rankings":[{"persona":"家庭通勤/年轻首购等","ranking":["候选1","候选2"],"reason":"排序理由"}],"recommendations":{"primary":{"name":"首选","reason":"为什么首选","verification_status":"可核验/待核验"},"alternatives":[{"name":"备选","reason":"理由"}],"not_recommended":[{"name":"不推荐项","reason":"硬伤"}]},"manual_verification_items":["需要人工核验的价格/配置/交付/补贴/质保项"]},',
      '  "question_brief": {"original":"原始问题","refined":"补全问题","constraints":["约束"],"analysis_goals":["目标"]},',
      '  "user_issue_analysis": {"direct_answer":"用 120-220 字直接回答用户到底想知道的结果","public_opinion_temperature":0,"temperature_label":"低热/中热/高热/爆发","dominant_sentiment":"主导情绪或主导判断","sentiment_distribution":[{"label":"正向/中性/负向/嘲讽/质疑等","value":0,"note":"依据"}],"stance_distribution":[{"label":"支持/观望/质疑/反感/路人等","value":0,"note":"依据"}],"audience_segments":[{"label":"粉丝/路人/媒体/平台用户等","heat":0,"credibility":0,"weight":0,"narrative":"该群体主要说法"}],"key_findings":["关键发现"],"narrative_summary":"主要舆论叙事如何形成","risk_matrix":[{"title":"风险标题","impact":0,"probability":0,"mitigation":"应对或核验动作"}],"blindspots":["盲区"]},',
      '  "fact_map": {"timeline":[{"id":"F1","time":"用户指定时间或未指定时间/待核验","event":"事实点","status":"confirmed | disputed | uncertain | polluted","sources":["模型名"],"note":"说明"}],"confirmed_facts":[],"uncertain_claims":[],"polluted_claims":[]},',
      '  "dispute_map": {"summary":"争议总览","items":[{"id":"D1","title":"差异标题","type":"事实差异 | 时间差异 | 口径差异 | 因果差异 | 推理差异 | 污染疑似","severity":"high | medium | low","why_it_matters":"影响","model_claims":[{"model":"模型名","claim":"说法","evidence_level":"强 | 中 | 弱","risk":"风险"}],"followup_question":"追问问题","followup_summary":"追问后合并","pollution_removed":["剔除项"],"retained_judgment":"保留判断"}]},',
      '  "evidence_funnel": {"raw_claims":0,"cross_checked":0,"followup_retained":0,"pollution_removed":0,"final_evidence":0},',
      '  "model_profiles": [{"model":"模型名","witness_type":"可靠证人/谨慎证人/发散证人/污染风险证人","strengths":["优势"],"risks":["风险"],"scores":{"fact_fidelity":0,"time_sensitivity":0,"logic_consistency":0,"information_density":0,"verifiability":0,"pollution_control":0,"followup_responsiveness":0}}],',
      '  "source_diagnosis": {"root_causes":["差异源头"],"pollution_factors":["污染因素"],"retained_judgment":"剔除污染后的判断"},',
      '  "final_actions": ["下一步行动"]',
      '}',
      '',
      '最终报告必须是单一情报产品，不要输出商业价值、ROI、产品宣传、融资叙事，也不要再生成第二套封面/执行摘要/结尾。',
      '正文结构必须服务同一个分析链路：用户问题 → 可验证事实 → 多模型差异 → 污染剔除 → 最终裁决 → 下一步核验行动。',
      '硬性 JSON 规则：严格 ASCII 双引号、不带尾逗号、不带注释、所有数值用整数；数组可为空但字段不能缺失。',
      '',
      '# 参与模型',
      modelNames || '未识别模型名称'
    );
    lines.push(
      '',
      '# 系统任务路由',
      `任务类型：${taskLabel}`,
      `推荐工作流：${taskWorkflow}`,
      `推荐报告模板：${taskTemplate}`,
      taskRoute.reason ? `识别理由：${taskRoute.reason}` : '',
      taskRoute.risk_note ? `风险提示：${taskRoute.risk_note}` : ''
    );
    if (evidencePlan && Array.isArray(evidencePlan.queries) && evidencePlan.queries.length) {
      lines.push(
        '',
        '# 待核验证据查询计划',
        '以下查询不是已完成搜索结果，只能作为报告中的“下一步核验动作”和“证据缺口”使用，不能当作已验证事实：',
        ...evidencePlan.queries.map((query) => `- ${query}`)
      );
    }
    if (evidencePack && Array.isArray(evidencePack.items) && evidencePack.items.length) {
      lines.push(
        '',
        '# 已检索候选证据',
        '以下内容来自配置的搜索/证据 API。仍需在报告中区分“候选证据”和“已验证事实”，不得把低可信结果直接写成强结论：',
        ...evidencePack.items.slice(0, 8).map((item, index) => {
          const title = item.title || `证据${index + 1}`;
          const source = item.source || item.url || 'unknown';
          const snippet = item.snippet || '';
          return `- ${title}｜${source}｜可信度 ${item.credibility || 0}｜${snippet}`;
        })
      );
    } else if (evidencePack && evidencePack.error) {
      lines.push('', '# 证据检索状态', `证据检索失败或未配置：${evidencePack.error}`);
    }
    if (wasRefined) {
      lines.push(
        '',
        '# 用户原始提问（未经补全）',
        originalQuestion,
        '',
        '# 实际下发问题（已由系统自动补全）',
        question
      );
    } else {
      lines.push('', '# 用户提问', question);
    }
    lines.push(
      '',
      '# 模型原始输出',
      formatReplies(modelReplies),
      '',
      '# 差异追问与二次合并结果',
      diffAnalyses,
      '',
      '# 污染剔除结果(千问初判)',
      pollution,
      '',
      '# AI 自我剔除污染结果(三家自审 + 千问归档)',
      '说明:三家 AI 已基于上面千问初判的污染清单做了自我裁定。下面是合并结果,其中 consensus_pollution 为三家都接受撤回的污染、contested_pollution 为仍有 AI 拒绝撤回的污染。',
      '在【全局摘要】【一】【四】各章中,凡涉及污染分析,优先采信 consensus_pollution;contested_pollution 必须显式标注"仍存在分歧"。',
      selfCleansing
    );
    return lines.join('\n');
  }

  global.DuoliEvaluationReportPrompt = {
    headings: HEADINGS.slice(),
    buildEvaluationReportPrompt,
  };
})(window);
