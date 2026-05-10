'use strict';

const { createScenarioTemplate } = require('./configured-template');

module.exports = createScenarioTemplate({
  taskType: 'legal_risk',
  variant: 'legal_risk_screening_v1',
  label: '法律合规初筛',
  eyebrow: 'LEGAL RISK SCREENING',
  title: '法律/合规风险裁决台',
  subtitle: '把法律问题拆成事实前提、适用辖区、规则方向、证据缺口和律师复核问题，只做风险初筛，不替代正式法律意见。',
  evidenceStandard: '需要合同全文、适用辖区、主体身份、行为证据、沟通记录和专业法律意见；缺关键材料时不得正式定性。',
  doNotOverread: ['不承诺胜诉', '不作定罪/违法最终结论', '不替代律师意见', '不忽略管辖和事实前提'],
  keyFindings: ['法律结论高度依赖完整事实和辖区。', '报告只能输出风险层级和待复核问题。'],
  finalActions: ['补充合同/证据全文', '确认适用辖区', '交由律师复核'],
  payloadTitle: '法律风险材料结构',
  payloadFields: [
    { key: 'issue_table', label: '争议点' },
    { key: 'evidence_table', label: '证据' },
    { key: 'risk_levels', label: '风险等级' },
    { key: 'lawyer_questions', label: '律师问题' },
  ],
  payloadFallback: [
    { title: '事实前提', body: '明确已知事实和仍需证明的事实。' },
    { title: '规则方向', body: '识别可能适用的法律/合同规则。' },
    { title: '复核问题', body: '整理给律师确认的问题清单。' },
  ],
  factorFallback: [
    { title: '证据完整度', body: '证据越完整，判断越可靠。' },
    { title: '辖区确定性', body: '不同地区规则和实践差异明显。' },
    { title: '损失规模', body: '影响后续行动优先级。' },
  ],
  riskFallback: [
    { title: '事实缺口', body: '缺合同全文或沟通记录会导致误判。' },
    { title: '过度定性', body: '初筛不能替代正式法律意见。' },
    { title: '时效风险', body: '诉讼/仲裁时效需要单独核验。' },
  ],
});
