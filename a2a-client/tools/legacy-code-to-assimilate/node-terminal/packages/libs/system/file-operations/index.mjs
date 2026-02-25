import { createRequire } from 'module';

// ESM wrapper around CommonJS exports
const require = createRequire(import.meta.url);
const cjsModule = require('./index.cjs');

export const fileUtilsFactory = cjsModule;
