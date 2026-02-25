/**
 * Git Operations - Handles git commands
 */

import path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';

export class GitOps {
  git: SimpleGit;
  projectPath: string;

  constructor(projectPath: string) {
    this.git = simpleGit(projectPath);
    this.projectPath = projectPath;
  }

  async add(files: string | string[]): Promise<{ success: boolean; files: string[]; message: string }> {
    try {
      await this.git.add(files);
      return { success: true, files: Array.isArray(files) ? files : [files], message: 'Files added to staging' };
    } catch (error) {
      throw new Error(`Git add failed: ${(error as Error).message}`);
    }
  }

  async commit(message: string, options: { files?: string[] } = {}): Promise<{ success: boolean; commitHash?: string; message: string; files: string[] }> {
    try {
      let commitResult: { commit: string };
      if (options.files?.length) {
        await this.git.add(options.files);
        commitResult = await this.git.commit(message, options.files);
      } else {
        commitResult = await this.git.commit(message);
      }
      return { success: true, commitHash: commitResult.commit, message, files: options.files ?? [] };
    } catch (error) {
      throw new Error(`Git commit failed: ${(error as Error).message}`);
    }
  }

  async checkout(branch: string, options: { create?: boolean } = {}): Promise<{ success: boolean; branch: string; created: boolean }> {
    try {
      if (options.create) await this.git.checkoutLocalBranch(branch);
      else await this.git.checkout(branch);
      return { success: true, branch, created: options.create ?? false };
    } catch (error) {
      throw new Error(`Git checkout failed: ${(error as Error).message}`);
    }
  }

  async getCurrentBranch(): Promise<string> {
    try {
      const status = await this.git.status();
      return status.current ?? '';
    } catch (error) {
      throw new Error(`Failed to get current branch: ${(error as Error).message}`);
    }
  }

  async getStatus(): Promise<{
    branch?: string;
    ahead: number;
    behind: number;
    staged: string[];
    modified: string[];
    untracked: string[];
    conflicted: string[];
    isClean: () => boolean;
  }> {
    try {
      const status = await this.git.status();
      return {
        branch: status.current ?? undefined,
        ahead: status.ahead,
        behind: status.behind,
        staged: status.staged,
        modified: status.modified,
        untracked: status.not_added,
        conflicted: status.conflicted,
        isClean: () => status.isClean(),
      };
    } catch (error) {
      throw new Error(`Failed to get status: ${(error as Error).message}`);
    }
  }

  async applyPatch(patch: string, targetPath?: string): Promise<{ success: boolean; applied: boolean; method?: string; targetPath: string }> {
    try {
      await (this.git as SimpleGit & { applyPatch(patch: string): Promise<void> }).applyPatch(patch);
      return { success: true, applied: true, targetPath: targetPath ?? 'unknown' };
    } catch {
      try {
        await this.manualApplyPatch(patch, targetPath);
        return { success: true, applied: true, method: 'manual', targetPath: targetPath ?? 'unknown' };
      } catch (manualError) {
        throw new Error(`Failed to apply patch: ${(manualError as Error).message}`);
      }
    }
  }

  async manualApplyPatch(patch: string, targetPath?: string): Promise<void> {
    const fs = await import('fs/promises');
    if (!targetPath) throw new Error('Target path required for manual patch application');
    const fullPath = path.join(this.projectPath, targetPath);
    const lines = patch.split('\n');
    const newContent: string[] = [];
    let inHunk = false;
    for (const line of lines) {
      if (line.startsWith('@@')) { inHunk = true; continue; }
      if (inHunk) {
        if (line.startsWith('+')) newContent.push(line.substring(1));
        else if (!line.startsWith('-') && !line.startsWith('\\')) newContent.push(line);
      }
    }
    await fs.writeFile(fullPath, newContent.join('\n'), 'utf-8');
  }

  async getLog(options: { maxCount?: number } = {}): Promise<Array<{ hash: string; message: string; author: string; date: string }>> {
    try {
      const log = await this.git.log({ maxCount: options.maxCount ?? 10 });
      return (log.all ?? []).map((c) => ({ hash: c.hash, message: c.message, author: c.author_name, date: c.date }));
    } catch (error) {
      throw new Error(`Failed to get log: ${(error as Error).message}`);
    }
  }

  async push(remote = 'origin', branch?: string): Promise<{ success: boolean; remote: string; branch: string }> {
    try {
      await this.git.push(remote, branch);
      return { success: true, remote, branch: branch ?? 'current' };
    } catch (error) {
      throw new Error(`Git push failed: ${(error as Error).message}`);
    }
  }

  async pull(remote = 'origin', branch?: string): Promise<{ success: boolean; remote: string; branch: string }> {
    try {
      await this.git.pull(remote, branch);
      return { success: true, remote, branch: branch ?? 'current' };
    } catch (error) {
      throw new Error(`Git pull failed: ${(error as Error).message}`);
    }
  }
}
