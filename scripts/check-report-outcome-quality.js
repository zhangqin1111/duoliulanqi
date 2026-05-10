const fs = require('fs');
const path = require('path');
const { applyReportQualityGate } = require('../src/electron/report/report-quality-gate');
const { readReportFixtures } = require('./report-fixture-utils');

const repoRoot = path.resolve(__dirname, '..');
const reviewDir = path.join(repoRoot, 'tmp_pdf_review');
const manifestPath = path.join(reviewDir, 'manifest.json');
const fixtureById = new Map(readReportFixtures().map((fixture) => [fixture.id, fixture]));

const GENERIC_PUBLIC_OPINION_PHRASES = ['未形成稳定主导情绪', '舆论叙事链', '缺少外部一手来源与平台热度数据'];

function stripHtml(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function main() {
  if (!fs.existsSync(manifestPath)) {
    fail('Missing tmp_pdf_review/manifest.json. Run npm run render:report-fixtures first.');
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const item of manifest) {
    const html = fs.existsSync(item.htmlPath) ? fs.readFileSync(item.htmlPath, 'utf8') : '';
    const text = stripHtml(html);
    const problems = [];
    const isOpinionLike = ['public_opinion', 'fact_check'].includes(item.taskType);
    const fixture = fixtureById.get(item.id);
    const structured = fixture ? applyReportQualityGate(fixture.structured) : null;
    const payload = (structured && structured.scenario_payload) || {};
    const decision = (structured && structured.scenario_decision) || {};

    if (!isOpinionLike) {
      for (const phrase of GENERIC_PUBLIC_OPINION_PHRASES) {
        if (text.includes(phrase)) problems.push(`contains public-opinion fallback: ${phrase}`);
      }
    }

    if (item.taskType === 'consumer_purchase') {
      if (!/(购买|选购|推荐|首选|备选|慎选|适合|消费)/.test(text)) {
        problems.push('consumer report lacks purchase decision language');
      }
      if (!/(候选产品核验表|候选车型表缺失|候选清单)/.test(text)) {
        problems.push('consumer report lacks candidate verification table');
      }
      if (/0\/\d+/.test(text) && /(已核验车型|真实可购池|三重信源交叉验证)/.test(text)) {
        problems.push('consumer report makes verified-pool claim without evidence bindings');
      }
    }

    if (item.taskType === 'technical_diagnosis') {
      if (!/(根因|修复|复现|验证|回滚|第一步)/.test(text)) {
        problems.push('technical report lacks diagnosis/action language');
      }
    }

    if (item.taskType === 'legal_risk' && !/(风险|证据|材料|律师|管辖)/.test(text)) {
      problems.push('legal report lacks legal-risk language');
    }

    if (item.taskType === 'medical_health' && !/(就医|症状|健康|风险|诊断)/.test(text)) {
      problems.push('medical report lacks health-risk language');
    }

    if (['legal_risk', 'medical_health', 'finance_planning'].includes(item.taskType)) {
      if (!decision.evidence_standard) problems.push(`${item.taskType} missing evidence standard`);
      if (!Array.isArray(decision.do_not_overread) || decision.do_not_overread.length < 1) {
        problems.push(`${item.taskType} missing do-not-overread guardrails`);
      }
    }

    if (item.taskType === 'fact_check') {
      if (!payload.claim_table || !payload.source_table || !payload.verification_path) {
        problems.push('fact-check report lacks claim/source/verification structure');
      }
    }

    if (item.taskType === 'competitor_analysis') {
      if (!payload.candidate_table || !payload.dimension_scores || !payload.selection_matrix) {
        problems.push('competitor report lacks candidate/dimension/selection structure');
      }
    }

    if (item.taskType === 'travel_lifestyle') {
      if (!payload.option_table || !payload.risk_notes) {
        problems.push('travel report lacks option/risk structure');
      }
    }

    if (item.taskType === 'general_compare') {
      if (!payload.comparison_table || !payload.decision_matrix || !payload.risk_notes) {
        problems.push('general comparison report lacks comparison/decision/risk structure');
      }
    }

    if (/(XXXX|2024XXXX|2025XXXX|2026XXXX|placeholder|TBD)/i.test(text)) {
      problems.push('placeholder token leaked into report');
    }

    if (/(未命名事实点|待核验事实点|未指定时间\/待核验|未标注来源)/.test(text)) {
      problems.push('empty fact placeholder leaked into evidence section');
    }

    if (/(未命名事实点|待核验事实点|未指定时间\/待核验|未标注来源)/.test(text)) {
      problems.push('empty fact placeholder leaked into evidence section');
    }

    if (item.id.includes('car') && /(iPhone|Apple|苹果|蘋果)/i.test(text)) {
      problems.push('consumer car report contains phone/apple scenario residue');
    }

    if (item.taskType === 'consumer_purchase' && /材料不足/.test(text) && /(普通用户首选|首选比亚迪|首选吉利|首选长安|首选方案\s+\d+)/.test(text)) {
      problems.push('consumer report mixes insufficient-evidence verdict with strong purchase recommendation');
    }

    if (problems.length) {
      fail(`OUTCOME ${item.id}: ${problems.join(', ')}`);
    } else {
      console.log(`OUTCOME ${item.id}: ok`);
    }
  }

  if (!process.exitCode) {
    console.log(`Report outcome quality check passed: ${manifest.length} fixtures`);
  }
}

main();
