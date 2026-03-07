/**
 * Action Handlers Index - Simulation Mode
 *
 * Minimal handlers for simulation processing.
 */

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
