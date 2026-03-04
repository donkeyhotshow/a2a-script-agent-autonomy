/**
 * ProtocolResult - A utility class for creating standardized protocol results
 * 
 * This class provides a standardized way to create protocol results that can be used
 * across different parts of the A2A system. It supports creating results with
 * content, metadata, and error handling.
 */
class ProtocolResult {
    /**
     * Creates a new ProtocolResult instance
     * @param {string} action - The action type
     * @param {any} content - The result content
     * @param {Object} [metadata] - Optional metadata
     * @param {Error} [error] - Optional error
     */
    constructor(action, content, metadata = {}, error = null) {
        this.action = action;
        this.content = content;
        this.metadata = metadata;
        this.error = error;
        this.timestamp = new Date().toISOString();
    }

    /**
     * Creates a ProtocolResult instance
     * @param {string} action - The action type
     * @param {any} content - The result content
     * @param {Object} [metadata] - Optional metadata
     * @param {Error} [error] - Optional error
     * @returns {ProtocolResult}
     */
    static create(action, content, metadata, error) {
        return new ProtocolResult(action, content, metadata, error);
    }

    /**
     * Creates a successful result
     * @param {string} action - The action type
     * @param {any} content - The result content
     * @param {Object} [metadata] - Optional metadata
     * @returns {ProtocolResult}
     */
    static success(action, content, metadata) {
        return new ProtocolResult(action, content, metadata, null);
    }

    /**
     * Creates an error result
     * @param {string} action - The action type
     * @param {Error|string} error - The error or error message
     * @param {Object} [metadata] - Optional metadata
     * @returns {ProtocolResult}
     */
    static error(action, error, metadata) {
        const errorObj = error instanceof Error ? error : new Error(error);
        return new ProtocolResult(action, null, metadata, errorObj);
    }

    /**
     * Checks if the result represents an error
     * @returns {boolean}
     */
    isError() {
        return this.error !== null;
    }

    /**
     * Gets the error message if there is an error
     * @returns {string|null}
     */
    getErrorMessage() {
        return this.error ? this.error.message : null;
    }

    /**
     * Converts the result to a plain object
     * @returns {Object}
     */
    toObject() {
        const result = {
            action: this.action,
            content: this.content,
            metadata: this.metadata,
            timestamp: this.timestamp
        };

        if (this.error) {
            result.error = {
                message: this.error.message,
                stack: this.error.stack
            };
        }

        return result;
    }

    /**
     * Converts the result to JSON string
     * @returns {string}
     */
    toJSON() {
        return JSON.stringify(this.toObject());
    }
}

/**
 * Helper function to create a read file result
 * @param {string} path - The file path
 * @param {string} content - The file content
 * @param {Object} [metadata] - Optional metadata
 * @param {Error} [error] - Optional error
 * @returns {ProtocolResult}
 */
function readFileForResult(path, content, metadata, error) {
    const result = {
        path: path,
        content: content
    };
    return ProtocolResult.create('read-file', result, metadata, error);
}

/**
 * Helper function to create a write file result
 * @param {string} path - The file path
 * @param {Object} result - The write result (e.g., { bytesWritten: 100 })
 * @param {Object} [metadata] - Optional metadata
 * @param {Error} [error] - Optional error
 * @returns {ProtocolResult}
 */
function writeFileForResult(path, result, metadata, error) {
    const content = {
        path: path,
        result: result
    };
    return ProtocolResult.create('write-file', content, metadata, error);
}

/**
 * Helper function to create a list directory result
 * @param {string} path - The directory path
 * @param {Array} entries - Array of directory entries
 * @param {Object} [metadata] - Optional metadata
 * @param {Error} [error] - Optional error
 * @returns {ProtocolResult}
 */
function listDirectoryForResult(path, entries, metadata, error) {
    const content = {
        path: path,
        entries: entries
    };
    return ProtocolResult.create('list-directory', content, metadata, error);
}

module.exports = { ProtocolResult, readFileForResult, writeFileForResult, listDirectoryForResult };
