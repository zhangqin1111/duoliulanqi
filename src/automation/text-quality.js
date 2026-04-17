/** 过滤 UUID / 纯 hex / 无空白长 token，避免把接口里的 id 当成「回复正文」。 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function looksLikeIdOrToken(s) {
  const t = String(s || '').trim();
  if (t.length < 8) return false;
  if (UUID_RE.test(t)) return true;
  if (t.length >= 20 && t.length <= 256 && /^[0-9a-f]+$/i.test(t)) return true;
  if (
    t.length >= 32 &&
    !/\s/.test(t) &&
    /^[a-zA-Z0-9_-]+$/.test(t) &&
    !/[\u4e00-\u9fff]/.test(t)
  ) {
    return true;
  }
  return false;
}

function isPlausibleReplyText(s) {
  const t = String(s || '').trim();
  if (t.length < 2) return false;
  if (looksLikeIdOrToken(t)) return false;
  if (/[\u4e00-\u9fff]/.test(t)) return true;
  if (/\s/.test(t) && t.length >= 8) return true;
  if (/[.。!！?？,，;；:'"「」]/.test(t) && t.length >= 6) return true;
  if (t.includes('\n') && t.length >= 16) return true;
  if (/[a-zA-Z]{4,}/.test(t) && t.length >= 16) return true;
  return false;
}

/** 优先返回像正文的片段；都不可靠时返回空串（由上层继续等或报错）。 */
function chooseDisplayedText(dom, net) {
  const d = String(dom || '').trim();
  const n = String(net || '').trim();
  const dOk = isPlausibleReplyText(d);
  const nOk = isPlausibleReplyText(n);
  if (dOk && nOk) return d.length >= n.length ? d : n;
  if (dOk) return d;
  if (nOk) return n;
  return '';
}

module.exports = { looksLikeIdOrToken, isPlausibleReplyText, chooseDisplayedText };
