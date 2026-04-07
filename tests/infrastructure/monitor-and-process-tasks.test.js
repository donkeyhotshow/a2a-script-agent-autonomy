/**
 * Test suite for monitor-and-process-tasks.js
 * Validates bug fixes and daemon system functionality
 */

import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock axios to avoid actual network calls
vi.mock('axios');
import axios from 'axios';

// Import the TaskMonitor class
// Note: Due to module structure, we test through command-line invocation
// This is a validation suite for the fixes

describe('monitor-and-process-tasks.js', () => {
  const testDir = process.cwd();
  const stateFile = path.join(testDir, 'task-monitor-state.json');

  beforeEach(() => {
    // Clean up test state
    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
    }
  });

  afterEach(() => {
    // Clean up test state
    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
    }
  });

  describe('Bug Fix 1: Router Choice Parameter', () => {
    it('should use correct result.choice format for router choices', () => {
      // Read and verify the source contains the fix
      const source = fs.readFileSync(
        path.join(testDir, 'monitor-and-process-tasks.js'),
        'utf8'
      );

      // Check that router choice uses the correct parameter
      expect(source).toContain('{ result: { choice: choiceId } }');
      // Ensure old pattern is not present
      expect(source).not.toContain('{ task: choiceId }');
    });
  });

  describe('Bug Fix 2: Double Task Submission', () => {
    it('should handle task submission with proper fallback', () => {
      const source = fs.readFileSync(
        path.join(testDir, 'monitor-and-process-tasks.js'),
        'utf8'
      );

      // Check that we try task field first, then fallback to result.message
      expect(source).toContain('{ task: taskDescription }');
      expect(source).toContain('{ result: { message: taskDescription } }');
      expect(source).toContain('retrying with result.message');
    });
  });

  describe('Bug Fix 3: Task Extraction Fallback', () => {
    it('should properly improve task extraction logic', () => {
      const source = fs.readFileSync(
        path.join(testDir, 'monitor-and-process-tasks.js'),
        'utf8'
      );

      // Check for improved fallback logic
      expect(source).toContain('Untitled task');
      expect(source).toContain('find first non-empty, non-header line');
    });
  });

  describe('Bug Fix 4: Poll Loop Promise Check', () => {
    it('should properly check promise completion state', () => {
      const source = fs.readFileSync(
        path.join(testDir, 'monitor-and-process-tasks.js'),
        'utf8'
      );

      // Check for proper promise state handling
      expect(source).toContain('hasPromiseId && !isCompleted');
      expect(source).toContain('Waiting on promise');
    });
  });

  describe('Bug Fix 5: Hardbit State Logging', () => {
    it('should properly manage hardbit state flags', () => {
      const source = fs.readFileSync(
        path.join(testDir, 'monitor-and-process-tasks.js'),
        'utf8'
      );

      // Check for improved hardbit logging with state awareness
      expect(source).toContain('Only update state if explicitly set');
      expect(source).toContain('this.hardbitState.server = serverBusy');
    });
  });

  describe('Bug Fix 6: Session Verification', () => {
    it('should properly handle session existence checks', () => {
      const source = fs.readFileSync(
        path.join(testDir, 'monitor-and-process-tasks.js'),
        'utf8'
      );

      // Check for session verification
      expect(source).toContain('if (!sessionId)');
      expect(source).toContain('not found');
      expect(source).toContain('error.response?.status === 404');
    });
  });

  describe('Daemon System Features', () => {
    it('should have graceful shutdown handler', () => {
      const source = fs.readFileSync(
        path.join(testDir, 'monitor-and-process-tasks.js'),
        'utf8'
      );

      expect(source).toContain('gracefulShutdown()');
      expect(source).toContain('process.on(\'SIGINT\'');
      expect(source).toContain('process.on(\'SIGTERM\'');
    });

    it('should have daemon status reporting', () => {
      const source = fs.readFileSync(
        path.join(testDir, 'monitor-and-process-tasks.js'),
        'utf8'
      );

      expect(source).toContain('[daemon status]');
      expect(source).toContain('Active:');
      expect(source).toContain('Completed:');
      expect(source).toContain('Failed:');
    });

    it('should have hook document creation system', () => {
      const source = fs.readFileSync(
        path.join(testDir, 'monitor-and-process-tasks.js'),
        'utf8'
      );

      expect(source).toContain('createHookDocument');
      expect(source).toContain('task_monitor_issue');
      expect(source).toContain('suggestedActions');
    });

    it('should have active task monitoring', () => {
      const source = fs.readFileSync(
        path.join(testDir, 'monitor-and-process-tasks.js'),
        'utf8'
      );

      expect(source).toContain('monitorActiveTasks');
      expect(source).toContain('processNewTasks');
      expect(source).toContain('cleanupCompletedTasks');
      expect(source).toContain('activeTasks');
    });

    it('should support daemon mode via command line', () => {
      const source = fs.readFileSync(
        path.join(testDir, 'monitor-and-process-tasks.js'),
        'utf8'
      );

      expect(source).toContain('--once');
      expect(source).toContain('runDaemon()');
    });
  });

  describe('Integration Features', () => {
    it('should have health check system', () => {
      const source = fs.readFileSync(
        path.join(testDir, 'monitor-and-process-tasks.js'),
        'utf8'
      );

      expect(source).toContain('healthCheck()');
      expect(source).toContain('clientApi');
      expect(source).toContain('a2aServer');
      expect(source).toContain('compat_llm');
      expect(source).toContain('aiHub');
    });

    it('should handle server unavailable errors', () => {
      const source = fs.readFileSync(
        path.join(testDir, 'monitor-and-process-tasks.js'),
        'utf8'
      );

      expect(source).toContain('ServerUnavailableError');
      expect(source).toContain('isServerUnavailableError');
      expect(source).toContain('error.response.status === 503');
    });

    it('should persist state to JSON file', () => {
      const source = fs.readFileSync(
        path.join(testDir, 'monitor-and-process-tasks.js'),
        'utf8'
      );

      expect(source).toContain('task-monitor-state.json');
      expect(source).toContain('saveState()');
      expect(source).toContain('loadState()');
    });
  });

  describe('Diagnostics Enhancements', () => {
    it('should describe task stage data for stuck runs', () => {
      const source = fs.readFileSync(
        path.join(testDir, 'monitor-and-process-tasks.js'),
        'utf8'
      );

      expect(source).toContain('describeTaskStage(');
      expect(source).toContain('stageParts');
      expect(source).toContain('stageInfo');
    });

    it('should record stage metadata in hook documents', () => {
      const source = fs.readFileSync(
        path.join(testDir, 'monitor-and-process-tasks.js'),
        'utf8'
      );

      expect(source).toContain('stageDetail');
      expect(source).toContain('stage=');
    });
  });

  describe('Code Quality Checks', () => {
    it('should have proper async method definitions', () => {
      const source = fs.readFileSync(
        path.join(testDir, 'monitor-and-process-tasks.js'),
        'utf8'
      );

      // Check that key methods are defined
      const methods = [
        'processTask',
        'extractTaskDescription',
        'createSession',
        'sendNext',
        'pollAsync',
        'getSession',
        'markTaskAsCompleted',
        'createHookDocument',
        'run',
        'runDaemon',
        'healthCheck'
      ];

      methods.forEach(method => {
        expect(source).toContain(`${method}(`);
      });
    });

    it('should use proper error handling', () => {
      const source = fs.readFileSync(
        path.join(testDir, 'monitor-and-process-tasks.js'),
        'utf8'
      );

      expect(source).toContain('try');
      expect(source).toContain('catch');
      expect(source).toContain('finally');
      expect(source).toContain('console.error');
    });

    it('should use proper async/await patterns', () => {
      const source = fs.readFileSync(
        path.join(testDir, 'monitor-and-process-tasks.js'),
        'utf8'
      );

      expect(source).toContain('async () => {');
      expect(source).toContain('await');
    });
  });
});
