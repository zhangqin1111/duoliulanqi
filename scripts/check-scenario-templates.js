const registry = require('../src/electron/report/report-template-registry');
const factTemplate = require('../src/electron/report/fact-template');
const { buildConsumerReport } = require('../src/electron/report/scenarios/consumer-template');
const { buildPublicOpinionReport } = require('../src/electron/report/scenarios/public-opinion-template');
const { buildTechnicalReport } = require('../src/electron/report/scenarios/technical-template');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function render(taskType, question) {
  return registry.buildReportHtml(
    { question, rawReplies: [] },
    {
      meta: { task_type: taskType, question_original: question, models: ['Mock'] },
      executive_conclusion: { one_sentence: '测试结论', confidence_score: 72, risk_level: 'medium' },
      scenario_decision: {
        task_type: taskType,
        direct_verdict: '测试裁决',
        recommended_action: '测试动作',
        decision_factors: [{ label: '可信度', score: 72, note: '样例指标' }],
      },
      scenario_payload:
        taskType === 'consumer_purchase'
          ? {
              candidate_table: [
                { brand: 'A', model: '车型A', official_price: '待核验', market_price: '待核验', verification_status: '待核验' },
                { brand: 'B', model: '车型B', official_price: '待核验', market_price: '待核验', verification_status: '待核验' },
                { brand: 'C', model: '车型C', official_price: '待核验', market_price: '待核验', verification_status: '待核验' },
              ],
              recommendations: { primary: { name: '车型A', reason: '样例推荐' } },
              value_weights: [{ label: '价格', weight: 30 }],
              persona_rankings: [{ persona: '家庭', ranking: ['车型A'], reason: '样例' }],
              manual_verification_items: ['价格', '配置', '交付'],
            }
          : {},
      question_brief: { original: question, refined: question },
      user_issue_analysis: { direct_answer: '测试回答', key_findings: ['样例发现'] },
      evidence_funnel: { raw_claims: 3, final_evidence: 1 },
      dispute_map: { items: [{ title: '样例差异', retained_judgment: '样例裁决' }] },
      fact_map: { timeline: [{ title: '样例节点', body: '样例时间线' }] },
      source_diagnosis: { root_causes: ['样例根因'] },
      final_actions: ['样例动作'],
    }
  );
}

function main() {
  const requiredTemplateTasks = [
    'public_opinion',
    'fact_check',
    'competitor_analysis',
    'consumer_purchase',
    'investment_research',
    'legal_risk',
    'knowledge_brief',
    'creative_content',
    'technical_diagnosis',
    'learning_research',
    'travel_lifestyle',
    'career_recruiting',
    'medical_health',
    'finance_planning',
    'general_compare',
  ];
  for (const taskType of requiredTemplateTasks) {
    const template = registry.resolveTemplate({ meta: { task_type: taskType }, executive_conclusion: {} });
    assert(template && template !== factTemplate, `${taskType} should resolve to a dedicated scenario template`);
  }

  const configuredTemplateTasks = requiredTemplateTasks.filter(
    (taskType) => !['consumer_purchase', 'public_opinion', 'technical_diagnosis'].includes(taskType)
  );
  for (const taskType of configuredTemplateTasks) {
    const html = render(taskType, `fixture question for ${taskType}`);
    assert(html.includes('scenario-page--configured'), `${taskType} configured scenario page missing`);
    assert(html.includes(`scenario-page--${taskType}`), `${taskType} scenario theme marker missing`);
    assert(html.includes('scenario-metric-strip'), `${taskType} metric strip missing`);
    assert(html.includes('scenario-readiness-panel'), `${taskType} readiness panel missing`);
    assert(html.includes('scenario-specialized-visual'), `${taskType} specialized visual missing`);
    assert(html.includes('scenario-axis-map'), `${taskType} scenario axis map missing`);
  }

  const consumer = registry.resolveTemplate({ meta: { task_type: 'consumer_purchase' }, executive_conclusion: {} });
  const opinion = registry.resolveTemplate({ meta: { task_type: 'public_opinion' }, executive_conclusion: {} });
  const technical = registry.resolveTemplate({ meta: { task_type: 'technical_diagnosis' }, executive_conclusion: {} });
  assert(consumer !== opinion && consumer !== technical && opinion !== technical, 'scenario templates should resolve to distinct modules');

  const consumerReport = buildConsumerReport({ meta: {}, user_issue_analysis: {} });
  assert(consumerReport.meta.template_variant === 'consumer_purchase_decision_v1', 'consumer template variant marker missing');
  const consumerHtml = render('consumer_purchase', 'iphone17各个机型对比');
  assert(consumerHtml.includes('消费选购决策台'), 'consumer scenario page missing');
  assert(consumerHtml.includes('直接裁决'), 'consumer recommendation section missing');
  assert(consumerHtml.includes('候选产品核验表'), 'consumer candidate table missing');

  const opinionReport = buildPublicOpinionReport({ meta: {}, user_issue_analysis: {} });
  assert(opinionReport.meta.template_variant === 'public_opinion_verdict_v1', 'public opinion template variant marker missing');
  const opinionHtml = render('public_opinion', '郭德纲最近舆论怎么样');
  assert(opinionHtml.includes('PUBLIC OPINION WAR ROOM'), 'public opinion scenario page missing');
  assert(opinionHtml.includes('Timeline') || opinionHtml.includes('传播') || opinionHtml.includes('浼犳挱'), 'public opinion timeline section missing');

  const technicalReport = buildTechnicalReport({ meta: {}, user_issue_analysis: {} });
  assert(technicalReport.meta.template_variant === 'technical_diagnosis_v1', 'technical template variant marker missing');
  const technicalHtml = render('technical_diagnosis', 'Electron 打包报错');
  assert(technicalHtml.includes('TECHNICAL DIAGNOSIS'), 'technical scenario page missing');
  assert(technicalHtml.includes('Fix') || technicalHtml.includes('动作') || technicalHtml.includes('鍔ㄤ綔'), 'technical first action section missing');

  console.log(`Scenario template check passed: ${requiredTemplateTasks.length} dedicated templates`);
}

main();
