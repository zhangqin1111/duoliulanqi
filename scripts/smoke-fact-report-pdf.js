const fs = require('fs');
const os = require('os');
const path = require('path');
const { app, BrowserWindow } = require('electron');
const factTemplate = require('../src/electron/report/fact-template');

const outputPath = path.resolve(__dirname, '..', 'docs', 'fact-black-box-sample-report.pdf');
const htmlPath = path.join(os.tmpdir(), `duoli_fact_report_smoke_${Date.now()}.html`);

const report = {
  meta: {
    question_original: '郭德纲最近舆论怎么看？',
    question_refined:
      '请围绕“郭德纲最近舆论”提供一份可用于后续多模型对比和追根溯源分析的材料，重点包含最近舆论事件、争议焦点、不同观点、时间脉络、可核验事实、疑似谣言或不确定信息、各类说法的可能来源。',
    generated_at: new Date().toISOString(),
    models: ['Kimi', '豆包', '元宝'],
    workflow_rounds: 3,
  },
  executive_conclusion: {
    one_sentence: '当前仅存在讨论热度，不存在新的可验证舆情事件。',
    status: 'weak',
    confidence_score: 76,
    confidence_label: '中高可信',
    core_tension: '多模型只在“有热度”上趋同；源头、时间边界和事件性质均未闭环。',
    largest_uncertainty: '缺少外部一手来源和明确时间窗口，部分事件细节仍停留在模型间互证层面。',
    risk_level: 'medium',
  },
  question_brief: {
    original: '郭德纲最近舆论怎么看？',
    refined:
      '请围绕“郭德纲最近舆论”提供一份可用于多模型对比和去伪存真报告的结构化材料。',
    constraints: ['最近/当前', '不自行添加具体日期', '区分事实与推测', '标注待核验内容'],
    analysis_goals: ['事实脉络', '争议焦点', '差异追问', '污染剔除', '最终裁决'],
  },
  user_issue_analysis: {
    direct_answer:
      '结论：当前不存在新的可验证舆情事件，仅为历史争议的延续讨论。可保留判断只有“热度存在、负面与调侃更可见”；不可采信“单一事件引爆”“广泛声誉塌陷”等强结论。',
    public_opinion_temperature: 68,
    temperature_label: '中高热',
    dominant_sentiment: '调侃、质疑与围观并存，负面可见度高于正向支持',
    sentiment_distribution: [
      { label: '质疑/批评', value: 36, note: '围绕行业地位、作品争议和公众形象展开' },
      { label: '围观/中性', value: 31, note: '更多是在复述话题和等待进一步事实' },
      { label: '调侃/娱乐化', value: 22, note: '短视频语境中容易被段子化传播' },
      { label: '支持/辩护', value: 11, note: '粉丝与相声受众仍有基本盘' },
    ],
    stance_distribution: [
      { label: '路人围观', value: 34, note: '不急于下结论，关注事件是否有实锤' },
      { label: '批评者', value: 29, note: '更容易放大历史争议与人设反差' },
      { label: '粉丝支持', value: 18, note: '强调作品贡献和行业地位' },
      { label: '媒体/搬运号', value: 19, note: '决定话题能见度，但也容易引入噪音' },
    ],
    audience_segments: [
      { label: '短视频用户', heat: 82, credibility: 42, weight: 76, narrative: '更容易把复杂争议压缩成情绪标签。' },
      { label: '相声受众', heat: 56, credibility: 68, weight: 50, narrative: '更关注作品、师承、行业贡献。' },
      { label: '粉丝群体', heat: 48, credibility: 58, weight: 42, narrative: '倾向辩护和弱化负面。' },
      { label: '路人舆论', heat: 66, credibility: 55, weight: 64, narrative: '主要受可见信息流影响。' },
      { label: '营销号', heat: 74, credibility: 32, weight: 46, narrative: '可能制造标题化、冲突化叙事。' },
    ],
    key_findings: [
      '舆论有热度，但目前更像阶段性升温，不宜直接定性为全面危机。',
      '负面信息能见度更高，原因可能是争议内容天然更适合短视频传播。',
      '多模型对具体源头说法不一致，说明“为什么突然热起来”仍是最大盲点。',
      '粉丝支持和行业贡献叙事仍存在，但在公共讨论场里声量不一定占优。',
      '最终结论应使用“趋势研判”而不是“事实裁决”口径。',
    ],
    narrative_summary:
      '当前叙事链大致是：历史争议/行业评价被重新翻出，短视频和社交平台放大调侃与质疑，粉丝侧用作品贡献和行业地位进行对冲，路人侧则保持围观。真正的分歧不在“有没有讨论”，而在讨论是否已经构成明确负面舆情事件。',
    risk_matrix: [
      { title: '把阶段热度误判为塌房', impact: 82, probability: 58, mitigation: '只写热度与争议，不写确定性危机。' },
      { title: '引用未经核验爆料', impact: 78, probability: 46, mitigation: '所有爆料单列为待核验。' },
      { title: '粉丝/黑粉样本偏置', impact: 64, probability: 72, mitigation: '区分核心粉圈、路人盘和媒体搬运。' },
      { title: '时间窗口漂移', impact: 58, probability: 66, mitigation: '明确“最近/当前”，不补造具体日期。' },
    ],
    blindspots: ['缺少平台热搜曲线', '缺少高传播原帖来源', '缺少正负声量比例的一手数据', '缺少线下商业影响指标'],
  },
  fact_map: {
    timeline: [
      {
        id: 'F1',
        time: '最近/当前',
        event: '多个模型都提到郭德纲相关话题存在舆论讨论，但具体触发事件表述不完全一致。',
        status: 'confirmed',
        sources: ['Kimi', '豆包', '元宝'],
        note: '属于多模型共识，但仍需要外部搜索确认具体热度来源。',
      },
      {
        id: 'F2',
        time: '最近/当前',
        event: '部分模型把舆论归因于单一事件或短视频传播，证据链不足。',
        status: 'disputed',
        sources: ['豆包', '元宝'],
        note: '归因强度高于材料支撑，需降权处理。',
      },
    ],
    confirmed_facts: [
      {
        id: 'C1',
        time: '最近/当前',
        event: '主线判断可以保留为“存在讨论热度”，但不能直接升级为“确定性舆情危机”。',
        status: 'confirmed',
        sources: ['Kimi', '豆包', '元宝'],
        note: '多模型主线收敛。',
      },
    ],
    uncertain_claims: [
      {
        id: 'U1',
        time: '最近/当前',
        event: '具体触发点、传播规模和影响范围仍需外部平台数据核验。',
        status: 'uncertain',
        sources: ['Kimi'],
        note: '缺少一手平台数据。',
      },
    ],
    polluted_claims: [
      {
        id: 'P1',
        time: '最近/当前',
        event: '把未经核验的网友观点包装成确定舆论结论。',
        status: 'polluted',
        sources: ['模型综合'],
        note: '属于推理跃迁和来源错配。',
      },
    ],
  },
  dispute_map: {
    summary: '本轮主要差异集中在事实源头、时间口径和因果解释三个层面。',
    items: [
      {
        id: 'D1',
        title: '舆论源头是否来自单一事件',
        type: '因果差异',
        severity: 'high',
        why_it_matters: '如果源头判断错误，最终报告会把阶段性讨论误判为单点危机。',
        model_claims: [
          { model: 'Kimi', claim: '更谨慎地描述为近期讨论升温。', evidence_level: '中', risk: '结论偏保守' },
          { model: '豆包', claim: '倾向归因于具体争议事件。', evidence_level: '弱', risk: '存在过度归因' },
          { model: '元宝', claim: '强调短视频与粉丝讨论扩散。', evidence_level: '中', risk: '传播链需核验' },
        ],
        followup_question: '为什么模型对舆论源头给出不同判断？',
        followup_summary: '差异主要来自事实来源和时间口径不一致。',
        pollution_removed: ['单一事件强归因', '未经核验的传播规模判断'],
        retained_judgment: '保留“存在舆论讨论热度”，暂不保留“确定由单一事件引爆”。',
      },
    ],
  },
  evidence_funnel: {
    raw_claims: 38,
    cross_checked: 14,
    followup_retained: 8,
    pollution_removed: 24,
    final_evidence: 5,
  },
  model_profiles: [
    {
      model: 'Kimi',
      witness_type: '谨慎证人',
      strengths: ['边界意识较强', '较少强行下结论'],
      risks: ['可能保守', '细节展开不足'],
      scores: {
        fact_fidelity: 82,
        time_sensitivity: 74,
        logic_consistency: 80,
        information_density: 76,
        verifiability: 72,
        pollution_control: 84,
        followup_responsiveness: 78,
      },
    },
    {
      model: '豆包',
      witness_type: '发散证人',
      strengths: ['材料丰富', '舆论角度多'],
      risks: ['归因偏快', '需剔除推测'],
      scores: {
        fact_fidelity: 70,
        time_sensitivity: 72,
        logic_consistency: 68,
        information_density: 84,
        verifiability: 64,
        pollution_control: 66,
        followup_responsiveness: 76,
      },
    },
    {
      model: '元宝',
      witness_type: '场景证人',
      strengths: ['传播链描述较完整', '风险提示清晰'],
      risks: ['部分细节需核验', '容易受平台信息影响'],
      scores: {
        fact_fidelity: 76,
        time_sensitivity: 78,
        logic_consistency: 74,
        information_density: 80,
        verifiability: 70,
        pollution_control: 72,
        followup_responsiveness: 75,
      },
    },
  ],
  source_diagnosis: {
    root_causes: ['事实来源不同', '时间边界不同', '舆论归因口径不同', '平台信息抓取能力差异'],
    pollution_factors: ['强因果包装', '未经核验的传播规模', '把推测写成事实'],
    retained_judgment: '剔除污染后，当前只适合判断为“存在近期讨论热度，但舆论性质和源头仍需核验”。',
  },
  final_actions: ['补充外部一手来源', '核验具体触发事件', '区分粉丝讨论与公众舆情', '避免把弱证据写成强结论'],
};

const payload = {
  question: report.meta.question_original,
  generatedAt: report.meta.generated_at,
  rawReplies: report.meta.models.map((name) => ({
    name,
    text: `${name} 的模拟原始回复：围绕郭德纲最近舆论提供结构化分析素材，包含事实脉络、争议焦点、待核验内容和风险提示。`,
  })),
};

async function main() {
  await app.whenReady();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(htmlPath, factTemplate.buildReportHtml(payload, report), 'utf8');
  const win = new BrowserWindow({ show: false, webPreferences: { javascript: false } });
  await win.loadFile(htmlPath);
  const pdf = await win.webContents.printToPDF({
    pageSize: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    printBackground: true,
    preferCSSPageSize: true,
  });
  fs.writeFileSync(outputPath, pdf);
  win.destroy();
  try {
    fs.unlinkSync(htmlPath);
  } catch (_) {
    /* ignore */
  }
  console.log(outputPath);
  app.quit();
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  app.exit(1);
});
