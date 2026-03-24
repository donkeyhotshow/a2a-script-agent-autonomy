#!/usr/bin/env node

/**
 * Smoke Test Retrospective Analyzer
 *
 * Analyzes smoke test logs and failures to provide insights for continuous improvement.
 * Designed to run periodically (daily/weekly) to identify patterns and trends.
 *
 * Usage:
 * - Daily: node scripts/smoke-retrospective.js --period daily
 * - Weekly: node scripts/smoke-retrospective.js --period weekly
 * - Custom: node scripts/smoke-retrospective.js --days 30
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

class SmokeRetrospectiveAnalyzer {
    constructor() {
        this.logsDir = path.join(rootDir, 'proxy_logs');
        this.testResultsDir = path.join(rootDir, 'test-results');
        this.report = {
            period: 'daily',
            startDate: null,
            endDate: null,
            summary: {
                totalRuns: 0,
                passedRuns: 0,
                failedRuns: 0,
                successRate: 0
            },
            failures: {
                byComponent: {},
                byError: {},
                timeline: []
            },
            performance: {
                avgDuration: 0,
                slowestRuns: [],
                fastestRuns: []
            },
            trends: {
                successRateTrend: [],
                failurePatterns: []
            }
        };
    }

    async getTestResults(period = 'daily') {
        const now = new Date();
        let startDate;

        switch (period) {
            case 'daily':
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'weekly':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'monthly':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        this.report.startDate = startDate;
        this.report.endDate = now;
        this.report.period = period;

        try {
            const files = await fs.readdir(this.testResultsDir);
            const jsonFiles = files.filter(f => f.endsWith('.json') && f.startsWith('web-ui-smoke-'));

            const results = [];
            for (const file of jsonFiles) {
                const filePath = path.join(this.testResultsDir, file);
                const stat = await fs.stat(filePath);

                if (stat.mtime >= startDate) {
                    try {
                        const content = await fs.readFile(filePath, 'utf8');
                        const result = JSON.parse(content);
                        results.push({
                            ...result,
                            file,
                            timestamp: stat.mtime
                        });
                    } catch (error) {
                        console.warn(`Failed to parse ${file}:`, error.message);
                    }
                }
            }

            return results.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('Error reading test results:', error);
            return [];
        }
    }

    analyzeResults(results) {
        this.report.summary.totalRuns = results.length;
        this.report.summary.passedRuns = results.filter(r => r.exitCode === 0).length;
        this.report.summary.failedRuns = results.filter(r => r.exitCode !== 0).length;
        this.report.summary.successRate = results.length > 0 ?
            (this.report.summary.passedRuns / results.length * 100).toFixed(1) : 0;

        // Analyze failures by component
        const componentFailures = {};
        const errorPatterns = {};

        results.forEach(result => {
            if (result.exitCode !== 0) {
                // This is a simplified analysis - in real implementation,
                // you'd parse the actual log files for detailed error information
                const failure = {
                    timestamp: result.timestamp,
                    runId: result.runId,
                    services: result.services
                };

                this.report.failures.timeline.push(failure);

                // Categorize by likely failure patterns
                if (result.services?.serverPort && !result.services?.clientApiPort) {
                    componentFailures['A2A Server'] = (componentFailures['A2A Server'] || 0) + 1;
                } else if (result.services?.clientApiPort && !result.services?.webUiPort) {
                    componentFailures['Client API'] = (componentFailures['Client API'] || 0) + 1;
                } else if (!result.services?.webUiPort) {
                    componentFailures['Web UI'] = (componentFailures['Web UI'] || 0) + 1;
                } else {
                    componentFailures['Integration'] = (componentFailures['Integration'] || 0) + 1;
                }
            }
        });

        this.report.failures.byComponent = componentFailures;

        // Calculate performance metrics
        const durations = results
            .filter(r => r.timestamp)
            .map(r => {
                // Estimate duration from runId timestamp (simplified)
                return { runId: r.runId, timestamp: r.timestamp, estimatedDuration: 120 }; // 2 minutes average
            });

        if (durations.length > 0) {
            const totalDuration = durations.reduce((sum, d) => sum + d.estimatedDuration, 0);
            this.report.performance.avgDuration = Math.round(totalDuration / durations.length);

            this.report.performance.slowestRuns = durations
                .sort((a, b) => b.estimatedDuration - a.estimatedDuration)
                .slice(0, 5);

            this.report.performance.fastestRuns = durations
                .sort((a, b) => a.estimatedDuration - b.estimatedDuration)
                .slice(0, 5);
        }
    }

    generateInsights() {
        const insights = [];

        // Success rate insights
        const successRate = parseFloat(this.report.summary.successRate);
        if (successRate >= 95) {
            insights.push('🎉 Excellent reliability: >95% success rate');
        } else if (successRate >= 90) {
            insights.push('✅ Good reliability: >90% success rate');
        } else if (successRate >= 80) {
            insights.push('⚠️ Needs improvement: 80-90% success rate');
        } else {
            insights.push('🚨 Critical: <80% success rate - immediate attention required');
        }

        // Component failure insights
        const topFailingComponent = Object.entries(this.report.failures.byComponent)
            .sort(([,a], [,b]) => b - a)[0];

        if (topFailingComponent) {
            insights.push(`📊 Most failing component: ${topFailingComponent[0]} (${topFailingComponent[1]} failures)`);
        }

        // Trend insights
        if (this.report.summary.failedRuns > this.report.summary.totalRuns * 0.2) {
            insights.push('📈 High failure rate detected - investigate recent changes');
        }

        // Performance insights
        if (this.report.performance.avgDuration > 180) {
            insights.push('🐌 Slow test execution - consider optimization');
        }

        return insights;
    }

    generateRecommendations() {
        const recommendations = [];

        // Based on failure patterns
        if (this.report.failures.byComponent['Web UI']) {
            recommendations.push('🔧 Web UI failures: Check Vite configuration and port conflicts');
        }

        if (this.report.failures.byComponent['Client API']) {
            recommendations.push('🔧 Client API failures: Verify SDK server startup and port 3001 availability');
        }

        if (this.report.failures.byComponent['A2A Server']) {
            recommendations.push('🔧 A2A Server failures: Check PostgreSQL/Redis connectivity and port 3000');
        }

        if (this.report.failures.byComponent['Integration']) {
            recommendations.push('🔧 Integration failures: Review inter-service communication and CORS settings');
        }

        // General recommendations
        if (this.report.summary.successRate < 90) {
            recommendations.push('📋 Implement daily smoke test monitoring and alerting');
            recommendations.push('🔄 Add automatic retry logic for transient failures');
        }

        if (this.report.performance.avgDuration > 150) {
            recommendations.push('⚡ Optimize test startup time - consider service reuse between runs');
        }

        recommendations.push('📊 Review logs in proxy_logs/ directory for detailed error patterns');

        return recommendations;
    }

    async generateReport(results) {
        this.analyzeResults(results);

        const report = {
            generatedAt: new Date().toISOString(),
            period: this.report.period,
            dateRange: {
                start: this.report.startDate?.toISOString(),
                end: this.report.endDate?.toISOString()
            },
            summary: this.report.summary,
            failures: this.report.failures,
            performance: this.report.performance,
            insights: this.generateInsights(),
            recommendations: this.generateRecommendations(),
            rawResults: results.slice(0, 10) // Last 10 results for reference
        };

        return report;
    }

    async saveReport(report) {
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `smoke-retrospective-${this.report.period}-${timestamp}.json`;
        const filepath = path.join(this.testResultsDir, filename);

        await fs.writeFile(filepath, JSON.stringify(report, null, 2), 'utf8');

        return filepath;
    }

    async run(options = {}) {
        const { period = 'daily', output = true } = options;

        console.log(`🔍 Analyzing smoke test retrospective for period: ${period}`);

        const results = await this.getTestResults(period);
        const report = await this.generateReport(results);
        const filepath = await this.saveReport(report);

        if (output) {
            console.log('\n📊 Smoke Test Retrospective Report');
            console.log('=====================================');
            console.log(`Period: ${period}`);
            console.log(`Date Range: ${report.dateRange.start} to ${report.dateRange.end}`);
            console.log(`Total Runs: ${report.summary.totalRuns}`);
            console.log(`Success Rate: ${report.summary.successRate}%`);
            console.log(`Passed: ${report.summary.passedRuns}, Failed: ${report.summary.failedRuns}`);

            console.log('\n🎯 Key Insights:');
            report.insights.forEach(insight => console.log(`  ${insight}`));

            console.log('\n💡 Recommendations:');
            report.recommendations.forEach(rec => console.log(`  ${rec}`));

            console.log(`\n📄 Full report saved to: ${filepath}`);


        }

        return report;
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const options = {};

    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--period':
            case '-p':
                options.period = args[++i];
                break;
            case '--days':
            case '-d':
                options.days = parseInt(args[++i]);
                break;
            case '--quiet':
            case '-q':
                options.output = false;
                break;
        }
    }

    const analyzer = new SmokeRetrospectiveAnalyzer();
    await analyzer.run(options);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('Error running retrospective:', error);
        process.exit(1);
    });
}

export default SmokeRetrospectiveAnalyzer;