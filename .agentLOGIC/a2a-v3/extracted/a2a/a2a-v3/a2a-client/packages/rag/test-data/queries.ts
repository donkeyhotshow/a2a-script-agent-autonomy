/**
 * @fileoverview Test queries with expected results for RAG testing
 * @module @a2a/rag/test-data/queries
 * 
 * This module provides predefined test queries for different content types
 * and search scenarios including exact match, semantic, and hybrid search.
 */

import type {TestCase, QueryRelevance, MatchType} from '../tests/types.js';

/**
 * TypeScript-specific test queries
 * These queries target TypeScript code constructs
 */
export const TYPESCRIPT_QUERIES: TestCase[] = [
  {
    id: 'ts-001',
    name: 'Find TypeScript interface definitions',
    query: 'interface User with name and email properties',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['ts-interface-user.ts', 'ts-types-user.ts'],
    minPrecision: 0.8,
    minRecall: 0.7,
  },
  {
    id: 'ts-002',
    name: 'Find generic class definitions',
    query: 'generic class with type parameter T',
    matchType: 'semantic',
    category: 'functional',
    expectedDocs: ['ts-generic-repository.ts', 'ts-generic-service.ts'],
    minPrecision: 0.7,
  },
  {
    id: 'ts-003',
    name: 'Find async function with Promise return',
    query: 'async function fetching data from API',
    matchType: 'hybrid',
    category: 'functional',
    expectedDocs: ['ts-api-client.ts', 'ts-async-service.ts'],
  },
  {
    id: 'ts-004',
    name: 'Find decorator usage',
    query: '@Component decorator with props',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['ts-decorators.ts', 'ts-vue-component.ts'],
  },
  {
    id: 'ts-005',
    name: 'Find enum definitions',
    query: 'Status enum with active and inactive values',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['ts-enums.ts', 'ts-constants.ts'],
  },
  {
    id: 'ts-006',
    name: 'Find type utility functions',
    query: 'utility type Partial or Required',
    matchType: 'semantic',
    category: 'functional',
    expectedDocs: ['ts-type-utils.ts'],
  },
  {
    id: 'ts-007',
    name: 'Find class inheritance',
    query: 'class extending BaseController',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['ts-controller-base.ts', 'ts-controller-user.ts'],
  },
  {
    id: 'ts-008',
    name: 'Find module exports',
    query: 'export default configuration object',
    matchType: 'hybrid',
    category: 'functional',
    expectedDocs: ['ts-config.ts', 'ts-index.ts'],
  },
  {
    id: 'ts-009',
    name: 'Find error handling patterns',
    query: 'try catch block with custom error',
    matchType: 'semantic',
    category: 'functional',
    expectedDocs: ['ts-error-handling.ts', 'ts-service.ts'],
  },
  {
    id: 'ts-010',
    name: 'Find event handlers',
    query: 'onClick event handler method',
    matchType: 'fuzzy',
    category: 'functional',
    expectedDocs: ['ts-events.ts', 'ts-vue-component.ts'],
  },
];

/**
 * PHP-specific test queries
 * These queries target PHP code constructs
 */
export const PHP_QUERIES: TestCase[] = [
  {
    id: 'php-001',
    name: 'Find PHP class definition',
    query: 'class UserController with index method',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['php-user-controller.php', 'php-base-controller.php'],
    minPrecision: 0.8,
  },
  {
    id: 'php-002',
    name: 'Find Eloquent model',
    query: 'Model with fillable array and relationships',
    matchType: 'hybrid',
    category: 'functional',
    expectedDocs: ['php-user-model.php', 'php-product-model.php'],
  },
  {
    id: 'php-003',
    name: 'Find middleware implementation',
    query: 'middleware handle method with request',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['php-auth-middleware.php', 'php-middleware.php'],
  },
  {
    id: 'php-004',
    name: 'Find service provider',
    query: 'ServiceProvider register and boot methods',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['php-app-service-provider.php'],
  },
  {
    id: 'php-005',
    name: 'Find database migration',
    query: 'migration create table with timestamps',
    matchType: 'semantic',
    category: 'functional',
    expectedDocs: ['php-create-users-table.php', 'php-migration.php'],
  },
  {
    id: 'php-006',
    name: 'Find artisan command',
    query: 'artisan command handle method',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['php-command-import.php', 'php-console-kernel.php'],
  },
  {
    id: 'php-007',
    name: 'Find validation rules',
    query: 'validation rules required email',
    matchType: 'fuzzy',
    category: 'functional',
    expectedDocs: ['php-request-validation.php', 'php-form-request.php'],
  },
  {
    id: 'php-008',
    name: 'Find route definitions',
    query: 'Route get post controller',
    matchType: 'hybrid',
    category: 'functional',
    expectedDocs: ['php-routes-web.php', 'php-routes-api.php'],
  },
  {
    id: 'php-009',
    name: 'Find trait definitions',
    query: 'trait HasAttributes with methods',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['php-trait-helpers.php'],
  },
  {
    id: 'php-010',
    name: 'Find exception handling',
    query: 'Exception render method response',
    matchType: 'semantic',
    category: 'functional',
    expectedDocs: ['php-exception-handler.php'],
  },
];

/**
 * JavaScript-specific test queries
 * These queries target JavaScript code constructs
 */
export const JAVASCRIPT_QUERIES: TestCase[] = [
  {
    id: 'js-001',
    name: 'Find function declarations',
    query: 'function calculateTotal with parameters',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['js-utils.js', 'js-calculations.js'],
  },
  {
    id: 'js-002',
    name: 'Find arrow functions',
    query: 'const handler with arrow function',
    matchType: 'fuzzy',
    category: 'functional',
    expectedDocs: ['js-event-handlers.js', 'js-utils.js'],
  },
  {
    id: 'js-003',
    name: 'Find Promise usage',
    query: 'Promise resolve reject async',
    matchType: 'semantic',
    category: 'functional',
    expectedDocs: ['js-async.js', 'js-api.js'],
  },
  {
    id: 'js-004',
    name: 'Find destructuring patterns',
    query: 'destructure object properties',
    matchType: 'semantic',
    category: 'functional',
    expectedDocs: ['js-patterns.js', 'js-utils.js'],
  },
  {
    id: 'js-005',
    name: 'Find class with constructor',
    query: 'class with constructor initialization',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['js-class-component.js', 'js-models.js'],
  },
  {
    id: 'js-006',
    name: 'Find module imports',
    query: 'import from lodash or utils',
    matchType: 'fuzzy',
    category: 'functional',
    expectedDocs: ['js-main.js', 'js-index.js'],
  },
  {
    id: 'js-007',
    name: 'Find event listeners',
    query: 'addEventListener click submit',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['js-dom.js', 'js-events.js'],
  },
  {
    id: 'js-008',
    name: 'Find array methods',
    query: 'map filter reduce array methods',
    matchType: 'semantic',
    category: 'functional',
    expectedDocs: ['js-array-utils.js', 'js-helpers.js'],
  },
  {
    id: 'js-009',
    name: 'Find fetch API usage',
    query: 'fetch API with headers and JSON',
    matchType: 'hybrid',
    category: 'functional',
    expectedDocs: ['js-api-client.js', 'js-fetch.js'],
  },
  {
    id: 'js-010',
    name: 'Find localStorage usage',
    query: 'localStorage getItem setItem',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['js-storage.js', 'js-cache.js'],
  },
];

/**
 * Vue SFC-specific test queries
 * These queries target Vue Single File Components
 */
export const VUE_QUERIES: TestCase[] = [
  {
    id: 'vue-001',
    name: 'Find Vue component definition',
    query: 'Vue component with data and methods',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['vue-user-list.vue', 'vue-app.vue'],
  },
  {
    id: 'vue-002',
    name: 'Find computed properties',
    query: 'computed properties with getters',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['vue-dashboard.vue', 'vue-data-table.vue'],
  },
  {
    id: 'vue-003',
    name: 'Find watchers',
    query: 'watch property change handler',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['vue-form.vue', 'vue-search.vue'],
  },
  {
    id: 'vue-004',
    name: 'Find template refs',
    query: 'ref attribute in template',
    matchType: 'fuzzy',
    category: 'functional',
    expectedDocs: ['vue-modal.vue', 'vue-input.vue'],
  },
  {
    id: 'vue-005',
    name: 'Find component props',
    query: 'props definition with types',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['vue-button.vue', 'vue-card.vue'],
  },
  {
    id: 'vue-006',
    name: 'Find emit events',
    query: '$emit custom event from component',
    matchType: 'hybrid',
    category: 'functional',
    expectedDocs: ['vue-form-input.vue', 'vue-button.vue'],
  },
  {
    id: 'vue-007',
    name: 'Find lifecycle hooks',
    query: 'mounted created destroyed lifecycle',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['vue-page.vue', 'vue-component.vue'],
  },
  {
    id: 'vue-008',
    name: 'Find slot usage',
    query: 'slot with default content',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['vue-layout.vue', 'vue-container.vue'],
  },
  {
    id: 'vue-009',
    name: 'Find scoped styles',
    query: 'style scoped CSS',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['vue-component.vue', 'vue-widget.vue'],
  },
  {
    id: 'vue-010',
    name: 'Find Vue Router usage',
    query: 'router-link or $router push',
    matchType: 'hybrid',
    category: 'functional',
    expectedDocs: ['vue-navigation.vue', 'vue-app.vue'],
  },
];

/**
 * Markdown documentation test queries
 * These queries target documentation content
 */
export const MARKDOWN_QUERIES: TestCase[] = [
  {
    id: 'md-001',
    name: 'Find installation instructions',
    query: 'npm install package setup',
    matchType: 'hybrid',
    category: 'functional',
    expectedDocs: ['md-readme.md', 'md-installation.md'],
  },
  {
    id: 'md-002',
    name: 'Find API documentation',
    query: 'API endpoint parameters response',
    matchType: 'semantic',
    category: 'functional',
    expectedDocs: ['md-api-docs.md', 'md-reference.md'],
  },
  {
    id: 'md-003',
    name: 'Find configuration guide',
    query: 'configuration options settings',
    matchType: 'semantic',
    category: 'functional',
    expectedDocs: ['md-config.md', 'md-setup.md'],
  },
  {
    id: 'md-004',
    name: 'Find usage examples',
    query: 'example code usage tutorial',
    matchType: 'semantic',
    category: 'functional',
    expectedDocs: ['md-examples.md', 'md-guide.md'],
  },
  {
    id: 'md-005',
    name: 'Find troubleshooting info',
    query: 'troubleshooting error fix',
    matchType: 'fuzzy',
    category: 'functional',
    expectedDocs: ['md-troubleshooting.md', 'md-faq.md'],
  },
  {
    id: 'md-006',
    name: 'Find changelog',
    query: 'changelog version release notes',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['md-changelog.md'],
  },
  {
    id: 'md-007',
    name: 'Find contributing guidelines',
    query: 'contributing pull request guidelines',
    matchType: 'semantic',
    category: 'functional',
    expectedDocs: ['md-contributing.md'],
  },
  {
    id: 'md-008',
    name: 'Find license information',
    query: 'MIT license copyright',
    matchType: 'exact',
    category: 'functional',
    expectedDocs: ['md-license.md'],
  },
];

/**
 * Performance test queries - used for load testing
 */
export const PERFORMANCE_QUERIES: TestCase[] = [
  {
    id: 'perf-001',
    name: 'Simple keyword search',
    query: 'function',
    matchType: 'exact',
    category: 'performance',
    maxDurationMs: 50,
  },
  {
    id: 'perf-002',
    name: 'Complex semantic search',
    query: 'implementation of observer pattern with event handling',
    matchType: 'semantic',
    category: 'performance',
    maxDurationMs: 100,
  },
  {
    id: 'perf-003',
    name: 'Long query search',
    query: 'how to implement authentication and authorization with JWT tokens and middleware',
    matchType: 'hybrid',
    category: 'performance',
    maxDurationMs: 150,
  },
  {
    id: 'perf-004',
    name: 'Multi-term search',
    query: 'database query optimization index performance',
    matchType: 'hybrid',
    category: 'performance',
    maxDurationMs: 100,
  },
];

/**
 * Edge case test queries - boundary conditions and error handling
 */
export const EDGE_CASE_QUERIES: TestCase[] = [
  {
    id: 'edge-001',
    name: 'Empty query',
    query: '',
    matchType: 'exact',
    category: 'edge-case',
    expectError: true,
    expectedErrorType: 'EmptyQueryError',
  },
  {
    id: 'edge-002',
    name: 'Whitespace only query',
    query: '     ',
    matchType: 'exact',
    category: 'edge-case',
    expectedDocs: [],
  },
  {
    id: 'edge-003',
    name: 'Very long query',
    query: 'a'.repeat(1000),
    matchType: 'fuzzy',
    category: 'edge-case',
    expectedDocs: [],
  },
  {
    id: 'edge-004',
    name: 'Special characters query',
    query: '!@#$%^&*()_+{}[]|:"<>?',
    matchType: 'fuzzy',
    category: 'edge-case',
    expectedDocs: [],
  },
  {
    id: 'edge-005',
    name: 'Non-existent topic',
    query: 'xyzabc123nonexistent query should not match',
    matchType: 'fuzzy',
    category: 'edge-case',
    expectedDocs: [],
  },
  {
    id: 'edge-006',
    name: 'Single character query',
    query: 'x',
    matchType: 'exact',
    category: 'edge-case',
  },
  {
    id: 'edge-007',
    name: 'Unicode query',
    query: 'функция класс интерфейс',
    matchType: 'semantic',
    category: 'edge-case',
  },
  {
    id: 'edge-008',
    name: 'Code snippet query',
    query: 'const x = () => {}',
    matchType: 'exact',
    category: 'edge-case',
  },
];

/**
 * Semantic similarity test pairs
 * Used to test semantic understanding of queries
 */
export const SEMANTIC_SIMILARITY_PAIRS: Array<{
  query1: string;
  query2: string;
  expectedOverlap: number;
  description: string;
}> = [
  {
    query1: 'how to create a user in database',
    query2: 'database insert user record',
    expectedOverlap: 0.7,
    description: 'Similar intent, different phrasing',
  },
  {
    query1: 'authentication middleware',
    query2: 'login verification handler',
    expectedOverlap: 0.6,
    description: 'Related concepts',
  },
  {
    query1: 'optimize query performance',
    query2: 'database indexing strategies',
    expectedOverlap: 0.5,
    description: 'Broader topic relationship',
  },
  {
    query1: 'Vue component lifecycle',
    query2: 'React component hooks',
    expectedOverlap: 0.3,
    description: 'Similar concept, different frameworks',
  },
];

/**
 * Query relevance mappings for accuracy testing
 */
export const QUERY_RELEVANCE_MAPPINGS: QueryRelevance[] = [
  {
    queryId: 'ts-001',
    relevantDocs: [
      {docId: 'ts-interface-user.ts', relevance: 1.0},
      {docId: 'ts-types-user.ts', relevance: 0.9},
      {docId: 'ts-models.ts', relevance: 0.6},
    ],
    explanation: 'Interface definitions for User type',
  },
  {
    queryId: 'php-001',
    relevantDocs: [
      {docId: 'php-user-controller.php', relevance: 1.0},
      {docId: 'php-base-controller.php', relevance: 0.7},
    ],
    explanation: 'User controller class definition',
  },
  {
    queryId: 'js-001',
    relevantDocs: [
      {docId: 'js-utils.js', relevance: 1.0},
      {docId: 'js-calculations.js', relevance: 0.9},
    ],
    explanation: 'Function definitions',
  },
];

/**
 * Get all test queries combined
 * @returns Array of all test cases
 */
export function getAllQueries(): TestCase[] {
  return [
    ...TYPESCRIPT_QUERIES,
    ...PHP_QUERIES,
    ...JAVASCRIPT_QUERIES,
    ...VUE_QUERIES,
    ...MARKDOWN_QUERIES,
    ...PERFORMANCE_QUERIES,
    ...EDGE_CASE_QUERIES,
  ];
}

/**
 * Get queries by file type
 * @param type - File type filter
 * @returns Filtered test cases
 */
export function getQueriesByType(type: 'typescript' | 'php' | 'javascript' | 'vue' | 'markdown'): TestCase[] {
  const map: Record<string, TestCase[]> = {
    typescript: TYPESCRIPT_QUERIES,
    php: PHP_QUERIES,
    javascript: JAVASCRIPT_QUERIES,
    vue: VUE_QUERIES,
    markdown: MARKDOWN_QUERIES,
  };
  return map[type] ?? [];
}

/**
 * Get queries by match type
 * @param matchType - Match type filter
 * @returns Filtered test cases
 */
export function getQueriesByMatchType(matchType: MatchType): TestCase[] {
  return getAllQueries().filter(q => q.matchType === matchType);
}

/**
 * Get queries by category
 * @param category - Category filter
 * @returns Filtered test cases
 */
export function getQueriesByCategory(
  category: 'functional' | 'performance' | 'edge-case' | 'accuracy'
): TestCase[] {
  return getAllQueries().filter(q => q.category === category);
}

/**
 * Export all query collections
 */
export const ALL_QUERIES = {
  typescript: TYPESCRIPT_QUERIES,
  php: PHP_QUERIES,
  javascript: JAVASCRIPT_QUERIES,
  vue: VUE_QUERIES,
  markdown: MARKDOWN_QUERIES,
  performance: PERFORMANCE_QUERIES,
  edgeCase: EDGE_CASE_QUERIES,
};

export default ALL_QUERIES;
