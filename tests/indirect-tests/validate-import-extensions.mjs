#!/usr/bin/env node
/**
 * Validate NodeNext import extensions (.js on relative imports).
 * Catches import errors before runtime.
 *
 * Usage:
 *   node tests/indirect-tests/validate-import-extensions.mjs
 *   node tests/indirect-tests/validate-import-extensions.mjs --fix-suggestions
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, resolve, extname, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const serverRoot = join(repoRoot, 'a2a-server');
const aiIntegrationRoot = join(repoRoot, 'ai-integration');

let exitCode = 0;
const errors = [];
const checked = new Set();

function error(file, line, msg) {
    errors.push({ file, line, msg });
    exitCode = 1;
}

const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const relativeImportRegex = /^\.\.?\//;

function checkFile(filePath, content, lines) {
    let match;
    importRegex.lastIndex = 0;

    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1] || match[2];
        const lineNum = content.substring(0, match.index).split('\n').length;

        // Skip non-relative imports (NodeNext rule is for relative only)
        if (!relativeImportRegex.test(importPath)) continue;

        // Skip if already has extension
        if (importPath.endsWith('.js') || importPath.endsWith('.mjs')) continue;

        // Check if it's a directory import (index)
        const fullPath = resolve(dirname(filePath), importPath);
        const dirPath = fullPath;
        const filePathJs = fullPath + '.ts';
        const filePathJsJs = fullPath + '.js';

        const isDir = existsSync(dirPath) && statSync(dirPath).isDirectory();
        const isFile = existsSync(filePathJs) || existsSync(filePathJsJs);

        if (isFile && !importPath.endsWith('.js') && !importPath.endsWith('/index.js')) {
            error(filePath, lineNum, `Relative import missing .js extension: "${importPath}"`);
        }
    }
}

function scanDir(dir, extensions = ['.ts']) {
    if (!existsSync(dir)) return;

    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
            scanDir(fullPath, extensions);
        } else if (entry.isFile() && extensions.includes(extname(entry.name))) {
            if (checked.has(fullPath)) continue;
            checked.add(fullPath);

            const content = readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');
            checkFile(fullPath, content, lines);
        }
    }
}

console.log('=== Checking a2a-server (NodeNext imports) ===');
scanDir(join(serverRoot, 'src'));

console.log('=== Checking ai-integration (NodeNext imports) ===');
scanDir(join(aiIntegrationRoot, 'src'));

// Output
if (errors.length > 0) {
    console.error('\n=== Import Extension Validation FAILED ===');
    for (const e of errors) {
        const relPath = relative(repoRoot, e.file);
        console.error(`  ✗ ${relPath}:${e.line} ${e.msg}`);
    }
    console.error(`\nTotal errors: ${errors.length}`);
    console.error('\nFix: Add .js extension to relative imports (NodeNext requirement)');
} else {
    console.log('\n=== Import Extension Validation OK ===');
    console.log(`  ✓ ${checked.size} files checked`);
}

process.exit(exitCode);
