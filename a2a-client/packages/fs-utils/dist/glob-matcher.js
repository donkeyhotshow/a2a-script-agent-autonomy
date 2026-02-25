"use strict";
/**
 * Glob Matcher - match glob patterns with Windows path support
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobMatcher = void 0;
const PATTERNS = {
    PHP: ['**/*.php'],
    JS: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    TS: ['**/*.ts', '**/*.tsx'],
    VUE: ['**/*.vue'],
    JSON: ['**/*.json'],
    MD: ['**/*.md'],
    CODE: ['**/*.php', '**/*.js', '**/*.ts', '**/*.tsx', '**/*.vue', '**/*.py', '**/*.java', '**/*.go'],
    CONFIG: ['**/*.json', '**/*.yaml', '**/*.yml', '**/*.toml', '**/*.ini'],
    EXCLUDE: [
        'node_modules/**', 'vendor/**', '.git/**', 'dist/**', 'build/**',
        'storage/**', '.a2a/**', '**/*.min.js', '**/*.min.css',
    ],
};
class GlobMatcher {
    constructor(patterns = []) {
        const arr = Array.isArray(patterns) ? patterns : [patterns];
        this.compiledPatterns = arr.map((p) => this.compilePattern(p));
    }
    compilePattern(pattern) {
        let regexStr = '';
        let i = 0;
        while (i < pattern.length) {
            const char = pattern[i];
            if (char === '*' && pattern[i + 1] === '*') {
                if (pattern[i + 2] === '/') {
                    regexStr += '(?:.*[/\\\\])?';
                    i += 3;
                }
                else {
                    regexStr += '.*';
                    i += 2;
                }
            }
            else if (char === '*') {
                regexStr += '[^/\\\\]*';
                i++;
            }
            else if (char === '/') {
                regexStr += '[/\\\\]';
                i++;
            }
            else if ('.+?^${}()|[]\\'.includes(char)) {
                regexStr += '\\' + char;
                i++;
            }
            else {
                regexStr += char;
                i++;
            }
        }
        regexStr = '^' + regexStr + '$';
        return { pattern, regex: new RegExp(regexStr, 'i') };
    }
    match(filePath) {
        const normalizedPath = filePath.replace(/\\/g, '/');
        return this.compiledPatterns.some(({ regex }) => regex.test(normalizedPath));
    }
    static match(pattern, filePath) {
        const matcher = new GlobMatcher(pattern);
        return matcher.match(filePath);
    }
    getMatchingPatterns(filePath) {
        const normalizedPath = filePath.replace(/\\/g, '/');
        return this.compiledPatterns
            .filter(({ regex }) => regex.test(normalizedPath))
            .map(({ pattern }) => pattern);
    }
}
exports.GlobMatcher = GlobMatcher;
GlobMatcher.PATTERNS = PATTERNS;
