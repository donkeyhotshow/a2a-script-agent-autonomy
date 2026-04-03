/**
 * A2A Server Configuration - Simulation Mode
 */

import dotenv from 'dotenv';
import path from 'path';
import {fileURLToPath} from 'url';
import {z} from 'zod';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
const serverRoot = path.resolve(__dirname, '../..');
dotenv.config({path: path.join(serverRoot, '../.env')});

// Helper schemas
const int = (min: number, max: number, defaultValue: number) =>
    z.coerce.number().int().min(min).max(max).default(defaultValue);

const boolean = z
    .union([z.boolean(), z.string()])
    .transform((val) => {
        if (typeof val === 'boolean') return val;
        return ['true', '1', 'yes', 'y', 'on', 't'].includes(val.toLowerCase());
    })
    .default(false);

const port = (defaultPort: number) => int(1, 65535, defaultPort);

// Configuration schema
const configSchema = z.object({
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    port: port(3000),
    host: z.string().default('localhost'),

    // Request Processor
    requestProcessorIntervalMs: int(100, 60000, 5000),

    // Logging
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    logFormat: z.enum(['json', 'pretty']).default('json'),

    // Optional: Skip auth in dev
    skipAuth: boolean.default(false),
});

// Environment mapping
function mapEnvironmentVariables() {
    return {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        host: process.env.HOST,
        requestProcessorIntervalMs: process.env.REQUEST_PROCESSOR_INTERVAL_MS,
        logLevel: process.env.LOG_LEVEL,
        logFormat: process.env.LOG_FORMAT,
        skipAuth: process.env.SKIP_AUTH,
    };
}

// Load config
function loadConfig() {
    const rawConfig = mapEnvironmentVariables();
    try {
        return configSchema.parse(rawConfig);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const issues = error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
            throw new Error(`Configuration validation failed:\n${issues}`);
        }
        throw error;
    }
}

export const config = loadConfig();
export type Config = z.infer<typeof configSchema>;
export {configSchema};

export const isDevelopment = config.nodeEnv === 'development';
export const isProduction = config.nodeEnv === 'production';
export const isTest = config.nodeEnv === 'test';
