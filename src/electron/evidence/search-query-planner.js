'use strict';

function compact(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function createSearchQueryPlan(question, taskType) {
  const q = compact(question);
  const type = String(taskType || 'general_compare');
  const queries = [];
  if (!q) return { taskType: type, queries };

  if (type === 'consumer_purchase') {
    queries.push(`${q} 官方 价格 参数`);
    queries.push(`${q} 评测 对比 缺点`);
    queries.push(`${q} 值得买 版本 选购建议`);
  } else if (type === 'public_opinion') {
    queries.push(`${q} 最新 舆情 热搜`);
    queries.push(`${q} 官方回应 媒体报道`);
    queries.push(`${q} 社交平台 讨论`);
  } else if (type === 'fact_check') {
    queries.push(`${q} 官方 辟谣`);
    queries.push(`${q} 原始来源`);
    queries.push(`${q} 权威媒体 核验`);
  } else if (type === 'investment_research') {
    queries.push(`${q} 政策 原文 影响`);
    queries.push(`${q} 行业 数据 报告`);
    queries.push(`${q} 公司公告 财报`);
  } else if (type === 'legal_risk') {
    queries.push(`${q} 法规 原文`);
    queries.push(`${q} 司法解释 合规风险`);
  } else if (type === 'medical_health') {
    queries.push(`${q} 指南 共识 权威机构`);
    queries.push(`${q} 风险 分级 就医建议`);
  } else if (type === 'finance_planning') {
    queries.push(`${q} 官方披露 风险等级`);
    queries.push(`${q} 费用 收益 历史表现`);
  } else {
    queries.push(`${q} 官方 来源`);
    queries.push(`${q} 最新 信息`);
  }

  return {
    taskType: type,
    queries: Array.from(new Set(queries)),
  };
}

module.exports = {
  createSearchQueryPlan,
};
