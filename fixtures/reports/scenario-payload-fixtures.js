function consumerScenarioPayload() {
  return {
    candidate_table: [
      { brand: 'BYD', model: 'Song Pro DM-i', version: 'mainstream trim', official_price: 'pending', market_price: 'pending', energy_type: 'PHEV', powertrain: 'DM-i', range: 'pending', smart_driving: 'pending', safety_rating: 'pending', availability: 'pending', verification_status: 'pending' },
      { brand: 'Geely', model: 'Galaxy L7', version: 'mainstream trim', official_price: 'pending', market_price: 'pending', energy_type: 'PHEV', powertrain: 'hybrid pending', range: 'pending', smart_driving: 'pending', safety_rating: 'pending', availability: 'pending', verification_status: 'pending' },
      { brand: 'Haval', model: 'H6', version: 'mainstream trim', official_price: 'pending', market_price: 'pending', energy_type: 'fuel/hybrid pending', powertrain: 'pending', range: 'pending', smart_driving: 'pending', safety_rating: 'pending', availability: 'pending', verification_status: 'pending' },
    ],
    value_weights: [
      { label: 'space', weight: 20, reason: 'family usage baseline' },
      { label: 'energy cost', weight: 25, reason: 'long-term cost sensitivity' },
      { label: 'safety', weight: 15, reason: 'minimum family vehicle threshold' },
      { label: 'after-sales', weight: 15, reason: 'maintenance convenience' },
      { label: 'resale', weight: 15, reason: 'future replacement value' },
      { label: 'smart experience', weight: 10, reason: 'cabin and driver assistance' },
    ],
    persona_rankings: [
      { persona: 'family commute', ranking: ['Song Pro DM-i', 'Galaxy L7', 'Haval H6'], reason: 'space, energy cost and after-sales first' },
      { persona: 'first-time buyer', ranking: ['Galaxy L7', 'Song Pro DM-i', 'Haval H6'], reason: 'price and smart cabin first' },
    ],
    recommendations: {
      primary: { name: 'Song Pro DM-i', reason: 'candidate primary after price/config verification', verification_status: 'pending' },
      alternatives: [{ name: 'Galaxy L7', reason: 'alternative for users who value power and cabin experience' }],
      not_recommended: [{ name: 'unverified niche/discontinued models', reason: 'availability and service risk' }],
    },
    manual_verification_items: ['official price', 'market price', 'exact trim', 'delivery time', 'local subsidy', 'warranty terms'],
  };
}

function defaultScenarioPayload(taskType) {
  const map = {
    public_opinion: {
      signal_matrix: [{ signal: 'discussion heat', value: 62, status: 'pending', note: 'requires platform metrics' }],
      verified_events: [{ event: 'core event candidate', time: 'pending', status: 'pending', source_refs: [] }],
      actor_map: [{ actor: 'public/users/media', stance: 'mixed', weight: 50, evidence_status: 'pending' }],
      risk_triggers: [{ trigger: 'new verified source appears', level: 'medium', action: 're-check response need' }],
    },
    fact_check: {
      claim_table: [{ claim: 'main circulated claim', status: 'pending', source_refs: [] }],
      source_table: [{ source: 'original/authority source', credibility: 0, status: 'pending' }],
      verification_path: ['find original source', 'check authority response', 'cross-check timeline'],
    },
    competitor_analysis: {
      candidate_table: [{ name: 'candidate A', version: 'pending' }, { name: 'candidate B', version: 'pending' }],
      dimension_scores: [{ dimension: 'fit', candidate_a: 70, candidate_b: 68, evidence_status: 'pending' }],
      selection_matrix: [{ scenario: 'default', preferred: 'candidate A', reason: 'pending verification' }],
    },
    consumer_purchase: consumerScenarioPayload(),
    investment_research: {
      target_table: [{ target: 'sector/company', status: 'pending' }],
      financial_metrics: [{ metric: 'revenue/profit/valuation', value: 'pending', source_refs: [] }],
      risk_factors: [{ risk: 'policy/order/valuation uncertainty', level: 'medium' }],
      scenario_cases: [{ case: 'base', assumption: 'pending', implication: 'pending' }],
    },
    legal_risk: {
      issue_table: [{ issue: 'liability/payment/termination clause', level: 'pending', clause_ref: 'pending' }],
      evidence_table: [{ material: 'contract full text', status: 'pending' }],
      risk_levels: [{ risk: 'contract interpretation risk', level: 'high', action: 'lawyer review' }],
      lawyer_questions: ['which jurisdiction applies?', 'is the full contract available?', 'are signatures and attachments complete?'],
    },
    knowledge_brief: {
      concept_map: [{ concept: 'core concept', definition: 'pending', relation: 'pending' }],
      consensus_points: ['define terms first', 'separate consensus from controversy'],
      open_questions: ['which source or standard should be treated as authoritative?'],
    },
    creative_content: {
      audience_table: [{ audience: 'target users', pain: 'pending', channel: 'pending' }],
      creative_routes: [{ route: 'scenario pain point', hook: 'pending', deliverable: 'pending' }],
      risk_words: ['unverified claim', 'absolute promise', 'platform-sensitive phrase'],
      deliverables: [{ type: 'title/body/CTA', status: 'draft' }],
    },
    technical_diagnosis: {
      symptom_table: [{ symptom: 'reported error', environment: 'pending', reproduction: 'pending' }],
      root_cause_hypotheses: [{ cause: 'permission/cache/dependency issue', probability: 60, evidence_status: 'pending' }],
      fix_plan: [{ step: 'reproduce and collect logs', risk: 'low', rollback: 'none' }],
      verification_steps: ['confirm reproduction', 'apply smallest fix', 'run build/test again'],
    },
    learning_research: {
      learning_path: [{ stage: 'map concepts', output: 'outline', acceptance: 'clear scope' }],
      resource_table: [{ resource: 'paper/book/course', status: 'pending' }],
      milestones: [{ milestone: 'first summary', due: 'pending' }],
      practice_plan: [{ exercise: 'write comparison notes', check: 'peer/source check' }],
    },
    travel_lifestyle: {
      option_table: [{ option: 'route/plan A', cost: 'pending', suitability: 'pending' }],
      itinerary_matrix: [{ day: 'day 1', plan: 'pending', fallback: 'pending' }],
      cost_table: [{ item: 'transport/hotel/ticket', amount: 'pending' }],
      risk_notes: [{ risk: 'weather/crowd/booking', mitigation: 'prepare backup' }],
    },
    career_recruiting: {
      role_table: [{ role: 'target role', jd_keywords: ['pending'], priority: 'pending' }],
      fit_matrix: [{ dimension: 'experience match', score: 70, evidence: 'pending' }],
      gap_plan: [{ gap: 'missing proof', action: 'rewrite project evidence' }],
      action_plan: [{ step: 'tailor resume', output: 'role-specific version' }],
    },
    medical_health: {
      symptom_summary: { symptoms: ['pending'], red_flags: ['seek medical professional if severe'] },
      risk_triage: [{ level: 'high-risk guard', reason: 'medical advice requires clinician confirmation' }],
      care_actions: ['record symptoms', 'repeat measurement if relevant', 'consult licensed clinician'],
      doctor_questions: ['how long has it lasted?', 'any medication/history?', 'what measurements or reports are available?'],
    },
    finance_planning: {
      asset_snapshot: { income: 'pending', cashflow: 'pending', risk_capacity: 'pending' },
      risk_profile: [{ dimension: 'risk tolerance', level: 'pending' }],
      allocation_options: [{ option: 'conservative/balanced/growth', suitability: 'pending' }],
      action_plan: [{ step: 'confirm risk profile before action', note: 'not investment advice' }],
    },
    general_compare: {
      comparison_table: [{ item: 'option A', pros: ['pending'], cons: ['pending'] }],
      decision_matrix: [{ dimension: 'goal fit', score: 70, note: 'pending' }],
      risk_notes: [{ risk: 'insufficient context', action: 'ask for missing variables' }],
    },
  };
  return JSON.parse(JSON.stringify(map[taskType] || map.general_compare));
}

module.exports = {
  consumerScenarioPayload,
  defaultScenarioPayload,
};
