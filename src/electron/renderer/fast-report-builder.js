(function attachFastReportBuilder(global) {
  function safeText(value, fallback) {
    const text = String(value == null ? '' : value).trim();
    return text || fallback || '';
  }

  function clip(text, max) {
    const compressor = global.DuoliReportMaterialCompressor;
    if (compressor && typeof compressor.clip === 'function') return compressor.clip(text, max);
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    return value.length > max ? `${value.slice(0, max)}...` : value;
  }

  function okReplies(session) {
    return (session && Array.isArray(session.initialResults) ? session.initialResults : []).filter(
      (reply) => reply && reply.ok && reply.text
    );
  }

  function diffItems(session) {
    return (session && Array.isArray(session.diffs) ? session.diffs : []).slice(0, 5);
  }

  function retainedJudgments(session) {
    return (session && Array.isArray(session.diffAnalyses) ? session.diffAnalyses : [])
      .map((item) => item && item.merge && item.merge.cleaned_interpretation)
      .filter(Boolean)
      .slice(0, 5);
  }

  function rootCauses(session) {
    const pollution = session && session.pollution;
    const causes = pollution && Array.isArray(pollution.root_causes) ? pollution.root_causes : [];
    return causes.length ? causes.slice(0, 6).map((item) => safeText(item)).filter(Boolean) : ['待完整报告继续归因'];
  }

  function pollutionFactors(session) {
    const pollution = session && session.pollution;
    const removed = pollution && Array.isArray(pollution.pollution_removed) ? pollution.pollution_removed : [];
    return removed
      .slice(0, 8)
      .map((item) => safeText((item && (item.reason || item.content || item.type)) || item))
      .filter(Boolean);
  }

  function buildScenarioPayload(taskType, session) {
    const pending = '待专业完整版补齐/AI交叉复核';
    const commonClaim = {
      label: '已收集多模型材料',
      value: okReplies(session).length,
      note: '快版报告仅展示本地可确定结构，最终裁决以完整版为准。',
    };
    const payloads = {
      public_opinion: {
        signal_matrix: [commonClaim],
        verified_events: [],
        actor_map: okReplies(session).map((reply) => ({
          actor: reply.name,
          role: 'AI 模型证词',
          stance: pending,
        })),
        risk_triggers: diffItems(session).map((diff) => ({
          trigger: diff.topic || diff.id,
          level: diff.severity || 'medium',
          action: '等待完整版裁决',
        })),
      },
      fact_check: {
        claim_table: diffItems(session).map((diff) => ({
          claim: diff.topic || diff.id,
          status: '待核验',
          reason: diff.why_it_matters || pending,
        })),
        source_table: okReplies(session).map((reply) => ({ source: reply.name, status: 'AI 证词', note: pending })),
        verification_path: ['抽取差异', '追问原因', '剔除污染', '生成完整版裁决'],
      },
      consumer_purchase: {
        candidate_table: [],
        value_weights: [],
        persona_rankings: [],
        recommendations: { primary: { name: pending, reason: pending }, alternatives: [], not_recommended: [] },
        manual_verification_items: ['价格、配置、在售状态与渠道口径需在完整版中核验'],
      },
      technical_diagnosis: {
        symptom_table: diffItems(session).map((diff) => ({ symptom: diff.topic || diff.id, severity: diff.severity || 'medium' })),
        root_cause_hypotheses: rootCauses(session),
        fix_plan: ['等待完整版给出可执行修复路径'],
        verification_steps: ['复现问题', '验证根因', '回归测试'],
      },
      general_compare: {
        comparison_table: okReplies(session).map((reply) => ({ model: reply.name, status: '已收集', note: clip(reply.text, 180) })),
        decision_matrix: diffItems(session).map((diff) => ({ item: diff.topic || diff.id, weight: diff.severity || 'medium' })),
        risk_notes: pollutionFactors(session),
      },
    };
    const payload = payloads[taskType] || payloads.general_compare;
    const actionContracts = global.DuoliScenarioActionContracts;
    if (actionContracts && typeof actionContracts.ensureActionablePayload === 'function') {
      const report = {
        meta: { task_type: taskType },
        scenario_payload: payload,
        scenario_decision: {
          task_type: taskType,
          direct_verdict: pending,
          recommended_action: pending,
        },
      };
      actionContracts.ensureActionablePayload(report, {
        taskType,
        question: session && (session.originalQuestion || session.question),
      });
      return report.scenario_payload;
    }
    return payload;
  }

  function buildStructuredReport(session) {
    const taskRoute = (session && session.taskRoute) || {};
    const taskType = safeText((session && session.taskType) || taskRoute.task_type, 'general_compare');
    const replies = okReplies(session);
    const diffs = diffItems(session);
    const retained = retainedJudgments(session);
    const pollution = pollutionFactors(session);
    const now = new Date().toISOString();
    const direct = retained[0] || '已完成多模型材料收集、差异追问和污染剔除，专业完整版正在生成。';
    return {
      meta: {
        question_original: safeText(session && session.originalQuestion, session && session.question),
        question_refined: safeText(session && session.question),
        generated_at: now,
        models: replies.map((reply) => reply.name || reply.id).filter(Boolean),
        workflow_rounds: Math.max(1, Array.isArray(session && session.diffAnalyses) ? session.diffAnalyses.length : 1),
        task_type: taskType,
        task_label: safeText(taskRoute.label),
        workflow: safeText(taskRoute.recommended_workflow),
        template: safeText(taskRoute.recommended_template),
        report_status: 'draft',
        generation_phase: 'fast_local_draft',
      },
      executive_conclusion: {
        one_sentence: direct,
        status: 'draft',
        confidence_score: 40,
        confidence_label: '初稿，待完整版审计',
        core_tension: diffs[0] ? safeText(diffs[0].topic, '多模型口径仍需归并') : '多模型口径仍需归并',
        largest_uncertainty: '尚未完成最终报告模型生成与专业完整度审计',
        risk_level: 'medium',
      },
      scenario_decision: {
        task_type: taskType,
        task_label: safeText(taskRoute.label),
        decision_object: safeText(session && session.originalQuestion, session && session.question),
        direct_verdict: direct,
        recommended_action: '先查看初稿判断方向，等待完整版完成后再导出 PDF 或对外使用。',
        evidence_standard: '快版仅依据本次多模型回答、差异追问和污染剔除中已形成的结构化材料。',
        do_not_overread: ['不要把初稿当作最终裁决', '不要把 AI 证词伪装成外部来源'],
        decision_factors: diffs.map((diff, index) => ({
          label: safeText(diff.topic, `差异 ${index + 1}`),
          score: diff.severity === 'high' ? 80 : diff.severity === 'low' ? 45 : 60,
          note: safeText(diff.why_it_matters, '影响最终判断'),
        })),
        next_questions: ['等待完整报告生成', '如涉及事实/法律/价格/医疗/金融结论，继续做 AI 交叉复核'],
      },
      scenario_payload: buildScenarioPayload(taskType, session),
      question_brief: {
        original: safeText(session && session.originalQuestion, session && session.question),
        refined: safeText(session && session.question),
        constraints: ['快版不新增外部事实', '最终导出以前需等待完整版审计'],
        analysis_goals: ['先给出可读决策方向', '后台继续生成完整专业报告'],
      },
      user_issue_analysis: {
        direct_answer: direct,
        public_opinion_temperature: 50,
        temperature_label: '待完整版判断',
        dominant_sentiment: '待归并',
        sentiment_distribution: [],
        stance_distribution: [],
        audience_segments: [],
        key_findings: retained.length ? retained : ['已完成初步差异追问，完整版正在生成。'],
        narrative_summary: clip(direct, 360),
        risk_matrix: diffs.map((diff) => ({
          title: safeText(diff.topic, diff.id),
          impact: diff.severity === 'high' ? 80 : 60,
          probability: 55,
          mitigation: '等待完整版归因和核验路径',
        })),
        blindspots: ['当前版本按多 AI 交叉研判输出，未启用外部来源模块'],
      },
      fact_map: {
        timeline: [],
        confirmed_facts: [],
        uncertain_claims: replies.map((reply, index) => ({
          id: `A${index + 1}`,
          time: '待核验',
          event: clip(reply.text, 180),
          status: 'uncertain',
          sources: [reply.name || reply.id || 'AI'],
          note: 'AI 原始回答摘要，等待完整版裁决',
        })),
        polluted_claims: pollution.map((item, index) => ({
          id: `P${index + 1}`,
          time: '待核验',
          event: item,
          status: 'polluted',
          sources: ['污染剔除阶段'],
          note: '初步污染因素',
        })),
      },
      dispute_map: {
        summary: diffs.length ? `已识别 ${diffs.length} 个差异点，完整版将继续裁决。` : '暂未识别明确差异。',
        items: diffs.map((diff, index) => ({
          id: safeText(diff.id, `D${index + 1}`),
          title: safeText(diff.topic, `差异 ${index + 1}`),
          type: safeText(diff.type, '口径差异'),
          severity: safeText(diff.severity, 'medium'),
          why_it_matters: safeText(diff.why_it_matters, '影响最终判断'),
          model_claims: Array.isArray(diff.claims)
            ? diff.claims.slice(0, 5).map((claim) => ({
                model: safeText(claim.model, '模型'),
                claim: clip(claim.claim, 220),
                evidence_level: '中',
                risk: '待完整版复核',
              }))
            : [],
          followup_question: '',
          followup_summary: retained[index] || '',
          pollution_removed: pollution.slice(0, 3),
          retained_judgment: retained[index] || '',
        })),
      },
      evidence_funnel: {
        raw_claims: replies.length,
        cross_checked: Math.max(0, diffs.length),
        followup_retained: retained.length,
        pollution_removed: pollution.length,
        final_evidence: retained.length,
      },
      model_profiles: replies.map((reply) => ({
        model: reply.name || reply.id || 'AI',
        witness_type: '初稿证词',
        strengths: ['已提供可分析材料'],
        risks: ['尚未完成最终一致性审计'],
        scores: {
          fact_fidelity: 50,
          time_sensitivity: 50,
          logic_consistency: 50,
          information_density: 55,
          verifiability: 45,
          pollution_control: 50,
          followup_responsiveness: 55,
        },
      })),
      source_diagnosis: {
        root_causes: rootCauses(session),
        pollution_factors: pollution,
        retained_judgment: direct,
      },
      final_actions: ['等待专业完整版完成', '完整版完成后再导出 PDF', '对关键事实继续做 AI 交叉复核'],
    };
  }

  function buildFastReportText(session) {
    const report = buildStructuredReport(session);
    const conclusion = report.executive_conclusion.one_sentence;
    return [
      '战情驾驶舱',
      `初稿裁决：${conclusion}`,
      '说明：这是本地快速生成的决策摘要，用于先看方向；最终 PDF 需等待专业完整版审计完成。',
      '',
      '差异侦查台',
      ...report.dispute_map.items.slice(0, 5).map((item) => `- ${item.id} ${item.title}：${item.why_it_matters}`),
      '',
      '下一步',
      ...report.final_actions.map((item) => `- ${item}`),
      '',
      '```json',
      JSON.stringify(report, null, 2),
      '```',
    ].join('\n');
  }

  global.DuoliFastReportBuilder = {
    buildFastReportText,
    buildStructuredReport,
  };
})(window);
