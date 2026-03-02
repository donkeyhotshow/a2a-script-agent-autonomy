/**
 * GlobMatcher unit tests
 */
const {GlobMatcher} = require('../dist/index');

describe('GlobMatcher', () => {
    describe('simple patterns', () => {
        it('matches *.php', () => {
            const matcher = new GlobMatcher('*.php');
            expect(matcher.match('test.php')).toBe(true);
            expect(matcher.match('file.txt')).toBe(false);
        });
    });

    describe('recursive patterns', () => {
        it('matches **/*.php', () => {
            const matcher = new GlobMatcher('**/*.php');
            expect(matcher.match('app.php')).toBe(true);
            expect(matcher.match('bootstrap/app.php')).toBe(true);
            expect(matcher.match('features/business/auth/app/Http/Controllers/AuthController.php')).toBe(true);
            expect(matcher.match('app.js')).toBe(false);
        });
    });

    describe('directory patterns', () => {
        it('matches node_modules/**', () => {
            const matcher = new GlobMatcher('node_modules/**');
            expect(matcher.match('node_modules/package/index.js')).toBe(true);
            expect(matcher.match('node_modules/package/sub/file.js')).toBe(true);
            expect(matcher.match('packages/agent/node_modules/test.js')).toBe(false);
        });
    });

    describe('multiple patterns', () => {
        it('matches array of patterns', () => {
            const matcher = new GlobMatcher(['**/*.php', '**/*.js']);
            expect(matcher.match('app.php')).toBe(true);
            expect(matcher.match('app.js')).toBe(true);
            expect(matcher.match('app.ts')).toBe(false);
        });
    });

    describe('Windows paths', () => {
        it('handles backslash paths', () => {
            const matcher = new GlobMatcher('**/*.php');
            expect(matcher.match('features\\business\\auth\\app.php')).toBe(true);
            expect(matcher.match('bootstrap\\app.php')).toBe(true);
        });
    });

    describe('preset patterns', () => {
        it('CODE matches code extensions', () => {
            const matcher = new GlobMatcher(GlobMatcher.PATTERNS.CODE);
            expect(matcher.match('app.php')).toBe(true);
            expect(matcher.match('app.js')).toBe(true);
            expect(matcher.match('app.ts')).toBe(true);
            expect(matcher.match('app.vue')).toBe(true);
            expect(matcher.match('app.json')).toBe(false);
        });

        it('EXCLUDE matches exclude dirs', () => {
            const matcher = new GlobMatcher(GlobMatcher.PATTERNS.EXCLUDE);
            expect(matcher.match('node_modules/package/index.js')).toBe(true);
            expect(matcher.match('vendor/autoload.php')).toBe(true);
            expect(matcher.match('.git/config')).toBe(true);
            expect(matcher.match('app/Controllers/UserController.php')).toBe(false);
        });
    });

    describe('edge cases', () => {
        it('empty pattern', () => {
            const matcher = new GlobMatcher('');
            expect(matcher.match('')).toBe(true);
            expect(matcher.match('test.php')).toBe(false);
        });

        it('pattern with dots in filename', () => {
            const matcher = new GlobMatcher('**/*.min.js');
            expect(matcher.match('app.min.js')).toBe(true);
            expect(matcher.match('app.js')).toBe(false);
        });
    });

    describe('static match', () => {
        it('GlobMatcher.match works', () => {
            expect(GlobMatcher.match('**/*.php', 'test.php')).toBe(true);
            expect(GlobMatcher.match('**/*.php', 'test.js')).toBe(false);
        });
    });
});
