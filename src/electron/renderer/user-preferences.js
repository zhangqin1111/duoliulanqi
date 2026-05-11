(function attachUserPreferences(global) {
  const MIN_QUIET_AFTER_FIRST_REPLY_MS = 18000;
  const AI_REFINE_STORAGE_KEY = 'duoli.aiRefineEnabled';

  function createUserPreferences(deps) {
    let wiredAiRefine = false;

    function wireAiRefineCheckbox() {
      const el = deps.getAiRefineCheckbox ? deps.getAiRefineCheckbox() : null;
      if (!el || wiredAiRefine) return;
      wiredAiRefine = true;
      try {
        const saved = localStorage.getItem(AI_REFINE_STORAGE_KEY);
        if (saved === '0' || saved === '1') el.checked = saved !== '0';
      } catch (error) {
        /* localStorage may be unavailable in restricted environments. */
      }
      el.addEventListener('change', () => {
        try {
          localStorage.setItem(AI_REFINE_STORAGE_KEY, el.checked ? '1' : '0');
        } catch (error) {
          /* ignore persistence failures */
        }
      });
    }

    function getReplyStableIdleMs() {
      const el = deps.getReplyIdleCheckbox();
      if (!el) return 18000;
      return el.checked ? 18000 : 0;
    }

    function getAutoSummarizeAfterSend() {
      const el = deps.getAutoSummarizeCheckbox();
      if (!el) return true;
      return el.checked;
    }

    function getAiRefineEnabled() {
      wireAiRefineCheckbox();
      const el = deps.getAiRefineCheckbox ? deps.getAiRefineCheckbox() : null;
      if (!el) return true;
      return el.checked;
    }

    wireAiRefineCheckbox();

    return {
      getAiRefineEnabled,
      getAutoSummarizeAfterSend,
      getReplyStableIdleMs,
      minQuietAfterFirstReplyMs: MIN_QUIET_AFTER_FIRST_REPLY_MS,
    };
  }

  global.DuoliUserPreferences = {
    createUserPreferences,
  };
})(window);
