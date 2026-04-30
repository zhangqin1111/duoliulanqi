(function attachReplyQuality(global) {
  // Keep this in sync with src/automation/text-quality.js. The renderer cannot require that file directly.
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function looksLikeIdOrToken(value) {
    const text = String(value || '').trim();
    if (text.length < 8) return false;
    if (UUID_RE.test(text)) return true;
    if (text.length >= 20 && text.length <= 256 && /^[0-9a-f]+$/i.test(text)) return true;
    if (
      text.length >= 32 &&
      !/\s/.test(text) &&
      /^[a-zA-Z0-9_-]+$/.test(text) &&
      !/[\u4e00-\u9fff]/.test(text)
    ) {
      return true;
    }
    return false;
  }

  function isPlausibleReplyText(value) {
    const text = String(value || '').trim();
    if (text.length < 2) return false;
    if (looksLikeIdOrToken(text)) return false;
    if (/[\u4e00-\u9fff]/.test(text)) return true;
    if (/\s/.test(text) && text.length >= 8) return true;
    if (/[.。；，、!?'"“”]/.test(text) && text.length >= 6) return true;
    if (text.includes('\n') && text.length >= 16) return true;
    if (/[a-zA-Z]{4,}/.test(text) && text.length >= 16) return true;
    return false;
  }

  global.DuoliReplyQuality = {
    isPlausibleReplyText,
    looksLikeIdOrToken,
  };
})(window);
