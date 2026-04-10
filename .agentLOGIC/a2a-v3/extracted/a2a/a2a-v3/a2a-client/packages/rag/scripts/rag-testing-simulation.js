/**
 * RAG Testing Simulation Script
 * Comprehensive testing framework for RAG system with performance metrics,
 * edge case testing, and detailed reporting
 * 
 * Usage: node rag-testing-simulation.js [options]
 * 
 * Options:
 *   --project-path <path>     Project path to index (default: C:\\workspace\\domain-platform\\websitestore.com.ua)
 *   --output-dir <dir>        Output directory for results (default: ./rag-test-results)
 *   --test-type <type>        Test type: all, performance, edge-cases, accuracy (default: all)
 *   --verbose                 Enable verbose logging
 *   --config <file>          Configuration file path
 */

import fs from 'fs/promises';
import path from 'path';
import { createRAG } from '../dist/index.js';
import { performance } from 'perf_hooks';

// Test configuration
const CONFIG = {
    projectPath: 'C:\\workspace\\domain-platform\\websitestore.com.ua',
    outputDir: './rag-test-results',
    verbose: false,
    testTypes: ['all', 'performance', 'edge-cases', 'accuracy'],
    defaultTestType: 'all'
};

// Test scenarios
const TEST_SCENARIOS = {
    // Performance tests
    performance: [
        {
            name: 'Simple keyword search',
            queries: [
                'backend architecture',
                'API services',
                'database migrations',
                'Vue components',
                'React store'
            ],
            expectedResults: 5,
            timeout: 5000
        },
        {
            name: 'Complex multi-term search',
            queries: [
                'authentication JWT login system',
                'middleware authentication security',
                'controller API endpoints',
                'service layer business logic',
                'database migrations Laravel'
            ],
            expectedResults: 3,
            timeout: 8000
        },
        {
            name: 'Long-tail queries',
            queries: [
                'How to implement JWT authentication in Laravel API',
                'Vue.js component export patterns and best practices',
                'Database migration strategies for large applications',
                'Middleware authentication patterns in web applications',
                'Service layer architecture in domain-driven design'
            ],
            expectedResults: 2,
            timeout: 10000
        }
    ],

    // Edge case tests
    edgeCases: [
        {
            name: 'Empty and whitespace queries',
            queries: ['', '   ', '\t\n', '  \t  \n  '],
            expectedResults: 0,
            shouldFail: true
        },
        {
            name: 'Special characters',
            queries: [
                'API@#$%^&*()',
                'JWT<>{}[]|\\',
                'Vue"\'`~',
                'React<>{}[]|\\',
                'database<>{}[]|\\'
            ],
            expectedResults: 0,
            shouldFail: false
        },
        {
            name: 'Unicode and international characters',
            queries: [
                'Шукаю документи по архітектурі бекенду.',
                'система авторизації JWT токени login register',
                'логінування API автентифікація тести',
                'Vue компоненти експорт',
                'React store використання'
            ],
            expectedResults: 2,
            shouldFail: false
        },
        {
            name: 'Very long queries',
            queries: [
                'This is a very long query that exceeds normal search patterns and might cause performance issues or unexpected behavior in the search system when processing extremely verbose and detailed search requests that are not typical for normal user interactions',
                'Another extremely long query that tests the limits of the search system by including numerous keywords and phrases that might be relevant to various aspects of the application architecture, including backend services, frontend components, database operations, and user authentication mechanisms',
                'Yet another long query that includes multiple technical terms like JavaScript, TypeScript, Vue.js, React, Node.js, Express, MongoDB, PostgreSQL, Redis, Docker, Kubernetes, and various other technologies that might be mentioned in the codebase documentation'
            ],
            expectedResults: 1,
            timeout: 15000,
            shouldFail: false
        },
        {
            name: 'SQL injection attempts',
            queries: [
                "'; DROP TABLE users; --",
                "' OR '1'='1",
                "admin'; --",
                "' UNION SELECT * FROM users --",
                "'; INSERT INTO users VALUES('hacker', 'password'); --"
            ],
            expectedResults: 0,
            shouldFail: false
        },
        {
            name: 'XSS attempts',
            queries: [
                '<script>alert("XSS")</script>',
                '<img src=x onerror=alert(1)>',
                'javascript:alert("XSS")',
                '<svg onload=alert(1)>',
                '"><script>alert("XSS")</script>'
            ],
            expectedResults: 0,
            shouldFail: false
        }
    ],

    // Accuracy tests
    accuracy: [
        {
            name: 'Domain-specific queries',
            queries: [
                'Laravel service container binding',
                'Vue.js composition API patterns',
                'React state management best practices',
                'Database migration rollback strategies',
                'API versioning middleware implementation'
            ],
            expectedResults: 3,
            timeout: 6000
        },
        {
            name: 'File type specific queries',
            queries: [
                'PHP class definitions and interfaces',
                'JavaScript/TypeScript component exports',
                'CSS/SCSS styling patterns',
                'HTML template structures',
                'JSON configuration files'
            ],
            expectedResults: 2,
            timeout: 5000
        },
        {
            name: 'Code pattern recognition',
            queries: [
                'function definitions and method signatures',
                'class inheritance and polymorphism',
                'async/await patterns',
                'error handling try-catch blocks',
                'dependency injection patterns'
            ],
            expectedResults: 3,
            timeout: 7000
        }
    ]
};

class RAGTestingSimulation {
    constructor(config = {}) {
        this.config = { ...CONFIG, ...config };
        this.results = {
            metadata: {
                timestamp: new Date().toISOString(),
                projectPath: this.config.projectPath,
                testType: this.config.testType || this.config.defaultTestType,
                nodeVersion: process.version,
                platform: process.platform
            },
            scenarios: [],
            summary: {
                totalScenarios: 0,
                passedScenarios: 0,
                failedScenarios: 0,
                totalQueries: 0,
                successfulQueries: 0,
                failedQueries: 0,
                averageResponseTime: 0,
                totalProcessingTime: 0
            }
        };
        this.rag = null;
        this.startTime = null;
    }

    async initialize() {
        console.log('=== RAG Testing Simulation ===\n');
        console.log(`Project Path: ${this.config.projectPath}`);
        console.log(`Output Directory: ${this.config.outputDir}`);
        console.log(`Test Type: ${this.config.testType || this.config.defaultTestType}`);
        console.log(`Verbose: ${this.config.verbose}\n`);

        try {
            // Create output directory
            await fs.mkdir(this.config.outputDir, { recursive: true });

            // Initialize RAG
            console.log('Loading RAG indexer...');
            this.rag = createRAG({ projectPath: this.config.projectPath });
            
            // Load index
            await this.rag.searcher.loadIndex();
            console.log('✅ Index loaded successfully!\n');

            return true;
        } catch (error) {
            console.error('❌ Failed to initialize RAG:', error.message);
            return false;
        }
    }

    async runTestSuite() {
        this.startTime = performance.now();
        const testType = this.config.testType || this.config.defaultTestType;

        if (testType === 'all') {
            await this.runAllTests();
        } else if (TEST_SCENARIOS[testType]) {
            await this.runTestType(testType, TEST_SCENARIOS[testType]);
        } else {
            console.error(`❌ Unknown test type: ${testType}`);
            console.log(`Available test types: ${this.config.testTypes.join(', ')}`);
            return false;
        }

        return true;
    }

    async runAllTests() {
        for (const [testType, scenarios] of Object.entries(TEST_SCENARIOS)) {
            console.log(`\n🧪 Running ${testType} tests...`);
            await this.runTestType(testType, scenarios);
        }
    }

    async runTestType(testType, scenarios) {
        for (const scenario of scenarios) {
            await this.runScenario(testType, scenario);
        }
    }

    async runScenario(testType, scenario) {
        console.log(`\n  📋 Scenario: ${scenario.name}`);
        console.log(`     Queries: ${scenario.queries.length}`);
        console.log(`     Expected results per query: ${scenario.expectedResults}`);
        console.log(`     Timeout: ${scenario.timeout || 10000}ms`);

        const scenarioResult = {
            testType,
            name: scenario.name,
            queries: [],
            passed: 0,
            failed: 0,
            averageResponseTime: 0,
            totalResponseTime: 0,
            success: false
        };

        let totalResponseTime = 0;

        for (const query of scenario.queries) {
            const queryResult = await this.runQuery(query, scenario);
            scenarioResult.queries.push(queryResult);
            totalResponseTime += queryResult.responseTime;

            if (queryResult.success) {
                scenarioResult.passed++;
            } else {
                scenarioResult.failed++;
            }
        }

        scenarioResult.totalResponseTime = totalResponseTime;
        scenarioResult.averageResponseTime = totalResponseTime / scenario.queries.length;
        scenarioResult.success = scenarioResult.failed === 0;

        this.results.scenarios.push(scenarioResult);
        this.results.summary.totalScenarios++;
        
        if (scenarioResult.success) {
            this.results.summary.passedScenarios++;
        } else {
            this.results.summary.failedScenarios++;
        }

        this.results.summary.totalQueries += scenario.queries.length;
        this.results.summary.successfulQueries += scenarioResult.passed;
        this.results.summary.failedQueries += scenarioResult.failed;

        const status = scenarioResult.success ? '✅' : '❌';
        console.log(`     Result: ${status} ${scenarioResult.passed}/${scenario.queries.length} queries passed`);
        console.log(`     Avg Response Time: ${scenarioResult.averageResponseTime.toFixed(2)}ms`);
    }

    async runQuery(query, scenario) {
        const startTime = performance.now();
        const queryResult = {
            query,
            success: false,
            responseTime: 0,
            error: null,
            results: [],
            resultCount: 0,
            expectedResults: scenario.expectedResults,
            shouldFail: scenario.shouldFail || false
        };

        try {
            const searchResults = await this.rag.searcher.search(query, { 
                limit: 10,
                timeout: scenario.timeout || 10000 
            });

            queryResult.responseTime = performance.now() - startTime;
            queryResult.results = searchResults.map(r => ({
                file: r.chunk.filePath,
                score: r.score,
                snippet: r.chunk.content.substring(0, 200)
            }));
            queryResult.resultCount = searchResults.length;

            // Determine success based on scenario expectations
            const hasResults = searchResults.length > 0;
            const meetsExpectations = searchResults.length >= scenario.expectedResults;

            if (scenario.shouldFail) {
                queryResult.success = !hasResults;
            } else {
                queryResult.success = meetsExpectations;
            }

        } catch (error) {
            queryResult.responseTime = performance.now() - startTime;
            queryResult.error = error.message;
            queryResult.success = scenario.shouldFail; // If we expect failure, error is success
        }

        return queryResult;
    }

    generateSummary() {
        const endTime = performance.now();
        this.results.summary.totalProcessingTime = endTime - this.startTime;
        this.results.summary.averageResponseTime = this.results.scenarios.reduce(
            (acc, scenario) => acc + scenario.averageResponseTime, 0
        ) / this.results.scenarios.length;

        const successRate = (this.results.summary.passedScenarios / this.results.summary.totalScenarios) * 100;
        const querySuccessRate = (this.results.summary.successfulQueries / this.results.summary.totalQueries) * 100;

        return {
            ...this.results.summary,
            successRate: successRate.toFixed(2),
            querySuccessRate: querySuccessRate.toFixed(2),
            scenariosByType: this.groupScenariosByType()
        };
    }

    groupScenariosByType() {
        const groups = {};
        this.results.scenarios.forEach(scenario => {
            if (!groups[scenario.testType]) {
                groups[scenario.testType] = {
                    total: 0,
                    passed: 0,
                    failed: 0,
                    scenarios: []
                };
            }
            groups[scenario.testType].total++;
            groups[scenario.testType].scenarios.push(scenario);
            if (scenario.success) {
                groups[scenario.testType].passed++;
            } else {
                groups[scenario.testType].failed++;
            }
        });
        return groups;
    }

    async saveResults() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFile = path.join(this.config.outputDir, `simulation-results-${timestamp}.json`);
        const summaryFile = path.join(this.config.outputDir, `simulation-summary-${timestamp}.json`);

        // Save detailed results
        await fs.writeFile(outputFile, JSON.stringify(this.results, null, 2));
        console.log(`\n📄 Detailed results saved to: ${outputFile}`);

        // Save summary
        const summary = this.generateSummary();
        await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
        console.log(`📄 Summary saved to: ${summaryFile}`);

        // Save human-readable report
        const reportFile = path.join(this.config.outputDir, `simulation-report-${timestamp}.md`);
        await fs.writeFile(reportFile, this.generateMarkdownReport(summary));
        console.log(`📄 Report saved to: ${reportFile}`);
    }

    generateMarkdownReport(summary) {
        const report = [
            '# RAG Testing Simulation Report',
            '',
            `**Generated:** ${new Date().toISOString()}`,
            `**Project Path:** ${this.config.projectPath}`,
            `**Test Type:** ${this.config.testType || this.config.defaultTestType}`,
            '',
            '## Summary',
            '',
            `| Metric | Value |`,
            `|--------|-------|`,
            `| Total Scenarios | ${summary.totalScenarios} |`,
            `| Passed Scenarios | ${summary.passedScenarios} |`,
            `| Failed Scenarios | ${summary.failedScenarios} |`,
            `| Success Rate | ${summary.successRate}% |`,
            `| Total Queries | ${summary.totalQueries} |`,
            `| Successful Queries | ${summary.successfulQueries} |`,
            `| Failed Queries | ${summary.failedQueries} |`,
            `| Query Success Rate | ${summary.querySuccessRate}% |`,
            `| Average Response Time | ${summary.averageResponseTime.toFixed(2)}ms |`,
            `| Total Processing Time | ${summary.totalProcessingTime.toFixed(2)}ms |`,
            '',
            '## Scenarios by Type',
            ''
        ];

        Object.entries(summary.scenariosByType).forEach(([type, data]) => {
            report.push(`### ${type.toUpperCase()}`);
            report.push('');
            report.push(`- **Total:** ${data.total}`);
            report.push(`- **Passed:** ${data.passed}`);
            report.push(`- **Failed:** ${data.failed}`);
            report.push(`- **Success Rate:** ${((data.passed / data.total) * 100).toFixed(2)}%`);
            report.push('');
            
            data.scenarios.forEach(scenario => {
                const status = scenario.success ? '✅' : '❌';
                report.push(`- ${status} **${scenario.name}** - ${scenario.passed}/${scenario.queries.length} queries passed (avg: ${scenario.averageResponseTime.toFixed(2)}ms)`);
            });
            report.push('');
        });

        report.push('## Detailed Results');
        report.push('');
        report.push('See the detailed JSON results file for complete query-level information.');

        return report.join('\n');
    }

    printFinalSummary() {
        const summary = this.generateSummary();
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 FINAL SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Scenarios: ${summary.totalScenarios}`);
        console.log(`Passed: ${summary.passedScenarios}`);
        console.log(`Failed: ${summary.failedScenarios}`);
        console.log(`Success Rate: ${summary.successRate}%`);
        console.log('');
        console.log(`Total Queries: ${summary.totalQueries}`);
        console.log(`Successful: ${summary.successfulQueries}`);
        console.log(`Failed: ${summary.failedQueries}`);
        console.log(`Query Success Rate: ${summary.querySuccessRate}%`);
        console.log('');
        console.log(`Average Response Time: ${summary.averageResponseTime.toFixed(2)}ms`);
        console.log(`Total Processing Time: ${summary.totalProcessingTime.toFixed(2)}ms`);
        console.log('='.repeat(60));

        // Print scenarios by type
        Object.entries(summary.scenariosByType).forEach(([type, data]) => {
            console.log(`\n${type.toUpperCase()} TESTS:`);
            console.log(`  Total: ${data.total}, Passed: ${data.passed}, Failed: ${data.failed}`);
            console.log(`  Success Rate: ${((data.passed / data.total) * 100).toFixed(2)}%`);
        });

        const overallSuccess = summary.failedScenarios === 0;
        console.log(`\n${overallSuccess ? '🎉' : '⚠️ '} Overall Result: ${overallSuccess ? 'SUCCESS' : 'FAILURE'}`);
    }
}

// CLI argument parsing
function parseArguments() {
    const args = process.argv.slice(2);
    const config = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        if (arg === '--project-path' && nextArg) {
            config.projectPath = nextArg;
            i++;
        } else if (arg === '--output-dir' && nextArg) {
            config.outputDir = nextArg;
            i++;
        } else if (arg === '--test-type' && nextArg) {
            config.testType = nextArg;
            i++;
        } else if (arg === '--verbose') {
            config.verbose = true;
        } else if (arg === '--config' && nextArg) {
            config.configFile = nextArg;
            i++;
        }
    }

    return config;
}

// Main execution
async function main() {
    try {
        const cliConfig = parseArguments();
        const config = { ...CONFIG, ...cliConfig };

        const simulation = new RAGTestingSimulation(config);
        
        const initialized = await simulation.initialize();
        if (!initialized) {
            process.exit(1);
        }

        const success = await simulation.runTestSuite();
        if (!success) {
            process.exit(1);
        }

        await simulation.saveResults();
        simulation.printFinalSummary();

        // Exit with appropriate code
        const summary = simulation.generateSummary();
        process.exit(summary.failedScenarios === 0 ? 0 : 1);

    } catch (error) {
        console.error('❌ Simulation failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { RAGTestingSimulation };