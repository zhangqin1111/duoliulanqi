(function attachEvidenceBoundaryGuard(global) {
  const NEGATIVE_WITHOUT_EVIDENCE_RE =
    /(虚构|不存在|无任何可验证|无权威|无官方|未官宣|无实证支撑|共现幻觉|全部无效|全部不可采信|伪造信源|信源伪造)/;
  const OFFICIAL_SIGNAL_RE = /(外交部|新华社|白宫|中国政府网|官网|官方|发言人|公告|通报|权威|政府)/;

  function textOf(value) {
    return String(value == null ? '' : value).trim();
  }

  function evidenceConnected(evidencePack) {
    return !!(
      evidencePack &&
      Array.isArray(evidencePack.items) &&
      evidencePack.items.some((item) => item && (item.url || item.title || item.snippet || item.content))
    );
  }

  function hasNegativeNoEvidenceJudgment(value) {
    return NEGATIVE_WITHOUT_EVIDENCE_RE.test(textOf(value));
  }

  function hasOfficialSignal(value) {
    return OFFICIAL_SIGNAL_RE.test(textOf(value));
  }

  function sourceNames(source) {
    return textOf(source)
      .split(/[,&/、，和\s]+/)
      .map((name) => name.trim())
      .filter(Boolean);
  }

  function repliesByName(session) {
    const map = new Map();
    (Array.isArray(session && session.initialResults) ? session.initialResults : []).forEach((reply) => {
      const name = textOf(reply && (reply.name || reply.id));
      if (!name) return;
      map.set(name.toLowerCase(), textOf(reply && reply.text));
    });
    return map;
  }

  function itemTouchesOfficialClaim(item, replyMap) {
    const content = `${textOf(item && item.content)} ${textOf(item && item.reason)} ${textOf(item && item.type)}`;
    if (hasOfficialSignal(content)) return true;
    return sourceNames(item && item.source).some((name) => hasOfficialSignal(replyMap.get(name.toLowerCase()) || ''));
  }

  function collectOfficialLikeClaims(session) {
    const claims = [];
    (Array.isArray(session && session.initialResults) ? session.initialResults : []).forEach((reply) => {
      const text = textOf(reply && reply.text);
      if (!text || !hasOfficialSignal(text)) return;
      const sentence = text
        .split(/[\n。；;]/)
        .map((part) => part.trim())
        .find((part) => hasOfficialSignal(part) && part.length >= 12);
      if (!sentence) return;
      claims.push({
        model: textOf(reply.name || reply.id),
        claim: sentence.slice(0, 240),
      });
    });
    return claims;
  }

  function guardPollution(session, warnings) {
    const pollution = session && session.pollution;
    if (!pollution || typeof pollution !== 'object') return;
    const replyMap = repliesByName(session);
    const removed = Array.isArray(pollution.pollution_removed) ? pollution.pollution_removed : [];
    const keptRemoved = [];
    const guarded = [];

    removed.forEach((item) => {
      const judgment = `${textOf(item && item.content)} ${textOf(item && item.reason)}`;
      if (hasNegativeNoEvidenceJudgment(judgment) && itemTouchesOfficialClaim(item, replyMap)) {
        guarded.push(item);
        return;
      }
      keptRemoved.push(item);
    });

    if (!guarded.length) return;
    pollution.pollution_removed = keptRemoved;
    pollution.unresolved = Array.isArray(pollution.unresolved) ? pollution.unresolved : [];
    guarded.forEach((item) => {
      pollution.unresolved.push(
        `证据边界守门：外部可信来源未接入，不能仅凭AI自审把“${textOf(item.content).slice(
          0,
          120
        )}”裁定为虚构或不存在；应标注为待外部核验。`
      );
    });
    const claims = collectOfficialLikeClaims(session);
    if (claims.length >= 2) {
      pollution.kept_claims = Array.isArray(pollution.kept_claims) ? pollution.kept_claims : [];
      pollution.kept_claims.push(
        `AI交叉一致但待外部核验：${claims
          .slice(0, 3)
          .map((item) => `${item.model}: ${item.claim}`)
          .join('；')}`
      );
    }
    pollution.discarded_claims = (Array.isArray(pollution.discarded_claims) ? pollution.discarded_claims : []).filter(
      (claim) => !(hasNegativeNoEvidenceJudgment(claim) && hasOfficialSignal(claim))
    );
    warnings.push({
      stage: 'pollution',
      message: '外部证据层未接入，已阻止污染剔除阶段把官方口径型主张直接判为虚构/不存在。',
      guardedCount: guarded.length,
    });
  }

  function guardSelfCleansing(session, warnings) {
    const merged = session && session.selfCleansing && session.selfCleansing.merged;
    if (!merged || typeof merged !== 'object') return;
    let changed = false;

    if (Array.isArray(merged.consensus_pollution)) {
      const blocked = merged.consensus_pollution.filter(
        (item) => hasNegativeNoEvidenceJudgment(item) && hasOfficialSignal(item)
      );
      if (blocked.length) {
        merged.consensus_pollution = merged.consensus_pollution.filter(
          (item) => !(hasNegativeNoEvidenceJudgment(item) && hasOfficialSignal(item))
        );
        merged.contested_pollution = Array.isArray(merged.contested_pollution) ? merged.contested_pollution : [];
        blocked.forEach((item) => {
          merged.contested_pollution.push(`证据边界守门：${item}（外部证据未接入，只能待核验，不能直接撤回）`);
        });
        changed = true;
      }
    }

    if (Array.isArray(merged.per_model)) {
      merged.per_model.forEach((item) => {
        if (!Array.isArray(item.accepted)) return;
        const blocked = item.accepted.filter((entry) => hasNegativeNoEvidenceJudgment(entry) && hasOfficialSignal(entry));
        if (!blocked.length) return;
        item.accepted = item.accepted.filter((entry) => !(hasNegativeNoEvidenceJudgment(entry) && hasOfficialSignal(entry)));
        item.partial = Array.isArray(item.partial) ? item.partial : [];
        blocked.forEach((entry) => item.partial.push(`证据边界守门：${entry}（需要外部核验后才能撤回）`));
        if (hasNegativeNoEvidenceJudgment(item.cleaned_conclusion) && hasOfficialSignal(item.cleaned_conclusion)) {
          item.cleaned_conclusion = '证据边界守门：外部可信来源未接入，不能把该官方口径型主张直接判为虚构；应保留为待外部核验的高优先级主张。';
        }
        changed = true;
      });
    }

    if (changed) {
      merged.self_cleansed_summary = `${textOf(
        merged.self_cleansed_summary
      )} 证据边界修正：未接入外部可信来源时，自审结果不得把官方口径型主张直接裁为虚构，只能降为待核验。`.trim();
      warnings.push({
        stage: 'self_cleansing',
        message: '已阻止模型自审把未外部核验的官方口径型主张直接撤回。',
      });
    }
  }

  function guardStructuredReport(session, warnings) {
    const report = session && session.structuredReport;
    if (!report || typeof report !== 'object') return;
    const conclusion = report.executive_conclusion || {};
    const decision = report.scenario_decision || {};
    const combined = `${textOf(conclusion.one_sentence)} ${textOf(decision.direct_verdict)} ${textOf(
      decision.recommended_action
    )}`;
    if (!(hasNegativeNoEvidenceJudgment(combined) && hasOfficialSignal(combined))) return;

    const claims = collectOfficialLikeClaims(session);
    const claimText = claims.length
      ? claims
          .slice(0, 3)
          .map((item) => `${item.model}: ${item.claim}`)
          .join('；')
      : '多模型材料中存在官方口径型主张';
    const guardedVerdict = `证据边界修正：${claimText}。由于外部可信来源未接入，当前不能将该主张裁定为虚构或不存在；应标注为待外部核验的高优先级事实线索。`;

    report.executive_conclusion = {
      ...conclusion,
      one_sentence: guardedVerdict,
      status: 'disputed',
      confidence_label: 'AI交叉研判，待外部核验',
      confidence_score: Math.min(Number(conclusion.confidence_score) || 65, 68),
      largest_uncertainty: '外部可信来源未接入，不能完成正反证裁决。',
    };
    report.scenario_decision = {
      ...decision,
      direct_verdict: guardedVerdict,
      recommended_action: '优先核验官方发布源、权威媒体与原始公告；核验完成前不要输出“虚构/不存在”的反向强裁决。',
      do_not_overread: [
        ...(Array.isArray(decision.do_not_overread) ? decision.do_not_overread : []),
        '外部证据未接入时，不得把AI自审结果写成官方不存在或虚构信源。',
      ],
    };
    report.source_diagnosis = {
      ...(report.source_diagnosis || {}),
      retained_judgment: guardedVerdict,
    };
    warnings.push({
      stage: 'structured_report',
      message: '已阻止最终结构化报告在无外部证据时输出“官方不存在/虚构信源”的反向强裁决。',
    });
  }

  function apply(session) {
    if (!session || evidenceConnected(session.evidencePack)) return session;
    const warnings = [];
    guardPollution(session, warnings);
    guardSelfCleansing(session, warnings);
    guardStructuredReport(session, warnings);
    if (warnings.length) {
      session.evidenceBoundaryGuard = {
        applied: true,
        reason: 'external_evidence_not_connected',
        warnings,
        checkedAt: new Date().toISOString(),
      };
    }
    return session;
  }

  global.DuoliEvidenceBoundaryGuard = {
    apply,
    evidenceConnected,
  };
})(window);
