/**
 * Configuration Validation Script
 *
 * Validates environment variables against Zod schemas.
 * Run with: npm run validate:config
 *
 * Exit codes:
 *   0 - Configuration is valid
 *   1 - Configuration validation failed
 *
 * Options:
 *   --safe    Don't exit with error code, just print results
 *   --json    Output results as JSON
 */

import { validateConfig, validateConfigSafe, config } from "./index";

const args = process.argv.slice(2);
const isSafe = args.includes("--safe");
const isJson = args.includes("--json");
const isQuiet = args.includes("--quiet");

interface ValidationResult {
  valid: boolean;
  timestamp: string;
  errors?: string[];
  config?: Record<string, unknown>;
}

function printHeader(): void {
  if (isQuiet) return;
  console.log("=".repeat(60));
  console.log("A2A Configuration Validation");
  console.log("=".repeat(60));
  console.log();
}

function printSuccess(): void {
  if (isQuiet) return;
  console.log("✓ Configuration is valid!");
  console.log();
  console.log("Active Configuration:");
  console.log("-".repeat(40));

  // Print key configuration values
  console.log(`  Node Environment: ${config.server.nodeEnv}`);
  console.log(`  Database URL:     ${maskUrl(config.database.databaseUrl)}`);
  console.log(`  Redis URL:        ${maskUrl(config.database.redisUrl)}`);
  console.log(`  Log Level:        ${config.logging.logLevel}`);
  console.log(`  Skip Auth:        ${config.security.skipAuth}`);
  console.log();
  console.log("=".repeat(60));
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) {
      u.password = "***";
    }
    return u.toString();
  } catch {
    return url;
  }
}

function printErrors(errors: string[]): void {
  if (isQuiet) return;
  console.error("✗ Configuration validation failed!");
  console.error();
  console.error("Errors:");
  console.error("-".repeat(40));
  errors.forEach((error) => {
    console.error(`  • ${error}`);
  });
  console.error();
  console.error("Please check your .env file and ensure all required");
  console.error("variables are set correctly.");
  console.error();
  console.error("See docs/CONFIGURATION.md for detailed documentation.");
  console.error("=".repeat(60));
}

function outputJson(result: ValidationResult): void {
  console.log(JSON.stringify(result, null, 2));
}

async function main(): Promise<void> {
  if (isSafe) {
    // Safe validation - don't throw
    const result = validateConfigSafe();

    if (isJson) {
      const output: ValidationResult = result.success
        ? {
            valid: true,
            timestamp: new Date().toISOString(),
            config: result.config as Record<string, unknown>,
          }
        : {
            valid: false,
            timestamp: new Date().toISOString(),
            errors: result.errors!,
          };
      outputJson(output);
    } else {
      printHeader();
      if (result.success) {
        printSuccess();
      } else {
        printErrors(result.errors!);
      }
    }

    process.exit(result.success ? 0 : 1);
  } else {
    // Strict validation - throw on error
    try {
      validateConfig();

      if (isJson) {
        outputJson({ valid: true, timestamp: new Date().toISOString() });
      } else {
        printHeader();
        printSuccess();
      }

      process.exit(0);
    } catch (error) {
      const errors =
        error instanceof Error ? [error.message] : ["Unknown error"];

      if (isJson) {
        outputJson({
          valid: false,
          timestamp: new Date().toISOString(),
          errors,
        });
      } else {
        printHeader();
        printErrors(errors);
      }

      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error("Unexpected error during validation:", error);
  process.exit(1);
});
