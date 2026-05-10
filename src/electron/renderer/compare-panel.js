(function attachComparePanel(global) {
  function createComparePanel(deps) {
    let renderSeq = 0;

    function escapeHtml(text) {
      return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function sectionItems(text) {
      return deps.reporting().sectionItems(text);
    }

    function extractCompareSection(summaryText, heading) {
      return deps.reporting().extractCompareSection(summaryText, heading);
    }

    function extractStructuredReport(summaryText) {
      const reporting = deps.reporting();
      if (!reporting || typeof reporting.extractStructuredReport !== 'function') return null;
      return reporting.extractStructuredReport(summaryText, {});
    }

    function renderCompareItems(target, items, emptyText) {
      if (!target) return;
      const list = Array.isArray(items) ? items : [];
      if (!list.length) {
        target.innerHTML = `<div class="compare-item"><div>${escapeHtml(emptyText)}</div></div>`;
        return;
      }
      target.innerHTML = list
        .map(
          (item, index) =>
            `<div class="compare-item"><span class="compare-item__index">${index + 1}</span><span>${escapeHtml(item)}</span></div>`
        )
        .join('');
    }

    function renderRawCards() {
      const compareRawEl = document.getElementById('compare-raw') || deps.getCompareRawEl();
      if (!compareRawEl) return;
      const brand = global.DuoliPlatformBrand;
      compareRawEl.innerHTML = deps
        .chatPlatforms()
        .map((cfg) => {
          const text = deps.getRawReplyText(cfg.id) || '暂无回复';
          const logo =
            brand && typeof brand.renderLogo === 'function'
              ? brand.renderLogo(cfg, 'compare-raw__logo')
              : `<span class="compare-raw__logo is-fallback"><span>${escapeHtml(cfg.name.slice(0, 1))}</span></span>`;
          return `
            <article class="compare-raw__card">
              <h3>${logo}<span>${escapeHtml(cfg.name)}</span></h3>
              <pre>${escapeHtml(text)}</pre>
            </article>
          `;
        })
        .join('');
    }

    async function renderUnifiedReportPreview(body) {
      const api = deps.getApi ? deps.getApi() : null;
      if (!api || typeof api.renderReportHtml !== 'function' || typeof deps.buildReportPayload !== 'function') return false;
      const seq = ++renderSeq;
      body.classList.add('compare-panel__body--pdf-preview');
      body.classList.remove('compare-panel__body--intel');
      body.innerHTML = '<div class="compare-panel__loading">正在生成与 PDF 完全一致的预览...</div>';
      const payload = deps.buildReportPayload(deps.getQuestionText ? deps.getQuestionText() : '');
      if (!payload) return false;
      const result = await api.renderReportHtml(payload);
      if (seq !== renderSeq) return true;
      if (!result || !result.ok || !result.html) return false;
      body.innerHTML = '<iframe class="compare-report-frame" title="报告预览"></iframe>';
      const frame = body.querySelector('.compare-report-frame');
      if (frame) frame.srcdoc = result.html;
      return true;
    }

    async function refresh() {
      const summaryText = deps.getSummaryText();
      const comparePanel = deps.getComparePanel();
      const body = comparePanel ? comparePanel.querySelector('.compare-panel__body') : null;
      if (body) {
        try {
          const rendered = await renderUnifiedReportPreview(body);
          if (rendered) return;
        } catch (error) {
          console.warn('[duoli] unified report preview failed, fallback to renderer preview', error);
        }
        body.classList.remove('compare-panel__body--pdf-preview');
      }
      const structured = extractStructuredReport(summaryText);
      if (body && structured && global.DuoliReportPresenter && typeof global.DuoliReportPresenter.renderReport === 'function') {
        body.classList.add('compare-panel__body--intel');
        body.innerHTML = global.DuoliReportPresenter.renderReport(
          structured,
          deps.chatPlatforms().map((cfg) => ({
            id: cfg.id,
            name: cfg.name,
            text: deps.getRawReplyText(cfg.id),
          }))
        );
        return;
      }
      if (body && body.classList.contains('compare-panel__body--intel')) {
        body.classList.remove('compare-panel__body--intel');
        body.innerHTML = `
          <section class="compare-column compare-column--same">
            <div class="compare-column__title">全景摘要</div>
            <div id="compare-same" class="compare-column__content">暂无内容</div>
          </section>
          <section class="compare-column compare-column--diff">
            <div class="compare-column__title">逻辑差异</div>
            <div id="compare-diff" class="compare-column__content">暂无内容</div>
          </section>
          <section class="compare-raw">
            <div class="compare-column__title">原始回复</div>
            <div id="compare-raw" class="compare-raw__grid"></div>
          </section>
        `;
      }
      const sameItems = sectionItems(extractCompareSection(summaryText, '相同观点'));
      const diffItems = sectionItems(extractCompareSection(summaryText, '不同观点'));
      renderCompareItems(document.getElementById('compare-same') || deps.getCompareSameEl(), sameItems, '当前还没有可展示的相同观点。');
      renderCompareItems(document.getElementById('compare-diff') || deps.getCompareDiffEl(), diffItems, '当前还没有可展示的差异内容。');
      renderRawCards();
    }

    function open() {
      const comparePanel = deps.getComparePanel();
      if (!comparePanel) return;
      refresh();
      comparePanel.removeAttribute('hidden');
      document.body.classList.add('has-compare-open');
      if (typeof deps.schedulePushBounds === 'function') deps.schedulePushBounds();
    }

    function close() {
      const comparePanel = deps.getComparePanel();
      if (!comparePanel) return;
      comparePanel.setAttribute('hidden', '');
      document.body.classList.remove('has-compare-open');
      if (typeof deps.schedulePushBounds === 'function') deps.schedulePushBounds();
    }

    function getDifferenceText() {
      const summaryText = deps.getSummaryText();
      const diffText = extractCompareSection(summaryText, '不同观点');
      return diffText || summaryText;
    }

    return {
      close,
      getDifferenceText,
      open,
      refresh,
    };
  }

  global.DuoliComparePanel = {
    createComparePanel,
  };
})(window);
