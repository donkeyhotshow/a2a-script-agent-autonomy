#!/usr/bin/env node
/**
 * Generate TypeScript and Python types from JSON Schema
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// Load protocol schema
const schemaPath = resolve(rootDir, 'schema', 'protocol.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

// TypeScript type mappings
const tsTypeMap = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  object: 'Record<string, any>',
  array: 'any[]',
  integer: 'number',
};

// Python type mappings
const pyTypeMap = {
  string: 'str',
  number: 'float',
  boolean: 'bool',
  object: 'Dict[str, Any]',
  array: 'List[Any]',
  integer: 'int',
};

function generateTypeScriptTypes() {
  let output = `// Auto-generated from JSON Schema - DO NOT EDIT MANUALLY
// Generated: ${new Date().toISOString()}

`;

  // Generate interfaces for each definition
  for (const [name, def] of Object.entries(schema.definitions)) {
    if (def.type === 'object' && def.properties) {
      output += generateTypeScriptInterface(name, def);
    }
  }

  // Export main types
  output += `
// Main Protocol Types
export type ProtocolRequest = Request;
export type ProtocolResponse = Response;
export type ProtocolMessage = Request | Response;

// Execute types
export type ExecuteAction = 
  | ExecuteScript
  | ExecuteReadFile
  | ExecuteWriteFile
  | ExecuteRagSearch
  | ExecuteCommand
  | ExecuteForm
  | ExecuteMessage;

// Result types
export type ResultAction =
  | ResultScript
  | ResultReadFile
  | ResultWriteFile
  | ResultRagSearch
  | ResultExecuteCommand
  | ResultChoice
  | ResultMessage;
`;

  return output;
}

function generateTypeScriptInterface(name, def) {
  let output = `export interface ${name} {\n`;
  
  if (def.properties) {
    for (const [propName, propDef] of Object.entries(def.properties)) {
      const required = def.required?.includes(propName);
      const tsType = jsonSchemaToTypeScript(propDef);
      output += `  ${propName}${required ? '' : '?'}: ${tsType};\n`;
    }
  }
  
  output += `}\n\n`;
  return output;
}

function jsonSchemaToTypeScript(def) {
  if (def.$ref) {
    const refName = def.$ref.split('/').pop();
    return refName;
  }
  
  if (def.type === 'array' && def.items) {
    const itemType = jsonSchemaToTypeScript(def.items);
    return `${itemType}[]`;
  }
  
  if (def.enum) {
    return def.enum.map(e => `'${e}'`).join(' | ');
  }
  
  if (def.oneOf) {
    return def.oneOf.map(d => jsonSchemaToTypeScript(d)).join(' | ');
  }
  
  return tsTypeMap[def.type] || 'any';
}

function generatePythonTypes() {
  let output = `# Auto-generated from JSON Schema - DO NOT EDIT MANUALLY
# Generated: ${new Date().toISOString()}

from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass
from datetime import datetime

`;

  // Generate dataclasses for each definition
  for (const [name, def] of Object.entries(schema.definitions)) {
    if (def.type === 'object' && def.properties) {
      output += generatePythonDataclass(name, def);
    }
  }

  // Type aliases
  output += `
# Type aliases
ProtocolRequest = Request
ProtocolResponse = Response
ProtocolMessage = Union[Request, Response]
`;

  return output;
}

function generatePythonDataclass(name, def) {
  let output = `@dataclass\nclass ${name}:\n`;
  
  if (def.properties) {
    for (const [propName, propDef] of Object.entries(def.properties)) {
      const pyType = jsonSchemaToPython(propDef);
      const snakeCase = propName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      output += `    ${snakeCase}: ${pyType}\n`;
    }
  } else {
    output += `    pass\n`;
  }
  
  output += `\n`;
  return output;
}

function jsonSchemaToPython(def) {
  if (def.$ref) {
    const refName = def.$ref.split('/').pop();
    return `"${refName}"`;
  }
  
  if (def.type === 'array' && def.items) {
    const itemType = jsonSchemaToPython(def.items);
    return `List[${itemType}]`;
  }
  
  if (def.enum) {
    return `str  # Literal[${def.enum.map(e => `'${e}'`).join(', ')}]`;
  }
  
  return pyTypeMap[def.type] || 'Any';
}

// Generate and save files
console.log('Generating protocol types from JSON Schema...\n');

// TypeScript
const tsOutput = generateTypeScriptTypes();
const tsPath = resolve(rootDir, 'a2a-server', 'src', 'types', 'protocol.generated.ts');
writeFileSync(tsPath, tsOutput);
console.log(`✓ TypeScript types: ${tsPath}`);

// Python
const pyOutput = generatePythonTypes();
const pyPath = resolve(rootDir, 'ai-integration', 'proxy', 'protocol_types.py');
writeFileSync(pyPath, pyOutput);
console.log(`✓ Python types: ${pyPath}`);

console.log('\nProtocol types generated successfully!');
