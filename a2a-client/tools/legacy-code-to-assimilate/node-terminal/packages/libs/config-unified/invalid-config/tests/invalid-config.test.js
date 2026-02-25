import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs'; // Import actual fs for readFileSync in the module under test

// Mock the fs module, but keep readFileSync for the module under test
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFileSync: vi.fn(), // Mock readFileSync only for the test context
  };
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('invalid-config', () => {
  let mockConfigContent;

  beforeEach(() => {
    mockConfigContent = {
      errors: [
        { code: 1001, message: 'Invalid API Key' },
        { code: 1002, message: 'Missing required field' },
      ],
      status: 'error',
      metadata: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      },
    };

    // Restore original readFileSync for the module under test, then mock it for test control
    const originalReadFileSync = fs.readFileSync;
    fs.readFileSync = vi.fn((filePath, encoding) => {
        if (filePath.includes('config.json')) {
            return JSON.stringify(mockConfigContent);
        }
        return originalReadFileSync(filePath, encoding);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should correctly load and export the configuration from config.json', async () => {
    // Dynamically import the module to ensure it uses the mocked fs.readFileSync
    const config = (await import('../index.js')).default;

    expect(config).toBeDefined();
    expect(config.errors.length).toBe(2);
    expect(config.status).toBe('error');
    expect(config.metadata.version).toBe('1.0.0');
    expect(fs.readFileSync).toHaveBeenCalledWith(path.join(__dirname, '../config.json'), 'utf8');
  });

  it('should handle invalid JSON gracefully (if module under test does)', async () => {
    fs.readFileSync.mockImplementationOnce(() => 'invalid json');

    // Expecting the module to throw or return an error if JSON is invalid
    // In this specific module, JSON.parse will throw, so we catch it.
    await expect(import('../index.js')).rejects.toThrowErrorMatchingSnapshot();

  });

  it('should handle missing config.json gracefully (if module under test does)', async () => {
    fs.readFileSync.mockImplementationOnce(() => {
      throw new Error('ENOENT: no such file or directory');
    });

    await expect(import('../index.js')).rejects.toThrowErrorMatchingSnapshot();
  });
});
