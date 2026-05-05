(function attachReportPresenter(global) {
  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function array(value) {
    return Array.isArray(value) ? value : [];
  }

  function statusLabel(status) {
    const map = {
      strong: '强结论',
      weak: '弱结论',
      disputed: '存在分歧',
      insufficient: '信息不足',
    };
    return map[status] || status || '待核验';
  }

  function renderTags(items, emptyText) {
    const tags = array(items).filter(Boolean);
    if (!tags.length) return `<span class="intel-tag intel-tag--muted">${escapeHtml(emptyText || '暂无')}</span>`;
    return tags.map((item) => `<span class="intel-tag">${escapeHtml(item)}</span>`).join('');
  }

  function renderMetric(label, value, tone) {
    return `
      <div class="intel-metric intel-metric--${escapeHtml(tone || 'blue')}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value))}</strong>
      </div>
    `;
  }

  function renderFactList(title, items, emptyText) {
    const list = array(items);
    return `
      <section class="intel-block">
        <div class="intel-block__head">
          <span>${escapeHtml(title)}</span>
          <em>${list.length}</em>
        </div>
        <div class="intel-list">
          ${
            list.length
              ? list
                  .slice(0, 8)
                  .map(
                    (item) => `
                    <article class="intel-fact intel-fact--${escapeHtml(item.status || 'uncertain')}">
                      <div class="intel-fact__time">${escapeHtml(item.time || '最近/当前')}</div>
                      <div class="intel-fact__body">
                        <strong>${escapeHtml(item.event || item.claim || '')}</strong>
                        ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ''}
                        <div class="intel-fact__sources">${renderTags(item.sources, '未标注来源')}</div>
                      </div>
                    </article>
                  `
                  )
                  .join('')
              : `<div class="intel-empty">${escapeHtml(emptyText || '暂无结构化内容')}</div>`
          }
        </div>
      </section>
    `;
  }

  function renderDiffs(items) {
    const diffs = array(items);
    return `
      <section class="intel-block intel-block--wide">
        <div class="intel-block__head">
          <span>差异详情侦查台</span>
          <em>${diffs.length}</em>
        </div>
        <div class="intel-diffs">
          ${
            diffs.length
              ? diffs
                  .map(
                    (diff) => `
                    <details class="intel-diff intel-diff--${escapeHtml(diff.severity || 'medium')}">
                      <summary>
                        <span class="intel-diff__id">${escapeHtml(diff.id)}</span>
                        <strong>${escapeHtml(diff.title)}</strong>
                        <em>${escapeHtml(diff.type)} · ${escapeHtml(diff.severity)}</em>
                      </summary>
                      <p class="intel-diff__why">${escapeHtml(diff.why_it_matters)}</p>
                      <div class="intel-claim-grid">
                        ${array(diff.model_claims)
                          .map(
                            (claim) => `
                            <div class="intel-claim">
                              <b>${escapeHtml(claim.model)}</b>
                              <p>${escapeHtml(claim.claim)}</p>
                              ${claim.risk ? `<small>风险：${escapeHtml(claim.risk)}</small>` : ''}
                            </div>
                          `
                          )
                          .join('')}
                      </div>
                      ${
                        diff.followup_summary || diff.retained_judgment
                          ? `<div class="intel-cleaned"><b>追问后收敛</b><p>${escapeHtml(
                              diff.retained_judgment || diff.followup_summary
                            )}</p></div>`
                          : ''
                      }
                      ${array(diff.pollution_removed).length ? `<div class="intel-tags">${renderTags(diff.pollution_removed)}</div>` : ''}
                    </details>
                  `
                  )
                  .join('')
              : '<div class="intel-empty">暂无差异详情，可能是模型回答高度一致，或 JSON 未完整返回。</div>'
          }
        </div>
      </section>
    `;
  }

  function renderFunnel(funnel) {
    const steps = [
      ['原始 claim', funnel.raw_claims],
      ['交叉确认', funnel.cross_checked],
      ['追问保留', funnel.followup_retained],
      ['污染剔除', funnel.pollution_removed],
      ['最终证据', funnel.final_evidence],
    ];
    const max = Math.max(...steps.map(([, value]) => Number(value) || 0), 1);
    return `
      <section class="intel-block">
        <div class="intel-block__head"><span>去伪存真证据漏斗</span><em>Funnel</em></div>
        <div class="intel-funnel">
          ${steps
            .map(([label, value], index) => {
              const width = Math.max(18, Math.round(((Number(value) || 0) / max) * 100));
              return `
                <div class="intel-funnel__row">
                  <span>${escapeHtml(label)}</span>
                  <div><i style="width:${width}%"></i></div>
                  <b>${escapeHtml(String(value || 0))}</b>
                </div>
              `;
            })
            .join('')}
        </div>
      </section>
    `;
  }

  function renderModelProfiles(models) {
    const list = array(models);
    return `
      <section class="intel-block">
        <div class="intel-block__head"><span>模型证人画像</span><em>${list.length}</em></div>
        <div class="intel-models">
          ${
            list.length
              ? list
                  .map((model) => {
                    const scores = model.scores || {};
                    const avg = Math.round(
                      ['fact_fidelity', 'logic_consistency', 'information_density', 'pollution_control']
                        .map((key) => Number(scores[key]) || 0)
                        .reduce((a, b) => a + b, 0) / 4
                    );
                    return `
                      <article class="intel-model">
                        <div>
                          <strong>${escapeHtml(model.model)}</strong>
                          <span>${escapeHtml(model.witness_type)}</span>
                        </div>
                        <b>${avg}<small>/100</small></b>
                        <p>优势：${escapeHtml(array(model.strengths).slice(0, 2).join('；') || '待观察')}</p>
                        <p>风险：${escapeHtml(array(model.risks).slice(0, 2).join('；') || '待观察')}</p>
                      </article>
                    `;
                  })
                  .join('')
              : '<div class="intel-empty">暂无模型画像。</div>'
          }
        </div>
      </section>
    `;
  }

  function renderRawReplies(rawReplies) {
    const replies = array(rawReplies).filter((reply) => reply && String(reply.text || '').trim());
    return `
      <section class="intel-block intel-block--wide">
        <div class="intel-block__head"><span>原始回复附录</span><em>${replies.length}</em></div>
        <div class="intel-raw-grid">
          ${
            replies.length
              ? replies
                  .map(
                    (reply) => `
                    <article class="intel-raw">
                      <h4>${escapeHtml(reply.name || '未命名模型')}</h4>
                      <pre>${escapeHtml(reply.text || '')}</pre>
                    </article>
                  `
                  )
                  .join('')
              : '<div class="intel-empty">暂无原始回复。</div>'
          }
        </div>
      </section>
    `;
  }

  function renderReport(report, rawReplies) {
    const conclusion = report.executive_conclusion || {};
    const brief = report.question_brief || {};
    const factMap = report.fact_map || {};
    const disputeMap = report.dispute_map || {};
    const diagnosis = report.source_diagnosis || {};
    const funnel = report.evidence_funnel || {};
    return `
      <article class="intel-report">
        <section class="intel-hero">
          <div class="intel-hero__main">
            <p class="intel-eyebrow">Fact Black Box · 多模型事实黑匣子</p>
            <h3>${escapeHtml(conclusion.one_sentence)}</h3>
            <p>${escapeHtml(conclusion.core_tension)}</p>
            <div class="intel-tags">
              ${renderTags([statusLabel(conclusion.status), conclusion.confidence_label, `风险 ${conclusion.risk_level}`])}
            </div>
          </div>
          <div class="intel-gauge" style="--score:${Number(conclusion.confidence_score) || 0}">
            <div>
              <strong>${escapeHtml(String(conclusion.confidence_score || 0))}</strong>
              <span>可信度</span>
            </div>
          </div>
        </section>

        <section class="intel-brief">
          <div>
            <span>原始问题</span>
            <p>${escapeHtml(brief.original || report.meta.question_original || '未记录')}</p>
          </div>
          <div>
            <span>系统补全</span>
            <p>${escapeHtml(brief.refined || report.meta.question_refined || '未记录')}</p>
          </div>
          <div class="intel-tags">${renderTags(brief.constraints, '暂无约束')}</div>
        </section>

        <section class="intel-metrics">
          ${renderMetric('原始 claim', funnel.raw_claims || 0, 'blue')}
          ${renderMetric('交叉确认', funnel.cross_checked || 0, 'green')}
          ${renderMetric('差异点', array(disputeMap.items).length, 'amber')}
          ${renderMetric('污染剔除', funnel.pollution_removed || 0, 'red')}
        </section>

        <div class="intel-grid">
          ${renderFactList('事实时间轴', factMap.timeline, '暂无时间轴')}
          ${renderFactList('多模型确认事实', factMap.confirmed_facts, '暂无确认事实')}
          ${renderDiffs(disputeMap.items)}
          ${renderFunnel(funnel)}
          ${renderModelProfiles(report.model_profiles)}
          <section class="intel-block">
            <div class="intel-block__head"><span>源头分析与最终裁决</span><em>Verdict</em></div>
            <div class="intel-verdict">
              <b>最大不确定性</b>
              <p>${escapeHtml(conclusion.largest_uncertainty)}</p>
              <b>差异源头</b>
              <div class="intel-tags">${renderTags(diagnosis.root_causes, '暂无源头归因')}</div>
              <b>剔除污染后的判断</b>
              <p>${escapeHtml(diagnosis.retained_judgment || conclusion.one_sentence)}</p>
              <b>下一步</b>
              <div class="intel-tags">${renderTags(report.final_actions, '继续外部核验')}</div>
            </div>
          </section>
          ${renderRawReplies(rawReplies)}
        </div>
      </article>
    `;
  }

  global.DuoliReportPresenter = {
    renderReport,
  };
})(window);
