(function attachUiWiring(global) {
  function createUiWiring(deps) {
    function $(sel) {
      return document.querySelector(sel);
    }

    function api() {
      return deps.getApi ? deps.getApi() : deps.api;
    }

    function platforms() {
      return deps.getPlatforms ? deps.getPlatforms() : [];
    }

    function platformVisibility() {
      return deps.getPlatformVisibility ? deps.getPlatformVisibility() : {};
    }

    function wireDragPopout() {
      document.querySelectorAll('[data-drag-popout]').forEach((head) => {
        let dragState = null;
        head.addEventListener('pointerdown', (event) => {
          if (event.button !== 0) return;
          if (event.target instanceof Element && event.target.closest('button')) return;
          const id = head.getAttribute('data-drag-popout');
          if (!id || platformVisibility()[id]?.mode !== 'visible') return;
          try {
            head.setPointerCapture(event.pointerId);
          } catch (e) {
            /* ignore */
          }
          dragState = {
            id,
            startX: event.clientX,
            startY: event.clientY,
            popped: false,
          };
          head.classList.add('is-dragging');
        });
        head.addEventListener('pointermove', (event) => {
          if (!dragState || dragState.popped) return;
          const dx = event.clientX - dragState.startX;
          const dy = event.clientY - dragState.startY;
          if (Math.hypot(dx, dy) < 28) return;
          dragState.popped = true;
          head.classList.remove('is-dragging');
          deps.popoutPlatform(dragState.id, {
            x: event.screenX - 180,
            y: event.screenY - 24,
            width: 520,
            height: 900,
          });
        });
        const clearDrag = () => {
          dragState = null;
          head.classList.remove('is-dragging');
        };
        head.addEventListener('pointerup', clearDrag);
        head.addEventListener('pointercancel', clearDrag);
        head.addEventListener('lostpointercapture', clearDrag);
      });
    }

    function wireEmbedEvents() {
      const bridge = api();
      bridge.onEmbedEvent((ev) => {
        if (ev.type === 'dom-ready') {
          deps.guestLoaded.add(ev.id);
          deps.setColStatus(ev.id, '页面就绪（如未登录，请先在该栏完成登录）', '');
        }
        if (ev.type === 'fail-load') {
          deps.setColStatus(ev.id, `加载失败：${ev.errorDescription || ev.errorCode}`, 'err');
        }
      });

      bridge.onEmbedEvent((ev) => {
        if (ev.type === 'host-changed') {
          deps.applyHostMode(ev.id, ev.host);
          deps.renderPlatformVisibility();
        }
      });
    }

    function wireResizeObservers() {
      const stackPanel = document.querySelector('.panel.right.stack');
      if (!stackPanel) return;
      const ro = new ResizeObserver(() => {
        deps.schedulePushBounds();
        deps.positionToolMenu();
      });
      ro.observe(stackPanel);
      platforms().forEach((cfg) => {
        const el = document.getElementById(`slot-${cfg.id}`);
        if (el) ro.observe(el);
      });
      const addToolBtn = document.getElementById('btnAddTool');
      if (addToolBtn) ro.observe(addToolBtn);
    }

    function wireWindowEvents() {
      window.addEventListener('load', () => {
        deps.schedulePushBounds();
        setTimeout(deps.schedulePushBounds, 50);
        setTimeout(deps.schedulePushBounds, 200);
        setTimeout(deps.schedulePushBounds, 800);
        deps.resizeComposerInput();
        const qEl = deps.getQuestionInput();
        if (qEl) qEl.focus();
      });

      window.addEventListener('resize', () => {
        deps.schedulePushBounds();
        deps.positionToolMenu();
      });
    }

    function wireViewMode() {
      const btn = typeof deps.getViewModeButton === 'function' ? deps.getViewModeButton() : null;
      const storageKey = 'duoli:view-mode';
      const applyMode = (mode) => {
        const nextMode = mode === 'debug' ? 'debug' : 'chat';
        document.body.classList.toggle('is-chat-mode', nextMode === 'chat');
        if (btn) {
          btn.textContent = nextMode === 'chat' ? '显示调试视图' : '隐藏浏览器';
          btn.setAttribute('aria-pressed', nextMode === 'debug' ? 'true' : 'false');
          btn.title =
            nextMode === 'chat'
              ? '聊天模式：真实 AI 网页在后台运行'
              : '调试视图：显示真实 AI 网页，便于登录和排查';
        }
        try {
          localStorage.setItem(storageKey, nextMode);
        } catch (e) {
          /* ignore */
        }
        deps.setToolMenuOpen(false);
        deps.renderPlatformVisibility();
        deps.schedulePushBounds();
        setTimeout(deps.schedulePushBounds, 80);
        setTimeout(deps.schedulePushBounds, 260);
      };

      let saved = 'chat';
      try {
        saved = localStorage.getItem(storageKey) || 'chat';
      } catch (e) {
        saved = 'chat';
      }
      applyMode(saved);
      btn?.addEventListener('click', () => {
        applyMode(document.body.classList.contains('is-chat-mode') ? 'debug' : 'chat');
      });
    }

    function wireQuestionInput() {
      const qEl = deps.getQuestionInput();
      const btnSend = deps.getSendButton();
      if (!qEl) return;
      deps.syncQuestionChip(qEl.value);
      deps.resizeComposerInput();
      qEl.addEventListener('input', () => {
        deps.syncQuestionChip(qEl.value);
        deps.resizeComposerInput();
      });
      qEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
          event.preventDefault();
          if (btnSend && !btnSend.disabled) btnSend.click();
        }
      });
    }

    function wireComparePanel() {
      const btnOpenCompare = deps.getOpenCompareButton();
      const comparePanel = deps.getComparePanel();
      if (btnOpenCompare) {
        btnOpenCompare.addEventListener('click', () => deps.openComparePanel());
      }

      $('#btnCloseCompare')?.addEventListener('click', () => deps.closeComparePanel());
      comparePanel?.querySelectorAll('[data-close-compare]').forEach((node) => {
        node.addEventListener('click', () => deps.closeComparePanel());
      });

      $('#btnCopyDiff')?.addEventListener('click', async (event) => {
        const btn = event.currentTarget;
        if (!(btn instanceof HTMLButtonElement)) return;
        const text = deps.getDifferenceText().trim();
        if (!text) {
          btn.textContent = '暂无差异';
          setTimeout(() => {
            btn.textContent = '复制差异内容';
          }, 1400);
          return;
        }
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = '已复制差异';
        } catch (e) {
          btn.textContent = '复制失败';
        } finally {
          setTimeout(() => {
            btn.textContent = '复制差异内容';
          }, 1600);
        }
      });
    }

    function wirePlatformControls() {
      document.querySelectorAll('[data-reload]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-reload');
          if (!id) return;
          deps.guestLoaded.delete(id);
          deps.setColStatus(id, '重新加载中…', '');
          try {
            await api().reloadGuest(id);
          } catch (e) {
            deps.setColStatus(id, `刷新失败：${e.message || e}`, 'err');
          }
          deps.schedulePushBounds();
        });
      });

      document.querySelectorAll('[data-popout]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-popout');
          if (!id) return;
          await deps.popoutPlatform(id);
        });
      });

      document.querySelectorAll('[data-collapse]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-collapse');
          if (!id) return;
          deps.setPlatformMode(id, 'collapsed');
          deps.setStatus('已将 AI 工具收起到右侧工具栏。');
        });
      });

      document.querySelectorAll('[data-close]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-close');
          if (!id) return;
          deps.setPlatformMode(id, 'closed');
          deps.setStatus('已关闭该 AI 工具，可通过“添加 AI 工具”恢复。');
        });
      });
    }

    function wireReloadControls() {
      const btnReload = deps.getReloadButton();
      if (!btnReload) return;
      btnReload.addEventListener('click', async () => {
        deps.chatPlatforms().forEach((cfg) => {
          deps.guestLoaded.delete(cfg.id);
          deps.setColStatus(cfg.id, '重新加载中…', '');
        });
        if (!deps.chatPlatforms().length) {
          deps.setStatus('当前没有可刷新的 AI 工具。');
          return;
        }
        try {
          await Promise.all(deps.chatPlatforms().map((cfg) => api().reloadGuest(cfg.id)));
        } catch (e) {
          deps.setStatus(`重新加载失败：${e.message || e}`);
          return;
        }
        deps.setStatus('已请求刷新全部可用 AI 工具。');
        deps.schedulePushBounds();
      });

      $('#btnDockRefresh')?.addEventListener('click', () => btnReload.click());
    }

    function wireToolMenu() {
      const toolMenuEl = deps.getToolMenuEl();
      if (window.duoliulan && typeof window.duoliulan.onDockOverlayAction === 'function') {
        window.duoliulan.onDockOverlayAction((action) => {
          if (!action || !action.type) return;
          if (action.type === 'refresh') {
            deps.getReloadButton()?.click();
            return;
          }
          if (action.type === 'restore' && action.id) {
            deps.setPlatformMode(action.id, 'visible');
            return;
          }
          if (action.type === 'redock' && action.id && typeof deps.redockPlatform === 'function') {
            deps.redockPlatform(action.id);
          }
        });
      }
      $('#btnAddTool')?.addEventListener('click', (event) => {
        event.stopPropagation();
        if (!toolMenuEl) return;
        const willOpen = toolMenuEl.hasAttribute('hidden');
        deps.renderToolMenu();
        deps.setToolMenuOpen(willOpen);
      });

      document.addEventListener('click', (event) => {
        if (!toolMenuEl || toolMenuEl.hasAttribute('hidden')) return;
        const target = event.target;
        if (!(target instanceof Node)) return;
        const addToolBtn = document.getElementById('btnAddTool');
        if (!toolMenuEl.contains(target) && !(addToolBtn && addToolBtn.contains(target))) {
          deps.setToolMenuOpen(false);
        }
      });
    }

    function wireKeyboardShortcuts() {
      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        const comparePanel = deps.getComparePanel();
        const toolMenuEl = deps.getToolMenuEl();
        if (comparePanel && !comparePanel.hasAttribute('hidden')) {
          deps.closeComparePanel();
          return;
        }
        if (toolMenuEl && !toolMenuEl.hasAttribute('hidden')) {
          deps.setToolMenuOpen(false);
        }
      });
    }

    async function resolveRefinedQuestion(raw) {
      if (typeof deps.refineQuestion !== 'function') {
        throw new Error('问题补全模块不可用，无法进入多模型分发。');
      }
      if (typeof deps.setFlowStage === 'function') {
        deps.setFlowStage('refine', '正在补全问题', '正在把用户原始问题整理成可分发给多个 AI 的高质量任务。', 'active');
      }
      deps.setStatus('正在用千问补全问题…');
      try {
        const result = await deps.refineQuestion(raw);
        if (result && result.refined) {
          if (typeof deps.completeFlowStage === 'function') {
            const preview =
              result.refined && result.refined !== raw
                ? `已补全为：${String(result.refined).slice(0, 90)}${String(result.refined).length > 90 ? '…' : ''}`
                : '千问确认原问题已足够清晰，直接进入多模型分发。';
            deps.completeFlowStage('refine', preview);
          }
          return result;
        }
        throw new Error('千问没有返回有效的补全问题。');
      } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        if (typeof deps.failFlowStage === 'function') {
          deps.failFlowStage('refine', msg);
        }
        deps.setStatus(`补全失败：${msg}`);
        if (e && typeof e === 'object') e.flowStage = 'refine';
        throw e;
      }
    }

    function wireSendButton() {
      const btnSend = deps.getSendButton();
      const qEl = deps.getQuestionInput();
      if (!btnSend || !qEl) return;
      btnSend.addEventListener('click', async () => {
        const raw = qEl.value.trim();
        if (!raw) {
          deps.setStatus('请先输入问题。');
          qEl.focus();
          return;
        }
        if (!deps.chatPlatforms().length) {
          deps.setStatus('请先恢复至少一个 AI 工具。');
          return;
        }
        deps.setBusy(true);
        if (typeof deps.resetChatFlow === 'function') deps.resetChatFlow();
        if (typeof deps.appendUserChatMessage === 'function') deps.appendUserChatMessage(raw);
        deps.syncQuestionChip(raw);
        qEl.value = '';
        if (typeof deps.resizeComposerInput === 'function') deps.resizeComposerInput();
        deps.setStatus('多模型并发执行中…');
        const summaryBodyEl = deps.getSummaryBodyEl();
        if (summaryBodyEl && !deps.getAutoSummarizeAfterSend()) {
          summaryBodyEl.textContent = '本次仅发送到多模型，不自动打开对比弹层；如需结构化分析，请点击“对比”。';
          deps.refreshComparePanel();
        }
        deps.setSummaryStatus('');
        try {
          const { refined, fellBack } = await resolveRefinedQuestion(raw);
          const dispatch = refined || raw;
          deps.syncQuestionChip(dispatch);
          if (!fellBack && dispatch !== raw) {
            deps.setStatus('已用千问补全问题，多模型并发执行中…');
          } else {
            deps.setStatus('多模型并发执行中…');
          }
          if (typeof deps.setFlowStage === 'function') {
            deps.setFlowStage('dispatch', '正在分发给多个 AI', 'Kimi、豆包、元宝等窗口将同步收到同一个问题。', 'active');
          }
          const results = await deps.runConcurrentAsk(dispatch);
          if (typeof deps.completeFlowStage === 'function') {
            deps.completeFlowStage('dispatch', '多模型回复已收集，开始进入结构化分析。');
          }
          if (deps.getAutoSummarizeAfterSend() && deps.isQwenApiOk()) {
            deps.setSummaryStatus('三站已有结果，正在自动生成结构化对比…');
            await deps.runCompareAndSummarize(dispatch, { results, originalQuestion: raw });
            deps.setStatus('发送完成，并已生成结构化对比。');
          } else {
            deps.setStatus('多模型发送完成，可继续点击“对比”生成结构化分析。');
          }
        } catch (e) {
          if (e && e.flowStage === 'refine') {
            /* refine stage already rendered the precise failure */
          } else if (typeof deps.failFlowStage === 'function') {
            deps.failFlowStage('dispatch', e.message || String(e));
          }
          deps.setStatus(`失败：${e.message || e}`);
        } finally {
          deps.setBusy(false);
        }
      });
    }

    function wireCompareButton() {
      const btnCompare = deps.getCompareButton();
      const qEl = deps.getQuestionInput();
      if (!btnCompare || !qEl) return;
      btnCompare.addEventListener('click', async () => {
        const raw = qEl.value.trim();
        if (!raw) {
          deps.setStatus('请先输入问题。');
          qEl.focus();
          return;
        }
        if (!deps.isQwenApiOk()) {
          deps.setStatus('未配置 DashScope API Key，当前无法使用对比。');
          return;
        }
        if (!deps.chatPlatforms().length) {
          deps.setStatus('请先恢复至少一个 AI 工具。');
          return;
        }
        deps.setBusy(true);
        if (typeof deps.resetChatFlow === 'function') deps.resetChatFlow();
        if (typeof deps.appendUserChatMessage === 'function') deps.appendUserChatMessage(raw);
        deps.syncQuestionChip(raw);
        qEl.value = '';
        if (typeof deps.resizeComposerInput === 'function') deps.resizeComposerInput();
        deps.setStatus('对比流程：多模型并发 -> 结构化总结');
        try {
          const { refined, fellBack } = await resolveRefinedQuestion(raw);
          const dispatch = refined || raw;
          deps.syncQuestionChip(dispatch);
          if (!fellBack && dispatch !== raw) {
            deps.setStatus('已用千问补全问题，开始多模型并发对比…');
          } else {
            deps.setStatus('对比流程：多模型并发 -> 结构化总结');
          }
          if (typeof deps.setFlowStage === 'function') {
            deps.setFlowStage('dispatch', '正在分发给多个 AI', '多个 AI 正在并行作答，系统会等待回复稳定后再进入分析。', 'active');
          }
          await deps.runCompareAndSummarize(dispatch, { originalQuestion: raw });
          deps.setStatus('对比流程已完成。');
        } catch (e) {
          if (e && e.flowStage === 'refine') {
            /* refine stage already rendered the precise failure */
          } else if (typeof deps.failFlowStage === 'function') {
            deps.failFlowStage('report', e.message || String(e));
          }
          deps.setStatus(`失败：${e.message || e}`);
          deps.setSummaryStatus(e.message || String(e));
        } finally {
          deps.setBusy(false);
        }
      });
    }

    function wire() {
      deps.ensurePlatformVisibilityState();
      deps.ensurePopoutButtons();
      wireDragPopout();
      wireEmbedEvents();
      wireResizeObservers();
      wireWindowEvents();
      wireViewMode();
      wireQuestionInput();
      wireComparePanel();
      wirePlatformControls();
      wireReloadControls();
      wireToolMenu();
      wireKeyboardShortcuts();
      wireSendButton();
      wireCompareButton();
      deps.ensurePlatformVisibilityState();
      deps.renderPlatformVisibility();
    }

    return {
      wire,
      wireDragPopout,
    };
  }

  global.DuoliUiWiring = {
    createUiWiring,
  };
})(window);
