import { createRequire } from 'module';

// ESM wrapper around CommonJS exports
const require = createRequire(import.meta.url);
const cjs = require('./index.cjs');

export const BaseModel = cjs.BaseModel;
export const ModelFactory = cjs.ModelFactory;
export const ModelRegistry = cjs.ModelRegistry;
export const ServicesModel = cjs.ServicesModel;
export const ServersModel = cjs.ServersModel;
export const createModelRegistry = cjs.createModelRegistry;
export const createModel = cjs.createModel;
export const getAvailableModelTypes = cjs.getAvailableModelTypes;
export const checkVersionCompatibility = cjs.checkVersionCompatibility;
export const ModelUtils = cjs.ModelUtils;
export const ModelConstants = cjs.ModelConstants;
export const unifiedConfigManager = cjs.unifiedConfigManager;
export default cjs.default;
