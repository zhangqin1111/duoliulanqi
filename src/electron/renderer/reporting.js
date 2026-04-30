(function attachReporting(global) {
  const promptApi = global.DuoliEvaluationReportPrompt || {};
  const EVALUATION_HEADINGS = Array.isArray(promptApi.headings)
    ? promptApi.headings
    : [
        '全局摘要：多模型能力全景与核心矛盾',
        '一、 输出脉络与事实坐标对比',
        '二、 核心逻辑链路与信息能见度分析',
        '三、 能力光谱与场景割裂剖析',
        '四、 深层动因与价值观对齐探讨',
        '五、 选型研判与调用策略推演',
        '数据可视化组件规格',
      ];
  const LEGACY_HEADINGS = ['核心结论', '相同观点', '不同观点', '关键争议', '遗漏与盲区', '行动建议'];
  const REPORT_HEADINGS = [...EVALUATION_HEADINGS, ...LEGACY_HEADINGS];

  function sectionItems(text) {
    return String(text || '')
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^[•·\-\d.()（）、\s]+/, '').trim())
      .filter(Boolean);
  }

  function normalizeHeading(line) {
    return String(line || '')
      .trim()
      .replace(/^#{1,3}\s*/, '')
      .replace(/[：:]\s*$/, '')
      .replace(/\s+/g, '')
      .trim();
  }

  function isReportHeading(line, heading) {
    return normalizeHeading(line) === normalizeHeading(heading);
  }

  function parseReportSections(summaryText) {
    const text = String(summaryText || '').trim();
    const sections = Object.fromEntries(REPORT_HEADINGS.map((heading) => [heading, '']));
    if (!text) return sections;

    const buckets = Object.fromEntries(REPORT_HEADINGS.map((heading) => [heading, []]));
    let currentHeading = '';

    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      const matchedHeading = REPORT_HEADINGS.find((heading) => isReportHeading(line, heading));
      if (matchedHeading) {
        currentHeading = matchedHeading;
        continue;
      }
      if (!currentHeading) continue;
      if (!line) {
        if (buckets[currentHeading].length) buckets[currentHeading].push('');
        continue;
      }
      buckets[currentHeading].push(line);
    }

    for (const heading of REPORT_HEADINGS) {
      sections[heading] = buckets[heading].join('\n').trim();
    }
    return sections;
  }

  function extractCompareSection(summaryText, heading) {
    const sections = parseReportSections(summaryText);
    if (sections[heading]) return sections[heading];
    if (heading === '相同观点') return sections['全局摘要：多模型能力全景与核心矛盾'] || '';
    if (heading === '不同观点') {
      return [
        sections['二、 核心逻辑链路与信息能见度分析'],
        sections['四、 深层动因与价值观对齐探讨'],
      ]
        .filter(Boolean)
        .join('\n\n');
    }
    return '';
  }

  function buildComparePrompt(userQuestion, results) {
    const modelReplies = (Array.isArray(results) ? results : []).map(({ cfg, r }) => ({
      name: cfg && cfg.name ? cfg.name : 'Unknown',
      ok: !!(r && r.ok),
      text: r && r.ok ? String(r.text || '').trim() : '',
      error: r && !r.ok ? String(r.error || '') : '',
    }));
    if (promptApi && typeof promptApi.buildEvaluationReportPrompt === 'function') {
      return promptApi.buildEvaluationReportPrompt({
        question: userQuestion,
        modelReplies,
      });
    }
    return [
      '请基于以下多模型回答生成深度对比分析报告，必须包含核心矛盾、风险、图表建议和选型建议。',
      `用户提问：${userQuestion}`,
      ...modelReplies.map((reply) => `【${reply.name}】\n${reply.ok ? reply.text : reply.error}`),
    ].join('\n\n');
  }

  function getSection(sections, heading) {
    return sectionItems(sections[heading]);
  }

  function buildReportPayload(input) {
    const data = input || {};
    const summaryText = String(data.summaryText || '').trim();
    const sections = parseReportSections(summaryText);
    const evaluation = {
      globalSummary: getSection(sections, '全局摘要：多模型能力全景与核心矛盾'),
      outputTrace: getSection(sections, '一、 输出脉络与事实坐标对比'),
      logicVisibility: getSection(sections, '二、 核心逻辑链路与信息能见度分析'),
      capabilitySpectrum: getSection(sections, '三、 能力光谱与场景割裂剖析'),
      alignmentCauses: getSection(sections, '四、 深层动因与价值观对齐探讨'),
      selectionStrategy: getSection(sections, '五、 选型研判与调用策略推演'),
      visualizationSpec: getSection(sections, '数据可视化组件规格'),
    };
    return {
      question: String(data.questionText || '').trim(),
      generatedAt: data.generatedAt || new Date().toISOString(),
      summaryText,
      sections: {
        ...evaluation,
        coreConclusion: getSection(sections, '核心结论').length
          ? getSection(sections, '核心结论')
          : evaluation.globalSummary,
        same: getSection(sections, '相同观点').length ? getSection(sections, '相同观点') : evaluation.outputTrace,
        diff: getSection(sections, '不同观点').length ? getSection(sections, '不同观点') : evaluation.logicVisibility,
        keyDebates: getSection(sections, '关键争议').length
          ? getSection(sections, '关键争议')
          : evaluation.capabilitySpectrum,
        gaps: getSection(sections, '遗漏与盲区').length ? getSection(sections, '遗漏与盲区') : evaluation.alignmentCauses,
        actions: getSection(sections, '行动建议').length ? getSection(sections, '行动建议') : evaluation.selectionStrategy,
      },
      reportHeadings: EVALUATION_HEADINGS.slice(),
      rawReplies: Array.isArray(data.rawReplies) ? data.rawReplies : [],
      analysisSession: data.analysisSession || null,
    };
  }

  global.DuoliReporting = {
    headings: REPORT_HEADINGS.slice(),
    evaluationHeadings: EVALUATION_HEADINGS.slice(),
    sectionItems,
    parseReportSections,
    extractCompareSection,
    buildComparePrompt,
    buildReportPayload,
  };
})(window);
