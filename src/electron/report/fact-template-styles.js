'use strict';

const { scenarioVisualCss } = require('./scenario-visual-styles');

function css() {
  return `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif;
      color: #172033;
      background: #f3efe8;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .cover {
      position: relative;
      width: 210mm;
      height: 297mm;
      overflow: hidden;
      page-break-after: always;
      background:
        linear-gradient(120deg, rgba(9, 17, 34, .94), rgba(24, 39, 74, .86) 48%, rgba(247, 239, 224, .98) 49%),
        radial-gradient(circle at 22% 20%, rgba(62, 114, 255, .45), transparent 36%),
        radial-gradient(circle at 85% 18%, rgba(255, 176, 70, .34), transparent 34%);
    }
    .cover-grid, .hero::after {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.055) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.055) 1px, transparent 1px);
      background-size: 28px 28px;
    }
    .cover-orb {
      position: absolute;
      border-radius: 999px;
      filter: blur(2px);
      opacity: .86;
    }
    .cover-orb--blue {
      width: 88mm;
      height: 88mm;
      left: -24mm;
      top: 178mm;
      background: radial-gradient(circle, rgba(53,107,255,.38), transparent 68%);
    }
    .cover-orb--gold {
      width: 72mm;
      height: 72mm;
      right: 12mm;
      top: 28mm;
      background: radial-gradient(circle, rgba(255,173,51,.34), transparent 68%);
    }
    .cover-inner {
      position: relative;
      z-index: 1;
      height: 100%;
      padding: 28mm 24mm;
      display: flex;
      flex-direction: column;
    }
    .cover-top,
    .cover-main,
    .cover-foot,
    .cover-pipeline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8mm;
    }
    .eyebrow {
      margin: 0 0 8mm;
      color: #356bff;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    .cover-top .eyebrow {
      margin: 0;
      color: #8fb0ff;
    }
    .cover-top span {
      color: rgba(255,255,255,.62);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .18em;
    }
    .cover-main {
      flex: 1;
      align-items: center;
    }
    .cover h1 {
      margin: 0;
      max-width: 124mm;
      color: #fff;
      font-size: 58px;
      line-height: 1.06;
      letter-spacing: -1.6px;
      text-shadow: 0 8mm 18mm rgba(0,0,0,.22);
    }
    .subtitle {
      margin: 8mm 0 0;
      max-width: 116mm;
      color: rgba(255,255,255,.72);
      font-size: 16px;
      line-height: 1.8;
    }
    .cover-score {
      width: 38mm;
      height: 38mm;
      border-radius: 999px;
      display: grid;
      place-items: center;
      align-content: center;
      background: rgba(255,255,255,.9);
      box-shadow: 0 12mm 30mm rgba(16,28,58,.24);
    }
    .cover-score strong {
      font-size: 31px;
      line-height: 1;
      color: #356bff;
    }
    .cover-score span {
      margin-top: 1mm;
      color: #6b625a;
      font-size: 10px;
      letter-spacing: .1em;
      text-transform: uppercase;
    }
    .cover-question {
      padding: 8mm;
      border-radius: 18px;
      background: rgba(255,255,255,0.9);
      border: 1px solid rgba(255,255,255,0.48);
      box-shadow: 0 12mm 28mm rgba(16,28,58,.14);
    }
    .cover-decision {
      margin-top: 5mm;
      width: 92mm;
      align-self: flex-end;
      padding: 6mm;
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(9,17,34,.94), rgba(24,39,74,.92));
      color: #fff;
      border: 1px solid rgba(255,255,255,.16);
      box-shadow: 0 14mm 34mm rgba(16,28,58,.24);
    }
    .cover-decision span {
      display: block;
      color: #8fb0ff;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .cover-decision strong {
      display: block;
      margin: 3mm 0 2mm;
      font-size: 28px;
      line-height: 1.12;
    }
    .cover-decision p {
      margin: 0 0 4mm;
      color: rgba(255,255,255,.68);
      font-size: 12px;
      line-height: 1.65;
    }
    .cover-decision div {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3mm;
    }
    .cover-decision b {
      padding: 2.5mm;
      border-radius: 10px;
      color: #fff;
      background: rgba(53,107,255,.18);
      font-size: 11px;
      line-height: 1.4;
    }
    .cover-question span, .brief span, .metrics span {
      display: block;
      margin-bottom: 2mm;
      color: #7a746d;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: .08em;
    }
    .cover-question strong {
      font-size: 18px;
      line-height: 1.7;
    }
    .cover-pipeline {
      justify-content: flex-start;
      margin-top: 8mm;
      color: rgba(255,255,255,.78);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: .08em;
    }
    .cover-pipeline i {
      width: 12mm;
      height: 1px;
      background: linear-gradient(90deg, rgba(255,255,255,.18), rgba(255,255,255,.72));
    }
    .cover-foot {
      margin-top: 8mm;
      color: rgba(255,255,255,.68);
      font-size: 11px;
      letter-spacing: .12em;
      text-transform: uppercase;
    }
    .report {
      min-height: 297mm;
      padding: 12mm 14mm 16mm;
      background:
        radial-gradient(circle at 4% 0%, rgba(53,107,255,.1), transparent 26%),
        linear-gradient(180deg, #f7f2ea, #f1ece4);
    }
    .executive-page {
      display: flex;
      flex-direction: column;
      gap: 5mm;
      margin-bottom: 6mm;
      page-break-after: auto;
    }
    .hero {
      position: relative;
      display: grid;
      grid-template-columns: 1fr 38mm;
      gap: 9mm;
      padding: 9mm;
      border-radius: 18px;
      overflow: hidden;
      background:
        radial-gradient(circle at top left, rgba(53,107,255,.14), transparent 34%),
        linear-gradient(135deg, #fff, #f7f3ee);
      box-shadow: 0 10mm 22mm rgba(90, 76, 63, .08);
      page-break-inside: avoid;
    }
    .hero > * { position: relative; z-index: 1; }
    .hero h2 {
      margin: 0;
      font-size: 24px;
      line-height: 1.28;
      letter-spacing: -.5px;
    }
    .war-room-verdict {
      display: inline-flex;
      margin-bottom: 3mm;
      padding: 1.5mm 3mm;
      border-radius: 999px;
      color: #fff;
      background: #172033;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 1.2px;
    }
    .hero p {
      margin: 4mm 0 0;
      color: #665c52;
      font-size: 13.5px;
      line-height: 1.8;
    }
    .gauge {
      width: 36mm;
      height: 36mm;
      align-self: center;
      border-radius: 50%;
      display: grid;
      place-items: center;
      align-content: center;
      background:
        radial-gradient(circle at center, #fff 0 58%, transparent 59%),
        conic-gradient(#356bff calc(var(--score) * 1%), rgba(32,33,36,.08) 0);
      box-shadow: 0 7mm 14mm rgba(53,107,255,.15);
    }
    .gauge strong { font-size: 28px; line-height: 1; }
    .gauge span { color: #7a746d; font-size: 11px; }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 2mm;
      margin-top: 3mm;
    }
    .tag {
      display: inline-flex;
      min-height: 7mm;
      align-items: center;
      padding: 0 3mm;
      border-radius: 999px;
      background: rgba(53,107,255,.08);
      color: #2457d3;
      font-size: 11px;
      font-weight: 800;
    }
    .tag--muted { color: #7a746d; background: rgba(32,33,36,.06); }
    .brief, .metrics, .grid {
      display: grid;
      gap: 5mm;
    }
    .brief {
      grid-template-columns: .9fr 1.4fr 1fr;
    }
    .brief > div, .metrics > div, .card {
      padding: 4.5mm;
      border-radius: 14px;
      background: rgba(255,255,255,.86);
      border: 1px solid rgba(32,33,36,.07);
      box-shadow: 0 4mm 12mm rgba(90,76,63,.05);
    }
    .brief p { margin: 0; color: #413a34; font-size: 11.5px; line-height: 1.65; }
    .metrics {
      grid-template-columns: repeat(4, 1fr);
    }
    .metrics b {
      font-size: 28px;
      color: #356bff;
      line-height: 1;
    }
    .executive-compression {
      display: grid;
      grid-template-columns: 42mm 1fr;
      gap: 5mm;
      padding: 5mm;
      border-radius: 16px;
      background: linear-gradient(135deg, #172033, #2e4168 72%, #356bff);
      color: #fff;
      box-shadow: 0 8mm 20mm rgba(24,39,74,.12);
      page-break-inside: avoid;
    }
    .executive-compression span {
      display: block;
      color: #9db9ff;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .executive-compression strong {
      display: block;
      margin: 3mm 0 2mm;
      font-size: 32px;
      line-height: 1;
    }
    .executive-compression p {
      margin: 0;
      color: rgba(255,255,255,.72);
      font-size: 11.5px;
      line-height: 1.7;
    }
    .briefing-map {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 5mm;
    }
    .briefing-map div {
      min-height: 34mm;
      padding: 5mm;
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(22,31,52,.94), rgba(41,55,88,.92));
      color: #fff;
      box-shadow: 0 8mm 20mm rgba(24,39,74,.12);
    }
    .briefing-map b {
      display: block;
      color: #8fb0ff;
      font-size: 22px;
      line-height: 1;
      margin-bottom: 6mm;
    }
    .briefing-map span {
      display: block;
      font-size: 14px;
      font-weight: 900;
      margin-bottom: 2mm;
    }
    .briefing-map p {
      margin: 0;
      color: rgba(255,255,255,.72);
      font-size: 11.5px;
      line-height: 1.7;
    }
    .scenario-decision {
      display: grid;
      grid-template-columns: 48mm 1fr 58mm;
      gap: 5mm;
      margin-top: 5mm;
      padding: 5mm;
      border-radius: 20px;
      background:
        radial-gradient(circle at 12% 0%, rgba(53,107,255,.24), transparent 32%),
        linear-gradient(135deg, rgba(255,255,255,.94), rgba(246,248,252,.9));
      border: 1px solid rgba(32,33,36,.08);
      box-shadow: 0 16px 42px rgba(24,35,62,.08);
    }
    .scenario-main span, .scenario-guardrails span {
      display: block;
      color: #356bff;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: .12em;
      margin-bottom: 2mm;
    }
    .scenario-main h3 {
      margin: 0 0 3mm;
      font-size: 18px;
      line-height: 1.1;
    }
    .scenario-main strong {
      display: block;
      margin-bottom: 3mm;
      font-size: 15px;
      line-height: 1.35;
    }
    .scenario-main p, .scenario-main b, .scenario-factors p {
      margin: 0;
      color: #5f5952;
      font-size: 10.5px;
      line-height: 1.6;
    }
    .scenario-main b {
      display: inline-block;
      margin-top: 3mm;
      padding: 2mm 3mm;
      border-radius: 999px;
      background: #202124;
      color: #fff;
    }
    .scenario-factors {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 3mm;
    }
    .scenario-factors article {
      padding: 3.2mm;
      border-radius: 14px;
      background: rgba(255,255,255,.76);
      border: 1px solid rgba(32,33,36,.06);
    }
    .scenario-factors div {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 3mm;
      margin-bottom: 2mm;
    }
    .scenario-factors span {
      font-size: 10.5px;
      font-weight: 900;
      color: #202124;
    }
    .scenario-factors b {
      color: #356bff;
      font-size: 18px;
    }
    .scenario-factors i {
      display: block;
      height: 2mm;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(53,107,255,.12);
      margin-bottom: 2mm;
    }
    .scenario-factors em {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #356bff, #42c67a);
    }
    .scenario-guardrails {
      display: grid;
      gap: 3mm;
    }
    .scenario-guardrails article {
      padding: 3.5mm;
      border-radius: 14px;
      background: rgba(32,33,36,.04);
      border: 1px solid rgba(32,33,36,.06);
    }
    .scenario-guardrails ul {
      margin: 0;
      padding-left: 4mm;
      color: #413a34;
      font-size: 10.5px;
      line-height: 1.55;
    }
    .grid {
      grid-template-columns: 1fr 1fr;
      align-items: start;
    }
    .section-title {
      position: relative;
      overflow: hidden;
      padding: 6mm 7mm;
      border-radius: 18px;
      background: linear-gradient(135deg, rgba(22,31,52,.98), rgba(45,63,104,.94) 58%, rgba(53,107,255,.84));
      color: #fff;
      box-shadow: 0 8mm 22mm rgba(24,39,74,.14);
      page-break-inside: avoid;
    }
    .section-title::after {
      content: "";
      position: absolute;
      right: -16mm;
      top: -20mm;
      width: 52mm;
      height: 52mm;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,173,51,.42), transparent 64%);
    }
    .section-title span {
      position: relative;
      z-index: 1;
      color: #9db9ff;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 2.2px;
      text-transform: uppercase;
    }
    .section-title h2 {
      position: relative;
      z-index: 1;
      margin: 2mm 0 1mm;
      font-size: 22px;
      line-height: 1.2;
    }
    .section-title p {
      position: relative;
      z-index: 1;
      max-width: 138mm;
      margin: 0;
      color: rgba(255,255,255,.72);
      font-size: 12px;
      line-height: 1.7;
    }
    .issue-analysis {
      margin: 0 0 6mm;
      padding: 0;
      overflow: hidden;
      border-radius: 22px;
      background: #fff;
      border: 1px solid rgba(32,33,36,.07);
      box-shadow: 0 10mm 26mm rgba(24,39,74,.08);
      page-break-before: always;
    }
    .issue-hero {
      display: grid;
      grid-template-columns: 1fr 42mm;
      gap: 8mm;
      padding: 8mm;
      color: #fff;
      background:
        radial-gradient(circle at 76% 18%, rgba(255,173,51,.34), transparent 30%),
        linear-gradient(135deg, #101a2f, #253a68 62%, #356bff);
    }
    .issue-kicker {
      display: block;
      color: #9db9ff;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .issue-hero h2 {
      margin: 2mm 0 3mm;
      font-size: 28px;
      line-height: 1.1;
    }
    .issue-answer-line {
      display: block;
      margin-bottom: 3mm;
      color: #fff;
      font-size: 22px;
      line-height: 1.35;
    }
    .issue-hero p {
      margin: 0;
      color: rgba(255,255,255,.78);
      font-size: 13px;
      line-height: 1.85;
    }
    .issue-gauge { display: grid; place-items: center; }
    .fact-chart--gauge { width: 42mm; height: 42mm; }
    .issue-grid {
      display: grid;
      grid-template-columns: 1.15fr 1fr 1fr;
      gap: 4mm;
      padding: 5mm;
      background: #f8f5f1;
      page-break-inside: avoid;
    }
    .issue-panel, .chart-card {
      padding: 4.5mm;
      border-radius: 14px;
      background: #fff;
      border: 1px solid rgba(32,33,36,.06);
    }
    .issue-panel--dark {
      color: #fff;
      background: linear-gradient(180deg, #18233a, #263958);
    }
    .issue-panel span, .chart-card header span {
      display: block;
      margin-bottom: 2mm;
      color: #7a746d;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .16em;
      text-transform: uppercase;
    }
    .issue-panel--dark span { color: #9db9ff; }
    .issue-panel strong {
      display: block;
      margin-bottom: 2mm;
      font-size: 18px;
      line-height: 1.35;
    }
    .issue-panel p, .issue-panel li {
      color: #665c52;
      font-size: 11.5px;
      line-height: 1.7;
    }
    .issue-panel--dark p { color: rgba(255,255,255,.72); }
    .issue-panel ul {
      margin: 0;
      padding-left: 4mm;
    }
    .issue-decision-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4mm;
      padding: 0 5mm 5mm;
      background: #f8f5f1;
      page-break-inside: avoid;
    }
    .issue-decision-grid article {
      min-height: 30mm;
      padding: 4.5mm;
      border-radius: 14px;
      background:
        radial-gradient(circle at 100% 0%, rgba(53,107,255,.1), transparent 34%),
        #fff;
      border: 1px solid rgba(32,33,36,.06);
    }
    .issue-decision-grid span {
      display: block;
      margin-bottom: 2mm;
      color: #356bff;
      font-size: 12px;
      font-weight: 900;
    }
    .issue-decision-grid p {
      margin: 0;
      color: #665c52;
      font-size: 11.5px;
      line-height: 1.75;
    }
    .issue-chart-board {
      padding: 0 5mm 5mm;
      background: #f8f5f1;
      page-break-before: always;
    }
    .issue-chart-title {
      margin-bottom: 4mm;
      padding: 5mm;
      border-radius: 16px;
      color: #fff;
      background: linear-gradient(135deg, #172033, #30476f 70%, #356bff);
      page-break-inside: avoid;
    }
    .issue-chart-title span {
      color: #9db9ff;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .issue-chart-title h3 {
      margin: 2mm 0 1mm;
      font-size: 22px;
      line-height: 1.2;
    }
    .issue-chart-title p {
      margin: 0;
      color: rgba(255,255,255,.72);
      font-size: 12px;
      line-height: 1.7;
    }
    .chart-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5mm;
    }
    .chart-card { page-break-inside: avoid; }
    .compression-chart {
      display: grid;
      grid-template-columns: 34mm 1fr;
      gap: 5mm;
      align-items: stretch;
      min-height: 48mm;
    }
    .compression-score {
      display: grid;
      place-items: center;
      align-content: center;
      border-radius: 16px;
      color: #fff;
      background: radial-gradient(circle at 50% 20%, rgba(255,173,51,.34), transparent 56%), rgba(255,255,255,.1);
      border: 1px solid rgba(255,255,255,.14);
    }
    .compression-score strong {
      font-size: 30px;
      line-height: 1;
    }
    .compression-score span {
      margin-top: 2mm;
      max-width: 24mm;
      color: rgba(255,255,255,.7);
      font-size: 10px;
      line-height: 1.4;
      text-align: center;
    }
    .compression-steps {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 3mm;
      align-items: end;
    }
    .compression-steps article {
      position: relative;
      display: grid;
      grid-template-rows: 1fr auto;
      gap: 2mm;
      min-height: 45mm;
      color: #fff;
    }
    .compression-bar {
      align-self: end;
      display: grid;
      place-items: center;
      min-height: 14mm;
      border-radius: 12px 12px 6px 6px;
      background: linear-gradient(180deg, var(--bar), rgba(255,255,255,.16));
      box-shadow: 0 5mm 14mm rgba(0,0,0,.16);
    }
    .compression-bar b {
      font-size: 22px;
      line-height: 1;
    }
    .compression-steps article > span {
      color: rgba(255,255,255,.74);
      font-size: 10px;
      font-weight: 900;
      text-align: center;
    }
    .compression-steps i {
      position: absolute;
      right: -2.5mm;
      top: 42%;
      color: rgba(255,255,255,.5);
      font-style: normal;
      font-weight: 900;
    }
    .funnel-hero-card {
      color: #fff;
      background: linear-gradient(135deg, #101827, #24395d 68%, #356bff);
    }
    .funnel-hero-card .card-head b,
    .funnel-hero-card .card-head span {
      color: #fff;
    }
    .funnel-hero-card .funnel {
      margin-top: 5mm;
      padding: 4mm;
      border-radius: 14px;
      background: rgba(255,255,255,.1);
    }
    .funnel-hero-card .funnel-row {
      color: rgba(255,255,255,.82);
    }
    .chart-card header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 3mm;
      margin-bottom: 3mm;
    }
    .chart-card header b {
      font-size: 15px;
    }
    .bar-strips { display: grid; gap: 3mm; }
    .bar-strip__top {
      display: flex;
      justify-content: space-between;
      gap: 3mm;
      font-size: 11.5px;
      font-weight: 900;
    }
    .bar-strip i {
      display: block;
      height: 4mm;
      margin-top: 1.5mm;
      border-radius: 999px;
      background: rgba(32,33,36,.08);
      overflow: hidden;
    }
    .bar-strip em {
      display: block;
      height: 100%;
      border-radius: inherit;
    }
    .bar-strip p {
      margin: 1mm 0 0;
      color: #7a746d;
      font-size: 10.5px;
      line-height: 1.55;
    }
    .axis-map {
      position: relative;
      height: 54mm;
      border-radius: 14px;
      overflow: visible;
      background:
        linear-gradient(90deg, rgba(32,33,36,.05) 1px, transparent 1px),
        linear-gradient(180deg, rgba(32,33,36,.05) 1px, transparent 1px),
        linear-gradient(135deg, #f7f9ff, #fff7ec);
      background-size: 18mm 18mm, 18mm 18mm, 100% 100%;
    }
    .axis-dot {
      position: absolute;
      border-radius: 999px;
      transform: translate(-50%, -50%);
      background: #356bff;
      box-shadow: 0 3mm 8mm rgba(53,107,255,.22);
    }
    .axis-dot--1 { background: #ffad33; }
    .axis-dot--2 { background: #42c67a; }
    .axis-dot--3 { background: #ff5d5d; }
    .axis-dot--4 { background: #8b5cf6; }
    .axis-dot span {
      position: absolute;
      left: 50%;
      top: 100%;
      transform: translateX(-50%);
      margin-top: 1mm;
      white-space: nowrap;
      color: #172033;
      font-size: 10px;
      font-weight: 900;
    }
    .axis-dot--label-top span {
      top: auto;
      bottom: 100%;
      margin-top: 0;
      margin-bottom: 1mm;
    }
    .axis-dot--label-bottom span {
      top: 100%;
      bottom: auto;
    }
    .axis-label {
      position: absolute;
      color: #7a746d;
      font-size: 10px;
      font-weight: 900;
    }
    .axis-label--x { right: 3mm; bottom: 2mm; }
    .axis-label--y { left: 3mm; top: 2mm; }
    .risk-matrix {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3mm;
    }
    .risk-cell {
      padding: 3mm;
      border-radius: 12px;
      background: #f8f5f1;
      border: 1px solid rgba(32,33,36,.06);
    }
    .risk-cell--high { background: rgba(255,93,93,.1); border-color: rgba(255,93,93,.25); }
    .risk-cell--medium { background: rgba(255,173,51,.12); border-color: rgba(255,173,51,.28); }
    .risk-cell--low { background: rgba(66,198,122,.1); border-color: rgba(66,198,122,.24); }
    .risk-cell div {
      display: flex;
      justify-content: space-between;
      gap: 2mm;
      font-size: 11px;
      font-weight: 900;
    }
    .risk-cell p, .mini-empty {
      margin: 2mm 0 0;
      color: #665c52;
      font-size: 10.5px;
      line-height: 1.55;
    }
    .card {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .card--wide { grid-column: 1 / -1; }
    .page-break { page-break-before: always; }
    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4mm;
      font-size: 15px;
      font-weight: 900;
    }
    .card-head b {
      color: #356bff;
      font-size: 12px;
    }
    .consumer-table-card {
      overflow: hidden;
    }
    .consumer-empty {
      padding: 5mm;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(53,107,255,.08), rgba(255,173,51,.1));
      border: 1px solid rgba(53,107,255,.14);
    }
    .consumer-empty strong {
      display: block;
      margin-bottom: 2mm;
      font-size: 17px;
    }
    .consumer-empty p {
      margin: 0;
      color: #665c52;
      font-size: 12px;
      line-height: 1.7;
    }
    .consumer-candidate-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 10.5px;
    }
    .consumer-candidate-table th {
      padding: 2.5mm;
      color: #7a746d;
      text-align: left;
      letter-spacing: .8px;
      border-bottom: 1px solid rgba(32,33,36,.08);
    }
    .consumer-candidate-table td {
      padding: 3mm 2.5mm;
      vertical-align: top;
      border-bottom: 1px solid rgba(32,33,36,.06);
      line-height: 1.55;
      word-break: break-word;
    }
    .consumer-candidate-table td:first-child { width: 28%; }
    .consumer-candidate-table strong,
    .consumer-candidate-table small {
      display: block;
    }
    .consumer-candidate-table small {
      margin-top: 1mm;
      color: #7a746d;
    }
    .verify-pill {
      display: inline-block;
      padding: 1mm 2mm;
      border-radius: 999px;
      color: #356bff;
      font-weight: 900;
      background: rgba(53,107,255,.08);
    }
    .consumer-rank-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 3mm;
    }
    .consumer-rank-grid article {
      padding: 3.5mm;
      border-radius: 14px;
      background: #f8f5f1;
      border: 1px solid rgba(32,33,36,.06);
    }
    .consumer-rank-grid b {
      color: #356bff;
      font-size: 10px;
      letter-spacing: 1.2px;
    }
    .consumer-rank-grid strong {
      display: block;
      margin: 1.5mm 0;
      font-size: 13px;
    }
    .consumer-rank-grid p {
      margin: 0;
      color: #665c52;
      font-size: 10.5px;
      line-height: 1.55;
    }
    .scenario-action-panel {
      background:
        radial-gradient(circle at 6% 8%, rgba(53,107,255,.12), transparent 34%),
        linear-gradient(135deg, #fff, #f8f5ef);
    }
    .scenario-action-hero {
      display: grid;
      grid-template-columns: 1.15fr .85fr;
      gap: 4mm;
      margin-bottom: 4mm;
    }
    .scenario-action-hero article {
      padding: 4mm;
      border-radius: 16px;
      background: rgba(255,255,255,.78);
      border: 1px solid rgba(53,107,255,.12);
    }
    .scenario-action-hero span {
      display: block;
      margin-bottom: 1.5mm;
      color: #7a746d;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .scenario-action-hero strong {
      display: block;
      color: #111827;
      font-size: 18px;
      line-height: 1.35;
    }
    .scenario-action-hero p {
      margin: 2mm 0 0;
      color: #665c52;
      font-size: 11px;
      line-height: 1.65;
    }
    .scenario-action-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 3mm;
    }
    .scenario-action-grid > div {
      padding: 3.5mm;
      border-radius: 15px;
      background: #f8f5f1;
      border: 1px solid rgba(32,33,36,.06);
      break-inside: avoid;
    }
    .scenario-action-grid b {
      display: block;
      margin-bottom: 2mm;
      color: #356bff;
      font-size: 11px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .scenario-action-grid p {
      margin: 0 0 2mm;
      color: #665c52;
      font-size: 10.5px;
      line-height: 1.55;
    }
    .scenario-action-grid p:last-child { margin-bottom: 0; }
    .scenario-action-grid p strong {
      display: block;
      color: #111827;
      font-size: 11px;
    }
    .consumer-price-table td:nth-child(2),
    .consumer-price-table td:nth-child(3) {
      color: #111827;
      font-weight: 800;
    }
    .fact-list, .diff-list, .model-list, .raw-list { display: grid; gap: 3mm; }
    .diff-list { display: block; }
    .weighted-timeline {
      display: grid;
      grid-template-columns: 1.25fr repeat(3, 1fr);
      gap: 3mm;
      margin-bottom: 4mm;
    }
    .weighted-timeline article {
      padding: 3.5mm;
      border-radius: 13px;
      background: #f8f5f1;
      border: 1px solid rgba(32,33,36,.06);
    }
    .weighted-timeline article.is-core {
      color: #fff;
      background: linear-gradient(135deg, #172033, #356bff);
      box-shadow: 0 6mm 16mm rgba(53,107,255,.16);
    }
    .weighted-timeline b {
      display: block;
      color: #356bff;
      font-size: 10px;
      letter-spacing: 1.4px;
      margin-bottom: 2mm;
    }
    .weighted-timeline .is-core b { color: #ffcf7a; }
    .weighted-timeline strong {
      display: block;
      font-size: 11px;
      margin-bottom: 1.5mm;
    }
    .weighted-timeline span {
      display: block;
      color: #665c52;
      font-size: 11px;
      line-height: 1.55;
    }
    .weighted-timeline .is-core span { color: rgba(255,255,255,.78); }
    .fact {
      display: grid;
      grid-template-columns: 10mm 1fr;
      gap: 3mm;
      padding: 4mm;
      border-radius: 12px;
      background: #f8f5f1;
      border-left: 3px solid #ffad33;
    }
    .fact--confirmed { border-left-color: #42c67a; }
    .fact--disputed { border-left-color: #ff5d5d; }
    .fact--polluted { border-left-color: #9a8f85; opacity: .78; }
    .fact-num { color: #356bff; font-weight: 900; font-size: 12px; }
    .fact-time { color: #7a746d; font-size: 11px; font-weight: 900; }
    .fact h4, .diff h4, .model h4 {
      margin: 1mm 0;
      font-size: 13.5px;
      line-height: 1.55;
    }
    .fact p, .diff p, .model p, .verdict p, .summary-line {
      margin: 2mm 0 0;
      color: #665c52;
      font-size: 12px;
      line-height: 1.75;
    }
    .funnel { display: grid; gap: 3mm; }
    .funnel-row {
      display: grid;
      grid-template-columns: 24mm 1fr 10mm;
      gap: 3mm;
      align-items: center;
      font-size: 12px;
    }
    .funnel-row i {
      height: 4mm;
      border-radius: 999px;
      background: rgba(32,33,36,.08);
      overflow: hidden;
    }
    .funnel-row em {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #356bff, #ffad33);
    }
    .diff {
      padding: 5mm;
      border-radius: 14px;
      background: #f8f5f1;
      border: 1px solid rgba(32,33,36,.07);
      margin-bottom: 3mm;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .diff--high {
      background: linear-gradient(180deg, rgba(255,93,93,.08), #fff);
      border-color: rgba(255,93,93,.32);
    }
    .diff-title {
      display: grid;
      grid-template-columns: 12mm 1fr auto;
      gap: 3mm;
      align-items: center;
    }
    .diff-title span { color: #356bff; font-weight: 900; }
    .diff-title b { color: #7a746d; font-size: 11px; }
    .diff-verdict-lines {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3mm;
      margin-top: 3mm;
    }
    .diff-verdict-lines p {
      margin: 0;
      padding: 3mm;
      border-radius: 12px;
      color: #3f382f;
      background: #fff;
      border: 1px solid rgba(32,33,36,.06);
      font-size: 11.5px;
      line-height: 1.65;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .diff-verdict-lines strong {
      color: #172033;
    }
    .claim-grid {
      margin-top: 3mm;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 3mm;
    }
    .claim, .cleaned, .model, .raw {
      padding: 4mm;
      border-radius: 12px;
      background: #fff;
      border: 1px solid rgba(32,33,36,.06);
    }
    .claim strong { color: #356bff; }
    .claim p { margin: 2mm 0 0; }
    .cleaned { margin-top: 3mm; background: rgba(53,107,255,.07); }
    .model { display: grid; gap: 2mm; }
    .model > div {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 3mm;
    }
    .model span { color: #7a746d; font-size: 11px; font-weight: 800; }
    .model > b { color: #356bff; font-size: 26px; }
    .model small { color: #7a746d; font-size: 12px; }
    .verdict h3 { margin: 4mm 0 1mm; font-size: 14px; }
    .verdict h3:first-child { margin-top: 0; }
    .final-verdict-lockup {
      min-height: 64mm;
      padding: 8mm;
      border-radius: 18px;
      color: #fff;
      background: linear-gradient(135deg, #101827, #263958 65%, #356bff);
      box-shadow: 0 8mm 24mm rgba(24,39,74,.12);
    }
    .final-verdict-lockup span {
      display: block;
      color: #9db9ff;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .final-verdict-lockup strong {
      display: block;
      margin: 4mm 0;
      font-size: 28px;
      line-height: 1.2;
    }
    .final-verdict-lockup p {
      max-width: 130mm;
      color: rgba(255,255,255,.72);
      font-size: 12.5px;
      line-height: 1.65;
    }
    .final-verdict-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4mm;
      margin-top: 5mm;
    }
    .final-verdict-grid article {
      padding: 4mm;
      border-radius: 14px;
      background: #f8f5f1;
      border: 1px solid rgba(32,33,36,.06);
      min-height: 28mm;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .final-verdict-grid b {
      display: block;
      color: #356bff;
      font-size: 12px;
      margin-bottom: 2mm;
    }
    .final-verdict-grid span {
      color: #172033;
      font-size: 12px;
      font-weight: 800;
      line-height: 1.65;
      word-break: break-word;
    }
    .raw pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 120mm;
      overflow: hidden;
      color: #4a433c;
      font-size: 11.5px;
      line-height: 1.65;
    }
    .empty {
      color: #7a746d;
      font-size: 12px;
      line-height: 1.7;
    }
    ${scenarioVisualCss()}
  `;
}

module.exports = {
  css,
};
