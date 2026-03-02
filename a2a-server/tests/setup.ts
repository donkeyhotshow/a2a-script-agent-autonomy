/**
 * Vitest Test Setup
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({path: path.resolve(process.cwd(), '.env')});

process.env.NODE_ENV = 'test';
// SKIP_AUTH=1 bypasses auth - set only when DB available for full integration
// process.env.SKIP_AUTH = '1';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://pgadmin:51202368Wmid%40@localhost:5432/a2a_test?schema=public';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379/1';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-min-32-characters-long';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? 'test-encryption-key-32-characters!';
