const { SessionManager, HistoryRecordManager } = require('../index');
const fs = require('fs');
const path = require('path');

// Мокаем зависимости
jest.mock('fs');
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')), // Простая имитация path.join
  dirname: jest.fn((p) => p.split('/').slice(0, -1).join('/'))
}));

// Мокаем getCurrentDir и getOutputCharLimit
jest.mock('../../../root/mcp/node-terminal/Workdir.cjs', () => ({
  getCurrentDir: jest.fn(() => '/mock/current/dir'),
}));
jest.mock('../../../root/mcp/node-terminal/mcp/RuntimeMode.cjs', () => ({
  getOutputCharLimit: jest.fn(() => 1024),
}));

describe('SessionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(false);
    fs.readFileSync.mockReturnValue('');
    fs.mkdirSync.mockReturnValue(true);
    fs.writeFileSync.mockReturnValue(true);
  });

  test('getHistoryRoot should return correct path', () => {
    // В зависимости от того, как мы мокаем path.join, результат может быть разным.
    // Здесь предполагается, что process.cwd() будет корнем.
    expect(SessionManager.getSessionsDir()).toBe('history/sessions');
  });

  test('createAndSwitchSession should create a new session and set it as current', () => {
    const sessionId = SessionManager.createAndSwitchSession();
    expect(sessionId).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-z0-9]+/);
    expect(fs.writeFileSync).toHaveBeenCalledWith('history/CURRENT', expect.any(String), 'utf8');
    expect(fs.mkdirSync).toHaveBeenCalledWith(`history/sessions/${sessionId}`, { recursive: true });
  });

  test('getCurrentSessionId should return current session ID if exists', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('test-session-id');
    expect(SessionManager.getCurrentSessionId()).toBe('test-session-id');
  });

  test('setCurrentSessionId should set current session ID', () => {
    expect(SessionManager.setCurrentSessionId('new-session-id')).toBe(true);
    expect(fs.writeFileSync).toHaveBeenCalledWith('history/CURRENT', 'new-session-id', 'utf8');
  });
});

describe('HistoryRecordManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(false);
    fs.readFileSync.mockReturnValue('');
    fs.mkdirSync.mockReturnValue(true);
    fs.appendFileSync.mockReturnValue(true);
    require('../../../root/mcp/node-terminal/Workdir.cjs').getCurrentDir.mockReturnValue('/mock/current/dir');
    require('../../../root/mcp/node-terminal/mcp/RuntimeMode.cjs').getOutputCharLimit.mockReturnValue(1024);
  });

  test('deriveErrorType should correctly derive error types', () => {
    expect(HistoryRecordManager.deriveErrorType({ success: true })).toBe('success');
    expect(HistoryRecordManager.deriveErrorType({ success: false, reason: 'timeout' })).toBe('timeout');
    expect(HistoryRecordManager.deriveErrorType({ success: false, return_code: 126 })).toBe('permission_denied');
    expect(HistoryRecordManager.deriveErrorType({ success: false, return_code: 1 })).toBe('nonzero_exit');
    expect(HistoryRecordManager.deriveErrorType({ success: false })).toBe('error');
  });

  test('safeTruncate should truncate long text', () => {
    const longText = 'a'.repeat(2000);
    const truncatedText = HistoryRecordManager.safeTruncate(longText);
    expect(truncatedText.length).toBeLessThan(2000);
    expect(truncatedText).toContain('[truncated 976 chars]');
  });

  test('persistHistoryRecord should append record to session log', () => {
    const record = { 
      command: 'test command',
      cwd: '/test',
      stdout: 'test output',
      stderr: 'test error',
      success: true,
      return_code: 0,
      duration: '1s'
    };
    HistoryRecordManager.persistHistoryRecord(record);
    expect(fs.appendFileSync).toHaveBeenCalled();
    const writtenContent = fs.appendFileSync.mock.calls[0][0];
    const parsedContent = JSON.parse(writtenContent);
    expect(parsedContent.command).toBe('test command');
    expect(parsedContent.session_id).toBeDefined();
  });

  test('listSessions should return a list of sessions', () => {
    fs.readdirSync.mockReturnValueOnce([
      { name: 'session-1', isDirectory: () => true },
      { name: 'session-2', isDirectory: () => true },
    ]);
    fs.readdirSync.mockReturnValueOnce(['session.log.jsonl']);
    fs.readdirSync.mockReturnValueOnce(['session.log.jsonl']);
    fs.statSync.mockReturnValue({ size: 100, mtimeMs: Date.now() });
    
    const sessions = HistoryRecordManager.listSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions[0].session_id).toBe('session-2'); // Сортировка по убыванию даты изменения
  });

  test('loadSessionRecords should load records from a session file', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('{"cmd":"a"}\n{"cmd":"b"}\n');
    const records = HistoryRecordManager.loadSessionRecords('test-session');
    expect(records).toHaveLength(2);
    expect(records[0].cmd).toBe('a');
  });
});
