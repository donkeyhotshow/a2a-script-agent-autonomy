const { HistoryImporter, historyImporter } = require('../index.cjs');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock dependencies
jest.mock('C:/apps/libs/validation/validation/validation-utils.js', () => ({
  validationUtils: {
    isString: jest.fn((val) => typeof val === 'string'),
    isFunction: jest.fn((val) => typeof val === 'function'),
  }
}));

jest.mock('C:/apps/libs/system/file-operations/index.js', () => ({
  fileSystemUtils: {
    join: jest.fn((...args) => path.join(...args)),
  }
}));

jest.mock('C:/apps/libs/error-management/error-handler/error-utils.js', () => ({
  errorUtils: {
    safeExecute: jest.fn((fn) => fn()),
  }
}));

jest.mock('C:/apps/libs/system/history/index.cjs', () => ({
  persistHistoryRecord: jest.fn(),
  createAndSwitchSession: jest.fn(() => 'test-session-id'),
}));

jest.mock('C:/apps/root/mcp/node-terminal/mcp/DebugSystem.cjs', () => ({
  debugSystem: {
    log: jest.fn(),
  },
  DEBUG_CATEGORIES: {
    HISTORY: 'history',
  }
}));

describe('HistoryImporter', () => {
  let importer;
  let testDir;
  let mockPersistHistoryRecord;
  let mockCreateAndSwitchSession;
  let mockDebugSystem;

  beforeEach(() => {
    jest.clearAllMocks();
    
    testDir = path.join(os.tmpdir(), `history-importer-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    
    importer = new HistoryImporter();
    
    mockPersistHistoryRecord = require('C:/apps/libs/system/history/index.cjs').persistHistoryRecord;
    mockCreateAndSwitchSession = require('C:/apps/libs/system/history/index.cjs').createAndSwitchSession;
    mockDebugSystem = require('C:/apps/root/mcp/node-terminal/mcp/DebugSystem.cjs').debugSystem;
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    test('should create instance with default values', () => {
      expect(importer.importedCount).toBe(0);
      expect(importer.errors).toEqual([]);
    });

    test('should create independent instances', () => {
      const importer1 = new HistoryImporter();
      const importer2 = new HistoryImporter();
      
      importer1.importedCount = 5;
      importer1.errors.push('test error');
      
      expect(importer2.importedCount).toBe(0);
      expect(importer2.errors).toEqual([]);
    });
  });

  describe('isHistoryFile', () => {
    test('should identify session.log.jsonl files', () => {
      expect(importer.isHistoryFile('session.log.jsonl')).toBe(true);
      expect(importer.isHistoryFile('test-session.log.jsonl')).toBe(true);
    });

    test('should identify .jsonl files', () => {
      expect(importer.isHistoryFile('history.jsonl')).toBe(true);
      expect(importer.isHistoryFile('commands.jsonl')).toBe(true);
    });

    test('should identify history log files', () => {
      expect(importer.isHistoryFile('history.log')).toBe(true);
      expect(importer.isHistoryFile('commands.log')).toBe(true);
      expect(importer.isHistoryFile('terminal.log')).toBe(true);
    });

    test('should reject non-history files', () => {
      expect(importer.isHistoryFile('file.txt')).toBe(false);
      expect(importer.isHistoryFile('script.js')).toBe(false);
      expect(importer.isHistoryFile('config.json')).toBe(false);
      expect(importer.isHistoryFile('README.md')).toBe(false);
    });

    test('should handle case sensitivity', () => {
      expect(importer.isHistoryFile('SESSION.LOG.JSONL')).toBe(true);
      expect(importer.isHistoryFile('History.Log')).toBe(true);
    });
  });

  describe('findHistoryFiles', () => {
    test('should find history files in directory', () => {
      // Create test files
      fs.writeFileSync(path.join(testDir, 'session.log.jsonl'), 'test');
      fs.writeFileSync(path.join(testDir, 'history.jsonl'), 'test');
      fs.writeFileSync(path.join(testDir, 'file.txt'), 'test');
      
      const files = importer.findHistoryFiles(testDir);
      
      expect(files.length).toBe(2);
      expect(files.some(f => f.includes('session.log.jsonl'))).toBe(true);
      expect(files.some(f => f.includes('history.jsonl'))).toBe(true);
    });

    test('should find history files in subdirectories', () => {
      const subDir = path.join(testDir, 'subdir');
      fs.mkdirSync(subDir, { recursive: true });
      
      fs.writeFileSync(path.join(testDir, 'session.log.jsonl'), 'test');
      fs.writeFileSync(path.join(subDir, 'history.jsonl'), 'test');
      fs.writeFileSync(path.join(subDir, 'commands.log'), 'test');
      
      const files = importer.findHistoryFiles(testDir);
      
      expect(files.length).toBe(3);
    });

    test('should handle empty directory', () => {
      const files = importer.findHistoryFiles(testDir);
      expect(files).toEqual([]);
    });

    test('should handle non-existent directory', () => {
      const nonExistentDir = path.join(testDir, 'non-existent');
      const files = importer.findHistoryFiles(nonExistentDir);
      expect(files).toEqual([]);
    });

    test('should ignore non-history files', () => {
      fs.writeFileSync(path.join(testDir, 'file.txt'), 'test');
      fs.writeFileSync(path.join(testDir, 'script.js'), 'test');
      fs.writeFileSync(path.join(testDir, 'config.json'), 'test');
      
      const files = importer.findHistoryFiles(testDir);
      expect(files).toEqual([]);
    });
  });

  describe('matchesFilter', () => {
    const testRecord = {
      command: 'echo hello world',
      success: true,
      timestamp: '2023-01-01T00:00:00.000Z'
    };

    test('should match string filter', () => {
      expect(importer.matchesFilter(testRecord, 'hello')).toBe(true);
      expect(importer.matchesFilter(testRecord, 'echo')).toBe(true);
      expect(importer.matchesFilter(testRecord, 'world')).toBe(true);
    });

    test('should not match string filter', () => {
      expect(importer.matchesFilter(testRecord, 'goodbye')).toBe(false);
      expect(importer.matchesFilter(testRecord, 'test')).toBe(false);
    });

    test('should handle case insensitive string matching', () => {
      expect(importer.matchesFilter(testRecord, 'HELLO')).toBe(true);
      expect(importer.matchesFilter(testRecord, 'ECHO')).toBe(true);
    });

    test('should match regex filter', () => {
      expect(importer.matchesFilter(testRecord, /hello/)).toBe(true);
      expect(importer.matchesFilter(testRecord, /^echo/)).toBe(true);
      expect(importer.matchesFilter(testRecord, /world$/)).toBe(true);
    });

    test('should not match regex filter', () => {
      expect(importer.matchesFilter(testRecord, /goodbye/)).toBe(false);
      expect(importer.matchesFilter(testRecord, /^test/)).toBe(false);
    });

    test('should match function filter', () => {
      const filterFunc = (record) => record.command.includes('hello');
      expect(importer.matchesFilter(testRecord, filterFunc)).toBe(true);
    });

    test('should not match function filter', () => {
      const filterFunc = (record) => record.command.includes('goodbye');
      expect(importer.matchesFilter(testRecord, filterFunc)).toBe(false);
    });

    test('should return true for null/undefined filter', () => {
      expect(importer.matchesFilter(testRecord, null)).toBe(true);
      expect(importer.matchesFilter(testRecord, undefined)).toBe(true);
    });

    test('should handle record without command', () => {
      const recordWithoutCommand = { success: true };
      expect(importer.matchesFilter(recordWithoutCommand, 'hello')).toBe(false);
    });
  });

  describe('normalizeRecord', () => {
    test('should normalize complete record', () => {
      const originalRecord = {
        timestamp: '2023-01-01T00:00:00.000Z',
        command: 'echo hello',
        success: true,
        return_code: 0,
        duration: '0.1s',
        stdout: 'hello',
        stderr: '',
        cwd: '/test/cwd',
        platform: 'linux',
        reason: 'success',
        error_type: 'success'
      };

      const normalized = importer.normalizeRecord(originalRecord, 'test-session');

      expect(normalized).toEqual({
        ...originalRecord,
        session_id: 'test-session',
        imported: true,
        source_file: 'unknown'
      });
    });

    test('should normalize incomplete record with defaults', () => {
      const originalRecord = {
        command: 'echo hello'
      };

      const normalized = importer.normalizeRecord(originalRecord, 'test-session');

      expect(normalized.timestamp).toBeDefined();
      expect(normalized.command).toBe('echo hello');
      expect(normalized.success).toBe(true);
      expect(normalized.return_code).toBe(0);
      expect(normalized.duration).toBe('0');
      expect(normalized.stdout).toBe('');
      expect(normalized.stderr).toBe('');
      expect(normalized.cwd).toBe(process.cwd());
      expect(normalized.platform).toBe(process.platform);
      expect(normalized.reason).toBe('imported');
      expect(normalized.error_type).toBe('success');
      expect(normalized.imported).toBe(true);
      expect(normalized.source_file).toBe('unknown');
      expect(normalized.session_id).toBe('test-session');
    });

    test('should handle record without sessionId', () => {
      const originalRecord = { command: 'echo hello' };
      const normalized = importer.normalizeRecord(originalRecord);

      expect(normalized.session_id).toBeUndefined();
    });

    test('should preserve existing session_id', () => {
      const originalRecord = {
        command: 'echo hello',
        session_id: 'existing-session'
      };

      const normalized = importer.normalizeRecord(originalRecord, 'new-session');

      expect(normalized.session_id).toBe('new-session');
    });
  });

  describe('importFromFile', () => {
    test('should import records from file', async () => {
      const historyFile = path.join(testDir, 'session.log.jsonl');
      const records = [
        { command: 'echo hello', success: true },
        { command: 'ls -la', success: true },
        { command: 'cat file.txt', success: false }
      ];

      fs.writeFileSync(historyFile, records.map(r => JSON.stringify(r)).join('\n'));

      const importedCount = await importer.importFromFile(historyFile, {
        sessionId: 'test-session'
      });

      expect(importedCount).toBe(3);
      expect(mockPersistHistoryRecord).toHaveBeenCalledTimes(3);
    });

    test('should handle empty file', async () => {
      const historyFile = path.join(testDir, 'empty.jsonl');
      fs.writeFileSync(historyFile, '');

      const importedCount = await importer.importFromFile(historyFile, {
        sessionId: 'test-session'
      });

      expect(importedCount).toBe(0);
      expect(mockPersistHistoryRecord).not.toHaveBeenCalled();
    });

    test('should handle file with invalid JSON', async () => {
      const historyFile = path.join(testDir, 'invalid.jsonl');
      fs.writeFileSync(historyFile, 'invalid json\n{"valid": true}\ninvalid again');

      const importedCount = await importer.importFromFile(historyFile, {
        sessionId: 'test-session'
      });

      expect(importedCount).toBe(1);
      expect(mockPersistHistoryRecord).toHaveBeenCalledTimes(1);
    });

    test('should respect maxRecords limit', async () => {
      const historyFile = path.join(testDir, 'large.jsonl');
      const records = Array.from({ length: 10 }, (_, i) => ({
        command: `command${i}`,
        success: true
      }));

      fs.writeFileSync(historyFile, records.map(r => JSON.stringify(r)).join('\n'));

      const importedCount = await importer.importFromFile(historyFile, {
        sessionId: 'test-session',
        maxRecords: 5
      });

      expect(importedCount).toBe(5);
      expect(mockPersistHistoryRecord).toHaveBeenCalledTimes(5);
    });

    test('should apply filter pattern', async () => {
      const historyFile = path.join(testDir, 'filtered.jsonl');
      const records = [
        { command: 'echo hello', success: true },
        { command: 'ls -la', success: true },
        { command: 'cat file.txt', success: true }
      ];

      fs.writeFileSync(historyFile, records.map(r => JSON.stringify(r)).join('\n'));

      const importedCount = await importer.importFromFile(historyFile, {
        sessionId: 'test-session',
        filterPattern: 'echo'
      });

      expect(importedCount).toBe(1);
      expect(mockPersistHistoryRecord).toHaveBeenCalledTimes(1);
    });

    test('should handle file read errors', async () => {
      const nonExistentFile = path.join(testDir, 'non-existent.jsonl');

      const importedCount = await importer.importFromFile(nonExistentFile, {
        sessionId: 'test-session'
      });

      expect(importedCount).toBe(0);
    });
  });

  describe('importFromDirectory', () => {
    test('should import from directory with history files', async () => {
      // Create test files
      fs.writeFileSync(path.join(testDir, 'session.log.jsonl'), 
        JSON.stringify({ command: 'echo hello', success: true }));
      fs.writeFileSync(path.join(testDir, 'history.jsonl'), 
        JSON.stringify({ command: 'ls -la', success: true }));

      const result = await importer.importFromDirectory(testDir, {
        createNewSession: true,
        sessionName: 'test-import'
      });

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(2);
      expect(result.sessionId).toBe('test-session-id');
      expect(mockCreateAndSwitchSession).toHaveBeenCalledWith('test-import');
      expect(mockPersistHistoryRecord).toHaveBeenCalledTimes(2);
    });

    test('should handle directory without history files', async () => {
      fs.writeFileSync(path.join(testDir, 'file.txt'), 'not a history file');

      const result = await importer.importFromDirectory(testDir);

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(0);
    });

    test('should handle non-existent directory', async () => {
      const nonExistentDir = path.join(testDir, 'non-existent');

      const result = await importer.importFromDirectory(nonExistentDir);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should respect maxRecords option', async () => {
      const historyFile = path.join(testDir, 'session.log.jsonl');
      const records = Array.from({ length: 5 }, (_, i) => ({
        command: `command${i}`,
        success: true
      }));

      fs.writeFileSync(historyFile, records.map(r => JSON.stringify(r)).join('\n'));

      const result = await importer.importFromDirectory(testDir, {
        maxRecords: 3
      });

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(3);
    });

    test('should apply filter pattern', async () => {
      const historyFile = path.join(testDir, 'session.log.jsonl');
      const records = [
        { command: 'echo hello', success: true },
        { command: 'ls -la', success: true },
        { command: 'cat file.txt', success: true }
      ];

      fs.writeFileSync(historyFile, records.map(r => JSON.stringify(r)).join('\n'));

      const result = await importer.importFromDirectory(testDir, {
        filterPattern: 'echo'
      });

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
    });

    test('should not create new session when createNewSession is false', async () => {
      const historyFile = path.join(testDir, 'session.log.jsonl');
      fs.writeFileSync(historyFile, JSON.stringify({ command: 'echo hello', success: true }));

      const result = await importer.importFromDirectory(testDir, {
        createNewSession: false
      });

      expect(result.success).toBe(true);
      expect(result.sessionId).toBeUndefined();
      expect(mockCreateAndSwitchSession).not.toHaveBeenCalled();
    });
  });

  describe('importFromProject', () => {
    test('should import from project with default options', async () => {
      const projectPath = '/test/project';
      const historyFile = path.join(testDir, 'session.log.jsonl');
      fs.writeFileSync(historyFile, JSON.stringify({ command: 'echo hello', success: true }));

      const result = await importer.importFromProject(projectPath, {
        maxRecords: 1
      });

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
      expect(mockCreateAndSwitchSession).toHaveBeenCalledWith('imported_project');
    });

    test('should use custom session name', async () => {
      const projectPath = '/test/project';
      const historyFile = path.join(testDir, 'session.log.jsonl');
      fs.writeFileSync(historyFile, JSON.stringify({ command: 'echo hello', success: true }));

      const result = await importer.importFromProject(projectPath, {
        sessionName: 'custom-session'
      });

      expect(result.success).toBe(true);
      expect(mockCreateAndSwitchSession).toHaveBeenCalledWith('custom-session');
    });
  });

  describe('getImportStats', () => {
    test('should return import statistics', () => {
      importer.importedCount = 5;
      importer.errors = ['Error 1', 'Error 2'];

      const stats = importer.getImportStats();

      expect(stats).toEqual({
        importedCount: 5,
        errors: ['Error 1', 'Error 2'],
        errorCount: 2
      });
    });

    test('should return zero stats for new instance', () => {
      const stats = importer.getImportStats();

      expect(stats).toEqual({
        importedCount: 0,
        errors: [],
        errorCount: 0
      });
    });
  });

  describe('clearErrors', () => {
    test('should clear all errors', () => {
      importer.errors = ['Error 1', 'Error 2'];
      
      importer.clearErrors();
      
      expect(importer.errors).toEqual([]);
    });

    test('should work on empty errors array', () => {
      importer.clearErrors();
      
      expect(importer.errors).toEqual([]);
    });
  });

  describe('Global instance', () => {
    test('should export global historyImporter instance', () => {
      expect(historyImporter).toBeInstanceOf(HistoryImporter);
    });

    test('should work with global instance', async () => {
      const historyFile = path.join(testDir, 'session.log.jsonl');
      fs.writeFileSync(historyFile, JSON.stringify({ command: 'echo hello', success: true }));

      const result = await historyImporter.importFromDirectory(testDir);

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
    });
  });

  describe('Integration scenarios', () => {
    test('should handle complete import workflow', async () => {
      // Create test project structure
      const projectDir = path.join(testDir, 'test-project');
      fs.mkdirSync(projectDir, { recursive: true });
      
      const historyFile = path.join(projectDir, 'session.log.jsonl');
      const records = [
        { command: 'echo hello', success: true },
        { command: 'ls -la', success: true },
        { command: 'cat file.txt', success: false }
      ];

      fs.writeFileSync(historyFile, records.map(r => JSON.stringify(r)).join('\n'));

      // Import from project
      const result = await importer.importFromProject(projectDir, {
        filterPattern: 'echo',
        maxRecords: 2
      });

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1); // Only 'echo hello' matches filter
      expect(result.sessionId).toBe('test-session-id');

      // Check stats
      const stats = importer.getImportStats();
      expect(stats.importedCount).toBe(1);
      expect(stats.errorCount).toBe(0);
    });

    test('should handle error scenarios gracefully', async () => {
      // Test with non-existent directory
      const result = await importer.importFromDirectory('/non/existent/path');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.importedCount).toBe(0);

      // Check that errors are tracked
      const stats = importer.getImportStats();
      expect(stats.errorCount).toBeGreaterThanOrEqual(0);
    });
  });
});
