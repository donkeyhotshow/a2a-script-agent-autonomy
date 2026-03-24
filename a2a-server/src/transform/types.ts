/**
 * Transform Pipeline Runtime Types
 * 
 * Types for the transform DSL defined in server-transform.schema.json
 * 
 * Pipeline order: request.json → server-transforms-request.json → request.md → LLM → response.md → server-transforms-response.json → response.json
 */

import type { JSONValue } from 'jsonify';

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
  | ApplyScratchpadOpsOperation;

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
