/**
 * Git Operations - Handles git commands
 */
import { SimpleGit } from 'simple-git';
export declare class GitOps {
    git: SimpleGit;
    projectPath: string;
    constructor(projectPath: string);
    add(files: string | string[]): Promise<{
        success: boolean;
        files: string[];
        message: string;
    }>;
    commit(message: string, options?: {
        files?: string[];
    }): Promise<{
        success: boolean;
        commitHash?: string;
        message: string;
        files: string[];
    }>;
    checkout(branch: string, options?: {
        create?: boolean;
    }): Promise<{
        success: boolean;
        branch: string;
        created: boolean;
    }>;
    getCurrentBranch(): Promise<string>;
    getStatus(): Promise<{
        branch?: string;
        ahead: number;
        behind: number;
        staged: string[];
        modified: string[];
        untracked: string[];
        conflicted: string[];
        isClean: () => boolean;
    }>;
    applyPatch(patch: string, targetPath?: string): Promise<{
        success: boolean;
        applied: boolean;
        method?: string;
        targetPath: string;
    }>;
    manualApplyPatch(patch: string, targetPath?: string): Promise<void>;
    getLog(options?: {
        maxCount?: number;
    }): Promise<Array<{
        hash: string;
        message: string;
        author: string;
        date: string;
    }>>;
    push(remote?: string, branch?: string): Promise<{
        success: boolean;
        remote: string;
        branch: string;
    }>;
    pull(remote?: string, branch?: string): Promise<{
        success: boolean;
        remote: string;
        branch: string;
    }>;
}
