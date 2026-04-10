import { SessionStorage } from '../src/session-storage.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('SessionStorage', () => {
  let sessionStorage: SessionStorage;
  let tempDir: string;

  beforeEach(async () => {
    // Unique dir per run (parallel vitest workers can collide on Date.now() under __dirname).
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'a2a-session-storage-test-'));
    sessionStorage = new SessionStorage(tempDir);
    await sessionStorage.initialize();
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
      const session = await sessionStorage.createSession('Test Session', 'Test Description', ['test']);
      
      expect(session).toBeDefined();
      expect(session.name).toBe('Test Session');
      expect(session.description).toBe('Test Description');
      expect(session.tags).toContain('test');
      expect(session.status).toBe('active');
    });

    test('should get session by ID', async () => {
      const session = await sessionStorage.createSession('Test Session');
      const retrievedSession = await sessionStorage.getSession(session.id);
      
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession?.metadata.id).toBe(session.id);
    });

    test('should list all sessions', async () => {
      await sessionStorage.createSession('Session 1');
      await sessionStorage.createSession('Session 2');
      
      const sessions = await sessionStorage.listSessions();
      
      expect(sessions).toHaveLength(2);
      expect(sessions[0].name).toBe('Session 2'); // Should be sorted by updatedAt
    });

    test('should update session', async () => {
      const session = await sessionStorage.createSession('Test Session');
      const updated = await sessionStorage.updateSession(session.id, { name: 'Updated Session' });
      
      expect(updated).toBe(true);
      
      const retrievedSession = await sessionStorage.getSession(session.id);
      expect(retrievedSession?.metadata.name).toBe('Updated Session');
    });

    test('should delete session', async () => {
      const session = await sessionStorage.createSession('Test Session');
      const deleted = await sessionStorage.deleteSession(session.id);
      
      expect(deleted).toBe(true);
      
      const retrievedSession = await sessionStorage.getSession(session.id);
      expect(retrievedSession).toBeNull();
    });
  });

  describe('Exchange Log Management', () => {
    test('should add exchange log entry', async () => {
      const session = await sessionStorage.createSession('Test Session');
      
      const added = await sessionStorage.addExchangeLog(
        session.id,
        'request',
        { type: 'form', content: 'test' },
        { userId: 'test-user' }
      );
      
      expect(added).toBe(true);
      
      const exchangeLog = await sessionStorage.getExchangeLog(session.id);
      expect(exchangeLog).toHaveLength(1);
      expect(exchangeLog[0].type).toBe('request');
      expect(exchangeLog[0].content.type).toBe('form');
      expect(exchangeLog[0].metadata?.userId).toBe('test-user');
    });

    test('should get empty exchange log for new session', async () => {
      const session = await sessionStorage.createSession('Test Session');
      const exchangeLog = await sessionStorage.getExchangeLog(session.id);
      
      expect(exchangeLog).toHaveLength(0);
    });

    test('should handle multiple exchange log entries', async () => {
      const session = await sessionStorage.createSession('Test Session');
      
      await sessionStorage.addExchangeLog(session.id, 'request', { action: 'test' });
      await sessionStorage.addExchangeLog(session.id, 'response', { result: 'success' });
      await sessionStorage.addExchangeLog(session.id, 'error', { message: 'test error' });
      
      const exchangeLog = await sessionStorage.getExchangeLog(session.id);
      expect(exchangeLog).toHaveLength(3);
      
      expect(exchangeLog[0].type).toBe('request');
      expect(exchangeLog[1].type).toBe('response');
      expect(exchangeLog[2].type).toBe('error');
    });
  });

  describe('Message Management', () => {
    test('should add message entry', async () => {
      const session = await sessionStorage.createSession('Test Session');
      
      const added = await sessionStorage.addMessage(
        session.id,
        'Hello, world!',
        'user',
        { source: 'test' }
      );
      
      expect(added).toBe(true);
      
      const messages = await sessionStorage.getMessages(session.id);
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Hello, world!');
      expect(messages[0].role).toBe('user');
      expect(messages[0].metadata?.source).toBe('test');
    });

    test('should get empty messages for new session', async () => {
      const session = await sessionStorage.createSession('Test Session');
      const messages = await sessionStorage.getMessages(session.id);
      
      expect(messages).toHaveLength(0);
    });

    test('should handle multiple message entries', async () => {
      const session = await sessionStorage.createSession('Test Session');
      
      await sessionStorage.addMessage(session.id, 'User message', 'user');
      await sessionStorage.addMessage(session.id, 'Assistant response', 'assistant');
      await sessionStorage.addMessage(session.id, 'System notification', 'system');
      
      const messages = await sessionStorage.getMessages(session.id);
      expect(messages).toHaveLength(3);
      
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
      expect(messages[2].role).toBe('system');
    });
  });

  describe('Message Reconstruction', () => {
    test('should reconstruct messages from exchange log', async () => {
      const session = await sessionStorage.createSession('Test Session');
      
      // Add request with form choice
      await sessionStorage.addExchangeLog(session.id, 'request', {
        result: {
          form: {
            choice: 'option1'
          }
        }
      });
      
      // Add response with message
      await sessionStorage.addExchangeLog(session.id, 'response', {
        execute: {
          message: 'Assistant response'
        }
      });
      
      // Add error
      await sessionStorage.addExchangeLog(session.id, 'error', {
        message: 'Something went wrong'
      });
      
      const reconstructedMessages = await sessionStorage.reconstructMessagesFromLog(session.id);
      
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
      const session = await sessionStorage.createSession('Test Session');
      const reconstructedMessages = await sessionStorage.reconstructMessagesFromLog(session.id);
      
      expect(reconstructedMessages).toHaveLength(0);
    });
  });

  describe('Session Summary', () => {
    test('should get session summary', async () => {
      const session = await sessionStorage.createSession('Test Session');
      
      // Add some data
      await sessionStorage.addMessage(session.id, 'Test message', 'user');
      await sessionStorage.addExchangeLog(session.id, 'request', { action: 'test' });
      await sessionStorage.addExchangeLog(session.id, 'response', { result: 'success' });
      
      const summary = await sessionStorage.getSessionSummary(session.id);
      
      expect(summary.session).toBeDefined();
      expect(summary.messageCount).toBe(1);
      expect(summary.exchangeLogCount).toBe(2);
      expect(summary.recentMessages).toHaveLength(1);
      expect(summary.recentExchangeLog).toHaveLength(2);
    });

    test('should handle session summary for empty session', async () => {
      const session = await sessionStorage.createSession('Test Session');
      const summary = await sessionStorage.getSessionSummary(session.id);
      
      expect(summary.session).toBeDefined();
      expect(summary.messageCount).toBe(0);
      expect(summary.exchangeLogCount).toBe(0);
      expect(summary.recentMessages).toHaveLength(0);
      expect(summary.recentExchangeLog).toHaveLength(0);
    });
  });

  describe('Context Management', () => {
    test('should update context', async () => {
      const session = await sessionStorage.createSession('Test Session');
      
      const updated = await sessionStorage.updateContext(session.id, {
        testKey: 'testValue',
        nested: { key: 'value' }
      });
      
      expect(updated).toBe(true);
      
      const context = await sessionStorage.getContext(session.id);
      expect(context.testKey).toBe('testValue');
      expect(context.nested.key).toBe('value');
    });

    test('should get empty context for new session', async () => {
      const session = await sessionStorage.createSession('Test Session');
      const context = await sessionStorage.getContext(session.id);
      
      // Context returns empty arrays for new session, not empty object
      expect(context).toEqual({ exchangeLog: [], messages: [] });
    });
  });
});