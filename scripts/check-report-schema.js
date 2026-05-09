const {
  TASK_TYPES,
  getReportSchema,
  validateReportSchema,
} = require('../src/electron/report/report-schema-registry');

function makeReport(taskType) {
  return {
    meta: {
      task_type: taskType,
      question_original: '示例问题',
      question_refined: '示例问题补全',
    },
    executive_conclusion: {
      one_sentence: '示例裁决',
      confidence_score: 72,
      risk_level: 'medium',
    },
    question_brief: {
      original: '示例问题',
      refined: '示例问题补全',
    },
    scenario_decision: {
      task_type: taskType,
      decision_object: '示例对象',
      direct_verdict: '示例结论',
      recommended_action: '示例动作',
      evidence_standard: '需要交叉核验',
      do_not_overread: ['不要替代专业意见'],
      decision_factors: [{ label: '因素', score: 70, note: '示例' }],
    },
    user_issue_analysis: {
      public_opinion_temperature: 50,
      key_findings: ['示例发现'],
      sentiment_distribution: [],
      risk_matrix: [],
    },
    fact_map: {
      confirmed_facts: [],
      uncertain_claims: [],
    },
    evidence_funnel: {
      raw_claims: 3,
      final_evidence: 1,
    },
    dispute_map: {
      items: [],
    },
    model_profiles: [],
    final_actions: ['补充证据'],
  };
}

function run() {
  const failed = [];

  for (const taskType of TASK_TYPES) {
    const schema = getReportSchema(taskType);
    if (!schema || !Array.isArray(schema.fields) || schema.fields.length === 0) {
      failed.push(`${taskType}: schema is empty`);
      continue;
    }
    const result = validateReportSchema(makeReport(taskType), taskType);
    if (!result.ok) {
      failed.push(`${taskType}: ${result.errors.map((issue) => issue.message).join('; ')}`);
    }
    console.log(`SCHEMA ${taskType}: fields=${schema.fields.length} ok=${result.ok}`);
  }

  const bad = validateReportSchema({ meta: { task_type: 'consumer_purchase' } }, 'consumer_purchase');
  if (bad.ok || bad.errors.length === 0) {
    failed.push('bad consumer_purchase payload should return missing-field errors');
  } else {
    console.log(`BAD PAYLOAD CHECK: errors=${bad.errors.length}`);
  }

  if (failed.length) {
    console.error('');
    console.error('Schema checks failed:');
    for (const item of failed) console.error(`- ${item}`);
    process.exit(1);
  }

  console.log('');
  console.log(`Report schema check passed: ${TASK_TYPES.length} task schemas`);
}

run();
