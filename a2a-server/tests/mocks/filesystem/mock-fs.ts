/**
 * Filesystem Mock for Tests
 * 
 * Provides mock implementation for Node.js fs module with:
 * - In-memory filesystem
 * - Preset file contents
 * - File change tracking
 */

import { vi } from 'vitest';

export interface MockFile {
    content: string;
    isDirectory: boolean;
    mtime: Date;
    size: number;
}

export interface MockFileOptions {
    content?: string;
    isDirectory?: boolean;
    mtime?: Date;
}

/**
 * In-memory filesystem mock
 */
export class MockFS {
    private files: Map<string, MockFile> = new Map();
    private calls: Array<{ method: string; args: any[] }> = [];

    constructor() {
        // Initialize with some default structure
        this.mkdirSync('/tmp');
    }

    /**
     * Add a file or directory to the mock filesystem
     */
    addFile(path: string, options: MockFileOptions = {}): void {
        this.files.set(path, {
            content: options.content || '',
            isDirectory: options.isDirectory ?? false,
            mtime: options.mtime || new Date(),
            size: options.content?.length || 0
        });
    }

    /**
     * Add multiple files at once
     */
    addFiles(files: Record<string, MockFileOptions>): void {
        for (const [path, options] of Object.entries(files)) {
            this.addFile(path, options);
        }
    }

    /**
     * Check if path exists
     */
    existsSync(path: string): boolean {
        this.calls.push({ method: 'existsSync', args: [path] });
        return this.files.has(path);
    }

    /**
     * Read file content
     */
    readFileSync(path: string, encoding?: BufferEncoding): string | Buffer {
        this.calls.push({ method: 'readFileSync', args: [path, encoding] });
        
        const file = this.files.get(path);
        if (!file) {
            throw new Error(`ENOENT: no such file or directory, open '${path}'`);
        }

        if (file.isDirectory) {
            throw new Error(`EISDIR: illegal operation on a directory, read '${path}'`);
        }

        return encoding ? file.content : Buffer.from(file.content);
    }

    /**
     * Read file as string
     */
    readFileSyncText(path: string): string {
        return this.readFileSync(path, 'utf8') as string;
    }

    /**
     * Write file content
     */
    writeFileSync(path: string, content: string | Buffer): void {
        this.calls.push({ method: 'writeFileSync', args: [path] });
        
        const dir = path.substring(0, path.lastIndexOf('/'));
        if (dir && !this.files.has(dir)) {
            this.mkdirSync(dir, { recursive: true });
        }

        this.files.set(path, {
            content: typeof content === 'string' ? content : content.toString('utf8'),
            isDirectory: false,
            mtime: new Date(),
            size: content.length
        });
    }

    /**
     * Create directory
     */
    mkdirSync(path: string, options?: { recursive?: boolean }): void {
        this.calls.push({ method: 'mkdirSync', args: [path, options] });

        if (options?.recursive) {
            const parts = path.split('/').filter(Boolean);
            let current = '';
            for (const part of parts) {
                current += '/' + part;
                if (!this.files.has(current)) {
                    this.files.set(current, {
                        content: '',
                        isDirectory: true,
                        mtime: new Date(),
                        size: 0
                    });
                }
            }
        } else {
            this.files.set(path, {
                content: '',
                isDirectory: true,
                mtime: new Date(),
                size: 0
            });
        }
    }

    /**
     * Remove file or directory
     */
    unlinkSync(path: string): void {
        this.calls.push({ method: 'unlinkSync', args: [path] });
        
        if (!this.files.has(path)) {
            throw new Error(`ENOENT: no such file or directory, unlink '${path}'`);
        }
        
        this.files.delete(path);
    }

    /**
     * Remove directory
     */
    rmdirSync(path: string): void {
        this.calls.push({ method: 'rmdirSync', args: [path] });
        
        if (!this.files.has(path)) {
            throw new Error(`ENOENT: no such file or directory, rmdir '${path}'`);
        }
        
        this.files.delete(path);
    }

    /**
     * Check if path is directory
     */
    isDirectory(path: string): boolean {
        const file = this.files.get(path);
        return file?.isDirectory ?? false;
    }

    /**
     * Check if path is file
     */
    isFile(path: string): boolean {
        const file = this.files.get(path);
        return file !== undefined && !file.isDirectory;
    }

    /**
     * List directory contents
     */
    readdirSync(path: string): string[] {
        this.calls.push({ method: 'readdirSync', args: [path] });
        
        const file = this.files.get(path);
        if (!file?.isDirectory) {
            throw new Error(`ENOTDIR: not a directory, readdir '${path}'`);
        }

        const result: string[] = [];
        for (const filePath of this.files.keys()) {
            if (filePath.startsWith(path + '/')) {
                const relative = filePath.substring(path.length + 1);
                if (!relative.includes('/')) {
                    result.push(relative);
                }
            }
        }
        
        return result;
    }

    /**
     * Get file stats
     */
    statSync(path: string): {
        isDirectory: () => boolean;
        isFile: () => boolean;
        size: number;
        mtime: Date;
    } {
        this.calls.push({ method: 'statSync', args: [path] });
        
        const file = this.files.get(path);
        if (!file) {
            throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
        }

        return {
            isDirectory: () => file.isDirectory,
            isFile: () => !file.isDirectory,
            size: file.size,
            mtime: file.mtime
        };
    }

    /**
     * Get all recorded calls
     */
    getCalls(): Array<{ method: string; args: any[] }> {
        return [...this.calls];
    }

    /**
     * Check if a method was called
     */
    wasCalled(method: string): boolean {
        return this.calls.some(c => c.method === method);
    }

    /**
     * Get call count for a method
     */
    getCallCount(method: string): number {
        return this.calls.filter(c => c.method === method).length;
    }

    /**
     * Reset all recorded calls
     */
    resetCalls(): void {
        this.calls = [];
    }

    /**
     * Clear the filesystem
     */
    clear(): void {
        this.files.clear();
        this.calls = [];
    }
}

/**
 * Create a mock fs module
 */
export function createMockFs(files: Record<string, MockFileOptions> = {}): any {
    const mockFs = new MockFS();
    
    if (Object.keys(files).length > 0) {
        mockFs.addFiles(files);
    }

    return {
        existsSync: (path: string) => mockFs.existsSync(path),
        readFileSync: (path: string, encoding?: BufferEncoding) => 
            mockFs.readFileSync(path, encoding),
        writeFileSync: (path: string, content: string | Buffer) => 
            mockFs.writeFileSync(path, content),
        mkdirSync: (path: string, options?: { recursive?: boolean }) => 
            mockFs.mkdirSync(path, options),
        unlinkSync: (path: string) => mockFs.unlinkSync(path),
        rmdirSync: (path: string) => mockFs.rmdirSync(path),
        readdirSync: (path: string) => mockFs.readdirSync(path),
        statSync: (path: string) => mockFs.statSync(path),
        
        // Instance for direct access
        _mock: mockFs
    };
}

/**
 * Global mock fs instance
 */
let globalMockFs: MockFS | null = null;

/**
 * Setup global mock fs
 */
export function setupMockFs(files?: Record<string, MockFileOptions>): MockFS {
    globalMockFs = new MockFS();
    
    if (files) {
        globalMockFs.addFiles(files);
    }
    
    return globalMockFs;
}

/**
 * Get global mock fs instance
 */
export function getMockFs(): MockFS | null {
    return globalMockFs;
}

/**
 * Common test fixtures
 */
export const commonFixtures = {
    packageJson: JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {}
    }, null, 2),

    tsConfig: JSON.stringify({
        compilerOptions: {
            target: 'ES2020',
            module: 'NodeNext',
            moduleResolution: 'NodeNext'
        }
    }, null, 2),

    envFile: `
DATABASE_URL=postgresql://localhost:5432/test
API_KEY=test-key-123
    `.trim()
};
