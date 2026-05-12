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
      if (analysisSession && Array.isArray(analysisSession.initialResults) && analysisSession.initialResults.length) {
        return analysisSession.initialResults.map((reply) => ({
          id: reply.id,
          name: reply.name,
          text: reply.text || '',
          ok: reply.ok !== false,
          error: reply.error || '',
        }));
      }
      return deps.chatPlatforms().map((cfg) => ({
        id: cfg.id,
        name: cfg.name,
        text: deps.getRawReplyText(cfg.id),
      }));
    }

    function buildReportPayload(questionText) {
      const sessionQuestion = analysisSession && analysisSession.question ? analysisSession.question : '';
      const originalQuestion = analysisSession && analysisSession.originalQuestion ? analysisSession.originalQuestion : '';
      return deps.reporting().buildReportPayload({
        questionText: String(questionText || '').trim() || originalQuestion || sessionQuestion,
        summaryText: deps.getSummaryText(),
        rawReplies: collectRawReplies(),
        analysisSession,
        structuredReport:
          analysisSession && analysisSession.structuredReport && typeof analysisSession.structuredReport === 'object'
            ? analysisSession.structuredReport
            : null,
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
