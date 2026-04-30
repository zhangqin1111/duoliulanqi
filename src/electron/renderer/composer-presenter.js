(function attachComposerPresenter(global) {
  function createComposerPresenter(deps) {
    function syncQuestionChip(text) {
      const el = deps.getQuestionChipEl();
      if (!el) return;
      const question = String(text || '').trim();
      el.textContent = question || '等待输入问题';
    }

    function resizeComposerInput() {
      const input = deps.getQuestionInput();
      if (!input) return;
      input.style.height = 'auto';
      const nextHeight = Math.max(108, Math.min(input.scrollHeight, 220));
      input.style.height = `${nextHeight}px`;
    }

    function scrollThreadToBottom() {
      const el = deps.getThreadScrollEl();
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    }

    function mirrorEl(id) {
      return document.getElementById(`mirror-${id}`);
    }

    return {
      mirrorEl,
      resizeComposerInput,
      scrollThreadToBottom,
      syncQuestionChip,
    };
  }

  global.DuoliComposerPresenter = {
    createComposerPresenter,
  };
})(window);
