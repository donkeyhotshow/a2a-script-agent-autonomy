import fs from 'fs/promises';
import path from 'path';
import simpleGit from 'simple-git';
import { logger } from '../utils/logger.js';

/**
 * Git Service
 * Handles Git repository operations using simple-git
 */

export interface CloneOptions {
  gitUrl: string;
  branch: string;
  sshKey?: string;
  targetPath: string;
}

export interface GitStatus {
  isClean: boolean;
  currentBranch: string;
  ahead: number;
  behind: number;
  modifiedFiles: string[];
}

export interface FileDiff {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  content?: string;
}

/**
 * Clone a Git repository
 */
export async function cloneRepository(options: CloneOptions): Promise<string> {
  const { gitUrl, branch, targetPath } = options;

  try {
    await fs.mkdir(targetPath, { recursive: true });

    const git = simpleGit();

    logger.info('Cloning repository', { gitUrl, targetPath, branch });

    await git.clone(gitUrl, targetPath, ['--branch', branch, '--single-branch']);

    return targetPath;
  } catch (error) {
    logger.error('Failed to clone repository', { gitUrl, targetPath, branch, error });
    throw error;
  }
}

/**
 * Pull latest changes
 */
export async function pullChanges(projectPath: string): Promise<void> {
  if (!(await isRepository(projectPath))) {
    logger.warn('pullChanges called on non-repository path', { projectPath });
    return;
  }

  const git = simpleGit(projectPath);

  try {
    await git.pull();
  } catch (error) {
    logger.error('Failed to pull changes', { projectPath, error });
    throw error;
  }
}

/**
 * Get repository status
 */
export async function getStatus(projectPath: string): Promise<GitStatus> {
  if (!(await isRepository(projectPath))) {
    throw new Error(`Path is not a Git repository: ${projectPath}`);
  }

  const git = simpleGit(projectPath);
  const status = await git.status();

  return {
    isClean: status.isClean(),
    currentBranch: status.current,
    ahead: status.ahead,
    behind: status.behind,
    modifiedFiles: status.files.map((f) => f.path),
  };
}

/**
 * Get file content at specific commit or HEAD
 */
export async function getFileContent(
  projectPath: string,
  filePath: string,
  ref?: string
): Promise<string> {
  const fullPath = path.join(projectPath, filePath);

  // Сначала пытаемся прочитать из рабочей директории
  if (!ref) {
    try {
      return await fs.readFile(fullPath, 'utf8');
    } catch {
      // Если файла нет в рабочей директории — пробуем Git
    }
  }

  if (!(await isRepository(projectPath))) {
    throw new Error(`Path is not a Git repository: ${projectPath}`);
  }

  const git = simpleGit(projectPath);
  const revision = ref ?? 'HEAD';

  try {
    return await git.show(`${revision}:${filePath}`);
  } catch (error) {
    logger.error('Failed to get file content from Git', { projectPath, filePath, ref, error });
    throw error;
  }
}

/**
 * Get diff for file
 */
export async function getFileDiff(
  projectPath: string,
  filePath: string,
  staged?: boolean
): Promise<FileDiff> {
  if (!(await isRepository(projectPath))) {
    throw new Error(`Path is not a Git repository: ${projectPath}`);
  }

  const git = simpleGit(projectPath);

  const status = await git.status();
  const fileStatus = status.files.find((f) => f.path === filePath);

  let diffText: string;
  if (staged) {
    diffText = await git.diff(['--cached', '--', filePath]);
  } else {
    diffText = await git.diff(['--', filePath]);
  }

  let statusType: FileDiff['status'] = 'modified';

  if (fileStatus) {
    if (fileStatus.index === 'A' || fileStatus.working_dir === 'A') {
      statusType = 'added';
    } else if (fileStatus.index === 'D' || fileStatus.working_dir === 'D') {
      statusType = 'deleted';
    } else if (fileStatus.index === 'R' || fileStatus.working_dir === 'R') {
      statusType = 'renamed';
    }
  }

  // Используем diffSummary для подсчёта добавлений/удалений
  const summary = await git.diffSummary([filePath]);
  const entry = summary.files.find((f) => f.file === filePath);

  return {
    path: filePath,
    status: statusType,
    additions: entry?.insertions ?? 0,
    deletions: entry?.deletions ?? 0,
    content: diffText,
  };
}

/**
 * Apply changes to file
 */
export async function applyFileChanges(
  projectPath: string,
  filePath: string,
  content: string
): Promise<void> {
  const fullPath = path.join(projectPath, filePath);

  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, 'utf8');

  const written = await fs.readFile(fullPath, 'utf8');
  if (written !== content) {
    throw new Error(`Failed to verify written content for ${fullPath}`);
  }
}

/**
 * List files in repository
 */
export async function listFiles(
  projectPath: string,
  options?: {
    extension?: string[];
    exclude?: string[];
  }
): Promise<string[]> {
  const exts =
    options?.extension?.map((ext) => (ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`)) ??
    null;

  const excludes = options?.exclude ?? [];

  const results = new Set<string>();

  if (await isRepository(projectPath)) {
    const git = simpleGit(projectPath);
    const ls = await git.raw(['ls-files']);
    for (const line of ls.split('\n')) {
      const file = line.trim();
      if (!file) continue;
      if (shouldExclude(file, excludes)) continue;
      if (exts && !exts.some((ext) => file.toLowerCase().endsWith(ext))) continue;
      results.add(file);
    }
  } else {
    // Если это не репозиторий — обходим файловую систему
    async function walk(current: string) {
      const entries = await fs.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        const full = path.join(current, entry.name);
        const rel = path.relative(projectPath, full).replace(/\\/g, '/');
        if (entry.isDirectory()) {
          await walk(full);
        } else {
          if (shouldExclude(rel, excludes)) continue;
          if (exts && !exts.some((ext) => rel.toLowerCase().endsWith(ext))) continue;
          results.add(rel);
        }
      }
    }

    await walk(projectPath);
  }

  return Array.from(results).sort();
}

/**
 * Get commit history for file
 */
export async function getFileHistory(
  projectPath: string,
  filePath: string,
  limit?: number
): Promise<Array<{
  hash: string;
  message: string;
  author: string;
  date: Date;
}>> {
  if (!(await isRepository(projectPath))) {
    return [];
  }

  const git = simpleGit(projectPath);
  const log = await git.log({
    file: filePath,
    maxCount: limit ?? 50,
  });

  return log.all.map((entry) => ({
    hash: entry.hash,
    message: entry.message,
    author: entry.author_name,
    date: new Date(entry.date),
  }));
}

/**
 * Check if repository exists at path
 */
export async function isRepository(path: string): Promise<boolean> {
  try {
    const git = simpleGit(path);
    return await git.checkIsRepo();
  } catch {
    return false;
  }
}

/**
 * Delete repository files
 */
export async function deleteRepository(projectPath: string): Promise<void> {
  try {
    await fs.rm(projectPath, { recursive: true, force: true });
  } catch (error) {
    logger.error('Failed to delete repository directory', { projectPath, error });
    throw error;
  }
}

function shouldExclude(filePath: string, excludes: string[]): boolean {
  if (excludes.length === 0) return false;
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  return excludes.some((pattern) => normalized.includes(pattern.toLowerCase()));
}
