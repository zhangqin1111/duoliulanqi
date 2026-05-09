(function attachEvidenceQueryPlanner(global) {
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
    } else if (type === 'public_opinion') {
      queries.push(`${q} 最新 舆情 热搜`);
      queries.push(`${q} 官方回应 媒体报道`);
    } else if (type === 'fact_check') {
      queries.push(`${q} 官方 辟谣`);
      queries.push(`${q} 原始来源`);
    } else if (type === 'investment_research') {
      queries.push(`${q} 政策 原文 影响`);
      queries.push(`${q} 行业 数据 报告`);
    } else if (['medical_health', 'legal_risk', 'finance_planning'].includes(type)) {
      queries.push(`${q} 权威 指南 官方`);
      queries.push(`${q} 风险 注意事项`);
    } else {
      queries.push(`${q} 官方 来源`);
      queries.push(`${q} 最新 信息`);
    }

    return {
      taskType: type,
      queries: Array.from(new Set(queries)),
    };
  }

  const api = { createSearchQueryPlan };
  global.DuoliEvidenceQueryPlanner = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
