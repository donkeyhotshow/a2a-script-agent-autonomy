import { describe, it, expect } from 'vitest';
import {
  buildClientMessage,
  buildNewTaskMessage,
  buildContinueMessage,
  buildConfirmMessage,
  buildFileResponseMessage,
  buildServerMessage,
  buildFileRequestMessage,
  buildTaskProgressMessage,
  buildErrorMessage,
  buildSessionCompleteMessage,
  buildAckMessage,
  buildNeuronActivationMessage,
  serializeMessage,
  parseMessage,
  parseMessageSafe,
  validateMessage,
  isClientMessage,
  isServerMessage,
  getSessionId,
  cloneMessage,
  updateMessageContext,
} from '../../../src/protocol/message-builder.js';

const baseContext = { version: '1.0' as const, session_id: 's1' };

describe('message-builder', () => {
  describe('buildClientMessage', () => {
    it('builds minimal client message', () => {
      const msg = buildClientMessage(baseContext);
      expect(msg.context).toEqual(baseContext);
      expect(msg.files).toBeUndefined();
    });
    it('adds files when provided', () => {
      const files = [{ path: 'a.ts', content: 'x' }];
      const msg = buildClientMessage(baseContext, files);
      expect(msg.files).toEqual(files);
    });
  });

  describe('buildNewTaskMessage, buildContinueMessage, buildConfirmMessage', () => {
    it('buildNewTaskMessage', () => {
      const msg = buildNewTaskMessage('s1', ['task1'], ['auth']);
      expect(msg.context.new_task).toEqual(['task1']);
      expect(msg.context.architectural_features).toEqual(['auth']);
    });
    it('buildContinueMessage', () => {
      const msg = buildContinueMessage('s1');
      expect(msg.context.continue).toBe(true);
    });
    it('buildConfirmMessage', () => {
      const msg = buildConfirmMessage('s1');
      expect(msg.context.confirm).toBe(true);
    });
  });

  describe('buildServerMessage', () => {
    it('builds minimal', () => {
      const msg = buildServerMessage(baseContext);
      expect(msg.context).toEqual(baseContext);
    });
    it('adds message option', () => {
      const msg = buildServerMessage(baseContext, { message: 'hi' });
      expect(msg.message).toBe('hi');
    });
  });

  describe('buildFileRequestMessage, buildTaskProgressMessage, buildErrorMessage', () => {
    it('buildFileRequestMessage', () => {
      const msg = buildFileRequestMessage('s1', ['a.ts', 'b.ts']);
      expect(msg.context.request_files).toEqual(['a.ts', 'b.ts']);
    });
    it('buildTaskProgressMessage', () => {
      const msg = buildTaskProgressMessage('s1', 't1', 50, 'in_progress');
      expect(msg.context.tasks?.[0]?.progress).toBe(50);
      expect(msg.context.tasks?.[0]?.status).toBe('in_progress');
    });
    it('clamps progress 0-100', () => {
      const msg = buildTaskProgressMessage('s1', 't1', 150, 'in_progress');
      expect(msg.context.tasks?.[0]?.progress).toBe(100);
    });
    it('buildErrorMessage', () => {
      const msg = buildErrorMessage('s1', 'E001', 'err', 'file.ts', 10);
      expect(msg.context.errors?.[0]?.code).toBe('E001');
      expect(msg.context.errors?.[0]?.file).toBe('file.ts');
      expect(msg.context.errors?.[0]?.line).toBe(10);
    });
  });

  describe('buildSessionCompleteMessage, buildAckMessage, buildNeuronActivationMessage', () => {
    it('buildSessionCompleteMessage', () => {
      const msg = buildSessionCompleteMessage('s1', 'Done');
      expect(msg.message).toBe('Done');
      expect(msg.context.tasks?.[0]?.status).toBe('completed');
    });
    it('buildAckMessage', () => {
      const msg = buildAckMessage('s1');
      expect(msg.message).toBe('Acknowledged');
      const msg2 = buildAckMessage('s1', 'Custom');
      expect(msg2.message).toBe('Custom');
    });
    it('buildNeuronActivationMessage', () => {
      const msg = buildNeuronActivationMessage('s1', ['auth', 'routing'], 'injected');
      expect(msg.context.architectural_features).toEqual(['auth', 'routing']);
      expect(msg.message).toBe('injected');
    });
  });

  describe('serializeMessage, parseMessage', () => {
    it('round-trip', () => {
      const msg = buildClientMessage(baseContext);
      const str = serializeMessage(msg);
      const parsed = parseMessage(str);
      expect(parsed.context.session_id).toBe('s1');
    });
    it('parseMessage throws on invalid', () => {
      expect(() => parseMessage('{}')).toThrow();
      expect(() => parseMessage('{invalid')).toThrow();
    });
    it('parseMessageSafe returns null on error', () => {
      expect(parseMessageSafe('{}')).toBeNull();
    });
  });

  describe('validateMessage', () => {
    it('rejects non-object', () => {
      expect(validateMessage(null).valid).toBe(false);
    });
    it('requires context', () => {
      expect(validateMessage({}).errors).toContain('context is required');
    });
    it('validates context', () => {
      const r = validateMessage({ context: { version: '1.0', session_id: 's1' } });
      expect(r.valid).toBe(true);
    });
  });

  describe('buildFileResponseMessage', () => {
    it('builds client message with files', () => {
      const files = [{ path: 'a.ts', content: 'x' }];
      const msg = buildFileResponseMessage('s1', files, baseContext);
      expect(msg.files).toEqual(files);
      expect(msg.context.session_id).toBe('s1');
    });
  });

  describe('isClientMessage, isServerMessage', () => {
    it('isClientMessage returns true for client message without message field', () => {
      const msg = buildClientMessage(baseContext);
      expect(isClientMessage(msg)).toBe(true);
    });
    it('isServerMessage returns true for server message with message field', () => {
      const msg = buildServerMessage(baseContext, { message: 'hi' });
      expect(isServerMessage(msg)).toBe(true);
    });
  });

  describe('getSessionId, cloneMessage, updateMessageContext', () => {
    it('getSessionId', () => {
      expect(getSessionId(buildClientMessage(baseContext))).toBe('s1');
    });
    it('cloneMessage', () => {
      const msg = buildClientMessage(baseContext);
      const cloned = cloneMessage(msg);
      expect(cloned).not.toBe(msg);
      expect(cloned.context.session_id).toBe(msg.context.session_id);
    });
    it('updateMessageContext', () => {
      const msg = buildClientMessage(baseContext);
      const updated = updateMessageContext(msg, { continue: true });
      expect(updated.context.continue).toBe(true);
      expect(updated.context.version).toBe('1.0');
    });
  });
});
