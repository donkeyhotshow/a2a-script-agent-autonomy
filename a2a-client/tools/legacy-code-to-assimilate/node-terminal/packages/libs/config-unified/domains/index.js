import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { DomainsConfigManager, domainsConfigManager } = require('./index.cjs');

export { DomainsConfigManager, domainsConfigManager };
