const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const rendererDir = path.join(repoRoot, 'src', 'electron', 'renderer');

const CONCRETE_TIME_RE =
  /((?:19|20)\d{2}(?:\s*年|\s*款|\s*版|[-/.]\d{1,2}(?:[-/.]\d{1,2})?)?|\d{1,2}\s*月(?:\d{1,2}\s*日)?|Q[1-4]|第[一二三四1234]季度)/i;

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function loadBrowserScript(file, sandbox) {
  const code = fs.readFileSync(path.join(rendererDir, file), 'utf8');
  vm.runInNewContext(code, sandbox, { filename: file });
}

function buildSandbox() {
  const sandbox = { window: {}, console };
  sandbox.globalThis = sandbox.window;
  loadBrowserScript('question-refinement-policy.js', sandbox);
  loadBrowserScript('workflow-registry.js', sandbox);
  loadBrowserScript(path.join('workflows', 'consumer-purchase-workflow.js'), sandbox);
  loadBrowserScript('question-refiner.js', sandbox);
  return sandbox;
}

function checkTimeBoundaryPolicy(policy) {
  const relative = policy.analyzeTimeBoundary('最新国产20万元SUV车型怎么选');
  if (relative.hasExplicitTime || !relative.hasRelativeTime) {
    fail('Relative freshness words must not be treated as fixed explicit dates.');
  }

  const noTime = policy.analyzeTimeBoundary('售价约15万元人民币的SUV车型怎么选');
  if (noTime.hasExplicitTime || noTime.hasRelativeTime) {
    fail('A budget number must not be treated as a date boundary.');
  }

  const explicit = policy.analyzeTimeBoundary('请分析2024年15万元SUV怎么选');
  if (!explicit.hasExplicitTime) {
    fail('User-provided concrete time boundary must be preserved as explicit time.');
  }
}

function checkConsumerRefinePrompt(refiner) {
  const prompt = refiner.buildRefinePrompt('售价约15万元人民币的SUV车型怎么选', {
    task_type: 'consumer_purchase',
  });

  if (CONCRETE_TIME_RE.test(prompt.replace('15万元', ''))) {
    fail('Consumer refinement prompt must not inject concrete time/month/quarter/model-year boundaries.');
  }

  for (const phrase of [
    '只补用户没想到但会影响选购判断的分析维度',
    '不要替用户预设最终答案、候选池或固定场景',
    '不得新增用户未给出的具体年份、季度、月份、价格上下限、地区、渠道、能源偏好、用车场景或品牌范围',
    '候选清单和事实结论必须由后续 AI 自行给出',
  ]) {
    if (!prompt.includes(phrase)) {
      fail(`Consumer refinement prompt missing boundary phrase: ${phrase}`);
    }
  }

  const explicitPrompt = refiner.buildRefinePrompt('请分析2024年15万元SUV怎么选', {
    task_type: 'consumer_purchase',
  });
  if (!explicitPrompt.includes('2024')) {
    fail('Consumer refinement prompt must preserve user-provided concrete year.');
  }
}

function main() {
  const sandbox = buildSandbox();
  const policy = sandbox.window.DuoliQuestionRefinementPolicy;
  const refiner = sandbox.window.DuoliQuestionRefiner;
  if (!policy || !refiner) {
    fail('Question refinement modules failed to load.');
    return;
  }

  checkTimeBoundaryPolicy(policy);
  checkConsumerRefinePrompt(refiner);

  if (!process.exitCode) {
    console.log('Question refinement policy check passed');
  }
}

main();
