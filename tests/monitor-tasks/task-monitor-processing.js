// Composes processing mixins (order here only; global mixin order: monitor-modules.js).
import { applyTaskMonitorRewindDisk } from './processing/rewind-disk.js';
import { applyTaskMonitorRouterGate } from './processing/router-gate.js';
import { applyTaskMonitorTaskFiles } from './processing/task-files.js';
import { applyTaskMonitorProcessTask } from './processing/process-task.js';
import { applyTaskMonitorParallelMonitor } from './processing/parallel-monitor.js';

class TaskMonitorProcessing {}

applyTaskMonitorRewindDisk(TaskMonitorProcessing);
applyTaskMonitorRouterGate(TaskMonitorProcessing);
applyTaskMonitorTaskFiles(TaskMonitorProcessing);
applyTaskMonitorProcessTask(TaskMonitorProcessing);
applyTaskMonitorParallelMonitor(TaskMonitorProcessing);

export { TaskMonitorProcessing };
