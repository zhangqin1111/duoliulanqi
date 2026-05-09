const { repairStructuredReport } = require('../src/electron/report/report-json-repair');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runCase(name, payload) {
  const result = repairStructuredReport(payload);
  assert(result && result.structured, `${name}: no structured report`);
  assert(result.validation && result.validation.ok, `${name}: validation failed`);
  assert(result.structured.executive_conclusion.one_sentence, `${name}: missing conclusion`);
  assert(result.structured.scenario_decision.direct_verdict, `${name}: missing verdict`);
  console.log(`REPAIR ${name}: ok repaired=${result.repaired} warnings=${result.warnings.join(',') || 'none'}`);
}

runCase('clean-json', {
  question: 'iPhone17各机型对比',
  taskRoute: { task_type: 'consumer_purchase', label: '消费选购决策' },
  summaryText: JSON.stringify({
    meta: { task_type: 'consumer_purchase' },
    executive_conclusion: { one_sentence: 'Pro Max 适合影像，标准版性价比更高。', confidence_score: 70 },
    question_brief: { original: 'iPhone17各机型对比' },
    scenario_decision: {
      task_type: 'consumer_purchase',
      decision_object: 'iPhone17',
      direct_verdict: '标准版更适合大多数用户。',
      decision_factors: [{ label: '价格', score: 80 }],
    },
    evidence_funnel: { raw_claims: 5, final_evidence: 3 },
    dispute_map: { items: [] },
    final_actions: ['核对官方价格'],
  }),
});

runCase('fenced-json-with-trailing-comma', {
  question: '郭德纲最近舆论怎么样',
  taskRoute: { task_type: 'public_opinion', label: '舆情裁决' },
  summaryText:
    '前置说明\n```json\n{"meta":{"task_type":"public_opinion"},"executive_conclusion":{"one_sentence":"未形成强舆情","confidence_score":68},"question_brief":{"original":"郭德纲最近舆论怎么样"},"scenario_decision":{"task_type":"public_opinion","direct_verdict":"未见强事件"},"user_issue_analysis":{"public_opinion_temperature":45},"evidence_funnel":{"raw_claims":3,"final_evidence":1},"dispute_map":{"items":[]},"final_actions":["继续观察"],}\n```',
});

runCase('missing-json-fallback', {
  question: '帮我分析这个事情',
  taskRoute: { task_type: 'general_compare', label: '通用多源对比' },
  rawReplies: [{ model: 'Kimi', text: '已有部分回复' }],
  summaryText: '模型没有返回结构化 JSON。',
});

console.log('Report JSON repair check passed');
