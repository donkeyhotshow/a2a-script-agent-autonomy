/**
 * Configuration Validation Module
 *
 * Centralized validation functions for configuration.
 * Contains all validation logic in one place to avoid duplication.
 */
/**
 * Formats Zod validation errors into human-readable messages.
 */
export function formatValidationErrors(error) {
    const lines = error.issues.map((issue) => {
        const path = issue.path.join(".");
        const message = issue.message;
        return `  - ${path}: ${message}`;
    });
    return lines.join("\n");
}
/**
 * Validates configuration and returns typed config object.
 * Throws error with detailed message if validation fails.
 */
export function validateConfig() {
    const rawConfig = mapEnvironmentVariables();
    return appConfigSchema.parse(rawConfig);
}
/**
 * Validates configuration without throwing.
 * Returns result object with success status and either config or errors.
 */
export function validateConfigSafe() {
    const rawConfig = mapEnvironmentVariables();
    try {
        // Compute promisesDir from storageDir if not set
        if (!rawConfig.proxy.promisesDir && rawConfig.proxy.storageDir) {
            rawConfig.proxy.promisesDir = `${rawConfig.proxy.storageDir}/promises`;
        }
        const config = appConfigSchema.parse(rawConfig);
        return { success: true, config, errors: null };
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            const errors = error.issues.map((issue) => {
                const path = issue.path.join(".");
                return `${path}: ${issue.message}`;
            });
            return { success: false, config: null, errors };
        }
        throw error;
    }
}
/**
 * Validates only port configuration.
 * Useful for service startup validation.
 */
export function validatePorts() {
    const raw = {
        serverPort: process.env.SERVER_PORT,
        clientApiPort: process.env.CLIENT_API_PORT,
        webPort: process.env.WEB_PORT,
        postgresPort: process.env.POSTGRES_PORT,
        redisPort: process.env.REDIS_PORT,
    };
    // Port validation removed as portConfigSchema was removed
    // This function should be updated or removed
    return {};
}
/**
 * Validates only database configuration.
 */
export function validateDatabase() {
    const raw = {
        databaseUrl: process.env.DATABASE_URL,
        redisUrl: process.env.REDIS_URL,
        postgresUser: process.env.POSTGRES_USER,
        postgresPassword: process.env.POSTGRES_PASSWORD,
        postgresDb: process.env.POSTGRES_DB,
    };
    return databaseConfigSchema.parse(raw);
}
/**
 * Validates only security configuration.
 */
export function validateSecurity() {
    const raw = {
        jwtSecret: process.env.JWT_SECRET,
        jwtExpiresIn: process.env.JWT_EXPIRES_IN,
        jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
        encryptionKey: process.env.ENCRYPTION_KEY,
        skipAuth: process.env.SKIP_AUTH,
        apiKeyPrefix: process.env.API_KEY_PREFIX,
    };
    return securityConfigSchema.parse(raw);
}
/**
 * Validates only AI Hub configuration.
 */
export function validateAIHub() {
    const raw = {
        aiHubUrl: process.env.AI_HUB_URL,
        pollIntervalMs: process.env.POLL_INTERVAL_MS,
        pollTimeoutMs: process.env.POLL_TIMEOUT_MS,
        openaiApiKey: process.env.OPENAI_API_KEY,
        openaiModel: process.env.OPENAI_MODEL,
    };
    return aiHubConfigSchema.parse(raw);
}
