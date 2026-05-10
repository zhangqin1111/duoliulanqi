(function attachScenarioActionContracts(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DuoliScenarioActionContracts = api;
})(typeof window !== 'undefined' ? window : globalThis, function buildScenarioActionContracts() {
  'use strict';

  const UNIVERSAL_KEYS = ['action_brief', 'decision_ladder', 'action_rules', 'red_flags', 'verification_checklist'];

  const CONTRACTS = {
    public_opinion: {
      label: '舆情/声誉决策',
      decision: '是否有真实舆情、热度多高、是否需要响应、响应级别是什么',
      ladder: ['是否形成事件', '传播热度', '情绪阵营', '响应动作'],
      rules: ['有官方/原始传播源再升级响应', '只有 AI 交叉分析时必须标注待外部核验'],
      redFlags: ['把旧闻当新增舆情', '把粉黑情绪当事实', '没有平台热度却给强响应建议'],
    },
    fact_check: {
      label: '事实核验',
      decision: '哪些主张可采信、哪些必须剔除、哪些还要核验',
      ladder: ['主张拆解', '证据等级', '反证路径', '采信裁决'],
      rules: ['没有来源的结论只能作为线索', '必须说明会改变结论的证据'],
      redFlags: ['模型共识替代事实证据', '时间/主体/地点缺失仍强判真假'],
    },
    consumer_purchase: {
      label: '消费选购/价格评估',
      decision: '买不买、买哪款、合理价是多少、超过多少偏贵、低于多少要警惕',
      ladder: ['合理价区间', '砍价目标', '偏贵线', '低价风险线'],
      rules: ['先给用户可用价格锚点，再解释配置和风险', '所有价格必须标注可核验/待核验'],
      redFlags: ['只列参数不告诉用户怎么出价', '没有版本/里程/车况分层', '用过期年份限定用户问题'],
      extraKeys: ['price_ladder', 'offer_strategy'],
    },
    competitor_analysis: {
      label: '竞品/方案选型',
      decision: '当前场景选谁、为什么、什么条件下换选项',
      ladder: ['首选方案', '备选方案', '不适用边界', '切换条件'],
      rules: ['不要只给总分，必须给场景化赢家', '必须列出迁移成本或隐性成本'],
      redFlags: ['功能罗列替代选型', '忽略预算/团队/生态约束'],
    },
    investment_research: {
      label: '投资研究',
      decision: '可观察什么、风险在哪里、哪些指标验证后才行动',
      ladder: ['利好链路', '利空链路', '验证指标', '行动边界'],
      rules: ['不给个性化买卖指令', '必须把假设、触发条件和风险写清'],
      redFlags: ['承诺收益', '忽略估值/流动性/政策不确定性'],
    },
    legal_risk: {
      label: '法律风险初筛',
      decision: '风险等级、证据缺口、下一步该准备什么材料',
      ladder: ['争议事实', '证据强度', '责任风险', '律师问题'],
      rules: ['不替代律师意见', '必须给证据清单和管辖/时效待核验项'],
      redFlags: ['直接判断胜诉', '缺合同/证据原件仍下结论'],
    },
    medical_health: {
      label: '医疗健康分诊',
      decision: '风险分层、是否需要就医、哪些危险信号必须立即处理',
      ladder: ['急重信号', '可能方向', '就医级别', '需补充信息'],
      rules: ['不诊断、不处方、不替代医生', '必须明确危险信号和就医边界'],
      redFlags: ['给药物剂量', '用安慰替代分诊', '缺年龄/症状时长仍强判断'],
    },
    finance_planning: {
      label: '财务规划初筛',
      decision: '风险画像、资金期限、可选方案和不可做动作',
      ladder: ['资金期限', '风险承受', '配置方向', '禁止动作'],
      rules: ['不给个性化投资承诺', '必须先保护流动性和风险边界'],
      redFlags: ['承诺收益', '忽略负债/现金流/税费'],
    },
    technical_diagnosis: {
      label: '技术诊断',
      decision: '最可能根因、第一步修复、验证命令和回滚方案',
      ladder: ['复现证据', '根因排序', '第一步修复', '验证/回滚'],
      rules: ['先验证再改代码', '必须给最小可执行检查步骤'],
      redFlags: ['无日志直接重构', '没有回滚方案'],
    },
    travel_lifestyle: {
      label: '旅行/本地生活',
      decision: '最佳路线/方案、预算、备选和出发前核验项',
      ladder: ['首选路线', '预算拆分', '备选方案', '实时核验'],
      rules: ['实时营业/天气/交通必须待核验', '按人群和预算给方案'],
      redFlags: ['过期营业信息', '忽略交通和预约'],
    },
    career_recruiting: {
      label: '职业/招聘',
      decision: '岗位匹配度、简历怎么改、面试怎么准备',
      ladder: ['岗位要求', '匹配证据', '短板补齐', '投递动作'],
      rules: ['基于真实经历增强表达', '不要虚构履历'],
      redFlags: ['夸大经历', '只给鸡汤不给修改动作'],
    },
    creative_content: {
      label: '内容创作',
      decision: '首选创意方向、可交付版本、A/B 测试和风险词',
      ladder: ['目标受众', '首选方案', '备选方案', '发布动作'],
      rules: ['必须给可直接使用的交付物', '必须指出平台/品牌风险'],
      redFlags: ['只讲方向不给成稿', '忽略版权和敏感表达'],
    },
    knowledge_brief: {
      label: '知识简报',
      decision: '核心答案、适用边界、误区和继续学习路径',
      ladder: ['核心定义', '关键结论', '误区排除', '延伸路径'],
      rules: ['先讲人话，再给结构', '必须区分共识和开放问题'],
      redFlags: ['概念堆砌', '没有适用边界'],
    },
    learning_research: {
      label: '学习/研究',
      decision: '学习路径、资料优先级、里程碑和练习方式',
      ladder: ['阶段目标', '资料路径', '练习任务', '验收标准'],
      rules: ['必须有阶段产出', '资料不能替代路径'],
      redFlags: ['只列资料不安排练习', '忽略用户基础'],
    },
    general_compare: {
      label: '通用决策',
      decision: '选什么、为什么、什么条件下改变结论',
      ladder: ['候选对象', '关键权重', '推荐结论', '改变条件'],
      rules: ['先回答用户问题', '必须给下一步动作'],
      redFlags: ['泛泛分析', '没有明确结论或条件'],
    },
  };

  function text(value, fallback) {
    const s = String(value == null ? '' : value).trim();
    return s || fallback || '';
  }

  function array(value) {
    return Array.isArray(value) ? value : [];
  }

  function isEmpty(value) {
    if (value == null) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return String(value).trim() === '';
  }

  function taskTypeOf(reportOrTaskType) {
    if (typeof reportOrTaskType === 'string') return reportOrTaskType || 'general_compare';
    const report = reportOrTaskType || {};
    return text(
      (report.meta && report.meta.task_type) ||
        (report.scenario_decision && report.scenario_decision.task_type) ||
        'general_compare'
    );
  }

  function getActionContract(taskType) {
    return CONTRACTS[taskType] || CONTRACTS.general_compare;
  }

  function questionOf(report, explicitQuestion) {
    if (explicitQuestion) return text(explicitQuestion);
    const meta = (report && report.meta) || {};
    const brief = (report && report.question_brief) || {};
    return text(meta.question_original || brief.original || meta.question_refined || brief.refined || '');
  }

  function defaultActionBrief(report, taskType, question) {
    const contract = getActionContract(taskType);
    const decision = (report && report.scenario_decision) || {};
    const issue = (report && report.user_issue_analysis) || {};
    const conclusion = (report && report.executive_conclusion) || {};
    return {
      answer: text(issue.direct_answer || decision.direct_verdict || conclusion.one_sentence, `围绕“${question || '用户问题'}”给出场景化决策。`),
      decision: text(decision.direct_verdict || conclusion.one_sentence, contract.decision),
      recommended_next_step: text(decision.recommended_action, '先按本页核验清单补齐关键事实，再执行最终决策。'),
      confidence_basis: text(conclusion.confidence_label || decision.evidence_standard, '基于多模型交叉分析，关键事实仍需按清单核验。'),
      user_value: contract.decision,
    };
  }

  function defaultDecisionLadder(report, taskType) {
    const contract = getActionContract(taskType);
    const factors = array(report && report.scenario_decision && report.scenario_decision.decision_factors);
    if (factors.length) {
      return factors.slice(0, 4).map((factor, index) => ({
        step: contract.ladder[index] || text(factor.label, `决策点 ${index + 1}`),
        conclusion: text(factor.note || factor.reason || factor.label, '待核验'),
        action: index === 0 ? '先核验该项，再进入下一步判断。' : '作为权重进入最终排序。',
        verification_status: text(factor.verification_status, '待核验'),
      }));
    }
    return contract.ladder.map((step, index) => ({
      step,
      conclusion: index === 0 ? contract.decision : '待多模型材料与外部来源继续核验',
      action: index === contract.ladder.length - 1 ? '输出可执行动作。' : '补齐该决策点的证据。',
      verification_status: '待核验',
    }));
  }

  function defaultActionRules(taskType) {
    return getActionContract(taskType).rules.map((rule) => ({ rule, action: '报告中必须显式执行' }));
  }

  function defaultRedFlags(taskType) {
    return getActionContract(taskType).redFlags.map((flag) => ({ flag, mitigation: '发现后降权或标注待核验' }));
  }

  function defaultChecklist(taskType) {
    const common = ['原始来源/官方口径', '时间边界', '主体与版本', '关键数字与口径'];
    const extra = {
      consumer_purchase: ['版本/里程/车况', '终端成交价', '库存/交付/售后', '事故/质保/补贴'],
      public_opinion: ['原始传播源', '平台热度曲线', '官方/当事方回应', '媒体报道与账号可信度'],
      legal_risk: ['合同/协议全文', '证据原件', '管辖地与时效', '律师复核问题'],
      medical_health: ['年龄/基础病', '症状持续时间', '检查结果', '急重危险信号'],
      technical_diagnosis: ['日志', '版本/环境', '复现步骤', '回滚方案'],
      finance_planning: ['现金流', '负债', '期限', '风险承受能力'],
    };
    return [...common, ...(extra[taskType] || [])].map((item) => ({ item, status: '待核验' }));
  }

  function deriveConsumerPriceLadder(report) {
    const payload = (report && report.scenario_payload) || {};
    const rows = array(payload.candidate_table).slice(0, 8);
    if (array(payload.price_ladder).length) return payload.price_ladder;
    if (!rows.length) {
      return [
        {
          item: '待核验候选',
          reasonable_range: '待核验',
          bargain_target: '待核验',
          overpriced_line: '待核验',
          low_price_risk_line: '待核验',
          note: '缺少候选与价格材料，不能给具体价格锚点。',
        },
      ];
    }
    return rows.map((item) => {
      const name = [item.brand, item.model, item.version || item.name].filter(Boolean).join(' ') || text(item.name, '候选产品');
      const range = text(item.market_price || item.transaction_price || item.reference_price, '待核验');
      return {
        item: name,
        reasonable_range: range,
        bargain_target: text(item.bargain_target, range === '待核验' ? '待核验' : '以合理区间下沿或车况缺陷折价为砍价目标'),
        overpriced_line: text(item.overpriced_line, range === '待核验' ? '待核验' : '高于合理区间上沿且无车况/配置优势时偏贵'),
        low_price_risk_line: text(item.low_price_risk_line, range === '待核验' ? '待核验' : '显著低于合理区间下沿需重点排查事故、调表、质押、泡水和手续风险'),
        verification_status: text(item.verification_status || item.status, '待核验'),
        note: text(item.source_note || item.note, '价格需结合地区、车况、里程、配置和成交时间复核。'),
      };
    });
  }

  function ensureActionablePayload(report, options) {
    const data = report && typeof report === 'object' ? report : {};
    const taskType = taskTypeOf(options && options.taskType ? options.taskType : data);
    const question = questionOf(data, options && options.question);
    data.scenario_payload = data.scenario_payload && typeof data.scenario_payload === 'object' ? data.scenario_payload : {};
    const payload = data.scenario_payload;
    if (isEmpty(payload.action_brief)) payload.action_brief = defaultActionBrief(data, taskType, question);
    if (isEmpty(payload.decision_ladder)) payload.decision_ladder = defaultDecisionLadder(data, taskType);
    if (isEmpty(payload.action_rules)) payload.action_rules = defaultActionRules(taskType);
    if (isEmpty(payload.red_flags)) payload.red_flags = defaultRedFlags(taskType);
    if (isEmpty(payload.verification_checklist)) payload.verification_checklist = defaultChecklist(taskType);
    if (taskType === 'consumer_purchase') {
      if (isEmpty(payload.price_ladder)) payload.price_ladder = deriveConsumerPriceLadder(data);
      if (isEmpty(payload.offer_strategy)) {
        payload.offer_strategy = {
          fair_price_rule: '先看同年款/同配置/同里程成交区间，再按车况、过户、事故、质保和地区库存修正。',
          bargain_rule: '报价在合理区间内才进入议价；高于偏贵线直接要求降价或换车源。',
          walkaway_rule: '低于风险线且无法解释原因时，不因便宜直接下定。',
        };
      }
    }
    return data;
  }

  function buildActionPromptAddon(taskType) {
    const contract = getActionContract(taskType);
    const extra = contract.extraKeys && contract.extraKeys.length ? `；额外必须包含 ${contract.extraKeys.join('、')}` : '';
    return [
      `场景可执行答案合约：本任务是「${contract.label}」，报告必须先解决「${contract.decision}」。`,
      `scenario_payload 必须额外包含通用字段：${UNIVERSAL_KEYS.join('、')}${extra}。`,
      `decision_ladder 必须覆盖：${contract.ladder.join(' → ')}。`,
      `action_rules 必须体现：${contract.rules.join('；')}。`,
      `red_flags 必须防止：${contract.redFlags.join('；')}。`,
      '补全可以补用户没想到的评估维度，但不得擅自写死年份、价格、型号、政策、结论；事实由多模型回答和证据链给出。',
      '如果材料不足，也必须给“如何判断/如何出价/如何核验/何时放弃”的结构化动作，不能只说材料不足。',
    ].join('\n');
  }

  return {
    ACTION_CONTRACTS: CONTRACTS,
    UNIVERSAL_KEYS,
    buildActionPromptAddon,
    ensureActionablePayload,
    getActionContract,
    isEmpty,
    taskTypeOf,
  };
});
