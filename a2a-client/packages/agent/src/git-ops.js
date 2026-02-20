/**
 * Git Operations - Handles git commands
 */

const simpleGit = require('simple-git');

/**
 * GitOps class for git operations
 */
class GitOps {
  /**
   * Create a git operations instance
   * @param {string} projectPath - Path to git repository
   */
  constructor(projectPath) {
    this.git = simpleGit(projectPath);
    this.projectPath = projectPath;
  }

  /**
   * Add files to staging
   * @param {string|string[]} files - File path(s) to add
   * @returns {Promise<Object>} Add result
   */
  async add(files) {
    try {
      await this.git.add(files);
      return {
        success: true,
        files: Array.isArray(files) ? files : [files],
        message: 'Files added to staging',
      };
    } catch (error) {
      throw new Error(`Git add failed: ${error.message}`);
    }
  }

  /**
   * Commit changes
   * @param {string} message - Commit message
   * @param {Object} options - Commit options
   * @param {string[]} [options.files] - Specific files to commit
   * @returns {Promise<Object>} Commit result
   */
  async commit(message, options = {}) {
    try {
      let commitResult;
      
      if (options.files) {
        // Add specific files first
        await this.git.add(options.files);
        commitResult = await this.git.commit(message, options.files);
      } else {
        // Commit all staged changes
        commitResult = await this.git.commit(message);
      }

      return {
        success: true,
        commitHash: commitResult.commit,
        message: message,
        files: options.files || [],
      };
    } catch (error) {
      throw new Error(`Git commit failed: ${error.message}`);
    }
  }

  /**
   * Checkout branch
   * @param {string} branch - Branch name
   * @param {Object} options - Checkout options
   * @param {boolean} [options.create=false] - Create new branch
   * @returns {Promise<Object>} Checkout result
   */
  async checkout(branch, options = {}) {
    try {
      if (options.create) {
        await this.git.checkoutLocalBranch(branch);
      } else {
        await this.git.checkout(branch);
      }

      return {
        success: true,
        branch: branch,
        created: options.create || false,
      };
    } catch (error) {
      throw new Error(`Git checkout failed: ${error.message}`);
    }
  }

  /**
   * Get current branch
   * @returns {Promise<string>} Current branch name
   */
  async getCurrentBranch() {
    try {
      const status = await this.git.status();
      return status.current;
    } catch (error) {
      throw new Error(`Failed to get current branch: ${error.message}`);
    }
  }

  /**
   * Get repository status
   * @returns {Promise<Object>} Repository status
   */
  async getStatus() {
    try {
      const status = await this.git.status();
      
      return {
        branch: status.current,
        ahead: status.ahead,
        behind: status.behind,
        staged: status.staged,
        modified: status.modified,
        untracked: status.not_added,
        conflicted: status.conflicted,
        isClean: status.isClean(),
      };
    } catch (error) {
      throw new Error(`Failed to get status: ${error.message}`);
    }
  }

  /**
   * Create and apply patch
   * @param {string} patch - Patch content (diff format)
   * @param {string} [targetPath] - Target file path
   * @returns {Promise<Object>} Patch result
   */
  async applyPatch(patch, targetPath) {
    try {
      // Apply patch using git apply
      await this.git.applyPatch(patch);
      
      return {
        success: true,
        applied: true,
        targetPath: targetPath || 'unknown',
      };
    } catch (error) {
      // If git apply fails, try to apply manually
      try {
        await this.manualApplyPatch(patch, targetPath);
        return {
          success: true,
          applied: true,
          method: 'manual',
          targetPath: targetPath || 'unknown',
        };
      } catch (manualError) {
        throw new Error(`Failed to apply patch: ${manualError.message}`);
      }
    }
  }

  /**
   * Manually apply patch (fallback)
   * @private
   * @param {string} patch - Patch content
   * @param {string} targetPath - Target file path
   */
  async manualApplyPatch(patch, targetPath) {
    // This is a simplified implementation
    // In production, you'd want a more robust patch parser
    const fs = require('fs').promises;
    const path = require('path');
    
    if (!targetPath) {
      throw new Error('Target path required for manual patch application');
    }

    const fullPath = path.join(this.projectPath, targetPath);
    
    // Parse patch to extract new content
    // This is a very basic implementation
    const lines = patch.split('\n');
    let newContent = [];
    let inHunk = false;
    
    for (const line of lines) {
      if (line.startsWith('@@')) {
        inHunk = true;
        continue;
      }
      if (inHunk) {
        if (line.startsWith('+')) {
          newContent.push(line.substring(1));
        } else if (!line.startsWith('-') && !line.startsWith('\\')) {
          newContent.push(line);
        }
      }
    }

    await fs.writeFile(fullPath, newContent.join('\n'), 'utf-8');
  }

  /**
   * Get commit history
   * @param {Object} options - Log options
   * @param {number} [options.maxCount=10] - Max commits to show
   * @returns {Promise<Array>} Commit history
   */
  async getLog(options = {}) {
    try {
      const log = await this.git.log({ maxCount: options.maxCount || 10 });
      
      return log.all.map(commit => ({
        hash: commit.hash,
        message: commit.message,
        author: commit.author_name,
        date: commit.date,
      }));
    } catch (error) {
      throw new Error(`Failed to get log: ${error.message}`);
    }
  }

  /**
   * Push changes to remote
   * @param {string} [remote='origin'] - Remote name
   * @param {string} [branch] - Branch name (defaults to current)
   * @returns {Promise<Object>} Push result
   */
  async push(remote = 'origin', branch) {
    try {
      await this.git.push(remote, branch);
      
      return {
        success: true,
        remote: remote,
        branch: branch || 'current',
      };
    } catch (error) {
      throw new Error(`Git push failed: ${error.message}`);
    }
  }

  /**
   * Pull changes from remote
   * @param {string} [remote='origin'] - Remote name
   * @param {string} [branch] - Branch name
   * @returns {Promise<Object>} Pull result
   */
  async pull(remote = 'origin', branch) {
    try {
      await this.git.pull(remote, branch);
      
      return {
        success: true,
        remote: remote,
        branch: branch || 'current',
      };
    } catch (error) {
      throw new Error(`Git pull failed: ${error.message}`);
    }
  }
}

module.exports = {
  GitOps,
};
