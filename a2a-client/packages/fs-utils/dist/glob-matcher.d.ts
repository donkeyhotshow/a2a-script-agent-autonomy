/**
 * Glob Matcher - match glob patterns with Windows path support
 */
export declare class GlobMatcher {
    static PATTERNS: {
        readonly PHP: readonly ["**/*.php"];
        readonly JS: readonly ["**/*.js", "**/*.mjs", "**/*.cjs"];
        readonly TS: readonly ["**/*.ts", "**/*.tsx"];
        readonly VUE: readonly ["**/*.vue"];
        readonly JSON: readonly ["**/*.json"];
        readonly MD: readonly ["**/*.md"];
        readonly CODE: readonly ["**/*.php", "**/*.js", "**/*.ts", "**/*.tsx", "**/*.vue", "**/*.py", "**/*.java", "**/*.go"];
        readonly CONFIG: readonly ["**/*.json", "**/*.yaml", "**/*.yml", "**/*.toml", "**/*.ini"];
        readonly EXCLUDE: readonly ["node_modules/**", "vendor/**", ".git/**", "dist/**", "build/**", "storage/**", ".a2a/**", "**/*.min.js", "**/*.min.css"];
    };
    private compiledPatterns;
    constructor(patterns?: string | string[]);
    private compilePattern;
    match(filePath: string): boolean;
    static match(pattern: string | string[], filePath: string): boolean;
    getMatchingPatterns(filePath: string): string[];
}
