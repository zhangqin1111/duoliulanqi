'use strict';

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value == null ? '' : value).trim();
}

const GENERIC_TEXT_RE =
  /未形成稳定主导情绪|舆论叙事链|缺少外部一手来源与平台热度数据|当前仅能给出阶段性判断|阶段性判断/;

const DEFAULTS = {
  public_opinion: {
    primary: '以可验证事件与传播热度为主导',
    narrative: '本页优先判断是否形成真实舆情事件，再拆分情绪、阵营、传播路径与风险边界。',
    findings: ['先确认事件是否成立', '再判断传播规模与情绪聚集', '最后给出响应动作'],
    blindspots: ['缺少平台热度、原始视频、官方回应或一手信源时，传播强度只能降级判断'],
    barsA: ['负面情绪', '中性讨论', '正面支持', '待核验噪音'],
    barsB: ['核心事实', '争议表述', '推测信息', '污染信息'],
    audiences: ['核心关注者', '泛讨论人群', '媒体转述者', '低可信噪音'],
    risks: ['情绪放大', '断章取义', '主体错配', '二次传播'],
  },
  consumer_purchase: {
    primary: '以预算、真实需求和候选方案为主导',
    narrative: '本页优先输出首选、备选、慎选与适合人群；事实核验只用于约束价格、配置和上市状态的可信边界。',
    findings: ['先锁定预算与使用场景', '给出首选/备选/慎选梯队', '标注价格、库存、版本和促销的待核验项'],
    blindspots: ['缺少落地价、地区库存、优惠政策、个人用车/使用场景和真实体验权重'],
    barsA: ['价格价值', '核心配置', '使用寿命', '售后保值'],
    barsB: ['首选方案', '备选方案', '特定人群适合', '慎选/不推荐'],
    audiences: ['预算敏感', '均衡家用', '性能/影像敏感', '长期持有'],
    risks: ['实时价格偏差', '配置传闻', '渠道库存差异', '过度追高'],
  },
  technical_diagnosis: {
    primary: '以可复现根因和第一步修复为主导',
    narrative: '本页优先给出最可能根因、验证步骤、第一步修复动作和回滚边界。',
    findings: ['先复现问题', '按日志/版本/环境拆根因', '给出第一步修复与验证口径'],
    blindspots: ['缺少日志、版本号、复现步骤、环境差异和最近变更记录'],
    barsA: ['复现证据', '环境因素', '代码路径', '配置依赖'],
    barsB: ['立即修复', '验证动作', '回滚方案', '待补材料'],
    audiences: ['研发', '测试', '运维', '产品负责人'],
    risks: ['误判根因', '修复扩大影响', '缺少回滚', '环境不可复现'],
  },
  competitor_analysis: {
    primary: '以目标场景、差异化能力和替代成本为主导',
    narrative: '本页优先判断不同方案适合谁、赢在哪里、输在哪里，以及选择成本。',
    findings: ['拆目标客户与使用场景', '比较能力、价格、生态和迁移成本', '输出选型建议'],
    blindspots: ['缺少价格合同、真实客户反馈、迁移成本和长期服务能力数据'],
    barsA: ['能力覆盖', '成本效率', '生态协同', '迁移难度'],
    barsB: ['领先项', '持平项', '短板项', '待验证项'],
    audiences: ['小团队', '中型组织', '大型企业', '高定制客户'],
    risks: ['营销话术污染', '样本偏差', '隐藏成本', '迁移阻力'],
  },
  creative_content: {
    primary: '以受众、渠道和转化目标为主导',
    narrative: '本页优先输出可用创意方向、内容结构、可测试版本和风险边界。',
    findings: ['确认目标受众', '拆卖点与内容钩子', '给出可测试版本'],
    blindspots: ['缺少产品卖点、渠道规范、目标受众画像和转化指标'],
    barsA: ['吸引力', '可信度', '传播性', '转化力'],
    barsB: ['标题方向', '正文结构', '行动钩子', '风险表达'],
    audiences: ['新客', '老客', '兴趣用户', '高意向用户'],
    risks: ['夸大宣传', '同质化', '人群错配', '平台规则风险'],
  },
  legal_risk: {
    primary: '以法律风险、证据缺口和行动边界为主导',
    narrative: '本页只做风险识别和材料准备建议，不替代律师意见。',
    findings: ['先识别风险点', '再列证据缺口', '最后给出可执行材料清单'],
    blindspots: ['缺少管辖地、合同全文、交易背景、证据原件和当事人身份信息'],
    barsA: ['证据完整度', '责任边界', '时效风险', '执行难度'],
    barsB: ['高风险', '中风险', '低风险', '需律师确认'],
    audiences: ['当事人', '法务', '律师', '管理层'],
    risks: ['事实缺口', '地域法差异', '时效误判', '过度行动'],
  },
  medical_health: {
    primary: '以风险分层、就医边界和安全建议为主导',
    narrative: '本页只做健康信息整理与就医建议，不构成诊断或治疗方案。',
    findings: ['先判断急重风险', '再整理症状与时间线', '最后给出就医/观察边界'],
    blindspots: ['缺少年龄、基础病、症状持续时间、检查结果和用药史'],
    barsA: ['急重风险', '症状一致性', '检查需求', '自我观察'],
    barsB: ['立即就医', '尽快问诊', '持续观察', '生活调整'],
    audiences: ['本人', '家属', '医生沟通', '健康管理'],
    risks: ['延误就医', '自行用药', '症状遗漏', '错误安慰'],
  },
  finance_planning: {
    primary: '以风险承受能力、现金流和期限为主导',
    narrative: '本页只做规划框架与风险提示，不构成个性化投资建议。',
    findings: ['先确认资金期限', '再匹配风险承受能力', '最后列再平衡动作'],
    blindspots: ['缺少收入、负债、现金流、风险偏好和投资期限'],
    barsA: ['安全垫', '收益预期', '波动承受', '流动性'],
    barsB: ['保守方案', '均衡方案', '进取方案', '不建议动作'],
    audiences: ['短期资金', '长期资金', '家庭账户', '高波动账户'],
    risks: ['流动性错配', '过度集中', '高估收益', '忽略税费'],
  },
  travel_lifestyle: {
    primary: '以路线连续性、预算和实时可行性为主导',
    narrative: '本页优先输出路线、时间、预算、替代方案和实时核验项。',
    findings: ['先确定出行人数和预算', '按区域连续性规划路线', '标注天气、营业、交通待核验'],
    blindspots: ['缺少出发地、预算、人数、偏好、天气和实时营业信息'],
    barsA: ['时间效率', '体验密度', '预算友好', '交通便利'],
    barsB: ['首选路线', '备选路线', '雨天方案', '避坑项'],
    audiences: ['亲子', '情侣', '朋友', '独行'],
    risks: ['营业变化', '交通拥堵', '天气影响', '预算超支'],
  },
  career_recruiting: {
    primary: '以岗位匹配、证据表达和面试转化为主导',
    narrative: '本页优先输出简历改写方向、岗位匹配证据和面试准备动作。',
    findings: ['先拆岗位关键词', '再重写项目证据', '最后准备面试问题'],
    blindspots: ['缺少目标岗位、JD、项目数据、成果指标和行业背景'],
    barsA: ['岗位匹配', '成果量化', '表达清晰', '面试准备'],
    barsB: ['必须强化', '可以保留', '需要删除', '待补材料'],
    audiences: ['候选人', '招聘方', '面试官', '内推人'],
    risks: ['经历夸大', '岗位错配', '指标缺失', '表达空泛'],
  },
  investment_research: {
    primary: '以传导路径、验证指标和风险观测为主导',
    narrative: '本页优先拆政策/产业/公司传导链，不直接替代投资建议。',
    findings: ['先拆产业链位置', '再找验证指标', '最后给出风险监控表'],
    blindspots: ['缺少财务数据、订单验证、估值口径、政策原文和时间窗口'],
    barsA: ['政策力度', '订单兑现', '利润传导', '估值压力'],
    barsB: ['利好链路', '利空链路', '中性因素', '待验证项'],
    audiences: ['产业研究', '投资者', '风控', '管理层'],
    risks: ['主题过热', '订单不兑现', '估值回撤', '政策误读'],
  },
  general_compare: {
    primary: '以用户目标、关键变量和下一步行动为主导',
    narrative: '本页优先把模糊问题拆成可判断变量，再给出可执行的下一步。',
    findings: ['先补全目标', '再比较关键变量', '最后输出行动建议'],
    blindspots: ['缺少目标、约束、时间范围、预算或成功标准'],
    barsA: ['信息充分度', '执行价值', '风险边界', '可验证性'],
    barsB: ['明确结论', '条件结论', '待补材料', '不采信信息'],
    audiences: ['决策者', '执行者', '复核者', '旁观者'],
    risks: ['问题过宽', '证据不足', '目标漂移', '行动不可落地'],
  },
};

DEFAULTS.fact_check = {
  ...DEFAULTS.public_opinion,
  primary: '以主张可采信度和证据闭环为主导',
  narrative: '本页优先判断主张是否成立、哪些证据可保留、哪些污染信息必须剔除。',
};
DEFAULTS.knowledge_brief = {
  ...DEFAULTS.general_compare,
  primary: '以概念边界、误读排除和可迁移理解为主导',
  narrative: '本页优先解释概念本质、适用边界、常见误区和下一步学习路径。',
};
DEFAULTS.learning_research = {
  ...DEFAULTS.knowledge_brief,
  primary: '以研究谱系、争议边界和材料组织为主导',
};

function taskTypeOf(report) {
  return text(
    (report.meta && report.meta.task_type) ||
      (report.scenario_decision && report.scenario_decision.task_type) ||
      'general_compare'
  );
}

function isGeneric(value) {
  const s = text(value);
  return !s || GENERIC_TEXT_RE.test(s);
}

function scoreOf(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(8, Math.min(96, Math.round(n)));
}

function factorBars(factors, labels) {
  const mapped = array(factors)
    .filter((item) => item && text(item.label))
    .slice(0, 4)
    .map((item, idx) => ({
      label: text(item.label),
      value: scoreOf(item.score || item.value, 82 - idx * 7),
      note: text(item.note || item.reason || ''),
    }));
  if (mapped.length >= 3) return mapped;
  return labels.slice(0, 4).map((label, idx) => ({ label, value: 86 - idx * 8 }));
}

function barItems(labels) {
  return labels.slice(0, 4).map((label, idx) => ({ label, value: 86 - idx * 9 }));
}

function axisItems(labels) {
  return labels.slice(0, 4).map((label, idx) => ({
    label,
    heat: [42, 56, 68, 78][idx] || 50,
    credibility: [72, 64, 58, 48][idx] || 60,
    weight: [72, 66, 58, 48][idx] || 55,
  }));
}

function riskItems(labels) {
  return labels.slice(0, 4).map((label, idx) => ({
    title: label,
    impact: [72, 62, 58, 50][idx] || 55,
    probability: [58, 52, 46, 38][idx] || 45,
    mitigation: '先核验关键材料，再进入最终决策。',
  }));
}

function enrichReportOutcome(report) {
  const data = clone(report);
  const taskType = taskTypeOf(data);
  const profile = DEFAULTS[taskType] || DEFAULTS.general_compare;
  const issue = data.user_issue_analysis || {};
  const decision = data.scenario_decision || {};
  const conclusion = data.executive_conclusion || {};
  const direct = text(decision.direct_verdict) || text(conclusion.one_sentence) || profile.primary;

  if (isGeneric(issue.direct_answer)) issue.direct_answer = direct;
  if (isGeneric(issue.dominant_sentiment)) issue.dominant_sentiment = profile.primary;
  if (isGeneric(issue.narrative_summary)) issue.narrative_summary = text(decision.recommended_action) || profile.narrative;
  if (!array(issue.key_findings).length) issue.key_findings = profile.findings;
  if (!array(issue.blindspots).length || array(issue.blindspots).some(isGeneric)) issue.blindspots = profile.blindspots;
  if (!array(issue.sentiment_distribution).length) {
    issue.sentiment_distribution = factorBars(decision.decision_factors, profile.barsA);
  }
  if (!array(issue.stance_distribution).length) issue.stance_distribution = barItems(profile.barsB);
  if (!array(issue.audience_segments).length) issue.audience_segments = axisItems(profile.audiences);
  if (!array(issue.risk_matrix).length) issue.risk_matrix = riskItems(profile.risks);
  if (!issue.temperature_label) issue.temperature_label = taskType === 'public_opinion' ? '舆情热度' : '决策强度';
  if (!Number.isFinite(Number(issue.public_opinion_temperature))) {
    issue.public_opinion_temperature = scoreOf(conclusion.confidence_score, 72);
  }

  data.user_issue_analysis = issue;
  return data;
}

module.exports = {
  enrichReportOutcome,
};
