globalThis.DuoliReportSchema = {
  extractStructuredJson(text) {
    const source = String(text || '');
    const match = source.match(/```json\s*([\s\S]*?)```/i);
    if (!match) return null;
    return JSON.parse(match[1]);
  },
};

const orchestrator = require('../src/electron/renderer/report-completeness-orchestrator');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const incomplete = {
    meta: { task_type: 'consumer_purchase', question_original: '15万SUV怎么选' },
    executive_conclusion: { one_sentence: '需要候选表' },
    scenario_decision: { task_type: 'consumer_purchase', direct_verdict: '待补齐', recommended_action: '补齐候选表' },
    scenario_payload: {},
    question_brief: {},
    user_issue_analysis: {},
    fact_map: {},
    dispute_map: {},
    evidence_funnel: {},
    model_profiles: [],
    source_diagnosis: {},
    final_actions: [],
  };
  const text = `report\n\n\`\`\`json\n${JSON.stringify(incomplete)}\n\`\`\``;
  const audit = orchestrator.auditStructuredReport(incomplete, { taskType: 'consumer_purchase' });
  assert(!audit.ok, 'incomplete consumer report should fail audit');
  assert(audit.missingPayloadKeys.includes('candidate_table'), 'candidate_table should be required');

  const completed = {
    ...incomplete,
    scenario_payload: {
      candidate_table: [{ model: 'A' }, { model: 'B' }, { model: 'C' }],
      value_weights: [{ label: 'price', weight: 30 }],
      persona_rankings: [{ persona: 'family', ranking: ['A'] }],
      recommendations: { primary: { name: 'A' } },
      manual_verification_items: ['price', 'config'],
    },
  };
  const result = await orchestrator.completeFinalReport({
    api: {},
    session: { taskType: 'consumer_purchase', question: '15万SUV怎么选', initialResults: [] },
    finalText: text,
    core: {
      async qwenJson() {
        return completed;
      },
    },
  });
  assert(result.completed === true, 'completion should run for incomplete JSON');
  assert(result.audit.ok, 'completed report should pass audit');
  assert(result.text.includes('"candidate_table"'), 'completed JSON should replace original block');
  console.log('Report completeness orchestrator check passed');
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
