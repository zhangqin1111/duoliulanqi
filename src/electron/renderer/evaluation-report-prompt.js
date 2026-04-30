(function attachEvaluationReportPrompt(global) {
  const HEADINGS = [
    '全局摘要：多模型能力全景与核心矛盾',
    '一、 输出脉络与事实坐标对比',
    '二、 核心逻辑链路与信息能见度分析',
    '三、 能力光谱与场景割裂剖析',
    '四、 深层动因与价值观对齐探讨',
    '五、 选型研判与调用策略推演',
    '数据可视化组件规格',
  ];

  function normalizeReplies(replies) {
    return (Array.isArray(replies) ? replies : []).map((reply, index) => ({
      name: reply.name || (reply.cfg && reply.cfg.name) || `模型${index + 1}`,
      ok: reply.ok !== false && !(reply.r && reply.r.ok === false),
      text: reply.text || (reply.r && reply.r.text) || '',
      error: reply.error || (reply.r && reply.r.error) || '',
    }));
  }

  function formatReplies(replies) {
    return normalizeReplies(replies)
      .map((reply) => `【${reply.name}】\n${reply.ok ? reply.text : `未获得有效回答：${reply.error || 'unknown'}`}`)
      .join('\n\n');
  }

  function buildEvaluationReportPrompt(input) {
    const data = input || {};
    const question = String(data.question || data.userQuestion || '').trim();
    const originalQuestion = String(data.originalQuestion || '').trim();
    const wasRefined = !!originalQuestion && originalQuestion !== question;
    const modelReplies = normalizeReplies(data.modelReplies || data.results || []);
    const modelNames = modelReplies.map((reply) => reply.name).join(' / ');
    const diffAnalyses = data.diffAnalyses ? JSON.stringify(data.diffAnalyses, null, 2) : '[]';
    const pollution = data.pollution ? JSON.stringify(data.pollution, null, 2) : '{}';
    const selfCleansing = data.selfCleansing ? JSON.stringify(data.selfCleansing, null, 2) : 'null';

    const lines = [
      '# 角色与任务',
      '你是一位顶尖的 AI 算法评测专家与数据可视化分析师。',
      '你的任务是根据【用户提问】与【多个大语言模型输出结果】，生成一份深度对比分析报告。',
      '报告风格参照《“高龄传奇”的能见度争夺战》舆情全景报告：不能只罗列表面差异，必须揭示模型底层的“逻辑链路失配”“知识茧房”“能力结构性矛盾”，并给出量化图表建议与可落地选型建议。',
      '',
      '# 硬约束',
      '1. 只能基于本次输入材料、差异追问和污染剔除结果分析；不能编造外部事实、不能伪造引用、不能假装做过搜索。',
      '2. 必须形成一个贯穿全文的“核心矛盾”，让报告有灵魂，而不是平铺直叙。',
      '3. 每个分析论点都要给出图表展现建议，让前端可直接开发可视化组件。',
      '4. 必须显式区分：事实错误、逻辑跳跃、表达差异、对齐噪音、信息能见度赤字、结构化失配。',
      '5. 量化指标必须给出 0-100 分或百分比；若依据不足，用“估算”标记，不可装作精确测量。',
      '6. 语言极度精炼、专业，优先使用“结构化失配”“认知冻结”“信息能见度赤字”“对齐税”“知识茧房”等分析术语。',
    ];
    if (wasRefined) {
      lines.push(
        '7. 用户原始提问与系统补全后的下发问题不一致：评测对象是模型对【实际下发问题】的回答；若发现补全引入的措辞影响了对比结论，需在【全局摘要 → 深层风险】中显式指出。'
      );
    }
    lines.push(
      '',
      '# 输出格式',
      '必须严格使用以下一级标题，标题单独占一行；标题下用二级小标题和项目符号展开。',
      ...HEADINGS,
      '',
      '# 每章写作要求',
      '全局摘要：必须包含【核心结论】【核心矛盾】【深层风险】【信任支点】【数据看板建议】五个小节；数据看板至少给出有效信息率、逻辑自洽度、事实保真度、对齐噪音率、综合可用性。',
      '一、必须包含 1.1 意图捕捉与框架对比、1.2 事实链条与幻觉对抗；必须给出多维拆解雷达图和事实链路桑基图建议。',
      '二、必须包含 2.1 逻辑路径双轨制、2.2 信息能见度赤字；必须给出信息密度漏斗图和逻辑链路树状图建议。',
      '三、必须包含 3.1 议题金字塔、3.2 风格与语气的平行宇宙；必须给出能力光谱气泡图和风格词云建议。',
      '四、必须包含 4.1 算法牢笼与 RLHF 偏好、4.2 知识库时间切片与领域茧房；必须给出对齐税/认知偏见解构图建议。',
      '五、必须包含 5.1 风险评估矩阵、5.2 场景化选型指南；必须给出四象限选型矩阵和混合工作流架构图建议。',
      '数据可视化组件规格：用列表列出每个图表的组件名、图表类型、字段、推荐编码方式、交互能力。',
      '',
      '# 结构化数据(必填,放在所有章节之后)',
      '在【数据可视化组件规格】之后,你必须再追加一个独立的代码块,起止严格用三反引号 + 小写 json 标注,内容为单个 JSON 对象,字段如下:',
      '- scoreboard: 数组,每个模型一项,结构 {"model": 模型名, "scores": {"有效信息率":int 0-100, "逻辑自洽度":int 0-100, "事实保真度":int 0-100, "对齐噪音率":int 0-100, "综合可用性":int 0-100}}。所有上方"参与模型"必须出现。',
      '- core_tension: {"axis_x": 一句话维度名, "axis_y": 一句话维度名, "summary": 不超过 60 字的核心矛盾陈述}。',
      '- selection_quadrant: 数组,每个模型一项,结构 {"model": 模型名, "cost": 0-100 估值(越大越贵/越慢), "quality": 0-100 估值, "scenario": 8-20 字最适合的场景}。',
      '- info_funnel: 数组,每个模型一项,结构 {"model": 模型名, "total_tokens": int 估算的总输出量, "core_tokens": int 估算的核心论点量, "alignment_noise_tokens": int 估算的对齐噪音量}。三者满足 core+alignment ≤ total。',
      '- alignment_tax: 数组,每个模型一项,结构 {"model": 模型名, "components": {"reasoning":int, "facts":int, "safety_padding":int, "hedging":int, "boilerplate":int}}。所有 components 数值范围 0-100,代表占总输出的百分比,五项之和不强制等于 100,但请尽量自洽。',
      '- fact_sankey: {"nodes": [{"id": 短 id, "label": 显示名, "tier": 0/1/2}], "links": [{"source": id, "target": id, "value": int 0-100, "kind": "support" | "weak" | "hallucination"}]}。tier 0=核心论点,tier 1=证据/事实链,tier 2=源头或断裂点(尤其要标记疑似幻觉)。节点和连线可少不可滥造。',
      '硬性 JSON 规则:严格 ASCII 双引号、不带尾逗号、不带注释、所有数值用整数;若某字段确实没有依据,可用空数组或保守估算并在 summary 字段里说明,但 JSON 结构必须完整可解析。',
      '',
      '# 参与模型',
      modelNames || '未识别模型名称'
    );
    if (wasRefined) {
      lines.push(
        '',
        '# 用户原始提问（未经补全）',
        originalQuestion,
        '',
        '# 实际下发问题（已由系统自动补全）',
        question
      );
    } else {
      lines.push('', '# 用户提问', question);
    }
    lines.push(
      '',
      '# 模型原始输出',
      formatReplies(modelReplies),
      '',
      '# 差异追问与二次合并结果',
      diffAnalyses,
      '',
      '# 污染剔除结果(千问初判)',
      pollution,
      '',
      '# AI 自我剔除污染结果(三家自审 + 千问归档)',
      '说明:三家 AI 已基于上面千问初判的污染清单做了自我裁定。下面是合并结果,其中 consensus_pollution 为三家都接受撤回的污染、contested_pollution 为仍有 AI 拒绝撤回的污染。',
      '在【全局摘要】【一】【四】各章中,凡涉及污染分析,优先采信 consensus_pollution;contested_pollution 必须显式标注"仍存在分歧"。',
      selfCleansing
    );
    return lines.join('\n');
  }

  global.DuoliEvaluationReportPrompt = {
    headings: HEADINGS.slice(),
    buildEvaluationReportPrompt,
  };
})(window);
