#!/usr/bin/env node

/**
 * Web UI Smoke Test Log Analysis Script
 * Analyzes test results and generates reports
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'a2a-client', 'tests', 'logs', 'web-ui-smoke');

class LogAnalyzer {
    constructor() {
        this.results = [];
        this.infrastructureLogs = [];
    }

    loadLogs() {
        try {
            // Load test results
            const resultFiles = fs.readdirSync(LOG_DIR)
                .filter(file => file.startsWith('web-ui-smoke-enhanced-') && file.endsWith('.json'));

            this.results = resultFiles.map(file => {
                const content = fs.readFileSync(path.join(LOG_DIR, file), 'utf8');
                return { ...JSON.parse(content), filename: file };
            }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // Load infrastructure logs
            const infraFiles = fs.readdirSync(LOG_DIR)
                .filter(file => file.startsWith('infrastructure-') && file.endsWith('.log'));

            this.infrastructureLogs = infraFiles.map(file => ({
                filename: file,
                content: fs.readFileSync(path.join(LOG_DIR, file), 'utf8'),
                timestamp: this.extractTimestamp(file)
            })).sort((a, b) => b.timestamp - a.timestamp);

        } catch (error) {
            console.error('Error loading logs:', error.message);
        }
    }

    extractTimestamp(filename) {
        const match = filename.match(/\d{8}_\d{6}/);
        return match ? new Date(match[0].replace(/_/g, ' ').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')) : new Date(0);
    }

    analyzeTestResults() {
        if (this.results.length === 0) {
            console.log('No test results found.');
            return;
        }

        const latest = this.results[0];
        const last7Days = this.results.filter(r => {
            const testDate = new Date(r.timestamp);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return testDate >= weekAgo;
        });

        console.log('=== WEB UI SMOKE TEST ANALYSIS ===\n');

        console.log('LATEST TEST RESULT:');
        console.log(`Status: ${latest.status}`);
        console.log(`Timestamp: ${latest.timestamp}`);
        console.log(`Duration: ${latest.duration}ms`);
        console.log(`Passed: ${latest.passedTests}/${latest.totalTests}`);
        console.log('');

        console.log('LAST 7 DAYS SUMMARY:');
        const passed = last7Days.filter(r => r.status === 'passed').length;
        const failed = last7Days.filter(r => r.status === 'failed').length;
        console.log(`Total runs: ${last7Days.length}`);
        console.log(`Passed: ${passed} (${((passed/last7Days.length)*100).toFixed(1)}%)`);
        console.log(`Failed: ${failed} (${((failed/last7Days.length)*100).toFixed(1)}%)`);
        console.log('');

        // Analyze service health
        const serviceHealth = {
            server: 0,
            clientApi: 0,
            webUi: 0,
            docker: 0
        };

        last7Days.forEach(result => {
            if (result.results) {
                result.results.forEach(test => {
                    if (test.services) {
                        Object.keys(serviceHealth).forEach(service => {
                            if (test.services[service]) serviceHealth[service]++;
                        });
                    }
                });
            }
        });

        console.log('SERVICE HEALTH (last 7 days):');
        Object.entries(serviceHealth).forEach(([service, healthy]) => {
            const percentage = ((healthy / last7Days.length) * 100).toFixed(1);
            console.log(`${service}: ${healthy}/${last7Days.length} (${percentage}%)`);
        });
        console.log('');

        // Show recent failures
        const recentFailures = last7Days
            .filter(r => r.status === 'failed')
            .slice(0, 3);

        if (recentFailures.length > 0) {
            console.log('RECENT FAILURES:');
            recentFailures.forEach(failure => {
                console.log(`- ${failure.timestamp}: ${failure.failedTests?.length || 0} failed tests`);
                if (failure.results) {
                    failure.results.filter(r => r.status === 'failed').forEach(test => {
                        console.log(`  └─ ${test.testName}: ${test.error}`);
                    });
                }
            });
        }
    }

    generateReport() {
        const report = {
            generated: new Date().toISOString(),
            summary: {
                totalTestRuns: this.results.length,
                latestTestStatus: this.results[0]?.status,
                infrastructureLogCount: this.infrastructureLogs.length
            },
            recommendations: []
        };

        // Generate recommendations based on analysis
        const failureRate = this.results.filter(r => r.status === 'failed').length / this.results.length;
        if (failureRate > 0.2) {
            report.recommendations.push('High failure rate detected - investigate infrastructure stability');
        }

        const reportPath = path.join(LOG_DIR, `analysis-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\nAnalysis report saved: ${reportPath}`);

        return report;
    }

    run() {
        console.log('Loading Web UI smoke test logs...\n');
        this.loadLogs();

        this.analyzeTestResults();

        return this.generateReport();
    }
}

// Run analysis if called directly
if (require.main === module) {
    const analyzer = new LogAnalyzer();
    analyzer.run();
}

module.exports = LogAnalyzer;