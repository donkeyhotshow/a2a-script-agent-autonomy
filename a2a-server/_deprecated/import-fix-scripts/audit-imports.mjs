#!/usr/bin/env node
/**
 * Full import audit: find all broken relative imports in packages/
 * Outputs: file | import | resolved_path | status
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, dirname, relative, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagesDir = join(__dirname, 'packages');

function getAllTsFiles(dir) {
  const results = [];
  try {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules') continue;
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) results.push(...getAllTsFiles(full));
      else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) results.push(full);
    }
  } catch {}
  return results;
}

function tryResolve(dir, imp) {
  const candidates = [
    imp,
    imp + '.ts',
    imp + '.js',
    imp + '/index.ts',
    imp + '/index.js',
  ];
  for (const c of candidates) {
    const full = resolve(dir, c);
    if (existsSync(full)) return { found: true, path: full };
  }
  return { found: false };
}

const broken = [];
const files = getAllTsFiles(packagesDir);

for (const file of files) {
  const fileDir = dirname(file);
  const relFile = relative(packagesDir, file);
  const content = readFileSync(file, 'utf8');
  
  const importRe = /from\s+['"](\.[^'"]+)['"]/g;
  let m;
  while ((m = importRe.exec(content)) !== null) {
    const imp = m[1];
    const result = tryResolve(fileDir, imp);
    if (!result.found) {
      broken.push({ file: relFile, imp, expected: resolve(fileDir, imp) });
    }
  }
}

// Group by package (first path segment)
const byPkg = {};
for (const b of broken) {
  const pkg = b.file.split(/[/\\]/)[0];
  if (!byPkg[pkg]) byPkg[pkg] = [];
  byPkg[pkg].push(b);
}

console.log(`\nTotal broken imports: ${broken.length}`);
console.log(`Affected packages: ${Object.keys(byPkg).join(', ')}\n`);

for (const [pkg, items] of Object.entries(byPkg)) {
  console.log(`\n=== ${pkg} (${items.length} broken) ===`);
  for (const { file, imp, expected } of items) {
    console.log(`  ${file.replace(pkg + '/', '')}`);
    console.log(`    import: ${imp}`);
    console.log(`    expected: ${expected}`);
  }
}
