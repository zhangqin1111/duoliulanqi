(function attachPlatformBrand(global) {
  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function platformAvatar(cfg) {
    return String(cfg && cfg.avatar ? cfg.avatar : cfg && cfg.name ? cfg.name : '?').slice(0, 2);
  }

  function renderLogo(cfg, className) {
    const fallback = platformAvatar(cfg);
    const logoUrl = String((cfg && cfg.logoUrl) || '').trim();
    const cls = className || 'platform-logo';
    if (!logoUrl) {
      return `<span class="${escapeHtml(cls)} is-fallback"><span>${escapeHtml(fallback)}</span></span>`;
    }
    return [
      `<span class="${escapeHtml(cls)} platform-logo" data-fallback="${escapeHtml(fallback)}">`,
      `  <img src="${escapeHtml(logoUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.classList.add('is-fallback');this.remove();" />`,
      `  <span>${escapeHtml(fallback)}</span>`,
      '</span>',
    ].join('');
  }

  global.DuoliPlatformBrand = {
    platformAvatar,
    renderLogo,
  };
})(window);
