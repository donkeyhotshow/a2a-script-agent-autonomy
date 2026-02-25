"use strict";
/**
 * Git Operations - Handles git commands
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitOps = void 0;
const path_1 = __importDefault(require("path"));
const simple_git_1 = __importDefault(require("simple-git"));
class GitOps {
    constructor(projectPath) {
        this.git = (0, simple_git_1.default)(projectPath);
        this.projectPath = projectPath;
    }
    async add(files) {
        try {
            await this.git.add(files);
            return { success: true, files: Array.isArray(files) ? files : [files], message: 'Files added to staging' };
        }
        catch (error) {
            throw new Error(`Git add failed: ${error.message}`);
        }
    }
    async commit(message, options = {}) {
        try {
            let commitResult;
            if (options.files?.length) {
                await this.git.add(options.files);
                commitResult = await this.git.commit(message, options.files);
            }
            else {
                commitResult = await this.git.commit(message);
            }
            return { success: true, commitHash: commitResult.commit, message, files: options.files ?? [] };
        }
        catch (error) {
            throw new Error(`Git commit failed: ${error.message}`);
        }
    }
    async checkout(branch, options = {}) {
        try {
            if (options.create)
                await this.git.checkoutLocalBranch(branch);
            else
                await this.git.checkout(branch);
            return { success: true, branch, created: options.create ?? false };
        }
        catch (error) {
            throw new Error(`Git checkout failed: ${error.message}`);
        }
    }
    async getCurrentBranch() {
        try {
            const status = await this.git.status();
            return status.current ?? '';
        }
        catch (error) {
            throw new Error(`Failed to get current branch: ${error.message}`);
        }
    }
    async getStatus() {
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
        }
        catch (error) {
            throw new Error(`Failed to get status: ${error.message}`);
        }
    }
    async applyPatch(patch, targetPath) {
        try {
            await this.git.applyPatch(patch);
            return { success: true, applied: true, targetPath: targetPath ?? 'unknown' };
        }
        catch {
            try {
                await this.manualApplyPatch(patch, targetPath);
                return { success: true, applied: true, method: 'manual', targetPath: targetPath ?? 'unknown' };
            }
            catch (manualError) {
                throw new Error(`Failed to apply patch: ${manualError.message}`);
            }
        }
    }
    async manualApplyPatch(patch, targetPath) {
        const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        if (!targetPath)
            throw new Error('Target path required for manual patch application');
        const fullPath = path_1.default.join(this.projectPath, targetPath);
        const lines = patch.split('\n');
        const newContent = [];
        let inHunk = false;
        for (const line of lines) {
            if (line.startsWith('@@')) {
                inHunk = true;
                continue;
            }
            if (inHunk) {
                if (line.startsWith('+'))
                    newContent.push(line.substring(1));
                else if (!line.startsWith('-') && !line.startsWith('\\'))
                    newContent.push(line);
            }
        }
        await fs.writeFile(fullPath, newContent.join('\n'), 'utf-8');
    }
    async getLog(options = {}) {
        try {
            const log = await this.git.log({ maxCount: options.maxCount ?? 10 });
            return (log.all ?? []).map((c) => ({ hash: c.hash, message: c.message, author: c.author_name, date: c.date }));
        }
        catch (error) {
            throw new Error(`Failed to get log: ${error.message}`);
        }
    }
    async push(remote = 'origin', branch) {
        try {
            await this.git.push(remote, branch);
            return { success: true, remote, branch: branch ?? 'current' };
        }
        catch (error) {
            throw new Error(`Git push failed: ${error.message}`);
        }
    }
    async pull(remote = 'origin', branch) {
        try {
            await this.git.pull(remote, branch);
            return { success: true, remote, branch: branch ?? 'current' };
        }
        catch (error) {
            throw new Error(`Git pull failed: ${error.message}`);
        }
    }
}
exports.GitOps = GitOps;
