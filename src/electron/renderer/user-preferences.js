(function attachUserPreferences(global) {
  const MIN_QUIET_AFTER_FIRST_REPLY_MS = 18000;

  function createUserPreferences(deps) {
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
