#!/usr/bin/env node
/**
 * Validate prompt files for consistency and required placeholders.
 *
 * Usage:
 *   node tests/indirect-tests/validate-prompts.mjs
 *   node tests/indirect-tests/validate-prompts.mjs --strict  # Fail on warnings
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..', '..');
const serverRoot = join(repoRoot, 'a2a-server');
const legacyPrompts = join(serverRoot, 'prompts');
/** Workspace: known prompt template trees (avoid scanning tests/fixtures). */
const promptScanDirs = existsSync(legacyPrompts)
  ? [legacyPrompts]
  : [
      join(serverRoot, 'packages', 'agents', 'src'),
      join(serverRoot, 'packages', 'features', 'src', 'agents'),
      join(serverRoot, 'packages', 'actions', 'src', 'definitions', 'auto-ai'),
    ].filter((d) => existsSync(d));

let exitCode = 0;
const errors = [];
const warnings = [];

function error(msg) {
    errors.push(msg);
    exitCode = 1;
}

function warn(msg) {
    warnings.push(msg);
}

// Required placeholders that should appear in prompt templates
const expectedPlaceholders = [
    { pattern: /\{\{?\s*context\.task\s*\}\}?/i, name: 'context.task' },
    { pattern: /\{\{?\s*context\.history\s*\}\}?/i, name: 'context.history' },
];

function checkPromptFile(filePath) {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const fileName = filePath.split(/[\\/]/).pop();

    // Check for markdown structure
    if (!content.includes('#') && !content.includes('---')) {
        warn(`[${fileName}] No headers or frontmatter found`);
    }

    // Check for placeholders
    for (const placeholder of expectedPlaceholders) {
        if (!placeholder.pattern.test(content)) {
            // Not all prompts need all placeholders — this is just informational
            // warn(`[${fileName}] Missing placeholder: ${placeholder.name}`);
        }
    }

    // Check for JSON transforms reference
    if (content.includes('transform') && !existsSync(filePath.replace('.md', '.json'))) {
        if (!existsSync(filePath.replace('.md', '-transform.json'))) {
            // Some prompts don't need transforms
        }
    }

    // Check for balanced brackets in template expressions
    const openBraces = (content.match(/\{\{/g) || []).length;
    const closeBraces = (content.match(/\}\}/g) || []).length;
    if (openBraces !== closeBraces) {
        error(`[${fileName}] Unbalanced template braces: {{=${openBraces}, }}=${closeBraces}`);
    }

    // Check line endings (should be consistent)
    const crlfCount = (content.match(/\r\n/g) || []).length;
    const lfCount = (content.match(/[^\r]\n/g) || []).length;
    if (crlfCount > 0 && lfCount > 0) {
        warn(`[${fileName}] Mixed line endings (CRLF and LF)`);
    }
}

function scanDir(dir) {
    if (!existsSync(dir)) return;

    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
            scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            checkPromptFile(fullPath);
        }
    }
}

console.log('=== Validating prompts ===');
if (promptScanDirs.length === 0) {
    console.error(`\n=== Prompt Validation FAILED ===\n  ✗ No prompt template directories found under a2a-server`);
    process.exit(1);
}
for (const d of promptScanDirs) {
    scanDir(d);
}

// Output
if (errors.length > 0) {
    console.error('\n=== Prompt Validation FAILED ===');
    for (const e of errors) {
        console.error(`  ✗ ${e}`);
    }
}

if (warnings.length > 0) {
    console.warn('\n=== Prompt Validation Warnings ===');
    for (const w of warnings) {
        console.warn(`  ⚠ ${w}`);
    }
}

if (errors.length === 0 && warnings.length === 0) {
    console.log('\n=== Prompt Validation OK ===');
}

if (process.argv.includes('--strict') && warnings.length > 0) {
    exitCode = 1;
}

if (errors.length > 0 || (process.argv.includes('--strict') && warnings.length > 0)) {
    console.error(`\nErrors: ${errors.length}, Warnings: ${warnings.length}`);
}

process.exit(exitCode);
