(function attachChatFlowPresenter(global) {
  const STAGE_LABELS = {
    refine: '正在补全问题',
    dispatch: '正在分发给多个 AI',
    extract: '正在抽取差异',
    followup: '正在追问原因',
    pollution: '正在剔除污染',
    report: '正在生成报告',
  };

  function createChatFlowPresenter(deps) {
    const stageNodes = new Map();

    function getFlowEl() {
      return typeof deps.getFlowEl === 'function' ? deps.getFlowEl() : null;
    }

    function getEmptyEl() {
      return typeof deps.getEmptyEl === 'function' ? deps.getEmptyEl() : null;
    }

    function scrollToBottom() {
      const el = typeof deps.getThreadScrollEl === 'function' ? deps.getThreadScrollEl() : null;
      if (!el) return;
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }

    function revealFlow() {
      const emptyEl = getEmptyEl();
      if (emptyEl) emptyEl.hidden = true;
    }

    function reset() {
      const flowEl = getFlowEl();
      if (flowEl) flowEl.textContent = '';
      stageNodes.clear();
      const emptyEl = getEmptyEl();
      if (emptyEl) emptyEl.hidden = false;
    }

    function appendUserMessage(text) {
      const flowEl = getFlowEl();
      const content = String(text || '').trim();
      if (!flowEl || !content) return;
      revealFlow();
      const node = document.createElement('article');
      node.className = 'chat-message chat-message--user';
      node.innerHTML = '<div class="chat-bubble chat-bubble--user"></div>';
      node.querySelector('.chat-bubble').textContent = content;
      flowEl.appendChild(node);
      scrollToBottom();
    }

    function createStageNode(key) {
      const node = document.createElement('article');
      node.className = 'chat-message chat-message--system';
      node.dataset.stage = key;
      node.innerHTML = [
        '<div class="chat-avatar" aria-hidden="true"><span></span></div>',
        '<div class="chat-bubble chat-bubble--system">',
        '  <div class="stage-row">',
        '    <span class="stage-orbit" aria-hidden="true"><i></i></span>',
        '    <div class="stage-copy">',
        '      <strong class="stage-title"></strong>',
        '      <p class="stage-detail"></p>',
        '    </div>',
        '  </div>',
        '  <div class="stage-glow" aria-hidden="true"></div>',
        '</div>',
      ].join('');
      return node;
    }

    function upsertStage(key, title, detail, state) {
      const flowEl = getFlowEl();
      if (!flowEl || !key) return;
      revealFlow();
      let node = stageNodes.get(key);
      if (!node) {
        node = createStageNode(key);
        stageNodes.set(key, node);
        flowEl.appendChild(node);
      }
      const nextState = state || 'active';
      node.classList.toggle('is-active', nextState === 'active');
      node.classList.toggle('is-done', nextState === 'done');
      node.classList.toggle('is-error', nextState === 'error');
      node.querySelector('.stage-title').textContent = title || STAGE_LABELS[key] || '正在处理';
      node.querySelector('.stage-detail').textContent = detail || '系统正在推进下一步，请稍等。';
      scrollToBottom();
    }

    function completeStage(key, detail) {
      upsertStage(key, STAGE_LABELS[key], detail || '已完成，进入下一步。', 'done');
    }

    function failStage(key, detail) {
      upsertStage(key, STAGE_LABELS[key] || '处理失败', detail || '这一阶段没有完成，请稍后重试。', 'error');
    }

    function showResultCard(options) {
      const flowEl = getFlowEl();
      if (!flowEl) return;
      revealFlow();
      const data = options || {};
      const card = document.createElement('article');
      card.className = 'chat-message chat-message--system chat-message--result';
      card.innerHTML = [
        '<div class="chat-avatar chat-avatar--final" aria-hidden="true"><span></span></div>',
        '<div class="result-card">',
        '  <div class="result-card__halo" aria-hidden="true"></div>',
        '  <p class="result-card__eyebrow">Analysis Complete</p>',
        '  <h3></h3>',
        '  <p class="result-card__desc"></p>',
        '  <div class="result-card__actions">',
        '    <button type="button" class="primary result-card__button"></button>',
        '  </div>',
        '</div>',
      ].join('');
      card.querySelector('h3').textContent = data.title || '去伪存真报告已生成';
      card.querySelector('.result-card__desc').textContent =
        data.detail || '已完成多模型回答、差异追问、污染剔除和最终报告生成。';
      card.querySelector('.result-card__button').textContent = data.buttonText || '打开情报报告';
      if (data.tone === 'error') {
        card.querySelector('.result-card__eyebrow').textContent = 'Analysis Interrupted';
        card.querySelector('.result-card').classList.add('result-card--error');
      } else {
        card.querySelector('.result-card__eyebrow').textContent = data.eyebrow || 'Fact Report Ready';
      }
      card.querySelector('.result-card').addEventListener('click', () => {
        if (typeof deps.openComparePanel === 'function') deps.openComparePanel();
      });
      card.querySelector('.result-card__button').addEventListener('click', (event) => {
        event.stopPropagation();
        if (typeof deps.openComparePanel === 'function') deps.openComparePanel();
      });
      flowEl.appendChild(card);
      scrollToBottom();
    }

    function showDiffDetailsCard(diffs) {
      const flowEl = getFlowEl();
      const list = Array.isArray(diffs) ? diffs : [];
      if (!flowEl || !list.length) return;
      revealFlow();

      const card = document.createElement('article');
      card.className = 'chat-message chat-message--system chat-message--diff';
      card.innerHTML = [
        '<div class="chat-avatar" aria-hidden="true"><span></span></div>',
        '<div class="diff-card">',
        '  <div class="diff-card__head">',
        '    <div>',
        '      <p class="diff-card__eyebrow">Difference Map</p>',
        '      <h3></h3>',
        '    </div>',
        '    <button type="button" class="ghost diff-card__toggle">查看差异详情</button>',
        '  </div>',
        '  <div class="diff-card__body" hidden></div>',
        '</div>',
      ].join('');
      card.querySelector('h3').textContent = `已识别 ${list.length} 个差异点`;
      const body = card.querySelector('.diff-card__body');
      list.forEach((diff, index) => {
        const item = document.createElement('section');
        item.className = 'diff-detail';
        const title = document.createElement('div');
        title.className = 'diff-detail__title';
        title.textContent = `${diff.id || `D${index + 1}`} · ${diff.type || '未分类'} · ${diff.severity || 'low'}`;
        const topic = document.createElement('h4');
        topic.textContent = diff.topic || `差异 ${index + 1}`;
        const why = document.createElement('p');
        why.className = 'diff-detail__why';
        why.textContent = diff.why_it_matters || '该差异会影响后续追问和最终报告判断。';
        const claims = document.createElement('div');
        claims.className = 'diff-detail__claims';
        const claimList = Array.isArray(diff.claims) ? diff.claims : [];
        if (claimList.length) {
          claimList.forEach((claim) => {
            const row = document.createElement('p');
            const model = document.createElement('strong');
            model.textContent = claim.model || '未知模型';
            const text = document.createElement('span');
            text.textContent = `：${claim.claim || ''}`;
            row.appendChild(model);
            row.appendChild(text);
            claims.appendChild(row);
          });
        } else {
          const empty = document.createElement('p');
          empty.textContent = '暂未抽取到明确模型 claim。';
          claims.appendChild(empty);
        }
        item.appendChild(title);
        item.appendChild(topic);
        item.appendChild(why);
        item.appendChild(claims);
        body.appendChild(item);
      });

      const toggle = card.querySelector('.diff-card__toggle');
      toggle.addEventListener('click', () => {
        const open = body.hasAttribute('hidden');
        if (open) body.removeAttribute('hidden');
        else body.setAttribute('hidden', '');
        toggle.textContent = open ? '收起差异详情' : '查看差异详情';
        scrollToBottom();
      });

      flowEl.appendChild(card);
      scrollToBottom();
    }

    return {
      appendUserMessage,
      completeStage,
      failStage,
      reset,
      showDiffDetailsCard,
      showResultCard,
      upsertStage,
    };
  }

  global.DuoliChatFlowPresenter = {
    createChatFlowPresenter,
  };
})(window);
