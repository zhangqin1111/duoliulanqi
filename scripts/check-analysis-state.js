const { createAnalysisStateMachine } = require('../src/electron/renderer/analysis-state-machine');
const { createModelRunState } = require('../src/electron/renderer/model-run-state');
const { actionsForFailure } = require('../src/electron/renderer/recovery-actions');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const machine = createAnalysisStateMachine({ taskId: 'test-task' });
machine.transition('refining');
machine.completeStage('refining', { refined: '问题补全' });
machine.transition('dispatching');
machine.transition('collecting');
machine.transition('extracting_diffs');
machine.transition('following_up');
machine.transition('cleansing');
machine.transition('reporting');
machine.transition('completed');
assert(machine.snapshot().stage === 'completed', 'analysis machine should complete');

let blocked = false;
try {
  createAnalysisStateMachine().transition('completed');
} catch (error) {
  blocked = error.code === 'INVALID_STAGE_TRANSITION';
}
assert(blocked, 'invalid transition should be blocked');

const model = createModelRunState({ id: 'kimi', name: 'Kimi' });
model.setStatus('sent');
model.setStatus('waiting');
model.observeText('hello world');
assert(model.snapshot().status === 'streaming', 'text observation should mark streaming');
model.complete('hello world done');
assert(model.snapshot().status === 'completed', 'model should complete');

const actions = actionsForFailure({
  failedStage: 'reporting',
  failedModels: ['Kimi'],
  hasCurrentMaterials: true,
});
assert(actions.some((item) => item.id === 'retry_stage'), 'missing retry action');
assert(actions.some((item) => item.id === 'generate_with_current_materials'), 'missing current-material action');

console.log('Analysis state check passed');
