#!/usr/bin/env node
/**
 * A2A Protocol TypeScript Client Generator
 * 
 * Generates TypeScript types from JSON Schema definitions
 * for a2a-client and a2a-server packages.
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_DIR = path.join(__dirname, '..', 'schemas', 'protocol');
const OUTPUT_DIR_CLIENT = path.join(__dirname, '..', 'a2a-client', 'packages', 'types', 'src');
const OUTPUT_DIR_SERVER = path.join(__dirname, '..', 'a2a-server', 'src', 'protocol');

// Schema to TypeScript type mapping
const typeMapping = {
  string: 'string',
  number: 'number',
  integer: 'number',
  boolean: 'boolean',
  object: 'Record<string, unknown>',
  array: 'unknown[]',
  null: 'null'
};

/**
 * Convert JSON Schema type to TypeScript type
 */
function schemaToType(schema, name = '', required = false) {
  if (!schema) return 'unknown';

  // Handle $ref
  if (schema.$ref) {
    const refName = schema.$ref.replace('.schema.json', '').replace('#/definitions/', '');
    return refName;
  }

  // Handle oneOf
  if (schema.oneOf) {
    const types = schema.oneOf.map(s => schemaToType(s, '', false));
    const union = types.join(' | ');
    return required ? union : `${union} | undefined`;
  }

  // Handle anyOf
  if (schema.anyOf) {
    const types = schema.anyOf.map(s => schemaToType(s, '', false));
    const union = types.join(' | ');
    return required ? union : `${union} | undefined`;
  }

  // Handle enum
  if (schema.enum) {
    const enumTypes = schema.enum.map(e => JSON.stringify(e));
    const union = enumTypes.join(' | ');
    return required ? union : `${union} | undefined`;
  }

  // Handle array
  if (schema.type === 'array') {
    if (schema.items) {
      const itemType = schemaToType(schema.items, '', true);
      return `${itemType}[]`;
    }
    return 'unknown[]';
  }

  // Handle object with properties
  if (schema.type === 'object' && schema.properties) {
    return generateInterface(schema, name || 'Anonymous');
  }

  // Handle additionalProperties
  if (schema.type === 'object' && schema.additionalProperties === true) {
    return 'Record<string, unknown>';
  }

  // Basic type mapping
  const baseType = typeMapping[schema.type] || 'unknown';
  return required ? baseType : `${baseType} | undefined`;
}

/**
 * Generate TypeScript interface from schema
 */
function generateInterface(schema, name) {
  const lines = [];
  lines.push(`export interface ${name} {`);

  const properties = schema.properties || {};
  const required = schema.required || [];

  for (const [propName, propSchema] of Object.entries(properties)) {
    const isRequired = required.includes(propName);
    const tsType = schemaToType(propSchema, propName, isRequired);
    const description = propSchema.description ? ` // ${propSchema.description}` : '';
    lines.push(`  ${propName}${isRequired ? '' : '?'}: ${tsType};${description}`);
  }

  // Handle additionalProperties
  if (schema.additionalProperties === true) {
    lines.push('  [key: string]: unknown;');
  } else if (typeof schema.additionalProperties === 'object') {
    const valueType = schemaToType(schema.additionalProperties, '', true);
    lines.push(`  [key: string]: ${valueType};`);
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Generate TypeScript types from action definitions
 */
function generateActionTypes(schema) {
  const lines = [];
  const definitions = schema.definitions || {};

  for (const [name, def] of Object.entries(definitions)) {
    if (def.type === 'object' && def.properties) {
      lines.push(generateInterface(def, name));
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Generate union types for execute and result
 */
function generateUnionTypes() {
  const executeTypes = [
    'FormExecute',
    'ScriptExecute',
    'ReadFileExecute',
    'WriteFileExecute',
    'RagSearchExecute',
    'ExecuteCommandExecute',
    'MessageExecute'
  ];

  const resultTypes = [
    'FormResult',
    'ScriptResult',
    'ReadFileResult',
    'WriteFileResult',
    'RagSearchResult',
    'ExecuteCommandResult'
  ];

  return `
/** Union type for all execute actions */
export type ExecuteAction =
  | FormExecute
  | ScriptExecute
  | ReadFileExecute
  | WriteFileExecute
  | RagSearchExecute
  | ExecuteCommandExecute
  | MessageExecute;

/** Union type for all result actions */
export type ResultAction =
  | FormResult
  | ScriptResult
  | ReadFileResult
  | WriteFileResult
  | RagSearchResult
  | ExecuteCommandResult;
`;
}

/**
 * Generate protocol client code
 */
function generateProtocolClient() {
  const schemaFiles = {
    message: JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, 'message.schema.json'), 'utf8')),
    context: JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, 'context.schema.json'), 'utf8')),
    action: JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, 'action.schema.json'), 'utf8')),
    request: JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, 'request.schema.json'), 'utf8')),
    response: JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, 'response.schema.json'), 'utf8'))
  };

  let output = `/**
 * A2A Protocol TypeScript Types
 * Auto-generated from JSON Schema definitions
 * DO NOT EDIT MANUALLY - Run: npm run generate:protocol
 */

`;

  // Generate Message types
  output += `// ==================== Message Types ====================\n\n`;
  output += generateInterface(schemaFiles.message, 'Message');
  output += '\n\n';

  // Generate Context types
  output += `// ==================== Context Types ====================\n\n`;
  output += generateInterface(schemaFiles.context.properties.execution, 'ExecutionState');
  output += '\n\n';
  output += generateInterface(schemaFiles.context, 'Context');
  output += '\n\n';

  // Generate Action types
  output += `// ==================== Action Types ====================\n\n`;
  output += generateActionTypes(schemaFiles.action);
  output += generateUnionTypes();
  output += '\n';

  // Generate Request type
  output += `// ==================== Request Types ====================\n\n`;
  output += generateInterface(schemaFiles.request.oneOf[1], 'FollowUpRequest');
  output += '\n\n';
  output += `/** Initial request with task description only */
export interface InitialRequest {
  task: string;
}

/** Union type for all requests */
export type Request = InitialRequest | FollowUpRequest;
`;
  output += '\n';

  // Generate Response type
  output += `// ==================== Response Types ====================\n\n`;
  output += generateInterface(schemaFiles.response.definitions.Action, 'Action');
  output += '\n\n';
  output += generateInterface(schemaFiles.response.definitions.Step, 'Step');
  output += '\n\n';
  output += generateInterface(schemaFiles.response.definitions.FallbackAction, 'FallbackAction');
  output += '\n\n';
  output += generateInterface(schemaFiles.response, 'Response');
  output += '\n';

  // Generate ProtocolClient class
  output += `
// ==================== Protocol Client ====================

export interface ProtocolClientConfig {
  baseUrl: string;
  headers?: Record<string, string>;
}

export class ProtocolClient {
  private config: ProtocolClientConfig;

  constructor(config: ProtocolClientConfig) {
    this.config = config;
  }

  async sendRequest(request: Request): Promise<Response> {
    const response = await fetch(\`\${this.config.baseUrl}/requests\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    return response.json();
  }

  async *streamEvents(sessionId: string): AsyncGenerator<Response> {
    const eventSource = new EventSource(\`\${this.config.baseUrl}/sse?sessionId=\${sessionId}\`);
    
    try {
      while (true) {
        const message = await new Promise<MessageEvent>((resolve, reject) => {
          eventSource.onmessage = resolve;
          eventSource.onerror = reject;
        });
        
        yield JSON.parse(message.data);
      }
    } finally {
      eventSource.close();
    }
  }
}
`;

  return output;
}

/**
 * Generate server-side SDK
 */
function generateServerSDK() {
  const protocolClient = generateProtocolClient();
  
  // Add server-specific validation utilities
  const serverSDK = protocolClient + `
// ==================== Server-Side Utilities ====================

import { Validator } from 'jsonschema';

const validator = new Validator();

export function validateRequest(data: unknown): { valid: boolean; errors?: string[] } {
  // Request validation would use the actual schema
  // This is a simplified implementation
  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Request must be an object'] };
  }
  
  const req = data as Record<string, unknown>;
  
  if ('task' in req && typeof req.task === 'string') {
    return { valid: true };
  }
  
  if ('context' in req && typeof req.context === 'object') {
    return { valid: true };
  }
  
  return { valid: false, errors: ['Request must have either "task" or "context"'] };
}

export function validateResponse(data: unknown): { valid: boolean; errors?: string[] } {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Response must be an object'] };
  }
  
  const resp = data as Record<string, unknown>;
  
  if (!('context' in resp)) {
    return { valid: false, errors: ['Response must have "context"'] };
  }
  
  return { valid: true };
}

export type { Request, Response, Context, ExecuteAction, ResultAction };
`;

  return serverSDK;
}

/**
 * Main generation function
 */
function main() {
  console.log('Generating A2A Protocol TypeScript clients...');

  try {
    // Ensure output directories exist
    if (!fs.existsSync(OUTPUT_DIR_CLIENT)) {
      fs.mkdirSync(OUTPUT_DIR_CLIENT, { recursive: true });
    }
    if (!fs.existsSync(OUTPUT_DIR_SERVER)) {
      fs.mkdirSync(OUTPUT_DIR_SERVER, { recursive: true });
    }

    // Generate client types
    const clientCode = generateProtocolClient();
    const clientOutputPath = path.join(OUTPUT_DIR_CLIENT, 'protocol.ts');
    fs.writeFileSync(clientOutputPath, clientCode);
    console.log(`✓ Generated client types: ${clientOutputPath}`);

    // Generate server SDK
    const serverCode = generateServerSDK();
    const serverOutputPath = path.join(OUTPUT_DIR_SERVER, 'client-sdk.ts');
    fs.writeFileSync(serverOutputPath, serverCode);
    console.log(`✓ Generated server SDK: ${serverOutputPath}`);

    // Generate index export
    const indexContent = `export * from './protocol.js';
`;
    fs.writeFileSync(path.join(OUTPUT_DIR_CLIENT, 'index.ts'), indexContent);
    console.log(`✓ Generated index export`);

    console.log('\nProtocol client generation complete!');
  } catch (error) {
    console.error('Error generating protocol clients:', error);
    process.exit(1);
  }
}

main();
