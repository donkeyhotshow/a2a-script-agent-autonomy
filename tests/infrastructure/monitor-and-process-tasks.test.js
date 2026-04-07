/**
 * Test suite for Task Monitor (entry: monitor-and-process-tasks.js + tests/monitor-tasks/*)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Repo root — avoids failures when vitest cwd is not the repository root */
const REPO_ROOT = path.resolve(__dirname, '../..');

vi.mock('axios');

const MONITOR_SOURCE_FILES = [
  'monitor-and-process-tasks.js',
  'tests/monitor-tasks/task-monitor-core.js',
  'tests/monitor-tasks/task-monitor-api.js',
  'tests/monitor-tasks/task-monitor-processing.js',
  'tests/monitor-tasks/task-monitor-utils.js',
  'tests/monitor-tasks/task-monitor-validation.js',
  'tests/monitor-tasks/task-monitor-log-scan.js',
  'tests/monitor-tasks/task-monitor-daemon.js',
  'tests/monitor-tasks/errors.js',
];

function readMonitorSources(testDir) {
  return MONITOR_SOURCE_FILES.map((rel) =>
    fs.readFileSync(path.join(testDir, rel), 'utf8')
  ).join('\n');
}

describe('monitor-and-process-tasks.js', () => {
  const testDir = REPO_ROOT;
  const stateFile = path.join(testDir, 'task-monitor-state.json');

  beforeEach(() => {
    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
    }
  });

  afterEach(() => {
    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
    }
  });

  describe('Bug Fix 1: Router choice (Client API shorthand)', () => {
    it('documents result.choice and auto-sends agent via task shorthand', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('POST /next with result.choice');
      expect(source).toContain('sendNext(sessionId, { task: choiceId })');
    });
  });

  describe('Bug Fix 2: Double Task Submission', () => {
    it('should handle task submission with proper fallback', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('{ task: taskDescription }');
      expect(source).toContain('{ result: { message: taskDescription } }');
      expect(source).toContain('retrying with result.message');
    });
  });

  describe('Bug Fix 3: Task Extraction Fallback', () => {
    it('should properly improve task extraction logic', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('Untitled task');
      expect(source).toContain('find first non-empty, non-header line');
    });
  });

  describe('Bug Fix 4: Poll Loop Promise Check', () => {
    it('should properly check promise completion state', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('hasPromiseId && !isCompleted');
      expect(source).toContain('Waiting on promise');
    });
  });

  describe('Bug Fix 5: Hardbit State Logging', () => {
    it('should properly manage hardbit state flags', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('Only update state if explicitly set');
      expect(source).toContain('this.hardbitState.server = serverBusy');
    });
  });

  describe('Bug Fix 6: Session Verification', () => {
    it('should properly handle session existence checks', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('if (!sessionId)');
      expect(source).toContain('not found');
      expect(source).toContain('error.response?.status === 404');
    });
  });

  describe('Daemon System Features', () => {
    it('should have graceful shutdown handler', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('gracefulShutdown()');
      expect(source).toContain("process.on('SIGINT'");
      expect(source).toContain("process.on('SIGTERM'");
    });

    it('should have daemon status reporting', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('[daemon status]');
      expect(source).toContain('Completed:');
      expect(source).toContain('Failed:');
    });

    it('should have hook document creation system', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('createHookDocument');
      expect(source).toContain('task_monitor_issue');
      expect(source).toContain('suggestedActions');
    });

    it('should have active task monitoring', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('monitorActiveTasks');
      expect(source).toContain('processNewTasks');
      expect(source).toContain('cleanupCompletedTasks');
      expect(source).toContain('activeTasks');
    });

    it('should support daemon mode via command line', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('--once');
      expect(source).toContain('runDaemon()');
    });

    it('should default --once to one task when TASK_MONITOR_MAX_TASKS_PER_RUN is unset', () => {
      const entry = fs.readFileSync(path.join(testDir, 'monitor-and-process-tasks.js'), 'utf8');
      expect(entry).toContain('TASK_MONITOR_MAX_TASKS_PER_RUN');
      expect(entry).toContain("process.env.TASK_MONITOR_MAX_TASKS_PER_RUN = '1'");
    });

    it('should support optional TASK_MONITOR_TASK_LIST ordering', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('TASK_MONITOR_TASK_LIST');
      expect(source).toContain('taskListPath');
    });

    it('should resume session from state file when TASK_MONITOR_RESUME and task match', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('TASK_MONITOR_RESUME');
      expect(source).toContain('Resuming session');
      expect(source).toContain('session-resume');
    });
  });

  describe('Integration Features', () => {
    it('should have health check system', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('healthCheck()');
      expect(source).toContain('clientApi');
      expect(source).toContain('a2aServer');
      expect(source).toContain('compat_llm');
      expect(source).toContain('aiHub');
    });

    it('should handle server unavailable errors', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('ServerUnavailableError');
      expect(source).toContain('isServerUnavailableError');
      expect(source).toContain('error.response.status === 503');
    });

    it('should persist state to JSON file', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('task-monitor-state.json');
      expect(source).toContain('saveState()');
      expect(source).toContain('loadState()');
    });
  });

  describe('Diagnostics Enhancements', () => {
    it('should describe task stage data for stuck runs', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('describeTaskStage(');
      expect(source).toContain('stageParts');
      expect(source).toContain('stageInfo');
    });

    it('should record stage metadata in hook documents', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('stageDetail');
      expect(source).toContain('stage=');
    });
  });

  describe('Code Quality Checks', () => {
    it('should have proper async method definitions', () => {
      const source = readMonitorSources(testDir);
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
        'healthCheck',
      ];
      methods.forEach((method) => {
        expect(source).toContain(`${method}(`);
      });
    });

    it('should use proper error handling', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('try');
      expect(source).toContain('catch');
      expect(source).toContain('finally');
      expect(source).toContain('console.error');
    });

    it('should use proper async/await patterns', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('async () => {');
      expect(source).toContain('await');
    });
  });
});
