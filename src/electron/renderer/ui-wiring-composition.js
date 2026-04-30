(function attachUiWiringComposition(global) {
  function createUiWiringFromContext(ctx) {
    const factory = global.DuoliUiWiring && global.DuoliUiWiring.createUiWiring;
    if (typeof factory !== 'function') {
      throw new Error('UI wiring module is not loaded.');
    }

    const elements = ctx.elements || {};
    const actions = ctx.actions || {};
    return factory({
      getApi: ctx.getApi,
      getPlatforms: ctx.getPlatforms,
      getPlatformVisibility: ctx.getPlatformVisibility,
      getQuestionInput: () => elements.qEl,
      getSendButton: () => elements.btnSend,
      getCompareButton: () => elements.btnCompare,
      getReloadButton: () => elements.btnReload,
      getViewModeButton: () => elements.btnViewMode,
      getOpenCompareButton: () => elements.btnOpenCompare,
      getComparePanel: () => elements.comparePanel,
      getSummaryBodyEl: () => elements.summaryBodyEl,
      getToolMenuEl: () => elements.toolMenuEl,
      isQwenApiOk: ctx.isQwenApiOk,
      guestLoaded: ctx.guestLoaded,
      ...actions,
    });
  }

  global.DuoliUiWiringComposition = {
    createUiWiringFromContext,
  };
})(window);
