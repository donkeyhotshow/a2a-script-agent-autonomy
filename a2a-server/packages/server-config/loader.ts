/**
 * Configuration Loader & Validator
 * Loads raw config and validates/parses with Zod.
 * <80 lines
 */

import { z } from "zod";
import { appConfigSchema } from "./schema.js";
import { RawConfig, mapEnvironmentVariables } from "./env-mapper.js";
import type { AppConfig } from "./types.js";
import {
  formatValidationErrors,
  validateConfig,
  validateConfigSafe,
  validatePorts,
  validateDatabase,
  validateSecurity,
  validateAIHub,
} from "./config-validator.js";

// Individual validators are now imported from config-validator.js above
