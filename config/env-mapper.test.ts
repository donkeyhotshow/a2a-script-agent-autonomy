import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mapEnvironmentVariables } from './env-mapper.js';
import * as dotenv from 'dotenv';

vi.mock('dotenv');

describe('env-mapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear process.env
    Object.keys(process.env)
      .filter(key => key.startsWith('SERVER_') || key.startsWith('CLIENT_') || key === 'NODE_ENV')
      .forEach(key => delete process.env[key]);
  });

  it('maps ports correctly', () => {
    process.env.SERVER_PORT = '3000';
    process.env.CLIENT_API_PORT = '3001';
    
    const result = mapEnvironmentVariables();
    
    expect(result.ports.serverPort).toBe('3000');
    expect(result.ports.clientApiPort).toBe('3001');
  });

  it('maps server config correctly', () => {
    process.env.NODE_ENV = 'test';
    
    const result = mapEnvironmentVariables();
    
    expect(result.server.nodeEnv).toBe('test');
  });

  it('handles undefined env vars as undefined', () => {
    const result = mapEnvironmentVariables();
    
    expect(result.ports.ollamaPort).toBeUndefined();
  });
});
