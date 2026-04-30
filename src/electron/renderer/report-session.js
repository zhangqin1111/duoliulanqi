(function attachReportSession(global) {
  function createReportSession(deps) {
    let analysisSession = null;

    function setAnalysisSession(session) {
      analysisSession = session || null;
    }

    function getAnalysisSession() {
      return analysisSession;
    }

    function collectRawReplies() {
      return deps.chatPlatforms().map((cfg) => ({
        id: cfg.id,
        name: cfg.name,
        text: deps.getRawReplyText(cfg.id),
      }));
    }

    function buildReportPayload(questionText) {
      return deps.reporting().buildReportPayload({
        questionText,
        summaryText: deps.getSummaryText(),
        rawReplies: collectRawReplies(),
        analysisSession,
      });
    }

    return {
      buildReportPayload,
      collectRawReplies,
      getAnalysisSession,
      setAnalysisSession,
    };
  }

  global.DuoliReportSession = {
    createReportSession,
  };
})(window);
