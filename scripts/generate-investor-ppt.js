'use strict';

const fs = require('fs');
const path = require('path');
const PptxGenJS = require('pptxgenjs');

const ASSETS = path.join(__dirname, '..', 'assets', 'charts');
const OUT_DIR = path.join(__dirname, '..', 'release');
fs.mkdirSync(OUT_DIR, { recursive: true });

const C = {
  ink: '1F2430',
  muted: '6A7387',
  panel: 'F5F3EF',
  panelStrong: 'FFFFFF',
  primary: '3C6DF0',
  accent: 'F6A23A',
  green: '18794E',
  red: 'E35D6A',
  purple: '9B51E0',
  cyan: '0EA5E9',
  rule: 'D8DDE8',
  faintBlue: 'EEF2FA',
};

const FONT_CN = '微软雅黑';

function pngPath(name) {
  return path.join(ASSETS, `${name}.png`);
}

function hasPng(name) {
  return fs.existsSync(pngPath(name));
}

function makePpt() {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 in
  pptx.theme = { headFontFace: FONT_CN, bodyFontFace: FONT_CN };
  pptx.title = '滤镜 · 多源大模型对比平台 · 投资人汇报';
  pptx.author = '滤镜工作台';
  pptx.company = '滤镜工作台';

  const W = 13.333;
  const H = 7.5;

  // Master with footer
  pptx.defineSlideMaster({
    title: 'BASE',
    background: { color: C.panel },
    objects: [
      { rect: { x: 0, y: 0, w: W, h: 0.06, fill: { color: C.primary } } },
      {
        text: {
          text: 'FILTER WORKBENCH · INVESTOR BRIEF',
          options: {
            x: 0.4, y: 7.05, w: 6, h: 0.3,
            fontFace: FONT_CN, fontSize: 9, color: C.muted, charSpacing: 3, bold: true,
          },
        },
      },
      {
        text: {
          text: '滤镜 · 多源大模型对比平台',
          options: {
            x: 6.5, y: 7.05, w: 6.4, h: 0.3, align: 'right',
            fontFace: FONT_CN, fontSize: 9, color: C.muted,
          },
        },
      },
    ],
    slideNumber: { x: 12.7, y: 7.2, w: 0.5, h: 0.25, fontFace: FONT_CN, fontSize: 9, color: C.muted, align: 'right' },
  });

  // ── Slide 1: Cover
  let s = pptx.addSlide({ masterName: 'BASE' });
  s.background = { color: C.panel };
  if (hasPng('cover')) {
    s.addImage({ path: pngPath('cover'), x: 0, y: 0, w: W, h: H, sizing: { type: 'cover', w: W, h: H } });
  }
  // Overlay box for legibility
  s.addShape(pptx.ShapeType.rect, {
    x: 0.7, y: 4.4, w: 8.5, h: 2.4,
    fill: { color: 'FFFFFF', transparency: 18 },
    line: { type: 'none' },
  });
  s.addText('FILTER WORKBENCH', {
    x: 0.95, y: 4.55, w: 8, h: 0.35,
    fontFace: FONT_CN, fontSize: 11, bold: true, color: C.muted, charSpacing: 6,
  });
  s.addText('滤镜', {
    x: 0.95, y: 4.85, w: 8, h: 1.0,
    fontFace: FONT_CN, fontSize: 60, bold: true, color: C.ink,
  });
  s.addText('多源大模型内容对比与分析平台', {
    x: 0.95, y: 5.75, w: 8, h: 0.5,
    fontFace: FONT_CN, fontSize: 22, bold: true, color: C.ink,
  });
  s.addText('Multi-LLM Capability Audit & Routing Strategy Platform', {
    x: 0.95, y: 6.18, w: 8, h: 0.35,
    fontFace: FONT_CN, fontSize: 12, color: C.muted, charSpacing: 4,
  });
  s.addText(`投资人汇报 · ${new Date().toLocaleDateString('zh-CN')}`, {
    x: 0.95, y: 6.5, w: 8, h: 0.3,
    fontFace: FONT_CN, fontSize: 11, color: C.muted, charSpacing: 2,
  });

  // ── Slide 2: One-line value prop
  s = pptx.addSlide({ masterName: 'BASE' });
  s.background = { color: 'FFFFFF' };
  s.addText('THE PRODUCT', {
    x: 0.8, y: 0.6, w: 12, h: 0.4,
    fontFace: FONT_CN, fontSize: 12, bold: true, color: C.muted, charSpacing: 6,
  });
  s.addText([
    { text: '把 ', options: { color: C.ink } },
    { text: 'N 家 AI', options: { color: C.primary, bold: true } },
    { text: ' 的回答\n压缩成 ', options: { color: C.ink } },
    { text: '1 份', options: { color: C.accent, bold: true } },
    { text: ' 可决策的\n', options: { color: C.ink } },
    { text: '结构化报告', options: { color: C.ink, bold: true } },
    { text: '。', options: { color: C.ink } },
  ], {
    x: 0.8, y: 1.4, w: 11.7, h: 4.5,
    fontFace: FONT_CN, fontSize: 60, bold: false, valign: 'top',
    paraSpaceAfter: 12, lineSpacingMultiple: 1.05,
  });
  s.addText('为企业、投资机构与合规部门,把"多 AI 时代的信息真假难辨"自动化处理掉。', {
    x: 0.8, y: 6.0, w: 11.7, h: 0.7,
    fontFace: FONT_CN, fontSize: 18, color: C.muted,
  });

  // ── Slide 3: The Problem
  s = pptx.addSlide({ masterName: 'BASE' });
  s.background = { color: 'FFFFFF' };
  s.addText('THE PROBLEM', { x: 0.8, y: 0.55, w: 12, h: 0.4, fontFace: FONT_CN, fontSize: 12, bold: true, color: C.red, charSpacing: 6 });
  s.addText('多 AI 时代的"信息真假难辨"', {
    x: 0.8, y: 0.95, w: 12, h: 0.7,
    fontFace: FONT_CN, fontSize: 32, bold: true, color: C.ink,
  });
  const painPoints = [
    { num: '01', title: 'AI 选型靠拍脑袋', body: '企业接入大模型缺系统化评估;后续幻觉/对齐税出问题无法归因。' },
    { num: '02', title: '幻觉无人甄别', body: 'AI 越自信,越容易隐藏错误;普通用户没工具识别模板话术与无证据补全。' },
    { num: '03', title: '人工对比无法规模化', body: '打开多个网页 copy-paste,无可审计的决策依据,效率极低。' },
  ];
  painPoints.forEach((pt, i) => {
    const y = 2.0 + i * 1.55;
    s.addShape(pptx.ShapeType.rect, { x: 0.8, y, w: 11.8, h: 1.35, fill: { color: 'FFFFFF' }, line: { color: C.rule, width: 0.5 } });
    s.addShape(pptx.ShapeType.rect, { x: 0.8, y, w: 0.1, h: 1.35, fill: { color: C.red }, line: { type: 'none' } });
    s.addText(pt.num, { x: 1.05, y: y + 0.2, w: 1, h: 0.5, fontFace: FONT_CN, fontSize: 32, bold: true, color: C.red });
    s.addText(pt.title, { x: 2.2, y: y + 0.2, w: 10, h: 0.45, fontFace: FONT_CN, fontSize: 22, bold: true, color: C.ink });
    s.addText(pt.body, { x: 2.2, y: y + 0.7, w: 10.2, h: 0.55, fontFace: FONT_CN, fontSize: 14, color: C.muted });
  });

  // ── Slide 4: The Solution
  s = pptx.addSlide({ masterName: 'BASE' });
  s.background = { color: 'FFFFFF' };
  s.addText('THE SOLUTION', { x: 0.8, y: 0.55, w: 12, h: 0.4, fontFace: FONT_CN, fontSize: 12, bold: true, color: C.primary, charSpacing: 6 });
  s.addText('五阶段全自动工作流', { x: 0.8, y: 0.95, w: 12, h: 0.7, fontFace: FONT_CN, fontSize: 32, bold: true, color: C.ink });
  const stages = [
    { n: '01', t: '智能预处理', d: '千问自动补全', c: C.cyan },
    { n: '02', t: '多模型并发', d: 'N 家 AI 同时答', c: C.primary },
    { n: '03', t: '去伪存真闭环', d: '差异/追问/自审/共识', c: C.purple },
    { n: '04', t: '结构化报告', d: '7 章 + JSON 看板', c: C.accent },
    { n: '05', t: '投行级 PDF', d: '6 类图表导出', c: C.green },
  ];
  const cardW = 2.32, cardH = 4.6, gap = 0.18;
  const totalW = cardW * 5 + gap * 4;
  const startX = (W - totalW) / 2;
  stages.forEach((st, i) => {
    const x = startX + i * (cardW + gap);
    const y = 2.05;
    s.addShape(pptx.ShapeType.rect, { x, y, w: cardW, h: cardH, fill: { color: 'FFFFFF' }, line: { color: C.rule, width: 0.5 } });
    s.addShape(pptx.ShapeType.rect, { x, y, w: cardW, h: 0.16, fill: { color: st.c }, line: { type: 'none' } });
    s.addText(st.n, { x: x, y: y + 0.45, w: cardW, h: 0.9, fontFace: FONT_CN, fontSize: 56, bold: true, color: st.c, align: 'center' });
    s.addText(st.t, { x, y: y + 1.55, w: cardW, h: 0.5, fontFace: FONT_CN, fontSize: 18, bold: true, color: C.ink, align: 'center' });
    s.addText(st.d, { x: x + 0.15, y: y + 2.2, w: cardW - 0.3, h: 1.5, fontFace: FONT_CN, fontSize: 13, color: C.muted, align: 'center' });
    if (i < stages.length - 1) {
      s.addText('▶', { x: x + cardW - 0.05, y: y + 2.05, w: 0.3, h: 0.4, fontFace: FONT_CN, fontSize: 14, color: C.rule, align: 'center' });
    }
  });
  s.addText('全程自动化,平均 3-7 分钟出一份完整对比报告;同等工作量人工至少 1-2 小时。', {
    x: 0.8, y: 6.85, w: 11.7, h: 0.4, fontFace: FONT_CN, fontSize: 13, color: C.muted, italic: true, align: 'center',
  });

  // ── Slide 5: Differentiation 4 cards
  s = pptx.addSlide({ masterName: 'BASE' });
  s.background = { color: 'FFFFFF' };
  s.addText('MOAT', { x: 0.8, y: 0.55, w: 12, h: 0.4, fontFace: FONT_CN, fontSize: 12, bold: true, color: C.purple, charSpacing: 6 });
  s.addText('核心壁垒 · 四大差异化', { x: 0.8, y: 0.95, w: 12, h: 0.7, fontFace: FONT_CN, fontSize: 32, bold: true, color: C.ink });
  const moats = [
    { t: '裁判 + 自辩 + 归档', d: '千问当裁判,但被告 AI 必须自己上场撤回污染。"裁判+自辩"三段式行业首创。', c: C.primary },
    { t: '收敛驱动追问', d: '不是固定 N 轮:简单问题快速结束,复杂问题深刨,最多 4 轮收敛。', c: C.cyan },
    { t: '可视化 + JSON', d: '报告同时给文字、6 类原生 SVG 图表、可解析 JSON 数据,可二次开发为 SaaS API。', c: C.accent },
    { t: '直接对接决策', d: '风险矩阵 + 选型矩阵 + 提示词调优 + 混合编排,落地投资/选型/合规三类工作流。', c: C.green },
  ];
  const mw = 6.0, mh = 2.2, mgap = 0.4;
  const mStartX = (W - mw * 2 - mgap) / 2;
  const mStartY = 2.0;
  moats.forEach((m, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = mStartX + col * (mw + mgap);
    const y = mStartY + row * (mh + mgap);
    s.addShape(pptx.ShapeType.rect, { x, y, w: mw, h: mh, fill: { color: 'FFFFFF' }, line: { color: C.rule, width: 0.5 } });
    s.addShape(pptx.ShapeType.rect, { x, y, w: 0.1, h: mh, fill: { color: m.c }, line: { type: 'none' } });
    s.addText(`0${i + 1}`, { x: x + 0.3, y: y + 0.2, w: 1, h: 0.45, fontFace: FONT_CN, fontSize: 24, bold: true, color: m.c });
    s.addText(m.t, { x: x + 0.3, y: y + 0.6, w: mw - 0.5, h: 0.5, fontFace: FONT_CN, fontSize: 22, bold: true, color: C.ink });
    s.addText(m.d, { x: x + 0.3, y: y + 1.15, w: mw - 0.5, h: 0.95, fontFace: FONT_CN, fontSize: 14, color: C.muted, valign: 'top' });
  });

  // ── Slide 6: Truth-seeking deep dive (5 sub-steps)
  s = pptx.addSlide({ masterName: 'BASE' });
  s.background = { color: 'FFFFFF' };
  s.addText('CORE ENGINE', { x: 0.8, y: 0.55, w: 12, h: 0.4, fontFace: FONT_CN, fontSize: 12, bold: true, color: C.primary, charSpacing: 6 });
  s.addText('去伪存真闭环 · 五子步骤', { x: 0.8, y: 0.95, w: 12, h: 0.7, fontFace: FONT_CN, fontSize: 32, bold: true, color: C.ink });
  const steps = [
    { t: '① 差异抽取', who: '千问', d: '扫描 N 份回答 → 列出可追问差异 D1 D2 …' },
    { t: '② 收敛追问', who: '三家 AI + 千问', d: '互答"为什么不一致" → 求同存异;最多 4 轮' },
    { t: '③ 污染初判', who: '千问', d: '8 类污染:模板/安全/幻觉/时效/口径/...' },
    { t: '④ AI 自审', who: '三家 AI', d: '逐条裁定:接受撤回 / 部分接受 / 拒绝坚持' },
    { t: '⑤ 共识归档', who: '千问', d: 'consensus / contested · 进入最终报告' },
  ];
  const sw = 11.7, sh = 0.85, sgap = 0.12;
  steps.forEach((st, i) => {
    const y = 2.0 + i * (sh + sgap);
    s.addShape(pptx.ShapeType.rect, { x: 0.8, y, w: sw, h: sh, fill: { color: i === 3 ? 'F8F4FF' : 'F8F9FC' }, line: { color: C.rule, width: 0.4 } });
    s.addShape(pptx.ShapeType.rect, { x: 0.8, y, w: 0.06, h: sh, fill: { color: i === 3 ? C.purple : C.primary }, line: { type: 'none' } });
    s.addText(st.t, { x: 1.05, y: y + 0.18, w: 2.4, h: 0.5, fontFace: FONT_CN, fontSize: 18, bold: true, color: i === 3 ? C.purple : C.primary });
    s.addText(st.who, { x: 3.5, y: y + 0.22, w: 2.4, h: 0.4, fontFace: FONT_CN, fontSize: 13, color: C.muted, italic: true });
    s.addText(st.d, { x: 5.95, y: y + 0.2, w: 6.6, h: 0.5, fontFace: FONT_CN, fontSize: 14, color: C.ink });
  });
  s.addText('★ 第 ④ 步是行业首创 ── 让被告 AI 自己上场裁定污染,使输出从"GPT 的判决"升级为"全体被告 + 裁判共同认可的共识"。', {
    x: 0.8, y: 6.7, w: 11.7, h: 0.55, fontFace: FONT_CN, fontSize: 13, color: C.purple, italic: true, bold: true, align: 'center',
  });

  // ── Slide 7-9: Visualization showcase (radar / sankey on slide 7)
  function showcaseSlide(title, eyebrowText, charts) {
    const s = pptx.addSlide({ masterName: 'BASE' });
    s.background = { color: 'FFFFFF' };
    s.addText(eyebrowText, { x: 0.8, y: 0.55, w: 12, h: 0.4, fontFace: FONT_CN, fontSize: 12, bold: true, color: C.accent, charSpacing: 6 });
    s.addText(title, { x: 0.8, y: 0.95, w: 12, h: 0.7, fontFace: FONT_CN, fontSize: 32, bold: true, color: C.ink });
    const cw = 5.8, ch = 4.2, cgap = 0.4;
    const cStartX = (W - cw * 2 - cgap) / 2;
    const cStartY = 1.95;
    charts.forEach((ch_, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = cStartX + col * (cw + cgap);
      const y = cStartY + row * (ch + cgap);
      s.addShape(pptx.ShapeType.rect, { x, y, w: cw, h: ch, fill: { color: 'FFFFFF' }, line: { color: C.rule, width: 0.4 } });
      s.addText(ch_.label, { x: x + 0.2, y: y + 0.15, w: cw - 0.4, h: 0.4, fontFace: FONT_CN, fontSize: 14, bold: true, color: ch_.color });
      s.addText(ch_.title, { x: x + 0.2, y: y + 0.5, w: cw - 0.4, h: 0.5, fontFace: FONT_CN, fontSize: 18, bold: true, color: C.ink });
      if (hasPng(ch_.name)) {
        s.addImage({ path: pngPath(ch_.name), x: x + 0.2, y: y + 1.05, w: cw - 0.4, h: ch - 1.25, sizing: { type: 'contain', w: cw - 0.4, h: ch - 1.25 } });
      }
    });
  }

  showcaseSlide('原生可视化 · 雷达图与桑基图', 'VISUALIZATION', [
    { name: 'radar', label: '01 · 雷达图', title: '多维拆解 · 五维量化', color: C.primary },
    { name: 'sankey', label: '02 · 桑基图', title: '事实链路 · 论点→断裂点', color: C.cyan },
  ]);

  showcaseSlide('原生可视化 · 漏斗与词云', 'VISUALIZATION · 续', [
    { name: 'funnel', label: '03 · 漏斗图', title: '信息密度 · 量化对齐税', color: C.purple },
    { name: 'wordcloud', label: '04 · 词云', title: '风格特征 · 识别 AI 人格', color: C.green },
  ]);

  showcaseSlide('原生可视化 · 堆叠条与四象限', 'VISUALIZATION · 续', [
    { name: 'stack', label: '05 · 堆叠条', title: '对齐税分布', color: C.red },
    { name: 'quadrant', label: '06 · 四象限', title: '成本×质量选型矩阵', color: C.accent },
  ]);

  // ── Slide 10: Architecture
  s = pptx.addSlide({ masterName: 'BASE' });
  s.background = { color: 'FFFFFF' };
  s.addText('ARCHITECTURE', { x: 0.8, y: 0.55, w: 12, h: 0.4, fontFace: FONT_CN, fontSize: 12, bold: true, color: C.cyan, charSpacing: 6 });
  s.addText('技术架构 · 工程化与可扩展性', { x: 0.8, y: 0.95, w: 12, h: 0.7, fontFace: FONT_CN, fontSize: 32, bold: true, color: C.ink });
  const archLayers = [
    { layer: '外壳', tech: 'Electron', detail: '桌面应用 / 单文件部署 / Windows + macOS' },
    { layer: 'AI 接入层', tech: 'BrowserView × N', detail: '无 API key 依赖,可即时支持任何新 AI' },
    { layer: '裁判 AI', tech: '阿里 DashScope · 千问 Plus', detail: '差异 / 求同 / 污染 / 自审 / 报告 全链路' },
    { layer: '报告引擎', tech: 'Pure SVG + Chromium printToPDF', detail: '零外部图表库 · 离线可生成 · 可输出 SaaS API' },
    { layer: '许可控制', tech: 'Ed25519 签名授权', detail: '企业按席位授权与到期管理' },
  ];
  archLayers.forEach((row, i) => {
    const y = 2.0 + i * 0.85;
    const c = [C.primary, C.cyan, C.accent, C.purple, C.green][i];
    s.addShape(pptx.ShapeType.rect, { x: 0.8, y, w: 11.7, h: 0.78, fill: { color: 'F8F9FC' }, line: { color: C.rule, width: 0.4 } });
    s.addShape(pptx.ShapeType.rect, { x: 0.8, y, w: 0.06, h: 0.78, fill: { color: c }, line: { type: 'none' } });
    s.addText(row.layer, { x: 1.05, y: y + 0.18, w: 2.0, h: 0.45, fontFace: FONT_CN, fontSize: 18, bold: true, color: C.ink });
    s.addText(row.tech, { x: 3.1, y: y + 0.2, w: 3.6, h: 0.45, fontFace: FONT_CN, fontSize: 15, color: c, bold: true });
    s.addText(row.detail, { x: 6.8, y: y + 0.22, w: 5.65, h: 0.45, fontFace: FONT_CN, fontSize: 14, color: C.muted });
  });

  // ── Slide 11: Use Cases
  s = pptx.addSlide({ masterName: 'BASE' });
  s.background = { color: 'FFFFFF' };
  s.addText('USE CASES', { x: 0.8, y: 0.55, w: 12, h: 0.4, fontFace: FONT_CN, fontSize: 12, bold: true, color: C.green, charSpacing: 6 });
  s.addText('三类高价值市场', { x: 0.8, y: 0.95, w: 12, h: 0.7, fontFace: FONT_CN, fontSize: 32, bold: true, color: C.ink });
  const useCases = [
    { t: '企业 AI 选型与审计', tag: 'B2B SaaS', price: '5-30 万 / 年', who: 'CIO / CTO', cycle: '3-6 月', detail: '央国企 IT 部、银行/券商 IT、跨国公司中国区。把"路由+调优+混合编排"直接变成可执行清单。', c: C.primary },
    { t: '投资尽调与同业研判', tag: 'Project-based', price: '1-5 万 / 报告', who: 'IC 委员会', cycle: '1-2 月', detail: '一级市场 VC / PE 科技组、二级研究所、AI 行业咨询。标准化能力画像替代主观打分。', c: C.accent },
    { t: '合规事实核查', tag: 'B2B SaaS', price: '10-50 万 / 年', who: '总编 / 合规总监', cycle: '6-12 月', detail: '政务 / 医疗 / 金融机构舆情部、新闻媒体核查部。共识归档作为合规审计依据。', c: C.cyan },
  ];
  const ucW = 4.0, ucH = 4.4, ucGap = 0.25;
  const ucStartX = (W - ucW * 3 - ucGap * 2) / 2;
  useCases.forEach((u, i) => {
    const x = ucStartX + i * (ucW + ucGap);
    const y = 2.05;
    s.addShape(pptx.ShapeType.rect, { x, y, w: ucW, h: ucH, fill: { color: 'FFFFFF' }, line: { color: C.rule, width: 0.5 } });
    s.addShape(pptx.ShapeType.rect, { x, y, w: ucW, h: 0.5, fill: { color: u.c }, line: { type: 'none' } });
    s.addText(u.tag, { x: x + 0.3, y: y + 0.1, w: ucW - 0.6, h: 0.3, fontFace: FONT_CN, fontSize: 11, color: 'FFFFFF', charSpacing: 3, bold: true });
    s.addText(u.t, { x: x + 0.3, y: y + 0.65, w: ucW - 0.5, h: 0.6, fontFace: FONT_CN, fontSize: 19, bold: true, color: C.ink });
    s.addText(u.detail, { x: x + 0.3, y: y + 1.3, w: ucW - 0.5, h: 1.4, fontFace: FONT_CN, fontSize: 13, color: C.muted, valign: 'top' });
    s.addShape(pptx.ShapeType.rect, { x: x + 0.3, y: y + 2.85, w: ucW - 0.6, h: 0.02, fill: { color: C.rule }, line: { type: 'none' } });
    s.addText([
      { text: '客单价   ', options: { color: C.muted, fontSize: 11 } },
      { text: u.price + '\n', options: { color: C.ink, fontSize: 14, bold: true } },
      { text: '决策层   ', options: { color: C.muted, fontSize: 11 } },
      { text: u.who + '\n', options: { color: C.ink, fontSize: 14, bold: true } },
      { text: '销售周期 ', options: { color: C.muted, fontSize: 11 } },
      { text: u.cycle, options: { color: C.ink, fontSize: 14, bold: true } },
    ], { x: x + 0.3, y: y + 2.95, w: ucW - 0.5, h: 1.4, fontFace: FONT_CN, valign: 'top', paraSpaceAfter: 4 });
  });

  // ── Slide 12: Roadmap
  s = pptx.addSlide({ masterName: 'BASE' });
  s.background = { color: 'FFFFFF' };
  s.addText('ROADMAP', { x: 0.8, y: 0.55, w: 12, h: 0.4, fontFace: FONT_CN, fontSize: 12, bold: true, color: C.primary, charSpacing: 6 });
  s.addText('产品路线图', { x: 0.8, y: 0.95, w: 12, h: 0.7, fontFace: FONT_CN, fontSize: 32, bold: true, color: C.ink });
  const phases = [
    { tag: 'v0.1 · 已交付', color: C.green, items: [
      '五阶段全自动工作流',
      '收敛驱动追问循环 (最多 4 轮)',
      'AI 自我剔除污染 (行业首创)',
      '六类原生 SVG 可视化',
      '投行级 PDF 报告模板',
      'Ed25519 签名授权 license',
    ] },
    { tag: 'v0.2 · 进行中 (4-8 周)', color: C.accent, items: [
      '引入第三方裁判模型 (GPT-4 / Claude)',
      '联网搜索 API 接入 (Bing / Google)',
      '"外部核查交叉裁决" 章节',
      'PDF 报告章节加固',
    ] },
    { tag: 'v1.0 · 6 个月内', color: C.primary, items: [
      'SaaS 化 · REST API + 报告订阅',
      '更多被评测 AI (GPT-5 / Claude / Gemini)',
      '对比基准库 · 历史评测纵向追踪',
      '多语言报告 (中英对照)',
    ] },
  ];
  const pcw = 4.05, pch = 4.7, pcgap = 0.25;
  const pcStartX = (W - pcw * 3 - pcgap * 2) / 2;
  phases.forEach((ph, i) => {
    const x = pcStartX + i * (pcw + pcgap);
    const y = 2.0;
    s.addShape(pptx.ShapeType.rect, { x, y, w: pcw, h: pch, fill: { color: 'FFFFFF' }, line: { color: C.rule, width: 0.5 } });
    s.addShape(pptx.ShapeType.rect, { x, y, w: pcw, h: 0.55, fill: { color: ph.color }, line: { type: 'none' } });
    s.addText(ph.tag, { x: x + 0.3, y: y + 0.13, w: pcw - 0.5, h: 0.35, fontFace: FONT_CN, fontSize: 14, color: 'FFFFFF', bold: true });
    const itemY = y + 0.75;
    ph.items.forEach((it, j) => {
      s.addText(`▸ ${it}`, { x: x + 0.3, y: itemY + j * 0.55, w: pcw - 0.5, h: 0.5, fontFace: FONT_CN, fontSize: 13.5, color: C.ink, valign: 'top' });
    });
  });

  // ── Slide 13: Team
  s = pptx.addSlide({ masterName: 'BASE' });
  s.background = { color: 'FFFFFF' };
  s.addText('TEAM', { x: 0.8, y: 0.55, w: 12, h: 0.4, fontFace: FONT_CN, fontSize: 12, bold: true, color: C.primary, charSpacing: 6 });
  s.addText('团队介绍', { x: 0.8, y: 0.95, w: 12, h: 0.7, fontFace: FONT_CN, fontSize: 32, bold: true, color: C.ink });
  const team = [
    { initial: 'Z', name: '创始人 & CEO', role: '产品 / 战略', bio: '产品战略、商务与融资。\n[请补充姓名 + 8-15 字背景]', color: C.primary },
    { initial: 'Q', name: '联合创始人 & CTO', role: '算法 / 工程', bio: '裁判链路、自审引擎、可视化系统。\n[请补充姓名 + 技术背景]', color: C.cyan },
    { initial: 'S', name: '联合创始人 & 设计', role: '产品 / 视觉', bio: '报告排版、图表语言、品牌系统。\n[请补充姓名 + 设计背景]', color: C.accent },
  ];
  const tw = 4.05, th = 3.8, tgap = 0.25;
  const tStartX = (W - tw * 3 - tgap * 2) / 2;
  team.forEach((m, i) => {
    const x = tStartX + i * (tw + tgap);
    const y = 2.05;
    s.addShape(pptx.ShapeType.rect, { x, y, w: tw, h: th, fill: { color: 'FFFFFF' }, line: { color: C.rule, width: 0.5 } });
    s.addShape(pptx.ShapeType.ellipse, { x: x + tw / 2 - 0.55, y: y + 0.4, w: 1.1, h: 1.1, fill: { color: m.color }, line: { type: 'none' } });
    s.addText(m.initial, { x: x + tw / 2 - 0.55, y: y + 0.55, w: 1.1, h: 0.85, fontFace: FONT_CN, fontSize: 36, bold: true, color: 'FFFFFF', align: 'center' });
    s.addText(m.name, { x, y: y + 1.7, w: tw, h: 0.5, fontFace: FONT_CN, fontSize: 18, bold: true, color: C.ink, align: 'center' });
    s.addText(m.role, { x, y: y + 2.15, w: tw, h: 0.35, fontFace: FONT_CN, fontSize: 12, color: m.color, charSpacing: 3, bold: true, align: 'center' });
    s.addText(m.bio, { x: x + 0.3, y: y + 2.6, w: tw - 0.6, h: 1.1, fontFace: FONT_CN, fontSize: 12, color: C.muted, align: 'center', valign: 'top' });
  });
  s.addText('顾问团 (Advisory)', { x: 0.8, y: 6.1, w: 12, h: 0.4, fontFace: FONT_CN, fontSize: 16, bold: true, color: C.purple });
  s.addText('· [顾问 1] 知名 AI 公司技术合伙人  ·  [顾问 2] 头部 VC 机构合伙人  ·  [顾问 3] 大型央企 IT 负责人', {
    x: 0.8, y: 6.5, w: 12, h: 0.4, fontFace: FONT_CN, fontSize: 13, color: C.muted,
  });
  s.addText('注:本页人员为占位模板,正式对外版本前请填入实名与简历亮点。', {
    x: 0.8, y: 6.85, w: 12, h: 0.3, fontFace: FONT_CN, fontSize: 11, color: C.muted, italic: true,
  });

  // ── Slide 14: Closing / Ask
  s = pptx.addSlide({ masterName: 'BASE' });
  s.background = { color: C.panel };
  s.addText('THE ASK', { x: 0.8, y: 0.55, w: 12, h: 0.4, fontFace: FONT_CN, fontSize: 12, bold: true, color: C.primary, charSpacing: 6 });
  s.addText('为什么是现在,为什么是我们', { x: 0.8, y: 0.95, w: 12, h: 0.7, fontFace: FONT_CN, fontSize: 32, bold: true, color: C.ink });
  s.addText('大模型这一波,产品端真正的机会在 "中间件层"。', { x: 0.8, y: 1.95, w: 11.7, h: 0.6, fontFace: FONT_CN, fontSize: 22, bold: true, color: C.ink });
  s.addText('不是又造一个 AI,而是帮企业把已有的 N 个 AI 变成可控、可审计、可决策的资产。', { x: 0.8, y: 2.55, w: 11.7, h: 0.6, fontFace: FONT_CN, fontSize: 18, color: C.muted });
  const asks = [
    { n: '01', t: '战略资本', d: '扩大研发团队 (算法 + 设计 + 销售) 与 SaaS 化基础设施' },
    { n: '02', t: '种子客户', d: '聚焦企业 AI 选型与投资尽调两类高价值场景' },
    { n: '03', t: '行业资源', d: '金融机构合规部门与 VC/PE 科技组的高质量对接' },
  ];
  asks.forEach((a, i) => {
    const y = 3.7 + i * 0.95;
    s.addShape(pptx.ShapeType.rect, { x: 0.8, y, w: 11.7, h: 0.85, fill: { color: 'FFFFFF' }, line: { color: C.primary, width: 0.5 } });
    s.addText(a.n, { x: 1.05, y: y + 0.18, w: 0.8, h: 0.5, fontFace: FONT_CN, fontSize: 24, bold: true, color: C.primary });
    s.addText(a.t, { x: 1.95, y: y + 0.2, w: 2.3, h: 0.45, fontFace: FONT_CN, fontSize: 18, bold: true, color: C.ink });
    s.addText(a.d, { x: 4.4, y: y + 0.22, w: 8.0, h: 0.45, fontFace: FONT_CN, fontSize: 14, color: C.muted });
  });
  s.addText(`— 滤镜工作台团队  ·  ${new Date().toLocaleDateString('zh-CN')}`, { x: 0.8, y: 6.9, w: 11.7, h: 0.4, fontFace: FONT_CN, fontSize: 12, color: C.muted, italic: true, align: 'center' });

  return pptx;
}

async function main() {
  const pptx = makePpt();
  const outPath = path.join(OUT_DIR, `滤镜-投资人汇报-${new Date().toISOString().slice(0, 10)}.pptx`);
  await pptx.writeFile({ fileName: outPath });
  const stat = fs.statSync(outPath);
  console.log('Wrote', outPath);
  console.log('Size:', stat.size, 'bytes');
}

main().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});
