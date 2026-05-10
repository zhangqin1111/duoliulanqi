const { createEvidencePack, evidenceByClaim } = require('../src/electron/evidence/evidence-pack');
const { scoreEvidencePack } = require('../src/electron/evidence/evidence-scorer');
const { createSearchQueryPlan } = require('../src/electron/evidence/search-query-planner');
const { createEvidenceSearchProvider } = require('../src/electron/evidence/evidence-search-provider');
const { bindEvidenceToReport } = require('../src/electron/evidence/evidence-claim-linker');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const plan = createSearchQueryPlan('iphone17各个机型对比', 'consumer_purchase');
assert(plan.queries.some((query) => query.includes('官方')), 'query plan should include official source query');

const pack = createEvidencePack({
  question: 'iphone17各个机型对比',
  queries: plan.queries,
  items: [
    {
      id: 'E1',
      title: '官方参数',
      source: 'Apple',
      url: 'https://example.com',
      evidenceType: 'official',
      snippet: '官方参数和价格信息，用于核验机型差异。',
      credibility: 90,
      relatedClaims: ['C1'],
    },
  ],
});

assert(pack.items.length === 1, 'evidence pack should normalize items');
assert(evidenceByClaim(pack, 'C1').length === 1, 'claim evidence lookup failed');
const score = scoreEvidencePack(pack);
assert(score.score >= 80, 'official evidence should score high');

const report = bindEvidenceToReport(
  {
    executive_conclusion: { one_sentence: 'iphone17 官方参数和价格信息需要核验' },
    scenario_decision: { direct_verdict: '以官方参数作为购买判断依据' },
    user_issue_analysis: { direct_answer: '标准版更适合预算敏感用户，但需等待官方价格。' },
    fact_map: { confirmed_facts: [{ fact: '官方参数和价格信息可用于核验机型差异' }] },
  },
  pack
);
assert(report.evidence_bindings.length >= 3, 'report should expose claim evidence bindings');
assert(report.evidence_binding_summary.bound >= 1, 'at least one claim should bind to evidence');
assert(report.evidence_sources[0].id === 'E1', 'report should expose evidence source index');

async function runSearchProviderCheck() {
  const provider = createEvidenceSearchProvider({
    env: { DUOLI_EVIDENCE_SEARCH_ENDPOINT: 'https://evidence.example.test/search' },
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(init.body);
      assert(body.query, 'custom evidence search should send query');
      return {
        ok: true,
        json: async () => ({
          results: [
            {
              title: '官方说明',
              source: 'Official',
              url: 'https://example.com/official',
              snippet: '用于测试的官方候选证据。',
              evidenceType: 'official',
              credibility: 90,
            },
          ],
        }),
      };
    },
  });
  const result = await provider.searchEvidence({
    question: 'iphone17各个机型对比',
    taskType: 'consumer_purchase',
    queries: plan.queries.slice(0, 1),
    limit: 1,
  });
  assert(result.ok, 'evidence search provider should be enabled with custom endpoint');
  assert(result.pack.items.length === 1, 'evidence search should return normalized items');
}

runSearchProviderCheck()
  .then(() => {
    console.log(`Evidence layer check passed: ${score.level} ${score.score}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
