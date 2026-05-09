(function attachAnalysisStateMachine(global) {
  const STAGES = [
    'idle',
    'refining',
    'dispatching',
    'collecting',
    'extracting_diffs',
    'following_up',
    'cleansing',
    'reporting',
    'completed',
    'partial_completed',
    'failed',
  ];

  const TRANSITIONS = {
    idle: ['refining', 'dispatching', 'failed'],
    refining: ['dispatching', 'failed'],
    dispatching: ['collecting', 'failed', 'partial_completed'],
    collecting: ['extracting_diffs', 'failed', 'partial_completed'],
    extracting_diffs: ['following_up', 'cleansing', 'failed', 'partial_completed'],
    following_up: ['cleansing', 'failed', 'partial_completed'],
    cleansing: ['reporting', 'failed', 'partial_completed'],
    reporting: ['completed', 'failed', 'partial_completed'],
    completed: ['idle'],
    partial_completed: ['reporting', 'failed', 'idle'],
    failed: ['refining', 'dispatching', 'collecting', 'extracting_diffs', 'following_up', 'cleansing', 'reporting', 'idle'],
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function createAnalysisStateMachine(initial) {
    const state = {
      taskId: initial && initial.taskId ? initial.taskId : `task_${Date.now()}`,
      stage: 'idle',
      startedAt: nowIso(),
      updatedAt: nowIso(),
      history: [],
      stages: {},
      error: null,
    };

    function canTransition(nextStage) {
      return STAGES.includes(nextStage) && (TRANSITIONS[state.stage] || []).includes(nextStage);
    }

    function transition(nextStage, detail) {
      if (!canTransition(nextStage)) {
        const error = new Error(`Invalid analysis stage transition: ${state.stage} -> ${nextStage}`);
        error.code = 'INVALID_STAGE_TRANSITION';
        throw error;
      }
      const at = nowIso();
      state.history.push({ from: state.stage, to: nextStage, at, detail: detail || '' });
      if (state.stages[state.stage] && !state.stages[state.stage].endedAt) {
        state.stages[state.stage].endedAt = at;
      }
      state.stage = nextStage;
      state.updatedAt = at;
      state.error = null;
      if (!state.stages[nextStage]) {
        state.stages[nextStage] = { status: 'running', startedAt: at, endedAt: '', error: '' };
      } else {
        state.stages[nextStage].status = 'running';
        state.stages[nextStage].startedAt = state.stages[nextStage].startedAt || at;
        state.stages[nextStage].endedAt = '';
        state.stages[nextStage].error = '';
      }
      return snapshot();
    }

    function completeStage(stageName, output) {
      const key = stageName || state.stage;
      const stage = state.stages[key] || { startedAt: nowIso() };
      stage.status = 'completed';
      stage.endedAt = nowIso();
      stage.output = output;
      state.stages[key] = stage;
      state.updatedAt = stage.endedAt;
      return snapshot();
    }

    function failStage(stageName, error) {
      const key = stageName || state.stage;
      const message = error && error.message ? error.message : String(error || 'Unknown error');
      const at = nowIso();
      state.stages[key] = {
        ...(state.stages[key] || { startedAt: at }),
        status: 'failed',
        endedAt: at,
        error: message,
      };
      state.stage = 'failed';
      state.error = { stage: key, message, at };
      state.updatedAt = at;
      state.history.push({ from: key, to: 'failed', at, detail: message });
      return snapshot();
    }

    function markPartial(reason) {
      const at = nowIso();
      state.stage = 'partial_completed';
      state.updatedAt = at;
      state.history.push({ from: state.stage, to: 'partial_completed', at, detail: reason || '' });
      return snapshot();
    }

    function snapshot() {
      return JSON.parse(JSON.stringify(state));
    }

    return {
      canTransition,
      transition,
      completeStage,
      failStage,
      markPartial,
      snapshot,
    };
  }

  const api = {
    STAGES,
    TRANSITIONS,
    createAnalysisStateMachine,
  };

  global.DuoliAnalysisStateMachine = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
