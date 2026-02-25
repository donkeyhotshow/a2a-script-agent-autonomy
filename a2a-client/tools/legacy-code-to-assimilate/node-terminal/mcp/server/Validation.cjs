/**
 * Validation utilities for MCP server
 */

// Настройка module-alias для корректной работы с путями
try {
  require('../../setup-module-alias.cjs');
} catch (setupError) {
  // Если setup-module-alias не найден, это не критично - продолжим без него
  // Логируем только если можем
  if (process.stderr && typeof process.stderr.write === 'function') {
    process.stderr.write(`[MCP-SERVER-WARN] setup-module-alias.cjs not found: ${setupError.message}\n`);
  }
}

// Required modules
const path = require('path');
const {ALLOWED_PATH_CATEGORIES, FORBIDDEN_PATH_PATTERNS} = require('@libs/system/server-utils/index.cjs');
const {getCurrentDir, expandPath} = require('../Workdir.cjs');
const {errorUtils} = require('@libs/error-management/error-handler/error-utils.js');
const PathUtils = require('@libs/system/path-utils/index.js').default;
const pathUtils = new PathUtils();

// Safe validationUtils import with fallback
let validationUtils;
try {
  const validationModule = require('@libs/validation/validation/validation-utils.cjs');
  validationUtils = validationModule.validationUtils || validationModule;
  if (!validationUtils || typeof validationUtils !== 'object') {
    throw new Error('validation-utils.cjs did not export validationUtils object');
  }
} catch (validationError) {
  if (process && process.stderr && typeof process.stderr.write === 'function') {
    process.stderr.write(`[MCP-SERVER-WARN] validation-utils.cjs not found or invalid in Validation.cjs: ${validationError.message}\n`);
  }
  validationUtils = {
    validate: () => ({ errors: [] }),
    isString: (val) => typeof val === 'string',
    isNumber: (val) => typeof val === 'number',
    isArray: (val) => Array.isArray(val),
    isFunction: (val) => typeof val === 'function',
  };
}

// Validate and resolve working directory
async function validateAndResolveCwd(inputCwd, fileUtils, pathUtils) {
    try {
        if (typeof inputCwd !== 'string') {
            throw errorUtils.createError('cwd must be a string');
        }

        let trimmed = inputCwd.trim();
        if (!trimmed) {
            throw errorUtils.createError('cwd is empty');
        }

        // Windows-specific path validation
        if (process.platform === 'win32') {
            const notice = 'Windows path must be absolute. Use formats: "C\\path\\to\\dir" or "C:/path/to/dir". UNC paths are also supported: "\\\\server\\share\\dir".';

            // Pre-normalization checks
            if (/^[a-zA-Z]%3A/i.test(trimmed)) {
                throw errorUtils.createError('invalid drive format ("%3A"). ' + notice);
            }
            if (/^\/[a-zA-Z]\//.test(trimmed)) {
                throw errorUtils.createError('format "/c/..." is not supported. ' + notice);
            }
            if (/^\/[a-zA-Z]:/.test(trimmed)) {
                throw errorUtils.createError('path should not start with "/" before drive letter. ' + notice);
            }

            // Normalize URL encoding
            try {
                trimmed = decodeURIComponent(trimmed);
            } catch (error) {
                // Ignore decode errors
            }

            // Fix Windows path formats
            if (/^\/[a-zA-Z]:/.test(trimmed)) {
                trimmed = trimmed.replace(/^\//, '');
            }
            if (/^\/[a-zA-Z]\//.test(trimmed)) {
                trimmed = trimmed.replace(/^\/(.)\//, function (m, d) {
                    return String(d).toUpperCase() + ':/';
                });
            }

            // Check for missing colon after drive letter
            if (/^[a-zA-Z][\\\/:]/.test(trimmed) && !/^[a-zA-Z]:[\\\/]/.test(trimmed) && !/^\\\\/.test(trimmed)) {
                throw errorUtils.createError('missing colon after drive letter. ' + notice);
            }
        }

        const expanded = expandPath(trimmed);
        const resolved = pathUtils.resolve(expanded);
        // Безопасное получение статистики: сначала пытаемся использовать fileUtils.getFileStats,
        // если он недоступен, делаем fallback на fs.stat
        let stats = null;
        try {
            if (fileUtils && typeof fileUtils.getFileStats === 'function') {
                const fileStatsResult = await fileUtils.getFileStats(resolved);
                console.log(`[DEBUG] fileUtils.getFileStats result:`, fileStatsResult);

                // Проверяем структуру ответа fileUtils.getFileStats
                if (fileStatsResult && fileStatsResult.success && fileStatsResult.stats) {
                    // Если есть stats объект, используем его
                    const fsStats = fileStatsResult.stats;
                    stats = {
                        isDirectory: fsStats.isDirectory ? fsStats.isDirectory() : fsStats.isDirectory,
                        isFile: fsStats.isFile ? fsStats.isFile() : fsStats.isFile,
                        size: fsStats.size,
                        mtime: fsStats.mtime
                    };
                } else if (fileStatsResult && fileStatsResult.isDirectory !== undefined) {
                    // Если есть прямое свойство isDirectory
                    stats = fileStatsResult;
                } else {
                    // Fallback на fs.stat
                    const fsPromises = require('fs').promises;
                    const s = await fsPromises.stat(resolved);
                    stats = {isDirectory: s.isDirectory(), isFile: s.isFile(), size: s.size, mtime: s.mtime};
                    console.log(`[DEBUG] fs.stat fallback result:`, stats);
                }
            } else {
                const fsPromises = require('fs').promises;
                const s = await fsPromises.stat(resolved);
                stats = {isDirectory: s.isDirectory(), isFile: s.isFile(), size: s.size, mtime: s.mtime};
                console.log(`[DEBUG] fs.stat result:`, stats);
            }
        } catch (statErr) {
            console.log(`[DEBUG] stat error: ${statErr.message}`);
            // Оборачиваем ошибку в структуру ErrorUtils для единообразного логирования
            let thisErr = errorUtils.createError(`Failed to stat path ${resolved}: ${statErr.message}`, 'STAT_ERROR', {path: resolved});
            throw thisErr;
        }

        console.log(`[DEBUG] final stats object:`, stats);
        console.log(`[DEBUG] isDirectory: ${stats.isDirectory}`);

        if (!stats || stats.isDirectory === undefined || !stats.isDirectory) {
            throw errorUtils.createError(process.platform === 'win32' ?
                `Path "${resolved}" is not a directory. Please provide a valid directory path.` :
                'cwd is not a directory');
        }

        return {valid: true, path: resolved};
    } catch (error) {
        return {valid: false, error: error.message};
    }
}

// Validate execution parameters
function validateExecRunParams(args) {
    const errors = [];
    const validated = {};

    // command: required string, not empty
    if (typeof args.command !== 'string') {
        errors.push('command: must be a string');
    } else {
        const trimmed = args.command.trim();
        if (!trimmed) {
            errors.push('command: cannot be empty');
        } else {
            validated.command = trimmed;
        }
    }

    // timeout: number, positive, reasonable limits
    if (args.timeout !== undefined) {
        const timeout = Number(args.timeout);
        if (!validationUtils.isNumber(timeout) || !Number.isFinite(timeout)) {
            errors.push('timeout: must be a valid number');
        } else if (timeout <= 0) {
            errors.push('timeout: must be positive');
        } else if (timeout > 3600) { // max 1 hour
            errors.push('timeout: cannot exceed 3600 seconds (1 hour)');
        } else {
            validated.timeout = Math.floor(timeout);
        }
    } else {
        validated.timeout = 120; // default 2 minutes
    }

    // is_background: boolean
    if (args.is_background !== undefined) {
        if (typeof args.is_background !== 'boolean') {
            errors.push('is_background: must be a boolean');
        } else {
            validated.is_background = args.is_background;
        }
    } else {
        validated.is_background = false;
    }

    // cwd: string or null
    if (args.cwd !== undefined) {
        if (typeof args.cwd !== 'string' && args.cwd !== null) {
            errors.push('cwd: must be a string or null');
        } else {
            validated.cwd = args.cwd;
        }
    } else {
        validated.cwd = null;
    }

    return {errors, validated};
}

// Validate path with categories
function validatePathWithCategories(pathStr, action = 'read') {
    const result = {
        isValid: false,
        category: null,
        error: null,
        details: {
            matchedCategory: null,
            forbiddenPattern: null,
            suggestions: []
        }
    };

    try {
        // Normalize path
        let normalizedPath = pathStr.replace(/\\/g, '/').replace(/\/+/g, '/');
        if (normalizedPath.startsWith('./')) {
            normalizedPath = normalizedPath.substring(2);
        }
        if (normalizedPath.endsWith('/')) {
            normalizedPath = normalizedPath.substring(0, normalizedPath.length - 1);
        }

        // Check forbidden patterns
        for (const pattern of FORBIDDEN_PATH_PATTERNS) {
            if (pattern.test(normalizedPath)) {
                result.error = 'Path blocked: contains forbidden pattern';
                result.details.forbiddenPattern = pattern.toString();
                return result;
            }
        }

        // Check categories
        for (const [categoryKey, category] of Object.entries(ALLOWED_PATH_CATEGORIES)) {
            for (const pattern of category.patterns) {
                if (pattern.test(normalizedPath)) {
                    result.isValid = true;
                    result.category = categoryKey;
                    result.details.matchedCategory = {
                        key: categoryKey,
                        name: category.name,
                        description: category.description
                    };

                    // Add suggestions for improvement
                    if (action === 'write' && categoryKey === 'SOURCE_CODE') {
                        result.details.suggestions.push('Consider using .gitignore to protect source code');
                    }
                    if (action === 'delete' && categoryKey === 'DOCS_CONFIG') {
                        result.details.suggestions.push('Warning: deleting config files may break the project');
                    }

                    return result;
                }
            }
        }

        // If path doesn't match any category
        result.error = 'Path does not match any allowed category';
        result.details.suggestions = [
            'Use paths within the project scope',
            'Allowed categories: WORKSPACE, DOCS_CONFIG, SOURCE_CODE, TESTS, TEMP_LOGS, WORK_REPORTS, ARCHIVE, BUILD_DIST',
            'Examples: src/, docs/, tests/, work/reports/, tmp/'
        ];

        return result;
    } catch (error) {
        result.error = 'Validation error: ' + error.message;
        return result;
    }
}

// Validate filesystem parameters
function validateFsParams(action, args) {
    const errors = [];
    const validated = {};

    switch (action) {
        case 'list':
        case 'read':
        case 'delete':
            if (typeof args.path !== 'string') {
                errors.push('path: must be a string');
            } else {
                const trimmed = args.path.trim();
                if (!trimmed) {
                    errors.push('path: cannot be empty');
                } else {
                    // Validate path with categories
                    const pathValidation = validatePathWithCategories(trimmed, action);
                    if (!pathValidation.isValid) {
                        errors.push('path: ' + pathValidation.error);
                        if (pathValidation.details.suggestions.length > 0) {
                            errors.push('Suggestions: ' + pathValidation.details.suggestions.join(', '));
                        }
                    } else {
                        validated.path = trimmed;
                        validated.pathCategory = pathValidation.category;
                        validated.pathDetails = pathValidation.details;
                    }
                }
            }
            break;

        case 'write':
            if (typeof args.path !== 'string') {
                errors.push('path: must be a string');
            } else {
                const trimmed = args.path.trim();
                if (!trimmed) {
                    errors.push('path: cannot be empty');
                } else {
                    // Validate path with categories
                    const pathValidation = validatePathWithCategories(trimmed, action);
                    if (!pathValidation.isValid) {
                        errors.push('path: ' + pathValidation.error);
                        if (pathValidation.details.suggestions.length > 0) {
                            errors.push('Suggestions: ' + pathValidation.details.suggestions.join(', '));
                        }
                    } else {
                        validated.path = trimmed;
                        validated.pathCategory = pathValidation.category;
                        validated.pathDetails = pathValidation.details;
                    }
                }
            }
            if (typeof args.content !== 'string') {
                errors.push('content: must be a string');
            } else {
                validated.content = args.content;
            }
            if (args.mode !== undefined) {
                if (typeof args.mode !== 'string') {
                    errors.push('mode: must be a string');
                } else {
                    validated.mode = args.mode;
                }
            }
            break;

        case 'copy':
        case 'move':
            if (typeof args.source !== 'string') {
                errors.push('source: must be a string');
            } else {
                const trimmed = args.source.trim();
                if (!trimmed) {
                    errors.push('source: cannot be empty');
                } else {
                    // Validate source path with categories
                    const sourceValidation = validatePathWithCategories(trimmed, action);
                    if (!sourceValidation.isValid) {
                        errors.push('source: ' + sourceValidation.error);
                        if (sourceValidation.details.suggestions.length > 0) {
                            errors.push('Suggestions: ' + sourceValidation.details.suggestions.join(', '));
                        }
                    } else {
                        validated.source = trimmed;
                        validated.sourceCategory = sourceValidation.category;
                        validated.sourceDetails = sourceValidation.details;
                    }
                }
            }
            if (typeof args.destination !== 'string') {
                errors.push('destination: must be a string');
            } else {
                const trimmed = args.destination.trim();
                if (!trimmed) {
                    errors.push('destination: cannot be empty');
                } else {
                    // Validate destination path with categories
                    const destValidation = validatePathWithCategories(trimmed, action);
                    if (!destValidation.isValid) {
                        errors.push('destination: ' + destValidation.error);
                        if (destValidation.details.suggestions.length > 0) {
                            errors.push('Suggestions: ' + destValidation.details.suggestions.join(', '));
                        }
                    } else {
                        validated.destination = trimmed;
                        validated.destinationCategory = destValidation.category;
                        validated.destinationDetails = destValidation.details;
                    }
                }
            }
            break;
    }

    // Additional parameters
    if (action === 'read') {
        if (args.start !== undefined) {
            const start = Number(args.start);
            if (!validationUtils.isNumber(start) || !Number.isFinite(start) || start < 0) {
                errors.push('start: must be a non-negative number');
            } else {
                validated.start = Math.floor(start);
            }
        }
        if (args.end !== undefined) {
            const end = Number(args.end);
            if (!validationUtils.isNumber(end) || !Number.isFinite(end) || end < 0) {
                errors.push('end: must be a non-negative number');
            } else {
                validated.end = Math.floor(end);
            }
        }
    }

    if (action === 'delete' && args.recursive !== undefined) {
        if (typeof args.recursive !== 'boolean') {
            errors.push('recursive: must be a boolean');
        } else {
            validated.recursive = args.recursive;
        }
    }

    return {errors, validated};
}

module.exports = {
    validateAndResolveCwd,
    validateExecRunParams,
    validatePathWithCategories,
    validateFsParams
};