(function attachUserPreferences(global) {
  const MIN_QUIET_AFTER_FIRST_REPLY_MS = 8000;

  function createUserPreferences(deps) {
    function getReplyStableIdleMs() {
      const el = deps.getReplyIdleCheckbox();
      if (!el) return 12000;
      return el.checked ? 12000 : 0;
    }

    function getAutoSummarizeAfterSend() {
      const el = deps.getAutoSummarizeCheckbox();
      if (!el) return true;
      return el.checked;
    }

    return {
      getAutoSummarizeAfterSend,
      getReplyStableIdleMs,
      minQuietAfterFirstReplyMs: MIN_QUIET_AFTER_FIRST_REPLY_MS,
    };
  }

  global.DuoliUserPreferences = {
    createUserPreferences,
  };
})(window);
