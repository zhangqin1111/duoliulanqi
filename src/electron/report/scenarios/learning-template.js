'use strict';

const { createScenarioTemplate } = require('./configured-template');

module.exports = createScenarioTemplate({
  taskType: 'learning_research',
  variant: 'learning_research_path_v1',
  label: '学习研究路径',
  eyebrow: 'LEARNING RESEARCH BRIEF',
  title: '学习研究路径裁决台',
  subtitle: '把学习或研究问题拆成目标、知识框架、资料路径、阶段里程碑、练习计划和验收标准。',
  evidenceStandard: '优先采信教材、论文、课程大纲、官方文档和高质量资料；未核验资料只作为候选阅读。',
  doNotOverread: ['不堆砌资料', '不忽略用户基础', '不把单一课程当完整路径'],
  keyFindings: ['学习路径必须分阶段。', '资料推荐必须服务目标和产出。'],
  finalActions: ['确认当前基础', '设定阶段目标', '建立练习和验收机制'],
  payloadTitle: '学习研究结构',
  payloadFields: [
    { key: 'learning_path', label: '路径' },
    { key: 'resource_table', label: '资源' },
    { key: 'milestones', label: '里程碑' },
    { key: 'practice_plan', label: '练习' },
  ],
  payloadFallback: [
    { title: '目标拆解', body: '明确要学会什么、产出什么。' },
    { title: '资料路径', body: '按基础到进阶排序。' },
    { title: '验收标准', body: '用练习和产出验证学习效果。' },
  ],
  factorFallback: [
    { title: '难度匹配', body: '路线应匹配用户基础。' },
    { title: '系统性', body: '避免只看碎片资料。' },
    { title: '产出闭环', body: '每阶段都有可验证成果。' },
  ],
  riskFallback: [
    { title: '资料过载', body: '过多资料会降低执行率。' },
    { title: '基础缺口', body: '跳过基础会导致后续卡住。' },
    { title: '过时资料', body: '技术和标准可能已更新。' },
  ],
});
