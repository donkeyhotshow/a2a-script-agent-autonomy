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

// RAG Search handlers
export {
    executeRagSearch,
    executeRagIndex,
    executeRagClearCache,
    executeRagGetCacheStats,
    type RagSearchActionInput,
    type RagSearchActionOutput,
} from './rag-search.js';

// File Operations handlers
export {
    executeReadFile,
    executeWriteFile,
    executeFileExists,
    executeListDirectory,
    type ReadFileActionInput,
    type ReadFileActionOutput,
    type WriteFileActionInput,
    type WriteFileActionOutput,
} from './file-operations.js';

// Command Execution handlers
export {
    executeCommand,
    validateCommand,
    type ExecuteCommandInput,
    type ExecuteCommandOutput,
} from './command-execution.js';
