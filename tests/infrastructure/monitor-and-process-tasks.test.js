/**
 * Test suite for Task Monitor (entry: tests/monitor-and-process-tasks.js + tests/monitor-tasks/*)
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
  'tests/monitor-and-process-tasks.js',
  'tests/monitor-tasks/monitor-mixin.js',
  'tests/monitor-tasks/monitor-modules.js',
  'tests/monitor-tasks/task-monitor-core.js',
  'tests/monitor-tasks/promise-queue-probe.mjs',
  'tests/monitor-tasks/task-monitor-api.js',
  'tests/monitor-tasks/task-monitor-processing.js',
  'tests/monitor-tasks/processing/rewind-disk.js',
  'tests/monitor-tasks/processing/router-gate.js',
  'tests/monitor-tasks/processing/task-files.js',
  'tests/monitor-tasks/processing/process-task.js',
  'tests/monitor-tasks/processing/parallel-monitor.js',
  'tests/monitor-tasks/task-monitor-utils.js',
  'tests/monitor-tasks/task-monitor-validation.js',
  'tests/monitor-tasks/task-monitor-log-scan.js',
  'tests/monitor-tasks/task-monitor-daemon.js',
  'tests/monitor-tasks/task-monitor-session-helpers.js',
  'tests/monitor-tasks/errors.js',
];

function readMonitorSources(testDir) {
  return MONITOR_SOURCE_FILES.map((rel) =>
    fs.readFileSync(path.join(testDir, rel), 'utf8')
  ).join('\n');
}

describe('tests/monitor-and-process-tasks.js', () => {
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
      expect(source).toMatch(/\{\s*task:\s*routerTask\s*\}/);
      expect(source).toMatch(/\{\s*result:\s*\{\s*message:\s*routerTask\s*\}\s*\}/);
      expect(source).toContain('retrying with result.message');
    });
  });

  describe('Router gate: agent handoff without form', () => {
    it('accepts message-only execute after router→agent (two-phase spec inject)', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain("i.name === 'message'");
      expect(source).toContain('submitAgentSpecOnce');
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

  describe('Completed session export', () => {
    it('exposes --list-completed and ledger helpers for finished prompts', () => {
      const entry = fs.readFileSync(path.join(testDir, 'tests/monitor-and-process-tasks.js'), 'utf8');
      expect(entry).toContain('--list-completed');
      const core = fs.readFileSync(path.join(testDir, 'tests/monitor-tasks/task-monitor-core.js'), 'utf8');
      expect(core).toContain('printCompletedSessionsExport');
      expect(core).toContain('readCompletedSessionsLedger');
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

    it('should run daemon sequential loop (processTask + status)', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('processTask');
      expect(source).toContain('runDaemon');
      expect(source).toContain('activeTasks');
      expect(source).toContain('[daemon status]');
    });

    it('should support daemon mode via command line', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('--once');
      expect(source).toContain('runDaemon()');
    });

    it('should default --once to one task when TASK_MONITOR_MAX_TASKS_PER_RUN is unset', () => {
      const entry = fs.readFileSync(path.join(testDir, 'tests/monitor-and-process-tasks.js'), 'utf8');
      expect(entry).toContain('TASK_MONITOR_MAX_TASKS_PER_RUN');
      expect(entry).toContain("process.env.TASK_MONITOR_MAX_TASKS_PER_RUN = '1'");
    });

    it('should default TASK_MONITOR_STRICT_AGENT_COMPLETION when unset', () => {
      const entry = fs.readFileSync(path.join(testDir, 'tests/monitor-and-process-tasks.js'), 'utf8');
      expect(entry).toContain('TASK_MONITOR_STRICT_AGENT_COMPLETION');
      expect(entry).toContain("process.env.TASK_MONITOR_STRICT_AGENT_COMPLETION = '0'");
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

    it('should persist per-task session mapping and optional disk rewind', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('taskSessions');
      expect(source).toContain('recordTaskSessionSnapshot');
      expect(source).toContain('TASK_MONITOR_REWIND_LAST_STEP');
      expect(source).toContain('TASK_MONITOR_RESUME_REWIND_LAST_STEP');
      expect(source).toContain('resumeFromStep');
      expect(source).toContain('rewindSessionLastStep');
      const newSessions = fs.readFileSync(
        path.join(testDir, 'a2a-client/packages/vite-plugin/storage/newSessions.js'),
        'utf8'
      );
      expect(newSessions).toMatch(/rewindSessionLastStep/);
      expect(newSessions).toMatch(/rewindSessionAfterStep/);
    });

    it('should map --retry-step to TASK_MONITOR_RESUME_REWIND_LAST_STEP in entry script', () => {
      const entry = fs.readFileSync(path.join(testDir, 'tests/monitor-and-process-tasks.js'), 'utf8');
      expect(entry).toContain('--retry-step');
      expect(entry).toContain('TASK_MONITOR_RESUME_REWIND_LAST_STEP');
      expect(entry).toContain('--resume-from-step=');
    });

    it('should expose disk rewind via processing/rewind-disk and central mixins in entry', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('tryRewindSessionDiskStep');
      expect(source).toContain('applyTaskMonitorRewindDisk');
      const entry = fs.readFileSync(path.join(testDir, 'tests/monitor-and-process-tasks.js'), 'utf8');
      expect(entry).toContain('applyMonitorMixins');
      expect(entry).toContain('TASK_MONITOR_MIXINS');
    });

    it('should treat status=pending as async busy and support agent tool stall + phase key', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain("asyncResult.status === 'pending'");
      expect(source).toContain('TASK_MONITOR_AGENT_TOOL_STALL_MS');
      expect(source).toContain('agent_tool_phase');
    });

    it('should support strict agent completion until step=completed via continuation /next', () => {
      const pt = fs.readFileSync(
        path.join(testDir, 'tests/monitor-tasks/processing/process-task.js'),
        'utf8'
      );
      expect(pt).toContain('TASK_MONITOR_STRICT_AGENT_COMPLETION');
      expect(pt).toContain('TASK_MONITOR_AGENT_CONTINUE_MAX');
      expect(pt).toContain('TASK_MONITOR_AGENT_CONTINUE_PROMPT');
      expect(pt).toContain('strict-agent-continue');
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

    it('should wire Client API traffic through session shape validation', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('_validateGetSessionBody');
      expect(source).toContain('validatePartialSessionEnvelope');
      expect(source).toContain('isTaskMonitorSessionValidationDisabled');
    });

    it('should share hub promise-queue probe between CLI and monitor snapshot', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('probePromiseQueues');
      expect(source).toContain('emitProbeLogLines');
      expect(source).toContain('probeToJsonReport');
      expect(source).toContain('formatErrorRowLine');
      expect(source).toContain('/promises/errors');
      expect(source).toContain('logHubPromiseQueueSnapshot');
    });

    it('should enforce one prompt at a time until processTask completes (daemon invariant)', () => {
      const daemon = fs.readFileSync(
        path.join(testDir, 'tests/monitor-tasks/task-monitor-daemon.js'),
        'utf8'
      );
      const entry = fs.readFileSync(path.join(testDir, 'tests/monitor-and-process-tasks.js'), 'utf8');
      expect(daemon).toContain('INVARIANT: one incomplete prompt per iteration');
      expect(entry).toContain('one prompt at a time');
    });

    it('should support check-promise-queue --json and --detail', () => {
      const cli = fs.readFileSync(
        path.join(testDir, 'tests/monitor-tasks/check-promise-queue.mjs'),
        'utf8'
      );
      expect(cli).toContain("'--json'");
      expect(cli).toContain("'--detail'");
      expect(cli).toContain('probeToJsonReport');
    });

    it('should optionally probe hub queue on daemon status tick', () => {
      const daemon = fs.readFileSync(
        path.join(testDir, 'tests/monitor-tasks/task-monitor-daemon.js'),
        'utf8'
      );
      expect(daemon).toContain('TASK_MONITOR_HUB_PROBE_DAEMON_STATUS');
      expect(daemon).toContain('logHubPromiseQueueSnapshot');
    });

    it('should bind completed monitor tasks to Client API sessionId for downstream use', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('getCompletedTasksWithSessions');
      expect(source).toContain('mergeCompletedSessionsForExport');
      expect(source).toContain('appendCompletedSessionsLedger');
      expect(source).toContain('Recorded completion');
    });

    it('should write completion hook from sequential processTask on success', () => {
      const pt = fs.readFileSync(
        path.join(testDir, 'tests/monitor-tasks/processing/process-task.js'),
        'utf8'
      );
      expect(pt).toContain('createCompletionReport');
      expect(pt).toContain('success && session?.id');
    });
  });

  describe('Code Quality Checks', () => {
    it('should have proper async method definitions', () => {
      const source = readMonitorSources(testDir);
      expect(source).toContain('TASK_MONITOR_REQUIRE_TERMINAL_AGENT');
      const methods = [
        'processTask',
        'extractTaskDescription',
        'buildMonitorCreateSessionTaskInput',
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
