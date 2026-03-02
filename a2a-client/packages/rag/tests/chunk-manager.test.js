/**
 * Tests for ChunkManager
 */

const {ChunkManager} = require('../src/chunk-manager');

describe('ChunkManager', () => {
    let chunkManager;

    beforeEach(() => {
        chunkManager = new ChunkManager({});
    });

    describe('chunkFile', () => {
        test('should chunk PHP file by class and method', () => {
            const content = `
class UserService {
    public function getUser($id) {
        return User::find($id);
    }
    
    private function validate($data) {
        return true;
    }
}
      `;
            const chunks = chunkManager.chunkFile('UserService.php', content, '.php');

            expect(chunks.length).toBeGreaterThan(0);
            expect(chunks.some(c => c.type === 'class')).toBe(true);
            expect(chunks.some(c => c.type === 'method')).toBe(true);
        });

        test('should chunk JS file by function and class', () => {
            const content = `
function hello() {
    console.log('hello');
}

class UserService {
    constructor() {}
    
    getUser() {
        return {};
    }
}
      `;
            const chunks = chunkManager.chunkFile('user.js', content, '.js');

            expect(chunks.length).toBeGreaterThan(0);
        });

        test('should chunk Vue SFC', () => {
            const content = `
<template>
  <div>Hello</div>
</template>

<script>
export default {
  name: 'HelloWorld'
}
</script>

<style>
div { color: red; }
</style>
      `;
            const chunks = chunkManager.chunkFile('HelloWorld.vue', content, '.vue');

            expect(chunks.some(c => c.type === 'vue-script')).toBe(true);
            expect(chunks.some(c => c.type === 'vue-template')).toBe(true);
            expect(chunks.some(c => c.type === 'vue-style')).toBe(true);
        });

        test('should chunk Markdown by sections', () => {
            const content = `# Title

Some content

## Section 1

Content 1

## Section 2

Content 2
      `;
            const chunks = chunkManager.chunkFile('README.md', content, '.md');

            expect(chunks.length).toBe(3); // Title + 2 sections
            expect(chunks.every(c => c.type === 'section')).toBe(true);
        });

        test('should fallback to line-based chunking for unknown extensions', () => {
            const content = 'line1\nline2\nline3\nline4\nline5\nline6';
            const chunks = chunkManager.chunkFile('test.txt', content, '.txt');

            expect(chunks.length).toBeGreaterThan(0);
            expect(chunks[0].type).toBe('lines');
        });
    });

    describe('hashContent', () => {
        test('should generate consistent hash', () => {
            const hash1 = chunkManager.hashContent('test content');
            const hash2 = chunkManager.hashContent('test content');
            expect(hash1).toBe(hash2);
        });

        test('should generate different hashes for different content', () => {
            const hash1 = chunkManager.hashContent('test 1');
            const hash2 = chunkManager.hashContent('test 2');
            expect(hash1).not.toBe(hash2);
        });

        test('should return 12 character hash', () => {
            const hash = chunkManager.hashContent('test');
            expect(hash.length).toBe(12);
        });
    });

    describe('extractBlock', () => {
        test('should extract code block with braces', () => {
            const content = 'function test() { return true; }';
            const result = chunkManager.extractBlock(content, content.indexOf('function'));
            expect(result).toContain('{');
            expect(result).toContain('}');
        });

        test('should limit block size to 5000 chars', () => {
            const longContent = 'x'.repeat(10000);
            const result = chunkManager.extractBlock(longContent, 0);
            expect(result.length).toBeLessThanOrEqual(5000);
        });
    });

    describe('TypeScript support', () => {
        test('should extract interfaces from TypeScript', () => {
            const content = `
interface User {
  id: number;
  name: string;
}

interface UserResponse extends User {
  token: string;
}
      `;
            const chunks = chunkManager.chunkFile('types.ts', content, '.ts');

            expect(chunks.some(c => c.type === 'interface')).toBe(true);
            expect(chunks.some(c => c.name === 'User')).toBe(true);
        });

        test('should extract type definitions', () => {
            const content = `
type UserID = string | number;
type UserStatus = 'active' | 'inactive';
      `;
            const chunks = chunkManager.chunkFile('types.ts', content, '.ts');

            expect(chunks.some(c => c.type === 'type')).toBe(true);
        });
    });

    describe('Laravel support', () => {
        test('should extract routes from PHP', () => {
            const content = `
<?php
use Illuminate\\Support\\Facades\\Route;

Route::get('/users', 'UserController@index');
Route::post('/users', 'UserController@store');
      `;
            const chunks = chunkManager.chunkFile('web.php', content, '.php');

            expect(chunks.some(c => c.type === 'route')).toBe(true);
        });

        test('should extract service container bindings', () => {
            const content = `
<?php
$app->bind('App\\Services\\UserService', function($app) {
    return new UserService();
});
      `;
            const chunks = chunkManager.chunkFile('AppServiceProvider.php', content, '.php');

            expect(chunks.some(c => c.type === 'binding')).toBe(true);
        });
    });
});
