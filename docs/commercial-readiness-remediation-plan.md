# 滤镜商业版整改路线图

> 目标：把当前“可演示 MVP”升级为可稳定交付、可收费、可持续迭代的商业版本。

## 1. 当前结论

当前项目已经具备核心雏形：多 AI 分发、差异追问、污染剔除、结构化报告、PDF 导出、授权控制、Electron 桌面交付。

但商业版还不能只看“功能有没有”，必须看三件事：

- 稳不稳定：客户随便问、模型卡住、网页变动、PDF 导出失败时，系统能否恢复。
- 准不准确：任务路由、问题补全、报告模板、证据采信标准是否匹配用户真实意图。
- 值不值钱：报告是否足够专业、可信、可决策，而不是普通 AI 总结。

当前商业成熟度评估：`MVP+ / Demo 可讲，交付风险偏高`。

建议目标评分：

- 当前：约 `62-68 / 100`
- 商业内测版：`80 / 100`
- 正式交付版：`90+ / 100`

## 2. 整改优先级定义

P0：不修会影响客户交付、报告可信度或核心闭环。

P1：影响商业竞争力、专业感、稳定性和规模化交付。

P2：增强壁垒、效率、体验和后续 SaaS 化能力。

## 3. P0 必须整改项

### P0-01 任务路由必须稳定

问题：

当前已经新增多场景路由，但仍以关键词和规则为主。曾出现 `iPhone17各个机型对比` 被路由到竞品链路，导致报告误判“产品不存在”。

影响：

路由错，后续补全、追问、报告模板都会错，最终客户会认为系统不可信。

整改方案：

- 建立 `routing-test-cases.js` 测试集。
- 覆盖舆情、事实核验、竞品、消费选购、技术、创作、医疗、金融、旅行、职业、知识简报等场景。
- 增加“同系列产品/型号/版本对比”优先进入消费选购。
- 增加低置信度回退策略：不确定时走通用简报，不强行裁决。
- 后续可增加小模型分类器：规则初筛 + 模型复判。

验收标准：

- 100 条典型问题路由准确率 >= 92%。
- 高风险医疗/金融/法律不得误入普通建议链路。
- 消费选购不得误入事实打假或竞品真实性核验。

涉及模块：

- `src/electron/renderer/task-router.js`
- `src/electron/renderer/workflows/`
- `docs/scenario-workflow-routing-plan.md`

### P0-02 报告生成必须匹配场景

问题：

目前所有场景仍共用 Fact Template，只是通过 profile 和 prompt 改口径。消费、技术、创作等场景仍可能被“去伪存真”叙事影响。

影响：

报告容易显得专业但不贴题，比如购买问题变成真假核验，技术问题变成观点差异分析。

整改方案：

- 为高频商业场景增加专属报告组件。
- 首批优先：消费选购、舆情、公关/事实核验、技术诊断。
- 报告模板按“用户真实目标”组织，而不是按统一证据黑匣子硬套。

验收标准：

- 消费报告必须包含：机型/产品对比表、价值构成、推荐梯队、适合人群、购买风险、待核验项。
- 技术报告必须包含：根因树、修复优先级、验证清单、回归风险。
- 舆情报告必须包含：舆论裁决、情绪结构、阵营分布、传播路径、风险动作。

涉及模块：

- `src/electron/report/fact-template.js`
- `src/electron/report/fact-issue-section.js`
- `src/electron/report/scenario-report-profiles.js`
- 新增 `src/electron/report/scenarios/`

### P0-03 JSON 输出必须强校验

问题：

最终报告依赖模型输出 JSON。模型一旦漏字段、字段类型错、结构跑偏，报告就会降级、截断或内容失真。

影响：

报告稳定性和专业感不可控。

整改方案：

- 引入 schema validate。
- 对每个 task_type 定义最小必填字段。
- JSON 解析失败时，自动调用修复 prompt。
- 修复失败时，生成“部分材料报告”，明确缺失字段。

验收标准：

- JSON 解析失败率可观测。
- 结构化字段缺失时有明确 fallback，不出现空白大卡片。
- 同一输入连续生成 5 次，报告结构稳定。

涉及模块：

- `src/electron/renderer/report-schema.js`
- `src/electron/renderer/evaluation-report-prompt.js`
- `src/electron/renderer/reporting.js`

### P0-04 多模型任务状态机必须准确

问题：

曾出现 AI 仍在输出但系统判断完成，或者长时间等待看似无反应。

影响：

用户会觉得系统卡死或报告不完整。

整改方案：

- 把任务状态抽象成状态机：`idle -> refining -> dispatching -> collecting -> extracting -> following_up -> cleansing -> reporting -> completed/failed`。
- 每个 AI 窗口独立状态：未发送、已发送、输入中、输出中、稳定等待、完成、失败、需人工验证。
- 不再只用“是否有文本”判断完成，要结合 DOM 稳定时间、停止按钮、输入框状态、最后变化时间。

验收标准：

- AI 输出中不会提前进入报告生成。
- 任一模型失败时，可继续使用已有材料生成部分报告。
- UI 明确显示每个阶段和失败原因。

涉及模块：

- `src/electron/renderer/truth-seeking.js`
- `src/electron/renderer/ai-conversation.js`
- `src/electron/renderer/reporting.js`
- `src/electron/renderer/chat-flow-presenter.js`

### P0-05 失败重试与阶段恢复

问题：

DashScope 超时、PDF 导出失败、网页 AI 卡住时，用户需要重新跑完整流程。

影响：

长任务成本高，失败体验差。

整改方案：

- 每个阶段记录输入、输出、错误。
- 支持“重试当前阶段”。
- 支持“跳过失败模型继续生成”。
- 支持“用当前材料生成报告”。
- 支持导出失败后重新导出，不重新跑分析。

验收标准：

- Qwen 超时后可重试报告生成。
- 单个网页模型失败不阻塞全部流程。
- PDF 导出失败后可再次点击导出成功。

涉及模块：

- `src/electron/renderer/truth-seeking-core.js`
- `src/electron/renderer/truth-seeking.js`
- `src/electron/ipc/pdf-export-ipc.js`
- `src/electron/dashscope-qwen.js`

### P0-06 PDF 视觉回归测试

问题：

曾出现文字截断、图表底部标签只显示一半、最终裁决卡内容溢出等问题。

影响：

客户看到 PDF 版式问题，会直接降低信任。

整改方案：

- 增加 PDF 渲染测试脚本。
- 对每个模板生成样例 PDF。
- 自动转图片检查页面数量、文本块越界、关键标题是否出现。
- 建立人工验收用的 contact sheet。

验收标准：

- 重点模板无文字越界。
- 关键卡片无明显截断。
- 每次报告模板改动都能快速回归。

涉及模块：

- `src/electron/report/`
- 新增 `scripts/report-visual-regression.js`
- `tmp_pdf_review/` 仅作为临时输出，不提交正式产物。

### P0-07 打包流程必须稳定

问题：

便携版可生成，但 NSIS 安装包出现过 `spawn EPERM`。

影响：

无法稳定交付安装版。

整改方案：

- 区分 `dist:portable`、`dist:installer`、`dist:dir`。
- 构建前清理旧安装包和锁定进程。
- 避免中文乱码 productName/shortcutName。
- 输出构建日志和产物校验。

验收标准：

- 一键生成便携版。
- 一键生成安装版。
- 产物文件名、安装器标题、快捷方式显示正常中文。

涉及模块：

- `package.json`
- `build/`
- `scripts/`

## 4. P1 重要整改项

### P1-01 独立证据/搜索层

问题：

当前主要依赖网页 AI 和 Qwen 总结，缺少独立实时证据层。

影响：

报告容易变成“AI 评价 AI”，可信度不足。

整改方案：

- 接入可配置搜索源：通义联网搜索、智谱 Web Search、OpenAI/Claude Web Search、普通搜索 API。
- 证据层输出统一结构：标题、来源、时间、URL、摘要、可信度、引用片段。
- 把证据材料喂给多模型，而不是让模型凭记忆回答。

验收标准：

- 报告可展示引用来源。
- 实时问题不再完全依赖模型知识截止。
- 模型差异可追溯到证据差异。

### P1-02 API 模型作为稳定底座

问题：

网页自动化容易受验证码、登录态、页面改版影响。

整改方案：

- API 模型优先：Qwen、DeepSeek、OpenAI、Claude、智谱。
- 网页自动化作为增强插件。
- 支持模型能力标签：联网、推理、中文、长文、低成本。

验收标准：

- 无网页模型登录时，系统仍可完成基础报告。
- 每个模型失败有替代模型。

### P1-03 报告专属图表组件

重点场景：

- 消费选购：价格-价值四象限、机型对比表、预算推荐矩阵。
- 技术诊断：根因树、修复优先级矩阵、验证 checklist。
- 舆情：传播路径图、情绪趋势、阵营演化。
- 创作：创意评分卡、A/B 方案表。
- 金融/医疗：风险分层、行动边界卡。

验收标准：

- 每个重点场景至少 3 个专属图表。
- 图表服务结论，而不是装饰。

### P1-04 用户体验简化

问题：

多 AI 浏览器窗口对普通客户复杂。

整改方案：

- 默认展示流程聊天和报告卡片。
- AI 浏览器区域可隐藏/展开。
- 给每个模型加“用途说明”。
- 任务完成后优先展示报告，而不是网页内容。

验收标准：

- 新用户 1 分钟内知道怎么问、怎么看报告、怎么导出。

### P1-05 日志与诊断包

整改方案：

- 记录任务 ID、问题、路由、模型、阶段耗时、错误、报告导出路径。
- 支持一键导出诊断包。
- 敏感内容脱敏。

验收标准：

- 客户反馈问题时，可通过诊断包定位。

### P1-06 授权系统正规化

整改方案：

- 设备指纹。
- 授权有效期。
- 离线宽限。
- 到期提醒。
- 授权校验日志。

验收标准：

- 一月码、一年码、永久码均可控。
- 到期后功能受控，不误伤已授权客户。

### P1-07 高风险合规边界

涉及场景：

- 医疗健康。
- 金融规划。
- 法律合规。

整改方案：

- 模板强制免责声明。
- 禁止输出诊断、处方、保证收益、具体买卖指令、正式法律意见。
- 输出风险分层、信息补全和专业人士复核建议。

验收标准：

- 高风险问题不会生成越界结论。

### P1-08 成本控制

整改方案：

- 记录每次任务模型数、轮次、token、耗时。
- 不同套餐限制模型数量、报告深度、导出次数。
- 多轮追问按差异严重度触发。

验收标准：

- 单次报告成本可估算。
- 可设计商业套餐。

## 5. P2 增强整改项

### P2-01 远程配置与热更新

目标：

不重新发版也能更新模型列表、prompt、路由规则、报告模板参数。

### P2-02 报告历史库

目标：

保存历史问题、模型回答、报告、PDF 路径、导出时间。

### P2-03 团队协作能力

目标：

支持多人共享报告、批注、版本对比、导出审计。

### P2-04 SaaS 化准备

目标：

后续可迁移到云端任务队列、用户账号、套餐计费、组织管理。

### P2-05 行业模板包

目标：

形成可售卖行业包：

- 公关舆情包。
- 消费选购包。
- 企业采购/竞品包。
- 技术诊断包。
- 投研政策包。

## 6. 当前代码结构债务

结构审计显示的重点文件：

- `src/electron/report/fact-template-styles.js`：1147 行，样式过大。
- `src/electron/renderer/ui-wiring.js`：536 行，UI/state 混合。
- `src/electron/renderer/app.js`：523 行，仍有状态、报告、UI、编排混合。
- `src/electron/report/chart-svg.js`：505 行，图表渲染偏大。
- `src/electron/renderer/truth-seeking.js`：340 行，状态、prompt、编排仍混合。

整改建议：

- `fact-template-styles.js` 拆成 `base.css.js`、`cover.css.js`、`issue.css.js`、`evidence.css.js`、`scenario.css.js`。
- `ui-wiring.js` 拆成 `toolbar-wiring.js`、`model-picker-wiring.js`、`input-wiring.js`。
- `app.js` 保持 bootstrap，只做组合。
- `truth-seeking.js` 抽出 `analysis-state-machine.js` 和 `stage-runner.js`。
- `chart-svg.js` 拆成按图表类型的模块。

## 7. 商业版里程碑

### M1：稳定内测版

目标周期：1-2 周。

必须完成：

- 路由测试集。
- JSON schema 校验。
- 失败重试。
- PDF 回归测试。
- 安装/便携打包稳定。

验收：

- 20 个真实问题连续跑通。
- 无明显卡死。
- 报告无版式硬伤。

### M2：行业演示版

目标周期：2-4 周。

必须完成：

- 舆情专属报告。
- 消费选购专属报告。
- 技术诊断专属报告。
- 模型 API 底座。
- 基础证据搜索层。

验收：

- 3 个行业 Demo 报告达到可销售展示水平。
- 报告具备引用/证据痕迹。

### M3：商业交付版

目标周期：4-8 周。

必须完成：

- 授权系统正规化。
- 日志与诊断包。
- 高风险合规模板。
- 成本统计。
- 远程配置基础能力。

验收：

- 可交给真实客户试用。
- 可定位客户问题。
- 可控制授权和成本。

## 8. 验收用问题集建议

消费选购：

- iPhone17各个机型对比。
- iPhone17哪个性价比最高。
- 预算5000买什么手机。

舆情：

- 郭德纲最近舆论怎么样。
- 某品牌翻车了吗，要不要回应。

事实核验：

- 网传某截图是真的吗。
- 这段视频里的说法可信吗。

技术：

- 这段代码报错怎么修。
- Electron 打包失败怎么排查。

创作：

- 帮我写小红书文案。
- 做一个短视频脚本。

医疗健康：

- 体检报告血压高怎么办。
- 咳嗽发烧三天需要去医院吗。

金融：

- 我想买基金怎么配置。
- 房贷提前还款划算吗。

职业：

- 帮我优化简历。
- 这个岗位我适合吗。

旅行：

- 上海周末两日游怎么安排。
- 北京亲子游路线推荐。

知识简报：

- 什么是大模型智能体。
- 为什么多模型对比能减少幻觉。

## 9. 一句话战略

不要把产品做成“很多 AI 的浏览器”。

要把产品做成：

`多模型交叉质询 + 独立证据层 + 场景化决策报告`

商业壁垒来自：

- 问题分诊。
- 证据采集。
- 差异追问。
- 污染剔除。
- 专业报告。
- 交付稳定性。

## 10. 实施任务细化

本节把前面的整改项继续拆成可开发任务卡。后续每次开工优先从 `P0` 任务卡中取一项，完成代码、测试、文档和验收样例后再进入下一项。

### 10.1 P0-01 任务路由稳定化

目标：

让客户随便问一句时，系统能稳定进入正确链路，避免“消费问题变事实打假”“技术问题变观点对比”“医疗问题变普通建议”。

任务拆分：

- 新增 `src/electron/renderer/task-router-test-cases.js`，集中维护路由测试样例。
- 新增 `scripts/check-task-routing.js`，在 Node 环境中加载 `task-router.js` 并执行测试。
- 每个任务类型至少 10 条正例、5 条反例。
- 增加冲突样例：`iPhone17各个机型对比`、`两个 SaaS 系统竞品对比`、`某品牌最近怎么样`、`这段话是真的吗`。
- 增加高风险优先级规则：医疗、金融、法律命中时优先进入高风险链路。
- 增加同系列消费规则：`机型/型号/版本/系列 + 对比/区别/怎么选` 优先消费选购。
- 增加路由结果调试信息：命中关键词、shape hints、最终置信度、降级原因。

开发步骤：

1. 抽出 `TASKS` 和 `inferByShape` 可测试接口。
2. 建测试样例。
3. 跑测试，修误判。
4. 把测试脚本加入打包前检查或手动 QA 清单。

验收用例：

| 输入 | 期望链路 |
| --- | --- |
| iPhone17各个机型对比 | consumer_purchase |
| iPhone17哪个性价比最高 | consumer_purchase |
| 两个 SaaS 系统竞品对比 | competitor_analysis |
| 郭德纲最近舆论怎么样 | public_opinion |
| 网传这张截图是真的吗 | fact_check |
| 体检报告血压高怎么办 | medical_health |
| 我想买基金怎么配置 | finance_planning |
| 这段代码报错怎么修 | technical_diagnosis |
| 帮我写小红书文案 | creative_content |
| 什么是大模型智能体 | knowledge_brief |

完成标准：

- 路由测试样例不少于 120 条。
- 总准确率 >= 92%。
- 高风险问题召回率 >= 98%。
- 消费选购与竞品对比混淆率 <= 5%。

### 10.2 P0-02 场景化报告模板

目标：

让报告不再只是统一的 Fact Black Box 外壳，而是根据用户任务呈现对应的专业报告形态。

首批专属模板：

- `consumer-purchase-report-section.js`
- `public-opinion-report-section.js`
- `technical-diagnosis-report-section.js`

消费选购报告必须包含：

- 机型/产品横向对比表。
- 价格-价值判断区。
- 首选/备选/不建议购买矩阵。
- 用户人群匹配表。
- 待核验价格/配置/渠道项。
- 最终购买建议卡。

技术诊断报告必须包含：

- 根因假设树。
- 排查优先级矩阵。
- 修复方案卡。
- 验证 checklist。
- 回归风险列表。

舆情报告必须包含：

- 一句话舆情裁决。
- 情绪结构。
- 阵营结构。
- 传播路径。
- 风险动作。
- 后续监测指标。

开发步骤：

1. 在 `src/electron/report/scenarios/` 下创建场景组件目录。
2. 抽象通用卡片和图表容器。
3. 在 `fact-template.js` 中按 `task_type` 注入专属 section。
4. 每个场景准备一份 mock structured report。
5. 导出 PDF 做视觉验收。

完成标准：

- 消费、技术、舆情三类报告不再只显示通用“证据漏斗”。
- 每类报告至少 3 个专属图表/表格。
- 真实样例 PDF 无空白卡片、无明显错位、无模板跑偏。

### 10.3 P0-03 JSON Schema 校验与修复

目标：

让模型输出不稳定时，系统能自动识别、修复、降级，而不是生成错版报告。

任务拆分：

- 新增 `src/electron/renderer/report-schema-definitions.js`。
- 定义基础 schema：`meta`、`executive_conclusion`、`scenario_decision`、`user_issue_analysis`、`fact_map`、`dispute_map`、`evidence_funnel`、`model_profiles`、`source_diagnosis`、`final_actions`。
- 定义场景扩展 schema：消费、技术、舆情、高风险。
- 新增 `validateReportJson(raw, taskType)`。
- 新增 `repairReportJson(rawText, validationErrors, taskRoute)` prompt。
- 在 `reporting.js` 中接入校验-修复-降级流程。

错误处理策略：

- JSON 无法解析：调用修复 prompt。
- JSON 可解析但缺关键字段：补默认字段并记录 warning。
- 场景字段缺失：生成基础报告，但在报告卡中提示“场景增强数据不足”。
- 修复失败：生成当前材料报告，不阻断导出。

完成标准：

- 人工构造 10 种坏 JSON，系统不崩溃。
- 缺字段时报告仍可导出。
- 修复日志可查看。

### 10.4 P0-04 任务状态机

目标：

让系统准确知道任务处于哪一步、哪个模型是否完成、是否可以生成报告。

建议新增模块：

- `src/electron/renderer/analysis-state-machine.js`
- `src/electron/renderer/model-run-state.js`

全局状态：

```text
idle
refining
dispatching
collecting
extracting_diffs
following_up
cleansing
reporting
completed
failed
partial_completed
```

单模型状态：

```text
not_sent
sent
inputting
waiting
streaming
stable
completed
failed
needs_human_verification
```

完成判定：

- 至少一个有效模型完成。
- 等待稳定时间超过阈值。
- 输入框可用或停止按钮消失。
- 文本最近变化时间超过阈值。
- 页面没有明显验证码/登录阻塞。

完成标准：

- AI 仍在输出时不会提前生成报告。
- 单模型失败会显示失败原因。
- 所有阶段都有可见 UI 状态。

### 10.5 P0-05 阶段重试与恢复

目标：

长流程失败后不从头再来。

任务拆分：

- 定义 `analysisSession.stages`。
- 每个 stage 保存：`input`、`output`、`status`、`startedAt`、`endedAt`、`error`。
- UI 增加按钮：重试本阶段、跳过失败模型、用当前材料生成报告。
- PDF 导出失败后保留 structured report。
- Qwen 超时后允许重试，并显示上次耗时。

完成标准：

- Qwen 超时后可点击重试。
- PDF 导出失败后可再次导出。
- 网页模型失败后可继续报告。

### 10.6 P0-06 PDF 视觉回归

目标：

避免每次改报告后出现文字截断、图表溢出、卡片跨页断裂。

任务拆分：

- 新增 `scripts/render-report-fixtures.js`。
- 新增 `scripts/check-report-layout.js`。
- 新增 `fixtures/reports/`，存放每类 task_type 的结构化 JSON 样例。
- 使用 Electron 或 Chromium 把 HTML 导成 PDF。
- 使用 PyMuPDF 检查文本块是否越界。
- 输出 contact sheet 到 `tmp_pdf_review/`。

重点检查：

- 页面数量。
- 标题是否存在。
- 文本块是否越界。
- 是否有空白大卡片。
- 最终裁决是否被截断。
- 图表标签是否被裁切。

完成标准：

- 每个重点模板都有 fixture。
- 修改报告样式后能 3 分钟内完成回归。
- 截断问题可被脚本发现或人工快速确认。

### 10.7 P0-07 打包稳定

目标：

稳定输出客户可用的便携版和安装版。

任务拆分：

- 新增 `dist:portable`。
- 新增 `dist:installer`。
- 新增 `scripts/prebuild-clean.js` 清理旧安装包、临时 blockmap、残留 NSIS 文件。
- 修正 `package.json` 中 productName、description、shortcutName 的中文乱码。
- 打包完成后输出产物路径、大小、hash。
- 增加 `release/README-交付说明.md`。

完成标准：

- `npm run dist:portable` 成功。
- `npm run dist:installer` 成功。
- 产物中文名正常。
- 安装版不再生成 589KB 的坏安装包。

## 11. P1 任务细化

### 11.1 独立证据层

目标：

让报告从“AI 互相评价”升级为“AI 围绕证据裁决”。

阶段 1：证据结构定义。

```js
{
  id: 'E1',
  title: '',
  source: '',
  url: '',
  publishedAt: '',
  capturedAt: '',
  snippet: '',
  evidenceType: 'official | media | social | docs | search | user_file',
  credibility: 0,
  relatedClaims: []
}
```

阶段 2：接入搜索源。

- DashScope 联网搜索。
- 智谱 Web Search。
- OpenAI/Claude Web Search。
- 普通搜索 API。
- 用户本地文件/粘贴材料。

阶段 3：证据进入工作流。

- 问题补全后先判断是否需要实时证据。
- 搜索层生成 evidence pack。
- 分发给模型时附带 evidence pack。
- 最终报告引用 evidence pack。

完成标准：

- 实时问题能看到引用来源。
- 每条强结论至少关联一个证据。
- 没证据时明确标注“不足以强裁决”。

### 11.2 API 模型底座

目标：

减少对网页自动化的依赖。

任务拆分：

- 新增 `src/electron/ai-providers/`。
- provider 接口统一：`complete`、`stream`、`webSearch`、`capabilities`。
- 首批 provider：Qwen、DeepSeek、OpenAI、Claude、Zhipu。
- 模型配置迁移到 JSON。
- UI 模型选择区显示 API/网页/联网/推理标签。

完成标准：

- 不打开网页也能生成基础报告。
- 任一 API 失败可 fallback。
- 任务成本可记录。

### 11.3 专属图表组件

新增组件建议：

消费：

- `ProductComparisonTable`
- `PriceValueQuadrant`
- `BuyerSegmentMatrix`
- `RecommendationTier`

技术：

- `RootCauseTree`
- `FixPriorityMatrix`
- `VerificationChecklist`
- `RegressionRiskCard`

舆情：

- `NarrativeTimeline`
- `SentimentBoard`
- `StanceMap`
- `PropagationPath`

创作：

- `CreativeScoreCard`
- `ABPlanTable`
- `AudienceToneMap`

完成标准：

- 组件可复用。
- 每个组件有 mock 数据。
- PDF 中显示稳定。

### 11.4 日志与诊断包

日志内容：

- app version。
- license status。
- task id。
- original question。
- route result。
- selected models。
- stage duration。
- errors。
- report path。

诊断包内容：

- `logs/task-xxx.json`
- `logs/app.log`
- `report-structured.json`
- `environment.json`

隐私要求：

- 导出前提示用户。
- API key、授权码、cookie 必须脱敏。

完成标准：

- 客户发来诊断包即可定位 80% 常见问题。

### 11.5 授权正规化

授权状态：

```text
inactive
active
expiring
expired
grace_period
revoked
```

能力控制：

- 未授权：只能试用，限制模型数/导出次数。
- 月卡：基础功能。
- 年卡：完整功能。
- 永久：离线宽限更长。

验收：

- 修改系统时间不能轻易绕过。
- 到期提示提前 7 天出现。
- 授权失败有清晰原因。

### 11.6 用户体验简化

目标：
让用户只感知“输入问题 → 系统推理 → 查看报告”，不再被多模型窗口、技术状态、失败重试细节打断。

核心原则：
- 左侧永远是主流程聊天区。
- 右侧模型区可以隐藏，但系统流程不能依赖用户盯着右侧。
- 失败、等待、重试都必须以“系统正在处理”的语言表达，而不是暴露工程错误。
- 报告卡片、差异详情、失败恢复都用浮层，不挤压主布局。

建议模块：
- `src/electron/renderer/conversation-timeline.js`
- `src/electron/renderer/process-message-presenter.js`
- `src/electron/renderer/floating-panel-manager.js`
- `src/electron/renderer/recovery-actions-view.js`

主流程消息类型：

```js
{
  id: '',
  role: 'user | system | assistant | report | warning',
  stage: 'refining | dispatching | collecting | extracting | followup | cleansing | reporting | completed',
  title: '',
  summary: '',
  detail: '',
  actions: [],
  status: 'pending | running | completed | failed | partial'
}
```

关键交互：
- 用户发送后立即出现“正在补全问题”卡片。
- 补全成功后显示“已补全为：xxx”，并允许复制。
- 分发阶段显示已发送模型数、完成模型数、异常模型数。
- 差异抽取完成后出现“查看差异详情”按钮。
- 报告生成完成后出现大浮层预览，不再只在卡片内小窗口滚动。
- 失败时提供“重试本阶段”“用当前材料生成”“查看诊断信息”三个动作。

完成标准：
- 用户不打开右侧模型区也能完成完整流程。
- 所有报告入口都能通过左侧聊天卡片进入。
- 模型选择浮层不占用右侧浏览器布局空间。
- 失败卡片必须有下一步动作，不允许只展示错误文本。

### 11.7 高风险合规边界

目标：
商业版必须能识别医疗、法律、金融、公共安全、个人隐私等高风险问题，并调整报告口径，避免给出越权承诺。

高风险类型：
- 医疗健康：诊断、用药、手术、体检指标解释。
- 法律合规：定罪、诉讼策略、合同风险、劳动仲裁。
- 金融投资：买卖建议、收益承诺、杠杆、个股预测。
- 公共安全：暴力、违法规避、危险操作。
- 个人隐私：人肉搜索、身份识别、未授权查询。

建议模块：
- `src/electron/renderer/high-risk-classifier.js`
- `src/electron/renderer/high-risk-policy.js`
- `src/electron/report/compliance-disclaimer.js`

高风险策略：
- 不阻断普通分析，但必须改变报告标题与措辞。
- 报告从“结论裁决”调整为“风险筛查 / 信息核验 / 决策辅助”。
- 输出必须包含“非专业替代”边界。
- 涉及实时、政策、医疗、法律时必须提示需要权威来源核验。

结构化字段：

```js
{
  highRisk: true,
  riskDomain: 'medical | legal | finance | public_safety | privacy',
  allowedMode: 'screening | education | comparison | evidence_review',
  blockedClaims: [],
  requiredDisclaimers: [],
  escalationAdvice: ''
}
```

完成标准：
- 医疗问题不会生成确定诊断式报告。
- 投资问题不会生成“推荐买入/卖出”的确定承诺。
- 法律问题不会生成“必胜/必败”的确定承诺。
- 高风险提示出现在报告首页和最终行动建议页。

### 11.8 成本控制

目标：
商业版不能无限制调用大模型。必须能控制每次任务成本、模型数量、重试次数和报告生成长度。

建议模块：
- `src/electron/ai-cost/cost-estimator.js`
- `src/electron/ai-cost/model-pricing.js`
- `src/electron/renderer/task-budget-policy.js`
- `src/electron/renderer/cost-usage-recorder.js`

预算字段：

```js
{
  taskId: '',
  taskType: '',
  maxModels: 3,
  maxFollowupRounds: 2,
  maxReportTokens: 6000,
  estimatedCost: 0,
  actualCost: 0,
  fallbackPolicy: 'cheaper_model | fewer_rounds | partial_report'
}
```

控制策略：
- 普通问题默认 3 个模型。
- 高价值报告允许 4-5 个模型，但必须显示耗时提示。
- 重试只重试失败阶段，不重新跑全链路。
- 长文本报告生成失败时先降级为精简报告，再允许用户导出完整报告。
- API 模型优先使用低成本模型做初筛，高质量模型做最终裁决。

完成标准：
- 每次任务能记录估算成本与实际调用次数。
- 超预算时系统给出降级动作。
- 同一阶段不会无限重试。
- 内测期间能统计平均单报告成本。

## 12. P2 任务细化

### 12.1 远程配置

可远程更新：

- 模型列表。
- 模型 URL。
- prompt 版本。
- 路由关键词。
- 报告模板开关。
- 高风险规则。

最小实现：

- 本地 `remote-config.json`。
- 后续替换为 HTTPS 配置拉取。

### 12.2 报告历史库

最小数据结构：

```js
{
  id: '',
  question: '',
  taskType: '',
  createdAt: '',
  models: [],
  reportPath: '',
  structuredPath: '',
  status: ''
}
```

功能：

- 查看历史。
- 重新导出。
- 复制报告路径。
- 删除历史。

### 12.3 行业模板包

首批行业包：

- 公关舆情包。
- 消费选购包。
- 企业采购/竞品包。
- 技术诊断包。
- 投研政策包。

每个包必须包含：

- 路由规则。
- 工作流 prompt。
- 报告组件。
- 验收样例。
- 销售演示 PDF。

### 12.4 团队协作能力

目标：
让报告从单人桌面工具升级为可交付团队流程，支持复查、批注、归档和二次导出。

最小实现：
- 本地报告历史支持状态：草稿、已导出、已复查、已归档。
- 报告卡片支持添加备注。
- 结构化结果支持导出 JSON。
- 支持复制“任务摘要”，方便发给同事。

后续 SaaS 实现：
- 多账号。
- 项目空间。
- 报告评论。
- 审批流。
- 团队模板库。

完成标准：
- 一个用户可以回到历史任务继续导出。
- 可以把某次报告的结构化材料交给另一个人复查。
- 不依赖聊天窗口历史作为唯一记录。

### 12.5 SaaS 化准备

目标：
桌面版不马上 SaaS 化，但代码结构要避免未来迁移困难。

需要提前抽象：
- 用户身份：`userId`。
- 工作空间：`workspaceId`。
- 任务：`taskId`。
- 报告：`reportId`。
- 模板版本：`templateVersion`。
- prompt 版本：`promptVersion`。

本地存储建议：

```text
userData/
  config/
  licenses/
  tasks/
  reports/
  logs/
  cache/
```

接口边界：
- Electron 负责本地窗口、BrowserView、文件系统、PDF 导出。
- 任务编排核心尽量保持纯 JS，可迁移到服务端。
- provider 接口不能直接绑定 Electron。
- 报告模板输入必须是纯 JSON。

完成标准：
- 核心路由、schema、报告数据组装可以在 Node 脚本中运行。
- 不启动 Electron 也能跑路由测试和报告 fixture 测试。
- 未来接服务端时不用重写业务规则。

## 13. 开发顺序建议

第一阶段：稳定性优先。

1. P0-01 路由测试集。
2. P0-03 JSON schema 校验。
3. P0-04 状态机。
4. P0-05 阶段重试。
5. P0-06 PDF 回归。
6. P0-07 打包稳定。

第二阶段：专业度增强。

1. P0-02 场景化报告模板。
2. P1-03 专属图表组件。
3. P1-01 独立证据层。
4. P1-02 API 模型底座。

第三阶段：商业交付。

1. P1-05 日志与诊断包。
2. P1-06 授权正规化。
3. P1-07 高风险合规边界。
4. P1-08 成本控制。
5. P2-01 远程配置。
6. P2-02 报告历史库。

## 14. Definition of Done

每个整改项完成必须满足：

- 有代码实现。
- 有最小测试或验证脚本。
- 有至少 3 个真实问题样例。
- 有失败场景验证。
- 有文档更新。
- 不引入新的 500 行以上混合职责文件。
- 不破坏报告正式名称：`滤镜·多源大模型内容对比分析`。

## 15. 每周验收节奏

每周固定产出：

- 本周完成项。
- 本周新增风险。
- 路由测试通过率。
- 报告生成成功率。
- PDF 导出成功率。
- 平均任务耗时。
- 已知失败样例。
- 下周 P0/P1 任务。

建议商业内测指标：

- 真实问题跑通率 >= 90%。
- 报告导出成功率 >= 95%。
- 路由准确率 >= 92%。
- 高风险问题越界率 = 0。
- 单次报告平均失败可恢复率 >= 90%。

## 16. 可执行工单清单

这里把整改项拆成可以直接进入开发的 ticket。每个 ticket 必须小到 0.5-2 天可完成，避免再次形成大文件。

### T-001 路由测试集落地

目标：
把“客户随便问是否能覆盖”变成自动化测试。

改动范围：
- 新增 `fixtures/routing/task-routing-cases.json`
- 新增 `scripts/check-task-routing.js`
- 轻微调整 `src/electron/renderer/task-router.js` 的导出方式。

输入样例：
- `iphone17各个机型对比`
- `郭德纲最近舆论怎么样`
- `帮我分析这份合同有没有坑`
- `我血压150/95严重吗`
- `小红书种草文案怎么写`

验收：
- 运行 `npm run check:routing`。
- 通过率 >= 95%。
- 误路由样例必须写入 fixture，不能口头记忆。

### T-002 场景 schema 注册表

目标：
每个场景都有自己的必填字段，报告不再靠“猜字段”。

改动范围：
- 新增 `src/electron/report/schemas/`
- 新增 `src/electron/report/report-schema-registry.js`
- 新增 `scripts/check-report-schema.js`

验收：
- 每个 `taskType` 至少有一个 schema。
- 坏 JSON 可识别具体缺失字段。
- 允许降级，但必须记录 warning。

### T-003 报告生成修复链

目标：
DashScope 或其他模型返回不完整 JSON 时，先修复，不直接失败。

改动范围：
- 新增 `src/electron/report/report-json-repair.js`
- 更新 `src/electron/ipc/dashscope-ipc.js`
- 更新报告生成失败卡片。

验收：
- JSON 少一个字段时可修复。
- JSON 多余 markdown 包裹时可解析。
- JSON 彻底不可用时仍可生成“当前材料报告”。

### T-004 分析状态机

目标：
解决“AI 还在输出，系统以为完成”或“一直补全不动”的问题。

改动范围：
- 新增 `src/electron/renderer/analysis-state-machine.js`
- 新增 `src/electron/renderer/model-run-state.js`
- 将 `truth-seeking.js` 中阶段判断迁移出来。

验收：
- 每个 stage 有进入、完成、失败、重试事件。
- 模型输出稳定判定不只看空文本。
- 2 分钟无变化时给出可操作恢复按钮。

### T-005 阶段恢复按钮

目标：
用户遇到超时后能继续，而不是重启程序。

改动范围：
- 新增 `src/electron/renderer/recovery-actions.js`
- 更新左侧流程卡片。

动作：
- 重试当前阶段。
- 跳过失败模型。
- 使用当前材料生成报告。
- 导出诊断包。

验收：
- Qwen 超时后可以重试报告生成。
- 网页模型一个失败时其他模型结果仍可进入报告。
- 恢复动作不会重复发送用户原始问题。

### T-006 PDF fixture 回归

目标：
每次改报告模板前后都能快速发现文字截断。

改动范围：
- 新增 `fixtures/reports/`
- 新增 `scripts/render-report-fixtures.js`
- 新增 `scripts/check-report-layout.js`

验收：
- 消费选购、舆情、竞品、技术、医疗、金融至少各 1 个 fixture。
- 能输出 PDF 和页面截图。
- 至少检查：页数、标题、空白页、文本越界、图表标签越界。

### T-007 打包交付脚本

目标：
解决安装包损坏、便携版路径不清晰、客户不知道发哪个文件的问题。

改动范围：
- `package.json`
- `scripts/prebuild-clean.js`
- `scripts/postbuild-summary.js`
- `release/README-交付说明.md`

验收：
- `npm run dist:portable` 可稳定生成便携版。
- `npm run dist:installer` 成功或明确提示 NSIS 环境问题。
- 输出文件名、大小、hash。
- README 明确“优先发送便携版 exe”。

### T-008 API Provider 底座

目标：
建立商业版稳定底座，不完全依赖网页自动化。

改动范围：
- 新增 `src/electron/ai-providers/provider-contract.js`
- 新增 `src/electron/ai-providers/qwen-provider.js`
- 新增 `src/electron/ai-providers/provider-registry.js`

验收：
- 至少 Qwen 通过 provider 接口完成一次报告 JSON 生成。
- provider 有 capabilities。
- provider 调用能记录耗时、错误、token 估算。

### T-009 独立证据层

目标：
报告不能只说“模型认为”，必须说“证据支持到哪一步”。

改动范围：
- 新增 `src/electron/evidence/evidence-pack.js`
- 新增 `src/electron/evidence/evidence-scorer.js`
- 新增 `src/electron/evidence/search-query-planner.js`

验收：
- 实时问题可生成搜索查询建议。
- 报告中强结论能关联 evidence id。
- 无证据时自动降级为“待核验判断”。

### T-010 高风险守门

目标：
保护商业交付安全边界。

改动范围：
- 新增 `src/electron/renderer/high-risk-classifier.js`
- 新增 `src/electron/report/high-risk-report-policy.js`
- 增加高风险 fixture。

验收：
- 医疗、金融、法律样例不会输出越权结论。
- 报告仍然有价值，不是一段免责声明。
- 高风险报告有明确下一步核验建议。

## 17. 验收矩阵

| 类别 | 样例 | 期望路由 | 报告重点 | 必须避免 |
| --- | --- | --- | --- | --- |
| 消费选购 | iPhone17各机型对比 | consumer_purchase | 参数、价格、适用人群、性价比 | 误判产品不存在 |
| 舆情研判 | 郭德纲最近舆论怎么样 | public_opinion | 事件、情绪、阵营、风险 | 把谣言当事实 |
| 事实核查 | 这个新闻是真的吗 | fact_check | 证据链、可信度、待核验点 | 无证据强裁决 |
| 竞品分析 | 两个SaaS产品对比 | competitor_analysis | 定位、功能、价格、机会 | 写成普通科普 |
| 技术诊断 | Electron打包失败 | technical_diagnosis | 根因、修复步骤、回归风险 | 只给泛建议 |
| 创作内容 | 写小红书文案 | creative_content | 人群、卖点、风格、AB稿 | 生成一篇就结束 |
| 学习研究 | 帮我综述一篇论文 | learning_research | 主题、方法、争议、延伸阅读 | 无结构摘要 |
| 医疗健康 | 血压150/95怎么办 | medical_health | 风险分级、就医建议、监测项 | 诊断或用药承诺 |
| 金融规划 | 现在买基金好吗 | finance_planning | 风险偏好、资产配置、情景 | 承诺收益 |
| 法律风险 | 合同有没有坑 | legal_risk | 条款风险、证据、咨询建议 | 替代律师判断 |

## 18. 最终闭环定义

商业版闭环不是“能生成 PDF”，而是下面 8 件事全部成立：

1. 用户随便问一句，系统能判断场景。
2. 系统能把问题补全为可分析任务。
3. 系统能选择合适模型与工作流。
4. 系统能收集多模型回答并判断是否完成。
5. 系统能抽取差异并追问原因。
6. 系统能剔除污染、保留证据、形成裁决。
7. 系统能生成匹配场景的专业报告。
8. 系统失败时能恢复、重试、导出诊断，而不是中断。

只要缺其中一环，就不能算商业闭环完成。

## 19. 风险清单

### R-001 路由扩展导致误判增加

风险：
关键词越多，误路由概率越高。

缓解：
- 先规则后置信度。
- 低置信度进入 `general_compare`。
- 每次误路由加入 fixture。

### R-002 报告模板越来越复杂

风险：
PDF 样式继续膨胀，出现新的超大文件。

缓解：
- 每个场景组件独立文件。
- 单文件超过 500 行必须拆。
- 图表组件与页面布局分离。

### R-003 网页自动化不可控

风险：
AI 网页改版、验证码、登录状态导致流程失败。

缓解：
- API provider 做稳定底座。
- 网页自动化只做增强插件。
- 失败时保留其他模型结果。

### R-004 实时问题缺少证据

风险：
模型知识过期导致报告错误。

缓解：
- 引入证据层。
- 无证据不强裁决。
- 报告中区分“事实”“推断”“建议核验”。

### R-005 客户机器环境差异

风险：
安装包、权限、杀毒软件、WebView 状态影响使用。

缓解：
- 便携版优先。
- 诊断包。
- 启动自检。
- 打包 hash 与版本记录。

## 20. 下一步执行建议

推荐按下面顺序开始，不要同时开太多分支：

1. 先做 T-001 路由测试集，因为它能立刻防止 iPhone17 这类跑偏。
2. 再做 T-002/T-003 schema 与 JSON 修复，因为它能提升报告生成稳定性。
3. 然后做 T-004/T-005 状态机与恢复，因为它解决客户最明显的“卡住/超时”体验。
4. 接着做 T-006 PDF 回归，把报告改版风险降下来。
5. 最后进入 T-008/T-009，建立 API 底座与证据层，形成真正壁垒。

到这里，文档层面的细化可以视为完成；后续工作应该进入“按 ticket 实现 + 每完成一项更新验收状态”的节奏。

## 21. 当前实现状态

更新时间：2026-05-09

已落地：

- T-001 路由测试集：已新增 `fixtures/routing/task-routing-cases.json` 和 `npm run check:routing`。
- T-002 场景 schema 注册表：已新增 `src/electron/report/report-schema-registry.js` 和 `npm run check:report-schema`。
- T-003 报告 JSON 修复链：已新增 `src/electron/report/report-json-repair.js`，PDF 导出前会自动修复或降级。
- T-004 分析状态机：已新增 `analysis-state-machine.js`、`model-run-state.js`。
- T-005 阶段恢复动作：已新增 `recovery-actions.js`。
- T-006 PDF 回归基础设施：已新增 `fixtures/reports/report-fixtures.json`、`render:report-fixtures`、`check:report-layout`。
- T-007 打包交付脚本：已新增 `prebuild-clean.js`、`postbuild-summary.js`、`dist:portable`、`dist:installer` 和交付说明。
- T-008 API Provider 底座：已新增 `ai-providers/`，Qwen 已接入统一契约。
- T-009 独立证据层：已新增 `evidence/`，支持证据包、可信度评分和搜索查询规划。
- T-010 高风险守门：已新增 `high-risk-classifier.js` 和 `high-risk-report-policy.js`。
- P1/P2 商业支撑：已新增成本估算、远程配置、报告历史、诊断包基础模块。

总体验收命令：

```powershell
npm run render:report-fixtures
npm run check:commercial-readiness
```

剩余需要继续产品化接入：

- 将状态机事件接入完整 UI 流程，而不是只保留纯模块。
- 将证据层接入真实搜索/API，而不是只生成查询计划。
- 将报告历史、诊断包、远程配置接入 Electron IPC 和界面入口。
- 将高风险策略写入最终 prompt 和 PDF 显著位置。
- 将 API Provider 扩展到 DeepSeek、OpenAI、Claude 等真实 provider。
