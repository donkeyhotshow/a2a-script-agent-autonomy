#!/usr/bin/env node

/**
 * Debug test runner for a2a-client
 *
 * Usage: node a2a-client/test-debug.js [test-pattern] [options]
 *
 * Examples:
 *   node a2a-client/test-debug.js                    # Run all tests
 *   node a2a-client/test-debug.js api-client         # Run api-client tests
 *   node a2a-client/test-debug.js flow               # Run flow tests
 *   node a2a-client/test-debug.js protocol           # Run protocol tests
 *   node a2a-client/test-debug.js nodes              # Run nodes tests
 *   node a2a-client/test-debug.js "tests/*"          # Run all tests in tests dir
 *   node a2a-client/test-debug.js --timeout 100      # Run with timeout
 */

const {spawn} = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
let PROJECT_ROOT = path.resolve(__dirname);
let CLIENT_ROOT = path.join(PROJECT_ROOT, 'a2a-client');
let VITEST_CONFIG = path.join(CLIENT_ROOT, 'vitest.config.js');

// Fix for when script is run from a2a-client directory
if (path.basename(PROJECT_ROOT) === 'a2a-client') {
    const parentDir = path.dirname(PROJECT_ROOT);
    if (path.basename(parentDir) === 'a2a-script-agent') {
        PROJECT_ROOT = parentDir;
        CLIENT_ROOT = path.join(PROJECT_ROOT, 'a2a-client');
        VITEST_CONFIG = path.join(CLIENT_ROOT, 'vitest.config.js');
    }
}

// Test patterns
const TEST_PATTERNS = {
    'api-client': 'tests/api-client.test.js',
    'flow-manager': 'tests/flow-manager.test.js',
    'nodes': 'tests/nodes.test.js',
    'protocol': 'tests/protocol.test.js',
    'vueflow-init': 'tests/vueflow-init.test.js',
    'all': 'tests/**/*.test.js'
};

// Colors for output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',

    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',

    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
    console.error(`${colors.bgRed}${colors.white}[ERROR]${colors.reset} ${message}`);
}

function logSuccess(message) {
    console.log(`${colors.bgGreen}${colors.white}[SUCCESS]${colors.reset} ${message}`);
}

function logInfo(message) {
    console.log(`${colors.bgBlue}${colors.white}[INFO]${colors.reset} ${message}`);
}

function logWarning(message) {
    console.log(`${colors.bgYellow}${colors.black}[WARNING]${colors.reset} ${message}`);
}

/**
 * Check if required files exist
 */
function checkPrerequisites() {
    logInfo('Checking prerequisites...');

    // Check if client directory exists
    if (!fs.existsSync(CLIENT_ROOT)) {
        logError(`Client directory not found: ${CLIENT_ROOT}`);
        return false;
    }

    // Check if package.json exists
    const packageJson = path.join(CLIENT_ROOT, 'package.json');
    if (!fs.existsSync(packageJson)) {
        logError(`package.json not found: ${packageJson}`);
        return false;
    }

    // Check if vitest config exists
    if (!fs.existsSync(VITEST_CONFIG)) {
        logWarning(`vitest.config.js not found: ${VITEST_CONFIG}`);
        logWarning('Using default vitest configuration');
    }

    // Check if test files exist
    const testFiles = [
        'tests/api-client.test.js',
        'tests/flow-manager.test.js',
        'tests/nodes.test.js',
        'tests/protocol.test.js',
        'tests/vueflow-init.test.js'
    ];

    testFiles.forEach(testFile => {
        const fullPath = path.join(CLIENT_ROOT, testFile);
        if (!fs.existsSync(fullPath)) {
            logWarning(`Test file not found: ${testFile}`);
        } else {
            logSuccess(`Found: ${testFile}`);
        }
    });

    return true;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    let pattern = null;
    let timeout = null;
    let debug = false;
    let verbose = false;

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--timeout' && i + 1 < args.length) {
            timeout = parseInt(args[++i], 10);
        } else if (arg === '--debug') {
            debug = true;
        } else if (arg === '--verbose' || arg === '-v') {
            verbose = true;
        } else if (arg === '--help' || arg === '-h') {
            return {help: true};
        } else if (!pattern && !arg.startsWith('--')) {
            // First non-flag argument is the pattern
            pattern = arg;
        }
    }

    // Resolve the pattern to the correct format
    let resolvedPattern;
    let type;

    if (!pattern) {
        type = 'all';
        resolvedPattern = null; // Use vitest config include patterns
    } else if (TEST_PATTERNS[pattern]) {
        type = pattern;
        resolvedPattern = TEST_PATTERNS[pattern];
    } else {
        type = 'custom';
        // Fix common pattern issues
        if (pattern === 'tests/*' || pattern === 'tests/') {
            resolvedPattern = null; // Use vitest config for "all" behavior
        } else if (pattern.includes('*') && !pattern.includes('**')) {
            // Convert tests/* to tests/**/* for proper glob matching
            resolvedPattern = pattern.replace(/\/\*$/, '/**/*');
        } else {
            resolvedPattern = pattern;
        }
    }

    return {type, pattern: resolvedPattern, timeout, debug, verbose};
}

/**
 * Run vitest with debug options
 */
function runVitest(pattern, options = {}) {
    return new Promise((resolve, reject) => {
        const patternInfo = pattern ? `with pattern: ${pattern}` : 'using config patterns';
        logInfo(`Running tests ${patternInfo}`);

        const vitestArgs = [
            'run',
            '--config', VITEST_CONFIG,
            '--reporter=verbose'
        ];

        // Add timeout if specified
        if (options.timeout) {
            vitestArgs.push('--test-timeout', options.timeout.toString());
        }

        // Add coverage if not disabled
        if (options.coverage !== false) {
            vitestArgs.push('--coverage');
        }

        // Add debug options
        if (options.debug) {
            vitestArgs.push('--inspect');
        }

        if (options.verbose) {
            vitestArgs.push('--reporter=verbose');
        }

        // Add pattern only for specific test files (not wildcards)
        // For wildcard patterns, let vitest use its config include
        if (pattern && (pattern.endsWith('.test.js') || pattern.includes('**/'))) {
            vitestArgs.push(pattern);
        }

        log(`Command: npx vitest ${vitestArgs.join(' ')}`);

        const child = spawn('npx', ['vitest', ...vitestArgs], {
            cwd: CLIENT_ROOT,
            stdio: 'inherit',
            shell: true
        });

        child.on('close', (code) => {
            if (code === 0) {
                logSuccess(`Tests completed successfully (exit code: ${code})`);
                resolve(code);
            } else {
                logError(`Tests failed (exit code: ${code})`);
                reject(new Error(`Test process exited with code ${code}`));
            }
        });

        child.on('error', (error) => {
            logError(`Failed to start test process: ${error.message}`);
            reject(error);
        });
    });
}

/**
 * Run specific test file with detailed output
 */
async function runSpecificTest(testFile, options = {}) {
    logInfo(`Running specific test: ${testFile}`);

    try {
        await runVitest(testFile, {verbose: true, ...options});
    } catch (error) {
        logError(`Test failed: ${error.message}`);
        throw error;
    }
}

/**
 * Run all tests
 */
async function runAllTests(options = {}) {
    logInfo('Running all tests...');

    try {
        // Use null pattern to let vitest use its config
        await runVitest(null, {verbose: true, ...options});
    } catch (error) {
        logError(`Tests failed: ${error.message}`);
        throw error;
    }
}

/**
 * Show test summary
 */
function showTestSummary() {
    log('\n' + '='.repeat(60));
    log('TEST SUMMARY', 'bright');
    log('='.repeat(60));

    log('\nAvailable test patterns:');
    Object.entries(TEST_PATTERNS).forEach(([key, pattern]) => {
        log(`  ${key.padEnd(15)} -> ${pattern}`);
    });

    log('\nUsage examples:');
    log('  node test-debug.js                    # Run all tests');
    log('  node test-debug.js api-client         # Run API client tests');
    log('  node test-debug.js flow-manager       # Run flow manager tests');
    log('  node test-debug.js nodes              # Run nodes tests');
    log('  node test-debug.js protocol           # Run protocol tests');
    log('  node test-debug.js vueflow-init       # Run VueFlow init tests');
    log('  node test-debug.js "tests/*.test.js"  # Custom pattern');
    log('  node test-debug.js "tests/*"          # All tests in tests dir');

    log('\nDebug options:');
    log('  --timeout <ms>  Set test timeout in milliseconds');
    log('  --debug         Enable Node.js inspector');
    log('  --verbose       Show detailed output');
    log('  --coverage      Generate coverage report');
    log('  --help          Show this help message');
}

/**
 * Main function
 */
async function main() {
    log('='.repeat(60), 'cyan');
    log('A2A Client Test Debug Runner', 'bright');
    log('='.repeat(60), 'cyan');

    // Parse arguments
    const {type, pattern, timeout, debug, verbose, help} = parseArgs();

    // Show help if requested
    if (help) {
        showTestSummary();
        return;
    }

    // Show help if no arguments
    if (!process.argv[2]) {
        showTestSummary();
        log('\nRunning all tests...\n');
    }

    // Check prerequisites
    if (!checkPrerequisites()) {
        process.exit(1);
    }

    // Build options object
    const options = {timeout, debug, verbose};

    try {
        // Run tests based on pattern
        switch (type) {
            case 'all':
                await runAllTests(options);
                break;

            case 'api-client':
            case 'flow-manager':
            case 'nodes':
            case 'protocol':
            case 'vueflow-init':
                await runSpecificTest(pattern, options);
                break;

            default:
                logInfo(`Running custom pattern: ${pattern}`);
                await runVitest(pattern, {verbose: true, ...options});
        }

        logSuccess('All tests completed successfully!');

    } catch (error) {
        logError(`Test execution failed: ${error.message}`);
        process.exit(1);
    }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logError(`Uncaught exception: ${error.message}`);
    logError(error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logError(`Unhandled rejection at: ${promise}, reason: ${reason}`);
    process.exit(1);
});

// Run if called directly
if (require.main === module) {
    main().catch((error) => {
        logError(`Unexpected error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = {runVitest, checkPrerequisites, parseArgs};
