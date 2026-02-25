import { createRequire } from 'module';

// ESM wrapper around CommonJS exports
const require = createRequire(import.meta.url);
const cjs = require('./index.cjs');

export const ServiceManager = cjs.ServiceManager;
export const serviceManager = cjs.serviceManager;
export const ServiceStatusManager = cjs.ServiceStatusManager;
export const serviceStatusManager = cjs.serviceStatusManager;
