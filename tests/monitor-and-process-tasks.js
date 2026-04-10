// Self-Upgrade monitor:
// When `tasks/` + `tasks/pending/` are empty, this script is the
// second phase of the self-upgrade loop — it drives prompts through
// the Client API, lets sessions produce new concrete tasks, and those
// tasks must be written back into `tasks/` + `DEV_STATE` instead of stopping.
//
// Invariant — one prompt at a time: default `runDaemon()` selects the first
// incomplete markdown under `prompts-to-agent-mode/` and awaits `processTask`
// until it finishes (success or fail). The next prompt starts only after that.
// Inside a prompt, one Client API session per file until done (`taskSessions`).

import dotenv from 'dotenv';

// Load environment variables from .env files (cwd = repo root when run via `npm run monitor`)
dotenv.config();
dotenv.config({ path: '.env.local' });

// Default: poll only — no automatic continuation /next. Agent issues tools (Red Room); client executes;
// stack advances when async is idle and the session shows a terminal shape (see process-task.js).
// Opt in: TASK_MONITOR_STRICT_AGENT_COMPLETION=1 — send up to TASK_MONITOR_AGENT_CONTINUE_MAX nudges
// until step=completed / context.result (queue-burn mode).
if (!Object.prototype.hasOwnProperty.call(process.env, 'TASK_MONITOR_STRICT_AGENT_COMPLETION')) {
  process.env.TASK_MONITOR_STRICT_AGENT_COMPLETION = '0';
}
if (!Object.prototype.hasOwnProperty.call(process.env, 'TASK_MONITOR_REQUIRE_TERMINAL_AGENT')) {
  process.env.TASK_MONITOR_REQUIRE_TERMINAL_AGENT = '1';
}
// Two-phase (default when TASK_MONITOR_TASK_FROM_FILE=1): short TASK_MONITOR_ROUTER_SEARCH_TASK / hint for router,
// then after **agent** is chosen one POST sends file spec (repo path + file URL). TASK_MONITOR_TWO_PHASE=0 — single blob.
// Task payload: default TASK_MONITOR_TASK_FROM_FILE=1 — agent spec = path + file:// + summary. =0: inline extract only.
// POST /sessions `task`: default two-phase uses bootstrap text (file-link workflow); first /next still sends router hint;
// then gate sends full spec — watch progress via console banner (sessionId, file URL, GET session). Override with
// TASK_MONITOR_CREATE_SESSION_TASK (`{name}` `{hint}` `{file}` `{rel}` `{fileUrl}`) or TASK_MONITOR_FILE_LINK_WORKFLOW=0 to reuse router line.
// Optional TASK_MONITOR_TASK_SPEC_URL_TEMPLATE with {rel} or {path} for an extra "Spec link:" line.
// TASK_MONITOR_SKIP_OBSERVE_BANNER=1 — suppress sessionId / GET session / file URL banner.
// TASK_MONITOR_REQUIRE_TERMINAL_AGENT (default 1) — success only when context.result or agent step=completed (+message).
//   Loose exit: set TASK_MONITOR_REQUIRE_TERMINAL_AGENT=0.

// `--list-completed` / `--list-completed --json`: completed prompt ↔ Client API sessionId (no stack).
//   JSON includes `merged` (one row per task file — canonical for scripts), plus `fromState` / `fromLedger`.
// `--once`: one prompt file per invocation by default (override with TASK_MONITOR_MAX_TASKS_PER_RUN=0 for full queue).
// `--retry-step`: on resume, delete the last step folder on disk (see rewindSessionLastStep) so the same sessionId can redo the last /next without creating a new session.
const _argvEarly = process.argv.slice(2);
if (
  _argvEarly.includes('--once') &&
  !(_argvEarly.includes('--daemon')) &&
  !Object.prototype.hasOwnProperty.call(process.env, 'TASK_MONITOR_MAX_TASKS_PER_RUN')
) {
  process.env.TASK_MONITOR_MAX_TASKS_PER_RUN = '1';
}
if (_argvEarly.includes('--retry-step')) {
  process.env.TASK_MONITOR_RESUME_REWIND_LAST_STEP = '1';
}
const _resumeFrom = _argvEarly.find((a) => /^--resume-from-step=/.test(a));
if (_resumeFrom) {
  const n = _resumeFrom.split('=')[1];
  if (n) process.env.TASK_MONITOR_REWIND_TO_STEP = n;
}

import { ServerUnavailableError, ErrorClassifier } from './monitor-tasks/errors.js';
import { TaskMonitorCore } from './monitor-tasks/task-monitor-core.js';
import { applyMonitorMixins } from './monitor-tasks/monitor-mixin.js';
import { TASK_MONITOR_MIXINS } from './monitor-tasks/monitor-modules.js';

class TaskMonitor extends TaskMonitorCore {
  constructor() {
    super();
    this.errorClassifier = new ErrorClassifier();
    applyMonitorMixins(this, TASK_MONITOR_MIXINS);
  }
}

export { TaskMonitor, ServerUnavailableError };

(async () => {
  const argv = process.argv.slice(2);
  if (argv.includes('--list-completed')) {
    if (!process.env.TASK_MONITOR_QUIET) process.env.TASK_MONITOR_QUIET = '1';
    const monitor = new TaskMonitor();
    monitor.printCompletedSessionsExport(argv);
    process.exit(0);
  }

  const monitor = new TaskMonitor();
  const once = argv.includes('--once');
  const explicitDaemon = argv.includes('--daemon');
  if (once && !explicitDaemon) {
    await monitor.run();
  } else {
    await monitor.runDaemon();
  }
})().catch(console.error);
