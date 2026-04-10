/**
 * Vitest Test Setup
 * Stateless server - no database required
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({path: path.resolve(process.cwd(), '.env')});

process.env.NODE_ENV = 'test';
process.env.SKIP_AUTH = '1';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-min-32-characters-long';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? 'test-encryption-key-32-characters!';

// Note: No DATABASE_URL or REDIS_URL needed - server is stateless
