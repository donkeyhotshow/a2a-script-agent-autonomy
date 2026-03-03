/**
 * Action Handlers Index
 * 
 * Exports all action handlers for easy registration.
 */

// Task Capture handlers
export {
    executeCaptureTask,
    executeStructureTask,
    executeUpdateTaskStatus,
    executeGetTask,
    type CaptureTaskActionInput,
    type CaptureTaskActionOutput,
} from './capture-task.js';

// Task Decomposition handlers
export {
    executeDecomposeToSubtasks,
    executeDecomposeToSteps,
    executeDecomposeToActions,
    executeGenerateExecutionPlan,
    executeUpdateSubtaskStatus,
    executeUpdateStepStatus,
    executeUpdateActionStatus,
    executeGetDecomposition,
    type DecomposeActionOutput,
    type DecomposeToSubtasksInput,
    type DecomposeToStepsInput,
    type DecomposeToActionsInput,
} from './decompose-task.js';

// Document Writer handlers
export {
    executeWriteDoc,
    executeReadDoc,
    executeAppendDoc,
    executeGenerateDoc,
    executeGenerateReport,
    executeValidateDoc,
    executeListTemplates,
    type WriteDocActionInput,
    type WriteDocActionOutput,
} from './write-doc.js';
