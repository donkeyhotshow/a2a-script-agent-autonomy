#!/usr/bin/env node
/**
 * Generate 100 neuron files from docs/neurons-top-100.md
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NEURONS = [
  { id: 'neuron-detect-n1-queries', triggers: ['with(', '->load', 'N+1', 'eager', 'relation'] },
  { id: 'neuron-suggest-eager-loading', triggers: ['with(', 'load', 'eager', 'relation', 'belongsTo'] },
  { id: 'neuron-apply-eager-loading', triggers: ['with(', 'eager', 'relation'] },
  { id: 'neuron-detect-missing-validation', triggers: ['validate', 'rules', 'Request', 'validator'] },
  { id: 'neuron-suggest-validation-rules', triggers: ['validate', 'rules', 'Request'] },
  { id: 'neuron-suggest-form-request', triggers: ['FormRequest', 'validate', 'rules'] },
  { id: 'neuron-apply-form-request', triggers: ['FormRequest', 'Request', 'validate'] },
  { id: 'neuron-detect-mass-assignment-risk', triggers: ['$fillable', 'create', 'update', 'Model'] },
  { id: 'neuron-detect-missing-middleware', triggers: ['Route::', 'middleware', 'routes/'] },
  { id: 'neuron-suggest-route-middleware', triggers: ['Route::', 'middleware', 'auth'] },
  { id: 'neuron-detect-eloquent-select-all', triggers: ['Model::all', 'get()', 'select'] },
  { id: 'neuron-suggest-select-columns', triggers: ['select', 'get()', 'selectRaw'] },
  { id: 'neuron-detect-missing-indexes', triggers: ['migration', 'Schema::', 'foreignId'] },
  { id: 'neuron-suggest-migration-indexes', triggers: ['migration', 'index', 'foreignId'] },
  { id: 'neuron-detect-blade-xss', triggers: ['{!!', 'Blade', 'html', '@'] },
  { id: 'neuron-suggest-blade-safe-output', triggers: ['{!!', 'Blade', 'html'] },
  { id: 'neuron-detect-csrf-issues', triggers: ['csrf', '@csrf', 'VerifyCsrfToken'] },
  { id: 'neuron-suggest-csrf-fix', triggers: ['csrf', '@csrf', 'form'] },
  { id: 'neuron-detect-validation-errors-handling', triggers: ['errors', 'validate', 'old('] },
  { id: 'neuron-suggest-validation-errors-fix', triggers: ['errors', 'validate', 'old('] },
  { id: 'neuron-detect-unused-routes', triggers: ['Route::', 'routes/', 'web.php'] },
  { id: 'neuron-detect-sync-should-be-queue', triggers: ['dispatch', 'Mail::', 'sync', 'queue'] },
  { id: 'neuron-suggest-queue-job', triggers: ['Job', 'dispatch', 'queue'] },
  { id: 'neuron-detect-weak-validation', triggers: ['validate', 'rules', 'sometimes'] },
  { id: 'neuron-detect-blade-include-issues', triggers: ['@include', 'Blade', 'components'] },
  { id: 'neuron-detect-inertia-useform-issues', triggers: ['useForm', 'Inertia', 'form'] },
  { id: 'neuron-suggest-inertia-useform-fix', triggers: ['useForm', 'Inertia', 'form'] },
  { id: 'neuron-detect-inertia-props-validation', triggers: ['Inertia', 'props', 'page'] },
  { id: 'neuron-suggest-inertia-props-types', triggers: ['Inertia', 'props', 'page'] },
  { id: 'neuron-detect-vue-ref-reactive-issues', triggers: ['ref', 'reactive', 'computed'] },
  { id: 'neuron-suggest-vue-composition-patterns', triggers: ['ref', 'reactive', 'computed'] },
  { id: 'neuron-detect-vue-props-emits-issues', triggers: ['defineProps', 'defineEmits', 'props'] },
  { id: 'neuron-suggest-vue-props-emits', triggers: ['defineProps', 'defineEmits', 'props'] },
  { id: 'neuron-detect-vue-lifecycle-issues', triggers: ['onMounted', 'onUnmounted', 'lifecycle'] },
  { id: 'neuron-suggest-vue-lifecycle-fix', triggers: ['onMounted', 'onUnmounted', 'watch'] },
  { id: 'neuron-detect-vif-vshow-misuse', triggers: ['v-if', 'v-show', 'v-for'] },
  { id: 'neuron-suggest-vif-vshow-fix', triggers: ['v-if', 'v-show'] },
  { id: 'neuron-detect-missing-lazy-loading', triggers: ['img', 'loading', 'lazy'] },
  { id: 'neuron-suggest-lazy-loading', triggers: ['img', 'loading', 'IntersectionObserver'] },
  { id: 'neuron-detect-memory-leak-patterns', triggers: ['addEventListener', 'onUnmounted', 'watch'] },
  { id: 'neuron-detect-options-api', triggers: ['data()', 'methods', 'mounted'] },
  { id: 'neuron-suggest-composition-api', triggers: ['data()', 'setup', 'ref'] },
  { id: 'neuron-detect-prop-drilling', triggers: ['props', 'emit', 'provide', 'inject'] },
  { id: 'neuron-suggest-provide-inject', triggers: ['props', 'provide', 'inject'] },
  { id: 'neuron-detect-laravel-routes-js-mismatch', triggers: ['route(', 'ziggy', 'routes'] },
  { id: 'neuron-detect-ziggy-usage-issues', triggers: ['route(', 'ziggy', 'routes'] },
  { id: 'neuron-detect-typescript-missing-props-types', triggers: ['defineProps', 'interface', 'type'] },
  { id: 'neuron-suggest-typescript-props-types', triggers: ['defineProps', 'interface', 'type'] },
  { id: 'neuron-detect-typescript-any', triggers: ['any', ':', 'TypeScript'] },
  { id: 'neuron-suggest-typescript-types', triggers: ['any', 'interface', 'type'] },
  { id: 'neuron-detect-typescript-inertia-shared-types', triggers: ['Inertia', 'PageProps', 'Shared'] },
  { id: 'neuron-suggest-inertia-page-props-types', triggers: ['Inertia', 'PageProps', 'Shared'] },
  { id: 'neuron-detect-any-types', triggers: ['any', 'unknown', 'TypeScript'] },
  { id: 'neuron-generate-ts-types', triggers: ['interface', 'type', 'TypeScript'] },
  { id: 'neuron-detect-security-v-html', triggers: ['v-html', 'innerHTML', 'dangerouslySetInnerHTML'] },
  { id: 'neuron-suggest-sanitize-html', triggers: ['v-html', 'innerHTML', 'sanitize'] },
  { id: 'neuron-detect-xss-vulnerabilities', triggers: ['v-html', 'innerHTML', 'eval'] },
  { id: 'neuron-suggest-xss-fix', triggers: ['v-html', 'innerHTML', 'escape'] },
  { id: 'neuron-detect-missing-csrf-token', triggers: ['csrf', 'POST', 'form'] },
  { id: 'neuron-detect-input-validation-issues', triggers: ['input', 'validate', 'sanitize'] },
  { id: 'neuron-detect-sql-injection', triggers: ['whereRaw', 'DB::raw', 'selectRaw'] },
  { id: 'neuron-detect-secrets-in-code', triggers: ['password', 'secret', 'api_key', 'token'] },
  { id: 'neuron-detect-auth-issues', triggers: ['auth', 'login', 'password', 'hash'] },
  { id: 'neuron-suggest-password-hashing', triggers: ['password', 'bcrypt', 'Hash::'] },
  { id: 'neuron-detect-tailwind-inline-styles', triggers: ['style=', 'class=', 'tailwind'] },
  { id: 'neuron-suggest-tailwind-alternatives', triggers: ['style=', 'class=', 'tailwind'] },
  { id: 'neuron-detect-tailwind-invalid-classes', triggers: ['class=', 'tailwind', 'className'] },
  { id: 'neuron-suggest-tailwind-valid-classes', triggers: ['class=', 'tailwind'] },
  { id: 'neuron-detect-tailwind-responsive-missing', triggers: ['sm:', 'md:', 'lg:', 'responsive'] },
  { id: 'neuron-suggest-tailwind-responsive', triggers: ['sm:', 'md:', 'lg:', 'responsive'] },
  { id: 'neuron-detect-a11y-missing-alt', triggers: ['<img', 'alt=', 'image'] },
  { id: 'neuron-suggest-a11y-alt', triggers: ['<img', 'alt=', 'image'] },
  { id: 'neuron-detect-a11y-missing-aria', triggers: ['aria-', 'role=', 'button'] },
  { id: 'neuron-suggest-a11y-aria-labels', triggers: ['aria-', 'role=', 'label'] },
  { id: 'neuron-detect-a11y-keyboard-issues', triggers: ['tabindex', 'keydown', 'focus'] },
  { id: 'neuron-suggest-a11y-keyboard-fix', triggers: ['tabindex', 'keydown', 'focus'] },
  { id: 'neuron-detect-missing-tests', triggers: ['test', 'it(', 'describe', 'phpunit'] },
  { id: 'neuron-suggest-test-generation', triggers: ['test', 'it(', 'describe'] },
  { id: 'neuron-detect-missing-feature-tests', triggers: ['test', 'Feature', 'Http'] },
  { id: 'neuron-generate-unit-tests', triggers: ['test', 'it(', 'describe'] },
  { id: 'neuron-generate-e2e-tests', triggers: ['test', 'e2e', 'playwright', 'cypress'] },
  { id: 'neuron-suggest-phpunit', triggers: ['phpunit', 'test', 'TestCase'] },
  { id: 'neuron-suggest-vitest', triggers: ['vitest', 'test', 'describe'] },
  { id: 'neuron-suggest-playwright', triggers: ['playwright', 'e2e', 'test'] },
  { id: 'neuron-generate-crud-module', triggers: ['CRUD', 'create', 'update', 'delete'] },
  { id: 'neuron-generate-form', triggers: ['form', 'FormRequest', 'validate'] },
  { id: 'neuron-generate-migration', triggers: ['migration', 'Schema::', 'create'] },
  { id: 'neuron-generate-model', triggers: ['Model', 'extends', 'Eloquent'] },
  { id: 'neuron-generate-controller', triggers: ['Controller', 'extends', 'Route'] },
  { id: 'neuron-generate-vue-component', triggers: ['vue', 'component', 'defineComponent'] },
  { id: 'neuron-generate-api-endpoint', triggers: ['api', 'Route::', 'controller'] },
  { id: 'neuron-analyze-controller-size', triggers: ['Controller', 'class', 'method'] },
  { id: 'neuron-suggest-service-layer', triggers: ['Controller', 'Service', 'logic'] },
  { id: 'neuron-detect-god-objects', triggers: ['class', 'method', 'Controller'] },
  { id: 'neuron-detect-duplicated-code', triggers: ['copy', 'duplicate', 'similar'] },
  { id: 'neuron-suggest-extract-method', triggers: ['method', 'extract', 'refactor'] },
  { id: 'neuron-detect-eloquent-scopes', triggers: ['scope', 'Model', 'query'] },
  { id: 'neuron-detect-api-resources', triggers: ['Resource', 'JsonResource', 'toArray'] },
  { id: 'neuron-detect-form-request-dedup', triggers: ['FormRequest', 'rules', 'authorize'] },
  { id: 'neuron-detect-blade-components', triggers: ['<x-', 'Blade', 'component'] },
];

function toPascalCase(str) {
  return str.replace(/(?:^|-)([a-z])/g, (_, c) => c.toUpperCase());
}

function toCamelCase(str) {
  const p = toPascalCase(str);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

function toFileName(id) {
  return id.replace(/^neuron-/, '') + '.neuron.ts';
}

function toName(id) {
  return toPascalCase(id.replace(/^neuron-/, '')).replace(/([A-Z])/g, ' $1').trim();
}

const neuronsDir = path.join(__dirname, '../src/neurons');

// Remove old files (keep index.ts for now)
const existing = fs.readdirSync(neuronsDir).filter(f => f.endsWith('.neuron.ts'));
for (const f of existing) {
  fs.unlinkSync(path.join(neuronsDir, f));
}

const imports = [];
const exports = [];

for (const { id, triggers } of NEURONS) {
  const varName = toCamelCase(id.replace(/^neuron-/, '')) + 'Neuron';
  const fileName = toFileName(id);
  const name = toName(id);

  const content = `import type { Neuron } from '../types/knowledge.types.js';

export const ${varName}: Neuron = {
  id: '${id}',
  name: '${name}',
  category: 'custom_pattern',
  triggers: ${JSON.stringify(triggers)},
  knowledge: {},
  actions: [
    { type: 'inject', target: '${id}-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
`;

  fs.writeFileSync(path.join(neuronsDir, fileName), content, 'utf8');

  const moduleName = fileName.replace('.ts', '.js');
  imports.push(`import { ${varName} } from './${fileName.replace('.ts', '.js')}';`);
  exports.push(varName);
}

const indexContent = `import type { Neuron } from '../types/knowledge.types.js';
${imports.join('\n')}

export const neurons: Neuron[] = [
${exports.map(e => '  ' + e + ',').join('\n')}
];
`;

fs.writeFileSync(path.join(neuronsDir, 'index.ts'), indexContent, 'utf8');

console.log(`Generated ${NEURONS.length} neuron files`);
