const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const baseFixturePath = path.join(repoRoot, 'fixtures', 'reports', 'report-fixtures.json');
const commercialFixturePath = path.join(repoRoot, 'fixtures', 'reports', 'report-commercial-fixtures.js');
const { defaultScenarioPayload } = require('../fixtures/reports/scenario-payload-fixtures');

function withScenarioPayload(fixture) {
  const copy = JSON.parse(JSON.stringify(fixture));
  const structured = copy.structured || {};
  if (!structured.scenario_payload || !Object.keys(structured.scenario_payload).length) {
    structured.scenario_payload = defaultScenarioPayload(copy.taskType || (structured.meta && structured.meta.task_type));
  }
  copy.structured = structured;
  return copy;
}

function readReportFixtures() {
  const baseFixtures = JSON.parse(fs.readFileSync(baseFixturePath, 'utf8'));
  const { createCommercialReportFixtures } = require(commercialFixturePath);
  return [...baseFixtures, ...createCommercialReportFixtures()].map(withScenarioPayload);
}

function createReportFixturePayload(fixture) {
  return {
    question: fixture.question,
    rawReplies: (fixture.structured.meta.models || []).map((name) => ({ name, text: `${name} fixture reply` })),
    structuredReport: fixture.structured,
    taskRoute: { task_type: fixture.taskType, label: fixture.taskType },
  };
}

module.exports = {
  readReportFixtures,
  createReportFixturePayload,
};
