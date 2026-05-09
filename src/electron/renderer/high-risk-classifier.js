(function attachHighRiskClassifier(global) {
  const DOMAINS = {
    medical: ['血压', '体检', '症状', '用药', '药', '医院', '医生', '疾病', '治疗', '诊断', '发烧', '咳嗽'],
    legal: ['合同', '条款', '违法', '违规', '合规', '法律', '侵权', '责任', '诉讼', '律师', '仲裁'],
    finance: ['基金', '股票', '理财', '保险', '贷款', '房贷', '信用卡', '收益', '亏损', '买入', '卖出', '投资'],
    public_safety: ['爆炸', '武器', '危险品', '绕过', '破解', '攻击', '违法操作'],
    privacy: ['人肉', '身份证', '手机号', '定位', '隐私', '查询个人', '开房记录'],
  };

  function classifyHighRisk(question, taskType) {
    const text = String(question || '').toLowerCase();
    const explicitTask = String(taskType || '');
    const taskDomain =
      explicitTask === 'medical_health'
        ? 'medical'
        : explicitTask === 'legal_risk'
          ? 'legal'
          : explicitTask === 'finance_planning'
            ? 'finance'
            : '';
    if (taskDomain) {
      return buildResult(taskDomain, [`task_type:${explicitTask}`]);
    }
    for (const [domain, keywords] of Object.entries(DOMAINS)) {
      const hits = keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
      if (hits.length) return buildResult(domain, hits);
    }
    return {
      highRisk: false,
      riskDomain: '',
      allowedMode: 'analysis',
      matched: [],
      blockedClaims: [],
      requiredDisclaimers: [],
      escalationAdvice: '',
    };
  }

  function buildResult(domain, matched) {
    const policy = {
      medical: {
        mode: 'screening',
        blocked: ['确定诊断', '具体用药剂量', '替代医生判断'],
        disclaimer: '仅作健康风险初筛，不替代医生诊断、检查和治疗。',
        escalation: '如有明显不适、指标持续异常或危险信号，请及时就医。',
      },
      legal: {
        mode: 'risk_review',
        blocked: ['胜诉承诺', '定罪结论', '替代律师意见'],
        disclaimer: '仅作法律风险初筛，不构成正式法律意见。',
        escalation: '涉及签约、诉讼或重大损失时，请交由律师复核。',
      },
      finance: {
        mode: 'risk_planning',
        blocked: ['收益承诺', '确定买卖建议', '替代持牌投顾'],
        disclaimer: '仅作金融信息分析，不构成个性化投资建议。',
        escalation: '投资前应结合风险测评、期限、现金流和专业意见。',
      },
      public_safety: {
        mode: 'safe_redirection',
        blocked: ['危险操作步骤', '违法规避方法'],
        disclaimer: '不提供危险或违法操作指导。',
        escalation: '如涉及现实安全风险，请联系专业机构或平台处理。',
      },
      privacy: {
        mode: 'privacy_protection',
        blocked: ['未授权个人信息查询', '身份定位', '人肉搜索'],
        disclaimer: '不协助侵犯隐私或未授权查询个人信息。',
        escalation: '请使用合法授权渠道处理身份或隐私相关事项。',
      },
    }[domain];

    return {
      highRisk: true,
      riskDomain: domain,
      allowedMode: policy.mode,
      matched,
      blockedClaims: policy.blocked,
      requiredDisclaimers: [policy.disclaimer],
      escalationAdvice: policy.escalation,
    };
  }

  const api = {
    DOMAINS,
    classifyHighRisk,
  };

  global.DuoliHighRiskClassifier = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
