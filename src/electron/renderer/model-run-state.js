(function attachModelRunState(global) {
  const MODEL_STATES = [
    'not_sent',
    'sent',
    'inputting',
    'waiting',
    'streaming',
    'stable',
    'completed',
    'failed',
    'needs_human_verification',
  ];

  function now() {
    return Date.now();
  }

  function createModelRunState(model) {
    const state = {
      id: model && model.id ? model.id : '',
      name: model && model.name ? model.name : '',
      status: 'not_sent',
      textLength: 0,
      lastTextChangedAt: 0,
      startedAt: 0,
      completedAt: 0,
      error: '',
      verificationHint: '',
    };

    function setStatus(status, patch) {
      if (!MODEL_STATES.includes(status)) {
        const error = new Error(`Invalid model run state: ${status}`);
        error.code = 'INVALID_MODEL_RUN_STATE';
        throw error;
      }
      Object.assign(state, patch || {});
      state.status = status;
      if (!state.startedAt && status !== 'not_sent') state.startedAt = now();
      if (status === 'completed' || status === 'failed') state.completedAt = now();
      return snapshot();
    }

    function observeText(text) {
      const length = String(text || '').trim().length;
      if (length !== state.textLength) {
        state.textLength = length;
        state.lastTextChangedAt = now();
        if (length > 0 && ['waiting', 'sent', 'inputting'].includes(state.status)) {
          state.status = 'streaming';
        }
      }
      return snapshot();
    }

    function isStable(options) {
      const opts = options || {};
      const idleMs = Math.max(1000, Number(opts.idleMs) || 18000);
      const minChars = Math.max(0, Number(opts.minChars) || 10);
      if (state.status === 'needs_human_verification' || state.status === 'failed') return false;
      if (state.textLength < minChars) return false;
      if (!state.lastTextChangedAt) return false;
      return now() - state.lastTextChangedAt >= idleMs;
    }

    function markStable() {
      return setStatus('stable');
    }

    function complete(text) {
      observeText(text);
      return setStatus('completed');
    }

    function fail(error) {
      const message = error && error.message ? error.message : String(error || 'Unknown error');
      return setStatus('failed', { error: message });
    }

    function needsHumanVerification(hint) {
      return setStatus('needs_human_verification', { verificationHint: String(hint || '') });
    }

    function snapshot() {
      return JSON.parse(JSON.stringify(state));
    }

    return {
      setStatus,
      observeText,
      isStable,
      markStable,
      complete,
      fail,
      needsHumanVerification,
      snapshot,
    };
  }

  const api = {
    MODEL_STATES,
    createModelRunState,
  };

  global.DuoliModelRunState = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
