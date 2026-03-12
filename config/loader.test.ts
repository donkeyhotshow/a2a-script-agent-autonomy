import { describe, it, expect, vi } from 'vitest';
import { appConfigSchema } from './schema.js';
import { mapEnvironmentVariables } from './env-mapper.js';

describe('loader', () => {
  it('validates full config', () => {
    // Set minimal required env
    process.env.SERVER_PORT = '3000';
    process.env.JWT_SECRET = 'test-secret-32-chars-long-enough';
    
    const raw = mapEnvironmentVariables();
    const config = appConfigSchema.parse(raw);
    
    expect(config.ports.serverPort).toBe(3000);
  });

  it('throws on invalid port', () => {
    process.env.SERVER_PORT = 'invalid';
    
    const raw = mapEnvironmentVariables();
    
    expect(() => appConfigSchema.parse(raw)).toThrow();
  });
});
