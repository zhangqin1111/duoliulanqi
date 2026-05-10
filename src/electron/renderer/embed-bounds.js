(function attachEmbedBounds(global) {
  function createEmbedBoundsReporter(deps) {
    let boundsPushPending = false;

    function push() {
      const api = typeof deps.getApi === 'function' ? deps.getApi() : deps.api;
      const platforms = typeof deps.getPlatforms === 'function' ? deps.getPlatforms() : [];
      if (!api || !platforms.length || typeof api.reportEmbedBounds !== 'function') return;
      const hideMainViews =
        document.body.classList.contains('has-compare-open') ||
        document.body.classList.contains('is-difference-modal-open') ||
        document.body.classList.contains('is-model-replies-modal-open');
      const slots = platforms
        .map((cfg) => {
          if (hideMainViews) {
            return { id: cfg.id, x: -20000, y: -20000, width: 0, height: 0 };
          }
          const el = document.getElementById(`slot-${cfg.id}`);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {
            id: cfg.id,
            x: Math.round(r.left),
            y: Math.round(r.top),
            width: Math.round(r.width),
            height: Math.round(r.height),
          };
        })
        .filter(Boolean);
      api.reportEmbedBounds(slots);
    }

    function schedule() {
      if (boundsPushPending) return;
      boundsPushPending = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          boundsPushPending = false;
          push();
        });
      });
    }

    window.addEventListener('duoli:overlay-bounds-change', schedule);

    return { push, schedule };
  }

  global.DuoliEmbedBounds = {
    createEmbedBoundsReporter,
  };
})(window);
