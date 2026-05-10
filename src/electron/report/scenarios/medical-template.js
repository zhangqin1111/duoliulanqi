'use strict';

const { createScenarioTemplate } = require('./configured-template');

module.exports = createScenarioTemplate({
  taskType: 'medical_health',
  variant: 'medical_health_triage_v1',
  label: '医疗健康初筛',
  eyebrow: 'HEALTH SCREENING BRIEF',
  title: '健康风险初筛裁决台',
  subtitle: '把健康问题拆成症状、危险信号、风险分层、就医建议和医生问题，只做信息初筛，不做诊断和处方。',
  evidenceStandard: '需要症状持续时间、年龄、既往病史、检查结果、药物过敏和医生判断；远程信息不足时必须建议线下就医。',
  doNotOverread: ['不输出确定诊断', '不提供具体用药剂量', '不替代医生判断', '不淡化危险信号'],
  keyFindings: ['医疗报告必须先判断是否需要及时就医。', '任何建议都不能替代医生诊断。'],
  finalActions: ['补充症状和病史', '记录检查指标', '必要时及时就医'],
  payloadTitle: '健康风险结构',
  payloadFields: [
    { key: 'symptom_summary', label: '症状' },
    { key: 'risk_triage', label: '分诊' },
    { key: 'care_actions', label: '行动' },
    { key: 'doctor_questions', label: '医生问题' },
  ],
  payloadFallback: [
    { title: '危险信号', body: '先识别是否需要立即就医。' },
    { title: '信息缺口', body: '补充病史、指标和持续时间。' },
    { title: '医生问题', body: '整理问诊时要确认的事项。' },
  ],
  factorFallback: [
    { title: '紧急程度', body: '危险信号优先级最高。' },
    { title: '信息完整度', body: '缺关键指标时不能判断。' },
    { title: '误导风险', body: '错误安抚或错误用药风险高。' },
  ],
  riskFallback: [
    { title: '远程误判', body: '文字描述可能不完整。' },
    { title: '延误就医', body: '危险信号不能等待模型结论。' },
    { title: '用药风险', body: '剂量和禁忌必须由医生判断。' },
  ],
});
