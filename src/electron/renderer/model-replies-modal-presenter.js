(function attachModelRepliesModalPresenter(global) {
  function text(value, fallback) {
    const content = String(value || '').trim();
    return content || fallback || '';
  }

  function normalizeReply(item, index) {
    if (item && item.cfg && item.r) {
      return {
        id: text(item.cfg.id, `model_${index + 1}`),
        name: text(item.cfg.name, `AI ${index + 1}`),
        ok: !!item.r.ok,
        text: item.r.ok ? text(item.r.text, '') : '',
        error: item.r.ok ? '' : text(item.r.error, '回复失败'),
      };
    }
    return {
      id: text(item && item.id, `model_${index + 1}`),
      name: text(item && item.name, `AI ${index + 1}`),
      ok: item && item.ok !== false,
      text: text(item && item.text, ''),
      error: text(item && item.error, ''),
    };
  }

  function createModelRepliesModalPresenter() {
    let root = null;
    let body = null;
    let countEl = null;

    function notifyBoundsChange() {
      window.dispatchEvent(new CustomEvent('duoli:overlay-bounds-change'));
    }

    function ensureRoot() {
      if (root) return root;
      root = document.createElement('aside');
      root.className = 'model-replies-modal';
      root.hidden = true;
      root.setAttribute('aria-labelledby', 'model-replies-modal-title');
      root.innerHTML = [
        '<div class="model-replies-modal__backdrop" data-close-model-replies="true"></div>',
        '<section class="model-replies-modal__sheet" role="dialog" aria-modal="true">',
        '  <header class="model-replies-modal__head">',
        '    <div>',
        '      <p class="model-replies-modal__eyebrow">Multi Model Replies</p>',
        '      <h2 id="model-replies-modal-title">AI 原始回复看板</h2>',
        '      <p class="model-replies-modal__subtitle">集中查看每个 AI 的原始回答，方便判断回答质量、信息密度和后续差异来源。</p>',
        '    </div>',
        '    <div class="model-replies-modal__meta">',
        '      <span class="model-replies-modal__count"></span>',
        '      <button type="button" class="toolbar-btn model-replies-modal__close">关闭</button>',
        '    </div>',
        '  </header>',
        '  <div class="model-replies-modal__body"></div>',
        '</section>',
      ].join('');
      body = root.querySelector('.model-replies-modal__body');
      countEl = root.querySelector('.model-replies-modal__count');
      root.querySelector('.model-replies-modal__close').addEventListener('click', close);
      root.querySelector('[data-close-model-replies="true"]').addEventListener('click', close);
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && root && !root.hidden) close();
      });
      document.body.appendChild(root);
      return root;
    }

    function copyText(value) {
      const content = String(value || '');
      if (!content) return;
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(content).catch(() => null);
      }
    }

    function renderReply(reply) {
      const card = document.createElement('article');
      card.className = `model-replies-modal__card ${reply.ok ? 'is-ok' : 'is-error'}`;
      card.innerHTML = [
        '<div class="model-replies-modal__card-head">',
        '  <div>',
        '    <p class="model-replies-modal__model-id"></p>',
        '    <h3></h3>',
        '  </div>',
        '  <span class="model-replies-modal__status"></span>',
        '</div>',
        '<pre class="model-replies-modal__content"></pre>',
        '<div class="model-replies-modal__actions">',
        '  <button type="button" class="ghost model-replies-modal__copy">复制回复</button>',
        '</div>',
      ].join('');
      card.querySelector('.model-replies-modal__model-id').textContent = reply.id;
      card.querySelector('h3').textContent = reply.name;
      card.querySelector('.model-replies-modal__status').textContent = reply.ok ? '已完成' : '失败';
      const content = reply.ok ? reply.text || '该模型返回为空。' : reply.error || '该模型回复失败。';
      card.querySelector('.model-replies-modal__content').textContent = content;
      card.querySelector('.model-replies-modal__copy').addEventListener('click', () => copyText(content));
      body.appendChild(card);
    }

    function renderEmpty() {
      const empty = document.createElement('section');
      empty.className = 'model-replies-modal__empty';
      empty.innerHTML = [
        '<p class="model-replies-modal__eyebrow">No Replies</p>',
        '<h3>暂时没有可展示的 AI 回复</h3>',
        '<p>等多模型分发完成后，这里会展示每个 AI 的原始回答。</p>',
      ].join('');
      body.appendChild(empty);
    }

    function open(replies) {
      ensureRoot();
      const list = (Array.isArray(replies) ? replies : []).map(normalizeReply);
      body.textContent = '';
      countEl.textContent = `${list.length} 个模型`;
      if (list.length) list.forEach(renderReply);
      else renderEmpty();
      root.hidden = false;
      document.body.classList.add('is-model-replies-modal-open');
      notifyBoundsChange();
    }

    function close() {
      if (!root) return;
      root.hidden = true;
      document.body.classList.remove('is-model-replies-modal-open');
      notifyBoundsChange();
    }

    return {
      close,
      open,
    };
  }

  global.DuoliModelRepliesModalPresenter = {
    createModelRepliesModalPresenter,
  };
})(window);
