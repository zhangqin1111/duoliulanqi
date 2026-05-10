(function attachAppComposition(global) {
  function createAppComposition(ctx) {
    function controller(key, spec) {
      return ctx.getControllerRegistry().get(key, spec);
    }

    function composerPresenter() {
      return controller('composerPresenter', {
        moduleName: 'DuoliComposerPresenter',
        factoryName: 'createComposerPresenter',
        label: 'Composer presenter',
        createDeps: () => ({
          getQuestionChipEl: () => ctx.elements.questionChipEl,
          getQuestionInput: () => ctx.elements.qEl,
          getThreadScrollEl: () => ctx.elements.threadScrollEl,
        }),
      });
    }

    function chatFlowPresenter() {
      return controller('chatFlowPresenter', {
        moduleName: 'DuoliChatFlowPresenter',
        factoryName: 'createChatFlowPresenter',
        label: 'Chat flow presenter',
        createDeps: () => ({
          getEmptyEl: () => ctx.elements.chatEmptyEl,
          getFlowEl: () => ctx.elements.chatFlowEl,
          getThreadScrollEl: () => ctx.elements.threadScrollEl,
          openComparePanel: ctx.actions.openComparePanel,
          onRecoveryAction: ctx.actions.handleRecoveryAction,
        }),
      });
    }

    function platformScaffold() {
      return controller('platformScaffold', {
        moduleName: 'DuoliPlatformScaffold',
        factoryName: 'createPlatformScaffold',
        label: 'Platform scaffold',
        createDeps: () => ({
          getPlatforms: ctx.getPlatforms,
          getMirrorSectionsEl: () => ctx.elements.mirrorSectionsEl,
          getEmbedsRowRootEl: () => ctx.elements.embedsRowRootEl,
        }),
      });
    }

    function comparePanel() {
      return controller('comparePanel', {
        moduleName: 'DuoliComparePanel',
        factoryName: 'createComparePanel',
        label: 'Compare panel',
        createDeps: () => ({
          chatPlatforms: ctx.actions.chatPlatforms,
          getCompareDiffEl: () => ctx.elements.compareDiffEl,
          getComparePanel: () => ctx.elements.comparePanel,
          getCompareRawEl: () => ctx.elements.compareRawEl,
          getCompareSameEl: () => ctx.elements.compareSameEl,
          getApi: ctx.getApi,
          getQuestionText: () => (ctx.elements.qEl ? ctx.elements.qEl.value.trim() : ''),
          getRawReplyText: ctx.getRawReplyText,
          getSummaryText: ctx.getSummaryText,
          buildReportPayload: ctx.actions.buildReportPayload,
          reporting: ctx.reporting,
          schedulePushBounds: ctx.actions.schedulePushBounds,
        }),
      });
    }

    function platformPopout() {
      return controller('platformPopout', {
        moduleName: 'DuoliPlatformPopout',
        factoryName: 'createPlatformPopoutController',
        label: 'Platform popout',
        createDeps: () => ({
          getApi: ctx.getApi,
          getPlatforms: ctx.getPlatforms,
          getPlatformVisibility: ctx.getPlatformVisibility,
          setPlatformMode: ctx.actions.setPlatformMode,
          setStatus: ctx.actions.setStatus,
        }),
      });
    }

    function platformVisibility() {
      return controller('platformVisibility', {
        moduleName: 'DuoliPlatformVisibility',
        factoryName: 'createPlatformVisibilityController',
        label: 'Platform visibility',
        createDeps: () => ({
          state: ctx.getPlatformVisibility(),
          getPlatforms: ctx.getPlatforms,
          getToolMenuEl: () => ctx.elements.toolMenuEl,
          getDockIconsEl: () => ctx.elements.dockIconsEl,
          getEmbedsRowEl: () => ctx.elements.embedsRowRootEl || document.getElementById('embeds-row'),
          redockPlatform: ctx.actions.redockPlatform,
          schedulePushBounds: ctx.actions.schedulePushBounds,
          setToolMenuOpen: ctx.actions.setToolMenuOpen,
        }),
      });
    }

    function statusPresenter() {
      return controller('statusPresenter', {
        moduleName: 'DuoliStatusPresenter',
        factoryName: 'createStatusPresenter',
        label: 'Status presenter',
        createDeps: () => ({
          chatPlatforms: ctx.actions.chatPlatforms,
          getCompareButton: () => ctx.elements.btnCompare,
          getMirrorEl: ctx.actions.mirrorEl,
          getReloadButton: () => ctx.elements.btnReload,
          getSendButton: () => ctx.elements.btnSend,
          getSettingsButton: () => ctx.elements.btnSettings,
          getStatusEl: () => ctx.elements.statusEl,
          getSummaryStatusEl: () => ctx.elements.summaryStatusEl,
          isQwenApiOk: ctx.isQwenApiOk,
          refreshComparePanel: ctx.actions.refreshComparePanel,
          scrollThreadToBottom: ctx.actions.scrollThreadToBottom,
        }),
      });
    }

    function reportSession() {
      return controller('reportSession', {
        moduleName: 'DuoliReportSession',
        factoryName: 'createReportSession',
        label: 'Report session',
        createDeps: () => ({
          chatPlatforms: ctx.actions.chatPlatforms,
          getRawReplyText: ctx.getRawReplyText,
          getSummaryText: ctx.getSummaryText,
          reporting: ctx.reporting,
        }),
      });
    }

    function truthSeekingRunner() {
      return controller('truthSeekingRunner', {
        moduleName: 'DuoliTruthSeeking',
        factoryName: 'createTruthSeekingRunner',
        label: 'Truth-seeking',
        createDeps: () => ({
          getApi: ctx.getApi,
          getSummaryBodyEl: () => ctx.elements.summaryBodyEl,
          refreshComparePanel: ctx.actions.refreshComparePanel,
          setFlowStage: ctx.actions.setFlowStage,
          completeFlowStage: ctx.actions.completeFlowStage,
          failFlowStage: ctx.actions.failFlowStage,
          showCompareReadyCard: ctx.actions.showCompareReadyCard,
          showDiffDetailsCard: ctx.actions.showDiffDetailsCard,
          chatPlatforms: ctx.actions.chatPlatforms,
          waitUntilGuestLoaded: ctx.actions.waitUntilGuestLoaded,
          setColStatus: ctx.actions.setColStatus,
          askOnePlatform: ctx.actions.askOnePlatform,
          getReplyStableIdleMs: ctx.actions.getReplyStableIdleMs,
          runConcurrentAsk: ctx.actions.runConcurrentAsk,
          onSessionUpdate: (session) => reportSession().setAnalysisSession(session),
        }),
      });
    }

    function analysisOrchestrator() {
      return controller('analysisOrchestrator', {
        moduleName: 'DuoliAnalysisOrchestrator',
        factoryName: 'createAnalysisOrchestrator',
        label: 'Analysis orchestrator',
        createDeps: () => ({
          getSummaryBodyEl: () => ctx.elements.summaryBodyEl,
          isQwenApiOk: ctx.isQwenApiOk,
          refreshComparePanel: ctx.actions.refreshComparePanel,
          runTruthSeekingAnalysis: ctx.actions.runTruthSeekingAnalysis,
          setFlowStage: ctx.actions.setFlowStage,
          completeFlowStage: ctx.actions.completeFlowStage,
          failFlowStage: ctx.actions.failFlowStage,
          showCompareReadyCard: ctx.actions.showCompareReadyCard,
          setSummaryStatus: ctx.actions.setSummaryStatus,
        }),
      });
    }

    function userPreferences() {
      return controller('userPreferences', {
        moduleName: 'DuoliUserPreferences',
        factoryName: 'createUserPreferences',
        label: 'User preferences',
        createDeps: () => ({
          getAutoSummarizeCheckbox: () => document.getElementById('chk-auto-summarize'),
          getReplyIdleCheckbox: () => document.getElementById('chk-reply-idle'),
        }),
      });
    }

    function questionRefiner() {
      return controller('questionRefiner', {
        moduleName: 'DuoliQuestionRefiner',
        factoryName: 'createQuestionRefiner',
        label: 'Question refiner',
        createDeps: () => ({
          getApi: ctx.getApi,
          timeoutMs: 15000,
        }),
      });
    }

    function taskRouter() {
      return controller('taskRouter', {
        moduleName: 'DuoliTaskRouter',
        factoryName: 'createTaskRouter',
        label: 'Task router',
      });
    }

    function aiConversation() {
      return controller('aiConversation', {
        moduleName: 'DuoliAiConversation',
        factoryName: 'createAiConversationController',
        label: 'AI conversation',
        createDeps: () => ({
          getApi: ctx.getApi,
          sleep: ctx.sleep,
          isPlausibleReplyText: ctx.isPlausibleReplyText,
          buildFillScript: ctx.actions.buildFillScript,
          getReplyStableIdleMs: ctx.actions.getReplyStableIdleMs,
          chatPlatforms: ctx.actions.chatPlatforms,
          waitUntilGuestLoaded: ctx.actions.waitUntilGuestLoaded,
          setColStatus: ctx.actions.setColStatus,
          setColBody: ctx.actions.setColBody,
          setSummaryStatus: ctx.actions.setSummaryStatus,
          refreshComparePanel: ctx.actions.refreshComparePanel,
          onQuestionSync: ctx.actions.syncQuestionChip,
          onSummaryWaiting: (idleMs) => {
            if (!ctx.elements.summaryBodyEl) return;
            ctx.elements.summaryBodyEl.textContent =
              idleMs > 0
                ? '等待三站流式输出（正文长时间不再变长后才会进入下一步）…'
                : '等待三站回复…';
          },
          minQuietAfterFirstReplyMs: userPreferences().minQuietAfterFirstReplyMs,
          perPlatformTimeoutMs: 180000,
        }),
      });
    }

    function apiOnlyAnalysisRunner() {
      return controller('apiOnlyAnalysisRunner', {
        moduleName: 'DuoliApiOnlyAnalysisRunner',
        factoryName: 'createApiOnlyAnalysisRunner',
        label: 'API-only analysis runner',
        createDeps: () => ({
          getApi: ctx.getApi,
          setFlowStage: ctx.actions.setFlowStage,
          setSummaryStatus: ctx.actions.setSummaryStatus,
        }),
      });
    }

    function embedBounds() {
      return controller('embedBounds', {
        moduleName: 'DuoliEmbedBounds',
        factoryName: 'createEmbedBoundsReporter',
        label: 'Embed bounds',
        createDeps: () => ({
          getApi: ctx.getApi,
          getPlatforms: ctx.getPlatforms,
        }),
      });
    }

    function uiWiring() {
      return controller('uiWiring', {
        moduleName: 'DuoliUiWiringComposition',
        factoryName: 'createUiWiringFromContext',
        label: 'UI wiring composition',
        createDeps: () => ({
          getApi: ctx.getApi,
          getPlatforms: ctx.getPlatforms,
          getPlatformVisibility: ctx.getPlatformVisibility,
          isQwenApiOk: ctx.isQwenApiOk,
          guestLoaded: ctx.guestLoaded,
          elements: {
            qEl: ctx.elements.qEl,
            btnSend: ctx.elements.btnSend,
            btnCompare: ctx.elements.btnCompare,
            btnReload: ctx.elements.btnReload,
            btnViewMode: ctx.elements.btnViewMode,
            btnOpenCompare: ctx.elements.btnOpenCompare,
            comparePanel: ctx.elements.comparePanel,
            summaryBodyEl: ctx.elements.summaryBodyEl,
            toolMenuEl: ctx.elements.toolMenuEl,
          },
          actions: ctx.actions,
        }),
      });
    }

    function reportExporter() {
      return controller('reportExporter', {
        moduleName: 'DuoliReportExport',
        factoryName: 'createReportExporter',
        label: 'Report export',
        createDeps: () => ({
          getApi: ctx.getApi,
          getButton: () => document.getElementById('btnExportPdf'),
          getSummaryText: ctx.getSummaryText,
          getQuestionText: () => (ctx.elements.qEl ? ctx.elements.qEl.value.trim() : ''),
          buildReportPayload: ctx.actions.buildReportPayload,
        }),
      });
    }

    function licenseGate() {
      return controller('licenseGate', {
        moduleName: 'DuoliLicenseGate',
        factoryName: 'createLicenseGate',
        label: 'License gate',
        createDeps: () => ({
          getApi: ctx.getApi,
          getLicenseGateEl: () => ctx.elements.licenseGateEl,
          getLicenseStateTextEl: () => ctx.elements.licenseStateTextEl,
          getLicenseExpiryTextEl: () => ctx.elements.licenseExpiryTextEl,
          getActivateButton: () => ctx.elements.btnActivateLicense,
          getClearButton: () => ctx.elements.btnClearLicense,
          getTokenInput: () => ctx.elements.licenseTokenInputEl,
          getMessageEl: () => ctx.elements.licenseMsgEl,
          ensureWorkbenchBoot: ctx.actions.ensureWorkbenchBoot,
        }),
      });
    }

    function workbenchBootstrap() {
      return controller('workbenchBootstrap', {
        moduleName: 'DuoliWorkbenchBootstrap',
        factoryName: 'createWorkbenchBootstrap',
        label: 'Workbench bootstrap',
        createDeps: () => ({
          getApi: ctx.getApi,
          getBridge: () => global.duoliulan,
          hasPlatforms: () => ctx.getPlatforms().length > 0,
          isQwenApiOk: ctx.isQwenApiOk,
          setApi: ctx.setApi,
          setPlatforms: ctx.setPlatforms,
          applyQwenStatus: ctx.actions.applyQwenStatus,
          renderPlatformScaffold: ctx.actions.renderPlatformScaffold,
          schedulePushBounds: ctx.actions.schedulePushBounds,
          setLicenseLocked: ctx.actions.setLicenseLocked,
          setStatus: ctx.actions.setStatus,
          setSummaryStatus: ctx.actions.setSummaryStatus,
          syncEmbedHosts: ctx.actions.syncEmbedHosts,
          syncLicenseState: ctx.actions.syncLicenseState,
          wireExportPdf: ctx.actions.wireExportPdf,
          wireLicenseGate: ctx.actions.wireLicenseGate,
          wireSettings: ctx.actions.wireSettings,
          wireUi: ctx.actions.wireUi,
        }),
      });
    }

    function qwenSettings() {
      return controller('qwenSettings', {
        moduleName: 'DuoliQwenSettings',
        factoryName: 'createQwenSettingsController',
        label: 'Qwen settings',
        createDeps: () => ({
          getApi: ctx.getApi,
          getSettingsPanel: () => ctx.elements.settingsPanel,
          getSettingsButton: () => ctx.elements.btnSettings,
          getDashscopeInput: () => ctx.elements.dashscopeKeyInput,
          getKeySourceEl: () => ctx.elements.settingsKeySourceEl,
          getMessageEl: () => ctx.elements.settingsMsgEl,
          getCompareButton: () => ctx.elements.btnCompare,
          onStatusChange: ctx.setQwenApiOk,
        }),
      });
    }

    return {
      aiConversation,
      analysisOrchestrator,
      apiOnlyAnalysisRunner,
      chatFlowPresenter,
      comparePanel,
      composerPresenter,
      embedBounds,
      licenseGate,
      platformPopout,
      platformScaffold,
      platformVisibility,
      qwenSettings,
      reportExporter,
      reportSession,
      statusPresenter,
      questionRefiner,
      taskRouter,
      truthSeekingRunner,
      uiWiring,
      userPreferences,
      workbenchBootstrap,
    };
  }

  global.DuoliAppComposition = {
    createAppComposition,
  };
})(window);
