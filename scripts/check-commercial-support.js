const fs = require('fs');
const os = require('os');
const path = require('path');

const { estimateTaskCost, createTaskBudget } = require('../src/electron/ai-cost/cost-estimator');
const { loadRemoteConfig } = require('../src/electron/config/remote-config');
const { createReportHistoryStore } = require('../src/electron/report-history');
const { redact, writeDiagnosticPackage } = require('../src/electron/diagnostics/diagnostic-package');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const cost = estimateTaskCost({ providerId: 'qwen', inputTokens: 1000, outputTokens: 1000 });
assert(cost.cost > 0, 'cost should be estimated');

const budget = createTaskBudget('public_opinion');
assert(budget.maxModels >= 4, 'high value task should allow more models');

const config = loadRemoteConfig('');
assert(config.highRiskRules.enabled, 'default remote config should enable high-risk rules');

const rendererRoot = path.join(__dirname, '..', 'src', 'electron', 'renderer');
const indexHtml = fs.readFileSync(path.join(rendererRoot, 'index.html'), 'utf8');
const workflowRegistry = fs.readFileSync(path.join(rendererRoot, 'workflow-registry.js'), 'utf8');
assert(indexHtml.includes('workflows/general-compare-workflow.js'), 'general compare workflow script must be loaded');
assert(workflowRegistry.includes("register('general_compare'"), 'general compare workflow must be registered');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'duoli_commercial_'));
const history = createReportHistoryStore(path.join(tmp, 'history.json'));
const item = history.add({ question: '测试报告', taskType: 'consumer_purchase', status: 'exported' });
assert(history.list().length === 1 && item.id, 'history add/list failed');
assert(history.remove(item.id), 'history remove failed');

assert(!redact('apiKey=sk-abcdef1234567890').includes('abcdef1234567890'), 'redaction failed');
const files = writeDiagnosticPackage(path.join(tmp, 'diag'), {
  task: { id: 't1' },
  environment: { platform: process.platform },
  structuredReport: { ok: true },
  log: 'authorization: bearer sk-abcdef1234567890',
});
assert(files.length === 4 && files.every((file) => fs.existsSync(file)), 'diagnostic files missing');

console.log('Commercial support check passed');
