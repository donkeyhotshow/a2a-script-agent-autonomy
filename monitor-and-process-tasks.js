// Self-Upgrade monitor:
// When `tasks/` + `tasks/pending/` are empty, this script is the
// second phase of the self-upgrade loop — it drives prompts through
// the Client API, lets sessions produce new concrete tasks, and those
// tasks must be written back into `tasks/` + `DEV_STATE` instead of stopping.

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env files
dotenv.config();
dotenv.config({ path: '.env.local' });

import { ServerUnavailableError, ErrorClassifier } from './tests/monitor-tasks/errors.js';
import { TaskMonitorCore } from './tests/monitor-tasks/task-monitor-core.js';
import { TaskMonitorApi } from './tests/monitor-tasks/task-monitor-api.js';
import { TaskMonitorProcessing } from './tests/monitor-tasks/task-monitor-processing.js';
import { TaskMonitorUtils } from './tests/monitor-tasks/task-monitor-utils.js';
import { TaskMonitorValidation } from './tests/monitor-tasks/task-monitor-validation.js';
import { TaskMonitorLogScan } from './tests/monitor-tasks/task-monitor-log-scan.js';
import { TaskMonitorDaemon } from './tests/monitor-tasks/task-monitor-daemon.js';

// Create TaskMonitor class that combines all functionality
class TaskMonitor extends TaskMonitorCore {
  constructor() {
    super();
    // Initialize error classifier
    this.errorClassifier = new ErrorClassifier();
    // Mix in methods from other classes
    Object.getOwnPropertyNames(TaskMonitorApi.prototype).forEach(name => {
      if (name !== 'constructor') this[name] = TaskMonitorApi.prototype[name];
    });
    Object.getOwnPropertyNames(TaskMonitorProcessing.prototype).forEach(name => {
      if (name !== 'constructor') this[name] = TaskMonitorProcessing.prototype[name];
    });
    Object.getOwnPropertyNames(TaskMonitorUtils.prototype).forEach(name => {
      if (name !== 'constructor') this[name] = TaskMonitorUtils.prototype[name];
    });
    Object.getOwnPropertyNames(TaskMonitorLogScan.prototype).forEach(name => {
      if (name !== 'constructor') this[name] = TaskMonitorLogScan.prototype[name];
    });
    Object.getOwnPropertyNames(TaskMonitorValidation.prototype).forEach(name => {
      if (name !== 'constructor') this[name] = TaskMonitorValidation.prototype[name];
    });
    Object.getOwnPropertyNames(TaskMonitorDaemon.prototype).forEach(name => {
      if (name !== 'constructor') this[name] = TaskMonitorDaemon.prototype[name];
    });
  }
}

// Export for use
export { TaskMonitor, ServerUnavailableError };

// CLI: default daemon; --once = one batch then exit; --daemon explicit
(async () => {
  const monitor = new TaskMonitor();
  const argv = process.argv.slice(2);
  const once = argv.includes('--once');
  const explicitDaemon = argv.includes('--daemon');
  if (once && !explicitDaemon) {
    await monitor.run();
  } else {
    await monitor.runDaemon();
  }
})().catch(console.error);
