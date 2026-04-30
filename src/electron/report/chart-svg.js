'use strict';

const MODEL_COLORS = ['#3c6df0', '#f6a23a', '#18794e', '#9b51e0', '#e35d6a', '#0ea5e9'];
const TAX_COLORS = {
  reasoning: '#3c6df0',
  facts: '#18794e',
  safety_padding: '#e74c3c',
  hedging: '#f59e0b',
  boilerplate: '#9ca3af',
};
const TAX_LABELS = {
  reasoning: '推理论证',
  facts: '事实陈述',
  safety_padding: '安全规避',
  hedging: '模糊保留',
  boilerplate: '模板话术',
};
const RADAR_AXES = [
  { key: '有效信息率', invert: false },
  { key: '逻辑自洽度', invert: false },
  { key: '事实保真度', invert: false },
  { key: '对齐噪音率', invert: true, displayKey: '对齐降噪' },
  { key: '综合可用性', invert: false },
];

function escapeXml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function colorAt(index) {
  return MODEL_COLORS[index % MODEL_COLORS.length];
}

function pickModelName(item, fallbackIndex) {
  if (!item || typeof item !== 'object') return `模型${fallbackIndex + 1}`;
  const name = item.model || item.name || item.id;
  return name ? String(name) : `模型${fallbackIndex + 1}`;
}

function nonEmptyArray(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : [];
}

function emptyChart(message) {
  return `<div class="chart-empty">${escapeXml(message || '数据不足，无法渲染图表。')}</div>`;
}

function chartFrame(title, subtitle, body) {
  return `
    <figure class="chart-figure">
      <figcaption class="chart-caption">
        <div class="chart-caption__title">${escapeXml(title)}</div>
        ${subtitle ? `<div class="chart-caption__sub">${escapeXml(subtitle)}</div>` : ''}
      </figcaption>
      <div class="chart-body">${body}</div>
    </figure>
  `;
}

function legendDot(color, label) {
  return `<span class="chart-legend__item"><span class="chart-legend__swatch" style="background:${color}"></span>${escapeXml(label)}</span>`;
}

function renderLegend(items) {
  if (!items.length) return '';
  return `<div class="chart-legend">${items.join('')}</div>`;
}

function renderRadarChart(scoreboard) {
  const data = nonEmptyArray(scoreboard);
  if (!data.length) return emptyChart('未提供 scoreboard 数据。');

  const width = 560;
  const height = 460;
  const cx = width / 2;
  const cy = height / 2 + 6;
  const radius = 150;
  const axes = RADAR_AXES;
  const axisCount = axes.length;
  const angleFor = (i) => -Math.PI / 2 + (Math.PI * 2 * i) / axisCount;

  const gridLevels = 4;
  const gridRings = [];
  for (let level = 1; level <= gridLevels; level++) {
    const r = (radius * level) / gridLevels;
    const points = axes
      .map((_, i) => {
        const a = angleFor(i);
        return `${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`;
      })
      .join(' ');
    gridRings.push(
      `<polygon points="${points}" fill="none" stroke="#d8dde8" stroke-width="${level === gridLevels ? 1.3 : 0.9}" stroke-dasharray="${level === gridLevels ? '0' : '3 3'}" />`
    );
  }

  const axisLines = axes
    .map((axis, i) => {
      const a = angleFor(i);
      const x = (cx + Math.cos(a) * radius).toFixed(2);
      const y = (cy + Math.sin(a) * radius).toFixed(2);
      return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#c9d1de" stroke-width="0.8" />`;
    })
    .join('');

  const axisLabels = axes
    .map((axis, i) => {
      const a = angleFor(i);
      const labelR = radius + 22;
      const x = cx + Math.cos(a) * labelR;
      const y = cy + Math.sin(a) * labelR;
      const anchor = Math.cos(a) > 0.2 ? 'start' : Math.cos(a) < -0.2 ? 'end' : 'middle';
      const label = axis.displayKey || axis.key;
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="13" font-weight="600" fill="#1f2430" text-anchor="${anchor}" dominant-baseline="middle">${escapeXml(label)}</text>`;
    })
    .join('');

  const polygons = data
    .map((entry, idx) => {
      const color = colorAt(idx);
      const scores = (entry && entry.scores) || {};
      const points = axes
        .map((axis, i) => {
          const raw = clamp(scores[axis.key], 0, 100);
          const value = axis.invert ? 100 - raw : raw;
          const a = angleFor(i);
          const r = (radius * value) / 100;
          return `${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`;
        })
        .join(' ');
      return `<polygon points="${points}" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="2" stroke-linejoin="round" />`;
    })
    .join('');

  const dotMarkers = data
    .map((entry, idx) => {
      const color = colorAt(idx);
      const scores = (entry && entry.scores) || {};
      return axes
        .map((axis, i) => {
          const raw = clamp(scores[axis.key], 0, 100);
          const value = axis.invert ? 100 - raw : raw;
          const a = angleFor(i);
          const r = (radius * value) / 100;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.2" fill="${color}" stroke="#fff" stroke-width="1.2" />`;
        })
        .join('');
    })
    .join('');

  const legend = renderLegend(data.map((entry, idx) => legendDot(colorAt(idx), pickModelName(entry, idx))));

  const svg = `
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="chart-svg chart-svg--radar" role="img" aria-label="多维拆解雷达图">
      <g>${gridRings.join('')}</g>
      <g>${axisLines}</g>
      <g>${polygons}</g>
      <g>${dotMarkers}</g>
      <g>${axisLabels}</g>
    </svg>
  `;
  return chartFrame('多维拆解雷达图', '五个核心维度上的模型相对位势(对齐噪音率已反向为对齐降噪以便比较)', `<div class="chart-svg-wrap">${svg}</div>${legend}`);
}

function renderQuadrantChart(quadrant) {
  const data = nonEmptyArray(quadrant);
  if (!data.length) return emptyChart('未提供 selection_quadrant 数据。');

  const width = 520;
  const height = 360;
  const padX = 56;
  const padY = 40;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const xToPx = (cost) => padX + (clamp(cost, 0, 100) / 100) * innerW;
  const yToPx = (quality) => padY + (1 - clamp(quality, 0, 100) / 100) * innerH;

  const axisLines = `
    <line x1="${padX}" y1="${padY + innerH / 2}" x2="${padX + innerW}" y2="${padY + innerH / 2}" stroke="#d8dde8" stroke-width="1" stroke-dasharray="4 4" />
    <line x1="${padX + innerW / 2}" y1="${padY}" x2="${padX + innerW / 2}" y2="${padY + innerH}" stroke="#d8dde8" stroke-width="1" stroke-dasharray="4 4" />
    <rect x="${padX}" y="${padY}" width="${innerW}" height="${innerH}" fill="none" stroke="#c9d1de" stroke-width="1" />
  `;

  const quadrantLabels = `
    <text x="${padX + innerW * 0.25}" y="${padY + 18}" font-size="11" fill="#6a7387" text-anchor="middle" letter-spacing="2">高质量·低成本(理想区)</text>
    <text x="${padX + innerW * 0.75}" y="${padY + 18}" font-size="11" fill="#6a7387" text-anchor="middle" letter-spacing="2">高质量·高成本(精确制导)</text>
    <text x="${padX + innerW * 0.25}" y="${padY + innerH - 8}" font-size="11" fill="#6a7387" text-anchor="middle" letter-spacing="2">低质量·低成本(快用快丢)</text>
    <text x="${padX + innerW * 0.75}" y="${padY + innerH - 8}" font-size="11" fill="#6a7387" text-anchor="middle" letter-spacing="2">低质量·高成本(避雷区)</text>
  `;

  const axisTicks = `
    <text x="${padX}" y="${padY + innerH + 22}" font-size="11" fill="#6a7387" text-anchor="start">成本/延迟 低</text>
    <text x="${padX + innerW}" y="${padY + innerH + 22}" font-size="11" fill="#6a7387" text-anchor="end">成本/延迟 高</text>
    <text x="${padX - 12}" y="${padY + 4}" font-size="11" fill="#6a7387" text-anchor="end">综合质量 高</text>
    <text x="${padX - 12}" y="${padY + innerH}" font-size="11" fill="#6a7387" text-anchor="end">综合质量 低</text>
  `;

  const bubbles = data
    .map((entry, idx) => {
      const color = colorAt(idx);
      const cx = xToPx(entry.cost);
      const cy = yToPx(entry.quality);
      const name = pickModelName(entry, idx);
      const scenario = String(entry.scenario || '').trim();
      return `
        <g>
          <circle cx="${cx}" cy="${cy}" r="22" fill="${color}" fill-opacity="0.22" stroke="${color}" stroke-width="1.5" />
          <circle cx="${cx}" cy="${cy}" r="6" fill="${color}" stroke="#fff" stroke-width="1.6" />
          <text x="${cx}" y="${cy - 30}" font-size="12" font-weight="700" fill="#1f2430" text-anchor="middle">${escapeXml(name)}</text>
          ${scenario ? `<text x="${cx}" y="${cy + 38}" font-size="11" fill="#4b5563" text-anchor="middle">${escapeXml(scenario)}</text>` : ''}
        </g>
      `;
    })
    .join('');

  const legend = renderLegend(data.map((entry, idx) => legendDot(colorAt(idx), pickModelName(entry, idx))));

  const svg = `
    <svg viewBox="0 0 ${width} ${height + 40}" xmlns="http://www.w3.org/2000/svg" class="chart-svg chart-svg--quadrant" role="img" aria-label="选型四象限矩阵">
      ${axisLines}
      ${quadrantLabels}
      ${axisTicks}
      ${bubbles}
    </svg>
  `;
  return chartFrame('能力 × 成本四象限选型矩阵', '横轴成本/延迟,纵轴综合质量,气泡位置即模型在业务系统里的最佳工位', `<div class="chart-svg-wrap">${svg}</div>${legend}`);
}

function renderFunnelChart(funnel) {
  const data = nonEmptyArray(funnel);
  if (!data.length) return emptyChart('未提供 info_funnel 数据。');

  const rowHeight = 76;
  const labelWidth = 110;
  const barWidth = 360;
  const width = labelWidth + barWidth + 80;
  const height = rowHeight * data.length + 30;

  const rows = data
    .map((entry, idx) => {
      const total = Math.max(1, Number(entry.total_tokens) || 0);
      const core = clamp(Number(entry.core_tokens) || 0, 0, total);
      const noise = clamp(Number(entry.alignment_noise_tokens) || 0, 0, total - core);
      const filler = Math.max(0, total - core - noise);
      const corePct = (core / total) * 100;
      const noisePct = (noise / total) * 100;
      const fillerPct = (filler / total) * 100;
      const y = idx * rowHeight + 20;
      const name = pickModelName(entry, idx);
      const coreW = (core / total) * barWidth;
      const noiseW = (noise / total) * barWidth;
      const fillerW = (filler / total) * barWidth;
      return `
        <g transform="translate(0, ${y})">
          <text x="${labelWidth - 10}" y="22" font-size="13" font-weight="700" fill="#1f2430" text-anchor="end">${escapeXml(name)}</text>
          <text x="${labelWidth - 10}" y="40" font-size="11" fill="#6a7387" text-anchor="end">总输出 ${total} tok</text>
          <g transform="translate(${labelWidth}, 8)">
            <rect x="0" y="0" width="${barWidth}" height="32" rx="6" fill="#eef0f5" />
            <rect x="0" y="0" width="${coreW.toFixed(1)}" height="32" rx="6" fill="${TAX_COLORS.reasoning}" />
            <rect x="${coreW.toFixed(1)}" y="0" width="${noiseW.toFixed(1)}" height="32" fill="${TAX_COLORS.safety_padding}" />
            <rect x="${(coreW + noiseW).toFixed(1)}" y="0" width="${fillerW.toFixed(1)}" height="32" fill="#cfd5e3" />
          </g>
          <text x="${labelWidth + barWidth + 8}" y="28" font-size="11" fill="#1f2430">核心 ${corePct.toFixed(0)}% · 噪音 ${noisePct.toFixed(0)}% · 余 ${fillerPct.toFixed(0)}%</text>
        </g>
      `;
    })
    .join('');

  const legend = renderLegend([
    legendDot(TAX_COLORS.reasoning, '核心论点'),
    legendDot(TAX_COLORS.safety_padding, '对齐噪音/安全话术'),
    legendDot('#cfd5e3', '其他文本'),
  ]);

  const svg = `
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="chart-svg chart-svg--funnel" role="img" aria-label="信息密度漏斗图">
      ${rows}
    </svg>
  `;
  return chartFrame('信息密度漏斗', '总输出 → 核心论点的损耗比例。红色块越长,代表对齐税越重', `<div class="chart-svg-wrap">${svg}</div>${legend}`);
}

function renderStackedBar(taxData) {
  const data = nonEmptyArray(taxData);
  if (!data.length) return emptyChart('未提供 alignment_tax 数据。');

  const rowHeight = 64;
  const labelWidth = 110;
  const barWidth = 360;
  const width = labelWidth + barWidth + 70;
  const height = rowHeight * data.length + 26;
  const order = ['reasoning', 'facts', 'safety_padding', 'hedging', 'boilerplate'];

  const rows = data
    .map((entry, idx) => {
      const components = (entry && entry.components) || {};
      const values = order.map((k) => Math.max(0, Number(components[k]) || 0));
      const total = values.reduce((acc, v) => acc + v, 0) || 1;
      const y = idx * rowHeight + 16;
      let cursor = 0;
      const segs = order
        .map((k, i) => {
          const w = (values[i] / total) * barWidth;
          const x = cursor;
          cursor += w;
          if (w < 1.5) return '';
          return `<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="28" fill="${TAX_COLORS[k]}" />`;
        })
        .join('');
      const name = pickModelName(entry, idx);
      return `
        <g transform="translate(0, ${y})">
          <text x="${labelWidth - 10}" y="20" font-size="13" font-weight="700" fill="#1f2430" text-anchor="end">${escapeXml(name)}</text>
          <g transform="translate(${labelWidth}, 4)">
            <rect x="0" y="0" width="${barWidth}" height="28" rx="6" fill="#eef0f5" />
            <g clip-path="url(#stack-clip-${idx})">${segs}</g>
            <defs><clipPath id="stack-clip-${idx}"><rect x="0" y="0" width="${barWidth}" height="28" rx="6" /></clipPath></defs>
          </g>
        </g>
      `;
    })
    .join('');

  const legend = renderLegend(order.map((k) => legendDot(TAX_COLORS[k], TAX_LABELS[k])));

  const svg = `
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="chart-svg chart-svg--stack" role="img" aria-label="对齐税解构图">
      ${rows}
    </svg>
  `;
  return chartFrame('对齐税与认知偏见解构', '把每个模型的输出按性质拆成五种成分,看它把"算力"花在哪里', `<div class="chart-svg-wrap">${svg}</div>${legend}`);
}

function renderSankey(sankey) {
  if (!sankey || typeof sankey !== 'object') return emptyChart('未提供 fact_sankey 数据。');
  const nodes = nonEmptyArray(sankey.nodes).filter((n) => n && n.id != null);
  const links = nonEmptyArray(sankey.links).filter((l) => l && l.source != null && l.target != null);
  if (!nodes.length || !links.length) return emptyChart('Sankey 节点或连线为空。');

  const tierSet = Array.from(new Set(nodes.map((n) => Number(n.tier) || 0))).sort((a, b) => a - b);
  if (tierSet.length < 2) return emptyChart('Sankey 至少需要两个层级才能形成流向。');

  const W = 720;
  const H = 380;
  const padTop = 38;
  const padBottom = 30;
  const padX = 80;
  const nodeWidth = 14;
  const minNodeHeight = 18;
  const gap = 10;
  const innerH = H - padTop - padBottom;
  const tierCount = tierSet.length;
  const colX = tierSet.map((_, i) => {
    if (tierCount === 1) return W / 2 - nodeWidth / 2;
    return padX + (W - padX * 2 - nodeWidth) * (i / (tierCount - 1));
  });

  const tierIndex = {};
  tierSet.forEach((t, i) => {
    tierIndex[t] = i;
  });

  const flowOut = {};
  const flowIn = {};
  links.forEach((l) => {
    const v = Math.max(0, Number(l.value) || 0);
    flowOut[l.source] = (flowOut[l.source] || 0) + v;
    flowIn[l.target] = (flowIn[l.target] || 0) + v;
  });

  const layout = {};
  tierSet.forEach((tier, ti) => {
    const arr = nodes.filter((n) => (Number(n.tier) || 0) === tier);
    const sizes = arr.map((n) => Math.max(flowOut[n.id] || 0, flowIn[n.id] || 0, 1));
    const totalFlow = sizes.reduce((a, b) => a + b, 0) || 1;
    const totalGap = Math.max(0, (arr.length - 1) * gap);
    const availableHeight = Math.max(40, innerH - totalGap);
    const scale = availableHeight / totalFlow;
    let cursor = padTop;
    arr.forEach((n, i) => {
      const h = Math.max(minNodeHeight, sizes[i] * scale);
      layout[String(n.id)] = {
        x: colX[ti],
        y: cursor,
        width: nodeWidth,
        height: h,
        tier,
        tierIdx: ti,
        node: n,
        size: sizes[i],
      };
      cursor += h + gap;
    });
  });

  const outCursors = {};
  const inCursors = {};
  const linkPaths = links
    .map((l) => {
      const src = layout[String(l.source)];
      const tgt = layout[String(l.target)];
      if (!src || !tgt || src.tierIdx >= tgt.tierIdx) return '';
      const v = Math.max(0, Number(l.value) || 0);
      if (v <= 0) return '';
      const srcLinkH = Math.max(1.5, (v / src.size) * src.height);
      const tgtLinkH = Math.max(1.5, (v / tgt.size) * tgt.height);
      const srcOffset = outCursors[l.source] || 0;
      const tgtOffset = inCursors[l.target] || 0;
      outCursors[l.source] = srcOffset + srcLinkH;
      inCursors[l.target] = tgtOffset + tgtLinkH;

      const x0 = src.x + src.width;
      const y0 = src.y + srcOffset + srcLinkH / 2;
      const x1 = tgt.x;
      const y1 = tgt.y + tgtOffset + tgtLinkH / 2;
      const dx = Math.max(40, (x1 - x0) * 0.5);

      const kind = String(l.kind || 'support');
      const colors = { support: '#3c6df0', weak: '#f59e0b', hallucination: '#e74c3c' };
      const color = colors[kind] || colors.support;
      const opacity = kind === 'hallucination' ? 0.6 : kind === 'weak' ? 0.5 : 0.4;
      const strokeW = Math.max(1.5, Math.min(srcLinkH, tgtLinkH));
      return `<path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} C ${(x0 + dx).toFixed(1)} ${y0.toFixed(1)}, ${(x1 - dx).toFixed(1)} ${y1.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="${color}" stroke-width="${strokeW.toFixed(1)}" fill="none" stroke-opacity="${opacity}" stroke-linecap="round" />`;
    })
    .join('');

  const nodeRects = nodes
    .map((n) => {
      const lay = layout[String(n.id)];
      if (!lay) return '';
      const isLast = lay.tierIdx === tierCount - 1;
      const color = lay.tierIdx === 0 ? '#3c6df0' : isLast ? '#e74c3c' : '#0ea5e9';
      const labelX = isLast ? lay.x - 6 : lay.x + lay.width + 6;
      const anchor = isLast ? 'end' : 'start';
      const label = String(n.label || n.id || '').slice(0, 24);
      return `
        <g>
          <rect x="${lay.x.toFixed(1)}" y="${lay.y.toFixed(1)}" width="${lay.width}" height="${lay.height.toFixed(1)}" fill="${color}" rx="2" />
          <text x="${labelX.toFixed(1)}" y="${(lay.y + lay.height / 2 + 4).toFixed(1)}" font-size="11" fill="#1f2430" text-anchor="${anchor}">${escapeXml(label)}</text>
        </g>
      `;
    })
    .join('');

  const tierLabelTexts = ['论点', '证据 / 事实链', '源头 / 断裂点'];
  const tierLabels = tierSet
    .map((t, i) => {
      const label = tierLabelTexts[t] || `层级 ${t}`;
      const x = colX[i] + nodeWidth / 2;
      const anchor = i === 0 ? 'start' : i === tierCount - 1 ? 'end' : 'middle';
      const tx = i === 0 ? colX[i] : i === tierCount - 1 ? colX[i] + nodeWidth : x;
      return `<text x="${tx.toFixed(1)}" y="22" font-size="12" font-weight="600" fill="#6a7387" letter-spacing="2" text-anchor="${anchor}">${escapeXml(label)}</text>`;
    })
    .join('');

  const legend = renderLegend([
    legendDot('#3c6df0', '强支撑'),
    legendDot('#f59e0b', '弱支撑'),
    legendDot('#e74c3c', '幻觉断裂'),
  ]);

  const svg = `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="chart-svg chart-svg--sankey" role="img" aria-label="事实链路桑基图">
      ${tierLabels}
      ${linkPaths}
      ${nodeRects}
    </svg>
  `;
  return chartFrame('事实链路桑基图', '论点 → 证据 → 源头/断裂点的流向;红色路径标记疑似幻觉,黄色为弱支撑', `<div class="chart-svg-wrap">${svg}</div>${legend}`);
}

module.exports = {
  renderRadarChart,
  renderQuadrantChart,
  renderFunnelChart,
  renderStackedBar,
  renderSankey,
  MODEL_COLORS,
  TAX_COLORS,
  TAX_LABELS,
  RADAR_AXES,
  escapeXml,
  clamp,
  colorAt,
  pickModelName,
  nonEmptyArray,
  chartFrame,
  emptyChart,
};
