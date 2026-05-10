(function attachDifferenceModalPresenter(global) {
  function text(value, fallback) {
    const content = String(value || '').trim();
    return content || fallback || '';
  }

  function severityLabel(value) {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'high') return '高影响';
    if (normalized === 'medium') return '中影响';
    if (normalized === 'low') return '低影响';
    return text(value, '待判定');
  }

  function createClaimNode(claim) {
    const row = document.createElement('p');
    const model = document.createElement('strong');
    model.textContent = text(claim && claim.model, '未知模型');
    const body = document.createElement('span');
    body.textContent = text(claim && claim.claim, '未抽取到明确说法');
    row.appendChild(model);
    row.appendChild(body);
    return row;
  }

  function createDifferenceModalPresenter() {
    let root = null;
    let body = null;
    let countEl = null;

    function notifyBoundsChange() {
      window.dispatchEvent(new CustomEvent('duoli:overlay-bounds-change'));
    }

    function ensureRoot() {
      if (root) return root;
      root = document.createElement('aside');
      root.className = 'difference-modal';
      root.hidden = true;
      root.setAttribute('aria-labelledby', 'difference-modal-title');
      root.innerHTML = [
        '<div class="difference-modal__backdrop" data-close-difference="true"></div>',
        '<section class="difference-modal__sheet" role="dialog" aria-modal="true">',
        '  <header class="difference-modal__head">',
        '    <div>',
        '      <p class="difference-modal__eyebrow">Difference Intelligence</p>',
        '      <h2 id="difference-modal-title">差异侦查台</h2>',
        '      <p class="difference-modal__subtitle">把多模型不一致的事实、口径、原因和风险集中展开，避免挤占聊天区。</p>',
        '    </div>',
        '    <div class="difference-modal__meta">',
        '      <span class="difference-modal__count"></span>',
        '      <button type="button" class="toolbar-btn difference-modal__close">关闭</button>',
        '    </div>',
        '  </header>',
        '  <div class="difference-modal__body"></div>',
        '</section>',
      ].join('');
      body = root.querySelector('.difference-modal__body');
      countEl = root.querySelector('.difference-modal__count');
      root.querySelector('.difference-modal__close').addEventListener('click', close);
      root.querySelector('[data-close-difference="true"]').addEventListener('click', close);
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && root && !root.hidden) close();
      });
      document.body.appendChild(root);
      return root;
    }

    function renderEmpty() {
      const empty = document.createElement('section');
      empty.className = 'difference-modal__empty';
      empty.innerHTML = [
        '<p class="difference-modal__eyebrow">No Difference</p>',
        '<h3>暂未识别到可展开的差异点</h3>',
        '<p>等多模型回答完成后，系统会在这里集中展示差异详情。</p>',
      ].join('');
      body.appendChild(empty);
    }

    function renderDiff(diff, index) {
      const item = document.createElement('article');
      item.className = 'difference-modal__item';
      const claims = Array.isArray(diff && diff.claims) ? diff.claims : [];
      item.innerHTML = [
        '<div class="difference-modal__item-head">',
        '  <div>',
        '    <p class="difference-modal__id"></p>',
        '    <h3></h3>',
        '  </div>',
        '  <span class="difference-modal__badge"></span>',
        '</div>',
        '<p class="difference-modal__why"></p>',
        '<div class="difference-modal__claims"></div>',
      ].join('');
      item.querySelector('.difference-modal__id').textContent = [
        text(diff && diff.id, `D${index + 1}`),
        text(diff && diff.type, '未分类'),
      ].join(' · ');
      item.querySelector('h3').textContent = text(diff && diff.topic, `差异 ${index + 1}`);
      item.querySelector('.difference-modal__badge').textContent = severityLabel(diff && diff.severity);
      item.querySelector('.difference-modal__why').textContent = text(
        diff && diff.why_it_matters,
        '该差异会影响后续追问、污染剔除和最终报告裁决。'
      );

      const claimWrap = item.querySelector('.difference-modal__claims');
      if (claims.length) {
        claims.forEach((claim) => claimWrap.appendChild(createClaimNode(claim)));
      } else {
        claimWrap.appendChild(createClaimNode({ model: '系统', claim: '暂未抽取到明确模型说法。' }));
      }
      body.appendChild(item);
    }

    function open(diffs) {
      ensureRoot();
      const list = Array.isArray(diffs) ? diffs : [];
      body.textContent = '';
      countEl.textContent = `${list.length} 个差异点`;
      if (list.length) list.forEach(renderDiff);
      else renderEmpty();
      root.hidden = false;
      document.body.classList.add('is-difference-modal-open');
      notifyBoundsChange();
    }

    function close() {
      if (!root) return;
      root.hidden = true;
      document.body.classList.remove('is-difference-modal-open');
      notifyBoundsChange();
    }

    return {
      close,
      open,
    };
  }

  global.DuoliDifferenceModalPresenter = {
    createDifferenceModalPresenter,
  };
})(window);
