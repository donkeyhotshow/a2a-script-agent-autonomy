/*
 * SearchEngine: гибкий поиск по коду и пакетное применение правок
 * Использует внешний индексатор при наличии: C:\\apps\\usr\\share\\libs\\search-indexer
 */
const {fileSystemUtils} = require('@libs/system/file-operations/index.js');
const {errorUtils} = require('@libs/error-management/error-handler/error-utils.cjs');

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
        process.stderr.write(`[MCP-SERVER-WARN] validation-utils.cjs not found or invalid in SearchEngine.cjs: ${validationError.message}\n`);
    }
    validationUtils = {
        validate: () => ({ errors: [] }),
        isString: (val) => typeof val === 'string',
        isNumber: (val) => typeof val === 'number',
        isArray: (val) => Array.isArray(val),
        isFunction: (val) => typeof val === 'function',
    };
}

const fs = require('fs');

const path = require('path');

// Константы

const DEFAULT_EXCLUDE_PATTERNS = [
    '**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**',
    '**/coverage/**', '**/.next/**', '**/out/**', '**/tmp/**', '**/logs/**',
    '**/.DS_Store', '**/Thumbs.db'
];


const DEFAULT_MAX_FILE_SIZE_KB = 512;

const DEFAULT_MAX_MATCHES = 1000;

const DEFAULT_MAX_MATCHES_PER_FILE = 100;

const DEFAULT_CONTEXT_BEFORE = 2;

const DEFAULT_CONTEXT_AFTER = 2;

// Валидация параметров


function validateSearchParams(params) {
    const errors = [];

    if (!params.query || typeof params.query !== 'string') {
        errors.push('query: required non-empty string');
    }

    if (params.isRegex && typeof params.isRegex !== 'boolean') {
        errors.push('isRegex: must be boolean');
    }

    if (params.caseInsensitive && typeof params.caseInsensitive !== 'boolean') {
        errors.push('caseInsensitive: must be boolean');
    }

    if (params.include && !validationUtils.isArray(params.include)) {
        errors.push('include: must be array');
    }

    if (params.exclude && !validationUtils.isArray(params.exclude)) {
        errors.push('exclude: must be array');
    }

    if (params.contextBefore !== undefined && (!Number.isInteger(params.contextBefore) || params.contextBefore < 0)) {
        errors.push('contextBefore: must be non-negative integer');
    }

    if (params.contextAfter !== undefined && (!Number.isInteger(params.contextAfter) || params.contextAfter < 0)) {
        errors.push('contextAfter: must be non-negative integer');
    }

    if (params.maxMatches !== undefined && (!Number.isInteger(params.maxMatches) || params.maxMatches <= 0)) {
        errors.push('maxMatches: must be positive integer');
    }

    if (params.maxMatchesPerFile !== undefined && (!Number.isInteger(params.maxMatchesPerFile) || params.maxMatchesPerFile <= 0)) {
        errors.push('maxMatchesPerFile: must be positive integer');
    }

    if (params.maxFileSizeKB !== undefined && (!Number.isInteger(params.maxFileSizeKB) || params.maxFileSizeKB <= 0)) {
        errors.push('maxFileSizeKB: must be positive integer');
    }

    return errors;
}


function validateEditParams(edits, options) {
    const errors = [];

    if (!validationUtils.isArray(edits) || edits.length === 0) {
        errors.push('edits: required non-empty array');
        return errors;
    }

    edits.forEach((edit, index) => {
        if (!edit || typeof edit !== 'object') {
            errors.push(`edits[${index}]: must be object`);
            return;
        }

        if (!edit.file || typeof edit.file !== 'string') {
            errors.push(`edits[${index}].file: required string`);
        }

        if (!edit.before || typeof edit.before !== 'string') {
            errors.push(`edits[${index}].before: required non-empty string`);
        }

        if (edit.after !== undefined && typeof edit.after !== 'string') {
            errors.push(`edits[${index}].after: must be string`);
        }

        if (edit.mode !== undefined && !['single', 'all'].includes(edit.mode)) {
            errors.push(`edits[${index}].mode: must be 'single' or 'all'`);
        }

        if (edit.index !== undefined && (!Number.isInteger(edit.index) || edit.index < 0)) {
            errors.push(`edits[${index}].index: must be non-negative integer`);
        }
    });

    if (options && options.makeBackup !== undefined && typeof options.makeBackup !== 'boolean') {
        errors.push('options.makeBackup: must be boolean');
    }

    return errors;
}


function tryRequireExternalIndexer() {
    try {
        const mod = require('C:\\apps\\usr\\share\\libs\\search-indexer');
        return mod || null;
    } catch (err) {
        // Внешний индексатор опционален
        return null;
    }
}


function normalizePath(p) {
    return p.split('\\').join('/');
}


function makeRegexFromGlob(glob) {
    const escaped = glob
        .replace(/[.+^${}()|\[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
    return new RegExp('^' + escaped + '$');
}


function shouldIncludeFile(relPath, includeGlobs, excludeGlobs) {
    const rel = normalizePath(relPath);
    const excludes = excludeGlobs.map(makeRegexFromGlob);
    for (const r of excludes) {
        if (r.test(rel)) return false;
    }
    if (includeGlobs.length === 0) return true;
    const includes = includeGlobs.map(makeRegexFromGlob);
    return includes.some((r) => r.test(rel));
}


function listFilesRecursive(rootDir, options) {
    const {
        include = [],
        exclude = DEFAULT_EXCLUDE_PATTERNS,
        maxFileSizeKB = DEFAULT_MAX_FILE_SIZE_KB,
    } = options || {};

    const res = [];
    const errors = [];

    function walk(dir) {
        try {
            const items = fs.readdirSync(dir, {withFileTypes: true});
            for (const it of items) {
                const ap = fileSystemUtils.join(dir, it.name);
                const rp = path.relative(rootDir, ap);

                if (it.isDirectory()) {
                    // Быстрая фильтрация директорий по exclude (если шаблон оканчивается на /**)
                    const dirRel = normalizePath(rp) + '/';
                    if (exclude.some((g) => g.endsWith('/**') && makeRegexFromGlob(g).test(dirRel))) {
                        continue;
                    }
                    walk(ap);
                } else if (it.isFile()) {
                    if (!shouldIncludeFile(rp, include, exclude)) continue;
                    try {
                        const st = fs.statSync(ap);
                        if (st.size > maxFileSizeKB * 1024) continue;
                        res.push(ap);
                    } catch (err) {
                        errors.push(`stat failed for ${ap}: ${err.message}`);
                    }
                }
            }
        } catch (err) {
            errors.push(`walk failed for ${dir}: ${err.message}`);
        }
    }

    walk(rootDir);
    return {files: res, errors};
}

        function computeContext(lines, idx, before, after) {
            const start = Math.max(0, idx - before);
            const end = Math.min(lines.length - 1, idx + after);
            const beforeLines = lines.slice(start, idx);
            const afterLines = lines.slice(idx + 1, end + 1);
            return {beforeLines, afterLines};
        }


function defaultSearchInFile(filePath, query, options) {
    const {
        isRegex = false,
        caseInsensitive = false,
        contextBefore = DEFAULT_CONTEXT_BEFORE,
        contextAfter = DEFAULT_CONTEXT_AFTER,
        maxMatchesPerFile = DEFAULT_MAX_MATCHES_PER_FILE,
    } = options || {};

    let content;
    try {
        content = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        return {matches: [], errors: [`read failed for ${filePath}: ${err.message}`]};
    }

    const lines = content.split(/\r?\n/);
    let re = null;

    if (isRegex) {
        try {
            re = new RegExp(query, caseInsensitive ? 'i' : undefined);
        } catch (err) {
            return {matches: [], errors: [`invalid regex '${query}': ${err.message}`]};
        }
    }

    const matches = [];
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let found = false;
        let matchText = '';

        if (isRegex) {
            const m = line.match(re);
            if (m) {
                found = true;
                matchText = m[0];
            }
        } else {
            const hay = caseInsensitive ? line.toLowerCase() : line;
        const needle = caseInsensitive ? String(query).toLowerCase() : String(query);
        if (needle && hay.includes(needle)) {
            found = true;
            matchText = line;
        }
    }

    if (found) {
        const {beforeLines, afterLines} = computeContext(lines, i, contextBefore, contextAfter);
        const snippet = [...beforeLines, line, ...afterLines].join('\n');
        matches.push({
            file: filePath,
            startLine: i + 1,
            endLine: i + 1,
            before: beforeLines,
            match: line,
            after: afterLines,
            snippet,
            matchText
        });
        if (matches.length >= maxMatchesPerFile) break;
    }
}

return {matches};
}


function detectEol(s) {
    const hasCRLF = /\r\n/.test(s);
    const hasLF = /\n/.test(s);
    if (hasCRLF) return '\r\n';
    if (hasLF) return '\n';
    return '\n';
}


function findMatches(rootDir, params = {}) {
    // Валидация параметров
    const validationErrors = validateSearchParams(params);
    if (validationErrors.length > 0) {
        return {
            success: false,
            error: validationErrors.join('; '),
            validationErrors
        };
    }

    const {
        query,
        isRegex = false,
        caseInsensitive = false,
        include = [],
        exclude = [],
        contextBefore = DEFAULT_CONTEXT_BEFORE,
        contextAfter = DEFAULT_CONTEXT_AFTER,
        maxMatches = DEFAULT_MAX_MATCHES,
        maxMatchesPerFile = DEFAULT_MAX_MATCHES_PER_FILE,
        maxFileSizeKB = DEFAULT_MAX_FILE_SIZE_KB,
    } = params;

    const external = tryRequireExternalIndexer();
    const {files, errors: fileErrors} = listFilesRecursive(rootDir, {
        include,
        exclude,
        maxFileSizeKB
    });

    const all = [];
    const searchErrors = [];

    for (const f of files) {
        let m;
        if (external && validationUtils.isFunction(external.searchInFile)) {
            try {
                m = external.searchInFile(f, {
                    query,
                    isRegex,
                    caseInsensitive,
                    contextBefore,
                    contextAfter,
                    maxMatchesPerFile
                });
            } catch (err) {
                searchErrors.push(`${f}: external search failed: ${err.message}`);
                continue;
            }
        } else {
            m = defaultSearchInFile(f, query, {
                isRegex,
                caseInsensitive,
                contextBefore,
                contextAfter,
                maxMatchesPerFile
            });
        }

        if (m.error) {
            searchErrors.push(`${f}: ${m.error}`);
        } else if (validationUtils.isArray(m.matches) && m.matches.length) {
            for (const it of m.matches) {
                all.push(it);
                if (all.length >= maxMatches) break;
            }
        }

        if (all.length >= maxMatches) break;
    }

    return {
        success: true,
        matches: all,
        stats: {
            filesScanned: files.length,
            matches: all.length,
            errors: fileErrors.length + searchErrors.length
        },
        errors: [...fileErrors, ...searchErrors]
    };
}


function applyEdits(edits = [], options = {}) {
    // Валидация параметров
    const validationErrors = validateEditParams(edits, options);
    if (validationErrors.length > 0) {
        return {
            success: false,
            error: validationErrors.join('; '),
            validationErrors
        };
    }

    const {rootDir = process.cwd(), makeBackup = true} = options;
    const results = [];

    for (const edit of edits) {
        const filePath = path.isAbsolute(edit.file) ? edit.file : fileSystemUtils.join(rootDir, edit.file);

        if (!fileSystemUtils.existsSync(filePath)) {
            results.push({
                ok: false,
                file: filePath,
                error: 'file not found'
            });
            continue;
        }

        let content;
        try {
            content = fs.readFileSync(filePath, 'utf8');
        } catch (e) {
            results.push({
                ok: false,
                file: filePath,
                error: `failed to read file: ${e.message}`,
            });
            continue;
        }

    const eol = detectEol(content);
    const before = String(edit.before ?? '');
    const afterRaw = String(edit.after ?? '');
    const after = afterRaw.replace(/\r?\n/g, eol);

    if (!before) {
        results.push({
            ok: false,
            file: filePath,
            error: 'before: required non-empty string'
        });
        continue;
    }

    const escaped = before.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const occurrences = (content.match(new RegExp(escaped, 'g')) || []).length;

    if (occurrences === 0) {
        results.push({
            ok: false,
            file: filePath,
            error: 'before not found'
        });
        continue;
    }

    let newContent = content;
    let mode = edit.mode;

    if (mode === 'all') {
        newContent = content.split(before).join(after);
    } else if (Number.isInteger(edit.index) && edit.index >= 0) {
        if (edit.index >= occurrences) {
            results.push({
                ok: false,
                file: filePath,
                error: `index ${edit.index} out of range (0-${occurrences - 1})`
            });
            continue;
        }
        let count = -1;
        newContent = content.replace(new RegExp(escaped, 'g'), (m) => {
            count += 1;
            return count === edit.index ? after : m;
        });
        mode = 'index';
    } else {
        if (occurrences !== 1) {
            results.push({
                ok: false,
                file: filePath,
                error: `before not unique (${occurrences} occurrences). Use mode: 'all' or specify index`
            });
            continue;
        }
        newContent = content.replace(before, after);
        mode = 'single';
    }

            try {
                if (makeBackup) {
                    fs.writeFileSync(filePath + '.bak', content, 'utf8');
                }
                const tmp = filePath + '.tmp';
                fs.writeFileSync(tmp, newContent, 'utf8');
                fileSystemUtils.rename(tmp, filePath);
                results.push({
                    ok: true,
                    file: filePath,
                    replaced: occurrences,
                    mode: mode,
                    backupCreated: makeBackup
                });
            } catch (e) {
                results.push({
                    ok: false,
                    file: filePath,
                    error: `failed to apply edit: ${e.message}`
                });
            }
        }

        return {
            success: results.every((r) => r.ok),
            results,
            summary: {
                total: results.length,
                successful: results.filter(r => r.ok).length,
                failed: results.filter(r => !r.ok).length
            }
        };
}

// Дополнительные утилиты


function getFileInfo(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return {
            exists: true,
            size: stats.size,
            modified: stats.mtime,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory()
        };
    } catch (err) {
        return {
            exists: false,
            error: err.message
        };
    }
}


function validateRegex(pattern) {
    try {
        new RegExp(pattern);
        return {valid: true};
    } catch (err) {
        return {valid: false, error: err.message};
    }
}


module.exports = {
    findMatches,
    applyEdits,
    getFileInfo,
    validateRegex,
    // Константы для тестирования
    DEFAULT_EXCLUDE_PATTERNS,
    DEFAULT_MAX_FILE_SIZE_KB,
    DEFAULT_MAX_MATCHES,
    DEFAULT_MAX_MATCHES_PER_FILE,
    DEFAULT_CONTEXT_BEFORE,
    DEFAULT_CONTEXT_AFTER
};

