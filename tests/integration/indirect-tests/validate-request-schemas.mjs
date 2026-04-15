#!/usr/bin/env node
/**
 * Validate request/response JSON schemas (parse + minimal JSON Schema shape).
 *
 * Usage:
 *   node tests/indirect-tests/validate-request-schemas.mjs
 *   node tests/indirect-tests/validate-request-schemas.mjs --server
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..', '..');
const legacySchemas = join(repoRoot, 'docs', 'new-request-flow', 'json-schemas');
const protocolSchemas = join(repoRoot, 'docs', 'PROTOCOL', 'json-schemas');
const schemasDir = existsSync(protocolSchemas)
  ? protocolSchemas
  : legacySchemas;

let exitCode = 0;
const errors = [];
const ok = [];

function error(msg) {
    errors.push(msg);
    exitCode = 1;
}

function success(msg) {
    ok.push(msg);
}

function looksLikeJsonSchema(schema) {
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return false;
    if (schema.$schema) return true;
    if (typeof schema.type === 'string' || Array.isArray(schema.type)) return true;
    if (
        schema.properties ||
        schema.items ||
        schema.oneOf ||
        schema.anyOf ||
        schema.allOf ||
        schema.definitions ||
        schema.$ref ||
        schema.enum !== undefined ||
        Object.prototype.hasOwnProperty.call(schema, 'const')
    ) {
        return true;
    }
    return false;
}

if (!existsSync(schemasDir)) {
    error(`Schemas directory not found: ${schemasDir}`);
    console.error(errors.join('\n'));
    process.exit(1);
}

const schemaFiles = readdirSync(schemasDir).filter((f) => f.endsWith('.json'));
console.log(`Found ${schemaFiles.length} schema files`);

for (const file of schemaFiles) {
    const schemaPath = join(schemasDir, file);
    try {
        const content = readFileSync(schemaPath, 'utf-8');
        const schema = JSON.parse(content);
        if (!looksLikeJsonSchema(schema)) {
            error(`[${file}] Does not look like a JSON Schema root object`);
        } else {
            success(`[${file}] OK`);
        }
    } catch (e) {
        error(`[${file}] Invalid JSON: ${e.message}`);
    }
}

if (process.argv.includes('--server')) {
    const processorsDir = join(repoRoot, 'a2a-server', 'src', 'services', 'core', 'request-processor');
    if (existsSync(processorsDir)) {
        const processors = readdirSync(processorsDir).filter((f) => f.endsWith('.ts'));
        success(`[server] ${processors.length} request-processor *.ts file(s)`);
    }
}

if (errors.length > 0) {
    console.error('\n=== Schema Validation FAILED ===');
    for (const e of errors) {
        console.error(`  ✗ ${e}`);
    }
}

if (ok.length > 0) {
    console.log('\n=== Schema Validation OK ===');
    for (const m of ok) {
        console.log(`  ✓ ${m}`);
    }
}

if (errors.length > 0) {
    console.error(`\nTotal errors: ${errors.length}`);
}

process.exit(exitCode);
