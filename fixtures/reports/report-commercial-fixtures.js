const { defaultScenarioPayload } = require('./scenario-payload-fixtures');

function createStructuredFixture(taskType, question, verdict, action) {
  return {
    meta: {
      task_type: taskType,
      question_original: question,
      models: ['Kimi', 'Doubao', 'Yuanbao'],
    },
    executive_conclusion: {
      one_sentence: verdict,
      confidence_score: 72,
      risk_level: ['legal_risk', 'medical_health', 'finance_planning'].includes(taskType) ? 'high' : 'medium',
    },
    question_brief: {
      original: question,
      refined: `围绕“${question}”补全判断口径、证据标准、差异来源和下一步动作。`,
    },
    scenario_decision: {
      task_type: taskType,
      decision_object: question,
      direct_verdict: verdict,
      recommended_action: action,
      decision_factors: [
        { label: '可信度', score: 76 },
        { label: '可执行性', score: 72 },
        { label: '风险边界', score: 68 },
      ],
    },
    scenario_payload: defaultScenarioPayload(taskType),
    user_issue_analysis: {
      direct_answer: verdict,
      key_findings: ['先确认事实边界', '再比较多模型差异', '最后给出可执行动作'],
    },
    evidence_funnel: {
      raw_claims: 18,
      cross_checked_claims: 10,
      retained_claims: 6,
      final_evidence: 4,
    },
    dispute_map: {
      items: [
        {
          title: '模型结论口径不一致',
          type: '判断差异',
          severity: 'medium',
          retained_judgment: '以可验证证据和用户真实决策目标为准。',
        },
      ],
    },
    final_actions: ['补齐关键事实', '核对高置信来源', action],
  };
}

function createCommercialReportFixtures() {
  const cases = [
    ['consumer-car-150k', 'consumer_purchase', '推荐15万左右性价比高的车', '15万预算应先按家用/通勤/新能源偏好建立候选池，优先推荐价格稳定、空间安全均衡、售后成熟的车型。', '按落地价、家庭人数、通勤里程、油电偏好和保值需求输出首选/备选/慎选清单。'],
    ['fact-check-news', 'fact_check', '网传某公司大规模裁员是真的吗', '当前不能直接采信，需要核验原始信源与权威公告。', '先核验发布主体、时间线和交叉来源。'],
    ['competitor-saas', 'competitor_analysis', '飞书和钉钉企业协作能力怎么选', '两者不是单纯谁更好，而是组织规模、集成生态和管理方式不同。', '按组织规模、IT生态和协作深度建立选型矩阵。'],
    ['investment-policy', 'investment_research', '机器人产业链政策影响是利好还是利空', '短期偏主题催化，长期取决于订单兑现和产业链利润分配。', '拆分上游零部件、本体、集成和应用端逐项跟踪。'],
    ['knowledge-rag', 'knowledge_brief', '什么是RAG，为什么大模型需要它', 'RAG本质是用外部知识检索降低幻觉，并增强答案可追溯性。', '用检索、重排、生成、引用四段式理解。'],
    ['creative-xiaohongshu', 'creative_content', '帮我写一组小红书种草文案', '内容重点不是堆卖点，而是场景痛点、真实体验和行动钩子。', '输出标题池、正文结构和可测试版本。'],
    ['learning-paper-review', 'learning_research', '帮我做一篇论文综述', '综述要先建立研究谱系，再定位争议、方法和证据缺口。', '按主题聚类、时间线和方法差异组织材料。'],
    ['travel-shanghai-weekend', 'travel_lifestyle', '上海周末两天怎么玩', '最优路线应减少跨城折返，把餐饮、交通和体验密度合并规划。', '按区域连续性安排路线和备选方案。'],
    ['career-resume', 'career_recruiting', '帮我优化简历并准备面试问题', '简历优化核心是岗位匹配度，不是简单润色措辞。', '先拆JD关键词，再重写项目成果和面试证据。'],
    ['general-open-analysis', 'general_compare', '帮我分析一下这个事情', '问题信息不足时应先做通用多源对比，并提示需要补充的关键变量。', '先生成问题补全清单，再进入多模型对比。'],
  ];
  return cases.map(([id, taskType, question, verdict, action]) => ({
    id,
    taskType,
    question,
    structured: createStructuredFixture(taskType, question, verdict, action),
  }));
}

module.exports = {
  createCommercialReportFixtures,
};
