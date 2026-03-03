#!/usr/bin/env node
/**
 * Action Types Generator
 * 
 * Generates TypeScript types and Zod schemas from YAML action definitions.
 * Usage: node scripts/generate-action-types.js
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');

// Paths
const YAML_ACTIONS_DIR = resolve(ROOT_DIR, 'a2a-server/src/actions/definitions/yaml/actions');
const YAML_MIXINS_DIR = resolve(ROOT_DIR, 'a2a-server/src/actions/definitions/yaml/mixins');
const YAML_BASE_DIR = resolve(ROOT_DIR, 'a2a-server/src/actions/definitions/yaml/base');
const SERVER_OUTPUT_PATH = resolve(ROOT_DIR, 'a2a-server/src/actions/generated-types.ts');
const CLIENT_OUTPUT_PATH = resolve(ROOT_DIR, 'a2a-client/packages/types/src/action-types.ts');

/**
 * Load and parse YAML file
 */
function loadYaml(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return yaml.load(content);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Load all YAML files from directory
 */
function loadYamlFromDir(dirPath) {
  if (!existsSync(dirPath)) return [];
  
  const files = readdirSync(dirPath).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
  return files.map(file => ({
    name: file.replace(/\.(yaml|yml)$/, ''),
    path: join(dirPath, file),
    data: loadYaml(join(dirPath, file))
  })).filter(item => item.data !== null);
}

/**
 * Convert kebab-case to PascalCase
 */
function toPascalCase(str) {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Convert kebab-case to camelCase
 */
function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Generate TypeScript interface from action definition
 */
function generateActionInterface(action) {
  const interfaceName = `${toPascalCase(action.id)}Action`;
  const stepTypes = (action.steps || [])
    .map(step => `'${step.id}'`)
    .join(' | ') || 'string';
  
  const contextType = action.context ? generateContextType(action.context) : 'Record<string, unknown>';
  
  // Escape single quotes in title and description
  const escapedTitle = (action.title || action.id).replace(/'/g, "\\'");
  const escapedDescription = (action.description || '').replace(/'/g, "\\'");
  
  return `
/**
 * ${action.title || action.id}
 * ${action.description || ''}
 */
export interface ${interfaceName} {
  id: '${action.id}';
  version: '${action.version}';
  title: '${escapedTitle}';
  description: '${escapedDescription}';
  priority: ${action.priority || 100};
  triggers: string[];
  context: ${contextType};
  steps: (${stepTypes})[];
}

export const ${toCamelCase(action.id)}ActionSchema = {
  id: '${action.id}',
  version: '${action.version}',
  triggers: ${JSON.stringify(action.triggers || [])},
  priority: ${action.priority || 100},
} as const;
`;
}

/**
 * Generate context type from context object
 */
function generateContextType(context) {
  const entries = Object.entries(context)
    .map(([key, value]) => {
      // Quote keys that contain special characters (like hyphens)
      const propertyKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`;
      const type = typeof value === 'string' ? `'${value}'` : typeof value;
      return `  ${propertyKey}: ${type};`;
    })
    .join('\n');
  
  return `{
${entries}
}`;
}

/**
 * Generate action type union
 */
function generateActionUnion(actions) {
  const types = actions.map(a => `${toPascalCase(a.data.id)}Action`).join('\n  | ');
  return `
/**
 * Union of all action types
 */
export type Action =
  | ${types};

/**
 * Action type discriminator
 */
export type ActionType = ${actions.map(a => `'${a.data.id}'`).join(' | ')};
`;
}

/**
 * Generate execute action types based on protocol
 */
function generateExecuteTypes() {
  return `
// ============================================
// Execute Action Types (Action-Key Shape)
// ============================================

export interface FormInput {
  name: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'number';
  label?: string;
  required?: boolean;
  default?: unknown;
  options?: Array<{ value: unknown; label: string }>;
}

export interface FormChoice {
  id: string;
  label: string;
  value?: unknown;
  description?: string;
}

export interface FormAction {
  title?: string;
  description?: string;
  input?: FormInput[];
  choices?: FormChoice[];
}

export interface ScriptAction {
  input?: Record<string, unknown>;
  output?: string;
  code: string;
  timeout?: number;
}

export interface RagSearchFilters {
  file_types?: string[];
  directories?: string[];
  framework?: string;
  exclude?: string[];
}

export interface RagSearchOptions {
  limit?: number;
  min_score?: number;
  include_context?: boolean;
  highlight_matches?: boolean;
}

export interface RagSearchAction {
  query: string;
  filters?: RagSearchFilters;
  options?: RagSearchOptions;
}

export interface RagSearchResult {
  file: string;
  score: number;
  matches: Array<{
    line_start: number;
    line_end: number;
    content: string;
    highlight: string;
    context_score: number;
  }>;
  metadata: {
    framework: string;
    type: string;
    last_modified: string;
  };
}

export interface ReadFileAction {
  path: string;
  startLine?: number;
  endLine?: number;
}

export interface WriteFileAction {
  path: string;
  content: string;
  createDirs?: boolean;
}

export interface ExecuteCommandAction {
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export interface ExecuteCommandResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface MessageAction {
  content: string;
  role?: 'system' | 'user' | 'assistant';
}

/**
 * Execute payload with action-key shape
 * All execute objects MUST use this format
 */
export interface ExecutePayload {
  form?: FormAction;
  script?: ScriptAction;
  'rag-search'?: RagSearchAction;
  'read-file'?: ReadFileAction;
  'write-file'?: WriteFileAction;
  'execute-command'?: ExecuteCommandAction;
  message?: MessageAction;
}

/**
 * Action type keys
 */
export type ExecuteActionType = keyof ExecutePayload;

// ============================================
// Result Types (Action-Key Shape)
// ============================================

export interface ScriptResult {
  output?: unknown;
  error?: string;
}

export interface RagSearchResultPayload {
  results: RagSearchResult[];
  files: string[];
  query?: string;
}

export interface ReadFileResult {
  path: string;
  content?: string;
  error?: string;
}

export interface WriteFileResult {
  path: string;
  success: boolean;
  error?: string;
}

export interface FormResult {
  choice?: string;
  input?: Record<string, unknown>;
}

/**
 * Result payload with action-key shape
 */
export interface ActionResult {
  script?: ScriptResult;
  'rag-search'?: RagSearchResultPayload;
  'read-file'?: ReadFileResult;
  'write-file'?: WriteFileResult;
  'execute-command'?: ExecuteCommandResult;
  form?: FormResult;
  choice?: string;
  completed?: boolean;
  [key: string]: unknown;
}
`;
}

/**
 * Generate Zod schemas for runtime validation
 */
function generateZodSchemas() {
  return `
// ============================================
// Zod Schemas for Runtime Validation
// ============================================

import { z } from 'zod';

export const FormInputSchema = z.object({
  name: z.string(),
  type: z.enum(['text', 'textarea', 'select', 'checkbox', 'number']),
  label: z.string().optional(),
  required: z.boolean().optional(),
  default: z.unknown().optional(),
  options: z.array(z.object({
    value: z.unknown(),
    label: z.string()
  })).optional()
});

export const FormChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.unknown().optional(),
  description: z.string().optional()
});

export const FormActionSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  input: z.array(FormInputSchema).optional(),
  choices: z.array(FormChoiceSchema).optional()
});

export const ScriptActionSchema = z.object({
  input: z.record(z.unknown()).optional(),
  output: z.string().optional(),
  code: z.string(),
  timeout: z.number().optional()
});

export const RagSearchFiltersSchema = z.object({
  file_types: z.array(z.string()).optional(),
  directories: z.array(z.string()).optional(),
  framework: z.string().optional(),
  exclude: z.array(z.string()).optional()
});

export const RagSearchOptionsSchema = z.object({
  limit: z.number().optional(),
  min_score: z.number().optional(),
  include_context: z.boolean().optional(),
  highlight_matches: z.boolean().optional()
});

export const RagSearchActionSchema = z.object({
  query: z.string(),
  filters: RagSearchFiltersSchema.optional(),
  options: RagSearchOptionsSchema.optional()
});

export const ReadFileActionSchema = z.object({
  path: z.string(),
  startLine: z.number().optional(),
  endLine: z.number().optional()
});

export const WriteFileActionSchema = z.object({
  path: z.string(),
  content: z.string(),
  createDirs: z.boolean().optional()
});

export const ExecuteCommandActionSchema = z.object({
  command: z.string(),
  cwd: z.string().optional(),
  env: z.record(z.string()).optional(),
  timeout: z.number().optional()
});

export const MessageActionSchema = z.object({
  content: z.string(),
  role: z.enum(['system', 'user', 'assistant']).optional()
});

export const ExecutePayloadSchema = z.object({
  form: FormActionSchema.optional(),
  script: ScriptActionSchema.optional(),
  'rag-search': RagSearchActionSchema.optional(),
  'read-file': ReadFileActionSchema.optional(),
  'write-file': WriteFileActionSchema.optional(),
  'execute-command': ExecuteCommandActionSchema.optional(),
  message: MessageActionSchema.optional()
}).strict();

export const ActionResultSchema = z.object({
  script: z.object({
    output: z.unknown().optional(),
    error: z.string().optional()
  }).optional(),
  'rag-search': z.object({
    results: z.array(z.unknown()),
    files: z.array(z.string()),
    query: z.string().optional()
  }).optional(),
  'read-file': z.object({
    path: z.string(),
    content: z.string().optional(),
    error: z.string().optional()
  }).optional(),
  'write-file': z.object({
    path: z.string(),
    success: z.boolean(),
    error: z.string().optional()
  }).optional(),
  'execute-command': z.object({
    command: z.string(),
    exitCode: z.number(),
    stdout: z.string(),
    stderr: z.string()
  }).optional(),
  form: z.object({
    choice: z.string().optional(),
    input: z.record(z.unknown()).optional()
  }).optional(),
  choice: z.string().optional(),
  completed: z.boolean().optional()
}).passthrough();

/**
 * Validate execute payload
 */
export function validateExecutePayload(payload: unknown): { success: boolean; error?: string } {
  const result = ExecutePayloadSchema.safeParse(payload);
  if (result.success) {
    return { success: true };
  }
  return { success: false, error: result.error.message };
}

/**
 * Validate action result
 */
export function validateActionResult(result: unknown): { success: boolean; error?: string } {
  const parseResult = ActionResultSchema.safeParse(result);
  if (parseResult.success) {
    return { success: true };
  }
  return { success: false, error: parseResult.error.message };
}
`;
}

/**
 * Generate server-specific types
 */
function generateServerTypes(actions, mixins) {
  const header = `/**
 * @generated Generated by scripts/generate-action-types.js
 * DO NOT EDIT MANUALLY
 * 
 * Generated at: ${new Date().toISOString()}
 * 
 * This file contains:
 * - Action definition types
 * - Execute action types (action-key shape)
 * - Zod schemas for runtime validation
 */

`;

  const actionInterfaces = actions.map(a => generateActionInterface(a.data)).join('\n');
  const actionUnion = generateActionUnion(actions);
  const executeTypes = generateExecuteTypes();
  const zodSchemas = generateZodSchemas();

  return header + executeTypes + actionUnion + actionInterfaces + '\n' + zodSchemas;
}

/**
 * Generate client-specific types (simpler, no Zod)
 */
function generateClientTypes(actions) {
  const header = `/**
 * @generated Generated by scripts/generate-action-types.js
 * DO NOT EDIT MANUALLY
 * 
 * Generated at: ${new Date().toISOString()}
 * 
 * This file contains action types for client-side usage.
 */

`;

  // Generate simpler type definitions for client
  const actionTypeEnum = `
/**
 * Available action types
 */
export enum ActionType {
${actions.map(a => `  ${toPascalCase(a.data.id)} = '${a.data.id}'`).join(',\n')}
}
`;

  const actionMetadata = `
/**
 * Action metadata from definitions
 */
export interface ActionMetadata {
  id: string;
  version: string;
  title: string;
  description: string;
  priority: number;
  triggers: string[];
}

export const ACTIONS_METADATA: Record<ActionType, ActionMetadata> = {
${actions.map(a => `  [ActionType.${toPascalCase(a.data.id)}]: {
    id: '${a.data.id}',
    version: '${a.data.version}',
    title: '${a.data.title || a.data.id}',
    description: '${(a.data.description || '').replace(/'/g, "\\'")}',
    priority: ${a.data.priority || 100},
    triggers: ${JSON.stringify(a.data.triggers || [])}
  }`).join(',\n')}
} as const;
`;

  const executeTypes = generateExecuteTypes();

  return header + actionTypeEnum + actionMetadata + executeTypes;
}

/**
 * Main generation function
 */
async function generate() {
  console.log('🔍 Loading YAML definitions...');
  
  // Load all YAML files
  const actions = loadYamlFromDir(YAML_ACTIONS_DIR);
  const mixins = loadYamlFromDir(YAML_MIXINS_DIR);
  const bases = loadYamlFromDir(YAML_BASE_DIR);
  
  console.log(`  Found ${actions.length} actions`);
  console.log(`  Found ${mixins.length} mixins`);
  console.log(`  Found ${bases.length} base templates`);
  
  if (actions.length === 0) {
    console.warn('⚠️ No actions found, using fallback types');
  }
  
  // Generate server types
  console.log('\n📝 Generating server types...');
  const serverTypes = generateServerTypes(actions, mixins);
  writeFileSync(SERVER_OUTPUT_PATH, serverTypes);
  console.log(`  ✓ Written to ${SERVER_OUTPUT_PATH}`);
  
  // Generate client types
  console.log('\n📝 Generating client types...');
  const clientTypes = generateClientTypes(actions);
  writeFileSync(CLIENT_OUTPUT_PATH, clientTypes);
  console.log(`  ✓ Written to ${CLIENT_OUTPUT_PATH}`);
  
  console.log('\n✅ Generation complete!');
}

// Run generation
generate().catch(error => {
  console.error('❌ Generation failed:', error);
  process.exit(1);
});
