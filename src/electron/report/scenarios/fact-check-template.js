'use strict';

const { createScenarioTemplate } = require('./configured-template');

module.exports = createScenarioTemplate({
  taskType: 'fact_check',
  variant: 'fact_check_verification_v1',
  label: '内容真伪核验',
  eyebrow: 'CLAIM VERIFICATION ROOM',
  title: '真伪核验裁决台',
  subtitle: '把传闻、截图、爆料或单句主张拆成可核验 claim、来源等级、反证线索和最终可信倾向，避免把多模型一致误当事实。',
  evidenceStandard: '优先采信原始发布源、权威机构、完整上下文、可复核材料和反证排查；无来源或二手转述必须标注待核验。',
  doNotOverread: ['不把模型共识当外部证据', '不把截图/传闻直接写成事实', '不在缺少原始来源时判定为真'],
  keyFindings: ['每条主张必须拆成 claim、证据、反证和可信倾向。', '证据不足时应输出“无法判真”，而不是强行给真假。'],
  finalActions: ['寻找原始发布源', '核验时间地点主体', '补充反证材料'],
  payloadTitle: '主张与证据结构',
  payloadFields: [
    { key: 'claim_table', label: '主张' },
    { key: 'source_table', label: '来源' },
    { key: 'verification_path', label: '核验路径' },
  ],
  payloadFallback: [
    { title: '主张拆解', body: '先把原始内容拆成可验证的最小事实单元。' },
    { title: '来源等级', body: '区分一手来源、权威来源、二手转述和无源说法。' },
    { title: '反证路径', body: '寻找能推翻或限制主张的材料。' },
  ],
  factorFallback: [
    { title: '来源可信度', body: '来源越接近原始事件，权重越高。' },
    { title: '交叉验证', body: '至少需要独立来源互证。' },
    { title: '上下文完整度', body: '缺上下文时不能强判。' },
  ],
  riskFallback: [
    { title: '旧闻翻炒', body: '时间错配会制造伪新事件。' },
    { title: '主体混淆', body: '同名主体或相似场景容易误判。' },
    { title: 'AI幻觉补全', body: '模型可能补出不存在的来源。' },
  ],
});
