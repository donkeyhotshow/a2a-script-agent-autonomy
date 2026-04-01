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
    type FileExistsActionInput,
    type FileExistsActionOutput,
    type ListDirActionInput,
    type ListDirActionOutput,
} from './file-operations.js';

// Command Execution handlers
export {
    executeCommand,
    validateCommand,
    type ExecuteCommandInput,
    type ExecuteCommandOutput,
} from './command-execution.js';

// Grep Search handlers
export {
    executeGrepSearch,
    type GrepSearchInput,
    type GrepSearchOutput,
    type GrepSearchOptions,
    type GrepMatch,
} from './grep-search.js';

// Edit Patch handlers
export {
    executeEditPatch,
    type EditPatchInput,
    type EditPatchOutput,
    type PatchOperation,
} from './edit-patch.js';

// Run Script handlers
export {
    executeRunScript,
    getAvailableScripts,
    type RunScriptInput,
    type RunScriptOutput,
    type RunScriptParams,
} from './run-script.js';

// MCP-call handler (ADR-ClawCode §14.2)
export {
    executeMcpCall,
    type McpCallInput,
    type McpCallOutput,
    type McpContent,
} from './mcp-call.js';

// PHPantom LSP handlers (ADR-PHPantom §15)
export {
    handlePhpantomAnalyze,
    handlePhpantomFix,
    type PhpantomAnalyzeInput,
    type PhpantomAnalyzeOutput,
    type PhpantomFixInput,
    type PhpantomFixOutput,
} from './phpantom.js';
