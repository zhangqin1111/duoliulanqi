# 场景可执行答案合约检查与修复记录

日期：2026-05-11

## 本轮判断

这不是单个“二手车价格报告”的问题，而是通用产品能力问题：报告不能只做专业分析，还必须把用户的问题转成可执行答案。不同场景的“可执行”含义不同：

- 消费/价格：合理价区间、偏贵线、低价风险线、砍价目标、放弃条件。
- 舆情/事实：是否成事件、传播热度、是否响应、什么证据会改变结论。
- 技术：最可能根因、第一步修复、验证命令、回滚方案。
- 法律：风险等级、证据缺口、材料清单、律师复核问题。
- 医疗：风险分诊、危险信号、就医边界、需补充信息。
- 金融：风险画像、期限边界、禁止动作、待确认指标。
- 竞品/通用：场景化赢家、切换条件、隐性成本、下一步动作。

## 已落地

- 新增 `src/electron/shared/scenario-action-contracts.js`：统一定义 15 类场景的可执行答案合约。
- 所有场景强制输出 `action_brief`、`decision_ladder`、`action_rules`、`red_flags`、`verification_checklist`。
- 消费/价格场景额外强制输出 `price_ladder`、`offer_strategy`，避免报告只有车型/参数，没有价格判断。
- `evaluation-report-prompt.js` 写入硬约束：补全只补评估维度，不擅自写死年份、价格、型号、政策或事实结论。
- `report-schema.js`、`report-completeness-repair.js`、`report-completeness-orchestrator.js` 增加兜底补齐，防止模型漏字段。
- `report-quality-gate.js` 在导出前强制补齐可执行字段，保证 PDF 和系统预览共享同一份结构。
- `consumer-template.js` 新增“价格决策锚点”表，直接展示合理价、砍价目标、偏贵线、低价风险线。
- `configured-template.js` 对法律、医疗、金融、旅行、职业、创作、知识、学习、投资、竞品、通用等场景统一新增“可执行答案”区块。
- `check-scenario-json-contracts.js` 增加回归检查，确保 16 个 fixture 都具备可执行答案字段。

## 验收命令

已通过：

```bash
npm run check:scenario-contracts
npm run check:report-completeness
npm run check:scenario-templates
npm run check:report-schema
npm run check:report-outcome
npm run render:report-fixtures
npm run check:report-layout
npm run check:report-visual
npm run check:routing
npm run check:question-refine
```

## 产品原则

- 用户问“怎么选/怎么看/怎么办”，报告第一页必须回答“现在该怎么判断”。
- 专业分析服务于决策，不允许让图表和术语淹没结论。
- 没有事实来源时可以标注待核验，但不能省略决策框架。
- 补全阶段只补用户没想到的维度和核验口径，不替用户设定具体年份、价格、时间边界或事实答案。
