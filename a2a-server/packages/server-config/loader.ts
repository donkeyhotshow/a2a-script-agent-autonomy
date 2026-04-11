/**
 * Configuration Loader & Validator
 * Loads raw config and validates/parses with Zod.
 * <80 lines
 */

import { z } from "zod";
import { appConfigSchema } from "./schema";
import { RawConfig, mapEnvironmentVariables } from "./env-mapper";
import type { AppConfig } from "./types";
import {
  formatValidationErrors,
  validateConfig,
  validateConfigSafe,
  validatePorts,
  validateDatabase,
  validateSecurity,
  validateAIHub,
} from "./config-validator";

// Individual validators are now imported from config-validator.js above
