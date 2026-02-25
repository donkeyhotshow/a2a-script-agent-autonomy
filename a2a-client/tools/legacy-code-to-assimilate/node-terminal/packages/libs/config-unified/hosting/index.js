import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { HostingConfigManager, hostingConfigManager } = require('./index.cjs');

export { HostingConfigManager, hostingConfigManager };

