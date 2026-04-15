/**
 * Configuration Loader & Validator
 * Loads raw config and validates/parses with Zod.
 * <80 lines
 */

import {
  validateConfig,
  validateConfigSafe,
  validatePorts,
} from "./config-validator.js";

// Re-export validation functions
export { validateConfig, validateConfigSafe, validatePorts };
