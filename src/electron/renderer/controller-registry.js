(function attachControllerRegistry(global) {
  function createControllerRegistry() {
    const instances = new Map();

    function resolveFactory(spec) {
      const moduleApi = global[spec.moduleName];
      const factory = moduleApi && moduleApi[spec.factoryName];
      if (typeof factory !== 'function') {
        throw new Error(`${spec.label || spec.moduleName} module is not loaded.`);
      }
      return factory;
    }

    function get(key, spec) {
      if (!instances.has(key)) {
        const factory = resolveFactory(spec);
        const deps = typeof spec.createDeps === 'function' ? spec.createDeps() : spec.deps || {};
        instances.set(key, factory(deps));
      }
      return instances.get(key);
    }

    return {
      get,
    };
  }

  global.DuoliControllerRegistry = {
    createControllerRegistry,
  };
})(window);
