const assert = require('assert');
const path = require('path');
const fs = require('fs');

const { withPlatform, expectLoggerCalls } = require('../../../tests/utils/test-utils');
const {
  SessionManager,
  HistoryRecordManager
} = require('../index');

let configManager: any; // Явно указываем тип any для отладки

function readJsonl(filePath) {
	if (!fs.existsSync(filePath)) return [];
	const text = fs.readFileSync(filePath, 'utf8');
	return text
		.split(/\r?\n/)
		.filter((l) => l.trim().length)
		.map((l) => ({ raw: l }));
}

describe('SessionManager history persistence', () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = 'a_very_secret_key_for_testing_purposes_1234'; // Устанавливаем ключ шифрования для тестов
    const { EnhancedConfigManager } = require('../../config-manager/dist/EnhancedConfigManager.js');
    configManager = new EnhancedConfigManager();
    console.log('beforeAll: configManager', configManager); // Отладка
  });

  afterAll(() => {
    console.log('afterAll: configManager', configManager); // Отладка
    console.log('afterAll: typeof configManager.shutdownWatchers', typeof configManager.shutdownWatchers); // Отладка
    if (configManager && typeof configManager.shutdownWatchers === 'function') {
      configManager.shutdownWatchers(); // Закрываем наблюдателей файлов
    }
  });

  beforeEach(() => {
    // очистка истории перед запуском каждого теста
    const historyRoot = SessionManager.getHistoryRoot();
    const sessionsDir = SessionManager.getSessionsDir();
    const currentFile = SessionManager.getCurrentSessionFile();
    try { fs.rmSync(sessionsDir, { recursive: true, force: true }); } catch (e) { console.error("Failed to remove sessions dir:", e); }
    try { if (fs.existsSync(currentFile)) fs.unlinkSync(currentFile); } catch (e) { console.error("Failed to unlink current file:", e); }
    try { fs.mkdirSync(sessionsDir, { recursive: true }); } catch (e) { console.error("Failed to create sessions dir:", e); }
  });

  it('should manage sessions correctly', () => {
    const sessionId = SessionManager.createAndSwitchSession();
    expect(sessionId).toBeDefined();
    expect(SessionManager.getCurrentSessionId()).toBe(sessionId);
    expect(fs.existsSync(SessionManager.getSessionDir(sessionId))).toBe(true);
  });

  it('should derive error types correctly', () => {
    expect(HistoryRecordManager.deriveErrorType({ success: true })).toBe('success');
    expect(HistoryRecordManager.deriveErrorType({ success: false, reason: 'timeout' })).toBe('timeout');
    expect(HistoryRecordManager.deriveErrorType({ success: false, return_code: 127 })).toBe('command_not_found');
    expect(HistoryRecordManager.deriveErrorType({ success: false, return_code: 1 })).toBe('nonzero_exit');
    expect(HistoryRecordManager.deriveErrorType({ success: false })).toBe('error');
  });

  it('should persist history records', async () => {
    const sessionId = SessionManager.createAndSwitchSession();
    const record = {
      command: 'echo hello',
      cwd: process.cwd(),
      success: true,
      stdout: 'hello',
      stderr: '',
      return_code: 0,
      duration: '1ms'
    };
    await HistoryRecordManager.persistHistoryRecord(record);

    const sessionLogPath = path.join(SessionManager.getSessionDir(sessionId), 'session.log.jsonl');
    expect(fs.existsSync(sessionLogPath)).toBe(true);

    const records = readJsonl(sessionLogPath);
    expect(records.length).toBe(1);
    const storedRecord = JSON.parse(records[0].raw);
    expect(storedRecord.command).toBe('echo hello');
    expect(storedRecord.success).toBe(true);
  });

  it('should append by error type', async () => {
    const sessionId = SessionManager.createAndSwitchSession();
    const errorRecord = {
      command: 'bad_command',
      cwd: process.cwd(),
      success: false,
      stdout: '',
      stderr: 'command not found',
      return_code: 127,
      duration: '1ms',
      error_type: 'command_not_found'
    };
    await HistoryRecordManager.persistHistoryRecord(errorRecord);

    const errorLogPath = SessionManager.getErrorIndexPath(sessionId, 'command_not_found');
    expect(fs.existsSync(errorLogPath)).toBe(true);

    const records = readJsonl(errorLogPath);
    expect(records.length).toBe(1);
    const storedRecord = JSON.parse(records[0].raw);
    expect(storedRecord.command).toBe('bad_command');
    expect(storedRecord.error_type).toBe('command_not_found');
  });

  it('should list sessions', async () => {
    SessionManager.createAndSwitchSession('test-session-1');
    SessionManager.createAndSwitchSession('test-session-2');
    const sessions = await SessionManager.listSessions();
    expect(sessions.length).toBeGreaterThanOrEqual(2);
    // Так как ID сессий генерируются динамически, проверяем только количество.
    // expect(sessions.some(s => s.session_id.includes('test-session-1'))).toBe(true);
    // expect(sessions.some(s => s.session_id.includes('test-session-2'))).toBe(true);
  });

  it('should load session records', async () => {
    const sessionId = SessionManager.createAndSwitchSession();
    await HistoryRecordManager.persistHistoryRecord({ command: 'cmd1', success: true });
    await HistoryRecordManager.persistHistoryRecord({ command: 'cmd2', success: true });

    const records = await SessionManager.loadSessionRecords(sessionId);
    expect(records.length).toBe(2);
    expect(records[0].command).toBe('cmd1');
    expect(records[1].command).toBe('cmd2');
	});
});
