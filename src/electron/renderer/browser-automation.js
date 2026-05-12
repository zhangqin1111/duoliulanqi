(function attachBrowserAutomation(global) {
function buildFillScript(text, cfg) {
  const meta = {
    inputSelectors: cfg.inputSelectors || [],
    submitButtonSelectors: cfg.submitButtonSelectors || [],
    useComposerSubmit: !!cfg.useComposerSubmit,
    syncInputAggressive: !!cfg.syncInputAggressive,
    strictInputSync: !!cfg.strictInputSync,
    exactInputOnly: !!cfg.exactInputOnly,
    minimalSubmitClicks: !!cfg.minimalSubmitClicks,
    submitViaEnter: !!cfg.submitViaEnter,
    preSubmitDelayMs: Math.max(0, Number(cfg.preSubmitDelayMs) || 0),
  };
  return `(async function() {
    var text = ${JSON.stringify(text)};
    var inputSelectors = ${JSON.stringify(meta.inputSelectors)};
    var submitSelectors = ${JSON.stringify(meta.submitButtonSelectors)};
    var useComposerSubmit = ${JSON.stringify(meta.useComposerSubmit)};
    var syncInputAggressive = ${JSON.stringify(meta.syncInputAggressive)};
    var strictInputSync = ${JSON.stringify(meta.strictInputSync)};
    var exactInputOnly = ${JSON.stringify(meta.exactInputOnly)};
    var minimalSubmitClicks = ${JSON.stringify(meta.minimalSubmitClicks)};
    var submitViaEnter = ${JSON.stringify(meta.submitViaEnter)};
    var preSubmitDelayMs = ${JSON.stringify(meta.preSubmitDelayMs)};
    function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
    function visible(el) {
      if (!el || el.disabled) return false;
      var r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      var st = window.getComputedStyle(el);
      if (st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) === 0) return false;
      return true;
    }
    function nativeValueSetter(el, val) {
      try {
        var proto = el.tagName === 'TEXTAREA'
          ? window.HTMLTextAreaElement.prototype
          : (el.tagName === 'INPUT' ? window.HTMLInputElement.prototype : null);
        if (proto) {
          var desc = Object.getOwnPropertyDescriptor(proto, 'value');
          if (desc && desc.set) desc.set.call(el, val);
          else el.value = val;
          return true;
        }
      } catch (e0) {}
      return false;
    }
    function dispatchSyncEvents(el, val) {
      if (strictInputSync || exactInputOnly) {
        try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e0) {}
        try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e00) {}
        try { el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: val })); } catch (e000) {}
        return;
      }
      try { el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: val })); } catch (e1) {}
      try { el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: val })); } catch (e2) {}
      try { el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: val })); } catch (e3) {}
      try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e4) {}
      try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e5) {}
      try { el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: val })); } catch (e6) {}
      try { el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Process', bubbles: true })); } catch (e7) {}
      try { el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true })); } catch (e8) {}
    }
    function forceExactText(el, val) {
      if (!el) return;
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        if ((el.value || '') !== val) nativeValueSetter(el, val);
        return;
      }
      if (el.isContentEditable || el.getAttribute('role') === 'textbox') {
        var current = (el.innerText || el.textContent || '');
        if (current !== val) {
          try { el.textContent = val; } catch (e0) {}
        }
      }
    }
    function normalizeForCompare(val) {
      return String(val || '').replace(/\\s+/g, '');
    }
    function isRepeatedText(current, expected) {
      var compactCurrent = normalizeForCompare(current);
      var compactExpected = normalizeForCompare(expected);
      if (!compactCurrent || !compactExpected) return false;
      if (compactCurrent === compactExpected) return false;
      if (compactCurrent.length % compactExpected.length !== 0) return false;
      return compactExpected.repeat(compactCurrent.length / compactExpected.length) === compactCurrent;
    }
    function clearEditable(el) {
      if (!el) return;
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        nativeValueSetter(el, '');
        return;
      }
      if (el.isContentEditable || el.getAttribute('role') === 'textbox') {
        el.focus();
        selectEditableContents(el);
        try { el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'deleteContentBackward', data: null })); } catch (e00) {}
        try { document.execCommand('delete', false, null); } catch (e0) {}
        try { el.innerHTML = ''; } catch (e1) {}
        try { el.textContent = ''; } catch (e2) {}
        try { el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward', data: null })); } catch (e3) {}
        try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e4) {}
      }
    }
    function readInputText(el) {
      if (!el) return '';
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value || '';
      return el.innerText || el.textContent || '';
    }
    function selectEditableContents(el) {
      if (!el) return;
      try {
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e0) {}
    }
    function insertTextOnce(el, val) {
      if (!el) return;
      el.focus();
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        nativeValueSetter(el, val);
        dispatchSyncEvents(el, val);
        return;
      }
      if (exactInputOnly) {
        writeExactEditableText(el, val);
        return;
      }
      try { document.execCommand('insertText', false, val); } catch (e0) {}
      dispatchSyncEvents(el, val);
      if ((readInputText(el) || '').replace(/\\s+/g, '') !== String(val || '').replace(/\\s+/g, '')) {
        try { el.textContent = val; } catch (e1) {}
        dispatchSyncEvents(el, val);
      }
    }
    function writeExactEditableText(el, val) {
      if (!el) return;
      clearEditable(el);
      awaitMicrotaskSafeFocus(el);
      try { document.execCommand('insertText', false, val); } catch (e0) {}
      dispatchSyncEvents(el, val);
      if (normalizeForCompare(readInputText(el)) !== normalizeForCompare(val)) {
        clearEditable(el);
        try { el.textContent = val; } catch (e1) {}
        dispatchSyncEvents(el, val);
      }
    }
    function awaitMicrotaskSafeFocus(el) {
      try { el.focus(); } catch (e0) {}
      selectEditableContents(el);
    }
    function pickLargestVisibleTextarea() {
      var best = null;
      var bestArea = 0;
      var tas = document.querySelectorAll('textarea');
      for (var i = 0; i < tas.length; i++) {
        if (!visible(tas[i])) continue;
        var r = tas[i].getBoundingClientRect();
        var area = r.width * r.height;
        if (area > bestArea) {
          bestArea = area;
          best = tas[i];
        }
      }
      return best;
    }
    function findInput() {
      var el = null;
      if (syncInputAggressive && useComposerSubmit) {
        el = pickLargestVisibleTextarea();
      }
      if (!el) {
        for (var i = 0; i < inputSelectors.length; i++) {
          try {
            var hit = document.querySelector(inputSelectors[i]);
            if (visible(hit)) {
              el = hit;
              break;
            }
          } catch (e0) {}
        }
      }
      if (!el) el = pickLargestVisibleTextarea();
      if (!el) {
        var editable = Array.prototype.slice.call(document.querySelectorAll('[contenteditable="true"], [role="textbox"]'));
        for (var j = editable.length - 1; j >= 0; j--) {
          if (visible(editable[j])) {
            el = editable[j];
            break;
          }
        }
      }
      return el;
    }
    function fireEnterOn(el) {
      if (!el) return;
      el.focus();
      var t = document.activeElement || el;
      ['keydown', 'keypress', 'keyup'].forEach(function(name) {
        try {
          t.dispatchEvent(new KeyboardEvent(name, {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
          }));
        } catch (e0) {}
      });
    }
    function clickNode(n) {
      if (!n || !visible(n)) return false;
      try { n.click(); return true; } catch (e0) {}
      try {
        n.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        return true;
      } catch (e1) {}
      return false;
    }
    function tryClickConfigured() {
      for (var i = 0; i < submitSelectors.length; i++) {
        try {
          var nodes = Array.prototype.slice.call(document.querySelectorAll(submitSelectors[i]));
          for (var j = nodes.length - 1; j >= 0; j--) {
            if (clickNode(nodes[j])) return true;
          }
        } catch (e0) {}
      }
      return false;
    }
    function tryClickComposerSend(inp) {
      if (!inp || !inp.getBoundingClientRect) return false;
      var r0 = inp.getBoundingClientRect();
      var p = inp.parentElement;
      for (var depth = 0; depth < 14 && p; depth++) {
        var nodes = Array.prototype.slice.call(p.querySelectorAll('button, [role="button"], div[tabindex="0"]'));
        nodes = nodes.filter(function(n) {
          if (n === inp || inp.contains(n) || n.contains(inp)) return false;
          if (!visible(n)) return false;
          var br = n.getBoundingClientRect();
          if (br.width < 4 || br.height < 4) return false;
          var cx = br.left + br.width / 2;
          var cy = br.top + br.height / 2;
          return cy >= r0.top - 48 && cy <= r0.bottom + 72 && cx >= r0.left + Math.min(120, r0.width * 0.25);
        });
        nodes.sort(function(a, b) {
          var ar = a.getBoundingClientRect();
          var br = b.getBoundingClientRect();
          return (br.left + br.width / 2) - (ar.left + ar.width / 2);
        });
        for (var i = 0; i < nodes.length; i++) {
          if (clickNode(nodes[i])) return true;
        }
        p = p.parentElement;
      }
      return false;
    }
    function tryClickByText() {
      var all = Array.prototype.slice.call(document.querySelectorAll('button, [role="button"]'));
      all.sort(function(a, b) {
        return (b.getBoundingClientRect().bottom || 0) - (a.getBoundingClientRect().bottom || 0);
      });
      for (var i = 0; i < all.length; i++) {
        var btn = all[i];
        if (!visible(btn) || btn.disabled) continue;
        var tx = (btn.innerText || btn.textContent || '').replace(/\\s+/g, ' ').trim();
        var label = (btn.getAttribute('aria-label') || '').trim();
        if (/发送|send|提交/.test(tx) || /发送|send|提交/.test(label)) {
          if (clickNode(btn)) return true;
        }
      }
      return false;
    }
    var el = findInput();
    if (!el) throw new Error('找不到输入框');
    el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    await sleep(80);
    el.focus();
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      try { el.select(); } catch (e1) {
        try { el.setSelectionRange(0, (el.value || '').length); } catch (e2) {}
      }
      nativeValueSetter(el, '');
      dispatchSyncEvents(el, '');
      await sleep(50);
      if (!strictInputSync) {
        try { document.execCommand('insertText', false, text); } catch (e3) {}
      }
      nativeValueSetter(el, text);
      dispatchSyncEvents(el, text);
      forceExactText(el, text);
      if (syncInputAggressive) {
        await sleep(80);
        dispatchSyncEvents(el, text);
        forceExactText(el, text);
        try { el.blur(); } catch (e4) {}
        await sleep(40);
        el.focus();
        dispatchSyncEvents(el, text);
        forceExactText(el, text);
      }
    } else if (strictInputSync && (el.isContentEditable || el.getAttribute('role') === 'textbox')) {
      selectEditableContents(el);
      try { document.execCommand('delete', false, null); } catch (e5a) {}
      try { el.textContent = ''; } catch (e5b) {}
      dispatchSyncEvents(el, '');
      await sleep(50);
      insertTextOnce(el, text);
    } else if (el.isContentEditable || el.getAttribute('role') === 'textbox') {
      if (exactInputOnly) {
        writeExactEditableText(el, text);
      } else {
        clearEditable(el);
        el.focus();
        if (!strictInputSync) {
          try { document.execCommand('insertText', false, text); } catch (e6) {}
        }
        try { el.textContent = text; } catch (e7) {}
        dispatchSyncEvents(el, text);
        forceExactText(el, text);
      }
    } else {
      throw new Error('无法写入输入框');
    }
    await sleep(260 + Math.floor(Math.random() * 180) + preSubmitDelayMs);
    if (isRepeatedText(readInputText(el), text)) {
      if (exactInputOnly && (el.isContentEditable || el.getAttribute('role') === 'textbox')) {
        writeExactEditableText(el, text);
      } else {
        forceExactText(el, text);
        dispatchSyncEvents(el, text);
      }
      await sleep(80);
      if (isRepeatedText(readInputText(el), text)) {
        clearEditable(el);
        try { document.execCommand('insertText', false, text); } catch (e6) {}
        dispatchSyncEvents(el, text);
      }
    }
    function doSubmit() {
      if (useComposerSubmit && tryClickComposerSend(el)) return true;
      if (tryClickConfigured()) return true;
      if (tryClickByText()) return true;
      return false;
    }
    if (submitViaEnter) {
      fireEnterOn(el);
    } else if (minimalSubmitClicks) {
      doSubmit();
    } else {
      var clicked = doSubmit();
      if (!clicked) {
        await sleep(180);
        clicked = doSubmit();
      }
      if (!clicked) {
        fireEnterOn(el);
        await sleep(150);
        doSubmit();
      }
    }
    return 'ok';
  })()`;
}

  global.DuoliBrowserAutomation = {
    buildFillScript,
  };
})(window);
