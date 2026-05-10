'use strict';

const factTemplate = require('../fact-template');
const {
  appendUnique,
  injectBeforeEvidenceGrid,
  renderScenarioCard,
  renderScenarioList,
  renderScenarioShell,
  withMeta,
} = require('./scenario-template-utils');

function buildPublicOpinionReport(report) {
  const data = withMeta(report, 'public_opinion', 'public_opinion_verdict_v1');
  data.scenario_decision = {
    ...(data.scenario_decision || {}),
    task_type: 'public_opinion',
    task_label: (data.scenario_decision && data.scenario_decision.task_label) || '舆情裁决',
    evidence_standard:
      (data.scenario_decision && data.scenario_decision.evidence_standard) ||
      '优先采信官方回应、权威媒体、平台热度曲线、原始传播节点和可定位截图；传闻、转述和情绪评论不得直接作为事实。',
  };
  data.user_issue_analysis = {
    ...(data.user_issue_analysis || {}),
    key_findings: appendUnique(data.user_issue_analysis && data.user_issue_analysis.key_findings, [
      '先裁决是否形成新舆情事件，再判断情绪强度和响应动作。',
      '粉圈盘、路人盘、媒体盘和平台热度必须分开看。',
    ]),
  };
  return data;
}

function renderPublicOpinionWarRoom(report) {
  const decision = report.scenario_decision || {};
  const issue = report.user_issue_analysis || {};
  const dispute = report.dispute_map || {};
  const facts = report.fact_map || {};
  return renderScenarioShell({
    eyebrow: 'PUBLIC OPINION WAR ROOM',
    title: '舆情战情室',
    subtitle: '回答“有没有舆情、舆情多大、要不要响应”，并把事实事件、情绪噪音和平台放大分层隔离。',
    children: `
      ${renderScenarioCard(
        '舆情裁决',
        'Verdict',
        decision.direct_verdict || issue.direct_answer || '暂无足够证据证明形成可验证舆情事件。',
        [decision.recommended_action || '先核验再响应', decision.evidence_standard || '传播节点绑定']
      )}
      ${renderScenarioList('传播节点', 'Timeline', facts.timeline, [
        { title: '原始触发点', body: '定位首发主体、发布时间和原始材料。' },
        { title: '扩散节点', body: '区分媒体报道、平台热榜和二次剪辑。' },
        { title: '官方响应', body: '确认是否存在当事人或机构回应。' },
      ])}
      ${renderScenarioList('差异冲突', 'Conflict', dispute.items, [
        { title: '时间冲突', body: '不同模型给出的时间线不一致，需要回到首发源。' },
        { title: '主体冲突', body: '不同模型把评论者、当事人和媒体混为一谈。' },
        { title: '热度冲突', body: '平台推荐热度不等于真实舆论规模。' },
      ])}
      ${renderScenarioCard(
        '响应策略',
        'Action',
        decision.recommended_action || '若无新增可验证事实，建议低调监测；若出现权威媒体或官方节点，再升级响应。',
        ['监测热度', '保留证据', '避免过度回应']
      )}
    `,
  });
}

function buildReportHtml(payload, structured) {
  const report = buildPublicOpinionReport(structured);
  return injectBeforeEvidenceGrid(factTemplate.buildReportHtml(payload, report), renderPublicOpinionWarRoom(report));
}

module.exports = {
  buildPublicOpinionReport,
  buildReportHtml,
};
