(function attachModelConsensusVoter(global) {
  function array(value) {
    return Array.isArray(value) ? value : [];
  }

  function text(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function clip(value, max) {
    const raw = text(value);
    return raw.length > max ? `${raw.slice(0, max)}...` : raw;
  }

  function modelName(value) {
    return text(value).toLowerCase();
  }

  function tokenize(value) {
    const raw = text(value).toLowerCase();
    const words = raw.match(/[a-z0-9]+/g) || [];
    const cjk = raw.replace(/[^\u4e00-\u9fa5]/g, '');
    const grams = [];
    for (let i = 0; i < cjk.length - 1; i += 1) {
      grams.push(cjk.slice(i, i + 2));
    }
    return Array.from(new Set([...words, ...grams])).filter(Boolean);
  }

  function similarity(a, b) {
    const left = tokenize(a);
    const right = tokenize(b);
    if (!left.length || !right.length) return 0;
    const rightSet = new Set(right);
    const overlap = left.filter((token) => rightSet.has(token)).length;
    return overlap / Math.max(left.length, right.length);
  }

  function hasEvidenceSignal(value) {
    const raw = text(value);
    return (
      /(\d{4}[年.-]\d{1,2}|\d{1,2}[月.-]\d{1,2}|官方|公告|声明|报道|法院|判决|财报|工信部|外交部|新华社|官网|监管|价格|指导价|成交价|公里|版本|型号|配置)/.test(raw) ||
      /https?:\/\//i.test(raw)
    );
  }

  function collectClaimsFromDiff(diff) {
    return array(diff && diff.claims)
      .map((claim) => ({
        model: text(claim && claim.model),
        claim: clip(claim && claim.claim, 520),
        source: 'initial_diff',
      }))
      .filter((claim) => claim.model && claim.claim);
  }

  function collectClaimsFromFollowups(analysis) {
    const latestByModel = new Map();
    array(analysis && analysis.followupRounds).forEach((round) => {
      array(round && round.replies).forEach((reply) => {
        if (!reply || !reply.ok || !text(reply.text)) return;
        latestByModel.set(modelName(reply.name), {
          model: text(reply.name),
          claim: clip(reply.text, 520),
          source: `followup_round_${round.round || ''}`,
        });
      });
    });
    return Array.from(latestByModel.values());
  }

  function clusterClaims(claims) {
    const clusters = [];
    claims.forEach((claim) => {
      let best = null;
      let bestScore = 0;
      clusters.forEach((cluster) => {
        const score = Math.max(...cluster.claims.map((item) => similarity(item.claim, claim.claim)));
        if (score > bestScore) {
          best = cluster;
          bestScore = score;
        }
      });
      if (best && bestScore >= 0.28) {
        best.claims.push(claim);
        best.models = Array.from(new Set([...best.models, claim.model]));
        best.evidenceSignals += hasEvidenceSignal(claim.claim) ? 1 : 0;
        return;
      }
      clusters.push({
        id: `C${clusters.length + 1}`,
        representative: claim.claim,
        claims: [claim],
        models: [claim.model],
        evidenceSignals: hasEvidenceSignal(claim.claim) ? 1 : 0,
      });
    });
    return clusters
      .map((cluster) => ({
        ...cluster,
        support: cluster.models.length,
        evidenceRatio: cluster.claims.length ? cluster.evidenceSignals / cluster.claims.length : 0,
      }))
      .sort((a, b) => b.support - a.support || b.evidenceRatio - a.evidenceRatio);
  }

  function scoreModelAgainstMajority(model, analyses) {
    const name = modelName(model);
    let score = 60;
    let samples = 0;
    analyses.forEach((analysis) => {
      const majority = analysis.majority;
      if (!majority) return;
      const modelClaim = array(analysis.allClaims).find((claim) => modelName(claim.model) === name);
      if (!modelClaim) {
        score -= 8;
        return;
      }
      samples += 1;
      const matchedMajority = array(majority.models).some((claimModel) => modelName(claimModel) === name);
      if (matchedMajority) score += 12;
      else if (hasEvidenceSignal(modelClaim.claim)) score -= 4;
      else score -= 18;
    });
    if (!samples) score -= 12;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function buildConsensus({ modelReplies, diffAnalyses }) {
    const usableModels = array(modelReplies)
      .filter((reply) => reply && reply.ok && text(reply.text))
      .map((reply) => reply.name)
      .filter(Boolean);
    const modelCount = usableModels.length;
    const majorityThreshold = modelCount >= 3 ? Math.floor(modelCount / 2) + 1 : modelCount;
    const analyses = array(diffAnalyses).map((item) => {
      const diff = item && item.diff ? item.diff : {};
      const allClaims = [...collectClaimsFromDiff(diff), ...collectClaimsFromFollowups(item)];
      const clusters = clusterClaims(allClaims);
      const majorityCluster = clusters.find((cluster) => cluster.support >= majorityThreshold) || null;
      const isolatedClusters = clusters.filter((cluster) => cluster.support === 1 && modelCount >= 3);
      const evidenceBackedMinorities = clusters.filter(
        (cluster) => cluster.support < majorityThreshold && cluster.support > 0 && cluster.evidenceRatio >= 0.5
      );
      const status = majorityCluster
        ? 'majority_consensus'
        : evidenceBackedMinorities.length
          ? 'evidence_backed_minority'
          : 'fragmented_or_isolated';
      const decisionRule = majorityCluster
        ? 'adopt_majority_and_downweight_unbacked_isolates'
        : evidenceBackedMinorities.length
          ? 'keep_as_unverified_candidate_not_final_verdict'
          : 'do_not_promote_to_final_verdict';
      return {
        diff_id: text(diff.id),
        topic: text(diff.topic),
        type: text(diff.type),
        model_count: modelCount,
        majority_threshold: majorityThreshold,
        status,
        decision_rule: decisionRule,
        majority: majorityCluster
          ? {
              representative: majorityCluster.representative,
              support: majorityCluster.support,
              models: majorityCluster.models,
            }
          : null,
        minority_candidates: evidenceBackedMinorities.map((cluster) => ({
          representative: cluster.representative,
          support: cluster.support,
          models: cluster.models,
          reason: 'minority_with_concrete_evidence_signal',
        })),
        downweighted: isolatedClusters
          .filter((cluster) => cluster.evidenceRatio < 0.5)
          .map((cluster) => ({
            representative: cluster.representative,
            models: cluster.models,
            reason: 'isolated_claim_without_sufficient_evidence_signal',
          })),
        clusters: clusters.map((cluster) => ({
          id: cluster.id,
          representative: cluster.representative,
          support: cluster.support,
          models: cluster.models,
          evidence_ratio: Number(cluster.evidenceRatio.toFixed(2)),
        })),
        allClaims,
      };
    });
    const modelProfiles = usableModels.map((name) => {
      const score = scoreModelAgainstMajority(name, analyses);
      return {
        model: name,
        consensus_score: score,
        vote_role:
          score >= 76 ? 'consensus_anchor' : score >= 56 ? 'usable_witness' : 'downweighted_outlier',
      };
    });
    const downweightedModels = modelProfiles
      .filter((profile) => profile.vote_role === 'downweighted_outlier')
      .map((profile) => profile.model);
    return {
      strategy: 'majority_consensus_with_evidence_backed_minority_exception',
      model_count: modelCount,
      majority_threshold: majorityThreshold,
      rule_summary:
        'When external evidence is disabled, repeated multi-model agreement is the default decision anchor. A minority claim is retained only as an unverified candidate if it contains concrete source/time/parameter signals; isolated unsupported claims are downweighted and must not dominate the final verdict.',
      analyses,
      model_profiles: modelProfiles,
      downweighted_models: downweightedModels,
    };
  }

  global.DuoliModelConsensusVoter = {
    buildConsensus,
    similarity,
  };
})(window);
