# 商业版整改实现状态

更新时间：2026-05-10

## 已完成闭环

- 任务路由：已覆盖 121 个典型场景，包含消费选购、舆情、事实核查、竞品、投资、法律、医疗、金融、旅行、职业、知识、创作、技术等。
- 场景 Schema：已为 15 类任务建立统一报告字段契约。
- JSON 修复：PDF 导出前会自动修复结构化 JSON，无法修复时降级生成可用报告。
- 状态机与恢复：已提供全局阶段状态、单模型状态和失败恢复动作。
- PDF 回归：已建立 15 个报告 fixture 的渲染、版式检查和首屏视觉截图，覆盖全部 task_type。
- 打包交付：已提供清理、便携版、安装版和产物摘要脚本。
- API Provider：已接入 Qwen、DeepSeek、OpenAI、智谱、Claude 的统一 Provider 契约。
- 证据层：已支持证据包、可信度评分、查询计划和真实搜索 API 接入。
- 高风险守门：已覆盖医疗、金融、法律等高风险任务的边界策略。
- 商业支撑：已接入成本估算、远程配置、报告历史、诊断包。

## 本轮新增

- 设置面板新增“报告历史”，支持查看最近导出的 PDF、复制路径、刷新和移除记录。
- 设置面板新增“模型底座与配置”，支持查看 Provider 可用状态、模型名、密钥来源和远程配置状态。
- 设置面板新增“导出诊断包”，客户卡住或环境异常时可主动导出排查材料。
- PDF 导出同步输出同名结构化 JSON，方便复盘、诊断和二次加工。
- PDF 默认名称固定为 `滤镜·多源大模型内容对比分析-YYYY-MM-DD.pdf`，避免后续报告改版导致名称漂移。
- 证据层新增 `Evidence Search Provider`，支持 `DUOLI_EVIDENCE_SEARCH_ENDPOINT`、`DUOLI_BING_SEARCH_KEY`、`DUOLI_SERPAPI_KEY`。
- 最终报告 Prompt 已接收候选证据包；未配置搜索时安全降级为待核验查询计划，配置搜索时把候选证据作为输入但不伪装成已验证事实。
- 已移除代码中的内置 DashScope Key，商业交付必须使用环境变量或本机 API 设置，避免客户包泄露调用密钥和成本风险。
- 打包配置中的产品名、快捷方式名和便携版文件名已恢复为正常中文：`滤镜` / `滤镜-0.1.0-便携版.exe`。
- 任务路由商业回归新增 105 条多场景用例，并把最低样本数、通过率和高风险召回写入 `check:routing` 验收。
- 路由器补强企业软件选型、合规风险、内存泄漏、职业跳槽、养老金、泛问兜底等高频误判点。
- API Provider 新增 Claude 适配器，按 Anthropic Messages 协议独立实现，不混入 OpenAI-compatible 适配器。
- 新增 API-only 完整报告链路：当没有可用网页 AI 窗口时，系统会自动选择已配置的 API Provider 并发回答，再复用去伪存真闭环生成报告。
- 新增 `check:api-only`，用 mock provider 验证 API-only 模型选择、并发返回、进度信号和无可用 provider 失败路径。
- 授权系统新增自动化验收，覆盖月卡、永久卡、过期、错应用、未生效、系统时间回拨、签名篡改、空密钥和格式错误。
- 新增 evidence/source 强绑定层：PDF 导出前会把 `analysisSession.evidencePack` 绑定到结构化报告，输出 `evidence_bindings`、`evidence_sources` 和绑定统计；报告中新增“证据引用索引”。
- 强结论如果没有绑定候选证据，会在报告中降级显示为“待核验”，避免把模型记忆伪装成可验证事实。
- 消费选购、舆情裁决、技术诊断已拆成独立场景模板入口，分别做场景数据增强后再复用基础视觉系统。
- 新增 `check:scenario-templates`，确保三个高频商业场景不再直接共用同一个模板入口。
- 报告回归新增 9 个商业 fixture，覆盖事实核验、竞品、投研、知识、创作、学习、旅行、职业和通用分析场景。
- 新增 `check:report-visual`，会为 15 个报告样例生成截图和 `tmp_pdf_review/contact-sheet.html`，用于快速发现文字截断、图表遮挡和视觉异常。

## 验收命令

```powershell
npm run check:commercial-readiness
```

最近一次结果：全部通过。

## 最近一次打包

- 命令：`npm run dist:portable`
- 产物：`release/滤镜-0.1.0-便携版.exe`
- 大小：66.5 MB
- SHA256：`8489f9bd5a95bd8576d1ee7d5c3118fa3e2be6d1aba2f469de47529593e611f5`
## 本轮继续完善（2026-05-10）

- API-only 导出闭环继续补强：`report-session` 会把 API-only 的 `initialResults` 带入导出 payload，避免无网页窗口时 PDF 缺少模型证词。
- 结构化分析底座不再硬绑定 DashScope：新增 `provider-completion.js`，问题补全、JSON 差异抽取与最终报告生成会优先用千问，失败时自动回落到已配置的 DeepSeek / OpenAI / Claude / 智谱等 Provider。
- 场景模板继续升级：消费选购、舆情裁决、技术诊断已加入专属报告页面，分别输出“消费选购决策台”“舆情战情室”“技术排障台”。
- 商业就绪检查继续加严：`check:commercial-readiness` 会先重新渲染 15 个报告 fixture，再执行版面与视觉回归，避免模板更新后仍拿旧截图误判通过。
