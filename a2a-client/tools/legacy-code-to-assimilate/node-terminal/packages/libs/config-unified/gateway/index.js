import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { GatewayConfigManager, gatewayConfigManager } = require('./index.cjs');

export { GatewayConfigManager, gatewayConfigManager };
