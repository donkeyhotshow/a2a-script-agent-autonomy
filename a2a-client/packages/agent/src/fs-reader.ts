/**
 * File System Reader - Handles file operations
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { IgnoreDetector } from '@a2a/fs-utils';

const execAsync = promisify(exec);

export interface FileSystemConfig {
  projectPath?: string;
  customIgnoreFiles?: string[];
  enableIgnore?: boolean;
}

export interface ReadFileResult {
  content: string;
  size: number;
  modified: string;
  path: string;
}

export interface ListEntry {
  name: string;
  path: string;
  type: 'directory' | 'file';
}

export interface WriteOptions {
  overwrite?: boolean;
}

export class FileSystem {
  projectPath: string;
  ignoreDetector: IgnoreDetector | null;
  private enableIgnore: boolean;

  constructor(config: FileSystemConfig = {}) {
    this.projectPath = config.projectPath ?? process.cwd();
    this.ignoreDetector = null;
    this.enableIgnore = config.enableIgnore !== false;
    if (this.enableIgnore) {
      this.ignoreDetector = new IgnoreDetector({
        projectPath: this.projectPath,
        customIgnoreFiles: config.customIgnoreFiles ?? [],
      });
    }
  }

  async initialize(): Promise<void> {
    if (this.ignoreDetector) await this.ignoreDetector.initialize();
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.projectPath, filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(filePath: string): Promise<ReadFileResult> {
    const fullPath = path.join(this.projectPath, filePath);
    if (!(await this.exists(fullPath))) throw new Error(`File not found: ${filePath}`);
    const content = await fs.readFile(fullPath, 'utf-8');
    const stats = await fs.stat(fullPath);
    return { content, size: stats.size, modified: stats.mtime.toISOString(), path: filePath };
  }

  async writeFile(filePath: string, content: string, options: WriteOptions = {}): Promise<{ path: string; size: number; created: boolean }> {
    const fullPath = path.join(this.projectPath, filePath);
    if ((await this.exists(fullPath)) && !options.overwrite) {
      throw new Error(`File already exists: ${filePath}. Use overwrite: true to replace.`);
    }
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
    return { path: filePath, size: content.length, created: true };
  }

  async deleteFile(filePath: string): Promise<{ path: string; deleted: boolean }> {
    const fullPath = path.join(this.projectPath, filePath);
    if (!(await this.exists(fullPath))) throw new Error(`File not found: ${filePath}`);
    await fs.unlink(fullPath);
    return { path: filePath, deleted: true };
  }

  async listDirectory(
    dirPath = '',
    options: { recursive?: boolean; ignore?: boolean } = {}
  ): Promise<ListEntry[]> {
    const fullPath = path.join(this.projectPath, dirPath);
    if (!(await this.exists(fullPath))) throw new Error(`Directory not found: ${dirPath}`);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const result: ListEntry[] = [];
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      if (options.ignore !== false && this.ignoreDetector) {
        if (this.ignoreDetector.shouldIgnore(entryPath)) continue;
        if (entry.isDirectory() && this.ignoreDetector.shouldSkipDirectory(entry.name, dirPath)) continue;
      }
      result.push({
        name: entry.name,
        path: entryPath,
        type: entry.isDirectory() ? 'directory' : 'file',
      });
      if (options.recursive && entry.isDirectory()) {
        if (options.ignore !== false && this.ignoreDetector?.shouldSkipDirectory(entry.name, dirPath)) continue;
        const sub = await this.listDirectory(entryPath, options);
        result.push(...sub);
      }
    }
    return result;
  }

  async runTest(testPath: string): Promise<{ success: boolean; output?: string; errors?: string; path: string }> {
    const fullPath = path.join(this.projectPath, testPath);
    if (!(await this.exists(fullPath))) throw new Error(`Test file not found: ${testPath}`);
    const ext = path.extname(testPath);
    let command: string;
    if (ext === '.php') command = `cd ${this.projectPath} && ./vendor/bin/phpunit ${testPath}`;
    else if (ext === '.js' || ext === '.ts') command = `cd ${this.projectPath} && npm test -- ${testPath}`;
    else throw new Error(`Unsupported test file type: ${ext}`);
    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 60000 }) as { stdout: string; stderr: string };
      return { success: true, output: stdout, errors: stderr, path: testPath };
    } catch (error: unknown) {
      const e = error as { stdout?: string; stderr?: string; message?: string };
      return { success: false, output: e.stdout, errors: e.stderr ?? e.message, path: testPath };
    }
  }

  async getStats(filePath: string): Promise<{ path: string; size: number; created: string; modified: string; isFile: boolean; isDirectory: boolean }> {
    const fullPath = path.join(this.projectPath, filePath);
    const stats = await fs.stat(fullPath);
    return {
      path: filePath,
      size: stats.size,
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    };
  }
}
