const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const casesPath = path.join(repoRoot, 'fixtures', 'routing', 'task-routing-cases.json');
const { routeQuestion } = require(path.join(repoRoot, 'src', 'electron', 'renderer', 'task-router.js'));

function readCases() {
  return JSON.parse(fs.readFileSync(casesPath, 'utf8'));
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

  for (const result of results) {
    const mark = result.pass ? 'PASS' : 'FAIL';
    console.log(
      `${mark} ${result.id}: expected=${result.expected} actual=${result.actual} confidence=${result.confidence.toFixed(2)}`
    );
  }

  console.log('');
  console.log(`Routing pass rate: ${(passRate * 100).toFixed(1)}% (${results.length - failed.length}/${results.length})`);

  if (failed.length) {
    console.error('');
    console.error('Failed routing cases:');
    for (const item of failed) {
      console.error(`- ${item.id}: "${item.question}" expected ${item.expected}, got ${item.actual}`);
    }
    process.exit(1);
  }
}

run();
