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
        '      <div class="stage-actions"></div>',
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

    function showModelRepliesCard(replies) {
      const list = Array.isArray(replies) ? replies : [];
      if (!list.length) return;
      const node = stageNodes.get('dispatch');
      if (!node) return;
      const actions = node.querySelector('.stage-actions');
      if (!actions) return;
      actions.textContent = '';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ghost stage-action-btn';
      button.textContent = `查看 ${list.length} 个 AI 回复`;
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        if (typeof deps.openModelRepliesModal === 'function') deps.openModelRepliesModal(list);
      });
      actions.appendChild(button);
      const bubble = node.querySelector('.chat-bubble--system');
      if (bubble) {
        bubble.classList.add('chat-bubble--clickable');
        bubble.onclick = () => {
          if (typeof deps.openModelRepliesModal === 'function') deps.openModelRepliesModal(list);
        };
      }
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
      if (Array.isArray(data.actions) && data.actions.length) {
        const actionsEl = card.querySelector('.result-card__actions');
        data.actions.forEach((action) => {
          const actionButton = document.createElement('button');
          actionButton.type = 'button';
          actionButton.className = 'ghost result-card__button';
          actionButton.textContent = action.label || action.id || '执行';
          actionButton.addEventListener('click', (event) => {
            event.stopPropagation();
            if (typeof deps.onRecoveryAction === 'function') deps.onRecoveryAction(action);
          });
          actionsEl.appendChild(actionButton);
        });
      }
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
        '  <p class="diff-card__summary"></p>',
        '  <div class="diff-card__preview"></div>',
        '</div>',
      ].join('');
      card.querySelector('h3').textContent = `已识别 ${list.length} 个差异点`;
      card.querySelector('.diff-card__summary').textContent =
        '差异详情将以独立浮层展示，不再占用左侧聊天流程空间。';
      const preview = card.querySelector('.diff-card__preview');
      list.slice(0, 4).forEach((diff, index) => {
        const chip = document.createElement('span');
        chip.textContent = `${diff.id || `D${index + 1}`} · ${diff.type || '未分类'}`;
        preview.appendChild(chip);
      });
      if (list.length > 4) {
        const more = document.createElement('span');
        more.textContent = `+${list.length - 4}`;
        preview.appendChild(more);
      }

      const toggle = card.querySelector('.diff-card__toggle');
      toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        if (typeof deps.openDiffDetailsModal === 'function') deps.openDiffDetailsModal(list);
      });
      card.querySelector('.diff-card').addEventListener('click', () => {
        if (typeof deps.openDiffDetailsModal === 'function') deps.openDiffDetailsModal(list);
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
      showModelRepliesCard,
      showResultCard,
      upsertStage,
    };
  }

  global.DuoliChatFlowPresenter = {
    createChatFlowPresenter,
  };
})(window);
