import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { ConfigConfigManager, configConfigManager } = require('./index.cjs');

export { ConfigConfigManager, configConfigManager };
