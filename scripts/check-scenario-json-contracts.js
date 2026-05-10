const { validateScenarioContract } = require('../src/electron/report/scenario-contracts');
const { applyReportQualityGate } = require('../src/electron/report/report-quality-gate');
const { readReportFixtures } = require('./report-fixture-utils');

function fail(message) {
  console.error(message);
  process.exitCode = 1;
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

  if (!process.exitCode) console.log(`Scenario JSON contract check passed: ${fixtures.length} fixtures`);
}

main();
