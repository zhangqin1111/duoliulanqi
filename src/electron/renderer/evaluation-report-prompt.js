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
    const modelReplies = normalizeReplies(data.modelReplies || data.results || []);
    const modelNames = modelReplies.map((reply) => reply.name).join(' / ');
    const diffAnalyses = data.diffAnalyses ? JSON.stringify(data.diffAnalyses, null, 2) : '[]';
    const pollution = data.pollution ? JSON.stringify(data.pollution, null, 2) : '{}';

    return [
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
      '# 参与模型',
      modelNames || '未识别模型名称',
      '',
      '# 用户提问',
      question,
      '',
      '# 模型原始输出',
      formatReplies(modelReplies),
      '',
      '# 差异追问与二次合并结果',
      diffAnalyses,
      '',
      '# 污染剔除结果',
      pollution,
    ].join('\n');
  }

  global.DuoliEvaluationReportPrompt = {
    headings: HEADINGS.slice(),
    buildEvaluationReportPrompt,
  };
})(window);
