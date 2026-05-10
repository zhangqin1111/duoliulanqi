# 滤镜多场景报告质量升级规格

> 目标：把“用户是否真的被解决问题”从人工肉测，升级为程序可判断、可回归、可拦截的产品标准。

## 1. 这次暴露出的核心问题

### 1.1 不是 PDF 好不好看的问题

最近的“最新国产20万元SUV车型怎么选”报告已经有消费报告结构，但仍然没有达到商业交付标准。根因不是排版，而是系统没有把“场景任务”转成强约束的数据契约。

典型失败：

- 报告给出强推荐，但证据索引显示 `0/24` 强证据绑定。
- 强行写“已核验车型池”，但车型、价格、工信部编号仍是 `待核验` 或 `2024XXXX` 占位。
- 消费选购场景缺少完整候选表、价格表、场景排序和不推荐清单。
- 报告第一页像结论，后面又不断提示待核验，用户无法判断到底能不能采信。
- 补全层一度把“最新/当前”误落成具体年份，导致事实边界污染。

### 1.2 正确分工

补全层只做：

- 补任务维度。
- 补核验口径。
- 补输出字段。
- 补追问方向。
- 保留用户明确给出的时间、预算、对象、地域、场景。

补全层绝对不能做：

- 不得预设候选清单。
- 不得预设价格、参数、发布时间、在售状态。
- 不得把“最新/当前/最近”换算成某个年份。
- 不得替用户直接回答确定事实。

事实层由多个 AI 和证据绑定层负责；报告层只消费结构化 JSON。

## 2. 总体架构改造原则

### 2.1 最终 JSON 由程序定，不由模型自由发挥

模型可以提供内容，但最终 JSON schema 必须由程序定义、校验、修复、降级。

每个报告必须经过四道门：

1. `route gate`：问题必须路由到正确场景。
2. `schema gate`：场景 JSON 必须满足必填字段。
3. `evidence gate`：强结论必须绑定来源，否则自动降级。
4. `usefulness gate`：报告必须回答用户真正要解决的问题。

### 2.2 所有场景共用的基础结构

所有场景最终 JSON 都必须包含：

```json
{
  "meta": {
    "task_type": "consumer_purchase",
    "question_original": "",
    "question_refined": "",
    "time_boundary": {
      "type": "absolute | relative | unspecified",
      "user_text": "",
      "system_interpretation": "",
      "must_not_infer_concrete_date": true
    }
  },
  "answer_contract": {
    "user_goal": "",
    "direct_answer": "",
    "decision_type": "recommend | diagnose | verify | compare | plan | draft",
    "can_user_act_now": false,
    "why": ""
  },
  "evidence_policy": {
    "required_source_types": [],
    "strong_claim_requires_source": true,
    "unbound_claim_action": "downgrade_to_pending"
  },
  "source_matrix": [],
  "scenario_payload": {},
  "final_actions": []
}
```

### 2.3 强结论规则

强结论必须满足：

- 有至少一个来源类型。
- 有模型间交叉一致或外部证据支撑。
- 没有 `XXXX`、`待核验但已裁决`、`据称已核验` 这类占位。
- 能被具体行动使用。

否则必须改写成：

- “当前材料不足以做最终裁决”。
- “可作为候选方向，需人工核验后使用”。
- “仅能输出核验清单，不输出最终推荐”。

## 3. 场景级 JSON 契约

## 3.1 消费选购 `consumer_purchase`

### 用户真正要解决的问题

帮用户买东西、选东西、避坑，而不是做事实打假。

### 必填 JSON

```json
{
  "scenario_payload": {
    "purchase_context": {
      "category": "SUV",
      "budget_range": "",
      "must_have": [],
      "nice_to_have": [],
      "excluded": []
    },
    "candidate_table": [
      {
        "brand": "",
        "model": "",
        "version": "",
        "price_official": "",
        "price_market": "",
        "price_status": "verified | pending",
        "availability_status": "verified | pending | excluded",
        "launch_time": "",
        "powertrain": "",
        "battery_or_engine": "",
        "range_or_fuel": "",
        "adas": "",
        "cabin_chip": "",
        "safety_rating": "",
        "source_refs": []
      }
    ],
    "value_weights": [
      {"label": "空间", "weight": 20},
      {"label": "能耗", "weight": 25}
    ],
    "scenario_rankings": [
      {
        "scenario": "家庭通勤",
        "ranking": [{"model": "", "reason": ""}]
      }
    ],
    "recommendations": {
      "first_choice": {"model": "", "reason": "", "evidence_refs": []},
      "alternatives": [],
      "not_recommended": []
    },
    "manual_verification": []
  }
}
```

### 报告必须出现

- 候选车型/产品总表。
- 官方价/成交价/核验状态表。
- 场景排序表。
- 价值权重雷达或堆叠条形图。
- 首选/备选/不推荐卡片。
- 人工核验清单。

### 自动验收

- 候选项少于用户要求数量，失败。
- 推荐车型不在候选表中，失败。
- 出现 `XXXX` 占位，失败。
- 强推荐没有 `source_refs`，降级或失败。
- `direct_answer` 为空或只写“待核验”，失败。

## 3.2 舆情研判 `public_opinion`

### 用户真正要解决的问题

判断有没有真实舆情、是否要响应、怎么响应。

### 必填 JSON

```json
{
  "scenario_payload": {
    "issue_subject": "",
    "event_existence": "confirmed | disputed | not_found | pending",
    "public_heat": {"score": 0, "basis": ""},
    "sentiment_distribution": [],
    "stance_groups": [],
    "narratives": [],
    "response_recommendation": {
      "need_response": false,
      "tone": "",
      "action": ""
    }
  }
}
```

### 报告必须出现

- 是否存在真实舆情事件。
- 热度与传播证据。
- 情绪/阵营/叙事结构。
- 风险等级。
- 是否回应及回应建议。

### 自动验收

- 没有“是否存在舆情事件”判断，失败。
- 没有传播证据却写“高热度”，失败。
- 把网友评论当事实，降级。

## 3.3 事实核验 `fact_check`

### 用户真正要解决的问题

判断某条说法能不能信。

### 必填 JSON

```json
{
  "scenario_payload": {
    "claims": [
      {
        "claim": "",
        "verdict": "true | false | mixed | insufficient",
        "evidence_for": [],
        "evidence_against": [],
        "source_refs": []
      }
    ],
    "overall_verdict": "",
    "next_verification_steps": []
  }
}
```

### 自动验收

- 没有拆 claim，失败。
- 每条 claim 没有 verdict，失败。
- 没证据却给 true/false，降级为 insufficient。

## 3.4 竞品分析 `competitor_analysis`

### 用户真正要解决的问题

帮用户选型、判断替代关系、找到差异化优势。

### 必填 JSON

```json
{
  "scenario_payload": {
    "competitors": [],
    "comparison_dimensions": [],
    "feature_matrix": [],
    "scenario_fit": [],
    "switching_cost": [],
    "recommendation": {
      "choose_a_when": [],
      "choose_b_when": [],
      "avoid_when": []
    }
  }
}
```

### 自动验收

- 没有对比矩阵，失败。
- 只写谁更好，没有场景条件，失败。
- 价格/功能无核验状态，降级。

## 3.5 投研/政策影响 `investment_research`

### 用户真正要解决的问题

判断事件、政策、产业变化的影响路径和风险，不输出买卖建议。

### 必填 JSON

```json
{
  "scenario_payload": {
    "event_or_policy": "",
    "affected_entities": [],
    "impact_chain": [],
    "beneficiaries": [],
    "losers": [],
    "time_horizon": {
      "short": "",
      "medium": "",
      "long": ""
    },
    "risk_watchlist": [],
    "not_investment_advice": true
  }
}
```

### 自动验收

- 出现明确买入/卖出指令，失败。
- 没有传导路径，失败。
- 没有风险观察指标，失败。

## 3.6 法律/合规 `legal_risk`

### 用户真正要解决的问题

做风险初筛、材料清单、律师复核问题，不替代法律意见。

### 必填 JSON

```json
{
  "scenario_payload": {
    "risk_items": [],
    "applicable_rule_directions": [],
    "evidence_gaps": [],
    "risk_level": "",
    "lawyer_questions": [],
    "disclaimer": "not_legal_advice"
  }
}
```

### 自动验收

- 没有免责声明，失败。
- 输出确定法律结论但无事实前提，失败。
- 没有证据缺口，失败。

## 3.7 医疗健康 `medical_health`

### 用户真正要解决的问题

做健康信息整理、风险分层、就医边界，不诊断。

### 必填 JSON

```json
{
  "scenario_payload": {
    "symptoms": [],
    "red_flags": [],
    "risk_level": "",
    "seek_care_now": false,
    "doctor_questions": [],
    "missing_info": [],
    "disclaimer": "not_medical_advice"
  }
}
```

### 自动验收

- 没有红旗症状检查，失败。
- 给出诊断/处方，失败。
- 没有就医边界，失败。

## 3.8 财务规划 `finance_planning`

### 用户真正要解决的问题

做资产、预算、风险承受能力和行动边界规划，不做具体投资承诺。

### 必填 JSON

```json
{
  "scenario_payload": {
    "financial_goal": "",
    "cashflow_context": "",
    "risk_profile": "",
    "plan_options": [],
    "risk_warnings": [],
    "missing_info": [],
    "disclaimer": "not_financial_advice"
  }
}
```

### 自动验收

- 出现收益承诺，失败。
- 没有风险承受能力，失败。
- 没有现金流/期限假设，降级。

## 3.9 技术诊断 `technical_diagnosis`

### 用户真正要解决的问题

定位原因、给出复现路径、修复步骤、回滚方案。

### 必填 JSON

```json
{
  "scenario_payload": {
    "problem_summary": "",
    "environment": [],
    "likely_causes": [],
    "reproduction_steps": [],
    "first_fix": "",
    "verification_steps": [],
    "rollback_plan": [],
    "logs_or_artifacts_needed": []
  }
}
```

### 自动验收

- 没有第一步修复，失败。
- 没有验证步骤，失败。
- 只讲原理不落地，失败。

## 3.10 创作/营销 `creative_content`

### 用户真正要解决的问题

生成可用内容方案、版本、测试方向和风险边界。

### 必填 JSON

```json
{
  "scenario_payload": {
    "target_audience": "",
    "channel": "",
    "content_angles": [],
    "deliverables": [],
    "variants": [],
    "risk_words": [],
    "test_plan": []
  }
}
```

### 自动验收

- 没有成品草稿或可执行版本，失败。
- 没有目标受众和渠道，失败。
- 高风险行业没有合规提示，失败。

## 3.11 知识解释 `knowledge_brief`

### 用户真正要解决的问题

讲清概念、本质、边界、误区和下一步学习路径。

### 必填 JSON

```json
{
  "scenario_payload": {
    "definition": "",
    "core_mechanism": "",
    "examples": [],
    "misconceptions": [],
    "when_to_use": [],
    "learning_path": []
  }
}
```

### 自动验收

- 没有定义，失败。
- 没有例子或误区，降级。
- 只堆术语不解释，失败。

## 3.12 学习研究 `learning_research`

### 用户真正要解决的问题

形成研究框架、文献结构、学习计划或输出提纲。

### 必填 JSON

```json
{
  "scenario_payload": {
    "research_question": "",
    "topic_map": [],
    "literature_clusters": [],
    "argument_structure": [],
    "study_plan": [],
    "deliverable_outline": []
  }
}
```

### 自动验收

- 没有研究问题，失败。
- 没有结构化提纲，失败。
- 没有下一步材料清单，降级。

## 3.13 旅行/本地生活 `travel_lifestyle`

### 用户真正要解决的问题

帮用户规划路线、预算、时间、备选和避坑。

### 必填 JSON

```json
{
  "scenario_payload": {
    "destination": "",
    "constraints": [],
    "itinerary": [],
    "budget": "",
    "alternatives": [],
    "real_time_checks": [],
    "avoid_list": []
  }
}
```

### 自动验收

- 没有路线/时间安排，失败。
- 没有实时核验项，降级。
- 没有备选方案，降级。

## 3.14 职业/招聘 `career_recruiting`

### 用户真正要解决的问题

帮用户优化简历、匹配岗位、准备面试或做职业选择。

### 必填 JSON

```json
{
  "scenario_payload": {
    "target_role": "",
    "fit_analysis": [],
    "resume_changes": [],
    "interview_questions": [],
    "evidence_examples": [],
    "risk_or_gap": [],
    "next_actions": []
  }
}
```

### 自动验收

- 没有岗位匹配分析，失败。
- 没有可改写建议，失败。
- 没有面试准备或下一步行动，降级。

## 3.15 通用分析 `general_compare`

### 用户真正要解决的问题

用户问题太宽时，先把问题拆清楚，再给可执行下一步。

### 必填 JSON

```json
{
  "scenario_payload": {
    "clarified_goal": "",
    "possible_interpretations": [],
    "decision_variables": [],
    "preliminary_answer": "",
    "questions_to_user": [],
    "next_actions": []
  }
}
```

### 自动验收

- 没有澄清目标，失败。
- 只泛泛总结，失败。
- 没有下一步问题，失败。

## 4. 报告生成统一验收标准

### 4.1 每份报告必须回答三件事

1. 用户现在到底该怎么判断？
2. 这个判断依据是什么？
3. 哪些地方还不能信，需要怎么核验？

### 4.2 页面级必备结构

所有报告至少包含：

- `P1`：一句话直接答案。
- `P2`：用户问题拆解与边界。
- `P3`：场景专属核心表格。
- `P4`：差异/证据/风险看板。
- `P5`：最终行动清单。
- `Appendix`：证据与模型审计摘要。

消费、竞品、技术、法律、医疗等场景不能硬套“舆情结构看板”。

### 4.3 禁止项

以下内容出现即失败：

- `XXXX` 占位。
- “已核验”但没有来源。
- “最新/当前”被转成具体年份。
- 用户没要求具体时间却出现系统自造时间边界。
- 推荐项不在候选表里。
- 强结论无证据绑定。
- 法律、医疗、金融场景输出确定性高风险建议。

## 5. 自动化检查计划

### 5.1 新增脚本

建议新增：

- `scripts/check-scenario-json-contracts.js`
- `scripts/check-report-usefulness.js`
- `scripts/check-evidence-binding-strict.js`
- `scripts/check-no-placeholder-claims.js`
- `scripts/check-time-boundary-policy.js`

### 5.2 消费场景检查示例

输入：

```text
最新国产20万元SUV车型怎么选
```

必须通过：

- 不得出现系统自造 `2024年`。
- `candidate_table.length >= 6`。
- 每个候选必须有 `model/version/price/status/source_refs`。
- 推荐车型必须属于候选表。
- 必须包含首选、备选、不推荐。
- 所有价格必须是 `verified` 或 `pending`。
- 没来源的强结论必须降级。

### 5.3 舆情场景检查示例

输入：

```text
郭德纲最近舆论怎么样
```

必须通过：

- 明确是否存在真实舆情事件。
- 不得把旧闻当新。
- 不得把网友观点当事实。
- 必须输出是否需要回应。

### 5.4 技术场景检查示例

输入：

```text
Electron 打包 exe 安装后快捷方式丢失怎么修
```

必须通过：

- 有最可能根因。
- 有第一步修复。
- 有验证步骤。
- 有回滚方案。

## 6. 实施路线

### Phase 1：场景 schema 定义

- 为 15 个场景新增 `scenario_contracts`。
- 把 `scenario_payload` 写入结构化报告 JSON。
- 所有 prompt 必须按 contract 输出。

### Phase 2：报告模板升级

- 消费模板改成“候选表 + 推荐矩阵”。
- 技术模板改成“根因树 + 修复步骤”。
- 法律/医疗/金融模板改成“风险分层 + 免责声明 + 材料清单”。
- 舆情模板保留“事件真实性 + 热度 + 响应策略”。

### Phase 3：证据强绑定

- 强结论没有来源就降级。
- `verified` 必须绑定来源。
- `pending` 不能进入首选推荐，只能进入候选观察。

### Phase 4：自动验收

- 用 fixtures 覆盖 15 个场景。
- 每个场景至少 5 条典型输入。
- 每次 `npm run check:commercial-readiness` 必须跑 usefulness gate。

### Phase 5：报告生成闭环

- 失败时不生成“看似完整”的报告。
- 改成生成“材料不足报告”，明确缺什么。
- UI 提示用户补充关键变量。

## 7. 当前优先级

### P0

- 消费选购 schema 与报告模板重做。
- 强证据绑定校验。
- 禁止 `XXXX` 占位。
- 时间边界策略严格化。

### P1

- 技术、法律、医疗、金融四类高价值场景模板拆分。
- 场景 usefulness 检查脚本。
- 报告失败降级机制。

### P2

- 全部场景可视化组件差异化。
- 更多 fixtures 与视觉回归。
- 交互端展示“为什么报告降级”。

## 8. 验收标准

一个报告能交付，必须满足：

- 用户 30 秒内能知道答案。
- 用户 1 分钟内能知道下一步怎么做。
- 用户能看到哪些信息可采信、哪些待核验。
- 报告不会用漂亮排版掩盖证据不足。
- 程序能自动发现至少 80% 的跑偏问题，而不是等用户肉测。

最终标准：**报告不是展示系统能力，而是直接帮助用户完成决策。**
