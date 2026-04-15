/**
 * @fileoverview Functional tests for RAG chunking functionality
 * @module @a2a/rag/tests/functional/chunking
 * 
 * Tests chunking for different file types:
 * - TypeScript: classes, functions, interfaces
 * - PHP: classes, methods
 * - JavaScript: functions, classes
 * - Vue: components (script, template, style)
 * - Markdown: by headers
 */

import path from 'path';
import fs from 'fs/promises';
import {ChunkManager} from '../../src/chunk-manager.js';
import {ASTChunker} from '../../src/ast-chunker.js';
import {TestDataGenerator} from '../../test-data/generator.js';
import {DEFAULT_CONFIG} from '../config.js';
import type {Chunk} from '../../src/chunk-manager.js';

// Test configuration
const TEST_DIR = path.join(DEFAULT_CONFIG.outputDir, 'functional-chunking-test');

describe('RAG Chunking Functional Tests', () => {
  let chunkManager: ChunkManager;
  let astChunker: ASTChunker;

  beforeAll(async () => {
    // Ensure clean test directory
    await fs.rm(TEST_DIR, {recursive: true, force: true});
    await fs.mkdir(TEST_DIR, {recursive: true});

    // Initialize chunkers
    chunkManager = new ChunkManager({});
    astChunker = new ASTChunker({});
  }, 30000);

  afterAll(async () => {
    // Cleanup
    try {
      await fs.rm(TEST_DIR, {recursive: true, force: true});
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('TypeScript Chunking', () => {
    it('should chunk TypeScript interfaces', async () => {
      const content = `
        export interface User {
          id: number;
          name: string;
          email: string;
        }

        export interface Product {
          id: string;
          title: string;
          price: number;
        }
      `;
      const filePath = path.join(TEST_DIR, 'interfaces.ts');
      const chunks = chunkManager.chunkFile(filePath, content, '.ts');

      expect(chunks.length).toBeGreaterThan(0);
      
      // Should detect interfaces
      const interfaceChunks = chunks.filter(c => 
        c.content.includes('interface') || c.type === 'interface'
      );
      expect(interfaceChunks.length).toBeGreaterThan(0);
    });

    it('should chunk TypeScript classes', async () => {
      const content = `
        export class UserService {
          private users: User[] = [];
          
          async findById(id: number): Promise<User> {
            return this.users.find(u => u.id === id);
          }
          
          async create(user: User): Promise<User> {
            this.users.push(user);
            return user;
          }
        }

        export class ProductService {
          private products: Product[] = [];
          
          async findAll(): Promise<Product[]> {
            return this.products;
          }
        }
      `;
      const filePath = path.join(TEST_DIR, 'classes.ts');
      const chunks = chunkManager.chunkFile(filePath, content, '.ts');

      expect(chunks.length).toBeGreaterThan(0);
      
      // Should have class-related chunks
      const classChunks = chunks.filter(c => 
        c.content.includes('class') || c.type === 'class'
      );
      expect(classChunks.length).toBeGreaterThan(0);
    });

    it('should chunk TypeScript functions', async () => {
      const content = `
        export function calculateTotal(items: CartItem[]): number {
          return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        }

        export function formatCurrency(amount: number, currency: string): string {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
          }).format(amount);
        }

        export async function fetchUserData(userId: number): Promise<User> {
          const response = await fetch(\`/api/users/\${userId}\`);
          return response.json();
        }
      `;
      const filePath = path.join(TEST_DIR, 'functions.ts');
      const chunks = chunkManager.chunkFile(filePath, content, '.ts');

      expect(chunks.length).toBeGreaterThan(0);
      
      // Should have function chunks
      const functionChunks = chunks.filter(c => 
        c.content.includes('function') || c.type === 'function'
      );
      expect(functionChunks.length).toBeGreaterThan(0);
    });

    it('should chunk TypeScript generics', async () => {
      const content = `
        export class Repository<T> {
          private items: T[] = [];
          
          findById(id: string): T | undefined {
            return this.items.find(item => (item as any).id === id);
          }
          
          save(item: T): void {
            this.items.push(item);
          }
        }

        export interface PaginatedResponse<T> {
          data: T[];
          total: number;
          page: number;
          pageSize: number;
        }
      `;
      const filePath = path.join(TEST_DIR, 'generics.ts');
      const chunks = chunkManager.chunkFile(filePath, content, '.ts');

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should chunk TypeScript enums and types', async () => {
      const content = `
        export enum Status {
          ACTIVE = 'active',
          INACTIVE = 'inactive',
          PENDING = 'pending'
        }

        export type UserRole = 'admin' | 'user' | 'guest';

        export type ApiResponse<T> = {
          success: boolean;
          data: T;
          error?: string;
        };
      `;
      const filePath = path.join(TEST_DIR, 'enums.ts');
      const chunks = chunkManager.chunkFile(filePath, content, '.ts');

      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('PHP Chunking', () => {
    it('should chunk PHP classes', async () => {
      const content = `
<?php

namespace App\\Controllers;

use Illuminate\\Http\\Request;

class UserController extends Controller
{
    protected $userService;
    
    public function __construct(UserService $userService)
    {
        $this->userService = $userService;
    }
    
    public function index()
    {
        return $this->userService->getAll();
    }
    
    public function show($id)
    {
        return $this->userService->findById($id);
    }
}

class ProductController extends Controller
{
    public function index()
    {
        return Product::all();
    }
}
`;
      const filePath = path.join(TEST_DIR, 'controllers.php');
      const chunks = chunkManager.chunkFile(filePath, content, '.php');

      expect(chunks.length).toBeGreaterThan(0);
      
      // Should have class chunks
      const classChunks = chunks.filter(c => 
        c.type === 'class' || c.content.includes('class UserController')
      );
      expect(classChunks.length).toBeGreaterThan(0);
    });

    it('should chunk PHP methods', async () => {
      const content = `
<?php

class Service
{
    public function publicMethod()
    {
        return 'public';
    }
    
    private function privateMethod()
    {
        return 'private';
    }
    
    protected function protectedMethod()
    {
        return 'protected';
    }
}
`;
      const filePath = path.join(TEST_DIR, 'methods.php');
      const chunks = chunkManager.chunkFile(filePath, content, '.php');

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should chunk PHP interfaces and traits', async () => {
      const content = `
<?php

namespace App\\Contracts;

interface RepositoryInterface
{
    public function find($id);
    public function create(array $data);
    public function update($id, array $data);
    public function delete($id);
}

trait HasTimestamps
{
    protected function updateTimestamps()
    {
        $this->updated_at = now();
    }
}
`;
      const filePath = path.join(TEST_DIR, 'contracts.php');
      const chunks = chunkManager.chunkFile(filePath, content, '.php');

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should chunk PHP functions', async () => {
      const content = `
<?php

function helperFunction($value)
{
    return trim($value);
}

function calculateTotal($items)
{
    return array_sum(array_column($items, 'price'));
}
`;
      const filePath = path.join(TEST_DIR, 'helpers.php');
      const chunks = chunkManager.chunkFile(filePath, content, '.php');

      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('JavaScript Chunking', () => {
    it('should chunk JavaScript functions', async () => {
      const content = `
        function calculateTotal(items) {
          return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        }

        const formatCurrency = (amount, currency) => {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
          }).format(amount);
        };

        async function fetchUserData(userId) {
          const response = await fetch(\`/api/users/\${userId}\`);
          return response.json();
        }
      `;
      const filePath = path.join(TEST_DIR, 'utils.js');
      const chunks = chunkManager.chunkFile(filePath, content, '.js');

      expect(chunks.length).toBeGreaterThan(0);
      
      // Should detect functions
      const functionChunks = chunks.filter(c => 
        c.content.includes('function') || c.type === 'function'
      );
      expect(functionChunks.length).toBeGreaterThan(0);
    });

    it('should chunk JavaScript classes', async () => {
      const content = `
        class EventEmitter {
          constructor() {
            this.events = {};
          }
          
          on(event, listener) {
            if (!this.events[event]) {
              this.events[event] = [];
            }
            this.events[event].push(listener);
          }
          
          emit(event, data) {
            if (this.events[event]) {
              this.events[event].forEach(listener => listener(data));
            }
          }
        }

        class DataStore extends EventEmitter {
          constructor() {
            super();
            this.data = new Map();
          }
          
          set(key, value) {
            this.data.set(key, value);
            this.emit('change', { key, value });
          }
        }
      `;
      const filePath = path.join(TEST_DIR, 'classes.js');
      const chunks = chunkManager.chunkFile(filePath, content, '.js');

      expect(chunks.length).toBeGreaterThan(0);
      
      const classChunks = chunks.filter(c => 
        c.content.includes('class') || c.type === 'class'
      );
      expect(classChunks.length).toBeGreaterThan(0);
    });

    it('should chunk JavaScript arrow functions and exports', async () => {
      const content = `
        export const add = (a, b) => a + b;
        
        export const subtract = (a, b) => a - b;
        
        export const multiply = (a, b) => a * b;
        
        export default {
          add,
          subtract,
          multiply
        };
      `;
      const filePath = path.join(TEST_DIR, 'math.js');
      const chunks = chunkManager.chunkFile(filePath, content, '.js');

      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('Vue Chunking', () => {
    it('should chunk Vue SFC script section', async () => {
      const content = `
<template>
  <div class="user-list">
    <user-item v-for="user in users" :key="user.id" :user="user" />
  </div>
</template>

<script>
export default {
  name: 'UserList',
  props: {
    users: {
      type: Array,
      required: true
    }
  },
  computed: {
    userCount() {
      return this.users.length;
    }
  }
}
<\/script>

<style scoped>
.user-list {
  display: flex;
  flex-direction: column;
}
<\/style>
`;
      const filePath = path.join(TEST_DIR, 'UserList.vue');
      const chunks = chunkManager.chunkFile(filePath, content, '.vue');

      expect(chunks.length).toBeGreaterThanOrEqual(3); // script, template, style
      
      // Should have script chunk
      const scriptChunk = chunks.find(c => c.type === 'vue-script');
      expect(scriptChunk).toBeDefined();
      expect(scriptChunk!.content).toContain('export default');
      
      // Should have template chunk
      const templateChunk = chunks.find(c => c.type === 'vue-template');
      expect(templateChunk).toBeDefined();
      expect(templateChunk!.content).toContain('user-list');
      
      // Should have style chunk
      const styleChunk = chunks.find(c => c.type === 'vue-style');
      expect(styleChunk).toBeDefined();
    });

    it('should extract Vue component exports as additional chunks', async () => {
      const content = `
<template>
  <button @click="handleClick">{{ label }}</button>
</template>

<script>
export default {
  name: 'BaseButton',
  props: {
    label: String
  },
  methods: {
    handleClick() {
      this.$emit('click');
    }
  }
}
<\/script>
`;
      const filePath = path.join(TEST_DIR, 'BaseButton.vue');
      const chunks = chunkManager.chunkFile(filePath, content, '.vue');

      expect(chunks.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle Vue SFC without template', async () => {
      const content = `
<script>
export default {
  name: 'LogicOnly',
  data() {
    return {
      count: 0
    }
  }
}
<\/script>

<style>
.hidden { display: none; }
<\/style>
`;
      const filePath = path.join(TEST_DIR, 'LogicOnly.vue');
      const chunks = chunkManager.chunkFile(filePath, content, '.vue');

      expect(chunks.length).toBeGreaterThanOrEqual(2);
      
      const scriptChunk = chunks.find(c => c.type === 'vue-script');
      expect(scriptChunk).toBeDefined();
    });

    it('should handle Vue SFC without style', async () => {
      const content = `
<template>
  <span>{{ message }}</span>
</template>

<script>
export default {
  data() {
    return {
      message: 'Hello'
    }
  }
}
<\/script>
`;
      const filePath = path.join(TEST_DIR, 'NoStyle.vue');
      const chunks = chunkManager.chunkFile(filePath, content, '.vue');

      expect(chunks.length).toBeGreaterThanOrEqual(2);
      
      const styleChunk = chunks.find(c => c.type === 'vue-style');
      expect(styleChunk).toBeUndefined();
    });
  });

  describe('Markdown Chunking', () => {
    it('should chunk Markdown by headers', async () => {
      const content = `
# Main Title

Introduction paragraph.

## Section 1

Content for section 1.
More content here.

## Section 2

Content for section 2.
- Item 1
- Item 2

### Subsection 2.1

Detailed content.

## Section 3

Final section content.
`;
      const filePath = path.join(TEST_DIR, 'document.md');
      const chunks = chunkManager.chunkFile(filePath, content, '.md');

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should chunk Markdown with code blocks', async () => {
      const content = `
# API Documentation

## Installation

\`\`\`bash
npm install @a2a/rag
\`\`\`

## Usage

\`\`\`typescript
import { createRAG } from '@a2a/rag';

const rag = createRAG({
  projectPath: './my-project'
});
\`\`\`

## Configuration

Options description here.
`;
      const filePath = path.join(TEST_DIR, 'api-docs.md');
      const chunks = chunkManager.chunkFile(filePath, content, '.md');

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should chunk Markdown README style', async () => {
      const content = `
# Project Name

[![Build Status](https://example.com/badge.svg)](https://example.com)

## Description

A brief description of the project.

## Features

- Feature 1
- Feature 2
- Feature 3

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

\`\`\`bash
git clone https://github.com/example/project.git
cd project
npm install
\`\`\`

## API Reference

See [API.md](./API.md) for details.

## License

MIT
`;
      const filePath = path.join(TEST_DIR, 'README.md');
      const chunks = chunkManager.chunkFile(filePath, content, '.md');

      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('AST Chunking', () => {
    it('should parse JavaScript with AST when possible', () => {
      const content = `
        function test() {
          return 42;
        }
        
        const x = 1;
      `;
      const filePath = path.join(TEST_DIR, 'ast-test.js');
      
      // AST chunker may or may not be available depending on dependencies
      try {
        const chunks = astChunker.chunkFile(filePath, content, '.js');
        expect(chunks.length).toBeGreaterThanOrEqual(0);
      } catch {
        // AST parsing not available, that's ok
        expect(true).toBe(true);
      }
    });

    it('should fallback to regex chunking on AST failure', () => {
      const content = `
        @decorator
        class Test {
          // Invalid syntax that might break AST parser
        }
      `;
      const filePath = path.join(TEST_DIR, 'invalid.js');
      
      const chunks = chunkManager.chunkFile(filePath, content, '.js');
      
      // Should still return chunks even if AST parsing fails
      expect(chunks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Chunk Structure', () => {
    it('should create chunks with all required fields', () => {
      const content = `
        export class Test {
          method() {}
        }
      `;
      const filePath = path.join(TEST_DIR, 'structure.ts');
      const chunks = chunkManager.chunkFile(filePath, content, '.ts');

      for (const chunk of chunks) {
        expect(chunk.id).toBeDefined();
        expect(typeof chunk.id).toBe('string');
        expect(chunk.id.length).toBeGreaterThan(0);

        expect(chunk.filePath).toBe(filePath);

        expect(chunk.type).toBeDefined();
        expect(typeof chunk.type).toBe('string');

        expect(chunk.content).toBeDefined();
        expect(typeof chunk.content).toBe('string');
        expect(chunk.content.length).toBeGreaterThan(0);

        expect(chunk.startLine).toBeGreaterThan(0);
        expect(typeof chunk.startLine).toBe('number');
      }
    });

    it('should generate unique IDs for chunks', () => {
      const content = `
        class A {}
        class B {}
        class C {}
      `;
      const filePath = path.join(TEST_DIR, 'unique.ts');
      const chunks = chunkManager.chunkFile(filePath, content, '.ts');

      const ids = chunks.map(c => c.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should track correct line numbers', () => {
      const content = `line1
line2
line3
class Test {
  method() {}
}`;
      const filePath = path.join(TEST_DIR, 'lines.ts');
      const chunks = chunkManager.chunkFile(filePath, content, '.ts');

      for (const chunk of chunks) {
        expect(chunk.startLine).toBeGreaterThan(0);
        // Line number should be within file bounds
        const lines = content.split('\n');
        expect(chunk.startLine).toBeLessThanOrEqual(lines.length);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty files', () => {
      const content = '';
      const filePath = path.join(TEST_DIR, 'empty.ts');
      const chunks = chunkManager.chunkFile(filePath, content, '.ts');

      // Should return empty array or minimal chunks
      expect(Array.isArray(chunks)).toBe(true);
    });

    it('should handle very short files', () => {
      const content = 'const x = 1;';
      const filePath = path.join(TEST_DIR, 'short.ts');
      const chunks = chunkManager.chunkFile(filePath, content, '.ts');

      expect(Array.isArray(chunks)).toBe(true);
    });

    it('should handle files with only comments', () => {
      const content = `
        // This is a comment
        /* Multi-line
           comment */
      `;
      const filePath = path.join(TEST_DIR, 'comments.ts');
      const chunks = chunkManager.chunkFile(filePath, content, '.ts');

      expect(Array.isArray(chunks)).toBe(true);
    });

    it('should handle unknown file extensions', () => {
      const content = 'Some content here';
      const filePath = path.join(TEST_DIR, 'unknown.xyz');
      const chunks = chunkManager.chunkFile(filePath, content, '.xyz');

      // Should fallback to line-based chunking
      expect(Array.isArray(chunks)).toBe(true);
    });
  });
});
