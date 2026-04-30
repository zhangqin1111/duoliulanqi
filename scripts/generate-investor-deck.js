'use strict';

const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  PageBreak,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  Tab,
  LevelFormat,
  ImageRun,
  convertInchesToTwip,
} = require('docx');

const ASSETS = path.join(__dirname, '..', 'assets', 'charts');
function loadPng(name) {
  const p = path.join(ASSETS, `${name}.png`);
  return fs.existsSync(p) ? fs.readFileSync(p) : null;
}
function imageParagraph(name, opts = {}) {
  const buf = loadPng(name);
  if (!buf) return p(tx(`(图表 ${name}.png 缺失,请先运行 npm run deck:assets)`, { color: C.muted, italics: true, size: 20 }));
  const width = opts.width || 560;
  const height = opts.height || Math.round(width * 0.62);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: opts.before || 160, after: opts.after || 80 },
    children: [
      new ImageRun({
        data: buf,
        transformation: { width, height },
      }),
    ],
  });
}
function imageCaption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 240 },
    children: [tx(text, { size: 18, color: C.muted, italics: true })],
  });
}

const FONT = '微软雅黑';
const FONT_LATIN = 'Calibri';
const C = {
  ink: '1F2430',
  muted: '6A7387',
  primary: '3C6DF0',
  accent: 'F6A23A',
  green: '18794E',
  red: 'E35D6A',
  purple: '9B51E0',
  cyan: '0EA5E9',
  panel: 'F5F3EF',
  rule: 'D8DDE8',
};

function tx(text, opts = {}) {
  return new TextRun({
    text: String(text),
    font: { ascii: FONT_LATIN, eastAsia: FONT, hAnsi: FONT_LATIN },
    size: opts.size || 22,
    color: opts.color || C.ink,
    bold: !!opts.bold,
    italics: !!opts.italics,
    break: opts.break || 0,
  });
}

function p(runs, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: opts.before == null ? 80 : opts.before, after: opts.after == null ? 80 : opts.after, line: opts.line || 360 },
    indent: opts.indent ? { left: opts.indent } : undefined,
    children: Array.isArray(runs) ? runs : [runs],
    shading: opts.shading
      ? { type: ShadingType.SOLID, color: 'auto', fill: opts.shading }
      : undefined,
    border: opts.border,
  });
}

function spacer(size) {
  return new Paragraph({
    spacing: { before: size || 200, after: size || 200 },
    children: [new TextRun({ text: '' })],
  });
}

function rule() {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: { bottom: { color: C.rule, style: BorderStyle.SINGLE, size: 6 } },
    children: [new TextRun({ text: '' })],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function h1(text, color) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 240 },
    children: [
      new TextRun({
        text: String(text),
        font: { ascii: FONT_LATIN, eastAsia: FONT, hAnsi: FONT_LATIN },
        size: 36,
        bold: true,
        color: color || C.ink,
      }),
    ],
  });
}

function h2(text, color) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 160 },
    children: [
      new TextRun({
        text: String(text),
        font: { ascii: FONT_LATIN, eastAsia: FONT, hAnsi: FONT_LATIN },
        size: 28,
        bold: true,
        color: color || C.primary,
      }),
    ],
  });
}

function h3(text, color) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text: String(text),
        font: { ascii: FONT_LATIN, eastAsia: FONT, hAnsi: FONT_LATIN },
        size: 24,
        bold: true,
        color: color || C.ink,
      }),
    ],
  });
}

function eyebrow(text, color) {
  return new Paragraph({
    spacing: { before: 80, after: 40 },
    children: [
      new TextRun({
        text: String(text).toUpperCase(),
        font: { ascii: FONT_LATIN, eastAsia: FONT, hAnsi: FONT_LATIN },
        size: 16,
        bold: true,
        characterSpacing: 60,
        color: color || C.muted,
      }),
    ],
  });
}

function bullet(text, opts = {}) {
  const runs = Array.isArray(text) ? text : [tx(text, { size: 22 })];
  return new Paragraph({
    spacing: { before: 60, after: 60, line: 340 },
    bullet: { level: 0 },
    indent: { left: 360 },
    children: runs,
    ...opts,
  });
}

function leadBody(lead, body) {
  return new Paragraph({
    spacing: { before: 80, after: 100, line: 340 },
    bullet: { level: 0 },
    indent: { left: 360 },
    children: [
      tx(`${lead} `, { bold: true, color: C.ink, size: 22 }),
      tx(body, { color: '4B5563', size: 22 }),
    ],
  });
}

function cell(text, opts = {}) {
  const fill = opts.fill;
  const isHeader = !!opts.header;
  const runs = Array.isArray(text) ? text : [tx(text, { size: opts.size || 20, bold: isHeader || opts.bold, color: isHeader ? 'FFFFFF' : opts.color || C.ink })];
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PCT } : undefined,
    shading: fill ? { type: ShadingType.SOLID, color: 'auto', fill } : undefined,
    margins: { top: 120, bottom: 120, left: 200, right: 200 },
    children: [
      new Paragraph({
        alignment: opts.align || AlignmentType.LEFT,
        spacing: { before: 0, after: 0 },
        children: runs,
      }),
    ],
  });
}

function table(rows, opts = {}) {
  return new Table({
    width: { size: opts.width || 100, type: WidthType.PCT },
    rows: rows.map((row) => new TableRow({ children: row })),
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: C.rule },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: C.rule },
      left: { style: BorderStyle.SINGLE, size: 4, color: C.rule },
      right: { style: BorderStyle.SINGLE, size: 4, color: C.rule },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: C.rule },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: C.rule },
    },
  });
}

function callout(title, body, color) {
  const tone = color || C.primary;
  return [
    new Paragraph({
      spacing: { before: 200, after: 60, line: 340 },
      shading: { type: ShadingType.SOLID, color: 'auto', fill: 'EEF2FA' },
      border: {
        left: { color: tone, style: BorderStyle.SINGLE, size: 24 },
      },
      indent: { left: 240 },
      children: [tx(title, { bold: true, color: tone, size: 22 })],
    }),
    new Paragraph({
      spacing: { before: 0, after: 200, line: 340 },
      shading: { type: ShadingType.SOLID, color: 'auto', fill: 'EEF2FA' },
      border: {
        left: { color: tone, style: BorderStyle.SINGLE, size: 24 },
      },
      indent: { left: 240 },
      children: [tx(body, { color: '2F3441', size: 22 })],
    }),
  ];
}

// ───── 内容章节 ─────

function coverPage() {
  return [
    new Paragraph({
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: 'FILTER WORKBENCH · CONFIDENTIAL',
          font: { ascii: FONT_LATIN, hAnsi: FONT_LATIN },
          size: 18,
          bold: true,
          characterSpacing: 80,
          color: C.muted,
        }),
      ],
    }),
    imageParagraph('cover', { width: 620, height: 348, before: 280, after: 360 }),
    rule(),
    p(
      [
        tx('把 ', { size: 30 }),
        tx('N 家 AI 的回答', { bold: true, size: 30, color: C.primary }),
        tx(' 压缩成 ', { size: 30 }),
        tx('1 份可决策的结构化报告', { bold: true, size: 30, color: C.accent }),
        tx('。', { size: 30 }),
      ],
      { before: 240, after: 240, line: 480 }
    ),
    p(
      tx('为企业、投资机构与合规部门提供"多模型并发对比 + 去伪存真闭环 + 投行级可视化报告"的一站式工作台。', { size: 22, color: '4B5563' }),
      { before: 0, after: 480, line: 380 }
    ),
    rule(),
    spacer(200),
    p([tx('VERSION', { size: 16, color: C.muted, bold: true }), tx('       v0.1 · 内部技术验证版本', { size: 22 })], { before: 80 }),
    p([tx('DATE   ', { size: 16, color: C.muted, bold: true }), tx(`       ${new Date().toLocaleDateString('zh-CN')}`, { size: 22 })], { before: 60 }),
    p([tx('AUDIENCE', { size: 16, color: C.muted, bold: true }), tx('     投资人 · 战略合作方', { size: 22 })], { before: 60 }),
    pageBreak(),
  ];
}

function teamSection() {
  const member = (initial, name, role, bio, color) => [
    new Paragraph({
      spacing: { before: 240, after: 60 },
      shading: { type: ShadingType.SOLID, color: 'auto', fill: 'F8F9FC' },
      border: { left: { color: color, style: BorderStyle.SINGLE, size: 24 } },
      indent: { left: 240 },
      children: [
        tx(`${initial}  `, { bold: true, size: 32, color: color }),
        tx(`${name}`, { bold: true, size: 26, color: C.ink }),
        tx(`     ${role}`, { size: 20, color: C.muted }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 240, line: 380 },
      shading: { type: ShadingType.SOLID, color: 'auto', fill: 'F8F9FC' },
      border: { left: { color: color, style: BorderStyle.SINGLE, size: 24 } },
      indent: { left: 240 },
      children: [tx(bio, { size: 22, color: '2F3441' })],
    }),
  ];

  return [
    eyebrow('Team'),
    h1('十一、团队介绍'),
    rule(),
    p(tx('滤镜由产品、算法、设计三方协作而成,核心团队具备多年大模型工程化与企业级软件交付经验。', { size: 22, color: '4B5563' }), { before: 120, after: 120 }),
    ...member('Z', '创始人 & CEO', '产品 / 战略 · 待补充姓名', '负责产品战略、商务与融资。背景:[请补充 8-15 字背景描述,例如"某头部 AI 公司前产品总监,主导 0→1 大模型企业级落地"]。', C.primary),
    ...member('Q', '联合创始人 & CTO', '算法 / 工程 · 待补充姓名', '负责整体架构、千问裁判链路、自审引擎与可视化系统。背景:[请补充技术背景,例如"前阿里 / 百度算法专家,负责过 N 个亿级用户产品的 NLP 系统"]。', C.cyan),
    ...member('S', '联合创始人 & 设计负责人', '产品 / 视觉 · 待补充姓名', '负责报告排版、图表语言与品牌系统。投行级 PDF 报告与本份汇报均出自其手。背景:[请补充设计背景]。', C.accent),
    h3('顾问团 (Advisory)', C.purple),
    p(tx('· [顾问 1] —— 知名 AI 公司技术合伙人,在大模型评测领域有深度积累', { size: 22, color: '4B5563' }), { before: 60, after: 60 }),
    p(tx('· [顾问 2] —— 头部 VC 机构合伙人,关注企业级 AI 应用赛道', { size: 22, color: '4B5563' }), { before: 0, after: 60 }),
    p(tx('· [顾问 3] —— 大型央企信息化部门负责人,熟悉企业 AI 选型落地痛点', { size: 22, color: '4B5563' }), { before: 0, after: 60 }),
    spacer(160),
    p(tx('注:本页人员信息为占位模板,正式对外版本前请填入实名、岗位与简历亮点。', { size: 18, color: C.muted, italics: true }), { before: 200 }),
    pageBreak(),
  ];
}

function executiveSummary() {
  return [
    eyebrow('Executive Summary'),
    h1('一、执行摘要'),
    rule(),
    p(
      tx('我们正处在大模型百舸争流的时间点。ChatGPT、Claude、Gemini、文心、千问、Kimi、豆包……每一家都自称"最强",但企业、投资机构、合规部门面对同一个问题:它们之间到底谁说得对?谁是幻觉?谁的对齐税最高?', { size: 24, color: C.ink }),
      { before: 120, after: 120, line: 400 }
    ),
    p(
      tx('滤镜把这件事自动化:一次提问同时打到多家 AI,再用千问做"裁判"跑差异追问、自审污染、共识归档,最后输出一份带可视化图表的 PDF 报告,直接用于决策。', { size: 24, color: '2F3441' }),
      { before: 0, after: 120, line: 400 }
    ),
    spacer(120),
    table([
      [
        cell('核心能力', { header: true, fill: C.primary, width: 25 }),
        cell('已实现', { header: true, fill: C.primary, width: 50 }),
        cell('成熟度', { header: true, fill: C.primary, align: AlignmentType.CENTER, width: 25 }),
      ],
      [
        cell('多模型并发', { bold: true }),
        cell('用户一句话 → 千问自动补全 → 同时下发给 N 家 AI,实时抓取回复'),
        cell('已上线', { color: C.green, bold: true, align: AlignmentType.CENTER }),
      ],
      [
        cell('去伪存真闭环', { bold: true }),
        cell('差异抽取 → 收敛驱动追问(最多 4 轮) → 千问初判污染 → 三家 AI 自审 → 共识归档'),
        cell('已上线', { color: C.green, bold: true, align: AlignmentType.CENTER }),
      ],
      [
        cell('投行级 PDF 报告', { bold: true }),
        cell('封面 + 目录 + 7 章带图正文 + 6 类原生 SVG 可视化 + 附录,可直接用于投资 / 选型 / 合规'),
        cell('已上线', { color: C.green, bold: true, align: AlignmentType.CENTER }),
      ],
      [
        cell('外部 AI / 全网核查', { bold: true }),
        cell('引入第三方裁判模型 + 联网搜索接口,做事实层交叉验证'),
        cell('规划中', { color: C.accent, bold: true, align: AlignmentType.CENTER }),
      ],
    ]),
    spacer(160),
    ...callout('一句话价值主张', '别再问"哪家 AI 最强";让滤镜在 5 分钟内告诉你"在你这个具体问题上,哪家说得最像样、哪家在编故事、哪家应该被路由到哪种业务场景"。', C.primary),
    pageBreak(),
  ];
}

function problemSection() {
  return [
    eyebrow('The Problem'),
    h1('二、市场痛点 · 多 AI 时代的"信息真假难辨"', C.red),
    rule(),
    p(tx('大模型生态的繁荣让信息丰富,也让信息可信度急剧下降。我们识别出三个直接痛点:', { size: 22, color: '4B5563' }), { before: 120, after: 200 }),
    leadBody('AI 选型基本靠拍脑袋。', '企业接入大模型时缺乏系统化评估方法,常以"听说 GPT 最强"或"我们对接过 Kimi"作为唯一依据,导致后续业务出现幻觉、对齐税、口径漂移问题时无法归因。'),
    leadBody('幻觉与对齐税无人甄别。', 'AI 越是"自信"地输出长篇结构化答案,越容易隐藏事实错误。普通用户没有工具识别哪些是模板话术、哪些是安全规避、哪些是无证据补全。'),
    leadBody('多 AI 对比靠人工 copy-paste。', '用户打开多个 AI 网页,手动复制问题、手动比对答案、手动整理差异。这种作业方式无法规模化,也无法形成可审计的决策依据。'),
    spacer(160),
    ...callout(
      '我们的判断',
      '未来 18 个月,任何严肃的 AI 落地都需要一层"裁判 / 审计 / 路由"的中间件。先把这层做得专业、好看、可解释,就拿到了多 AI 时代企业级流量的入口。',
      C.red
    ),
    pageBreak(),
  ];
}

function solutionSection() {
  return [
    eyebrow('The Solution'),
    h1('三、产品概览 · 五阶段全自动工作流', C.primary),
    rule(),
    p(tx('滤镜是一个桌面工作台,内置千问作为"裁判 AI",外接 N 家被评测 AI(已支持 Kimi / Doubao / Yuanbao / Wenxin,可扩展)。从用户输入到 PDF 报告,全流程 5 个阶段、全部自动化。', { size: 22, color: '4B5563' }), { before: 120, after: 200 }),
    table([
      [
        cell('阶段', { header: true, fill: C.primary, width: 8, align: AlignmentType.CENTER }),
        cell('名称', { header: true, fill: C.primary, width: 22 }),
        cell('做什么', { header: true, fill: C.primary, width: 50 }),
        cell('产出', { header: true, fill: C.primary, width: 20 }),
      ],
      [
        cell('1', { align: AlignmentType.CENTER, bold: true, color: C.primary }),
        cell('智能预处理', { bold: true }),
        cell('用户一句话 → 千问自动补全成"高质量提问",8 秒超时回退原文'),
        cell('标准化提问', { color: C.muted }),
      ],
      [
        cell('2', { align: AlignmentType.CENTER, bold: true, color: C.primary }),
        cell('多模型并发回答', { bold: true }),
        cell('同一份提问同时下发给 N 家 AI,并发抓取原始回答,互不干扰'),
        cell('N 份独立答案', { color: C.muted }),
      ],
      [
        cell('3', { align: AlignmentType.CENTER, bold: true, color: C.primary }),
        cell('去伪存真闭环', { bold: true, color: C.primary }),
        cell('差异抽取 → 收敛驱动追问 → 污染初判 → AI 自我剔除 → 共识归档(详见第四章)'),
        cell('共识/分歧清单', { color: C.muted }),
      ],
      [
        cell('4', { align: AlignmentType.CENTER, bold: true, color: C.primary }),
        cell('结构化报告生成', { bold: true }),
        cell('千问流式生成 7 章深度报告 + 末尾 JSON 数据看板'),
        cell('结构化文本', { color: C.muted }),
      ],
      [
        cell('5', { align: AlignmentType.CENTER, bold: true, color: C.primary }),
        cell('投行级 PDF 导出', { bold: true }),
        cell('封面 + 目录 + 执行看板 + 7 章带图 + 6 类可视化 + 附录'),
        cell('一份 PDF', { color: C.muted, bold: true }),
      ],
    ]),
    spacer(200),
    ...callout('全流程时间', '一次完整跑通(包括三家 AI 答题 + 自审 + 报告生成 + PDF)平均 3-7 分钟。同等工作量人工至少 1-2 小时,且无法形成结构化产出。', C.green),
    pageBreak(),
  ];
}

function differentiationSection() {
  return [
    eyebrow('Moat'),
    h1('四、核心壁垒 · 四大差异化', C.purple),
    rule(),
    p(tx('我们不是又一个"AI 网关"或"AI 聚合搜索"。滤镜的真正壁垒在于把"多 AI 的争议"产品化:', { size: 22, color: '4B5563' }), { before: 120, after: 200 }),
    h3('① 千问当裁判,但被告必须自己上场撤回污染', C.primary),
    p(tx('行业里大多数"AI 对比"工具止步于让 GPT 当裁判说"A 比 B 好"。滤镜走得更深:千问先初判污染清单(模板话术、安全规避、幻觉补全……),然后把每家被点名的污染项送回该 AI 自己手中,要求逐条裁定接受撤回 / 部分接受 / 拒绝坚持,再由千问归档共识与分歧。这套"裁判 + 自辩 + 归档"的三段式,是行业首创。', { size: 22, color: '2F3441' }), { before: 0, after: 200, line: 380 }),
    h3('② 收敛驱动追问,不是固定 N 轮', C.cyan),
    p(tx('当三家 AI 出现差异,滤镜会让它们互相解释"为什么不一致",千问做求同存异。如果还有实质分歧,继续追问 ── 直到收敛或最多 4 轮。这意味着简单问题快速结束,复杂问题深度刨,系统资源花在刀刃上。', { size: 22, color: '2F3441' }), { before: 0, after: 200, line: 380 }),
    h3('③ 报告不仅给文字,还给可视化 + JSON 数据看板', C.accent),
    p(tx('千问流式输出 7 章报告时,被强约束在末尾生成一段结构化 JSON,包含五维评分 / 选型四象限 / 信息漏斗 / 对齐税分布 / 桑基论证链等数据。导出 PDF 时这些数据被原生 SVG 渲染成 6 类图表,无外部依赖、可离线、可二次开发为 SaaS 数据 API。', { size: 22, color: '2F3441' }), { before: 0, after: 200, line: 380 }),
    h3('④ 输出可直接用于决策的"三类工作流"', C.green),
    p(tx('每份报告都按"风险评估 + 选型矩阵 + 提示词调优 + 混合编排"四个角度给出可落地建议,直接对接投资尽调、企业 AI 选型、合规事实核查三类高价值场景。', { size: 22, color: '2F3441' }), { before: 0, after: 200, line: 380 }),
    pageBreak(),
  ];
}

function workflowDeepDive() {
  return [
    eyebrow('Workflow Deep Dive'),
    h1('五、去伪存真闭环 · 核心引擎拆解', C.primary),
    rule(),
    p(tx('阶段三是滤镜真正的"心脏"。我们用 5 个子步骤实现"AI 互辨 + 自我剔除 + 共识归档"。', { size: 22, color: '4B5563' }), { before: 120, after: 200 }),
    table([
      [
        cell('子步骤', { header: true, fill: C.primary, width: 12 }),
        cell('做什么', { header: true, fill: C.primary, width: 56 }),
        cell('裁判 / 被告', { header: true, fill: C.primary, width: 32 }),
      ],
      [
        cell('① 差异抽取', { bold: true, color: C.primary }),
        cell('千问扫描 N 份回答,列出真正值得追问的差异点(D1, D2, …),按事实差异 / 时间差异 / 口径差异 / 因果差异等分级'),
        cell('千问', { color: C.muted }),
      ],
      [
        cell('② 收敛追问', { bold: true, color: C.cyan }),
        cell('三家 AI 互答"为什么我们不一样",千问求同存异 + 合并同类项;若仍有实质分歧,新一轮追问;最多 4 轮,由 next_action 驱动停止'),
        cell('三家 AI 答 / 千问合并', { color: C.muted }),
      ],
      [
        cell('③ 污染初判', { bold: true, color: C.accent }),
        cell('千问从原始回答里抓出 8 类污染:模板话术、安全规避、幻觉补全、过度推测、上下文污染、时效污染、口径漂移、表达噪音'),
        cell('千问', { color: C.muted }),
      ],
      [
        cell('④ AI 自我剔除', { bold: true, color: C.purple }),
        cell('污染清单回送给被点名的 AI,每家逐条裁定:接受撤回 / 部分接受 / 拒绝坚持,并给出净化版核心结论'),
        cell('三家 AI 自审', { color: C.muted, bold: true }),
      ],
      [
        cell('⑤ 共识归档', { bold: true, color: C.green }),
        cell('千问把三家自审合并成 consensus_pollution(共识撤回)与 contested_pollution(仍存分歧),进入最终报告'),
        cell('千问', { color: C.muted }),
      ],
    ]),
    spacer(200),
    ...callout(
      '为什么这套很关键',
      '同行往往只做到 ①+③(让 GPT 当裁判),滤镜把 ②(收敛追问)和 ④(被告自辩)做出来,意味着我们的输出不是"某个 AI 的判决",而是"全体被告 + 一名裁判共同认可的共识"。可信度和可解释性远超单 LLM 评测。',
      C.purple
    ),
    pageBreak(),
  ];
}

function architectureSection() {
  return [
    eyebrow('Architecture'),
    h1('六、技术架构 · 工程化与可扩展性', C.cyan),
    rule(),
    p(tx('滤镜目前是 Windows / macOS 桌面应用形态,核心架构如下:', { size: 22, color: '4B5563' }), { before: 120, after: 200 }),
    table([
      [
        cell('层级', { header: true, fill: C.cyan, width: 22 }),
        cell('技术栈', { header: true, fill: C.cyan, width: 28 }),
        cell('职责', { header: true, fill: C.cyan, width: 50 }),
      ],
      [
        cell('外壳', { bold: true }),
        cell('Electron'),
        cell('桌面应用框架,支持 Windows / macOS;打包后单文件运行,适合企业内网部署'),
      ],
      [
        cell('AI 接入层', { bold: true }),
        cell('BrowserView × N'),
        cell('每家 AI 一个独立浏览器视图,通过 JS 注入实现填表 / 提交 / 抓取回复,无 API key 依赖,可即时支持任何新 AI'),
      ],
      [
        cell('裁判 AI', { bold: true }),
        cell('阿里 DashScope / 千问 Plus'),
        cell('差异抽取 / 求同存异 / 污染初判 / 自审合并 / 最终报告生成,支持流式输出'),
      ],
      [
        cell('报告引擎', { bold: true }),
        cell('Pure SVG + HTML + Chromium printToPDF'),
        cell('零外部图表库依赖,封面 / 目录 / 看板 / 7 章 / 6 类图表全部纯 SVG 渲染,可离线生成'),
      ],
      [
        cell('许可控制', { bold: true }),
        cell('Ed25519 签名授权'),
        cell('内置 license 校验,支持企业按席位授权与到期管理'),
      ],
    ]),
    spacer(200),
    ...callout(
      '工程化优势',
      '1) 接入新 AI 只需配置一份 platforms.js 选择器,无需对方提供 API。2) 裁判模型可替换(目前千问,未来可换 GPT-4 / Claude),不影响主流程。3) PDF 报告引擎是独立模块,后续可输出为 SaaS 报告 API。',
      C.cyan
    ),
    pageBreak(),
  ];
}

function visualizationSection() {
  return [
    eyebrow('Visualization'),
    h1('七、可视化能力 · 投行级原生 SVG 图表', C.accent),
    rule(),
    p(tx('滤镜不依赖 Chart.js / ECharts 等第三方库,所有图表通过自研 SVG 渲染器在主进程内一次成型,可直接嵌入 PDF / 打印 / 离线分发。下面是六类图表的真实样张。', { size: 22, color: '4B5563' }), { before: 120, after: 200 }),

    h3('① 多维拆解雷达图', C.primary),
    p(tx('五维量化对比 ── 有效信息率 / 逻辑自洽度 / 事实保真度 / 对齐降噪 / 综合可用性。一眼看出哪家 AI 在哪个维度最强。', { size: 22, color: '4B5563' }), { before: 0, after: 80 }),
    imageParagraph('radar', { width: 480, height: 384 }),
    imageCaption('图 1 · 多维拆解雷达图 · 四模型五维对比'),

    h3('② 事实链路桑基图', C.cyan),
    p(tx('追踪每个论点的事实根基:论点 → 证据 → 源头/断裂点。红色路径直接标记疑似幻觉,黄色标记弱支撑。', { size: 22, color: '4B5563' }), { before: 0, after: 80 }),
    imageParagraph('sankey', { width: 580, height: 290 }),
    imageCaption('图 2 · 事实链路桑基图 · 论证流向与污染断裂点'),

    pageBreak(),
    eyebrow('Visualization · 续'),
    h3('③ 信息密度漏斗', C.purple),
    p(tx('每个模型从"总输出 token"到"核心论点 token"的损耗比例。红色块越长,说明对齐税越重。', { size: 22, color: '4B5563' }), { before: 0, after: 80 }),
    imageParagraph('funnel', { width: 560, height: 280 }),
    imageCaption('图 3 · 信息密度漏斗 · 量化对齐税'),

    h3('④ 风格特征词云', C.green),
    p(tx('从模型原始回答中抽取高频特征词,按字号呈现 ── 投资人能直接识别 AI 的"人格":学术 / 极客 / 保姆 / 战报。', { size: 22, color: '4B5563' }), { before: 0, after: 80 }),
    imageParagraph('wordcloud', { width: 580, height: 192 }),
    imageCaption('图 4 · 风格特征词云对比'),

    pageBreak(),
    eyebrow('Visualization · 续'),
    h3('⑤ 对齐税堆叠条', C.red),
    p(tx('把每个模型的输出按性质拆成五种成分:推理论证 + 事实陈述 + 安全规避 + 模糊保留 + 模板话术,看它把"算力"花在哪里。', { size: 22, color: '4B5563' }), { before: 0, after: 80 }),
    imageParagraph('stack', { width: 580, height: 180 }),
    imageCaption('图 5 · 对齐税与认知偏见解构'),

    h3('⑥ 成本 × 质量四象限', C.accent),
    p(tx('选型矩阵 ── 横轴成本/延迟,纵轴综合质量,气泡位置即模型在业务系统里的最佳工位。直接对接业务路由策略。', { size: 22, color: '4B5563' }), { before: 0, after: 80 }),
    imageParagraph('quadrant', { width: 540, height: 320 }),
    imageCaption('图 6 · 能力 × 成本四象限选型矩阵'),

    spacer(160),
    ...callout(
      '为什么这件事重要',
      '投资人 / CFO / CTO 看不下去 5000 字的文本报告。我们把同样的判断信息压缩成 6 张图,一页纸看清结论 ── 这是滤镜与"AI 聊天工具"的本质区别。',
      C.accent
    ),
    pageBreak(),
  ];
}

function useCasesSection() {
  return [
    eyebrow('Use Cases'),
    h1('八、应用场景 · 三类高价值市场', C.green),
    rule(),
    h3('企业 AI 选型与审计', C.primary),
    p(tx('大型企业接入大模型前必须回答"用哪家 / 哪些场景用哪家 / 风险敞口在哪"。滤镜把这些问题转化成可执行的"路由矩阵 + 提示词调优 + 混合编排策略",CIO / CTO 可直接对照执行。目标客户:大型央国企 IT 部、银行 / 券商 IT、跨国公司中国区。', { size: 22, color: '2F3441' }), { before: 0, after: 160, line: 380 }),
    h3('投资尽调与同业研判', C.accent),
    p(tx('AI 公司估值越来越依赖"模型能力"主观评估。滤镜可以把同一组提问跑过多家头部模型,产出标准化能力画像,作为投资 IC 会议的标配材料。目标客户:一级市场 VC / PE 的科技组、二级市场卖方研究所、AI 行业咨询机构。', { size: 22, color: '2F3441' }), { before: 0, after: 160, line: 380 }),
    h3('合规事实核查与媒体审稿', C.cyan),
    p(tx('涉及政策、医疗、金融等敏感话题的内容,任一家 AI 单独使用都有合规风险。滤镜的"共识归档 + 仍存分歧"输出可直接作为合规审计依据,标注哪些断言三家 AI 都接受、哪些仍有 AI 拒绝撤回。目标客户:政务 / 医疗 / 金融机构舆情部、新闻媒体核查部、AIGC 内容平台。', { size: 22, color: '2F3441' }), { before: 0, after: 160, line: 380 }),
    spacer(200),
    table([
      [
        cell('维度', { header: true, fill: C.green, width: 25 }),
        cell('企业选型', { header: true, fill: C.green, width: 25 }),
        cell('投资尽调', { header: true, fill: C.green, width: 25 }),
        cell('合规核查', { header: true, fill: C.green, width: 25 }),
      ],
      [
        cell('客单价', { bold: true }),
        cell('5-30 万 / 年 (席位 + 维护)'),
        cell('1-5 万 / 报告'),
        cell('10-50 万 / 年 (SaaS)'),
      ],
      [
        cell('决策层级', { bold: true }),
        cell('CIO / CTO'),
        cell('IC 委员会 / 投决会'),
        cell('总编 / 合规总监'),
      ],
      [
        cell('销售周期', { bold: true }),
        cell('3-6 个月'),
        cell('1-2 个月'),
        cell('6-12 个月'),
      ],
    ]),
    pageBreak(),
  ];
}

function roadmapSection() {
  return [
    eyebrow('Roadmap'),
    h1('九、产品路线图', C.primary),
    rule(),
    h3('已交付(v0.1)', C.green),
    bullet([tx('五阶段全自动工作流 ── 智能预处理 + 多 AI 并发 + 去伪存真 + 报告生成 + PDF 导出', { size: 22 })]),
    bullet([tx('收敛驱动追问循环(最多 4 轮),由千问 next_action 决定是否继续', { size: 22 })]),
    bullet([tx('AI 自我剔除污染机制,被告 AI 必须自辩并出具共识/分歧归档', { size: 22 })]),
    bullet([tx('六类原生 SVG 可视化 + 投行级 PDF 报告模板', { size: 22 })]),
    bullet([tx('Ed25519 签名授权 license,支持企业部署', { size: 22 })]),
    h3('进行中(v0.2 · 接下来 4-8 周)', C.accent),
    bullet([tx('引入第三方"裁判模型"(GPT-4 / Claude)做交叉验证,缓解千问"既当运动员又当裁判"问题', { size: 22 })]),
    bullet([tx('接入联网搜索 API(Bing / Google),对千问产出的关键 claim 做事实层校验', { size: 22 })]),
    bullet([tx('增加 PDF 报告章节"外部核查交叉裁决",标注每个论断在外部信源中的支持度', { size: 22 })]),
    h3('规划中(v1.0 · 6 个月内)', C.primary),
    bullet([tx('SaaS 化,提供 REST API + 报告订阅服务,支持企业定时审计任务', { size: 22 })]),
    bullet([tx('接入更多被评测 AI(GPT-5 / Claude / Gemini / 通义全家桶 / DeepSeek)', { size: 22 })]),
    bullet([tx('提供"对比基准库",支持企业沉淀历史评测结果做纵向追踪', { size: 22 })]),
    bullet([tx('多语言报告(英文 / 中英对照),拓展跨国企业市场', { size: 22 })]),
    pageBreak(),
  ];
}

function closingSection() {
  return [
    eyebrow('Closing'),
    h1('十、为什么是现在,为什么是我们'),
    rule(),
    p(tx('大模型这一波,产品端真正的机会在"中间件层" ── 不是又造一个 AI,而是帮企业把已有的 N 个 AI 变成可控、可审计、可决策的资产。', { size: 24, color: C.ink, bold: true }), { before: 120, after: 160, line: 400 }),
    p(tx('滤镜在这条赛道上做了三件别人没做的事:让被告 AI 自辩污染、让追问按收敛驱动、让报告做到投行级可视化。这三件事都不是单个工程师拍脑袋能做出的,是产品 × 算法 × 设计三方迭代的结果。', { size: 22, color: '2F3441' }), { before: 0, after: 160, line: 380 }),
    p(tx('我们已经把"能跑通的版本"做出来了。下一步是把这件事做深(外部核查 / SaaS 化)、做大(更多 AI / 跨国市场)、做透(基准库 / 行业标准)。', { size: 22, color: '2F3441' }), { before: 0, after: 240, line: 380 }),
    spacer(200),
    ...callout(
      '我们寻求的支持',
      '1) 战略资本投入,用于扩大研发团队(算法 + 设计 + 销售)与 SaaS 化基础设施。\n2) 早期种子客户,聚焦在企业 AI 选型与投资尽调两类高价值场景。\n3) 行业资源对接,特别是金融机构合规部门与 VC/PE 科技组。',
      C.primary
    ),
    spacer(400),
    rule(),
    p([tx('— 滤镜工作台团队', { size: 22, color: C.muted, italics: true }), tx(`   · ${new Date().toLocaleDateString('zh-CN')}`, { size: 20, color: C.muted })], { align: AlignmentType.CENTER, before: 120 }),
  ];
}

// ───── 组装文档 ─────

function buildDocument() {
  const children = [
    ...coverPage(),
    ...executiveSummary(),
    ...problemSection(),
    ...solutionSection(),
    ...differentiationSection(),
    ...workflowDeepDive(),
    ...architectureSection(),
    ...visualizationSection(),
    ...useCasesSection(),
    ...roadmapSection(),
    ...teamSection(),
    ...closingSection(),
  ];

  return new Document({
    creator: '滤镜工作台',
    title: '滤镜 · 多源大模型内容对比与分析平台 · 投资人汇报',
    description: 'Multi-LLM Capability Audit & Routing Strategy Platform',
    styles: {
      default: {
        document: {
          run: { font: { ascii: FONT_LATIN, eastAsia: FONT, hAnsi: FONT_LATIN }, size: 22, color: C.ink },
          paragraph: { spacing: { line: 360 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.9),
              bottom: convertInchesToTwip(0.9),
              left: convertInchesToTwip(0.95),
              right: convertInchesToTwip(0.95),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'FILTER WORKBENCH · INVESTOR BRIEF',
                    font: { ascii: FONT_LATIN, hAnsi: FONT_LATIN },
                    size: 14,
                    characterSpacing: 60,
                    color: C.muted,
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: '滤镜 · 多源大模型对比平台   ·   ',
                    font: { ascii: FONT_LATIN, eastAsia: FONT, hAnsi: FONT_LATIN },
                    size: 14,
                    color: C.muted,
                  }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 14, color: C.muted, font: { ascii: FONT_LATIN } }),
                  new TextRun({
                    text: ' / ',
                    size: 14,
                    color: C.muted,
                    font: { ascii: FONT_LATIN },
                  }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: C.muted, font: { ascii: FONT_LATIN } }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}

async function main() {
  const doc = buildDocument();
  const buffer = await Packer.toBuffer(doc);
  const outDir = path.join(__dirname, '..', 'release');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `滤镜-投资人汇报-${new Date().toISOString().slice(0, 10)}.docx`);
  fs.writeFileSync(outPath, buffer);
  console.log('Wrote', outPath);
  console.log('Size:', buffer.length, 'bytes');
}

main().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});
