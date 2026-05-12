'use strict';

const factTemplate = require('../fact-template');
const { array, clipText, escapeHtml, text } = require('../fact-template-utils');
const {
  appendUnique,
  injectBeforeEvidenceGrid,
  renderScenarioActionPanel,
  renderScenarioCard,
  renderScenarioList,
  renderScenarioShell,
  withMeta,
} = require('./scenario-template-utils');
const { evaluateScenarioReadiness } = require('./scenario-readiness');

const VISUAL_PRESETS = {
  fact_check: {
    title: '主张可信度矩阵',
    badge: 'Claim Matrix',
    x: '传播风险',
    y: '证据可信度',
    center: '裁决核心：先拆 claim，再看来源等级和反证线索。',
    lanes: ['原始主张', '来源等级', '反证路径'],
  },
  competitor_analysis: {
    title: '竞品选型四象限',
    badge: 'Selection Map',
    x: '综合成本',
    y: '业务适配',
    center: '裁决核心：不是谁功能最多，而是谁在当前场景下净收益最高。',
    lanes: ['候选对象', '能力维度', '选型条件'],
  },
  investment_research: {
    title: '影响传导风险图',
    badge: 'Impact Path',
    x: '影响强度',
    y: '事实确定性',
    center: '裁决核心：保留可解释传导路径，不输出买卖指令。',
    lanes: ['事件边界', '传导指标', '风险情景'],
  },
  legal_risk: {
    title: '证据-责任矩阵',
    badge: 'Legal Matrix',
    x: '责任/损失风险',
    y: '证据完整度',
    center: '裁决核心：缺合同全文、辖区和证据时，只能做风险初筛。',
    lanes: ['事实前提', '规则方向', '律师问题'],
  },
  knowledge_brief: {
    title: '概念结构图',
    badge: 'Concept Map',
    x: '适用范围',
    y: '解释可信度',
    center: '裁决核心：先界定概念边界，再给可迁移解释。',
    lanes: ['核心定义', '共识机制', '开放问题'],
  },
  creative_content: {
    title: '创意转化矩阵',
    badge: 'Creative Map',
    x: '转化潜力',
    y: '差异化强度',
    center: '裁决核心：创意必须服务受众、渠道和业务动作。',
    lanes: ['目标受众', '创意路线', '风险词'],
  },
  learning_research: {
    title: '学习路径路线图',
    badge: 'Learning Path',
    x: '产出价值',
    y: '基础适配',
    center: '裁决核心：路线必须分阶段、可练习、可验收。',
    lanes: ['知识框架', '资料路径', '里程碑'],
  },
  travel_lifestyle: {
    title: '行程体验风险图',
    badge: 'Route Map',
    x: '成本/拥挤风险',
    y: '体验匹配度',
    center: '裁决核心：路线逻辑可先定，实时营业/天气/交通必须复核。',
    lanes: ['路线方案', '成本拆解', '实时核验'],
  },
  career_recruiting: {
    title: '岗位匹配矩阵',
    badge: 'Career Fit',
    x: '竞争压力',
    y: '能力匹配',
    center: '裁决核心：增强真实证据，而不是虚假包装。',
    lanes: ['岗位要求', '能力差距', '行动计划'],
  },
  medical_health: {
    title: '健康风险分诊图',
    badge: 'Triage Map',
    x: '紧急程度',
    y: '信息完整度',
    center: '裁决核心：不诊断、不处方，优先识别危险信号和就医必要性。',
    lanes: ['症状摘要', '危险信号', '医生问题'],
  },
  finance_planning: {
    title: '金融风险画像',
    badge: 'Risk Profile',
    x: '收益不确定性',
    y: '风险承受能力',
    center: '裁决核心：不承诺收益，不输出个性化买卖指令。',
    lanes: ['资产快照', '风险画像', '行动边界'],
  },
  general_compare: {
    title: '通用决策矩阵',
    badge: 'Decision Map',
    x: '风险/成本',
    y: '目标适配度',
    center: '裁决核心：先确认对象和权重，再输出建议。',
    lanes: ['候选对象', '决策维度', '风险条件'],
  },
};

function normalizeItem(item) {
  if (typeof item === 'string') return { title: item, body: '' };
  return {
    title: text(item && (item.title || item.label || item.name || item.model || item.step || item.issue), '待核验事项'),
    body: text(
      item &&
        (item.body ||
          item.note ||
          item.description ||
          item.reason ||
          item.value ||
          item.status ||
          item.risk ||
          item.action),
      ''
    ),
  };
}

function collectPayloadItems(payload, fields) {
  return array(fields).flatMap((field) => {
    const value = payload[field.key];
    const values = Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : value ? [value] : [];
    return values.map(normalizeItem).map((item) => ({ title: `${field.label}: ${item.title}`, body: item.body }));
  });
}

function renderPayloadMatrix(report, config) {
  const payload = (report && report.scenario_payload) || {};
  const items = collectPayloadItems(payload, config.payloadFields).slice(0, 6);
  return renderScenarioList(config.payloadTitle || '场景核心数据', 'Payload', items, config.payloadFallback);
}

function buildConfiguredReport(report, config) {
  const data = withMeta(report, config.taskType, config.variant);
  data.scenario_decision = {
    ...(data.scenario_decision || {}),
    task_type: config.taskType,
    task_label: (data.scenario_decision && data.scenario_decision.task_label) || config.label,
    evidence_standard:
      (data.scenario_decision && data.scenario_decision.evidence_standard) || config.evidenceStandard,
    do_not_overread: appendUnique(
      data.scenario_decision && data.scenario_decision.do_not_overread,
      config.doNotOverread || []
    ),
  };
  data.user_issue_analysis = {
    ...(data.user_issue_analysis || {}),
    key_findings: appendUnique(data.user_issue_analysis && data.user_issue_analysis.key_findings, config.keyFindings || []),
  };
  data.final_actions = appendUnique(data.final_actions, config.finalActions || []);
  return data;
}

function countPayloadFields(report, config) {
  const payload = (report && report.scenario_payload) || {};
  return array(config.payloadFields).reduce((total, field) => {
    const value = payload[field.key];
    if (Array.isArray(value)) return total + value.length;
    if (value && typeof value === 'object') return total + Object.keys(value).length;
    return total + (value ? 1 : 0);
  }, 0);
}

function renderMetricStrip(report, config) {
  const decision = report.scenario_decision || {};
  const issue = report.user_issue_analysis || {};
  const payloadCount = countPayloadFields(report, config);
  const factorCount = Array.isArray(decision.decision_factors) ? decision.decision_factors.length : 0;
  const actionCount = Array.isArray(report.final_actions) ? report.final_actions.length : 0;
  const guardrailCount = array(issue.blindspots || decision.do_not_overread).length;
  const metrics = [
    { label: 'Payload', value: payloadCount || '待补', note: config.metricPayloadNote || '场景字段覆盖' },
    { label: 'Factors', value: factorCount || '待补', note: config.metricFactorNote || '决策因子数量' },
    { label: 'Actions', value: actionCount || '待补', note: config.metricActionNote || '可执行动作' },
    { label: 'Guardrails', value: guardrailCount || '待补', note: config.metricRiskNote || '禁止过度解读' },
  ];
  return `
      <section class="scenario-metric-strip" aria-label="scenario metrics">
        ${metrics
          .map(
            (metric) => `
              <article class="scenario-metric">
                <span>${escapeHtml(metric.label)}</span>
                <strong>${escapeHtml(metric.value)}</strong>
                <p>${escapeHtml(metric.note)}</p>
              </article>`
          )
          .join('')}
      </section>`;
}

function renderReadinessPanel(report, config) {
  const readiness = evaluateScenarioReadiness(report, config);
  const missing = readiness.missing.length ? readiness.missing.join(' / ') : '暂无明显缺口';
  const evidence = readiness.evidence;
  return `
      <section class="card card--wide scenario-readiness-panel">
        <header class="card-head"><span>决策可用性评估</span><b>Readiness</b></header>
        <div class="scenario-readiness-grid">
          <article>
            <span>Decision Score</span>
            <strong>${escapeHtml(String(readiness.score))}</strong>
            <p>${escapeHtml(readiness.status)}</p>
          </article>
          <article>
            <span>Evidence Binding</span>
            <strong>${escapeHtml(`${evidence.bound}/${evidence.claims || evidence.bound}`)}</strong>
            <p>${escapeHtml(evidence.evidenceSources ? `${evidence.evidenceSources} 个来源进入复核链` : '当前按多 AI 交叉研判输出，未启用外部来源模块')}</p>
          </article>
          <article>
            <span>Missing Keys</span>
            <strong>${escapeHtml(missing)}</strong>
            <p>${escapeHtml(readiness.recommendation)}</p>
          </article>
        </div>
      </section>`;
}

function visualPresetFor(config) {
  return VISUAL_PRESETS[config.taskType] || VISUAL_PRESETS.general_compare;
}

function renderVisualDots(items) {
  const list = items.length ? items : [{ title: '待核验', body: '等待补充场景数据' }];
  return list
    .slice(0, 5)
    .map((item, index) => {
      const x = 22 + ((index * 17) % 58);
      const y = 26 + ((index * 23) % 52);
      return `
        <span class="scenario-dot scenario-dot--${index + 1}" style="left:${x}%;bottom:${y}%;">
          <i></i><b>${escapeHtml(clipText(item.title, 18))}</b>
        </span>`;
    })
    .join('');
}

function renderSpecializedVisual(report, config) {
  const preset = visualPresetFor(config);
  const payload = (report && report.scenario_payload) || {};
  const payloadItems = collectPayloadItems(payload, config.payloadFields).slice(0, 4);
  const decision = report.scenario_decision || {};
  const factorItems = array(decision.decision_factors).map(normalizeItem).slice(0, 3);
  const riskItems = array((report.user_issue_analysis && report.user_issue_analysis.blindspots) || decision.do_not_overread)
    .map(normalizeItem)
    .slice(0, 3);
  const lanes = [
    { title: preset.lanes[0], items: payloadItems.slice(0, 2) },
    { title: preset.lanes[1], items: factorItems.length ? factorItems : payloadItems.slice(2, 4) },
    { title: preset.lanes[2], items: riskItems },
  ];

  return `
      <section class="card card--wide scenario-specialized-visual">
        <header class="card-head"><span>${escapeHtml(preset.title)}</span><b>${escapeHtml(preset.badge)}</b></header>
        <div class="scenario-visual-grid">
          <div class="scenario-axis-map">
            <div class="scenario-axis-map__label scenario-axis-map__label--y">${escapeHtml(preset.y)} ↑</div>
            <div class="scenario-axis-map__label scenario-axis-map__label--x">${escapeHtml(preset.x)} →</div>
            <div class="scenario-axis-map__center">${escapeHtml(preset.center)}</div>
            ${renderVisualDots([...payloadItems, ...factorItems])}
          </div>
          <div class="scenario-lanes">
            ${lanes
              .map(
                (lane, index) => `
                  <article>
                    <span>${String(index + 1).padStart(2, '0')}</span>
                    <strong>${escapeHtml(lane.title)}</strong>
                    <p>${escapeHtml(
                      clipText(
                        lane.items
                          .map((item) => item.title)
                          .filter(Boolean)
                          .join(' / ') || '等待补充关键材料',
                        86
                      )
                    )}</p>
                  </article>`
              )
              .join('')}
          </div>
        </div>
      </section>`;
}

function renderConfiguredPage(report, config) {
  const decision = report.scenario_decision || {};
  const issue = report.user_issue_analysis || {};
  const factors = Array.isArray(decision.decision_factors) ? decision.decision_factors : [];
  const blindspots = array(issue.blindspots || decision.do_not_overread);

  return renderScenarioShell({
    eyebrow: config.eyebrow,
    title: config.title,
    subtitle: config.subtitle,
    className: `scenario-page--configured scenario-page--${config.taskType}`,
    children: `
      ${renderMetricStrip(report, config)}
      ${renderReadinessPanel(report, config)}
      ${renderScenarioActionPanel(report)}
      ${renderSpecializedVisual(report, config)}
      ${renderScenarioCard(
        config.verdictTitle || '直接裁决',
        'Verdict',
        decision.direct_verdict || issue.direct_answer || config.emptyVerdict,
        [decision.evidence_standard || config.evidenceStandard, config.label]
      )}
      ${renderPayloadMatrix(report, config)}
      ${renderScenarioList(config.factorTitle || '决策因子', 'Factors', factors, config.factorFallback)}
      ${renderScenarioList(config.riskTitle || '边界与风险', 'Risk', blindspots, config.riskFallback)}
      ${renderScenarioCard(
        config.actionTitle || '下一步动作',
        'Action',
        decision.recommended_action || array(report.final_actions).join('；') || config.emptyAction,
        array(report.final_actions).slice(0, 4)
      )}
      ${renderScenarioCard(
        config.auditTitle || '可审计口径',
        'Audit',
        clipText(config.auditBody || decision.evidence_standard || config.evidenceStandard, 180),
        config.auditTags || ['来源绑定', '待核验标注', '禁止过度解读']
      )}
    `,
  });
}

function createScenarioTemplate(config) {
  function buildScenarioReport(report) {
    return buildConfiguredReport(report, config);
  }

  function buildReportHtml(payload, structured) {
    const report = buildScenarioReport(structured);
    return injectBeforeEvidenceGrid(factTemplate.buildReportHtml(payload, report), renderConfiguredPage(report, config));
  }

  return {
    buildScenarioReport,
    buildReportHtml,
    config,
  };
}

module.exports = {
  createScenarioTemplate,
  renderConfiguredPage,
};
