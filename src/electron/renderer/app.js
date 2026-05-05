const $ = (sel) => document.querySelector(sel);
const statusEl = $('#status');
const qEl = $('#q');
const btnReload = $('#btnReload'), btnViewMode = $('#btnViewMode'), btnSettings = $('#btnSettings');
const btnSend = $('#btnSend'), btnCompare = $('#btnCompare');
const summaryBodyEl = $('#summary-body');
const summaryStatusEl = $('#summary-status');
const settingsPanel = $('#settings-panel');
const dashscopeKeyInput = $('#dashscope-key');
const settingsKeySourceEl = $('#settings-key-source');
const settingsMsgEl = $('#settings-msg');
const questionChipEl = $('#question-chip');
const threadScrollEl = $('#thread-scroll'), chatEmptyEl = $('#chat-empty'), chatFlowEl = $('#chat-flow');
const btnOpenCompare = $('#btnOpenCompare');
const comparePanel = $('#compare-panel');
const compareSameEl = $('#compare-same');
const compareDiffEl = $('#compare-diff');
const compareRawEl = $('#compare-raw');
const toolMenuEl = $('#tool-menu');
const dockIconsEl = $('#dock-icons');
const mirrorSectionsEl = $('#mirror-sections');
const embedsRowRootEl = $('#embeds-row');
const licenseGateEl = $('#license-gate');
const licenseTokenInputEl = $('#license-token');
const licenseStateTextEl = $('#license-state-text');
const licenseExpiryTextEl = $('#license-expiry-text');
const licenseMsgEl = $('#license-msg');
const btnActivateLicense = $('#btnActivateLicense');
const btnClearLicense = $('#btnClearLicense');

let api = null;
let platforms = [];
let qwenApiOk = false;
const guestLoaded = new Set();
const platformVisibility = {};
let controllerRegistry = null;
let appComposition = null;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getControllerRegistry() {
  const factory = window.DuoliControllerRegistry && window.DuoliControllerRegistry.createControllerRegistry;
  if (typeof factory !== 'function') {
    throw new Error('Controller registry module is not loaded.');
  }
  if (!controllerRegistry) controllerRegistry = factory();
  return controllerRegistry;
}

function getAppComposition() {
  const factory = window.DuoliAppComposition && window.DuoliAppComposition.createAppComposition;
  if (typeof factory !== 'function') {
    throw new Error('App composition module is not loaded.');
  }
  if (!appComposition) {
    appComposition = factory({
      elements: {
        statusEl,
        qEl,
        btnReload,
        btnViewMode,
        btnSettings,
        btnSend,
        btnCompare,
        summaryBodyEl,
        summaryStatusEl,
        settingsPanel,
        dashscopeKeyInput,
        settingsKeySourceEl,
        settingsMsgEl,
        questionChipEl,
        threadScrollEl,
        chatEmptyEl,
        chatFlowEl,
        btnOpenCompare,
        comparePanel,
        compareSameEl,
        compareDiffEl,
        compareRawEl,
        toolMenuEl,
        dockIconsEl,
        mirrorSectionsEl,
        embedsRowRootEl,
        licenseGateEl,
        licenseTokenInputEl,
        licenseStateTextEl,
        licenseExpiryTextEl,
        licenseMsgEl,
        btnActivateLicense,
        btnClearLicense,
      },
      guestLoaded,
      getApi: () => api,
      setApi: (nextApi) => {
        api = nextApi;
      },
      getPlatforms: () => platforms,
      setPlatforms: (nextPlatforms) => {
        platforms = Array.isArray(nextPlatforms) ? nextPlatforms : [];
      },
      getPlatformVisibility: () => platformVisibility,
      getControllerRegistry,
      getRawReplyText: (id) => document.querySelector(`[data-body="${id}"]`)?.textContent?.trim() || '',
      getSummaryText: () => (summaryBodyEl ? summaryBodyEl.textContent.trim() : ''),
      isQwenApiOk: () => qwenApiOk,
      setQwenApiOk: (ok) => {
        qwenApiOk = !!ok;
      },
      isPlausibleReplyText,
      reporting,
      sleep,
      actions: {
        applyHostMode,
        applyQwenStatus,
        appendUserChatMessage,
        askOnePlatform,
        buildFillScript,
        buildReportPayload,
        chatPlatforms,
        closeComparePanel,
        completeFlowStage,
        ensurePlatformVisibilityState,
        ensurePopoutButtons,
        ensureWorkbenchBoot,
        failFlowStage,
        getAutoSummarizeAfterSend,
        getDifferenceText,
        getReplyStableIdleMs,
        mirrorEl,
        openComparePanel,
        popoutPlatform,
        positionToolMenu,
        redockPlatform,
        refineQuestion,
        refreshComparePanel,
        renderPlatformScaffold,
        renderPlatformVisibility,
        renderToolMenu,
        resetChatFlow,
        resizeComposerInput,
        runCompareAndSummarize,
        runConcurrentAsk,
        runTruthSeekingAnalysis,
        schedulePushBounds,
        scrollThreadToBottom,
        setBusy,
        setColBody,
        setColStatus,
        setFlowStage,
        setLicenseLocked,
        setPlatformMode,
        setStatus,
        setSummaryStatus,
        setToolMenuOpen,
        syncEmbedHosts,
        syncLicenseState,
        syncQuestionChip,
        showCompareReadyCard,
        showDiffDetailsCard,
        waitUntilGuestLoaded,
        wireExportPdf,
        wireLicenseGate,
        wireSettings,
        wireUi,
      },
    });
  }
  return appComposition;
}

function isPlausibleReplyText(text) {
  if (!window.DuoliReplyQuality) {
    throw new Error('Reply quality module is not loaded.');
  }
  return window.DuoliReplyQuality.isPlausibleReplyText(text);
}

function getComposerPresenter() {
  return getAppComposition().composerPresenter();
}

function getChatFlowPresenter() {
  return getAppComposition().chatFlowPresenter();
}

const resetChatFlow = () => getChatFlowPresenter().reset(), appendUserChatMessage = (text) => getChatFlowPresenter().appendUserMessage(text), setFlowStage = (key, title, detail, state) => getChatFlowPresenter().upsertStage(key, title, detail, state), completeFlowStage = (key, detail) => getChatFlowPresenter().completeStage(key, detail), failFlowStage = (key, detail) => getChatFlowPresenter().failStage(key, detail), showCompareReadyCard = (options) => getChatFlowPresenter().showResultCard(options || {}), showDiffDetailsCard = (diffs) => getChatFlowPresenter().showDiffDetailsCard(diffs);

function syncQuestionChip(text) {
  getComposerPresenter().syncQuestionChip(text);
}

function resizeComposerInput() {
  getComposerPresenter().resizeComposerInput();
}

function scrollThreadToBottom() {
  getComposerPresenter().scrollThreadToBottom();
}

function mirrorEl(id) {
  return getComposerPresenter().mirrorEl(id);
}

function getPlatformScaffold() {
  return getAppComposition().platformScaffold();
}

function renderPlatformScaffold() {
  getPlatformScaffold().render();
}

function reporting() {
  if (!window.DuoliReporting) {
    throw new Error('Reporting module is not loaded.');
  }
  return window.DuoliReporting;
}

function getComparePanelController() {
  return getAppComposition().comparePanel();
}

function refreshComparePanel() {
  try {
    getComparePanelController().refresh();
  } catch (error) {
    console.warn('[duoli] refreshComparePanel failed', error);
  }
}

function openComparePanel() {
  getComparePanelController().open();
}

function closeComparePanel() {
  getComparePanelController().close();
}

function positionToolMenu() {
  const stageEl = document.querySelector('.browser-stage');
  const addToolBtn = document.getElementById('btnAddTool');
  if (!toolMenuEl || !stageEl || !addToolBtn || toolMenuEl.hasAttribute('hidden')) return;
  const stageRect = stageEl.getBoundingClientRect();
  const btnRect = addToolBtn.getBoundingClientRect();
  const bubbleWidth = Math.max(toolMenuEl.offsetWidth || 0, 184);
  const bubbleHeight = toolMenuEl.offsetHeight || 0;
  const gap = 8;
  const top = Math.max(
    18,
    Math.min(btnRect.top - stageRect.top + btnRect.height / 2 - bubbleHeight / 2, stageEl.clientHeight - bubbleHeight - 18)
  );
  const left = Math.max(
    18,
    Math.min(btnRect.left - stageRect.left - bubbleWidth - gap, stageEl.clientWidth - bubbleWidth - 18)
  );
  toolMenuEl.style.top = `${Math.round(top)}px`;
  toolMenuEl.style.left = `${Math.round(left)}px`;
  toolMenuEl.style.right = 'auto';
}

function setToolMenuOpen(open) {
  const stageEl = document.querySelector('.browser-stage');
  if (toolMenuEl) {
    if (open) {
      toolMenuEl.removeAttribute('hidden');
    } else {
      toolMenuEl.setAttribute('hidden', '');
    }
  }
  if (stageEl) {
    stageEl.classList.toggle('browser-stage--tool-open', !!open);
  }
  if (open) {
    requestAnimationFrame(() => requestAnimationFrame(() => positionToolMenu()));
  }
  schedulePushBounds();
}

function getPlatformPopoutController() {
  return getAppComposition().platformPopout();
}

function applyHostMode(id, host) {
  getPlatformPopoutController().applyHostMode(id, host);
}

function ensurePopoutButtons() {
  getPlatformPopoutController().ensurePopoutButtons();
}

async function popoutPlatform(id, bounds) {
  await getPlatformPopoutController().popoutPlatform(id, bounds);
}

async function redockPlatform(id) {
  await getPlatformPopoutController().redockPlatform(id);
}

function getPlatformVisibilityController() {
  return getAppComposition().platformVisibility();
}

function ensurePlatformVisibilityState() {
  getPlatformVisibilityController().ensureState();
}

function setPlatformMode(id, mode) {
  getPlatformVisibilityController().setPlatformMode(id, mode);
}

function renderToolMenu() {
  getPlatformVisibilityController().renderToolMenu();
}

function renderPlatformVisibility() {
  getPlatformVisibilityController().render();
}

function getDifferenceText() {
  return getComparePanelController().getDifferenceText();
}

function getStatusPresenter() {
  return getAppComposition().statusPresenter();
}

function setStatus(text) {
  getStatusPresenter().setStatus(text);
}

function setColStatus(id, text, cls) {
  getStatusPresenter().setColStatus(id, text, cls);
}

function setColBody(id, text) {
  getStatusPresenter().setColBody(id, text);
}

function setSummaryStatus(text) {
  getStatusPresenter().setSummaryStatus(text);
}

function chatPlatforms() {
  return getPlatformVisibilityController().chatPlatforms();
}

function getReportSession() {
  return getAppComposition().reportSession();
}

function buildReportPayload(questionText) {
  return getReportSession().buildReportPayload(questionText);
}

function applyQwenStatus(qc) {
  return getQwenSettingsController().applyStatus(qc);
}

function setBusy(busy) {
  getStatusPresenter().setBusy(busy);
}

function getTruthSeekingRunner() {
  return getAppComposition().truthSeekingRunner();
}

async function runTruthSeekingAnalysis(question, opt) {
  const session = await getTruthSeekingRunner().run(question, opt || {});
  getReportSession().setAnalysisSession(session);
  return session;
}

function getAnalysisOrchestrator() {
  return getAppComposition().analysisOrchestrator();
}

function getUserPreferences() {
  return getAppComposition().userPreferences();
}

function getReplyStableIdleMs() {
  return getUserPreferences().getReplyStableIdleMs();
}

function getAutoSummarizeAfterSend() {
  return getUserPreferences().getAutoSummarizeAfterSend();
}

function getAiConversationController() {
  return getAppComposition().aiConversation();
}

function getQuestionRefiner() {
  return getAppComposition().questionRefiner();
}

async function refineQuestion(rawQuestion) {
  return getQuestionRefiner().refineQuestion(rawQuestion);
}

async function runConcurrentAsk(question) {
  return getAiConversationController().runConcurrentAsk(question);
}

async function runCompareAndSummarize(question, opt) {
  await getAnalysisOrchestrator().runCompareAndSummarize(question, opt);
}

function getEmbedBoundsReporter() {
  return getAppComposition().embedBounds();
}

function schedulePushBounds() {
  getEmbedBoundsReporter().schedule();
}

function buildFillScript(text, cfg) {
  const builder = window.DuoliBrowserAutomation && window.DuoliBrowserAutomation.buildFillScript;
  if (typeof builder !== 'function') {
    throw new Error('Browser automation module is not loaded.');
  }
  return builder(text, cfg);
}


async function askOnePlatform(cfg, question, opts) {
  return getAiConversationController().askOnePlatform(cfg, question, opts || {});
}

async function waitUntilGuestLoaded(id, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (guestLoaded.has(id)) return;
    try {
      const readyState = await api.guestExec(id, 'document.readyState');
      if (readyState === 'interactive' || readyState === 'complete') {
        guestLoaded.add(id);
        return;
      }
    } catch (e) {
      /* BrowserView may still be initializing. */
    }
    await sleep(80);
  }
  throw new Error(`${id} 页面加载超时`);
}

async function syncEmbedHosts() {
  if (!api || typeof api.getEmbedHosts !== 'function') return;
  try {
    const hosts = (await api.getEmbedHosts()) || {};
    Object.entries(hosts).forEach(([id, host]) => applyHostMode(id, host));
    renderPlatformVisibility();
  } catch (e) {
    /* ignore */
  }
}

function getUiWiring() {
  return getAppComposition().uiWiring();
}

function wireUi() {
  getUiWiring().wire();
}

function wireExportPdf() {
  getReportExporter().wire();
}

function getReportExporter() {
  return getAppComposition().reportExporter();
}

function getLicenseGate() {
  return getAppComposition().licenseGate();
}

function setLicenseLocked(locked) {
  getLicenseGate().setLocked(locked);
}

async function syncLicenseState() {
  return getLicenseGate().syncState();
}

function wireLicenseGate() {
  getLicenseGate().wire();
}

function getWorkbenchBootstrap() {
  return getAppComposition().workbenchBootstrap();
}

async function ensureWorkbenchBoot() {
  return getWorkbenchBootstrap().ensureWorkbenchBoot();
}

function getQwenSettingsController() {
  return getAppComposition().qwenSettings();
}

function wireSettings() {
  getQwenSettingsController().wire();
}

async function boot() {
  await getWorkbenchBootstrap().boot();
}

boot();
