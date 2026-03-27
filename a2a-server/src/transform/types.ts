/**
 * Transform Pipeline Runtime Types
 * 
 * Types for the transform DSL defined in server-transform.schema.json
 * 
 * Pipeline order: request.json → server-transforms-request.json → request.md → LLM → response.md → server-transforms-response.json → response.json
 */

import type { JSONValue } from 'jsonify';

/**
 * Interrupt directive — emitted by response transform to trigger a server-side
 * additional LLM call before returning to the client.
 */
/** Optional gates: all specified checks must pass or the server skips the interrupt (primary result unchanged). */
export interface InterruptWhenClause {
  /** Minimum `history` length (flat or `context.history`). */
  historyMinLength?: number;
  /** Maximum `history` length. */
  historyMaxLength?: number;
}

/**
 * GR-S-08 — Control envelope for gray-room / interrupt loop (UI + ops).
 * Written under `context.workbench.slots.grayRoom` by `GrayRoomOrchestrator` on each return.
 */
export interface GrayRoomControlEnvelope {
  /** Loop is active for this invoke (always true when slot is written from `runLoop`). */
  enabled: boolean;
  /** Correlate with server request / promise (default: `promiseId`). */
  planId?: string;
  phase: 'response_transform' | 'interrupt_handler' | 'follow_up_llm' | 'completed';
  /** Global interrupt budget configured on the orchestrator (e.g. `A2A_MAX_INTERRUPT_TURNS`). */
  maxTurns: number;
  /** Loop iteration index (0 = primary LLM output, increments after each follow-up LLM). */
  turn: number;
  /** Remaining interrupt budget after clamps and decrements. */
  remainingBudget?: number;
  status: 'running' | 'completed' | 'truncated';
  /** Last handled `interrupt.reason` when applicable. */
  lastReason?: string;
  timestamps: {startedAt: string; lastUpdateAt: string};
  /** Mirrors `interruptTrace.length` for quick correlation. */
  traceRef?: {length: number};
}

export interface InterruptDirective {
  /** Type of interrupt — determines server behavior */
  reason: 'compress_history' | 'auto_read_file' | 'auto_rag_page' | 'thinking' | 'clarify' | string;
  /** Tightens remaining interrupt budget with the global cap (see GRAY-ROOM). */
  maxTurns?: number;
  /** Override transform schema for the interrupt turn */
  schema?: string;
  /** Extra context fields to merge before the interrupt turn */
  context?: Record<string, unknown>;
  /** Auxiliary data (e.g. file path for auto_read_file, RAG params for auto_rag_page) */
  data?: Record<string, unknown>;
  /** Emit from response transform / LLM JSON so triggers are data-driven, not server-hardcoded. */
  when?: InterruptWhenClause;
}

/**
 * One row in `context.workbench.slots.interruptTrace` — server-only LLM / transform chain for UI/debug.
 * Order in the array is chronological.
 * @see `./interrupt-trace-contract.js` — canonical path and merge helper (UA-S-01).
 */
export type ServerInterruptTraceEvent =
  | { kind: 'llm_output'; phase: 'primary' | 'follow_up'; chars: number }
  | { kind: 'response_transform'; interruptReason?: string }
  | { kind: 'interrupt_handler'; reason: string; continueLoop: boolean; note?: string }
  | { kind: 'interrupt_skipped'; reason: string; detail?: string }
  | { kind: 'request_rebuild' }
  | { kind: 'sidecar_llm'; purpose: 'compress_history' | 'thinking' | 'auto_read_file' | 'clarify' | 'auto_rag_page'; ok: boolean; meta?: string };

/**
 * Pipeline document type
 */
export interface TransformPipeline {
  type: 'pipeline';
  steps: TransformStep[];
}

/**
 * Union of all possible transform operations
 */
export type TransformStep = 
  | CopyOperation 
  | SetOperation 
  | AppendToArrayOperation 
  | ParseJsonFromMdOperation 
  | RenderMarkdownOperation 
  | SwitchOperation
  | ApplyScratchpadOpsOperation
  | ApplyWorkbenchSectionOpsOperation
  | TruncateSectionOperation
  | PickContextOperation
  | DropOperation
  | TruncateHistoryOperation
  | IncludeIfOperation
  | PickFilesOperation
  | MergeFilesToContextOperation
  | MergeWorkbenchSectionsOperation
  | SummarizeFilesOperation
  | ForEachOperation;

/**
 * Shallow-merge LLM `workbench.sections` into `context.workbench.sections` (preserves keys not sent).
 */
export interface MergeWorkbenchSectionsOperation {
  op: 'merge-workbench-sections';
  /** JSONPath on `$out` (e.g. `$.llm.workbench.sections`). */
  from: string;
  /** JSONPath on `$out` (e.g. `$.context.workbench.sections`). */
  to: string;
}

/** Single LLM-emitted scratchpad command (ISSUE 6) */
export interface ScratchpadOpCommand {
  op: 'check' | 'add' | 'remove';
  item: string;
}

/**
 * Apply scratchpad_ops array to context.scratchpad (object map).
 * Reads commands from JSONPath `from`; mutates scratchpad at `scratchpadPath` in $out.
 */
export interface ApplyScratchpadOpsOperation {
  op: 'apply-scratchpad-ops';
  from: string;
  /** JSONPath in $out (default: context.scratchpad) */
  scratchpadPath?: string;
}

/**
 * Apply `workbench_ops` — short incremental edits to `context.workbench.sections` (string fields).
 * LLM emits an array; each entry is a command (see `agent-request.md`).
 */
export interface ApplyWorkbenchSectionOpsOperation {
  op: 'apply-workbench-section-ops';
  /** JSONPath on input or $out (e.g. `llm.workbench_ops`). */
  from: string;
  /** JSONPath under $out (default: `context.workbench.sections`). */
  sectionsPath?: string;
}

/**
 * Truncate long strings or all string fields on a shallow object (ISSUE 5). Use paths such as
 * `context.workbench.sections`.
 */
export interface TruncateSectionOperation {
  op: 'truncate-section';
  /** JSONPath in input or $out (same resolution order as copy). Written back to $out. */
  path: string;
  /** Maximum length of the final string (prefix + suffix when truncated). */
  maxChars: number;
  /** Appended when content is cut (default: "\\n...[truncated]"). */
  suffix?: string;
}

/**
 * Merge result action-key payload into context.files.
 * result["read-file"] → context.files[path] = content
 * result["write-file"] → context.files[path] = content (if present)
 * Clears the processed result key after merging.
 */
export interface MergeFilesToContextOperation {
  op: 'merge-files-to-context';
  /** Which result keys to process. Default: ["read-file", "write-file"] */
  from?: string[];
}

/**
 * Replace full file content in context.files with a truncated head.
 * Useful for edit_code / run_tests steps where files are reference-only.
 */
export interface SummarizeFilesOperation {
  op: 'summarize-files';
  /** Max lines to keep per file. Default: 40 */
  maxLines?: number;
  /** Only summarize files matching these path prefixes. Default: all */
  only?: string[];
}

/**
 * Run a sub-pipeline for each element of an array.
 * Useful for batch processing items in workbench.batch.items.
 */
export interface ForEachOperation {
  op: 'for-each';
  /** JSONPath to the array to iterate */
  arrayPath: string;
  /** Variable name injected as $item into sub-steps */
  as: string;
  /** Sub-pipeline steps executed per element */
  steps: TransformStep[];
}

/**
 * Pick only specified fields from context, dropping everything else.
 * Supports "field:N" for arrays (e.g. "history:3" = last 3). Use "history", "history:all",
 * "history:full", or "history:0" for the full array (no tail slice).
 */
export interface PickContextOperation {
  op: 'pick-context';
  /** Fields to keep under `context`. Use "history:N" for last N, or plain "history" for all. */
  include: string[];
}

/**
 * Drop a field from $out before sending to LLM.
 */
export interface DropOperation {
  op: 'drop';
  /** JSONPath in $out to delete (e.g. "$.context.files"). */
  path: string;
}

/**
 * Keep only the last N entries of context.history.
 */
export interface TruncateHistoryOperation {
  op: 'truncate-history';
  /** Number of most-recent history entries to keep. */
  keep: number;
}

/**
 * Include a field only when a condition is met.
 * If condition is false, the field at `path` is dropped from $out.
 */
export interface IncludeIfOperation {
  op: 'include-if';
  /** JSONPath to the field to conditionally keep. */
  path: string;
  /** JSONPath whose value is evaluated as truthy/falsy. */
  condition: string;
}

/**
 * Keep only specific file paths from context.files.
 * All other paths are dropped to reduce LLM token usage.
 */
export interface PickFilesOperation {
  op: 'pick-files';
  /** Exact paths to keep. Supports "$result" to auto-pick from result action key. */
  paths: string[] | '$result';
}

/**
 * Copy operation - copies data from one JSONPath to another
 */
export interface CopyOperation {
  op: 'copy';
  from: string;      // JSONPath in input document
  to: string;       // JSONPath in output document ($out)
}

/**
 * Set operation - sets a value at a JSONPath
 */
export interface SetOperation {
  op: 'set';
  path: string;     // JSONPath in $out to write to
  value?: JSONValue; // Literal value to set
  valueFrom?: string; // JSONPath in input or $out; takes precedence over value
}

/**
 * Append to array operation - appends a value to an array
 */
export interface AppendToArrayOperation {
  op: 'append-to-array';
  to: string;       // JSONPath in $out pointing to an array
  value: Record<string, unknown>; // Value to append, may contain template placeholders
}

/**
 * Parse JSON from MD operation - reads markdown file and extracts JSON
 */
export interface ParseJsonFromMdOperation {
  op: 'parse-json-from-md';
  fromFile: string;    // Relative file name to read markdown from
  jsonPath?: string;   // JSONPath inside parsed JSON, default '$'
  to: string;          // JSONPath in $out to place parsed JSON
}

/**
 * Render Markdown operation - renders a markdown template with data
 */
export interface RenderMarkdownOperation {
  op: 'render-markdown';
  templateRef: string; // Reference to markdown template
  data: string;        // JSONPath used as template data context
  outputFile: string;  // File name to write markdown to
}

/**
 * Switch operation - conditional transform based on discriminator value
 */
export interface SwitchOperation {
  op: 'switch';
  discriminator: string;  // JSONPath expression for value to match
  cases: Record<string, Record<string, unknown>>; // Map from discriminator value to operation
  default?: Record<string, unknown>; // Optional default operation
  /** When true, only exact `cases[discriminator]` matches; no substring fallback. */
  exactOnly?: boolean;
}

/**
 * Runtime context for transform execution
 */
export interface TransformContext {
  /** Input document being transformed */
  input: Record<string, unknown>;
  /** Output document being built */
  $out: Record<string, unknown>;
  /** Base directory for file operations */
  baseDir?: string;
  /** Output directory for generated artifacts (defaults to baseDir) */
  outputDir?: string;
  /** File system operations */
  fs?: TransformFileSystem;
}

/**
 * File system abstraction for transform operations
 */
export interface TransformFileSystem {
  readFile(path: string, encoding?: BufferEncoding): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

/**
 * Result of transform pipeline execution
 */
export interface TransformResult {
  /** The transformed output document */
  output: Record<string, unknown>;
  /** Files written during transformation */
  files?: Record<string, string>;
  /** Whether transformation was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Options for transform pipeline execution
 */
export interface TransformOptions {
  /** Base directory for file operations */
  baseDir?: string;
  /** Output directory for generated files (e.g. request.md) */
  outputDir?: string;
  /** Custom file system implementation */
  fs?: TransformFileSystem;
  /** Template renderer function */
  renderTemplate?: (template: string, data: Record<string, unknown>) => string;
}

/**
 * Transform error with context
 */
export class TransformError extends Error {
  constructor(
    message: string,
    public readonly step: TransformStep,
    public readonly context: TransformContext
  ) {
    super(message);
    this.name = 'TransformError';
  }
}
