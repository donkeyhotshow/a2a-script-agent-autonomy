// Browser-safe import for CommonJS modules
const loadPortsModule = async () => {
  try {
    const module = await import('./index.cjs');
    return module;
  } catch (error) {
    console.warn('Failed to load ports CJS module:', error);
    return { PortsConfigManager: null, portsConfigManager: null };
  }
};

let PortsConfigManager, portsConfigManager;

loadPortsModule().then(module => {
  ({ PortsConfigManager, portsConfigManager } = module);
});

export { PortsConfigManager, portsConfigManager };
