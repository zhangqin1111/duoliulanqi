const { validateScenarioContract } = require('../src/electron/report/scenario-contracts');
const { applyReportQualityGate } = require('../src/electron/report/report-quality-gate');
const { readReportFixtures } = require('./report-fixture-utils');

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function checkBlockedPublicOpinionStrongVerdict() {
  const gated = applyReportQualityGate({
    meta: {
      task_type: 'public_opinion',
      question_original: '郭德纲舆情分析',
      question_refined: '请围绕郭德纲开展舆情分析。',
    },
    question_brief: {
      original: '郭德纲舆情分析',
      refined: '请围绕郭德纲开展舆情分析。',
    },
    evidence_binding_summary: {
      claims: 7,
      bound: 0,
      unbound: 7,
      evidence_sources: 0,
    },
    executive_conclusion: {
      status: 'strong',
      confidence_score: 99,
      confidence_label: '高可信',
      risk_level: 'low',
      one_sentence:
        '当前无任何可验证的新发或复发舆情事件，所有所谓“2026年悉尼演出争议”均为AI幻觉虚构，不构成真实舆情事件。',
    },
    scenario_decision: {
      task_type: 'public_opinion',
      decision_object: '郭德纲舆情',
      direct_verdict: '无需响应。',
      recommended_action: '无需响应。',
    },
    scenario_payload: {
      signal_matrix: [],
      verified_events: [],
      actor_map: [],
      risk_triggers: [],
    },
  });
  const conclusion = gated.executive_conclusion || {};
  const sentence = String(conclusion.one_sentence || '');
  const problems = [];

  if (!gated.quality_gate || gated.quality_gate.level !== 'blocked') {
    problems.push('public opinion strong verdict must be blocked without bound evidence');
  }
  if (Number(conclusion.confidence_score) > 58) {
    problems.push('blocked public opinion confidence must be capped');
  }
  if (Number(gated.evidence_funnel && gated.evidence_funnel.final_evidence) !== 0) {
    problems.push('blocked public opinion final evidence must match bound evidence count');
  }
  if (/(2026年悉尼演出争议|无任何可验证|均为AI幻觉|不构成真实舆情事件|无需响应)/.test(sentence)) {
    problems.push('blocked public opinion report must not keep unsupported strong verdict text');
  }
  if (!/材料不足|证据不足|核验/.test(sentence)) {
    problems.push('blocked public opinion report must explain evidence insufficiency');
  }
  if (problems.length) fail(`SCENARIO_CONTRACT public_opinion_quality_gate: ${problems.join(', ')}`);
  else console.log('SCENARIO_CONTRACT public_opinion_quality_gate: ok');
}

function checkAiAnalysisOnlyPublicOpinionVerdict() {
  const gated = applyReportQualityGate({
    meta: {
      task_type: 'public_opinion',
      question_original: '郭德纲舆情分析',
    },
    evidence_binding_summary: {
      claims: 7,
      bound: 0,
      unbound: 7,
      evidence_sources: 0,
    },
    executive_conclusion: {
      status: 'strong',
      confidence_score: 91,
      confidence_label: '高可信',
      risk_level: 'low',
      one_sentence: '当前无任何可验证的新发舆情事件，无需响应。',
    },
    scenario_decision: {
      task_type: 'public_opinion',
      decision_object: '郭德纲舆情',
      direct_verdict: '无真实舆情事件。',
      recommended_action: '无需响应。',
    },
    dispute_map: {
      items: [
        {
          id: 'D1',
          title: '时间线冲突',
          type: '事实差异',
          severity: 'high',
        },
      ],
    },
    source_diagnosis: {
      root_causes: ['AI幻觉补全', '时间边界失准'],
      retained_judgment: '当前无法确认真实舆情事件。',
    },
    model_profiles: [{ model: 'Doubao' }, { model: 'Yuanbao' }],
    scenario_payload: {
      signal_matrix: [{ signal: '待核验' }],
      verified_events: [{ event: '待核验' }],
      actor_map: [{ actor: '郭德纲' }],
      risk_triggers: [{ trigger: '待核验' }],
    },
  });
  const conclusion = gated.executive_conclusion || {};
  const sentence = String(conclusion.one_sentence || '');
  const problems = [];

  if (!gated.quality_gate || gated.quality_gate.level !== 'ai_analysis_only') {
    problems.push('AI cross-analysis report should be usable as ai_analysis_only');
  }
  if (Number(conclusion.confidence_score) > 72) {
    problems.push('AI-only confidence must be capped');
  }
  if (/无需响应|已核验|可核验/.test(sentence + conclusion.confidence_label)) {
    problems.push('AI-only report must not claim verified/no-action certainty');
  }
  if (!/AI交叉研判|待外部核验/.test(sentence + conclusion.confidence_label)) {
    problems.push('AI-only report must disclose analysis basis');
  }
  if (problems.length) fail(`SCENARIO_CONTRACT public_opinion_ai_only_gate: ${problems.join(', ')}`);
  else console.log('SCENARIO_CONTRACT public_opinion_ai_only_gate: ok');
}

function main() {
  const fixtures = readReportFixtures();
  for (const fixture of fixtures) {
    const gated = applyReportQualityGate(fixture.structured);
    const validation = validateScenarioContract(gated);
    const problems = [];

    if (fixture.taskType === 'consumer_purchase') {
      const payload = gated.scenario_payload || {};
      const candidates = Array.isArray(payload.candidate_table) ? payload.candidate_table : [];
      const recommendations = payload.recommendations || {};
      const blocked = gated.quality_gate && gated.quality_gate.level === 'blocked';
      if (candidates.length < 3) problems.push('consumer candidate table requires at least 3 rows');
      if (!blocked && !recommendations.primary && !validation.errors.includes('consumer_purchase.recommendations_missing')) {
        problems.push('consumer primary recommendation missing');
      }
      if (blocked && !recommendations.note) {
        problems.push('blocked consumer report must explain why recommendation is withheld');
      }
      if (!Array.isArray(payload.value_weights) || payload.value_weights.length < 4) {
        problems.push('consumer value weights should be explicit');
      }
      if (!Array.isArray(payload.manual_verification_items) || payload.manual_verification_items.length < 3) {
        problems.push('consumer manual verification list should be explicit');
      }
    }

    for (const error of validation.errors) {
      if (error !== 'report_contains_placeholder_token') problems.push(`contract error: ${error}`);
    }
    if (validation.errors.includes('report_contains_placeholder_token')) problems.push('placeholder token leaked');
    if (validation.warnings.length) problems.push(`contract warnings: ${validation.warnings.join('|')}`);

    if (problems.length) {
      fail(`SCENARIO_CONTRACT ${fixture.id}: ${problems.join(', ')}`);
    } else {
      console.log(`SCENARIO_CONTRACT ${fixture.id}: ok (${validation.taskType})`);
    }
  }

  checkBlockedPublicOpinionStrongVerdict();
  checkAiAnalysisOnlyPublicOpinionVerdict();

  if (!process.exitCode) console.log(`Scenario JSON contract check passed: ${fixtures.length} fixtures`);
}

main();
