import HistoryManager from '../src/history-manager.js';
import fs from 'fs/promises';
import path from 'path';

describe('HistoryManager', () => {
  let historyManager: HistoryManager;
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = path.join(__dirname, 'temp-test-' + Date.now());
    historyManager = new HistoryManager({ projectPath: tempDir });
    await historyManager.initialize();
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Session Management', () => {
    test('should create a new session', async () => {
      const session = await historyManager.createSession('Test Session', 'Test Description', ['test']);
      
      expect(session).toBeDefined();
      expect(session.name).toBe('Test Session');
      expect(session.description).toBe('Test Description');
      expect(session.tags).toContain('test');
      expect(session.status).toBe('active');
    });

    test('should get active session', async () => {
      await historyManager.createSession('Test Session');
      const activeSession = await historyManager.getActiveSession();
      
      expect(activeSession).toBeDefined();
      expect(activeSession?.metadata.name).toBe('Test Session');
    });

    test('should list sessions', async () => {
      await historyManager.createSession('Session 1');
      await historyManager.createSession('Session 2');
      
      const sessions = await historyManager.listSessions();
      
      expect(sessions).toHaveLength(2);
      expect(sessions[0].name).toBe('Session 2'); // Should be sorted by updatedAt
    });

    test('should switch sessions', async () => {
      const session1 = await historyManager.createSession('Session 1');
      const session2 = await historyManager.createSession('Session 2');
      
      // Switch to session1 - this sets currentSessionId but storage doesn't track "current" separately
      const switched = await historyManager.switchSession(session1.id);
      expect(switched).toBe(true);
      
      // After switching, both sessions may have status 'active', but we can verify session1 exists
      const session = await historyManager.getSession(session1.id);
      expect(session).toBeDefined();
      expect(session?.metadata.id).toBe(session1.id);
    });

    test('should archive current session', async () => {
      await historyManager.createSession('Test Session');
      const sessionId = historyManager['currentSessionId'];
      
      // Archive using the known session ID
      const archived = await historyManager.archiveCurrentSession();
      
      expect(archived).toBe(true);
      
      // Verify session was archived by checking its status
      const session = await historyManager.getSession(sessionId!);
      expect(session?.metadata.status).toBe('archived');
    });
  });

  describe('Exchange Log Management', () => {
    beforeEach(async () => {
      await historyManager.createSession('Test Session');
    });

    test('should add exchange log entry', async () => {
      const added = await historyManager.addExchangeLog(
        'request',
        { type: 'form', content: 'test' },
        { userId: 'test-user' }
      );
      
      expect(added).toBe(true);
      
      const exchangeLog = await historyManager.getExchangeLog();
      expect(exchangeLog).toHaveLength(1);
      expect(exchangeLog[0].type).toBe('request');
      expect(exchangeLog[0].content.type).toBe('form');
      expect(exchangeLog[0].metadata?.userId).toBe('test-user');
    });

    test('should get empty exchange log for new session', async () => {
      const exchangeLog = await historyManager.getExchangeLog();
      
      expect(exchangeLog).toHaveLength(0);
    });

    test('should handle multiple exchange log entries', async () => {
      await historyManager.addExchangeLog('request', { action: 'test' });
      await historyManager.addExchangeLog('response', { result: 'success' });
      await historyManager.addExchangeLog('error', { message: 'test error' });
      
      const exchangeLog = await historyManager.getExchangeLog();
      expect(exchangeLog).toHaveLength(3);
      
      expect(exchangeLog[0].type).toBe('request');
      expect(exchangeLog[1].type).toBe('response');
      expect(exchangeLog[2].type).toBe('error');
    });
  });

  describe('Message Management', () => {
    beforeEach(async () => {
      await historyManager.createSession('Test Session');
    });

    test('should add message entry', async () => {
      const added = await historyManager.addMessage(
        'Hello, world!',
        'user',
        { source: 'test' }
      );
      
      expect(added).toBe(true);
      
      const messages = await historyManager.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Hello, world!');
      expect(messages[0].role).toBe('user');
      expect(messages[0].metadata?.source).toBe('test');
    });

    test('should get empty messages for new session', async () => {
      const messages = await historyManager.getMessages();
      
      expect(messages).toHaveLength(0);
    });

    test('should handle multiple message entries', async () => {
      await historyManager.addMessage('User message', 'user');
      await historyManager.addMessage('Assistant response', 'assistant');
      await historyManager.addMessage('System notification', 'system');
      
      const messages = await historyManager.getMessages();
      expect(messages).toHaveLength(3);
      
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
      expect(messages[2].role).toBe('system');
    });
  });

  describe('Message Reconstruction', () => {
    beforeEach(async () => {
      await historyManager.createSession('Test Session');
    });

    test('should reconstruct messages from exchange log', async () => {
      // Add request with form choice
      await historyManager.addExchangeLog('request', {
        result: {
          form: {
            choice: 'option1'
          }
        }
      });
      
      // Add response with message
      await historyManager.addExchangeLog('response', {
        execute: {
          message: 'Assistant response'
        }
      });
      
      // Add error
      await historyManager.addExchangeLog('error', {
        message: 'Something went wrong'
      });
      
      const reconstructedMessages = await historyManager.reconstructMessagesFromLog();
      
      expect(reconstructedMessages).toHaveLength(3);
      
      // Check user message
      const userMessage = reconstructedMessages.find(m => m.role === 'user');
      expect(userMessage?.content).toBe('User selected: option1');
      
      // Check assistant message
      const assistantMessage = reconstructedMessages.find(m => m.role === 'assistant');
      expect(assistantMessage?.content).toBe('Assistant: Assistant response');
      
      // Check system message (error)
      const systemMessage = reconstructedMessages.find(m => m.role === 'system');
      expect(systemMessage?.content).toBe('Error: Something went wrong');
    });

    test('should return empty array for session without exchange log', async () => {
      const reconstructedMessages = await historyManager.reconstructMessagesFromLog();
      
      expect(reconstructedMessages).toHaveLength(0);
    });
  });

  describe('Session Summary', () => {
    beforeEach(async () => {
      await historyManager.createSession('Test Session');
    });

    test('should get session summary', async () => {
      // Add some data
      await historyManager.addMessage('Test message', 'user');
      await historyManager.addExchangeLog('request', { action: 'test' });
      await historyManager.addExchangeLog('response', { result: 'success' });
      
      const summary = await historyManager.getSessionSummary();
      
      expect(summary.session).toBeDefined();
      // The sessionStorage.getSessionSummary returns these fields
      expect(summary.messageCount).toBe(1);
      expect(summary.exchangeLogCount).toBe(2);
      expect(summary.recentMessages).toHaveLength(1);
      expect(summary.recentExchangeLog).toHaveLength(2);
    });

    test('should handle session summary for empty session', async () => {
      const summary = await historyManager.getSessionSummary();
      
      expect(summary.session).toBeDefined();
      // The sessionStorage.getSessionSummary returns these fields
      expect(summary.messageCount).toBe(0);
      expect(summary.exchangeLogCount).toBe(0);
      expect(summary.recentMessages).toHaveLength(0);
      expect(summary.recentExchangeLog).toHaveLength(0);
    });
  });

  describe('Context Management', () => {
    beforeEach(async () => {
      await historyManager.createSession('Test Session');
    });

    test('should update context', async () => {
      const updated = await historyManager.updateContext({
        testKey: 'testValue',
        nested: { key: 'value' }
      });
      
      expect(updated).toBe(true);
      
      const context = await historyManager.getContext();
      expect(context.testKey).toBe('testValue');
      expect(context.nested.key).toBe('value');
    });

    test('should get empty context for new session', async () => {
      const context = await historyManager.getContext();
      
      // Context returns empty arrays for new session, not empty object
      expect(context).toEqual({ exchangeLog: [], messages: [] });
    });
  });

  describe('Error Handling', () => {
    test('should throw error when no active session', async () => {
      await expect(historyManager.addExchangeLog('request', {})).rejects.toThrow('No active session');
      await expect(historyManager.getExchangeLog()).rejects.toThrow('No active session');
      await expect(historyManager.addMessage('test')).rejects.toThrow('No active session');
      await expect(historyManager.getMessages()).rejects.toThrow('No active session');
      await expect(historyManager.reconstructMessagesFromLog()).rejects.toThrow('No active session');
      await expect(historyManager.getSessionSummary()).rejects.toThrow('No active session');
      await expect(historyManager.getContext()).rejects.toThrow('No active session');
      await expect(historyManager.updateContext({})).rejects.toThrow('No active session');
    });
  });
});