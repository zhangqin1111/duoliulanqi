(function attachAiConversation(global) {
  function createAiConversationController(deps) {
    const minQuietAfterFirstReplyMs = Number(deps.minQuietAfterFirstReplyMs) || 8000;

    function sleep(ms) {
      return typeof deps.sleep === 'function'
        ? deps.sleep(ms)
        : new Promise((resolve) => setTimeout(resolve, ms));
    }

    function isPlausibleReplyText(text) {
      return typeof deps.isPlausibleReplyText === 'function' ? deps.isPlausibleReplyText(text) : !!String(text || '').trim();
    }

    async function guestExec(id, code) {
      const api = typeof deps.getApi === 'function' ? deps.getApi() : deps.api;
      if (!api || typeof api.guestExec !== 'function') {
        throw new Error('Guest execution API is not available.');
      }
      return api.guestExec(id, code);
    }

    function buildFillScript(text, cfg) {
      if (typeof deps.buildFillScript !== 'function') {
        throw new Error('Fill script builder is not available.');
      }
      return deps.buildFillScript(text, cfg);
    }

    function pickFirstPlausible(candidates) {
      if (!Array.isArray(candidates)) return '';
      let best = '';
      for (const text of candidates) {
        if (isPlausibleReplyText(text) && text.length > best.length) best = text;
      }
      return best;
    }

    function buildExtractScript(selectors, minLen) {
      return `(function() {
        var sels = ${JSON.stringify(selectors)};
        var min = ${Number(minLen)};
        var out = [];
        var seen = {};
        var skipClassRe = /suggest|recommend|related|question-chip|follow.?up|guessyoulike|猜你想问/i;
        function isSuggestionContainer(el) {
          try {
            var cls = (el.className || '') + ' ' + (el.getAttribute('data-testid') || '');
            if (skipClassRe.test(cls)) return true;
            var p = el.parentElement;
            if (p) {
              var pcls = (p.className || '') + ' ' + (p.getAttribute('data-testid') || '');
              if (skipClassRe.test(pcls)) return true;
            }
          } catch (e2) {}
          return false;
        }
        for (var si = 0; si < sels.length; si++) {
          try {
            var nodes = Array.prototype.slice.call(document.querySelectorAll(sels[si]));
            for (var i = nodes.length - 1; i >= 0; i--) {
              if (isSuggestionContainer(nodes[i])) continue;
              var t = (nodes[i].innerText || '').trim();
              if (t.length >= min && !seen[t]) { seen[t] = true; out.push(t); }
            }
          } catch (e) {}
        }
        return out;
      })()`;
    }

    async function extractPlausible(id, selectors, minLen) {
      const candidates = await guestExec(id, buildExtractScript(selectors, minLen));
      return pickFirstPlausible(candidates) || '';
    }

    async function tryFillAndSubmit(cfg, text) {
      await guestExec(cfg.id, buildFillScript(text, cfg));
    }

    function extractMatchesCompareFormat(candidates, successHints) {
      if (!Array.isArray(candidates) || !successHints.length) return '';
      for (const text of candidates) {
        if (typeof text !== 'string' || !text.trim()) continue;
        if (!successHints.every((hint) => text.includes(hint))) continue;
        if (!isPlausibleReplyText(text) || text.length < 24) continue;
        return text.trim();
      }
      const merged = candidates
        .filter((item) => typeof item === 'string' && item.trim())
        .join('\n\n')
        .trim();
      if (merged && successHints.every((hint) => merged.includes(hint)) && isPlausibleReplyText(merged)) {
        return merged;
      }
      return '';
    }

    async function waitGuestReply(id, responseSelectors, snippetBefore, timeoutMs, successHints, stableOpts) {
      const hints = Array.isArray(successHints) && successHints.length ? successHints : null;
      const idleMs =
        stableOpts && typeof stableOpts.replyStableIdleMs === 'number' && stableOpts.replyStableIdleMs > 0
          ? stableOpts.replyStableIdleMs
          : 0;
      const minQuietAfterFirst =
        typeof stableOpts?.minQuietAfterFirstReplyMs === 'number'
          ? stableOpts.minQuietAfterFirstReplyMs
          : minQuietAfterFirstReplyMs;
      const minStable = (stableOpts && stableOpts.minStableChars) || 14;
      const baseSnippet = String(snippetBefore || '');
      let stableStr = null;
      let stableSince = 0;
      let firstGrowthAt = null;
      let lastLen = baseSnippet.length;
      const deadline = Date.now() + timeoutMs;
      let lastDom = snippetBefore || '';
      while (Date.now() < deadline) {
        const candidates = await guestExec(id, buildExtractScript(responseSelectors, 8));
        if (hints) {
          const hit = extractMatchesCompareFormat(candidates, hints);
          if (hit) return hit;
        }
        const dom = pickFirstPlausible(candidates) || '';
        const domLen = dom.length;
        if (idleMs > 0 && dom && isPlausibleReplyText(dom) && dom.length >= minStable) {
          const grown = dom.length > baseSnippet.length + 6 || (baseSnippet.length < 10 && dom !== baseSnippet);
          if (grown) {
            if (!firstGrowthAt) firstGrowthAt = Date.now();
            if (domLen > lastLen) {
              lastLen = domLen;
              stableStr = dom;
              stableSince = Date.now();
            } else if (dom === stableStr && Date.now() - stableSince >= idleMs) {
              if (firstGrowthAt && Date.now() - firstGrowthAt >= minQuietAfterFirst) {
                return dom.trim();
              }
            }
          } else {
            stableStr = null;
          }
        } else {
          stableStr = null;
        }
        const domGrew = dom && dom.length > (lastDom?.length || 0) + 8;
        if (domGrew) {
          lastDom = dom;
          if (dom.length > lastLen) lastLen = dom.length;
        }
        if (idleMs <= 0 && domGrew && dom.trim().length >= 12) {
          await sleep(450 + Math.random() * 250);
          const c2 = await guestExec(id, buildExtractScript(responseSelectors, 8));
          if (hints) {
            const hit2 = extractMatchesCompareFormat(c2, hints);
            if (hit2) return hit2;
          }
          const dom2 = pickFirstPlausible(c2) || '';
          const best = dom2.length >= dom.length ? dom2 : dom;
          if (isPlausibleReplyText(best)) return best.trim();
        }
        await sleep(550 + Math.random() * 350);
      }
      const tail = await guestExec(id, buildExtractScript(responseSelectors, 12));
      if (hints && Array.isArray(tail)) {
        const hit = extractMatchesCompareFormat(tail, hints);
        if (hit) return hit;
      }
      return (await extractPlausible(id, responseSelectors, 12)).trim();
    }

    async function askOnePlatform(cfg, question, opts) {
      const options = opts || {};
      const retries = options.retries ?? 2;
      const responseTimeoutMs = options.responseTimeoutMs ?? 120000;
      const successHints = options.compareSuccessHints || null;
      const replyStableIdleMs =
        typeof options.replyStableIdleMs === 'number' ? options.replyStableIdleMs : deps.getReplyStableIdleMs();
      let snippetBefore = await extractPlausible(cfg.id, cfg.responseSelectors, 20);
      let lastErr = '';
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          if (attempt > 0) {
            await sleep(1500 + Math.random() * 2000);
            snippetBefore = await extractPlausible(cfg.id, cfg.responseSelectors, 20);
          }
          await tryFillAndSubmit(cfg, question);
          await sleep(cfg.settleMs + Math.floor(Math.random() * 600));
          const text = await waitGuestReply(
            cfg.id,
            cfg.responseSelectors,
            snippetBefore,
            responseTimeoutMs,
            successHints,
            {
              replyStableIdleMs,
              minStableChars: options.minStableChars ?? 14,
              minQuietAfterFirstReplyMs:
                typeof options.minQuietAfterFirstReplyMs === 'number'
                  ? options.minQuietAfterFirstReplyMs
                  : minQuietAfterFirstReplyMs,
            }
          );
          if (!text || !isPlausibleReplyText(text)) {
            throw new Error('未抓到有效回复（选择器可能已变）');
          }
          return { ok: true, text: text.trim() };
        } catch (e) {
          lastErr = e && e.message ? e.message : String(e);
        }
      }
      return { ok: false, error: lastErr };
    }

    async function runConcurrentAsk(question) {
      const idleMs = deps.getReplyStableIdleMs();
      if (typeof deps.onQuestionSync === 'function') deps.onQuestionSync(question);
      if (typeof deps.onSummaryWaiting === 'function') deps.onSummaryWaiting(idleMs);
      if (typeof deps.refreshComparePanel === 'function') deps.refreshComparePanel();
      if (typeof deps.setSummaryStatus === 'function') deps.setSummaryStatus('三站并发中…');

      const chats = deps.chatPlatforms();
      await Promise.all(chats.map((cfg) => deps.waitUntilGuestLoaded(cfg.id, 90000)));
      chats.forEach((cfg) => {
        deps.setColStatus(cfg.id, '正在发送 / 等待回复…', '');
        deps.setColBody(cfg.id, '');
      });

      const responseTimeoutMs = Number(deps.perPlatformTimeoutMs) || 45000;
      return Promise.all(
        chats.map(async (cfg) => {
          const r = await askOnePlatform(cfg, question, {
            replyStableIdleMs: idleMs,
            responseTimeoutMs,
            retries: 0,
          });
          if (r.ok) {
            deps.setColStatus(cfg.id, '完成', 'ok');
            deps.setColBody(cfg.id, r.text || '');
          } else {
            deps.setColStatus(cfg.id, `超时/错误：${r.error || ''}`, 'err');
          }
          return { cfg, r };
        })
      );
    }

    return {
      askOnePlatform,
      buildExtractScript,
      extractPlausible,
      guestExec,
      runConcurrentAsk,
      waitGuestReply,
    };
  }

  global.DuoliAiConversation = {
    createAiConversationController,
  };
})(window);
