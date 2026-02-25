/**
 * Workdir utilities for MCP server
 * Provides functions for working with current directory and path expansion
 */

const path = require('path');
const os = require('os');

/**
 * Get current working directory
 * @returns {string} Current working directory
 */
function getCurrentDir() {
    return process.cwd();
}

/**
 * Set current working directory
 * @param {string} dir - Directory to change to
 */
function setCurrentDir(dir) {
    try {
        process.chdir(dir);
    } catch (error) {
        throw new Error(`Cannot change directory to ${dir}: ${error.message}`);
    }
}

/**
 * Get project root directory
 * @returns {string} Project root directory
 */
function getProjectRoot() {
    // Try to find project root by looking for package.json
    let currentDir = getCurrentDir();
    let rootDir = currentDir;

    for (let i = 0; i < 10; i++) { // Limit search depth
        if (require('fs').existsSync(path.join(currentDir, 'package.json'))) {
            rootDir = currentDir;
            break;
        }
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
            break; // Reached root
        }
        currentDir = parentDir;
    }

    return rootDir;
}

/**
 * Expand path with tilde expansion and environment variables
 * @param {string} inputPath - Path to expand
 * @returns {string} Expanded path
 */
function expandPath(inputPath) {
    let expanded = inputPath;

    // Expand tilde (~) to home directory
    if (expanded.startsWith('~')) {
        const homeDir = os.homedir();
        expanded = path.join(homeDir, expanded.slice(1));
    }

    // Expand environment variables
    expanded = expanded.replace(/%([^%]+)%/g, (match, varName) => {
        return process.env[varName] || match;
    });

    // Expand $VAR syntax on Unix-like systems
    if (process.platform !== 'win32') {
        expanded = expanded.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, varName) => {
            return process.env[varName] || match;
        });
    }

    // Normalize path separators
    expanded = path.normalize(expanded);

    return expanded;
}

/**
 * Reset initialization (placeholder for future use)
 */
function resetInitialization() {
    // Placeholder - can be implemented if needed
}

/**
 * Check if path is within project root
 * @param {string} checkPath - Path to check
 * @returns {boolean} True if path is within project
 */
function isWithinProject(checkPath) {
    const projectRoot = getProjectRoot();
    const resolvedPath = path.resolve(checkPath);
    return resolvedPath.startsWith(projectRoot);
}

module.exports = {
    getCurrentDir,
    setCurrentDir,
    getProjectRoot,
    expandPath,
    resetInitialization,
    isWithinProject
};
