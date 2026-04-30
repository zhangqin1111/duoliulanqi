(function attachPlatformVisibility(global) {
  function createPlatformVisibilityController(deps) {
    const state = deps.state || {};
    const getPlatforms = deps.getPlatforms;

    function platforms() {
      return typeof getPlatforms === 'function' ? getPlatforms() : [];
    }

    function platformCardEl(id) {
      return document.querySelector(`.embed-col[data-id="${id}"]`);
    }

    function ensureState() {
      platforms().forEach((cfg) => {
        if (!state[cfg.id]) {
          state[cfg.id] = { mode: cfg.defaultMode || 'visible' };
        }
      });
    }

    function chatPlatforms() {
      return platforms().filter((cfg) => state[cfg.id]?.mode !== 'closed');
    }

    function restorePlatform(id) {
      if (!state[id]) state[id] = { mode: 'visible' };
      state[id].mode = 'visible';
      render();
    }

    function setPlatformMode(id, mode) {
      if (!state[id]) state[id] = { mode: 'visible' };
      state[id].mode = mode;
      render();
    }

    function renderToolMenu() {
      const toolMenuEl = deps.getToolMenuEl ? deps.getToolMenuEl() : null;
      if (!toolMenuEl) return;
      const closeds = platforms().filter((cfg) => state[cfg.id]?.mode === 'closed');
      if (!closeds.length) {
        toolMenuEl.innerHTML = '<button type="button" disabled>当前没有已关闭的 AI 工具</button>';
        return;
      }
      toolMenuEl.innerHTML = closeds
        .map((cfg) => `<button type="button" data-restore-tool="${cfg.id}"><span>${cfg.name}</span><span>恢复</span></button>`)
        .join('');
      toolMenuEl.querySelectorAll('[data-restore-tool]').forEach((btn) => {
        btn.addEventListener('click', () => {
          restorePlatform(btn.getAttribute('data-restore-tool'));
          if (typeof deps.setToolMenuOpen === 'function') deps.setToolMenuOpen(false);
        });
      });
    }

    function renderDockIcons() {
      const dockIconsEl = deps.getDockIconsEl ? deps.getDockIconsEl() : null;
      if (!dockIconsEl) return;
      const iconPlatforms = platforms().filter((cfg) => {
        const mode = state[cfg.id]?.mode;
        return mode === 'collapsed' || mode === 'detached';
      });
      dockIconsEl.innerHTML = iconPlatforms
        .map((cfg) => {
          const mode = state[cfg.id]?.mode;
          const actionAttr = mode === 'detached' ? `data-redock-platform="${cfg.id}"` : `data-restore-collapsed="${cfg.id}"`;
          const extraClass = mode === 'detached' ? ' dock-icon--detached' : '';
          const title = mode === 'detached' ? `收回 ${cfg.name}` : `恢复 ${cfg.name}`;
          return `<button type="button" class="dock-icon${extraClass}" data-platform="${cfg.id}" ${actionAttr} title="${title}">${cfg.name.slice(0, 1)}</button>`;
        })
        .join('');
      dockIconsEl.querySelectorAll('[data-restore-collapsed]').forEach((btn) => {
        btn.addEventListener('click', () => restorePlatform(btn.getAttribute('data-restore-collapsed')));
      });
      dockIconsEl.querySelectorAll('[data-redock-platform]').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (typeof deps.redockPlatform === 'function') {
            deps.redockPlatform(btn.getAttribute('data-redock-platform'));
          }
        });
      });
    }

    function render() {
      const embedsRowEl = deps.getEmbedsRowEl ? deps.getEmbedsRowEl() : document.getElementById('embeds-row');
      let visibleCount = 0;
      platforms().forEach((cfg) => {
        const card = platformCardEl(cfg.id);
        const mirrorCard = document.querySelector(`[data-mirror-card="${cfg.id}"]`);
        const mode = state[cfg.id]?.mode || cfg.defaultMode || 'visible';
        const isVisible = mode === 'visible';
        if (card) {
          card.classList.toggle('is-hidden', !isVisible);
          card.classList.toggle('is-detached', mode === 'detached');
        }
        if (mirrorCard) {
          mirrorCard.classList.toggle('is-hidden', mode === 'closed');
        }
        if (isVisible) visibleCount += 1;
      });
      if (embedsRowEl) {
        const safeVisibleCount = Math.max(visibleCount, 1);
        const cols = safeVisibleCount === 1 ? 1 : safeVisibleCount === 2 ? 2 : 3;
        const rows = safeVisibleCount <= 3 ? 1 : Math.ceil(safeVisibleCount / 3);
        embedsRowEl.dataset.visibleCount = String(safeVisibleCount);
        embedsRowEl.dataset.visibleRows = String(rows);
        embedsRowEl.style.setProperty('--embed-cols', String(cols));
        embedsRowEl.style.setProperty('--embed-rows', String(rows));
        embedsRowEl.classList.toggle('embeds-row--matrix', safeVisibleCount > 3);
      }
      renderDockIcons();
      renderToolMenu();
      if (typeof deps.schedulePushBounds === 'function') deps.schedulePushBounds();
    }

    return {
      chatPlatforms,
      ensureState,
      platformCardEl,
      render,
      renderDockIcons,
      renderToolMenu,
      restorePlatform,
      setPlatformMode,
    };
  }

  global.DuoliPlatformVisibility = {
    createPlatformVisibilityController,
  };
})(window);
