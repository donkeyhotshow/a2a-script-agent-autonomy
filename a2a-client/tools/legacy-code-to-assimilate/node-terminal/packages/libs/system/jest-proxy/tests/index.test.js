const { handleJestProxy } = require('../index.cjs');
const { spawnSync } = require('child_process');
const path = require('path');

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockErrorHandler = {
  safeExecute: jest.fn(async (fn, errorType) => {
    try {
      return await fn();
    } catch (error) {
      mockLogger.error(`Error in safeExecute (${errorType}):`, error);
      throw error;
    }
  }),
};

const mockFileUtils = {
  ensureDir: jest.fn(),
  readFile: jest.fn(),
  appendFile: jest.fn(),
  existsSync: jest.fn(() => true), // Default to true for pathUtils.exists
};

const mockPathUtils = {
  join: jest.fn((...args) => path.join(...args)),
  exists: jest.fn(() => true),
};

const mockCommandExecutor = {
  runCommand: jest.fn(),
};

const mockConfig = {
  jestProxyTimeoutMs: 2000,
  logDir: 'logs',
  timeout: 120,
};

const mockAppendLog = jest.fn();

// Mock child_process.spawnSync
jest.mock('child_process', () => ({
  spawnSync: jest.fn(),
}));

describe('handleJestProxy', () => {
  const startTime = Date.now();
  const effectiveCwdArg = '/app';
  let originalProcessEnv;

  beforeAll(() => {
    originalProcessEnv = process.env;
    process.env = { ...originalProcessEnv, NODE_ENV: 'test' };
  });

  afterAll(() => {
    process.env = originalProcessEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset default mock behaviors
    spawnSync.mockReset();
    mockFileUtils.ensureDir.mockReset();
    mockFileUtils.readFile.mockReset().mockResolvedValue('');
    mockFileUtils.appendFile.mockReset().mockResolvedValue();
    mockPathUtils.join.mockClear().mockImplementation((...args) => path.join(...args));
    mockPathUtils.exists.mockReset().mockReturnValue(true);
    mockCommandExecutor.runCommand.mockReset().mockResolvedValue({ success: true, stdout: 'fallback-stdout', stderr: 'fallback-stderr', return_code: 0 });
    mockAppendLog.mockReset();
  });

  test('should return null if command does not match jest pattern', async () => {
    const command = 'node index.js';
    const result = await handleJestProxy(
      command, startTime, effectiveCwdArg, mockLogger, mockErrorHandler, mockFileUtils, mockPathUtils, mockCommandExecutor, mockConfig, mockAppendLog
    );
    expect(result).toBeNull();
    expect(spawnSync).not.toHaveBeenCalled();
  });

  test('should execute proxy script if command matches jest pattern and succeed', async () => {
    const command = 'jest test.js';
    const mockProxyLogContent = 'PROXY JEST START\nTest output\nPROXY JEST END';
    spawnSync.mockReturnValue({
      status: 0,
      stdout: 'proxy stdout',
      stderr: '',
    });
    mockFileUtils.readFile.mockResolvedValue(mockProxyLogContent);

    const result = await handleJestProxy(
      command, startTime, effectiveCwdArg, mockLogger, mockErrorHandler, mockFileUtils, mockPathUtils, mockCommandExecutor, mockConfig, mockAppendLog
    );

    expect(spawnSync).toHaveBeenCalledTimes(1);
    expect(spawnSync).toHaveBeenCalledWith(expect.stringContaining('node'), expect.objectContaining({
      shell: true,
      cwd: effectiveCwdArg,
      env: expect.objectContaining({ JEST_ORIGINAL_COMMAND: command }),
      timeout: mockConfig.jestProxyTimeoutMs,
    }));
    expect(mockFileUtils.ensureDir).toHaveBeenCalledTimes(1);
    expect(mockFileUtils.readFile).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.stdout).toBe('proxy stdout');
    expect(result.return_code).toBe(0);
    expect(result.proxyMarkers.hasStart).toBe(true);
    expect(result.proxyMarkers.hasEnd).toBe(true);
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Proxied jest command'));
    expect(mockAppendLog).toHaveBeenCalledTimes(1);
  });

  test('should handle proxy timeout and not retry or fallback if hasEnd is true', async () => {
    const command = 'npx jest';
    const mockProxyLogContent = 'PROXY JEST START\nTest output\nPROXY JEST END';
    spawnSync.mockReturnValue({
      status: null, // Indicates timeout or other non-zero status
      error: new Error('Command timed out'),
      stdout: '',
      stderr: '',
    });
    mockFileUtils.readFile.mockResolvedValue(mockProxyLogContent);

    const result = await handleJestProxy(
      command, startTime, effectiveCwdArg, mockLogger, mockErrorHandler, mockFileUtils, mockPathUtils, mockCommandExecutor, mockConfig, mockAppendLog
    );

    expect(spawnSync).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.proxyMarkers.hasStart).toBe(true);
    expect(result.proxyMarkers.hasEnd).toBe(true);
    expect(mockFileUtils.appendFile).not.toHaveBeenCalledWith(expect.stringContaining('RETRY START'), expect.any(String), expect.any(String));
    expect(mockCommandExecutor.runCommand).not.toHaveBeenCalled();
    expect(mockAppendLog).toHaveBeenCalledTimes(1);
  });

  test('should retry proxy and succeed after initial failure (no end marker)', async () => {
    const command = 'npm run test';
    const mockProxyLogContentInitial = 'PROXY JEST START\nPartial output';
    const mockProxyLogContentRetry = mockProxyLogContentInitial + '\nRetry output\nPROXY JEST END';

    // Initial failure
    spawnSync.mockReturnValueOnce({
      status: 1,
      stdout: 'initial stdout',
      stderr: '',
    });
    mockFileUtils.readFile.mockResolvedValueOnce(mockProxyLogContentInitial);

    // Retry success
    spawnSync.mockReturnValueOnce({
      status: 0,
      stdout: 'retry stdout',
      stderr: '',
    });
    mockFileUtils.readFile.mockResolvedValueOnce(mockProxyLogContentRetry);

    const result = await handleJestProxy(
      command, startTime, effectiveCwdArg, mockLogger, mockErrorHandler, mockFileUtils, mockPathUtils, mockCommandExecutor, mockConfig, mockAppendLog
    );

    expect(spawnSync).toHaveBeenCalledTimes(2);
    expect(mockFileUtils.appendFile).toHaveBeenCalledWith(expect.stringContaining('jest-proxy.log'), expect.stringContaining('PROXY JEST RETRY START'), 'utf8');
    expect(result.success).toBe(true);
    expect(result.proxyMarkers.hasStart).toBe(true);
    expect(result.proxyMarkers.hasEnd).toBe(true);
    expect(mockCommandExecutor.runCommand).not.toHaveBeenCalled();
    expect(mockAppendLog).toHaveBeenCalledTimes(1);
  });

  test('should fallback to commandExecutor if proxy fails even after retry', async () => {
    const command = 'jest --watch';
    const mockProxyLogContentInitial = 'PROXY JEST START\nPartial output';

    // Initial failure
    spawnSync.mockReturnValueOnce({
      status: 1,
      stdout: 'initial stdout',
      stderr: '',
    });
    mockFileUtils.readFile.mockResolvedValueOnce(mockProxyLogContentInitial);

    // Retry failure
    spawnSync.mockReturnValueOnce({
      status: 1,
      stdout: 'retry stdout',
      stderr: '',
    });
    mockFileUtils.readFile.mockResolvedValueOnce(mockProxyLogContentInitial);

    mockCommandExecutor.runCommand.mockResolvedValue({
      success: true,
      stdout: 'fallback stdout',
      stderr: 'fallback stderr',
      return_code: 0,
    });

    const result = await handleJestProxy(
      command, startTime, effectiveCwdArg, mockLogger, mockErrorHandler, mockFileUtils, mockPathUtils, mockCommandExecutor, mockConfig, mockAppendLog
    );

    expect(spawnSync).toHaveBeenCalledTimes(2);
    expect(mockCommandExecutor.runCommand).toHaveBeenCalledTimes(1);
    expect(mockCommandExecutor.runCommand).toHaveBeenCalledWith(command, mockConfig.timeout, false, effectiveCwdArg);
    expect(result.success).toBe(true);
    expect(result.stdout).toBe('fallback stdout');
    expect(result.fallback).toBe(true);
    expect(mockAppendLog).toHaveBeenCalledTimes(1);
  });

  test('should use JEST_PROXY_CMD and JEST_PROXY_TIMEOUT_MS from env variables', async () => {
    process.env.JEST_PROXY_CMD = 'custom-proxy';
    process.env.JEST_PROXY_TIMEOUT_MS = '5000';
    const command = 'jest';

    spawnSync.mockReturnValue({
      status: 0,
      stdout: 'proxy stdout',
      stderr: '',
    });
    mockFileUtils.readFile.mockResolvedValue('PROXY JEST START\nPROXY JEST END');

    await handleJestProxy(
      command, startTime, effectiveCwdArg, mockLogger, mockErrorHandler, mockFileUtils, mockPathUtils, mockCommandExecutor, mockConfig, mockAppendLog
    );

    expect(spawnSync).toHaveBeenCalledWith('custom-proxy', expect.objectContaining({
      timeout: 5000,
    }));
  });

  test('should call appendLog with correct data on success', async () => {
    const command = 'jest --clearCache';
    const mockProxyLogContent = 'PROXY JEST START\nPROXY JEST END';
    spawnSync.mockReturnValue({
      status: 0,
      stdout: 'proxy stdout',
      stderr: '',
    });
    mockFileUtils.readFile.mockResolvedValue(mockProxyLogContent);

    await handleJestProxy(
      command, startTime, effectiveCwdArg, mockLogger, mockErrorHandler, mockFileUtils, mockPathUtils, mockCommandExecutor, mockConfig, mockAppendLog
    );

    expect(mockAppendLog).toHaveBeenCalledTimes(1);
    expect(mockAppendLog).toHaveBeenCalledWith(expect.objectContaining({
      event: 'proxy_analysis',
      command: command,
      proxyLog: expect.stringContaining('jest-proxy.log'),
      proxyMarkers: { hasStart: true, hasEnd: true },
      success: true,
      fallback: false,
    }));
  });

  test('should call appendLog with correct data on fallback', async () => {
    const command = 'jest --no-cache';
    const mockProxyLogContentInitial = 'PROXY JEST START\nPartial output';

    // Initial failure
    spawnSync.mockReturnValueOnce({
      status: 1,
      stdout: 'initial stdout',
      stderr: '',
    });
    mockFileUtils.readFile.mockResolvedValueOnce(mockProxyLogContentInitial);

    // Retry failure
    spawnSync.mockReturnValueOnce({
      status: 1,
      stdout: 'retry stdout',
      stderr: '',
    });
    mockFileUtils.readFile.mockResolvedValueOnce(mockProxyLogContentInitial);

    mockCommandExecutor.runCommand.mockResolvedValue({
      success: false,
      stdout: 'fallback stdout',
      stderr: 'fallback stderr',
      return_code: 1,
    });

    await handleJestProxy(
      command, startTime, effectiveCwdArg, mockLogger, mockErrorHandler, mockFileUtils, mockPathUtils, mockCommandExecutor, mockConfig, mockAppendLog
    );

    expect(mockAppendLog).toHaveBeenCalledTimes(1);
    expect(mockAppendLog).toHaveBeenCalledWith(expect.objectContaining({
      event: 'proxy_analysis',
      command: command,
      proxyLog: expect.stringContaining('jest-proxy.log'),
      proxyMarkers: { hasStart: true, hasEnd: false },
      success: false,
      fallback: true,
    }));
  });

  test('should not call appendLog if appendLog function is not provided', async () => {
    const command = 'jest';
    spawnSync.mockReturnValue({ status: 0 });
    mockFileUtils.readFile.mockResolvedValue('PROXY JEST START\nPROXY JEST END');

    await handleJestProxy(
      command, startTime, effectiveCwdArg, mockLogger, mockErrorHandler, mockFileUtils, mockPathUtils, mockCommandExecutor, mockConfig, undefined // No appendLog
    );

    expect(mockAppendLog).not.toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalledWith('appendLog function not provided to handleJestProxy.');
  });

  test('should use correct process.execPath for proxyCmd if JEST_PROXY_CMD is not set', async () => {
    delete process.env.JEST_PROXY_CMD; // Ensure it's not set
    const command = 'jest';

    spawnSync.mockReturnValue({ status: 0 });
    mockFileUtils.readFile.mockResolvedValue('PROXY JEST START\nPROXY JEST END');

    await handleJestProxy(
      command, startTime, effectiveCwdArg, mockLogger, mockErrorHandler, mockFileUtils, mockPathUtils, mockCommandExecutor, mockConfig, mockAppendLog
    );

    const expectedProxyPath = path.join(process.cwd(), 'scripts', 'proxy-jest-runner.cjs');
    const expectedProxyCmd = process.execPath + ' "' + expectedProxyPath.replace(/"/g,'\\"') + '"';
    expect(spawnSync).toHaveBeenCalledWith(expectedProxyCmd, expect.any(Object));
  });

  test('should handle scenario where proxyLog cannot be read but file exists', async () => {
    const command = 'jest';
    spawnSync.mockReturnValue({ status: 0, stdout: 'stdout-from-spawn' });
    mockFileUtils.readFile.mockResolvedValueOnce(''); // First read returns empty
    mockPathUtils.exists.mockReturnValueOnce(true); // proxyLog file exists
    mockFileUtils.readFile.mockResolvedValueOnce('content from second read'); // Second read succeeds

    const result = await handleJestProxy(
      command, startTime, effectiveCwdArg, mockLogger, mockErrorHandler, mockFileUtils, mockPathUtils, mockCommandExecutor, mockConfig, mockAppendLog
    );

    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Reading proxy log file'), expect.any(String));
    expect(result.stdout).toBe('stdout-from-spawn'); // stdout from spawnSync takes precedence if present
  });

  test('should prioritize stdout from spawnSync over proxyLogContent', async () => {
    const command = 'jest';
    spawnSync.mockReturnValue({ status: 0, stdout: 'stdout-from-spawn' });
    mockFileUtils.readFile.mockResolvedValue('content from proxy log');

    const result = await handleJestProxy(
      command, startTime, effectiveCwdArg, mockLogger, mockErrorHandler, mockFileUtils, mockPathUtils, mockCommandExecutor, mockConfig, mockAppendLog
    );

    expect(result.stdout).toBe('stdout-from-spawn');
  });

  test('should use proxyLogContent if stdout from spawnSync is empty', async () => {
    const command = 'jest';
    spawnSync.mockReturnValue({ status: 0, stdout: '' });
    mockFileUtils.readFile.mockResolvedValue('content from proxy log');

    const result = await handleJestProxy(
      command, startTime, effectiveCwdArg, mockLogger, mockErrorHandler, mockFileUtils, mockPathUtils, mockCommandExecutor, mockConfig, mockAppendLog
    );

    expect(result.stdout).toBe('content from proxy log');
  });
});
