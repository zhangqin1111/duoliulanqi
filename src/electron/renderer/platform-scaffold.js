(function attachPlatformScaffold(global) {
  function createPlatformScaffold(deps) {
    function escapeHtml(text) {
      return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function platformAvatar(cfg) {
      return String(cfg && cfg.avatar ? cfg.avatar : (cfg && cfg.name ? cfg.name : '?')).slice(0, 2);
    }

    function platformAccentStyle(cfg) {
      const accent = cfg && cfg.accent ? cfg.accent : '#4d7bff';
      const avatarBg = cfg && cfg.avatarBg ? cfg.avatarBg : '#eef3ff';
      const avatarFg = cfg && cfg.avatarFg ? cfg.avatarFg : '#3167df';
      return `--platform-accent:${accent};--platform-avatar-bg:${avatarBg};--platform-avatar-fg:${avatarFg};`;
    }

    function mirrorPlaceholder(cfg) {
      return `发送后将在这里同步展示 ${cfg.name} 的回复。`;
    }

    function render() {
      const platforms = deps.getPlatforms ? deps.getPlatforms() : [];
      const mirrorSectionsEl = deps.getMirrorSectionsEl ? deps.getMirrorSectionsEl() : null;
      const embedsRowRootEl = deps.getEmbedsRowRootEl ? deps.getEmbedsRowRootEl() : null;

      if (mirrorSectionsEl) {
        mirrorSectionsEl.innerHTML = platforms
          .map(
            (cfg) => `
              <section class="document-section document-section--reply" data-mirror-card="${cfg.id}">
                <div class="document-section__title">
                  <span class="mirror-dot" style="${platformAccentStyle(cfg)}"></span>
                  <span>${escapeHtml(cfg.name)}</span>
                </div>
                <pre id="mirror-${cfg.id}" class="document-pre">${escapeHtml(mirrorPlaceholder(cfg))}</pre>
              </section>
            `
          )
          .join('');
      }

      if (embedsRowRootEl) {
        embedsRowRootEl.innerHTML = platforms
          .map((cfg) => {
            const warn = cfg.warnText ? `<p class="embed-warn">${escapeHtml(cfg.warnText)}</p>` : '';
            return `
              <article class="embed-col" data-id="${cfg.id}">
                <div class="embed-shell" style="${platformAccentStyle(cfg)}">
                  <div class="embed-head" data-drag-popout="${cfg.id}">
                    <div class="embed-brand">
                      <span class="embed-avatar">${escapeHtml(platformAvatar(cfg))}</span>
                      <span>${escapeHtml(cfg.name)}</span>
                    </div>
                    <div class="embed-controls">
                      <button type="button" class="icon-btn" data-reload="${cfg.id}" aria-label="刷新 ${escapeHtml(cfg.name)}">↻</button>
                      <button type="button" class="icon-btn" data-collapse="${cfg.id}" aria-label="收起 ${escapeHtml(cfg.name)}">－</button>
                      <button type="button" class="icon-btn" data-close="${cfg.id}" aria-label="关闭 ${escapeHtml(cfg.name)}">×</button>
                    </div>
                  </div>
                  ${warn}
                  <div class="embed-slot-wrap">
                    <div class="embed-slot" id="slot-${cfg.id}"></div>
                  </div>
                  <div class="embed-foot">
                    <div class="col-status" data-status="${cfg.id}">加载中...</div>
                    <pre class="col-body" data-body="${cfg.id}"></pre>
                  </div>
                </div>
              </article>
            `;
          })
          .join('');
      }
    }

    return {
      escapeHtml,
      mirrorPlaceholder,
      platformAccentStyle,
      platformAvatar,
      render,
    };
  }

  global.DuoliPlatformScaffold = {
    createPlatformScaffold,
  };
})(window);
