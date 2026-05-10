const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const casesPath = path.join(repoRoot, 'fixtures', 'routing', 'task-routing-cases.json');
const commercialCasesPath = path.join(repoRoot, 'fixtures', 'routing', 'task-routing-commercial-cases.js');
const { routeQuestion } = require(path.join(repoRoot, 'src', 'electron', 'renderer', 'task-router.js'));

const MIN_CASES = 100;
const MIN_PASS_RATE = 0.92;
const MIN_HIGH_RISK_RECALL = 0.98;
const HIGH_RISK_TASK_TYPES = new Set(['legal_risk', 'medical_health', 'finance_planning']);

function readCases() {
  const baseCases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
  const { expandCommercialRoutingCases } = require(commercialCasesPath);
  const commercialCases = expandCommercialRoutingCases();
  return [...baseCases, ...commercialCases];
}

function run() {
  const cases = readCases();
  const results = cases.map((item) => {
    const route = routeQuestion(item.question);
    const actual = route.task_type;
    return {
      id: item.id,
      question: item.question,
      expected: item.expectedTaskType,
      actual,
      confidence: route.confidence,
      pass: actual === item.expectedTaskType,
    };
  });

  const failed = results.filter((item) => !item.pass);
  const passRate = cases.length ? (results.length - failed.length) / cases.length : 0;
  const highRiskResults = results.filter((item) => HIGH_RISK_TASK_TYPES.has(item.expected));
  const highRiskFailed = highRiskResults.filter((item) => !item.pass);
  const highRiskRecall = highRiskResults.length
    ? (highRiskResults.length - highRiskFailed.length) / highRiskResults.length
    : 1;

  for (const result of results) {
    const mark = result.pass ? 'PASS' : 'FAIL';
    console.log(
      `${mark} ${result.id}: expected=${result.expected} actual=${result.actual} confidence=${result.confidence.toFixed(2)}`
    );
  }

  console.log('');
  console.log(`Routing pass rate: ${(passRate * 100).toFixed(1)}% (${results.length - failed.length}/${results.length})`);
  console.log(`High-risk routing recall: ${(highRiskRecall * 100).toFixed(1)}% (${highRiskResults.length - highRiskFailed.length}/${highRiskResults.length})`);

  const acceptanceFailures = [];
  if (cases.length < MIN_CASES) {
    acceptanceFailures.push(`Expected at least ${MIN_CASES} routing cases, got ${cases.length}.`);
  }
  if (passRate < MIN_PASS_RATE) {
    acceptanceFailures.push(`Expected routing pass rate >= ${(MIN_PASS_RATE * 100).toFixed(1)}%, got ${(passRate * 100).toFixed(1)}%.`);
  }
  if (highRiskRecall < MIN_HIGH_RISK_RECALL) {
    acceptanceFailures.push(`Expected high-risk recall >= ${(MIN_HIGH_RISK_RECALL * 100).toFixed(1)}%, got ${(highRiskRecall * 100).toFixed(1)}%.`);
  }

  if (failed.length || acceptanceFailures.length) {
    console.error('');
    console.error('Routing acceptance failures:');
    for (const item of acceptanceFailures) {
      console.error(`- ${item}`);
    }
    console.error('');
    console.error('Failed routing cases:');
    for (const item of failed) {
      console.error(`- ${item.id}: "${item.question}" expected ${item.expected}, got ${item.actual}`);
    }
    process.exit(1);
  }
}

run();
