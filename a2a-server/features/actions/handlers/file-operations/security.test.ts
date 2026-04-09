import { validatePath } from './security.js';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

describe('validatePath', () => {
  // Save original env vars
  const originalEnv = process.env;
  
  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  test('should prevent path traversal where /tmp2/secret incorrectly passes for /tmp prefix', () => {
    // Set up environment to have predictable cwd
    process.env.HOME = '/home/user';
    // Mock process.cwd() to return a known value
    const originalCwd = process.cwd;
    vi.spyOn(process, 'cwd').mockReturnValue('/app');
    
    try {
      // This should FAIL validation because /tmp2/secret is not actually under /tmp
      const result = validatePath('/tmp2/secret');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Path is outside allowed directories');
    } finally {
      process.cwd = originalCwd;
    }
  });

  test('should allow legitimate paths under /tmp', () => {
    process.env.HOME = '/home/user';
    const originalCwd = process.cwd;
    vi.spyOn(process, 'cwd').mockReturnValue('/app');
    
    try {
      // This should PASS validation
      const result = validatePath('/tmp/legitimate/file.txt');
      expect(result.valid).toBe(true);
    } finally {
      process.cwd = originalCwd;
    }
  });

  test('should handle empty/null prefixes correctly', () => {
    process.env.HOME = ''; // Empty HOME
    const originalCwd = process.cwd;
    vi.spyOn(process, 'cwd').mockReturnValue('/app');
    
    try {
      // Should still work with empty HOME prefix
      const result = validatePath('/app/some/file.txt');
      expect(result.valid).toBe(true);
    } finally {
      process.cwd = originalCwd;
    }
  });

  test('should detect null bytes in path', () => {
    process.env.HOME = '/home/user';
    const originalCwd = process.cwd;
    vi.spyOn(process, 'cwd').mockReturnValue('/app');
    
    try {
      const result = validatePath('/app/\0secret');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Path contains null bytes');
    } finally {
      process.cwd = originalCwd;
    }
  });
});