(function attachReportMaterialCompressor(global) {
  const REPLY_LIMIT = 2600;
  const FOLLOWUP_LIMIT = 3600;
  const POLLUTION_LIMIT = 2600;
  const SELF_AUDIT_LIMIT = 2200;

  function clip(text, max) {
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    if (!value || value.length <= max) return value;
    return `${value.slice(0, max)}...[已压缩，完整原文保留在会话材料中]`;
  }

  function compactReplies(modelReplies) {
    return (Array.isArray(modelReplies) ? modelReplies : []).map((reply) => ({
      id: reply.id || '',
      name: reply.name || 'Unknown',
      ok: !!reply.ok,
      text: reply.ok ? clip(reply.text, REPLY_LIMIT) : '',
      error: reply.ok ? '' : clip(reply.error || 'unknown', 400),
    }));
  }

  function compactDiffAnalyses(diffAnalyses) {
    return (Array.isArray(diffAnalyses) ? diffAnalyses : []).map((item) => {
      const diff = item && item.diff ? item.diff : {};
      const merge = item && item.merge ? item.merge : {};
      return {
        diff: {
          id: diff.id || '',
          topic: clip(diff.topic, 260),
          type: diff.type || '',
          severity: diff.severity || '',
          claims: Array.isArray(diff.claims)
            ? diff.claims.slice(0, 6).map((claim) => ({
                model: claim.model || '',
                claim: clip(claim.claim, 420),
              }))
            : [],
        },
        rounds: item && item.rounds ? item.rounds : 0,
        stopReason: item && item.stopReason ? item.stopReason : '',
        merge: {
          consensus_causes: Array.isArray(merge.consensus_causes) ? merge.consensus_causes.map((v) => clip(v, 240)) : [],
          remaining_disputes: Array.isArray(merge.remaining_disputes) ? merge.remaining_disputes.map((v) => clip(v, 240)) : [],
          likely_pollution: Array.isArray(merge.likely_pollution) ? merge.likely_pollution.map((v) => clip(v, 240)) : [],
          cleaned_interpretation: clip(merge.cleaned_interpretation, 700),
          confidence: merge.confidence || 0,
          next_action: merge.next_action || '',
        },
        followupDigest: clip(
          JSON.stringify(
            (item && Array.isArray(item.followupRounds) ? item.followupRounds : []).map((round) => ({
              round: round.round,
              replies: (Array.isArray(round.replies) ? round.replies : []).map((reply) => ({
                model: reply.name || reply.modelName || '',
                ok: !!reply.ok,
                text: clip(reply.text, 500),
                error: clip(reply.error, 160),
              })),
            }))
          ),
          FOLLOWUP_LIMIT
        ),
      };
    });
  }

  function compactPollution(pollution) {
    if (!pollution || typeof pollution !== 'object') return pollution || null;
    return {
      pollution_removed: Array.isArray(pollution.pollution_removed)
        ? pollution.pollution_removed.slice(0, 10).map((item) => ({
            source: item.source || '',
            type: item.type || '',
            content: clip(item.content, 260),
            reason: clip(item.reason, 320),
          }))
        : [],
      kept_claims: Array.isArray(pollution.kept_claims) ? pollution.kept_claims.slice(0, 10).map((v) => clip(v, 260)) : [],
      discarded_claims: Array.isArray(pollution.discarded_claims)
        ? pollution.discarded_claims.slice(0, 10).map((v) => clip(v, 260))
        : [],
      root_causes: Array.isArray(pollution.root_causes) ? pollution.root_causes.slice(0, 10).map((v) => clip(v, 260)) : [],
      unresolved: Array.isArray(pollution.unresolved) ? pollution.unresolved.slice(0, 10).map((v) => clip(v, 260)) : [],
      digest: clip(JSON.stringify(pollution), POLLUTION_LIMIT),
    };
  }

  function compactSelfCleansing(selfCleansing) {
    if (!selfCleansing || typeof selfCleansing !== 'object') return selfCleansing || null;
    return {
      merged: selfCleansing.merged || null,
      error: selfCleansing.error || '',
      auditDigest: clip(JSON.stringify(selfCleansing.audits || []), SELF_AUDIT_LIMIT),
    };
  }

  function compactConsensus(consensus) {
    if (!consensus || typeof consensus !== 'object') return null;
    return {
      strategy: consensus.strategy || '',
      model_count: consensus.model_count || 0,
      majority_threshold: consensus.majority_threshold || 0,
      rule_summary: clip(consensus.rule_summary, 520),
      downweighted_models: Array.isArray(consensus.downweighted_models) ? consensus.downweighted_models.slice(0, 8) : [],
      model_profiles: Array.isArray(consensus.model_profiles)
        ? consensus.model_profiles.slice(0, 8).map((profile) => ({
            model: profile.model || '',
            consensus_score: profile.consensus_score || 0,
            vote_role: profile.vote_role || '',
          }))
        : [],
      analyses: Array.isArray(consensus.analyses)
        ? consensus.analyses.slice(0, 8).map((item) => ({
            diff_id: item.diff_id || '',
            topic: clip(item.topic, 220),
            type: item.type || '',
            status: item.status || '',
            decision_rule: item.decision_rule || '',
            majority: item.majority
              ? {
                  representative: clip(item.majority.representative, 360),
                  support: item.majority.support || 0,
                  models: Array.isArray(item.majority.models) ? item.majority.models : [],
                }
              : null,
            downweighted: Array.isArray(item.downweighted)
              ? item.downweighted.slice(0, 5).map((claim) => ({
                  representative: clip(claim.representative, 280),
                  models: Array.isArray(claim.models) ? claim.models : [],
                  reason: claim.reason || '',
                }))
              : [],
            minority_candidates: Array.isArray(item.minority_candidates)
              ? item.minority_candidates.slice(0, 5).map((claim) => ({
                  representative: clip(claim.representative, 280),
                  support: claim.support || 0,
                  models: Array.isArray(claim.models) ? claim.models : [],
                  reason: claim.reason || '',
                }))
              : [],
          }))
        : [],
    };
  }

  function compactFinalTraceInput(input) {
    const source = input || {};
    return {
      question: source.question || '',
      originalQuestion: source.originalQuestion || '',
      modelReplies: compactReplies(source.modelReplies),
      diffAnalyses: compactDiffAnalyses(source.diffAnalyses),
      pollution: compactPollution(source.pollution),
      selfCleansing: compactSelfCleansing(source.selfCleansing),
      taskRoute: source.taskRoute || null,
      highRisk: source.highRisk || null,
      evidencePlan: source.evidencePlan || null,
      evidencePack: source.evidencePack || null,
      evidenceBoundaryGuard: source.evidenceBoundaryGuard || null,
      externalEvidenceEnabled: source.externalEvidenceEnabled === true,
      consensus: compactConsensus(source.consensus),
    };
  }

  global.DuoliReportMaterialCompressor = {
    clip,
    compactDiffAnalyses,
    compactFinalTraceInput,
    compactConsensus,
    compactPollution,
    compactReplies,
    compactSelfCleansing,
  };
})(window);
