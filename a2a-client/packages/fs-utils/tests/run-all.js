/**
 * Запуск всех тестов @a2a/fs-utils
 */

const {execSync} = require('child_process');
const path = require('path');

const tests = [
    'glob-matcher.test.js',
    'ignore-detector.test.js',
    'file-scanner.test.js',
    'file-scanner.ignore.test.js',
];

console.log('=== Running all @a2a/fs-utils tests ===\n');

let totalPassed = 0;
let totalFailed = 0;

for (const test of tests) {
    console.log(`\n--- Running ${test} ---\n`);
    try {
        execSync(`node ${path.join(__dirname, test)}`, {stdio: 'inherit'});
    } catch (e) {
        process.exit(1); // fail-fast
    }
}

console.log('\n=== All tests completed ===');
