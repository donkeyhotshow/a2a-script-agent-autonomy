/**
 * Transform Operations Implementation
 * 
 * Implements all transform operations defined in server-transform.schema.json:
 * - copy: Copy data from one JSONPath to another
 * - set: Set a value at a JSONPath
 * - append-to-array: Append a value to an array
 * - parse-json-from-md: Parse JSON from markdown file
 * - render-markdown: Render a markdown template
 * - switch: Conditional transform based on discriminator value
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { 
  query, 
  set as jsonPathSet, 
  copy as jsonPathCopy, 
  appendToArray as jsonPathAppend,
  resolveTemplates 
} from './jsonpath.js';
import type { 
  TransformContext, 
  TransformStep,
  TransformFileSystem,
  CopyOperation,
  SetOperation,
  AppendToArrayOperation,
  ParseJsonFromMdOperation,
  RenderMarkdownOperation,
  SwitchOperation
} from './types.js';

/**
 * Extract JSON from markdown content
 * Looks for JSON blocks (```json ... ```) or raw JSON
 */
function extractJsonFromMarkdown(md: string): unknown {
  // Try to find JSON code block
  const jsonBlockMatch = md.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1]);
    } catch {
      // Fall through to try raw JSON
    }
  }
  
  // Try to find any code block
  const codeBlockMatch = md.match(/```\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {
      // Fall through to try raw
    }
  }
  
  // Try parsing the entire content as JSON
  try {
    return JSON.parse(md);
  } catch {
    // Return the raw content if no valid JSON found
    return md;
  }
}

/**
 * Apply a single transform operation
 */
export async function applyOperation(
  operation: TransformStep,
  context: TransformContext
): Promise<void> {
  switch (operation.op) {
    case 'copy':
      await applyCopy(operation, context);
      break;
    case 'set':
      await applySet(operation, context);
      break;
    case 'append-to-array':
      await applyAppendToArray(operation, context);
      break;
    case 'parse-json-from-md':
      await applyParseJsonFromMd(operation, context);
      break;
    case 'render-markdown':
      await applyRenderMarkdown(operation, context);
      break;
    case 'switch':
      await applySwitch(operation, context);
      break;
    default:
      throw new Error(`Unknown operation: ${(operation as TransformStep).op}`);
  }
}

/**
 * Copy operation - copies data from one JSONPath to another
 */
async function applyCopy(
  operation: CopyOperation,
  context: TransformContext
): Promise<void> {
  const { from, to } = operation;
  
  // Get value from source path
  // First check input, then $out
  let value = query(context.input, from);
  if (value === undefined) {
    value = query(context.$out, from);
  }
  
  // Set value at destination
  if (value !== undefined) {
    // Deep clone to avoid reference issues
    const clonedValue = JSON.parse(JSON.stringify(value));
    jsonPathSet(context.$out, to, clonedValue);
  }
}

/**
 * Set operation - sets a value at a JSONPath
 */
async function applySet(
  operation: SetOperation,
  context: TransformContext
): Promise<void> {
  const { path: pathStr, value, valueFrom } = operation;
  
  let resolvedValue: unknown;
  
  if (valueFrom) {
    // Get value from JSONPath
    resolvedValue = query(context.input, valueFrom);
    if (resolvedValue === undefined) {
      resolvedValue = query(context.$out, valueFrom);
    }
  } else if (value !== undefined) {
    // Use literal value with template resolution
    resolvedValue = resolveTemplates(value, context.$out);
  } else {
    resolvedValue = undefined;
  }
  
  jsonPathSet(context.$out, pathStr, resolvedValue);
}

/**
 * Append to array operation - appends a value to an array
 */
async function applyAppendToArray(
  operation: AppendToArrayOperation,
  context: TransformContext
): Promise<void> {
  const { to, value } = operation;
  
  // Resolve templates in the value
  const resolvedValue = resolveTemplates(value, context.$out);
  
  // Append to the array
  jsonPathAppend(context.$out, to, resolvedValue);
}

/**
 * Parse JSON from MD operation - reads markdown file and extracts JSON
 */
async function applyParseJsonFromMd(
  operation: ParseJsonFromMdOperation,
  context: TransformContext
): Promise<void> {
  const { fromFile, jsonPath = '$', to } = operation;
  
  // Resolve file path
  const baseDir = context.baseDir || process.cwd();
  const filePath = path.isAbsolute(fromFile) 
    ? fromFile 
    : path.resolve(baseDir, fromFile);
  
  // Read file
  let content: string;
  if (context.fs) {
    content = await context.fs.readFile(filePath, 'utf-8');
  } else {
    content = await fs.readFile(filePath, 'utf-8');
  }
  
  // Extract JSON from markdown
  const jsonData = extractJsonFromMarkdown(content);
  
  // Apply JSONPath if specified
  let finalValue = jsonData;
  if (jsonPath && jsonPath !== '$') {
    finalValue = query(jsonData, jsonPath);
  }
  
  // Set in output
  jsonPathSet(context.$out, to, finalValue);
}

/**
 * Render Markdown operation - renders a markdown template with data
 */
async function applyRenderMarkdown(
  operation: RenderMarkdownOperation,
  context: TransformContext
): Promise<void> {
  const { templateRef, data, outputFile } = operation;
  
  // Get template data
  let templateData: Record<string, unknown>;
  if (data === '$out') {
    templateData = context.$out;
  } else if (data === '$' || data === '$input') {
    templateData = context.input;
  } else {
    templateData = query<Record<string, unknown>>(context.$out, data) 
      || query<Record<string, unknown>>(context.input, data)
      || {};
  }
  
  // Resolve templates in the context for template rendering
  const resolvedData = resolveTemplates(templateData, context.$out) as Record<string, unknown>;
  
  // Get template content
  let template: string;
  const baseDir = context.baseDir || process.cwd();
  
  // Check if templateRef is a file path or a special reference
  if (templateRef.includes('#')) {
    // Handle template references like "simulations/coder/3/request.md"
    const templatePath = templateRef.startsWith('/') 
      ? templateRef 
      : path.resolve(baseDir, templateRef);
    
    if (context.fs) {
      template = await context.fs.readFile(templatePath, 'utf-8');
    } else {
      template = await fs.readFile(templatePath, 'utf-8');
    }
  } else {
    // Try as file path
    const templatePath = path.resolve(baseDir, templateRef);
    if (context.fs) {
      template = await context.fs.readFile(templatePath, 'utf-8');
    } else {
      template = await fs.readFile(templatePath, 'utf-8');
    }
  }
  
  // Simple template rendering - replace placeholders
  // Format: {{path.to.value}} or just use resolveTemplates on the context
  const rendered = renderTemplateSimple(template, resolvedData);
  
  // Write output file
  const outputPath = path.resolve(baseDir, outputFile);
  
  if (context.fs) {
    await context.fs.writeFile(outputPath, rendered);
  } else {
    await fs.writeFile(outputPath, rendered, 'utf-8');
  }
  
  // Track written files in context
  if (!context.$out._files) {
    context.$out._files = {};
  }
  (context.$out._files as Record<string, string>)[outputFile] = rendered;
}

/**
 * Simple template rendering - replaces {{path}} placeholders with values
 */
function renderTemplateSimple(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const trimmedKey = key.trim();
    const value = query(data, trimmedKey);
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

/**
 * Switch operation - conditional transform based on discriminator value
 */
async function applySwitch(
  operation: SwitchOperation,
  context: TransformContext
): Promise<void> {
  const { discriminator, cases, default: defaultCase } = operation;
  
  // Get discriminator value
  let discValue = query(context.input, discriminator);
  if (discValue === undefined) {
    discValue = query(context.$out, discriminator);
  }
  
  // Find matching case
  const discString = String(discValue);
  let matchedCase = cases[discString];
  
  // If no exact match, try to find a case key that matches as a pattern
  if (!matchedCase) {
    const caseKeys = Object.keys(cases);
    for (const key of caseKeys) {
      if (discString.includes(key) || key === '*') {
        matchedCase = cases[key];
        break;
      }
    }
  }
  
  // Apply matched case or default
  if (matchedCase) {
    // The case value is an operation object (without the 'op' field in shorthand form)
    // We need to reconstruct it
    const opValue = matchedCase.op;
    if (opValue) {
      const nestedOperation = matchedCase as TransformStep;
      await applyOperation(nestedOperation, context);
    }
  } else if (defaultCase) {
    const defaultOp = defaultCase.op;
    if (defaultOp) {
      const defaultOperation = defaultCase as TransformStep;
      await applyOperation(defaultOperation, context);
    }
  }
}

/**
 * Create a default file system implementation
 */
export function createDefaultFileSystem(): TransformFileSystem {
  return {
    async readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
      return fs.readFile(filePath, encoding);
    },
    async writeFile(filePath: string, content: string): Promise<void> {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
    },
    async exists(filePath: string): Promise<boolean> {
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    }
  };
}
