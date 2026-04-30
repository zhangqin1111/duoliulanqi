(function attachEmbedBounds(global) {
  function createEmbedBoundsReporter(deps) {
    let boundsPushPending = false;

    function push() {
      const api = typeof deps.getApi === 'function' ? deps.getApi() : deps.api;
      const platforms = typeof deps.getPlatforms === 'function' ? deps.getPlatforms() : [];
      if (!api || !platforms.length || typeof api.reportEmbedBounds !== 'function') return;
      const slots = platforms
        .map((cfg) => {
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

    return { push, schedule };
  }

  global.DuoliEmbedBounds = {
    createEmbedBoundsReporter,
  };
})(window);
