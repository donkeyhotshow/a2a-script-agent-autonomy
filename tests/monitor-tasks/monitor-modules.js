import { TaskMonitorApi } from './task-monitor-api.js';
import { TaskMonitorProcessing } from './task-monitor-processing.js';
import { TaskMonitorUtils } from './task-monitor-utils.js';
import { TaskMonitorLogScan } from './task-monitor-log-scan.js';
import { TaskMonitorValidation } from './task-monitor-validation.js';
import { TaskMonitorDaemon } from './task-monitor-daemon.js';

/**
 * Mixin order for `TaskMonitor` (see `monitor-and-process-tasks.js`).
 * Later entries override same-named methods on the instance.
 */
export const TASK_MONITOR_MIXINS = [
  TaskMonitorApi,
  TaskMonitorProcessing,
  TaskMonitorUtils,
  TaskMonitorLogScan,
  TaskMonitorValidation,
  TaskMonitorDaemon,
];
