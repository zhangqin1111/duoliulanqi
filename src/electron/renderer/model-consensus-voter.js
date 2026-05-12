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
      /(\d{4}[-年]\d{1,2}|\d{1,2}[月-]\d{1,2}|官方|公告|声明|报道|法院|判决|财报|工信部|外交部|新华社|政府网|官网|监管|价格|指导价|成交价|公里|版本|型号|配置)/.test(raw) ||
      /https?:\/\//i.test(raw)
    );
  }

  function hasSearchSignal(value) {
    const raw = text(value);
    return (
      /(搜索|联网|网络|最新|官网|官方网站|官方渠道|官方发布|官方宣布|外交部|新华社|中国政府网|公告|声明|报道|可核验|已核验)/.test(raw) ||
      /https?:\/\//i.test(raw)
    );
  }

  function isNoSearchAdmission(value) {
    return /(未联网|无法联网|不能搜索|无法搜索|仅基于已有知识|知识截止)/.test(text(value));
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

  function collectFollowupEvidenceByModel(analysis) {
    const latestByModel = new Map();
    array(analysis && analysis.followupRounds).forEach((round) => {
      array(round && round.replies).forEach((reply) => {
        if (!reply || !reply.ok || !text(reply.text)) return;
        latestByModel.set(modelName(reply.name), {
          model: text(reply.name),
          text: clip(reply.text, 720),
          searched: hasSearchSignal(reply.text) && !isNoSearchAdmission(reply.text),
          noSearchAdmission: isNoSearchAdmission(reply.text),
          source: `followup_round_${round.round || ''}`,
        });
      });
    });
    return latestByModel;
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
      if (matchedMajority) score += modelClaim.searched ? 16 : 12;
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
      const followupEvidence = collectFollowupEvidenceByModel(item);
      const allClaims = collectClaimsFromDiff(diff).map((claim) => {
        const evidence = followupEvidence.get(modelName(claim.model));
        return {
          ...claim,
          followupEvidence: evidence || null,
          searched: !!(evidence && evidence.searched),
          noSearchAdmission: !!(evidence && evidence.noSearchAdmission),
        };
      });
      const clusters = clusterClaims(allClaims);
      clusters.forEach((cluster) => {
        const searchedModels = array(cluster.models).filter((name) => {
          const evidence = followupEvidence.get(modelName(name));
          return evidence && evidence.searched;
        });
        cluster.searchedModels = searchedModels;
        cluster.searchConfirmedSupport = searchedModels.length;
        cluster.evidenceSignals += searchedModels.length;
        cluster.evidenceRatio = cluster.claims.length ? cluster.evidenceSignals / cluster.claims.length : 0;
      });
      const followupClaims = collectClaimsFromFollowups(item);
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
              searched_models: majorityCluster.searchedModels || [],
              search_confirmed_support: majorityCluster.searchConfirmedSupport || 0,
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
          searched_models: cluster.searchedModels || [],
          search_confirmed_support: cluster.searchConfirmedSupport || 0,
        })),
        followupEvidence: Array.from(followupEvidence.values()),
        followupClaims,
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

  function normalizeComparable(value) {
    return text(value).toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]+/g, '');
  }

  function itemText(item) {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return [item.source, item.type, item.content, item.reason, item.claim, item.model, item.cleaned_conclusion]
      .map(text)
      .filter(Boolean)
      .join(' ');
  }

  function matchesRepresentative(value, representative) {
    const left = itemText(value);
    const right = text(representative);
    if (!left || !right) return false;
    const l = normalizeComparable(left);
    const r = normalizeComparable(right);
    const head = r.slice(0, Math.min(24, r.length));
    return (!!head && l.includes(head)) || similarity(left, right) >= 0.18;
  }

  function keyFactTokens(value) {
    const raw = text(value);
    const tokens = raw.match(/特朗普|访华|外交部|新华社|中国政府网|官方|公告|宣布|\d{4}年|\d{4}|\d{1,2}月\d{1,2}日|\d{1,2}日至\d{1,2}日|\d{1,2}月/g) || [];
    return Array.from(new Set(tokens));
  }

  function sharesKeyFacts(value, representative) {
    const left = itemText(value);
    const tokens = keyFactTokens(representative);
    if (!left || tokens.length < 2) return false;
    const overlap = tokens.filter((token) => left.includes(token)).length;
    return overlap >= Math.min(2, tokens.length);
  }

  function accusesClaim(value) {
    return /(幻觉|虚构|不存在|未官宣|无官方|未发布|不成立|前提不成立|缺乏可验证|未核验|错误|污染)/.test(itemText(value));
  }

  function contradictsProtectedConsensus(value, representative) {
    if (!accusesClaim(value)) return false;
    return matchesRepresentative(value, representative) || sharesKeyFacts(value, representative);
  }

  function majorityAnalyses(consensus) {
    return array(consensus && consensus.analyses).filter(
      (analysis) => analysis && analysis.status === 'majority_consensus' && analysis.majority
    );
  }

  function isProtectedModel(source, majority) {
    const sourceName = modelName(source);
    return !!sourceName && array(majority && majority.models).some((name) => modelName(name) === sourceName);
  }

  function protectPollutionWithConsensus(session) {
    if (!session || !session.pollution || !session.consensus) return null;
    const protectedMajorities = majorityAnalyses(session.consensus).filter((analysis) => {
      const majority = analysis.majority || {};
      return majority.support >= (analysis.majority_threshold || session.consensus.majority_threshold || 2);
    });
    if (!protectedMajorities.length) return null;

    const pollution = session.pollution;
    const restored = [];
    const protectedTexts = protectedMajorities.map((analysis) => ({
      diff_id: analysis.diff_id,
      topic: analysis.topic,
      representative: analysis.majority.representative,
      support: analysis.majority.support,
      models: analysis.majority.models,
      searched_models: analysis.majority.searched_models || [],
    }));

    pollution.pollution_removed = array(pollution.pollution_removed).filter((item) => {
      const hit = protectedTexts.find(
        (entry) =>
          isProtectedModel(item && item.source, { models: entry.models }) ||
          matchesRepresentative(item, entry.representative) ||
          contradictsProtectedConsensus(item, entry.representative)
      );
      if (!hit) return true;
      restored.push({ ...hit, removedItem: item });
      return false;
    });

    pollution.discarded_claims = array(pollution.discarded_claims).filter((item) => {
      const hit = protectedTexts.find(
        (entry) => matchesRepresentative(item, entry.representative) || contradictsProtectedConsensus(item, entry.representative)
      );
      if (!hit) return true;
      restored.push({ ...hit, discardedItem: item });
      return false;
    });

    pollution.kept_claims = array(pollution.kept_claims).filter((item) => {
      return !protectedTexts.some((entry) => contradictsProtectedConsensus(item, entry.representative));
    });
    protectedTexts.forEach((entry) => {
      const label = `CONSENSUS_LOCKED: ${entry.representative}（支持模型：${array(entry.models).join('、')}；联网/官方信号：${array(entry.searched_models).join('、') || '未显式标注'}）`;
      if (!pollution.kept_claims.some((item) => text(item) === label)) {
        pollution.kept_claims.unshift(label);
      }
    });

    pollution.root_causes = array(pollution.root_causes).filter((item) => {
      return !protectedTexts.some((entry) => contradictsProtectedConsensus(item, entry.representative));
    });

    pollution.consensus_guard = {
      applied: true,
      reason:
        'Majority consensus from multiple AI witnesses must not be discarded by a later single-judge pollution pass when external evidence is disabled.',
      protected_majorities: protectedTexts,
      restored_count: restored.length,
      restored,
    };
    return pollution.consensus_guard;
  }

  function protectSelfCleansingWithConsensus(session) {
    if (!session || !session.selfCleansing || !session.consensus) return null;
    const merged = session.selfCleansing.merged;
    if (!merged) return null;
    const protectedMajorities = majorityAnalyses(session.consensus);
    if (!protectedMajorities.length) return null;
    const protectedTexts = protectedMajorities.map((analysis) => ({
      diff_id: analysis.diff_id,
      topic: analysis.topic,
      representative: analysis.majority.representative,
      support: analysis.majority.support,
      models: analysis.majority.models,
      searched_models: analysis.majority.searched_models || [],
    }));

    array(merged.per_model).forEach((item) => {
      const model = item && item.model;
      const protectedForModel = protectedTexts.filter((entry) => isProtectedModel(model, { models: entry.models }));
      if (!protectedForModel.length) return;
      item.rejected = array(item.rejected).filter((rejected) => {
        return !protectedForModel.some(
          (entry) => matchesRepresentative(rejected, entry.representative) || contradictsProtectedConsensus(rejected, entry.representative)
        );
      });
      item.accepted = array(item.accepted);
      protectedForModel.forEach((entry) => {
        const accepted = `CONSENSUS_LOCKED: ${entry.representative}`;
        if (!item.accepted.some((value) => matchesRepresentative(value, entry.representative) || text(value) === accepted)) {
          item.accepted.unshift(accepted);
        }
      });
    });

    merged.consensus_pollution = array(merged.consensus_pollution).filter((item) => {
      return !protectedTexts.some(
        (entry) => matchesRepresentative(item, entry.representative) || contradictsProtectedConsensus(item, entry.representative)
      );
    });
    merged.contested_pollution = array(merged.contested_pollution);
    merged.consensus_guard = {
      applied: true,
      protected_majorities: protectedTexts,
      reason: 'Self-cleansing merge cannot reject a protected majority consensus while external evidence is disabled.',
    };
    return merged.consensus_guard;
  }

  function applyConsensusGuard(session) {
    const pollutionGuard = protectPollutionWithConsensus(session);
    const selfCleansingGuard = protectSelfCleansingWithConsensus(session);
    if (!pollutionGuard && !selfCleansingGuard) return null;
    session.consensusGuard = {
      applied: true,
      pollutionGuard,
      selfCleansingGuard,
    };
    return session.consensusGuard;
  }

  global.DuoliModelConsensusVoter = {
    buildConsensus,
    applyConsensusGuard,
    similarity,
  };
})(window);
