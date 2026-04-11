/**
 * Computed Configuration Values
 * Derived values and environment helpers.
 * <50 lines
 */

import { validateConfig } from './loader';
import type { AppConfig } from './types';

export const config: AppConfig = validateConfig();

export const isDevelopment = config.server.nodeEnv === 'development';
export const isProduction = config.server.nodeEnv === 'production';
export const isTest = config.server.nodeEnv === 'test';

export function computeDerivedConfig(rawConfig: any) {
  if (!rawConfig.proxy.promisesDir && rawConfig.proxy.storageDir) {
    rawConfig.proxy.promisesDir = `${rawConfig.proxy.storageDir}/promises`;
  }
  return rawConfig;
}
