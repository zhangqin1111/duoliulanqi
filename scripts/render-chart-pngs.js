'use strict';

const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const charts = require(path.join(__dirname, '..', 'src', 'electron', 'report', 'chart-svg'));

const OUT_DIR = path.join(__dirname, '..', 'assets', 'charts');
fs.mkdirSync(OUT_DIR, { recursive: true });

function extractSvg(html) {
  const m = String(html || '').match(/<svg[\s\S]*?<\/svg>/i);
  return m ? m[0] : null;
}

function wrapSvg(svgInner) {
  if (!svgInner) return null;
  if (svgInner.includes('xmlns="http://www.w3.org/2000/svg"')) return svgInner;
  return svgInner.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
}

function svgToPng(svg, outFile, opts = {}) {
  const resvg = new Resvg(svg, {
    fitTo: opts.fitTo || { mode: 'width', value: 1600 },
    font: {
      loadSystemFonts: true,
      defaultFontFamily: '微软雅黑',
    },
    background: opts.background || 'rgba(255,255,255,1)',
  });
  const png = resvg.render().asPng();
  fs.writeFileSync(outFile, png);
  return png.length;
}

const SCOREBOARD = [
  { model: 'Kimi', scores: { 有效信息率: 22, 逻辑自洽度: 18, 事实保真度: 12, 对齐噪音率: 75, 综合可用性: 20 } },
  { model: 'Doubao', scores: { 有效信息率: 65, 逻辑自洽度: 78, 事实保真度: 42, 对齐噪音率: 55, 综合可用性: 60 } },
  { model: 'Yuanbao', scores: { 有效信息率: 82, 逻辑自洽度: 70, 事实保真度: 84, 对齐噪音率: 30, 综合可用性: 78 } },
  { model: 'Wenxin', scores: { 有效信息率: 55, 逻辑自洽度: 80, 事实保真度: 32, 对齐噪音率: 60, 综合可用性: 52 } },
];

const QUADRANT = [
  { model: 'Kimi', cost: 25, quality: 22, scenario: '不建议使用' },
  { model: 'Doubao', cost: 60, quality: 60, scenario: '通用问答' },
  { model: 'Yuanbao', cost: 40, quality: 80, scenario: '政策研判' },
  { model: 'Wenxin', cost: 70, quality: 55, scenario: '叙事生成' },
];

const FUNNEL = [
  { model: 'Kimi', total_tokens: 50, core_tokens: 5, alignment_noise_tokens: 40 },
  { model: 'Doubao', total_tokens: 1240, core_tokens: 320, alignment_noise_tokens: 720 },
  { model: 'Yuanbao', total_tokens: 580, core_tokens: 380, alignment_noise_tokens: 130 },
  { model: 'Wenxin', total_tokens: 1180, core_tokens: 240, alignment_noise_tokens: 760 },
];

const ALIGNMENT_TAX = [
  { model: 'Kimi', components: { reasoning: 0, facts: 0, safety_padding: 0, hedging: 0, boilerplate: 100 } },
  { model: 'Doubao', components: { reasoning: 38, facts: 25, safety_padding: 12, hedging: 8, boilerplate: 17 } },
  { model: 'Yuanbao', components: { reasoning: 28, facts: 32, safety_padding: 18, hedging: 18, boilerplate: 4 } },
  { model: 'Wenxin', components: { reasoning: 35, facts: 22, safety_padding: 14, hedging: 10, boilerplate: 19 } },
];

const SANKEY = {
  nodes: [
    { id: 'q', label: '原始提问', tier: 0 },
    { id: 'a1', label: '事件锚定', tier: 0 },
    { id: 'a2', label: '风险研判', tier: 0 },
    { id: 'e1', label: '权威信源', tier: 1 },
    { id: 'e2', label: '推理外推', tier: 1 },
    { id: 'e3', label: '模板补全', tier: 1 },
    { id: 's1', label: '官方公开', tier: 2 },
    { id: 's2', label: '历史模板', tier: 2 },
    { id: 's3', label: '疑似幻觉', tier: 2 },
  ],
  links: [
    { source: 'q', target: 'a1', value: 60, kind: 'support' },
    { source: 'q', target: 'a2', value: 40, kind: 'support' },
    { source: 'a1', target: 'e1', value: 30, kind: 'support' },
    { source: 'a1', target: 'e2', value: 25, kind: 'weak' },
    { source: 'a2', target: 'e2', value: 20, kind: 'weak' },
    { source: 'a2', target: 'e3', value: 25, kind: 'hallucination' },
    { source: 'e1', target: 's1', value: 30, kind: 'support' },
    { source: 'e2', target: 's2', value: 35, kind: 'weak' },
    { source: 'e3', target: 's3', value: 25, kind: 'hallucination' },
  ],
};

function renderWordcloudSvg() {
  const cols = [
    { name: 'Doubao', color: '#3c6df0', words: [
      { w: '伊朗', s: 26 }, { w: '美国', s: 22 }, { w: '军事', s: 19 }, { w: '停火', s: 18 },
      { w: '霍尔木兹', s: 16 }, { w: '战争', s: 15 }, { w: '到期', s: 14 }, { w: '宣布', s: 13 }, { w: '警告', s: 12 },
    ] },
    { name: 'Yuanbao', color: '#f6a23a', words: [
      { w: '伊朗', s: 26 }, { w: '美国', s: 22 }, { w: '可能', s: 20 }, { w: '潜在', s: 18 },
      { w: '建议', s: 16 }, { w: '核实', s: 15 }, { w: '制裁', s: 14 }, { w: '地区', s: 13 }, { w: '外交', s: 12 },
    ] },
    { name: 'Wenxin', color: '#18794e', words: [
      { w: '伊朗', s: 26 }, { w: '美国', s: 22 }, { w: '海峡', s: 19 }, { w: '军事', s: 18 },
      { w: '冲突', s: 16 }, { w: '阶段', s: 15 }, { w: '谈判', s: 14 }, { w: '制裁', s: 13 }, { w: '双方', s: 12 },
    ] },
  ];

  const W = 1200;
  const colWidth = 380;
  const gap = 30;
  const startX = (W - colWidth * 3 - gap * 2) / 2;
  const headY = 70;
  const wordsY = 140;

  const colsSvg = cols
    .map((col, i) => {
      const x = startX + i * (colWidth + gap);
      const head = `
        <rect x="${x}" y="${headY - 30}" width="${colWidth}" height="70" rx="14" fill="#fff" stroke="${col.color}" stroke-width="1.5" />
        <circle cx="${x + 24}" cy="${headY + 5}" r="9" fill="${col.color}" />
        <text x="${x + 44}" y="${headY + 12}" font-family="Microsoft YaHei, sans-serif" font-size="22" font-weight="700" fill="#1f2430">${col.name}</text>
      `;
      let yy = wordsY;
      let xx = x + 18;
      const lineH = 36;
      const words = col.words
        .map((w, j) => {
          const wid = w.w.length * (w.s + 6);
          if (xx + wid > x + colWidth - 18) {
            yy += lineH;
            xx = x + 18;
          }
          const txt = `<text x="${xx}" y="${yy}" font-family="Microsoft YaHei, sans-serif" font-size="${w.s}" font-weight="600" fill="${col.color}" fill-opacity="${(0.55 + j * 0.04).toFixed(2)}">${w.w}</text>`;
          xx += wid + 8;
          return txt;
        })
        .join('');
      return head + words;
    })
    .join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 460" width="${W}" height="460">
      <rect x="0" y="0" width="${W}" height="460" fill="#fafbfd" />
      <text x="${W / 2}" y="32" font-family="Microsoft YaHei, sans-serif" font-size="20" font-weight="700" fill="#1f2430" text-anchor="middle">风格特征词云对比</text>
      ${colsSvg}
    </svg>
  `;
}

function renderCoverSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#5f82ff" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#5f82ff" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="g2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffb54f" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#ffb54f" stop-opacity="0"/>
        </linearGradient>
        <radialGradient id="g3" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#18794e" stop-opacity="0.32"/>
          <stop offset="100%" stop-color="#18794e" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="#f5f3ef"/>
      <circle cx="280" cy="280" r="520" fill="url(#g1)"/>
      <circle cx="1320" cy="240" r="380" fill="url(#g2)"/>
      <circle cx="1280" cy="780" r="440" fill="url(#g3)"/>
      <g stroke="#1f2430" stroke-width="0.6" opacity="0.10">
        <line x1="0" y1="300" x2="1600" y2="300"/>
        <line x1="0" y1="600" x2="1600" y2="600"/>
        <line x1="640" y1="0" x2="640" y2="900"/>
        <line x1="1100" y1="0" x2="1100" y2="900"/>
      </g>
      <g transform="translate(120, 360)">
        <rect x="0" y="0" width="100" height="100" rx="28" fill="url(#g1)" stroke="#5f82ff" stroke-width="2"/>
        <circle cx="50" cy="50" r="20" fill="#fff" opacity="0.85"/>
      </g>
      <text x="120" y="520" font-family="Microsoft YaHei, sans-serif" font-size="22" letter-spacing="6" font-weight="700" fill="#6a7387">FILTER WORKBENCH</text>
      <text x="120" y="610" font-family="Microsoft YaHei, sans-serif" font-size="120" font-weight="800" fill="#1f2430">滤镜</text>
      <text x="120" y="680" font-family="Microsoft YaHei, sans-serif" font-size="36" font-weight="600" fill="#1f2430">多源大模型内容对比与分析平台</text>
      <text x="120" y="730" font-family="Microsoft YaHei, sans-serif" font-size="18" letter-spacing="4" fill="#6a7387">MULTI-LLM CAPABILITY AUDIT &amp; ROUTING STRATEGY</text>
    </svg>
  `;
}

function main() {
  const tasks = [
    { name: 'cover', svg: renderCoverSvg(), width: 1600 },
    { name: 'radar', html: charts.renderRadarChart(SCOREBOARD), width: 1200 },
    { name: 'quadrant', html: charts.renderQuadrantChart(QUADRANT), width: 1400 },
    { name: 'funnel', html: charts.renderFunnelChart(FUNNEL), width: 1400 },
    { name: 'stack', html: charts.renderStackedBar(ALIGNMENT_TAX), width: 1400 },
    { name: 'sankey', html: charts.renderSankey(SANKEY), width: 1400 },
    { name: 'wordcloud', svg: renderWordcloudSvg(), width: 1400 },
  ];

  const sizes = [];
  for (const t of tasks) {
    let svg = t.svg;
    if (!svg && t.html) {
      const inner = extractSvg(t.html);
      svg = wrapSvg(inner);
    }
    if (!svg) {
      console.warn(`Skipped ${t.name}: no svg`);
      continue;
    }
    const out = path.join(OUT_DIR, `${t.name}.png`);
    const bytes = svgToPng(svg, out, { fitTo: { mode: 'width', value: t.width } });
    sizes.push({ name: t.name, kb: Math.round(bytes / 102.4) / 10 });
    console.log(`✓ ${t.name}.png (${(bytes / 1024).toFixed(1)} KB)`);
  }
  console.log('\nAll charts written to', OUT_DIR);
}

main();
