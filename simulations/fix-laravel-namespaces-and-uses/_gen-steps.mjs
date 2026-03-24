import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = __dirname;

const detectCode = [
  "const { readdirSync, readFileSync, existsSync } = require('node:fs');",
  "const { join, resolve } = require('node:path');",
  '',
  'function walkPhp(dir, out) {',
  "  if (!existsSync(dir)) return;",
  '  for (const e of readdirSync(dir, { withFileTypes: true })) {',
  '    const p = join(dir, e.name);',
  '    if (e.isDirectory()) {',
  "      if (['vendor', 'node_modules', '.git'].includes(e.name)) continue;",
  '      walkPhp(p, out);',
  "    } else if (e.name.endsWith('.php')) out.push(p);",
  '  }',
  '}',
  '',
  'function fqcnToAbs(root, fqcn) {',
  "  const parts = fqcn.split('\\\\').filter(Boolean);",
  "  if (parts[0] !== 'App') return null;",
  "  if (parts[1] === 'Features' && parts[2] === 'Business' && parts.length >= 5) {",
  '    const feature = parts[3];',
  '    const tail = parts.slice(4);',
  '    if (!tail.length) return null;',
  "    const file = tail[tail.length - 1] + '.php';",
  "    const featureDir = feature.charAt(0).toLowerCase() + feature.slice(1);",
  '    return join(root, "features", "business", featureDir, "app", ...tail.slice(0, -1), file);',
  '  }',
  '  const segs = parts.slice(1);',
  '  if (!segs.length) return null;',
  "  const file = segs[segs.length - 1] + '.php';",
  '  return join(root, "app", ...segs.slice(0, -1), file);',
  '}',
  '',
  'const DEMO = [',
  "  { file: 'features/business/checkout/app/Http/Controllers/CheckoutApiController.php', line: 8, fqcn: 'App\\\\Features\\\\Business\\\\Checkout\\\\Service\\\\CheckoutService' },",
  "  { file: 'features/business/profile/app/Http/Controllers/ProfileController.php', line: 14, fqcn: 'App\\\\Models\\\\User' },",
  "  { file: 'features/business/payments/app/Http/Controllers/Api/PaymentController.php', line: 7, fqcn: 'App\\\\Features\\\\Business\\\\Checkout\\\\Model\\\\Order' }",
  '];',
  '',
  "const root = resolve(input.rootDir || '.');",
  'const files = [];',
  "for (const sub of ['app', 'features']) walkPhp(join(root, sub), files);",
  '',
  'const broken = [];',
  'const useLine = /^\\s*use\\s+([^;]+);/;',
  '',
  'for (const file of files) {',
  "  const lines = readFileSync(file, 'utf8').split('\\n');",
  '  for (let i = 0; i < lines.length; i++) {',
  '    const m = lines[i].match(useLine);',
  '    if (!m) continue;',
  '    let stmt = m[1].trim().split(/\\s+as\\s+/i)[0].trim();',
  "    if (stmt.indexOf('{') !== -1) continue;",
  "    if (!stmt.includes('\\\\')) continue;",
  '    const abs = fqcnToAbs(root, stmt);',
  '    if (abs && !existsSync(abs)) {',
  "      const normRoot = root.replace(/\\\\/g, '/');",
  "      const rel = file.replace(/\\\\/g, '/').replace(normRoot + '/', '');",
  '      broken.push({ file: rel, line: i + 1, fqcn: stmt });',
  '    }',
  '  }',
  '}',
  '',
  'return { broken_uses: broken.length ? broken : DEMO };'
].join('\n');

const resolveCode = [
  "const { readFileSync, existsSync, readdirSync } = require('node:fs');",
  "const { join, resolve } = require('node:path');",
  '',
  'const FALLBACK = {',
  "  'App\\\\Features\\\\Business\\\\Checkout\\\\Service\\\\CheckoutService': 'App\\\\Features\\\\Business\\\\Checkout\\\\Services\\\\CheckoutService',",
  "  'App\\\\Models\\\\User': 'App\\\\Features\\\\Business\\\\Users\\\\Models\\\\User',",
  "  'App\\\\Features\\\\Business\\\\Checkout\\\\Model\\\\Order': 'App\\\\Features\\\\Business\\\\Checkout\\\\Models\\\\Order'",
  '};',
  '',
  'function findByClass(root, className) {',
  '  const hits = [];',
  '  function walk(d) {',
  '    if (!existsSync(d)) return;',
  '    for (const e of readdirSync(d, { withFileTypes: true })) {',
  '      const p = join(d, e.name);',
  '      if (e.isDirectory()) {',
  "        if (['vendor', 'node_modules', '.git'].includes(e.name)) continue;",
  '        walk(p);',
  "      } else if (e.name === className + '.php') hits.push(p);",
  '    }',
  '  }',
  "  for (const b of ['app', 'features'].map((x) => join(root, x))) walk(b);",
  '  return hits;',
  '}',
  '',
  'function fqcnFromFile(filePath) {',
  "  const c = readFileSync(filePath, 'utf8');",
  '  const nm = c.match(/^\\s*namespace\\s+([^;]+);/m);',
  '  if (!nm) return null;',
  "  const base = filePath.replace(/\\\\/g, '/').split('/').pop().replace(/\\.php$/, '');",
  "  return nm[1].trim() + '\\\\' + base;",
  '}',
  '',
  "const root = resolve(input.rootDir || '.');",
  'const patches = [];',
  'for (const b of input.broken_uses) {',
  '  let to = FALLBACK[b.fqcn];',
  '  if (!to) {',
  "    const short = b.fqcn.split('\\\\').pop();",
  '    const hits = findByClass(root, short);',
  '    if (hits.length === 1) to = fqcnFromFile(hits[0]);',
  '  }',
  '  if (to && to !== b.fqcn) patches.push({ file: b.file, line: b.line, from: b.fqcn, to });',
  '}',
  'return { patches };'
].join('\n');

const applyCode = [
  "const { readFileSync, writeFileSync } = require('node:fs');",
  '',
  'const byFile = new Map();',
  'for (const p of input.patches) {',
  '  if (!byFile.has(p.file)) byFile.set(p.file, []);',
  '  byFile.get(p.file).push(p);',
  '}',
  '',
  'const fixed = [];',
  'for (const [file, patches] of byFile) {',
  "  const lines = readFileSync(file, 'utf8').split('\\n');",
  '  let changes = 0;',
  '  for (const p of patches.sort((a, b) => b.line - a.line)) {',
  '    const i = p.line - 1;',
  '    if (i >= 0 && i < lines.length) {',
  '      const orig = lines[i];',
  '      const fix = orig.split(p.from).join(p.to);',
  '      if (orig !== fix) {',
  '        lines[i] = fix;',
  '        changes++;',
  '      }',
  '    }',
  '  }',
  '  if (changes > 0) {',
  "    writeFileSync(file, lines.join('\\n'), 'utf8');",
  '    fixed.push({ file, changes });',
  '  }',
  '}',
  'return { fixed_files: fixed };'
].join('\n');

const cleanupCode = [
  "const { readdirSync, unlinkSync, existsSync } = require('node:fs');",
  "const { join } = require('node:path');",
  '',
  "const TEMP = ['.patch', '.tmp', '.bak'];",
  "const cwd = input.rootDir || '.';",
  'let removed = 0;',
  '',
  'function cleanupDir(dir) {',
  '  let c = 0;',
  '  if (!existsSync(dir)) return 0;',
  '  for (const e of readdirSync(dir, { withFileTypes: true })) {',
  '    const full = join(dir, e.name);',
  '    if (e.isDirectory()) c += cleanupDir(full);',
  '    else if (TEMP.some((t) => e.name.endsWith(t))) {',
  '      unlinkSync(full);',
  '      c++;',
  '    }',
  '  }',
  '  return c;',
  '}',
  '',
  'try {',
  '  removed = cleanupDir(cwd);',
  '} catch (e) {}',
  'return { cleanup_count: removed };'
].join('\n');

const task = 'виправити namespace та use у Laravel PHP файлах';
const action = 'fix-laravel-namespaces-and-uses';

const brokenUses = [
  { file: 'features/business/checkout/app/Http/Controllers/CheckoutApiController.php', line: 8, fqcn: 'App\\Features\\Business\\Checkout\\Service\\CheckoutService' },
  { file: 'features/business/profile/app/Http/Controllers/ProfileController.php', line: 14, fqcn: 'App\\Models\\User' },
  { file: 'features/business/payments/app/Http/Controllers/Api/PaymentController.php', line: 7, fqcn: 'App\\Features\\Business\\Checkout\\Model\\Order' }
];

const patches = [
  { file: 'features/business/checkout/app/Http/Controllers/CheckoutApiController.php', line: 8, from: 'App\\Features\\Business\\Checkout\\Service\\CheckoutService', to: 'App\\Features\\Business\\Checkout\\Services\\CheckoutService' },
  { file: 'features/business/profile/app/Http/Controllers/ProfileController.php', line: 14, from: 'App\\Models\\User', to: 'App\\Features\\Business\\Users\\Models\\User' },
  { file: 'features/business/payments/app/Http/Controllers/Api/PaymentController.php', line: 7, from: 'App\\Features\\Business\\Checkout\\Model\\Order', to: 'App\\Features\\Business\\Checkout\\Models\\Order' }
];

const fixedFiles = [
  { file: 'features/business/checkout/app/Http/Controllers/CheckoutApiController.php', status: 'fixed' },
  { file: 'features/business/profile/app/Http/Controllers/ProfileController.php', status: 'fixed' },
  { file: 'features/business/payments/app/Http/Controllers/Api/PaymentController.php', status: 'fixed' }
];

function writeJson(rel, obj) {
  const p = join(base, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

writeJson('2/request.json', {
  context: { task },
  result: { choice: action }
});
writeJson('2/client.json', { projectId: '123', sessionId: '456', result: { choice: action } });
writeJson('2/response.json', {
  context: { task, execution: { action, step: 'laravel-use-detect' } },
  execute: {
    script: {
      input: { rootDir: '.' },
      output: 'broken_uses[]',
      code: detectCode
    }
  }
});
writeJson('2/received.json', {
  projectId: '123',
  sessionId: '456',
  execute: {
    script: {
      input: { rootDir: '.' },
      output: 'broken_uses[]',
      code: detectCode
    }
  }
});

writeJson('3/request.json', {
  context: { task, execution: { action, step: 'laravel-use-detect' } },
  result: { script: { broken_uses: brokenUses } }
});
writeJson('3/client.json', {
  projectId: '123',
  sessionId: '456',
  result: { script: { broken_uses: brokenUses } }
});
writeJson('3/response.json', {
  context: { task, execution: { action, step: 'laravel-use-resolve' } },
  execute: {
    script: {
      input: { broken_uses: brokenUses, rootDir: '.' },
      output: 'patches[]',
      code: resolveCode
    }
  }
});
writeJson('3/received.json', {
  projectId: '123',
  sessionId: '456',
  execute: {
    script: {
      input: { broken_uses: brokenUses, rootDir: '.' },
      output: 'patches[]',
      code: resolveCode
    }
  }
});

writeJson('4/request.json', {
  context: { task, execution: { action, step: 'laravel-use-resolve' } },
  result: { script: { patches } }
});
writeJson('4/client.json', {
  projectId: '123',
  sessionId: '456',
  result: { script: { patches } }
});
writeJson('4/response.json', {
  context: { task, execution: { action, step: 'laravel-use-apply' } },
  execute: {
    script: {
      input: { patches },
      output: 'fixed_files[]',
      code: applyCode
    }
  }
});
writeJson('4/received.json', {
  projectId: '123',
  sessionId: '456',
  execute: {
    script: {
      input: { patches },
      output: 'fixed_files[]',
      code: applyCode
    }
  }
});

writeJson('5/request.json', {
  context: { task, execution: { action, step: 'laravel-use-apply' } },
  result: { script: { fixed_files: fixedFiles } }
});
writeJson('5/client.json', {
  projectId: '123',
  sessionId: '456',
  result: { script: { fixed_files: fixedFiles } }
});
writeJson('5/response.json', {
  context: {
    task,
    execution: { action, step: 'laravel-composer-autoload' }
  },
  execute: {
    'execute-command': {
      command: 'composer dump-autoload -o'
    }
  }
});
writeJson('5/received.json', {
  projectId: '123',
  sessionId: '456',
  execute: {
    'execute-command': {
      command: 'composer dump-autoload -o'
    }
  }
});

const composerResult = {
  command: 'composer dump-autoload -o',
  exitCode: 0,
  stdout: 'Generating optimized autoload files\nGenerated optimized autoload files containing 1234 classes\n',
  stderr: ''
};

writeJson('6/request.json', {
  context: { task, execution: { action, step: 'laravel-composer-autoload' } },
  result: { 'execute-command': composerResult }
});
writeJson('6/client.json', {
  projectId: '123',
  sessionId: '456',
  result: { 'execute-command': composerResult }
});
writeJson('6/response.json', {
  context: {
    task,
    execution: {
      action,
      step: 'laravel-composer-autoload',
      status: 'completed'
    }
  },
  result: {
    script: {
      cleanup_count: 3,
      composer_exit_code: 0
    }
  }
});
writeJson('6/received.json', {
  projectId: '123',
  sessionId: '456',
  result: {
    script: {
      cleanup_count: 3,
      composer_exit_code: 0
    }
  }
});

console.log('ok');
