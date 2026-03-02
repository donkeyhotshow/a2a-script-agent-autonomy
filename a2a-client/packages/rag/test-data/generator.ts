/**
 * @fileoverview Test data generator for RAG testing infrastructure
 * @module @a2a/rag/test-data/generator
 * 
 * Generates simulated code files for testing RAG indexing and search:
 * - TypeScript (classes, interfaces, functions, generics)
 * - PHP (classes, methods, Laravel patterns)
 * - JavaScript (functions, classes, async code)
 * - Vue SFC (components with template, script, style)
 * - Markdown (documentation)
 * 
 * @example
 * ```typescript
 * const generator = new TestDataGenerator({ outputDir: './test-files' });
 * await generator.generateAll({ filesPerType: 10 });
 * ```
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type {
  GeneratorOptions,
  TestFile,
  TestDataset,
  FileType,
  CodeConstruct,
  VueComponent,
} from '../tests/types.js';
import {getTestPaths} from '../tests/config.js';

/**
 * Seeded random number generator for reproducible test data
 */
class SeededRandom {
  private seed: number;

  constructor(seed = 12345) {
    this.seed = seed;
  }

  /**
   * Generate next random number between 0 and 1
   */
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  /**
   * Generate random integer in range [min, max]
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Pick random element from array
   */
  pick<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length - 1)];
  }

  /**
   * Generate random boolean with given probability
   */
  bool(probability = 0.5): boolean {
    return this.next() < probability;
  }
}

/**
 * Test data generator for RAG testing
 */
export class TestDataGenerator {
  private options: Required<GeneratorOptions>;
  private rng: SeededRandom;
  private files: TestFile[] = [];

  /**
   * TypeScript code templates
   */
  private readonly tsTemplates = {
    interfaces: [
      {
        name: 'User',
        content: `export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}`,
      },
      {
        name: 'Product',
        content: `export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
}`,
      },
      {
        name: 'ApiResponse',
        content: `export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  success: boolean;
}`,
      },
      {
        name: 'PaginatedResult',
        content: `export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}`,
      },
    ],

    classes: [
      {
        name: 'UserRepository',
        content: `export class UserRepository<T> extends BaseRepository<T> {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    super(db);
    this.db = db;
  }

  async findByEmail(email: string): Promise<T | null> {
    return this.db.query('SELECT * FROM users WHERE email = ?', [email]);
  }

  async create(data: Omit<T, 'id'>): Promise<T> {
    const result = await this.db.insert('users', data);
    return { ...data, id: result.insertId } as T;
  }
}`,
      },
      {
        name: 'ApiClient',
        content: `export class ApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      ...(apiKey && { 'Authorization': \`Bearer \${apiKey}\` })
    };
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
      method: 'GET',
      headers: this.headers
    });
    return response.json();
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data)
    });
    return response.json();
  }
}`,
      },
      {
        name: 'EventEmitter',
        content: `export class EventEmitter<T extends Record<string, unknown>> {
  private listeners: Map<keyof T, Array<(data: T[keyof T]) => void>> = new Map();

  on<K extends keyof T>(event: K, handler: (data: T[K]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  off<K extends keyof T>(event: K, handler: (data: T[K]) => void): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
}`,
      },
    ],

    functions: [
      {
        name: 'debounce',
        content: `export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}`,
      },
      {
        name: 'formatDate',
        content: `export function formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day);
}`,
      },
      {
        name: 'deepClone',
        content: `export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
}`,
      },
    ],

    enums: [
      {
        name: 'Status',
        content: `export enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  ARCHIVED = 'archived'
}`,
      },
      {
        name: 'HttpMethod',
        content: `export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  OPTIONS = 'OPTIONS'
}`,
      },
    ],

    types: [
      {
        name: 'Nullable',
        content: `export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;`,
      },
      {
        name: 'DeepPartial',
        content: `export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};`,
      },
    ],
  };

  /**
   * PHP code templates
   */
  private readonly phpTemplates = {
    classes: [
      {
        name: 'UserController',
        content: `<?php

namespace App\\Http\\Controllers;

use App\\Models\\User;
use Illuminate\\Http\\Request;
use Illuminate\\Http\\JsonResponse;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::paginate(20);
        return response()->json($users);
    }

    public function show(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        return response()->json($user);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
        ]);

        $user = User::create($validated);
        return response()->json($user, 201);
    }
}`,
      },
      {
        name: 'ProductService',
        content: `<?php

namespace App\\Services;

use App\\Models\\Product;
use App\\Repositories\\ProductRepository;
use Illuminate\\Support\\Collection;

class ProductService
{
    protected ProductRepository $repository;

    public function __construct(ProductRepository $repository)
    {
        $this->repository = $repository;
    }

    public function getFeaturedProducts(int $limit = 10): Collection
    {
        return $this->repository
            ->where('featured', true)
            ->where('in_stock', true)
            ->limit($limit)
            ->get();
    }

    public function searchProducts(string $query): Collection
    {
        return $this->repository
            ->where('name', 'LIKE', "%{$query}%")
            ->orWhere('description', 'LIKE', "%{$query}%")
            ->get();
    }
}`,
      },
    ],

    models: [
      {
        name: 'User',
        content: `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Relations\\HasMany;

class User extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
        'password',
        'status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }
}`,
      },
    ],

    middleware: [
      {
        name: 'AuthMiddleware',
        content: `<?php

namespace App\\Http\\Middleware;

use Closure;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Auth;
use Symfony\\Component\\HttpFoundation\\Response;

class AuthMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!Auth::check()) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 401);
        }

        return $next($request);
    }
}`,
      },
    ],
  };

  /**
   * JavaScript code templates
   */
  private readonly jsTemplates = {
    functions: [
      {
        name: 'calculateTotal',
        content: `function calculateTotal(items, taxRate = 0.08) {
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  const tax = subtotal * taxRate;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round((subtotal + tax) * 100) / 100
  };
}`,
      },
      {
        name: 'formatCurrency',
        content: `function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(amount);
}`,
      },
      {
        name: 'fetchWithRetry',
        content: `async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }
      
      return await response.json();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}`,
      },
    ],

    classes: [
      {
        name: 'EventBus',
        content: `class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
  }

  emit(event, data) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in event handler:', error);
        }
      });
    }
  }

  off(event, handler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
}`,
      },
    ],
  };

  /**
   * Vue component templates
   */
  private readonly vueTemplates: VueComponent[] = [
    {
      name: 'UserList',
      template: `<template>
  <div class="user-list">
    <h2>Users</h2>
    <ul>
      <li v-for="user in users" :key="user.id">
        {{ user.name }} - {{ user.email }}
      </li>
    </ul>
    <button @click="loadMore">Load More</button>
  </div>
</template>`,
      script: `<script>
export default {
  name: 'UserList',
  data() {
    return {
      users: [],
      page: 1,
      loading: false
    };
  },
  async mounted() {
    await this.fetchUsers();
  },
  methods: {
    async fetchUsers() {
      this.loading = true;
      try {
        const response = await fetch(\`/api/users?page=\${this.page}\`);
        const data = await response.json();
        this.users = [...this.users, ...data.items];
      } finally {
        this.loading = false;
      }
    },
    loadMore() {
      this.page++;
      this.fetchUsers();
    }
  }
};
</script>`,
      style: `<style scoped>
.user-list {
  padding: 20px;
}
.user-list ul {
  list-style: none;
  padding: 0;
}
.user-list li {
  padding: 10px;
  border-bottom: 1px solid #eee;
}
</style>`,
      content: '', // Will be assembled
    },
    {
      name: 'SearchForm',
      template: `<template>
  <form @submit.prevent="handleSubmit" class="search-form">
    <input
      v-model="query"
      type="text"
      placeholder="Search..."
      @input="debouncedSearch"
    />
    <button type="submit">Search</button>
  </form>
</template>`,
      script: `<script>
export default {
  name: 'SearchForm',
  props: {
    initialQuery: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      query: this.initialQuery,
      searchTimeout: null
    };
  },
  watch: {
    query(newVal) {
      this.$emit('update:query', newVal);
    }
  },
  methods: {
    handleSubmit() {
      this.$emit('search', this.query);
    },
    debouncedSearch() {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        if (this.query.length >= 3) {
          this.$emit('search', this.query);
        }
      }, 300);
    }
  }
};
</script>`,
      style: `<style scoped>
.search-form {
  display: flex;
  gap: 10px;
}
.search-form input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.search-form button {
  padding: 8px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>`,
      content: '',
    },
  ];

  /**
   * Markdown documentation templates
   */
  private readonly markdownTemplates = [
    {
      name: 'readme',
      title: 'README',
      content: `# Project Name

## Installation

\`\`\`bash
npm install
npm run build
\`\`\`

## Usage

\`\`\`typescript
import { createClient } from './client';

const client = createClient({
  apiKey: 'your-api-key'
});

const result = await client.query('example');
\`\`\`

## API Reference

### Methods

- \`createClient(config)\` - Create a new client instance
- \`client.query(params)\` - Execute a query
- \`client.close()\` - Close the connection

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| apiKey | string | - | Your API key |
| timeout | number | 5000 | Request timeout |
| retries | number | 3 | Number of retries |

## License

MIT`,
    },
    {
      name: 'api-docs',
      title: 'API Documentation',
      content: `# API Documentation

## Authentication

All API requests require an authentication token in the header:

\`\`\`
Authorization: Bearer YOUR_TOKEN
\`\`\`

## Endpoints

### GET /api/users

Retrieve a list of users.

**Parameters:**
- \`page\` (optional) - Page number
- \`per_page\` (optional) - Items per page

**Response:**
\`\`\`json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1
  }
}
\`\`\`

### POST /api/users

Create a new user.

**Request Body:**
\`\`\`json
{
  "name": "John Doe",
  "email": "john@example.com"
}
\`\`\`

## Error Handling

The API uses standard HTTP status codes:
- 200 - Success
- 400 - Bad Request
- 401 - Unauthorized
- 404 - Not Found
- 500 - Server Error`,
    },
    {
      name: 'contributing',
      title: 'Contributing Guide',
      content: `# Contributing

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies
4. Create a branch

## Development Workflow

\`\`\`bash
# Install dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint

# Build
npm run build
\`\`\`

## Pull Request Process

1. Update the README with details of changes
2. Update relevant documentation
3. Ensure all tests pass
4. Request review from maintainers

## Code Style

- Use TypeScript for new code
- Follow ESLint rules
- Write tests for new features
- Document public APIs`,
    },
  ];

  constructor(options: GeneratorOptions) {
    this.options = {
      outputDir: options.outputDir,
      seed: options.seed ?? Date.now(),
      fileTypes: options.fileTypes ?? ['typescript', 'javascript', 'php', 'vue', 'markdown'],
      filesPerType: options.filesPerType ?? 10,
      avgLinesPerFile: options.avgLinesPerFile ?? 100,
      complexity: options.complexity ?? 3,
    };
    this.rng = new SeededRandom(this.options.seed);
  }

  /**
   * Generate all test data
   * @returns Generated dataset
   */
  async generateAll(): Promise<TestDataset> {
    this.files = [];
    const startTime = Date.now();

    console.log(`🎲 Generating test data with seed: ${this.options.seed}`);

    for (const type of this.options.fileTypes) {
      console.log(`  📄 Generating ${this.options.filesPerType} ${type} files...`);
      await this.generateFilesByType(type, this.options.filesPerType);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Generated ${this.files.length} files in ${duration}ms`);

    return {
      files: this.files,
      queries: [], // Will be populated separately
      edgeCases: [], // Will be populated separately
      chunks: [], // Will be populated by indexer
      metadata: {
        generatedAt: new Date().toISOString(),
        fileCount: this.files.length,
        queryCount: 0,
        chunkCount: 0,
        edgeCaseCount: 0,
      },
    };
  }

  /**
   * Generate files of a specific type
   */
  private async generateFilesByType(type: FileType, count: number): Promise<void> {
    const generators: Record<FileType, (index: number) => Promise<TestFile>> = {
      typescript: (i) => this.generateTypeScriptFile(i),
      php: (i) => this.generatePhpFile(i),
      javascript: (i) => this.generateJavaScriptFile(i),
      vue: (i) => this.generateVueFile(i),
      markdown: (i) => this.generateMarkdownFile(i),
    };

    for (let i = 0; i < count; i++) {
      const file = await generators[type](i);
      this.files.push(file);
      await this.writeFile(file);
    }
  }

  /**
   * Generate a TypeScript file
   */
  private async generateTypeScriptFile(index: number): Promise<TestFile> {
    const template = this.rng.pick([
      ...this.tsTemplates.interfaces,
      ...this.tsTemplates.classes,
      ...this.tsTemplates.functions,
      ...this.tsTemplates.enums,
      ...this.tsTemplates.types,
    ]);

    const fileName = `ts-${template.name.toLowerCase()}-${index}.ts`;
    const content = this.assembleTypeScriptFile(template.content);

    return this.createTestFile(fileName, 'typescript', content, index);
  }

  /**
   * Assemble TypeScript file content with imports and exports
   */
  private assembleTypeScriptFile(mainContent: string): string {
    const imports = [
      "import { BaseRepository } from './base-repository';",
      "import type { DatabaseConnection } from './types';",
      "import { EventEmitter } from 'events';",
    ].slice(0, this.rng.nextInt(0, 2));

    const lines = [
      ...imports,
      '',
      '/**',
      ' * @fileoverview Auto-generated test file',
      ' * @generated',
      ' */',
      '',
      mainContent,
      '',
    ];

    return lines.join('\n');
  }

  /**
   * Generate a PHP file
   */
  private async generatePhpFile(index: number): Promise<TestFile> {
    const template = this.rng.pick([
      ...this.phpTemplates.classes,
      ...this.phpTemplates.models,
      ...this.phpTemplates.middleware,
    ]);

    const fileName = `php-${template.name.toLowerCase()}-${index}.php`;
    
    return this.createTestFile(fileName, 'php', template.content, index);
  }

  /**
   * Generate a JavaScript file
   */
  private async generateJavaScriptFile(index: number): Promise<TestFile> {
    const template = this.rng.pick([
      ...this.jsTemplates.functions,
      ...this.jsTemplates.classes,
    ]);

    const fileName = `js-${template.name.toLowerCase()}-${index}.js`;
    const content = this.assembleJavaScriptFile(template.content);

    return this.createTestFile(fileName, 'javascript', content, index);
  }

  /**
   * Assemble JavaScript file content
   */
  private assembleJavaScriptFile(mainContent: string): string {
    const imports = [
      "const { utils } = require('./utils');",
      "const config = require('./config');",
    ].slice(0, this.rng.nextInt(0, 1));

    const lines = [
      ...imports,
      '',
      '/**',
      ' * Auto-generated test file',
      ' */',
      '',
      mainContent,
      '',
      "module.exports = {",
      "  // exports would go here",
      "};",
      '',
    ];

    return lines.join('\n');
  }

  /**
   * Generate a Vue SFC file
   */
  private async generateVueFile(index: number): Promise<TestFile> {
    const template = this.rng.pick(this.vueTemplates);
    
    const content = [
      template.template,
      '',
      template.script,
      '',
      template.style,
    ].join('\n');

    const fileName = `vue-${template.name.toLowerCase()}-${index}.vue`;

    return this.createTestFile(fileName, 'vue', content, index);
  }

  /**
   * Generate a Markdown file
   */
  private async generateMarkdownFile(index: number): Promise<TestFile> {
    const template = this.rng.pick(this.markdownTemplates);
    const fileName = `md-${template.name}-${index}.md`;

    return this.createTestFile(fileName, 'markdown', template.content, index);
  }

  /**
   * Create a TestFile object
   */
  private createTestFile(
    fileName: string,
    type: FileType,
    content: string,
    index: number
  ): TestFile {
    const lines = content.split('\n');
    
    return {
      id: `${type}-${index}`,
      path: path.join(type, fileName),
      type,
      content,
      lineCount: lines.length,
      hash: this.computeHash(content),
      metadata: {
        createdAt: new Date().toISOString(),
        tags: [type, `complexity-${this.options.complexity}`, `seed-${this.options.seed}`],
        complexity: this.options.complexity,
        author: 'test-generator',
      },
    };
  }

  /**
   * Write file to disk
   */
  private async writeFile(file: TestFile): Promise<void> {
    const fullPath = path.join(this.options.outputDir, file.path);
    await fs.mkdir(path.dirname(fullPath), {recursive: true});
    await fs.writeFile(fullPath, file.content, 'utf-8');
  }

  /**
   * Compute MD5 hash of content
   */
  private computeHash(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 12);
  }

  /**
   * Clean up generated files
   */
  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.options.outputDir, {recursive: true, force: true});
      this.files = [];
      console.log('🧹 Cleaned up generated files');
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Get generated files
   */
  getFiles(): TestFile[] {
    return [...this.files];
  }

  /**
   * Get files by type
   */
  getFilesByType(type: FileType): TestFile[] {
    return this.files.filter(f => f.type === type);
  }
}

/**
 * Quick generator function for simple use cases
 * @param options - Generator options
 * @returns Generated dataset
 * @example
 * ```typescript
 * const dataset = await generateTestData({
 *   outputDir: './test-files',
 *   filesPerType: 5
 * });
 * ```
 */
export async function generateTestData(options: GeneratorOptions): Promise<TestDataset> {
  const generator = new TestDataGenerator(options);
  return generator.generateAll();
}

/**
 * Generate test data using configuration preset
 * @param preset - Configuration preset
 * @returns Generated dataset
 */
export async function generateTestDataWithPreset(
  preset: 'minimal' | 'standard' | 'comprehensive'
): Promise<TestDataset> {
  const presets: Record<string, Partial<GeneratorOptions>> = {
    minimal: {
      filesPerType: 3,
      avgLinesPerFile: 50,
      complexity: 2,
    },
    standard: {
      filesPerType: 10,
      avgLinesPerFile: 100,
      complexity: 3,
    },
    comprehensive: {
      filesPerType: 25,
      avgLinesPerFile: 200,
      complexity: 4,
    },
  };

  const options = presets[preset] ?? presets.standard;
  const outputDir = getTestPaths().outputDir;

  const generator = new TestDataGenerator({
    outputDir,
    ...options,
  });

  return generator.generateAll();
}

export default TestDataGenerator;
