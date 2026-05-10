'use strict';

function compact(value) {
  return String(value || '').replace(/\s+/g, '').trim();
}

function textOf(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return [value.title, value.event, value.claim, value.fact, value.note, value.direct_verdict, value.one_sentence, value.direct_answer]
      .map((item) => String(item || ''))
      .join(' ');
  }
  return String(value || '');
}

function scenarioItemText(value) {
  if (!value || typeof value !== 'object') return textOf(value);
  return [
    value.brand,
    value.model,
    value.version,
    value.name,
    value.title,
    value.official_price,
    value.market_price,
    value.availability,
    value.launch_time,
    value.energy_type,
    value.powertrain,
    value.range,
    value.recommendation,
    value.reason,
  ]
    .map((item) => String(item || ''))
    .join(' ');
}

function claimTokens(text) {
  const source = compact(text).toLowerCase();
  const latin = source.match(/[a-z0-9][a-z0-9._-]{1,}/gi) || [];
  const cjk = source.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  const fragments = [];
  for (const chunk of cjk) {
    for (let i = 0; i < chunk.length - 1; i += 2) {
      fragments.push(chunk.slice(i, i + 2));
    }
  }
  return Array.from(new Set([...latin, ...fragments].filter((item) => item.length >= 2))).slice(0, 24);
}

function evidenceText(item) {
  return compact([item && item.title, item && item.source, item && item.snippet, item && item.url].join(' ')).toLowerCase();
}

function scoreEvidenceForClaim(claimText, evidence) {
  const tokens = claimTokens(claimText);
  if (!tokens.length || !evidence) return 0;
  const haystack = evidenceText(evidence);
  const hits = tokens.filter((token) => haystack.includes(token)).length;
  const explicit = Array.isArray(evidence.relatedClaims) && evidence.relatedClaims.some((id) => compact(id) && compact(claimText).includes(compact(id)));
  return hits + (explicit ? 6 : 0) + (evidence.credibility >= 80 ? 1 : 0);
}

function pickEvidenceForClaim(claim, evidenceItems, limit = 3) {
  return (Array.isArray(evidenceItems) ? evidenceItems : [])
    .map((item) => ({ item, score: scoreEvidenceForClaim(claim.text, item) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || (b.item.credibility || 0) - (a.item.credibility || 0))
    .slice(0, limit)
    .map((entry) => entry.item.id);
}

function addClaim(claims, id, location, text, target) {
  const value = String(text || '').trim();
  if (!value) return;
  if (/^(未命名事实点|待核验事实点|未指定时间\/待核验|未标注来源)$/i.test(value)) return;
  if (/未命名事实点|待核验事实点/.test(value) && value.length < 24) return;
  claims.push({ id, location, text: value, target: target || null });
}

function collectReportClaims(report) {
  const data = report || {};
  const claims = [];
  addClaim(claims, 'C1', 'executive_conclusion.one_sentence', data.executive_conclusion && data.executive_conclusion.one_sentence, data.executive_conclusion);
  addClaim(claims, 'C2', 'scenario_decision.direct_verdict', data.scenario_decision && data.scenario_decision.direct_verdict, data.scenario_decision);
  addClaim(claims, 'C3', 'user_issue_analysis.direct_answer', data.user_issue_analysis && data.user_issue_analysis.direct_answer, data.user_issue_analysis);

  const factMap = data.fact_map || {};
  const factGroups = [
    ['fact_map.timeline', factMap.timeline],
    ['fact_map.confirmed_facts', factMap.confirmed_facts],
    ['fact_map.uncertain_claims', factMap.uncertain_claims],
  ];
  let index = 4;
  for (const [location, items] of factGroups) {
    (Array.isArray(items) ? items : []).forEach((item) => {
      addClaim(claims, `C${index}`, location, textOf(item), item);
      index += 1;
    });
  }

  const payload = data.scenario_payload || {};
  const scenarioGroups = [
    ['scenario_payload.candidate_table', payload.candidate_table],
    ['scenario_payload.recommendations.primary', payload.recommendations && payload.recommendations.primary],
    ['scenario_payload.recommendations.alternatives', payload.recommendations && payload.recommendations.alternatives],
    ['scenario_payload.recommendations.not_recommended', payload.recommendations && payload.recommendations.not_recommended],
    ['scenario_payload.persona_rankings', payload.persona_rankings],
    ['scenario_payload.risk_factors', payload.risk_factors],
  ];
  for (const [location, value] of scenarioGroups) {
    (Array.isArray(value) ? value : value ? [value] : []).forEach((item) => {
      addClaim(claims, `C${index}`, location, scenarioItemText(item), item);
      index += 1;
    });
  }
  return claims;
}

function bindEvidenceToReport(report, evidencePack) {
  const data = report && typeof report === 'object' ? report : {};
  const pack = evidencePack && typeof evidencePack === 'object' ? evidencePack : {};
  const items = Array.isArray(pack.items) ? pack.items : [];
  const claims = collectReportClaims(data);
  const links = claims.map((claim) => {
    const evidenceIds = pickEvidenceForClaim(claim, items);
    const status = evidenceIds.length ? 'candidate_evidence' : 'needs_verification';
    if (claim.target && typeof claim.target === 'object') {
      claim.target.claim_id = claim.target.claim_id || claim.id;
      claim.target.evidence_ids = evidenceIds;
      claim.target.verification_status = status;
    }
    return {
      claim_id: claim.id,
      location: claim.location,
      claim: claim.text,
      strength: claim.location.includes('uncertain') || !evidenceIds.length ? 'weak' : 'strong',
      evidence_ids: evidenceIds,
      confidence: evidenceIds.length ? Math.min(92, 62 + evidenceIds.length * 8) : 42,
      verification_status: status,
    };
  });

  data.evidence_sources = items.map((item) => ({
    id: item.id,
    title: item.title,
    source: item.source,
    url: item.url,
    publishedAt: item.publishedAt,
    snippet: item.snippet,
    credibility: item.credibility,
  }));
  data.evidence_bindings = links;
  data.evidence_binding_summary = {
    claims: links.length,
    bound: links.filter((link) => link.evidence_ids.length).length,
    unbound: links.filter((link) => !link.evidence_ids.length).length,
    evidence_sources: items.length,
  };
  return data;
}

module.exports = {
  bindEvidenceToReport,
  collectReportClaims,
  pickEvidenceForClaim,
  scoreEvidenceForClaim,
};
