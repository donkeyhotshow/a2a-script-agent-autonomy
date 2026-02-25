const { 
  persistHistoryRecord, 
  pushMemoryHistory, 
  listSessions, 
  loadSessionRecords, 
  getCurrentSessionId, 
  setCurrentSessionId, 
  createAndSwitchSession, 
  getSessionForCwd,
  SessionManager,
  HistoryRecordManager
} = require('../index.cjs');

const fs = require('fs');
const path = require('path');
const os = require('os');

// Real dependencies - no mocks needed

describe('History System', () => {
  let testHistoryRoot;
  let testSessionsDir;

  beforeAll(() => {
    testHistoryRoot = path.join(os.tmpdir(), 'history-test');
    testSessionsDir = path.join(testHistoryRoot, 'sessions');

    // Create test directories
    if (!fs.existsSync(testHistoryRoot)) {
      fs.mkdirSync(testHistoryRoot, { recursive: true });
    }
    if (!fs.existsSync(testSessionsDir)) {
      fs.mkdirSync(testSessionsDir, { recursive: true });
    }

    // Create history directory that getHistoryRoot() expects
    const historyDir = path.join(testHistoryRoot, 'history');
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }

    // Change working directory to test directory for the tests
    process.chdir(testHistoryRoot);
  });

  afterAll(() => {
    // Restore original working directory
    process.chdir('C:\\apps');

    // Clean up test directories
    if (fs.existsSync(testHistoryRoot)) {
      fs.rmSync(testHistoryRoot, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Clean up any test files between tests
    if (fs.existsSync(testHistoryRoot)) {
      const items = fs.readdirSync(testHistoryRoot);
      for (const item of items) {
        const itemPath = path.join(testHistoryRoot, item);
        if (fs.statSync(itemPath).isFile()) {
          fs.unlinkSync(itemPath);
        }
      }
    }
  });

  describe('SessionManager', () => {
    describe('getSessionsDir', () => {
      test('should return sessions directory path', () => {
        const sessionsDir = SessionManager.getSessionsDir();
        expect(sessionsDir).toBe(path.join(testHistoryRoot, 'sessions'));
      });
    });

    describe('getSessionDir', () => {
      test('should return session directory path', () => {
        const sessionDir = SessionManager.getSessionDir('test-session');
        expect(sessionDir).toBe(path.join(testHistoryRoot, 'sessions', 'test-session'));
      });
    });

    describe('getCurrentSessionFile', () => {
      test('should return current session file path', () => {
        const currentFile = SessionManager.getCurrentSessionFile();
        expect(currentFile).toBe(path.join(testHistoryRoot, 'CURRENT'));
      });
    });

    describe('getByErrorDir', () => {
      test('should return error directory path for session', () => {
        const errorDir = SessionManager.getByErrorDir('test-session');
        expect(errorDir).toBe(path.join(testHistoryRoot, 'sessions', 'test-session', 'by_error'));
      });
    });

    describe('getErrorIndexPath', () => {
      test('should return error index file path', () => {
        const errorPath = SessionManager.getErrorIndexPath('test-session', 'timeout');
        expect(errorPath).toBe(path.join(testHistoryRoot, 'sessions', 'test-session', 'by_error', 'timeout.jsonl'));
      });

      test('should use unknown for undefined error type', () => {
        const errorPath = SessionManager.getErrorIndexPath('test-session');
        expect(errorPath).toBe(path.join(testHistoryRoot, 'sessions', 'test-session', 'by_error', 'unknown.jsonl'));
      });
    });

    describe('getCurrentSessionId', () => {
      test('should return session ID from file', () => {
        mockPathUtils.existsSync.mockReturnValue(true);
        mockPathUtils.readFileSync.mockReturnValue('test-session-id');

        const sessionId = SessionManager.getCurrentSessionId();
        expect(sessionId).toBe('test-session-id');
      });

      test('should return null when file does not exist', () => {
        mockPathUtils.existsSync.mockReturnValue(false);

        const sessionId = SessionManager.getCurrentSessionId();
        expect(sessionId).toBeNull();
      });

      test('should return null on read error', () => {
        mockPathUtils.existsSync.mockReturnValue(true);
        mockPathUtils.readFileSync.mockImplementation(() => { throw new Error('Read error'); });

        const sessionId = SessionManager.getCurrentSessionId();
        expect(sessionId).toBeNull();
      });
    });

    describe('setCurrentSessionId', () => {
      test('should write session ID to file', () => {
        const result = SessionManager.setCurrentSessionId('new-session-id');
        
        expect(result).toBe(true);
        expect(mockPathUtils.writeFileSync).toHaveBeenCalledWith(
          path.join(testHistoryRoot, 'CURRENT'),
          'new-session-id',
          'utf8'
        );
      });

      test('should return false on write error', () => {
        mockPathUtils.writeFileSync.mockImplementation(() => { throw new Error('Write error'); });

        const result = SessionManager.setCurrentSessionId('new-session-id');
        expect(result).toBe(false);
      });
    });

    describe('createAndSwitchSession', () => {
      test('should create new session and switch to it', () => {
        const sessionId = SessionManager.createAndSwitchSession();
        
        expect(sessionId).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-z0-9]{8}$/);
        expect(mockPathUtils.writeFileSync).toHaveBeenCalled();
      });

      test('should create session with custom name', () => {
        const sessionId = SessionManager.createAndSwitchSession('custom-name');
        
        expect(sessionId).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-z0-9]{8}$/);
      });
    });

    describe('getSessionForCwd', () => {
      test('should return current session ID', () => {
        mockPathUtils.readFileSync.mockReturnValue('current-session');

        const sessionId = SessionManager.getSessionForCwd('/test/cwd');
        expect(sessionId).toBe('current-session');
      });

      test('should create new session when no current session', () => {
        mockPathUtils.existsSync.mockReturnValue(false);

        const sessionId = SessionManager.getSessionForCwd('/test/cwd');
        expect(sessionId).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-z0-9]{8}$/);
      });
    });
  });

  describe('HistoryRecordManager', () => {
    describe('deriveErrorType', () => {
      test('should return success for successful record', () => {
        const record = { success: true };
        const errorType = HistoryRecordManager.deriveErrorType(record);
        expect(errorType).toBe('success');
      });

      test('should return timeout for timeout reason', () => {
        const record = { success: false, reason: 'timeout' };
        const errorType = HistoryRecordManager.deriveErrorType(record);
        expect(errorType).toBe('timeout');
      });

      test('should return spawn_error for spawn-error reason', () => {
        const record = { success: false, reason: 'spawn-error' };
        const errorType = HistoryRecordManager.deriveErrorType(record);
        expect(errorType).toBe('spawn_error');
      });

      test('should return blocked_security for blocked_security reason', () => {
        const record = { success: false, reason: 'blocked_security' };
        const errorType = HistoryRecordManager.deriveErrorType(record);
        expect(errorType).toBe('blocked_security');
      });

      test('should return permission_denied for return code 126', () => {
        const record = { success: false, return_code: 126 };
        const errorType = HistoryRecordManager.deriveErrorType(record);
        expect(errorType).toBe('permission_denied');
      });

      test('should return command_not_found for return code 127', () => {
        const record = { success: false, return_code: 127 };
        const errorType = HistoryRecordManager.deriveErrorType(record);
        expect(errorType).toBe('command_not_found');
      });

      test('should return nonzero_exit for other non-zero return codes', () => {
        const record = { success: false, return_code: 1 };
        const errorType = HistoryRecordManager.deriveErrorType(record);
        expect(errorType).toBe('nonzero_exit');
      });

      test('should return error for unknown cases', () => {
        const record = { success: false, return_code: 'invalid' };
        const errorType = HistoryRecordManager.deriveErrorType(record);
        expect(errorType).toBe('error');
      });
    });

    describe('buildOrderedRecord', () => {
      test('should build ordered record for successful command', () => {
        const safeRecord = {
          success: true,
          command: 'echo hello',
          return_code: 0,
          duration: '0.1s',
          stdout: 'hello',
          stderr: '',
          timestamp: '2023-01-01T00:00:00.000Z'
        };

        const ordered = HistoryRecordManager.buildOrderedRecord('test-session', safeRecord);

        expect(ordered.timestamp).toBe('2023-01-01T00:00:00.000Z');
        expect(ordered.session_id).toBe('test-session');
        expect(ordered.command).toBe('echo hello');
        expect(ordered.success).toBe(true);
        expect(ordered.return_code).toBe(0);
        expect(ordered.duration).toBe('0.1s');
        expect(ordered.stdout).toBe('hello');
        expect(ordered.stderr).toBe('');
        expect(ordered.error_type).toBe('success');
        expect(ordered.error_tail).toBeUndefined();
      });

      test('should build ordered record for failed command', () => {
        const safeRecord = {
          success: false,
          command: 'invalid-command',
          return_code: 127,
          duration: '0.1s',
          stdout: '',
          stderr: 'command not found',
          reason: 'command not found',
          timestamp: '2023-01-01T00:00:00.000Z'
        };

        const ordered = HistoryRecordManager.buildOrderedRecord('test-session', safeRecord);

        expect(ordered.success).toBe(false);
        expect(ordered.return_code).toBe(127);
        expect(ordered.error_type).toBe('command_not_found');
        expect(ordered.error_tail).toBe('err=command_not_found(command not found); rc=127');
      });
    });

    describe('safeTruncate', () => {
      test('should return empty string for non-string input', () => {
        const result = HistoryRecordManager.safeTruncate(null);
        expect(result).toBe('');
      });

      test('should return original string if within limit', () => {
        const shortText = 'short text';
        const result = HistoryRecordManager.safeTruncate(shortText);
        expect(result).toBe(shortText);
      });

      test('should truncate long text', () => {
        const longText = 'x'.repeat(1024 * 1024 + 100); // 1MB + 100 chars
        const result = HistoryRecordManager.safeTruncate(longText);
        
        expect(result.length).toBeLessThan(longText.length);
        expect(result).toContain('[truncated');
      });
    });

    describe('pushMemoryHistory', () => {
      test('should add entry to memory history', () => {
        const entry = { command: 'echo hello', success: true };
        
        HistoryRecordManager.pushMemoryHistory(entry);
        
        expect(HistoryRecordManager.commandHistory).toContain(entry);
      });

      test('should limit history size', () => {
        // Add more than MAX_HISTORY_SIZE entries
        for (let i = 0; i < 1001; i++) {
          HistoryRecordManager.pushMemoryHistory({ command: `cmd${i}`, success: true });
        }
        
        expect(HistoryRecordManager.commandHistory.length).toBe(1000);
        expect(HistoryRecordManager.commandHistory[0].command).toBe('cmd1');
      });
    });

    describe('listSessions', () => {
      test('should return empty array when no sessions exist', () => {
        const sessions = HistoryRecordManager.listSessions();
        expect(sessions).toEqual([]);
      });

      test('should return session information', () => {
        // Create a test session directory
        const testSessionDir = path.join(testSessionsDir, 'test-session');
        fs.mkdirSync(testSessionDir, { recursive: true });
        fs.writeFileSync(path.join(testSessionDir, 'session.log.jsonl'), 'test content');

        const sessions = HistoryRecordManager.listSessions();
        
        expect(sessions.length).toBe(1);
        expect(sessions[0].session_id).toBe('test-session');
        expect(sessions[0].format).toBe('dir');
      });
    });

    describe('loadSessionRecords', () => {
      test('should return empty array for non-existent session', () => {
        const records = HistoryRecordManager.loadSessionRecords('non-existent');
        expect(records).toEqual([]);
      });

      test('should load session records', () => {
        const testSessionDir = path.join(testSessionsDir, 'test-session');
        fs.mkdirSync(testSessionDir, { recursive: true });
        
        const logFile = path.join(testSessionDir, 'session.log.jsonl');
        const testRecord = { command: 'echo hello', success: true };
        fs.writeFileSync(logFile, JSON.stringify(testRecord) + '\n');

        const records = HistoryRecordManager.loadSessionRecords('test-session');
        
        expect(records.length).toBe(1);
        expect(records[0].command).toBe('echo hello');
      });

      test('should respect limit parameter', () => {
        const testSessionDir = path.join(testSessionsDir, 'test-session');
        fs.mkdirSync(testSessionDir, { recursive: true });
        
        const logFile = path.join(testSessionDir, 'session.log.jsonl');
        const records = [
          { command: 'cmd1', success: true },
          { command: 'cmd2', success: true },
          { command: 'cmd3', success: true }
        ];
        fs.writeFileSync(logFile, records.map(r => JSON.stringify(r)).join('\n'));

        const loadedRecords = HistoryRecordManager.loadSessionRecords('test-session', 2);
        
        expect(loadedRecords.length).toBe(2);
        expect(loadedRecords[0].command).toBe('cmd2');
        expect(loadedRecords[1].command).toBe('cmd3');
      });
    });
  });

  describe('Exported functions', () => {
    test('persistHistoryRecord should work correctly', () => {
      const record = {
        command: 'echo hello',
        success: true,
        return_code: 0,
        stdout: 'hello',
        stderr: ''
      };

      persistHistoryRecord(record);
      // Function should execute without throwing
      expect(true).toBe(true);
    });

    test('pushMemoryHistory should work correctly', () => {
      const entry = { command: 'echo hello', success: true };
      pushMemoryHistory(entry);
      
      expect(HistoryRecordManager.commandHistory).toContain(entry);
    });

    test('listSessions should work correctly', () => {
      const sessions = listSessions();
      expect(Array.isArray(sessions)).toBe(true);
    });

    test('loadSessionRecords should work correctly', () => {
      const records = loadSessionRecords('test-session');
      expect(Array.isArray(records)).toBe(true);
    });

    test('getCurrentSessionId should work correctly', () => {
      const sessionId = getCurrentSessionId();
      expect(sessionId).toBe('test-session-id');
    });

    test('setCurrentSessionId should work correctly', () => {
      const result = setCurrentSessionId('new-session');
      expect(result).toBe(true);
    });

    test('createAndSwitchSession should work correctly', () => {
      const sessionId = createAndSwitchSession();
      expect(sessionId).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-z0-9]{8}$/);
    });

    test('getSessionForCwd should work correctly', () => {
      const sessionId = getSessionForCwd('/test/cwd');
      expect(sessionId).toBe('test-session-id');
    });
  });
});
