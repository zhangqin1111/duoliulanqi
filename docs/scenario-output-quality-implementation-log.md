# 场景报告质量闭环实施记录

日期：2026-05-10

本轮目标：把“用户是否真的被报告帮助解决问题”从人工肉测升级为程序可检查、可降级、可回归的产品能力。

## 已完成

- 新增 `src/electron/report/scenario-contracts.js`：统一定义各场景 `scenario_payload` 必填结构，消费选购强制包含候选表、价值权重、人群排序、推荐梯队、人工核验项。
- 新增 `src/electron/report/report-quality-gate.js`：如果证据绑定为 0、存在占位符或缺少场景关键字段，自动把强结论降级为“材料不足/待核验”，禁止继续输出“最佳/首选/真实可购池”等伪确定表达。
- 升级 `src/electron/report/scenarios/consumer-template.js`：新增“消费选购决策台”“候选产品核验表”“推荐裁决梯队”，让消费报告围绕用户购买决策，而不是泛泛信息罗列。
- 扩展 `src/electron/evidence/evidence-claim-linker.js`：候选产品、推荐项、人群排序、风险项都会进入 claim/evidence 绑定链路。
- 更新 `src/electron/renderer/evaluation-report-prompt.js`：结构化 JSON 顶层必须包含 `scenario_payload`，并要求消费/舆情/技术等场景输出可渲染表格。
- 更新 `src/electron/renderer/report-schema.js` 与 `src/electron/report/report-json-repair.js`：保留并修复 `scenario_payload`，避免导出时丢字段。
- 新增 `scripts/check-scenario-json-contracts.js`，并接入 `npm run check:commercial-readiness`。
- 强化 `scripts/check-report-outcome-quality.js`：拦截 `XXXX`、无证据强核验、消费报告缺候选表等问题。
- 更新商业 fixtures，新增消费候选表、权重、推荐梯队与人工核验项样例。

## 当前验收

已通过：

```bash
npm run check:commercial-readiness
```

覆盖项包括：路由、schema、JSON 修复、分析状态、问题补全策略、AI provider、API-only、证据层、高风险、授权、商业支持、场景模板、场景契约、PDF 渲染、布局、结果质量与视觉回归。

## 产品原则

- 补全层只补“任务维度、核验口径、输出字段、追问方向”，不替用户确定事实。
- 事实由多模型回答与证据绑定层负责。
- 报告层只消费结构化 JSON，不伪造车型、价格、时间、配置或来源。
- 强结论必须绑定证据；无证据时宁可降级，也不能给用户“看起来很确定”的误导性报告。
