(function attachComparePanel(global) {
  function createComparePanel(deps) {
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
      const compareRawEl = deps.getCompareRawEl();
      if (!compareRawEl) return;
      compareRawEl.innerHTML = deps
        .chatPlatforms()
        .map((cfg) => {
          const text = deps.getRawReplyText(cfg.id) || '暂无回复';
          return `
            <article class="compare-raw__card">
              <h3>${escapeHtml(cfg.name)}</h3>
              <pre>${escapeHtml(text)}</pre>
            </article>
          `;
        })
        .join('');
    }

    function refresh() {
      const summaryText = deps.getSummaryText();
      const sameItems = sectionItems(extractCompareSection(summaryText, '相同观点'));
      const diffItems = sectionItems(extractCompareSection(summaryText, '不同观点'));
      renderCompareItems(deps.getCompareSameEl(), sameItems, '当前还没有可展示的相同观点。');
      renderCompareItems(deps.getCompareDiffEl(), diffItems, '当前还没有可展示的差异内容。');
      renderRawCards();
    }

    function open() {
      const comparePanel = deps.getComparePanel();
      if (!comparePanel) return;
      refresh();
      comparePanel.removeAttribute('hidden');
      document.body.classList.add('has-compare-open');
    }

    function close() {
      const comparePanel = deps.getComparePanel();
      if (!comparePanel) return;
      comparePanel.setAttribute('hidden', '');
      document.body.classList.remove('has-compare-open');
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
