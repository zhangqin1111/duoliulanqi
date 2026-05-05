'use strict';

const {
  renderAxisMap,
  renderBarStrips,
  renderCompressionChart,
  renderOpinionGauge,
  renderRiskMatrix,
} = require('./fact-charts');

function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function text(value, fallback) {
  const out = String(value == null ? '' : value).trim();
  return out || fallback || '';
}

function score(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function clipText(value, max) {
  const out = text(value);
  if (!out || !max || out.length <= max) return out;
  return `${out.slice(0, max).trim()}…`;
}

function splitVerdict(value) {
  const source = text(value, '暂未形成明确裁决');
  const parts = source
    .replace(/[。；;]+/g, '。')
    .split('。')
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    headline: clipText(parts[0] || source, 18),
    detail: clipText(parts.slice(1).join('。') || source, 58),
  };
}

function keyFactItems(items) {
  return array(items)
    .slice()
    .sort((a, b) => {
      const statusScore = { confirmed: 0, disputed: 1, uncertain: 2, polluted: 3 };
      return (statusScore[a && a.status] ?? 2) - (statusScore[b && b.status] ?? 2);
    })
    .slice(0, 4);
}

function time(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toLocaleString('zh-CN', { hour12: false });
  return date.toLocaleString('zh-CN', { hour12: false });
}

function statusLabel(status) {
  return (
    {
      strong: '强结论',
      weak: '弱结论',
      disputed: '存在分歧',
      insufficient: '信息不足',
    }[status] || status || '待核验'
  );
}

function renderTags(items, empty) {
  const list = array(items).map((item) => text(item)).filter(Boolean);
  if (!list.length) return `<span class="tag tag--muted">${escapeHtml(empty || '暂无')}</span>`;
  return list.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join('');
}

function renderFactRows(title, items, options = {}) {
  const list = array(items);
  const important = options.weighted ? keyFactItems(list) : [];
  return `
    <section class="card">
      <header class="card-head">
        <span>${escapeHtml(title)}</span>
        <b>${list.length}</b>
      </header>
      ${
        important.length
          ? `<div class="weighted-timeline">${important
              .map(
                (item, idx) => `
                  <article class="${idx === 0 ? 'is-core' : ''}">
                    <b>${idx === 0 ? '核心节点' : '次级节点'}</b>
                    <strong>${escapeHtml(text(item.time, '最近/当前'))}</strong>
                    <span>${escapeHtml(clipText(item.event || item.claim || item.fact, 34))}</span>
                  </article>
                `
              )
              .join('')}</div>`
          : ''
      }
      <div class="fact-list">
        ${
          list.length
            ? list
                .slice(0, 10)
                .map(
                  (item, idx) => `
                    <article class="fact fact--${escapeHtml(text(item.status, 'uncertain'))}">
                      <div class="fact-num">${String(idx + 1).padStart(2, '0')}</div>
                      <div>
                        <div class="fact-time">${escapeHtml(text(item.time, '最近/当前'))}</div>
                        <h4>${escapeHtml(text(item.event || item.claim || item.fact, '待核验事实点'))}</h4>
                        ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ''}
                        <div class="tags">${renderTags(item.sources || item.models, '未标注来源')}</div>
                      </div>
                    </article>
                  `
                )
                .join('')
            : '<p class="empty">暂无结构化事实。</p>'
        }
      </div>
    </section>
  `;
}

function renderFunnel(funnel) {
  const rows = [
    ['原始 claim', funnel && funnel.raw_claims],
    ['交叉确认', funnel && funnel.cross_checked],
    ['追问保留', funnel && funnel.followup_retained],
    ['污染剔除', funnel && funnel.pollution_removed],
    ['最终证据', funnel && funnel.final_evidence],
  ];
  const max = Math.max(...rows.map(([, value]) => Number(value) || 0), 1);
  return `
    <section class="card card--wide funnel-hero-card">
      <header class="card-head"><span>去伪存真证据漏斗</span><b>Funnel</b></header>
      ${renderCompressionChart(funnel)}
      <div class="funnel">
        ${rows
          .map(([label, value]) => {
            const width = Math.max(14, Math.round(((Number(value) || 0) / max) * 100));
            return `
              <div class="funnel-row">
                <span>${escapeHtml(label)}</span>
                <i><em style="width:${width}%"></em></i>
                <b>${escapeHtml(String(value || 0))}</b>
              </div>
            `;
          })
          .join('')}
      </div>
    </section>
  `;
}

function renderDiffs(disputeMap) {
  const items = array(disputeMap && disputeMap.items);
  return `
    <section class="card card--wide page-break">
      <header class="card-head"><span>差异详情侦查台</span><b>${items.length}</b></header>
      <p class="summary-line">${escapeHtml(text(disputeMap && disputeMap.summary, '暂未形成争议总览'))}</p>
      <div class="diff-list">
        ${
          items.length
            ? items
                .map(
                  (diff) => `
                    <article class="diff diff--${escapeHtml(text(diff.severity, 'medium'))}">
                      <div class="diff-title">
                        <span>${escapeHtml(text(diff.id))}</span>
                        <h4>问题：${escapeHtml(text(diff.title || diff.topic, '未命名差异点'))}</h4>
                        <b>${escapeHtml(text(diff.type, '差异'))} · ${escapeHtml(text(diff.severity, 'medium'))}</b>
                      </div>
                      <div class="diff-verdict-lines">
                        <p><strong>裁决：</strong>${escapeHtml(text(diff.retained_judgment || diff.followup_summary, '仅保留可交叉验证部分'))}</p>
                        <p><strong>原因：</strong>${escapeHtml(text(diff.why_it_matters, '信源不满足交叉验证，影响最终可信判断'))}</p>
                      </div>
                      <div class="claim-grid">
                        ${array(diff.model_claims || diff.claims)
                          .map(
                            (claim) => `
                              <div class="claim">
                                <strong>${escapeHtml(text(claim && claim.model, '未知模型'))}</strong>
                                <p>${escapeHtml(text(claim && claim.claim))}</p>
                              </div>
                            `
                          )
                          .join('')}
                      </div>
                    </article>
                  `
                )
                .join('')
            : '<p class="empty">暂无差异详情。</p>'
        }
      </div>
    </section>
  `;
}

function renderModels(models) {
  const list = array(models);
  return `
    <section class="card">
      <header class="card-head"><span>模型证人画像</span><b>${list.length}</b></header>
      <div class="model-list">
        ${
          list.length
            ? list
                .map((model) => {
                  const s = model.scores || {};
                  const avg = Math.round(
                    ['fact_fidelity', 'logic_consistency', 'information_density', 'pollution_control']
                      .map((key) => Number(s[key]) || 0)
                      .reduce((a, b) => a + b, 0) / 4
                  );
                  return `
                    <article class="model">
                      <div>
                        <h4>${escapeHtml(text(model.model, '未知模型'))}</h4>
                        <span>${escapeHtml(text(model.witness_type, '待观察证人'))}</span>
                      </div>
                      <b>${avg}<small>/100</small></b>
                      <p>优势：${escapeHtml(array(model.strengths).slice(0, 2).join('；') || '待观察')}</p>
                      <p>风险：${escapeHtml(array(model.risks).slice(0, 2).join('；') || '待观察')}</p>
                    </article>
                  `;
                })
                .join('')
            : '<p class="empty">暂无模型画像。</p>'
        }
      </div>
    </section>
  `;
}

function renderUserIssueAnalysis(analysis) {
  const data = analysis || {};
  const findings = array(data.key_findings).filter(Boolean);
  const blindspots = array(data.blindspots).filter(Boolean);
  return `
    <section class="issue-analysis card--wide">
      <div class="issue-hero">
        <div>
          <span class="issue-kicker">User Question Verdict</span>
          <h2>用户问题结果研判</h2>
          <strong class="issue-answer-line">${escapeHtml(clipText(text(data.direct_answer, '结论：当前材料不足以形成强结论。'), 30))}</strong>
          <p>${escapeHtml(text(data.direct_answer, '当前材料不足以形成强结论，需要继续等待多模型证据链收敛。'))}</p>
        </div>
        <div class="issue-gauge">
          ${renderOpinionGauge(data.public_opinion_temperature, data.temperature_label || '舆情温度')}
        </div>
      </div>

      <div class="issue-grid">
        <article class="issue-panel issue-panel--dark">
          <span>主导判断</span>
          <strong>${escapeHtml(text(data.dominant_sentiment, '未形成稳定主导情绪'))}</strong>
          <p>${escapeHtml(text(data.narrative_summary, '模型回答尚未给出足够稳定的舆论叙事链。'))}</p>
        </article>
        <article class="issue-panel">
          <span>关键发现</span>
          <ul>${(findings.length ? findings : ['存在讨论热度，但证据强度不足以直接写成强结论']).slice(0, 5).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </article>
        <article class="issue-panel">
          <span>盲区提示</span>
          <ul>${(blindspots.length ? blindspots : ['缺少外部一手来源与平台热度数据']).slice(0, 5).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </article>
      </div>

      <div class="issue-decision-grid">
        <article>
          <span>如何对外表述</span>
          <p>建议采用“近期讨论升温、负面与调侃更可见、但尚不能定性为确定性舆情危机”的口径，避免把模型推测包装成事实判断。</p>
        </article>
        <article>
          <span>为什么不能下强结论</span>
          <p>当前证据主要来自模型文本互证，缺少热搜曲线、原始传播帖、平台声量占比和商业影响指标，强因果判断会放大误判风险。</p>
        </article>
        <article>
          <span>可保留判断</span>
          <p>热度存在、争议可见、负面信息能见度偏高；但“是否由单一事件引爆”“是否造成实质声誉损伤”仍需外部证据闭环。</p>
        </article>
        <article>
          <span>核验优先级</span>
          <p>优先核验高传播原帖、平台热榜/搜索趋势、媒体报道源头、正负声量比例，以及粉丝圈层与路人盘是否出现明显分化。</p>
        </article>
      </div>

      <div class="issue-chart-board">
        <div class="issue-chart-title">
          <span>Visual Intelligence Board</span>
          <h3>舆论结构可视化看板</h3>
          <p><strong>结论：${escapeHtml(text(data.dominant_sentiment, '未形成情绪聚集'))}</strong>。图表只用于辅助理解，不替代最终裁决。</p>
        </div>
        <div class="chart-grid">
        <article class="chart-card">
          <header><span>Sentiment Structure</span><b>情绪结构</b></header>
          ${renderBarStrips(data.sentiment_distribution, { palette: ['#42c67a', '#356bff', '#ffad33', '#ff5d5d', '#8b5cf6'] })}
        </article>
        <article class="chart-card">
          <header><span>Stance Split</span><b>阵营分布</b></header>
          ${renderBarStrips(data.stance_distribution, { palette: ['#356bff', '#42c67a', '#ffad33', '#ff5d5d', '#64748b'] })}
        </article>
        <article class="chart-card">
          <header><span>Audience Map</span><b>群体坐标</b></header>
          ${renderAxisMap(data.audience_segments)}
        </article>
        <article class="chart-card">
          <header><span>Risk Matrix</span><b>风险矩阵</b></header>
          ${renderRiskMatrix(data.risk_matrix)}
        </article>
        </div>
      </div>
    </section>
  `;
}

function renderRawReplies(rawReplies) {
  const list = array(rawReplies).filter((reply) => text(reply && reply.text));
  if (!list.length) return '';
  return `
    <section class="card card--wide audit-appendix page-break">
      <header class="card-head"><span>审计附录 · 模型证词摘要</span><b>${list.length}</b></header>
      <p class="summary-line">正文只保留可用于裁决的证词摘要；完整原文不进入客户报告正文，避免附录噪音稀释最终判断。</p>
      <div class="raw-list raw-list--audit">
        ${list
          .map(
            (reply) => `
              <article class="raw">
                <h4>${escapeHtml(text(reply.name, '未知模型'))}</h4>
                <p>${escapeHtml(clipText(reply.text, 260))}</p>
              </article>
            `
          )
          .join('')}
      </div>
    </section>
  `;
}

function renderAuditAppendix(rawReplies, models) {
  const replies = array(rawReplies).filter((reply) => text(reply && reply.text));
  const profiles = array(models);
  const names = new Set([...replies.map((reply) => reply.name), ...profiles.map((model) => model.model)].filter(Boolean));
  const list = Array.from(names);
  if (!list.length) return '';
  return `
    <section class="card card--wide audit-appendix page-break">
      <header class="card-head"><span>审计附录 · 模型证词摘要</span><b>${list.length}</b></header>
      <p class="summary-line">正文不展开模型原文，只保留每个模型的证词倾向、可信特征和主要风险，供复核使用。</p>
      <div class="raw-list raw-list--audit">
        ${list
          .map((name) => {
            const profile = profiles.find((item) => item.model === name) || {};
            const reply = replies.find((item) => item.name === name) || {};
            const s = profile.scores || {};
            const avg = Math.round(
              ['fact_fidelity', 'logic_consistency', 'information_density', 'pollution_control']
                .map((key) => Number(s[key]) || 0)
                .reduce((a, b) => a + b, 0) / 4
            );
            const traits = [
              text(profile.witness_type, '证词摘要'),
              array(profile.strengths).slice(0, 1).join(''),
              array(profile.risks).slice(0, 1).join(''),
            ].filter(Boolean);
            return `
              <article class="raw raw--audit">
                <div>
                  <h4>${escapeHtml(text(name, '未知模型'))}</h4>
                  <b>${avg || '--'}<small>/100</small></b>
                </div>
                <p>${escapeHtml(traits.join('；') || clipText(reply.text, 160))}</p>
              </article>
            `;
          })
          .join('')}
      </div>
    </section>
  `;
}

function buildReportHtml(payload, report) {
  const data = report || {};
  const meta = data.meta || {};
  const conclusion = data.executive_conclusion || {};
  const userIssue = data.user_issue_analysis || {};
  const brief = data.question_brief || {};
  const factMap = data.fact_map || {};
  const disputeMap = data.dispute_map || {};
  const diagnosis = data.source_diagnosis || {};
  const funnel = data.evidence_funnel || {};
  const rawReplies = array(payload && payload.rawReplies);
  const confidence = score(conclusion.confidence_score);
  const modelNames = array(meta.models).length
    ? array(meta.models)
    : rawReplies.map((r) => r.name).filter(Boolean);
  const originalQuestion = text(meta.question_original || (payload && payload.question), '未记录');
  const refinedQuestion = text(brief.refined || meta.question_refined, '未记录');
  const decision = text(conclusion.one_sentence || diagnosis.retained_judgment, '暂未形成明确裁决');
  const decisionParts = splitVerdict(decision);
  const riskLabel = text(conclusion.risk_level, 'medium').toUpperCase();
  const actionLabel = array(data.final_actions)[0] || '继续核验';

  return `<!doctype html>
  <html lang="zh-CN">
    <head>
      <meta charset="UTF-8" />
      <title>滤镜·多源大模型内容对比分析</title>
      <style>${css()}</style>
    </head>
    <body>
      <section class="cover">
        <div class="cover-grid"></div>
        <div class="cover-orb cover-orb--blue"></div>
        <div class="cover-orb cover-orb--gold"></div>
        <div class="cover-inner">
          <div class="cover-top">
            <p class="eyebrow">FACT BLACK BOX · FILTER WORKBENCH</p>
            <span>CONFIDENTIAL ANALYTIC BRIEF</span>
          </div>
          <div class="cover-main">
            <div>
              <h1>滤镜·多源大模型<br/>内容对比分析</h1>
              <p class="subtitle">多模型交叉验证 · 差异追问 · 污染剔除 · 证据链收敛</p>
            </div>
            <div class="cover-score">
              <strong>${confidence}</strong>
              <span>Confidence</span>
            </div>
          </div>
          <div class="cover-question">
            <span>用户问题 / Intelligence Target</span>
            <strong>${escapeHtml(originalQuestion)}</strong>
          </div>
          <div class="cover-decision">
            <span>核心结论</span>
            <strong>${escapeHtml(decisionParts.headline)}</strong>
            <p>${escapeHtml(decisionParts.detail)}</p>
            <div>
              <b>风险等级：${escapeHtml(riskLabel)}</b>
              <b>建议：${escapeHtml(clipText(actionLabel, 18))}</b>
            </div>
          </div>
          <div class="cover-pipeline">
            <span>补全</span><i></i><span>分发</span><i></i><span>抽差异</span><i></i><span>追问</span><i></i><span>剔污染</span><i></i><span>裁决</span>
          </div>
          <div class="cover-foot">
            <span>${escapeHtml(modelNames.join(' / ') || '多模型')}</span>
            <span>${escapeHtml(time(meta.generated_at || (payload && payload.generatedAt)))}</span>
          </div>
        </div>
      </section>

      <main class="report">
        <section class="executive-page">
          <section class="hero">
            <div>
              <p class="eyebrow">EXECUTIVE WAR ROOM</p>
              <div class="war-room-verdict">一句话裁决</div>
              <h2>${escapeHtml(text(conclusion.one_sentence, '暂未形成明确裁决'))}</h2>
              <p>${escapeHtml(text(conclusion.core_tension, '多模型回答尚未形成清晰核心矛盾'))}</p>
              <div class="tags">${renderTags([statusLabel(conclusion.status), conclusion.confidence_label, `风险 ${conclusion.risk_level}`])}</div>
            </div>
            <div class="gauge" style="--score:${confidence}">
              <strong>${confidence}</strong>
              <span>可信度</span>
            </div>
          </section>

          <section class="brief">
            <div><span>原始问题</span><p>${escapeHtml(clipText(brief.original || originalQuestion, 120))}</p></div>
            <div><span>系统补全</span><p>${escapeHtml(clipText(refinedQuestion, 260))}</p></div>
            <div><span>分析约束</span><div class="tags">${renderTags(array(brief.constraints).slice(0, 5), '暂无')}</div></div>
          </section>

          <section class="metrics">
            <div><span>原始 claim</span><b>${escapeHtml(String(funnel.raw_claims || 0))}</b></div>
            <div><span>交叉确认</span><b>${escapeHtml(String(funnel.cross_checked || 0))}</b></div>
            <div><span>差异点</span><b>${array(disputeMap.items).length}</b></div>
            <div><span>污染剔除</span><b>${escapeHtml(String(funnel.pollution_removed || 0))}</b></div>
          </section>

          <section class="executive-compression">
            <div>
              <span>证据压缩</span>
              <strong>${escapeHtml(String(funnel.raw_claims || 0))} → ${escapeHtml(String(funnel.final_evidence || 0))}</strong>
              <p>所有细节性主张必须经过交叉验证、追问保留和污染剔除，不能直接进入裁决。</p>
            </div>
            ${renderCompressionChart(funnel)}
          </section>

          <section class="briefing-map">
            <div><b>01</b><span>事实坐标</span><p>抽取公开叙事、模型 claim 与可核验证据点。</p></div>
            <div><b>02</b><span>差异追问</span><p>围绕口径、时间、因果与污染嫌疑二次询问模型。</p></div>
            <div><b>03</b><span>裁决输出</span><p>保留可交叉确认部分，降权幻觉和模板化叙事。</p></div>
          </section>
        </section>

        ${renderUserIssueAnalysis(userIssue)}

        <div class="grid">
          <section class="section-title card--wide">
            <span>Evidence Matrix</span>
            <h2>证据矩阵与模型证词</h2>
            <p>把模型回答拆成可核验事实、交叉确认、差异争议和污染剔除四组资产，避免直接把“看起来像答案”的文本当成结论。</p>
          </section>
          ${renderFactRows('事实时间轴', factMap.timeline, { weighted: true })}
          ${renderFactRows('多模型确认事实', factMap.confirmed_facts)}
          ${renderFunnel(funnel)}
          ${renderDiffs(disputeMap)}
          <section class="card card--wide">
            <header class="card-head"><span>源头分析与最终裁决</span><b>Verdict</b></header>
            <div class="verdict">
              <div class="final-verdict-lockup">
                <span>最终结论</span>
                <strong>${escapeHtml(decisionParts.headline)}</strong>
                <p>${escapeHtml(decisionParts.detail || text(conclusion.largest_uncertainty, '缺少外部一手来源核验'))}</p>
              </div>
              <div class="final-verdict-grid">
                <article><b>其余主张</b><span>不可直接采信</span></article>
                <article><b>差异源头</b><span>${escapeHtml(clipText(array(diagnosis.root_causes).join(' / '), 34) || '待核验')}</span></article>
                <article><b>下一步行动</b><span>${escapeHtml(clipText(actionLabel, 34))}</span></article>
              </div>
            </div>
          </section>
          ${renderAuditAppendix(rawReplies, data.model_profiles)}
        </div>
      </main>
    </body>
  </html>`;
}

function css() {
  return `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif;
      color: #172033;
      background: #f3efe8;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .cover {
      position: relative;
      width: 210mm;
      height: 297mm;
      overflow: hidden;
      page-break-after: always;
      background:
        linear-gradient(120deg, rgba(9, 17, 34, .94), rgba(24, 39, 74, .86) 48%, rgba(247, 239, 224, .98) 49%),
        radial-gradient(circle at 22% 20%, rgba(62, 114, 255, .45), transparent 36%),
        radial-gradient(circle at 85% 18%, rgba(255, 176, 70, .34), transparent 34%);
    }
    .cover-grid, .hero::after {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.055) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.055) 1px, transparent 1px);
      background-size: 28px 28px;
    }
    .cover-orb {
      position: absolute;
      border-radius: 999px;
      filter: blur(2px);
      opacity: .86;
    }
    .cover-orb--blue {
      width: 88mm;
      height: 88mm;
      left: -24mm;
      top: 178mm;
      background: radial-gradient(circle, rgba(53,107,255,.38), transparent 68%);
    }
    .cover-orb--gold {
      width: 72mm;
      height: 72mm;
      right: 12mm;
      top: 28mm;
      background: radial-gradient(circle, rgba(255,173,51,.34), transparent 68%);
    }
    .cover-inner {
      position: relative;
      z-index: 1;
      height: 100%;
      padding: 28mm 24mm;
      display: flex;
      flex-direction: column;
    }
    .cover-top,
    .cover-main,
    .cover-foot,
    .cover-pipeline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8mm;
    }
    .eyebrow {
      margin: 0 0 8mm;
      color: #356bff;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    .cover-top .eyebrow {
      margin: 0;
      color: #8fb0ff;
    }
    .cover-top span {
      color: rgba(255,255,255,.62);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .18em;
    }
    .cover-main {
      flex: 1;
      align-items: center;
    }
    .cover h1 {
      margin: 0;
      max-width: 124mm;
      color: #fff;
      font-size: 58px;
      line-height: 1.06;
      letter-spacing: -1.6px;
      text-shadow: 0 8mm 18mm rgba(0,0,0,.22);
    }
    .subtitle {
      margin: 8mm 0 0;
      max-width: 116mm;
      color: rgba(255,255,255,.72);
      font-size: 16px;
      line-height: 1.8;
    }
    .cover-score {
      width: 38mm;
      height: 38mm;
      border-radius: 999px;
      display: grid;
      place-items: center;
      align-content: center;
      background: rgba(255,255,255,.9);
      box-shadow: 0 12mm 30mm rgba(16,28,58,.24);
    }
    .cover-score strong {
      font-size: 31px;
      line-height: 1;
      color: #356bff;
    }
    .cover-score span {
      margin-top: 1mm;
      color: #6b625a;
      font-size: 10px;
      letter-spacing: .1em;
      text-transform: uppercase;
    }
    .cover-question {
      padding: 8mm;
      border-radius: 18px;
      background: rgba(255,255,255,0.9);
      border: 1px solid rgba(255,255,255,0.48);
      box-shadow: 0 12mm 28mm rgba(16,28,58,.14);
    }
    .cover-decision {
      margin-top: 5mm;
      width: 92mm;
      align-self: flex-end;
      padding: 6mm;
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(9,17,34,.94), rgba(24,39,74,.92));
      color: #fff;
      border: 1px solid rgba(255,255,255,.16);
      box-shadow: 0 14mm 34mm rgba(16,28,58,.24);
    }
    .cover-decision span {
      display: block;
      color: #8fb0ff;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .cover-decision strong {
      display: block;
      margin: 3mm 0 2mm;
      font-size: 28px;
      line-height: 1.12;
    }
    .cover-decision p {
      margin: 0 0 4mm;
      color: rgba(255,255,255,.68);
      font-size: 12px;
      line-height: 1.65;
    }
    .cover-decision div {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3mm;
    }
    .cover-decision b {
      padding: 2.5mm;
      border-radius: 10px;
      color: #fff;
      background: rgba(53,107,255,.18);
      font-size: 11px;
      line-height: 1.4;
    }
    .cover-question span, .brief span, .metrics span {
      display: block;
      margin-bottom: 2mm;
      color: #7a746d;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: .08em;
    }
    .cover-question strong {
      font-size: 18px;
      line-height: 1.7;
    }
    .cover-pipeline {
      justify-content: flex-start;
      margin-top: 8mm;
      color: rgba(255,255,255,.78);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: .08em;
    }
    .cover-pipeline i {
      width: 12mm;
      height: 1px;
      background: linear-gradient(90deg, rgba(255,255,255,.18), rgba(255,255,255,.72));
    }
    .cover-foot {
      margin-top: 8mm;
      color: rgba(255,255,255,.68);
      font-size: 11px;
      letter-spacing: .12em;
      text-transform: uppercase;
    }
    .report {
      min-height: 297mm;
      padding: 12mm 14mm 16mm;
      background:
        radial-gradient(circle at 4% 0%, rgba(53,107,255,.1), transparent 26%),
        linear-gradient(180deg, #f7f2ea, #f1ece4);
    }
    .executive-page {
      display: flex;
      flex-direction: column;
      gap: 5mm;
      margin-bottom: 6mm;
      page-break-after: auto;
    }
    .hero {
      position: relative;
      display: grid;
      grid-template-columns: 1fr 38mm;
      gap: 9mm;
      padding: 9mm;
      border-radius: 18px;
      overflow: hidden;
      background:
        radial-gradient(circle at top left, rgba(53,107,255,.14), transparent 34%),
        linear-gradient(135deg, #fff, #f7f3ee);
      box-shadow: 0 10mm 22mm rgba(90, 76, 63, .08);
      page-break-inside: avoid;
    }
    .hero > * { position: relative; z-index: 1; }
    .hero h2 {
      margin: 0;
      font-size: 24px;
      line-height: 1.28;
      letter-spacing: -.5px;
    }
    .war-room-verdict {
      display: inline-flex;
      margin-bottom: 3mm;
      padding: 1.5mm 3mm;
      border-radius: 999px;
      color: #fff;
      background: #172033;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 1.2px;
    }
    .hero p {
      margin: 4mm 0 0;
      color: #665c52;
      font-size: 13.5px;
      line-height: 1.8;
    }
    .gauge {
      width: 36mm;
      height: 36mm;
      align-self: center;
      border-radius: 50%;
      display: grid;
      place-items: center;
      align-content: center;
      background:
        radial-gradient(circle at center, #fff 0 58%, transparent 59%),
        conic-gradient(#356bff calc(var(--score) * 1%), rgba(32,33,36,.08) 0);
      box-shadow: 0 7mm 14mm rgba(53,107,255,.15);
    }
    .gauge strong { font-size: 28px; line-height: 1; }
    .gauge span { color: #7a746d; font-size: 11px; }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 2mm;
      margin-top: 3mm;
    }
    .tag {
      display: inline-flex;
      min-height: 7mm;
      align-items: center;
      padding: 0 3mm;
      border-radius: 999px;
      background: rgba(53,107,255,.08);
      color: #2457d3;
      font-size: 11px;
      font-weight: 800;
    }
    .tag--muted { color: #7a746d; background: rgba(32,33,36,.06); }
    .brief, .metrics, .grid {
      display: grid;
      gap: 5mm;
    }
    .brief {
      grid-template-columns: .9fr 1.4fr 1fr;
    }
    .brief > div, .metrics > div, .card {
      padding: 4.5mm;
      border-radius: 14px;
      background: rgba(255,255,255,.86);
      border: 1px solid rgba(32,33,36,.07);
      box-shadow: 0 4mm 12mm rgba(90,76,63,.05);
    }
    .brief p { margin: 0; color: #413a34; font-size: 11.5px; line-height: 1.65; }
    .metrics {
      grid-template-columns: repeat(4, 1fr);
    }
    .metrics b {
      font-size: 28px;
      color: #356bff;
      line-height: 1;
    }
    .executive-compression {
      display: grid;
      grid-template-columns: 42mm 1fr;
      gap: 5mm;
      padding: 5mm;
      border-radius: 16px;
      background: linear-gradient(135deg, #172033, #2e4168 72%, #356bff);
      color: #fff;
      box-shadow: 0 8mm 20mm rgba(24,39,74,.12);
      page-break-inside: avoid;
    }
    .executive-compression span {
      display: block;
      color: #9db9ff;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .executive-compression strong {
      display: block;
      margin: 3mm 0 2mm;
      font-size: 32px;
      line-height: 1;
    }
    .executive-compression p {
      margin: 0;
      color: rgba(255,255,255,.72);
      font-size: 11.5px;
      line-height: 1.7;
    }
    .briefing-map {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 5mm;
    }
    .briefing-map div {
      min-height: 34mm;
      padding: 5mm;
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(22,31,52,.94), rgba(41,55,88,.92));
      color: #fff;
      box-shadow: 0 8mm 20mm rgba(24,39,74,.12);
    }
    .briefing-map b {
      display: block;
      color: #8fb0ff;
      font-size: 22px;
      line-height: 1;
      margin-bottom: 6mm;
    }
    .briefing-map span {
      display: block;
      font-size: 14px;
      font-weight: 900;
      margin-bottom: 2mm;
    }
    .briefing-map p {
      margin: 0;
      color: rgba(255,255,255,.72);
      font-size: 11.5px;
      line-height: 1.7;
    }
    .grid {
      grid-template-columns: 1fr 1fr;
      align-items: start;
    }
    .section-title {
      position: relative;
      overflow: hidden;
      padding: 6mm 7mm;
      border-radius: 18px;
      background: linear-gradient(135deg, rgba(22,31,52,.98), rgba(45,63,104,.94) 58%, rgba(53,107,255,.84));
      color: #fff;
      box-shadow: 0 8mm 22mm rgba(24,39,74,.14);
      page-break-inside: avoid;
    }
    .section-title::after {
      content: "";
      position: absolute;
      right: -16mm;
      top: -20mm;
      width: 52mm;
      height: 52mm;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,173,51,.42), transparent 64%);
    }
    .section-title span {
      position: relative;
      z-index: 1;
      color: #9db9ff;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 2.2px;
      text-transform: uppercase;
    }
    .section-title h2 {
      position: relative;
      z-index: 1;
      margin: 2mm 0 1mm;
      font-size: 22px;
      line-height: 1.2;
    }
    .section-title p {
      position: relative;
      z-index: 1;
      max-width: 138mm;
      margin: 0;
      color: rgba(255,255,255,.72);
      font-size: 12px;
      line-height: 1.7;
    }
    .issue-analysis {
      margin: 0 0 6mm;
      padding: 0;
      overflow: hidden;
      border-radius: 22px;
      background: #fff;
      border: 1px solid rgba(32,33,36,.07);
      box-shadow: 0 10mm 26mm rgba(24,39,74,.08);
      page-break-before: always;
    }
    .issue-hero {
      display: grid;
      grid-template-columns: 1fr 42mm;
      gap: 8mm;
      padding: 8mm;
      color: #fff;
      background:
        radial-gradient(circle at 76% 18%, rgba(255,173,51,.34), transparent 30%),
        linear-gradient(135deg, #101a2f, #253a68 62%, #356bff);
    }
    .issue-kicker {
      display: block;
      color: #9db9ff;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .issue-hero h2 {
      margin: 2mm 0 3mm;
      font-size: 28px;
      line-height: 1.1;
    }
    .issue-answer-line {
      display: block;
      margin-bottom: 3mm;
      color: #fff;
      font-size: 22px;
      line-height: 1.35;
    }
    .issue-hero p {
      margin: 0;
      color: rgba(255,255,255,.78);
      font-size: 13px;
      line-height: 1.85;
    }
    .issue-gauge { display: grid; place-items: center; }
    .fact-chart--gauge { width: 42mm; height: 42mm; }
    .issue-grid {
      display: grid;
      grid-template-columns: 1.15fr 1fr 1fr;
      gap: 4mm;
      padding: 5mm;
      background: #f8f5f1;
      page-break-inside: avoid;
    }
    .issue-panel, .chart-card {
      padding: 4.5mm;
      border-radius: 14px;
      background: #fff;
      border: 1px solid rgba(32,33,36,.06);
    }
    .issue-panel--dark {
      color: #fff;
      background: linear-gradient(180deg, #18233a, #263958);
    }
    .issue-panel span, .chart-card header span {
      display: block;
      margin-bottom: 2mm;
      color: #7a746d;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .16em;
      text-transform: uppercase;
    }
    .issue-panel--dark span { color: #9db9ff; }
    .issue-panel strong {
      display: block;
      margin-bottom: 2mm;
      font-size: 18px;
      line-height: 1.35;
    }
    .issue-panel p, .issue-panel li {
      color: #665c52;
      font-size: 11.5px;
      line-height: 1.7;
    }
    .issue-panel--dark p { color: rgba(255,255,255,.72); }
    .issue-panel ul {
      margin: 0;
      padding-left: 4mm;
    }
    .issue-decision-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4mm;
      padding: 0 5mm 5mm;
      background: #f8f5f1;
      page-break-inside: avoid;
    }
    .issue-decision-grid article {
      min-height: 30mm;
      padding: 4.5mm;
      border-radius: 14px;
      background:
        radial-gradient(circle at 100% 0%, rgba(53,107,255,.1), transparent 34%),
        #fff;
      border: 1px solid rgba(32,33,36,.06);
    }
    .issue-decision-grid span {
      display: block;
      margin-bottom: 2mm;
      color: #356bff;
      font-size: 12px;
      font-weight: 900;
    }
    .issue-decision-grid p {
      margin: 0;
      color: #665c52;
      font-size: 11.5px;
      line-height: 1.75;
    }
    .issue-chart-board {
      padding: 0 5mm 5mm;
      background: #f8f5f1;
      page-break-before: always;
    }
    .issue-chart-title {
      margin-bottom: 4mm;
      padding: 5mm;
      border-radius: 16px;
      color: #fff;
      background: linear-gradient(135deg, #172033, #30476f 70%, #356bff);
      page-break-inside: avoid;
    }
    .issue-chart-title span {
      color: #9db9ff;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .issue-chart-title h3 {
      margin: 2mm 0 1mm;
      font-size: 22px;
      line-height: 1.2;
    }
    .issue-chart-title p {
      margin: 0;
      color: rgba(255,255,255,.72);
      font-size: 12px;
      line-height: 1.7;
    }
    .chart-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5mm;
    }
    .chart-card { page-break-inside: avoid; }
    .compression-chart {
      display: grid;
      grid-template-columns: 34mm 1fr;
      gap: 5mm;
      align-items: stretch;
      min-height: 48mm;
    }
    .compression-score {
      display: grid;
      place-items: center;
      align-content: center;
      border-radius: 16px;
      color: #fff;
      background: radial-gradient(circle at 50% 20%, rgba(255,173,51,.34), transparent 56%), rgba(255,255,255,.1);
      border: 1px solid rgba(255,255,255,.14);
    }
    .compression-score strong {
      font-size: 30px;
      line-height: 1;
    }
    .compression-score span {
      margin-top: 2mm;
      max-width: 24mm;
      color: rgba(255,255,255,.7);
      font-size: 10px;
      line-height: 1.4;
      text-align: center;
    }
    .compression-steps {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 3mm;
      align-items: end;
    }
    .compression-steps article {
      position: relative;
      display: grid;
      grid-template-rows: 1fr auto;
      gap: 2mm;
      min-height: 45mm;
      color: #fff;
    }
    .compression-bar {
      align-self: end;
      display: grid;
      place-items: center;
      min-height: 14mm;
      border-radius: 12px 12px 6px 6px;
      background: linear-gradient(180deg, var(--bar), rgba(255,255,255,.16));
      box-shadow: 0 5mm 14mm rgba(0,0,0,.16);
    }
    .compression-bar b {
      font-size: 22px;
      line-height: 1;
    }
    .compression-steps article > span {
      color: rgba(255,255,255,.74);
      font-size: 10px;
      font-weight: 900;
      text-align: center;
    }
    .compression-steps i {
      position: absolute;
      right: -2.5mm;
      top: 42%;
      color: rgba(255,255,255,.5);
      font-style: normal;
      font-weight: 900;
    }
    .funnel-hero-card {
      color: #fff;
      background: linear-gradient(135deg, #101827, #24395d 68%, #356bff);
    }
    .funnel-hero-card .card-head b,
    .funnel-hero-card .card-head span {
      color: #fff;
    }
    .funnel-hero-card .funnel {
      margin-top: 5mm;
      padding: 4mm;
      border-radius: 14px;
      background: rgba(255,255,255,.1);
    }
    .funnel-hero-card .funnel-row {
      color: rgba(255,255,255,.82);
    }
    .chart-card header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 3mm;
      margin-bottom: 3mm;
    }
    .chart-card header b {
      font-size: 15px;
    }
    .bar-strips { display: grid; gap: 3mm; }
    .bar-strip__top {
      display: flex;
      justify-content: space-between;
      gap: 3mm;
      font-size: 11.5px;
      font-weight: 900;
    }
    .bar-strip i {
      display: block;
      height: 4mm;
      margin-top: 1.5mm;
      border-radius: 999px;
      background: rgba(32,33,36,.08);
      overflow: hidden;
    }
    .bar-strip em {
      display: block;
      height: 100%;
      border-radius: inherit;
    }
    .bar-strip p {
      margin: 1mm 0 0;
      color: #7a746d;
      font-size: 10.5px;
      line-height: 1.55;
    }
    .axis-map {
      position: relative;
      height: 48mm;
      border-radius: 14px;
      overflow: hidden;
      background:
        linear-gradient(90deg, rgba(32,33,36,.05) 1px, transparent 1px),
        linear-gradient(180deg, rgba(32,33,36,.05) 1px, transparent 1px),
        linear-gradient(135deg, #f7f9ff, #fff7ec);
      background-size: 18mm 18mm, 18mm 18mm, 100% 100%;
    }
    .axis-dot {
      position: absolute;
      border-radius: 999px;
      transform: translate(-50%, -50%);
      background: #356bff;
      box-shadow: 0 3mm 8mm rgba(53,107,255,.22);
    }
    .axis-dot--1 { background: #ffad33; }
    .axis-dot--2 { background: #42c67a; }
    .axis-dot--3 { background: #ff5d5d; }
    .axis-dot--4 { background: #8b5cf6; }
    .axis-dot span {
      position: absolute;
      left: 50%;
      top: 100%;
      transform: translateX(-50%);
      margin-top: 1mm;
      white-space: nowrap;
      color: #172033;
      font-size: 10px;
      font-weight: 900;
    }
    .axis-label {
      position: absolute;
      color: #7a746d;
      font-size: 10px;
      font-weight: 900;
    }
    .axis-label--x { right: 3mm; bottom: 2mm; }
    .axis-label--y { left: 3mm; top: 2mm; }
    .risk-matrix {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3mm;
    }
    .risk-cell {
      padding: 3mm;
      border-radius: 12px;
      background: #f8f5f1;
      border: 1px solid rgba(32,33,36,.06);
    }
    .risk-cell--high { background: rgba(255,93,93,.1); border-color: rgba(255,93,93,.25); }
    .risk-cell--medium { background: rgba(255,173,51,.12); border-color: rgba(255,173,51,.28); }
    .risk-cell--low { background: rgba(66,198,122,.1); border-color: rgba(66,198,122,.24); }
    .risk-cell div {
      display: flex;
      justify-content: space-between;
      gap: 2mm;
      font-size: 11px;
      font-weight: 900;
    }
    .risk-cell p, .mini-empty {
      margin: 2mm 0 0;
      color: #665c52;
      font-size: 10.5px;
      line-height: 1.55;
    }
    .card {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .card--wide { grid-column: 1 / -1; }
    .page-break { page-break-before: always; }
    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4mm;
      font-size: 15px;
      font-weight: 900;
    }
    .card-head b {
      color: #356bff;
      font-size: 12px;
    }
    .fact-list, .diff-list, .model-list, .raw-list { display: grid; gap: 3mm; }
    .weighted-timeline {
      display: grid;
      grid-template-columns: 1.25fr repeat(3, 1fr);
      gap: 3mm;
      margin-bottom: 4mm;
    }
    .weighted-timeline article {
      padding: 3.5mm;
      border-radius: 13px;
      background: #f8f5f1;
      border: 1px solid rgba(32,33,36,.06);
    }
    .weighted-timeline article.is-core {
      color: #fff;
      background: linear-gradient(135deg, #172033, #356bff);
      box-shadow: 0 6mm 16mm rgba(53,107,255,.16);
    }
    .weighted-timeline b {
      display: block;
      color: #356bff;
      font-size: 10px;
      letter-spacing: 1.4px;
      margin-bottom: 2mm;
    }
    .weighted-timeline .is-core b { color: #ffcf7a; }
    .weighted-timeline strong {
      display: block;
      font-size: 11px;
      margin-bottom: 1.5mm;
    }
    .weighted-timeline span {
      display: block;
      color: #665c52;
      font-size: 11px;
      line-height: 1.55;
    }
    .weighted-timeline .is-core span { color: rgba(255,255,255,.78); }
    .fact {
      display: grid;
      grid-template-columns: 10mm 1fr;
      gap: 3mm;
      padding: 4mm;
      border-radius: 12px;
      background: #f8f5f1;
      border-left: 3px solid #ffad33;
    }
    .fact--confirmed { border-left-color: #42c67a; }
    .fact--disputed { border-left-color: #ff5d5d; }
    .fact--polluted { border-left-color: #9a8f85; opacity: .78; }
    .fact-num { color: #356bff; font-weight: 900; font-size: 12px; }
    .fact-time { color: #7a746d; font-size: 11px; font-weight: 900; }
    .fact h4, .diff h4, .model h4 {
      margin: 1mm 0;
      font-size: 13.5px;
      line-height: 1.55;
    }
    .fact p, .diff p, .model p, .verdict p, .summary-line {
      margin: 2mm 0 0;
      color: #665c52;
      font-size: 12px;
      line-height: 1.75;
    }
    .funnel { display: grid; gap: 3mm; }
    .funnel-row {
      display: grid;
      grid-template-columns: 24mm 1fr 10mm;
      gap: 3mm;
      align-items: center;
      font-size: 12px;
    }
    .funnel-row i {
      height: 4mm;
      border-radius: 999px;
      background: rgba(32,33,36,.08);
      overflow: hidden;
    }
    .funnel-row em {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #356bff, #ffad33);
    }
    .diff {
      padding: 5mm;
      border-radius: 14px;
      background: #f8f5f1;
      border: 1px solid rgba(32,33,36,.07);
    }
    .diff--high {
      background: linear-gradient(180deg, rgba(255,93,93,.08), #fff);
      border-color: rgba(255,93,93,.32);
    }
    .diff-title {
      display: grid;
      grid-template-columns: 12mm 1fr auto;
      gap: 3mm;
      align-items: center;
    }
    .diff-title span { color: #356bff; font-weight: 900; }
    .diff-title b { color: #7a746d; font-size: 11px; }
    .diff-verdict-lines {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3mm;
      margin-top: 3mm;
    }
    .diff-verdict-lines p {
      margin: 0;
      padding: 3mm;
      border-radius: 12px;
      color: #3f382f;
      background: #fff;
      border: 1px solid rgba(32,33,36,.06);
      font-size: 11.5px;
      line-height: 1.65;
    }
    .diff-verdict-lines strong {
      color: #172033;
    }
    .claim-grid {
      margin-top: 3mm;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 3mm;
    }
    .claim, .cleaned, .model, .raw {
      padding: 4mm;
      border-radius: 12px;
      background: #fff;
      border: 1px solid rgba(32,33,36,.06);
    }
    .claim strong { color: #356bff; }
    .claim p { margin: 2mm 0 0; }
    .cleaned { margin-top: 3mm; background: rgba(53,107,255,.07); }
    .model { display: grid; gap: 2mm; }
    .model > div {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 3mm;
    }
    .model span { color: #7a746d; font-size: 11px; font-weight: 800; }
    .model > b { color: #356bff; font-size: 26px; }
    .model small { color: #7a746d; font-size: 12px; }
    .verdict h3 { margin: 4mm 0 1mm; font-size: 14px; }
    .verdict h3:first-child { margin-top: 0; }
    .final-verdict-lockup {
      min-height: 58mm;
      padding: 8mm;
      border-radius: 18px;
      color: #fff;
      background: linear-gradient(135deg, #101827, #263958 65%, #356bff);
      box-shadow: 0 8mm 24mm rgba(24,39,74,.12);
    }
    .final-verdict-lockup span {
      display: block;
      color: #9db9ff;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .final-verdict-lockup strong {
      display: block;
      margin: 4mm 0;
      font-size: 34px;
      line-height: 1.15;
    }
    .final-verdict-lockup p {
      max-width: 130mm;
      color: rgba(255,255,255,.72);
      font-size: 13px;
    }
    .final-verdict-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4mm;
      margin-top: 5mm;
    }
    .final-verdict-grid article {
      padding: 4mm;
      border-radius: 14px;
      background: #f8f5f1;
      border: 1px solid rgba(32,33,36,.06);
    }
    .final-verdict-grid b {
      display: block;
      color: #356bff;
      font-size: 12px;
      margin-bottom: 2mm;
    }
    .final-verdict-grid span {
      color: #172033;
      font-size: 13px;
      font-weight: 900;
      line-height: 1.45;
    }
    .raw pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 120mm;
      overflow: hidden;
      color: #4a433c;
      font-size: 11.5px;
      line-height: 1.65;
    }
    .empty {
      color: #7a746d;
      font-size: 12px;
      line-height: 1.7;
    }
  `;
}

module.exports = {
  buildReportHtml,
};
