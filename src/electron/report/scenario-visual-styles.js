'use strict';

function scenarioVisualCss() {
  return `
    .scenario-page--configured .section-title {
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(53,107,255,.16);
      background:
        radial-gradient(circle at 12% 0%, rgba(53,107,255,.18), transparent 30%),
        linear-gradient(135deg, rgba(255,255,255,.96), rgba(248,244,237,.92));
    }
    .scenario-page--configured .section-title::after {
      content: "";
      position: absolute;
      right: 7mm;
      top: 7mm;
      width: 32mm;
      height: 32mm;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(53,107,255,.22), transparent 62%);
      pointer-events: none;
    }
    .scenario-page--configured .card {
      position: relative;
      overflow: hidden;
    }
    .scenario-page--configured .card::before {
      content: "";
      position: absolute;
      inset: 0 auto 0 0;
      width: 1.1mm;
      background: linear-gradient(180deg, var(--scenario-accent, #356bff), rgba(255,176,70,.85));
      opacity: .82;
    }
    .scenario-page--configured .card-head b {
      color: var(--scenario-accent, #356bff);
    }
    .scenario-page--configured .tag {
      border-color: color-mix(in srgb, var(--scenario-accent, #356bff) 18%, rgba(32,33,36,.08));
      background: color-mix(in srgb, var(--scenario-accent, #356bff) 8%, #fff);
    }
    .scenario-metric-strip {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 4mm;
    }
    .scenario-metric {
      min-height: 24mm;
      padding: 4.5mm;
      border-radius: 18px;
      border: 1px solid rgba(32,33,36,.07);
      background: linear-gradient(135deg, rgba(255,255,255,.95), rgba(248,244,237,.84));
      box-shadow: 0 14px 34px rgba(24,35,62,.07);
    }
    .scenario-metric span {
      display: block;
      margin-bottom: 2mm;
      color: #7b7369;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: .12em;
      text-transform: uppercase;
    }
    .scenario-metric strong {
      display: block;
      color: #172033;
      font-size: 20px;
      line-height: 1.05;
    }
    .scenario-metric p {
      margin: 2mm 0 0;
      color: #625a51;
      font-size: 10.5px;
      line-height: 1.5;
    }
    .scenario-specialized-visual {
      --map-bg: rgba(255,255,255,.72);
    }
    .scenario-readiness-panel {
      background:
        radial-gradient(circle at 12% 10%, color-mix(in srgb, var(--scenario-accent, #356bff) 16%, transparent), transparent 32%),
        linear-gradient(135deg, rgba(255,255,255,.96), rgba(248,244,237,.88));
    }
    .scenario-readiness-grid {
      display: grid;
      grid-template-columns: .62fr .78fr 1.25fr;
      gap: 4mm;
    }
    .scenario-readiness-grid article {
      min-height: 25mm;
      padding: 4mm;
      border-radius: 18px;
      border: 1px solid rgba(32,33,36,.07);
      background: rgba(255,255,255,.78);
      box-shadow: 0 14px 34px rgba(24,35,62,.06);
    }
    .scenario-readiness-grid span {
      display: block;
      margin-bottom: 1.8mm;
      color: #7b7369;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: .12em;
      text-transform: uppercase;
    }
    .scenario-readiness-grid strong {
      display: block;
      color: #172033;
      font-size: 17px;
      line-height: 1.25;
    }
    .scenario-readiness-grid p {
      margin: 2mm 0 0;
      color: #625a51;
      font-size: 10.4px;
      line-height: 1.48;
    }
    .scenario-visual-grid {
      display: grid;
      grid-template-columns: 1.28fr .9fr;
      gap: 5mm;
      align-items: stretch;
    }
    .scenario-axis-map {
      position: relative;
      min-height: 78mm;
      overflow: hidden;
      border-radius: 22px;
      border: 1px solid rgba(32,33,36,.08);
      background:
        linear-gradient(rgba(32,33,36,.055) 1px, transparent 1px),
        linear-gradient(90deg, rgba(32,33,36,.055) 1px, transparent 1px),
        radial-gradient(circle at 75% 22%, color-mix(in srgb, var(--scenario-accent, #356bff) 16%, transparent), transparent 34%),
        linear-gradient(135deg, #fff, #f7f0e5);
      background-size: 25% 25%, 25% 25%, auto, auto;
    }
    .scenario-axis-map__label {
      position: absolute;
      z-index: 2;
      color: #625a51;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: .03em;
    }
    .scenario-axis-map__label--y {
      left: 6mm;
      top: 6mm;
    }
    .scenario-axis-map__label--x {
      right: 7mm;
      bottom: 6mm;
    }
    .scenario-axis-map__center {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 54%;
      transform: translate(-50%, -50%);
      padding: 4mm;
      border-radius: 18px;
      color: #172033;
      font-size: 12px;
      font-weight: 800;
      line-height: 1.55;
      text-align: center;
      background: rgba(255,255,255,.82);
      border: 1px solid rgba(32,33,36,.06);
      box-shadow: 0 18px 44px rgba(24,35,62,.08);
    }
    .scenario-dot {
      position: absolute;
      z-index: 3;
      display: flex;
      align-items: center;
      gap: 1.6mm;
      max-width: 34mm;
      padding: 1.5mm 2.2mm;
      border-radius: 999px;
      background: rgba(255,255,255,.9);
      border: 1px solid rgba(32,33,36,.08);
      box-shadow: 0 10px 26px rgba(24,35,62,.1);
    }
    .scenario-dot i {
      width: 3mm;
      height: 3mm;
      flex: 0 0 auto;
      border-radius: 999px;
      background: var(--scenario-accent, #356bff);
    }
    .scenario-dot b {
      overflow: hidden;
      color: #172033;
      font-size: 9px;
      line-height: 1.2;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .scenario-lanes {
      display: grid;
      gap: 3mm;
    }
    .scenario-lanes article {
      min-height: 22mm;
      padding: 3.6mm 4mm;
      border-radius: 18px;
      background: rgba(255,255,255,.82);
      border: 1px solid rgba(32,33,36,.07);
      box-shadow: 0 12px 30px rgba(24,35,62,.06);
    }
    .scenario-lanes span {
      display: inline-block;
      margin-bottom: 1.5mm;
      color: var(--scenario-accent, #356bff);
      font-size: 11px;
      font-weight: 900;
    }
    .scenario-lanes strong {
      display: block;
      color: #172033;
      font-size: 13px;
      line-height: 1.3;
    }
    .scenario-lanes p {
      margin: 1.8mm 0 0;
      color: #625a51;
      font-size: 10.2px;
      line-height: 1.45;
    }
    .scenario-page--fact_check { --scenario-accent: #ef4444; }
    .scenario-page--competitor_analysis { --scenario-accent: #2563eb; }
    .scenario-page--investment_research { --scenario-accent: #0f766e; }
    .scenario-page--legal_risk { --scenario-accent: #7c3aed; }
    .scenario-page--knowledge_brief { --scenario-accent: #0891b2; }
    .scenario-page--creative_content { --scenario-accent: #f97316; }
    .scenario-page--learning_research { --scenario-accent: #16a34a; }
    .scenario-page--travel_lifestyle { --scenario-accent: #0284c7; }
    .scenario-page--career_recruiting { --scenario-accent: #9333ea; }
    .scenario-page--medical_health { --scenario-accent: #dc2626; }
    .scenario-page--finance_planning { --scenario-accent: #ca8a04; }
    .scenario-page--general_compare { --scenario-accent: #356bff; }
  `;
}

module.exports = {
  scenarioVisualCss,
};
