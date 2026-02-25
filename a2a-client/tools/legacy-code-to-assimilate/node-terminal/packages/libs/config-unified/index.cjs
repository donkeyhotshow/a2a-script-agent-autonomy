// This file is a CommonJS entry point for browser compatibility. It re-exports ESM modules.

const { unifiedConfigManager, ModelUtils, ModelRegistry, ModelFactory, BaseModel, ServicesModel, ServersModel } = require('./index.browser-stub.js');

module.exports = {
  unifiedConfigManager,
  ModelUtils,
  ModelRegistry,
  ModelFactory,
  BaseModel,
  ServicesModel,
  ServersModel
};
