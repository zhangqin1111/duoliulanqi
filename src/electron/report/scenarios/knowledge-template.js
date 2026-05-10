'use strict';

const { createScenarioTemplate } = require('./configured-template');

module.exports = createScenarioTemplate({
  taskType: 'knowledge_brief',
  variant: 'knowledge_brief_v1',
  label: '知识简报',
  eyebrow: 'KNOWLEDGE BRIEF',
  title: '知识结构裁决台',
  subtitle: '把宽泛知识问题拆成定义边界、机制解释、共识点、争议点、误区和延伸阅读方向，让用户快速建立可靠理解。',
  evidenceStandard: '优先采信权威教材、标准文档、论文、官方说明和可复核定义；类比和个人经验只能作为辅助解释。',
  doNotOverread: ['不把类比当事实', '不把过时定义当最新共识', '不忽略概念边界'],
  keyFindings: ['知识简报必须先给一句话答案，再解释边界。', '不同解释路径要合并同类项并标注争议。'],
  finalActions: ['核验权威定义', '补充关键资料', '整理延伸阅读'],
  payloadTitle: '知识地图',
  payloadFields: [
    { key: 'concept_map', label: '概念' },
    { key: 'consensus_points', label: '共识' },
    { key: 'open_questions', label: '开放问题' },
  ],
  payloadFallback: [
    { title: '核心定义', body: '先给清晰定义和适用范围。' },
    { title: '机制解释', body: '说明为什么成立。' },
    { title: '常见误区', body: '剔除容易误导的说法。' },
  ],
  factorFallback: [
    { title: '准确性', body: '定义是否严谨。' },
    { title: '解释力', body: '是否能回答为什么。' },
    { title: '可迁移性', body: '是否能用于新问题。' },
  ],
  riskFallback: [
    { title: '过度简化', body: '为了易懂牺牲准确性。' },
    { title: '概念偷换', body: '相近概念混用。' },
    { title: '资料过时', body: '标准或领域共识已变化。' },
  ],
});
