(function attachAnalysisAuditTrail(global) {
  const DEFAULT_TEXT_LIMIT = 80000;
  const PREVIEW_LIMIT = 1200;
  const SECRET_KEY_PATTERN = /(api[_-]?key|token|secret|password|authorization|cookie|session)/i;

  function nowIso() {
    return new Date().toISOString();
  }

  function clipText(value, limit) {
    const text = String(value == null ? '' : value);
    const max = Number.isFinite(limit) ? limit : DEFAULT_TEXT_LIMIT;
    if (text.length <= max) return text;
    return `${text.slice(0, max)}\n...[truncated ${text.length - max} chars]`;
  }

  function redact(value, depth) {
    const nextDepth = Number.isFinite(depth) ? depth : 0;
    if (nextDepth > 8) return '[max-depth]';
    if (value == null) return value;
    if (typeof value === 'string') return clipText(value, DEFAULT_TEXT_LIMIT);
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) return value.slice(0, 80).map((item) => redact(item, nextDepth + 1));
    if (typeof value === 'object') {
      const output = {};
      Object.entries(value).forEach(([key, item]) => {
        if (SECRET_KEY_PATTERN.test(key)) {
          output[key] = '[redacted]';
          return;
        }
        output[key] = redact(item, nextDepth + 1);
      });
      return output;
    }
    return String(value);
  }

  function previewText(value, limit) {
    return clipText(value, Number.isFinite(limit) ? limit : PREVIEW_LIMIT);
  }

  function compactModelReply(reply) {
    if (!reply) return null;
    return {
      id: reply.id || '',
      name: reply.name || reply.modelName || '',
      ok: !!reply.ok,
      error: reply.error || '',
      textLength: String(reply.text || '').length,
      textPreview: previewText(reply.text || ''),
      text: clipText(reply.text || '', DEFAULT_TEXT_LIMIT),
    };
  }

  function compactModelReplies(replies) {
    return Array.isArray(replies) ? replies.map(compactModelReply) : [];
  }

  function ensureTrail(session) {
    if (!session) return [];
    if (!Array.isArray(session.auditTrail)) session.auditTrail = [];
    return session.auditTrail;
  }

  function record(session, event) {
    if (!session || !event) return null;
    const trail = ensureTrail(session);
    const entry = {
      id: `audit_${String(trail.length + 1).padStart(4, '0')}`,
      at: nowIso(),
      stage: event.stage || 'unknown',
      action: event.action || 'event',
      status: event.status || 'info',
      durationMs: Number.isFinite(event.durationMs) ? Math.max(0, Math.round(event.durationMs)) : 0,
      detail: redact(event.detail || {}),
    };
    trail.push(entry);
    session.updatedAt = entry.at;
    return entry;
  }

  function startTimer() {
    return Date.now();
  }

  function elapsed(startedAt) {
    return Number.isFinite(startedAt) ? Date.now() - startedAt : 0;
  }

  global.DuoliAnalysisAuditTrail = {
    clipText,
    compactModelReply,
    compactModelReplies,
    elapsed,
    previewText,
    record,
    redact,
    startTimer,
  };
})(window);
