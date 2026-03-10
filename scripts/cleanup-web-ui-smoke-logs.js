#!/usr/bin/env node

/**
 * Web UI Smoke Test Log Cleanup Script
 * Rotates and cleans up old log files
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'a2a-client', 'tests', 'logs', 'web-ui-smoke');
const ARCHIVE_DIR = path.join(LOG_DIR, 'archive');

class LogCleanup {
    constructor() {
        this.now = new Date();
        this.retention = {
            testResults: 50,      // Keep last 50 test runs
            infraLogs: 30,        // Keep last 30 days
            analysisReports: 10   // Keep last 10 analysis reports
        };
    }

    ensureArchiveDir() {
        if (!fs.existsSync(ARCHIVE_DIR)) {
            fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
        }
    }

    getFilesByType() {
        const files = fs.readdirSync(LOG_DIR);
        return {
            testResults: files.filter(f => f.startsWith('web-ui-smoke-enhanced-') && f.endsWith('.json')),
            infraLogs: files.filter(f => f.startsWith('infrastructure-') && f.endsWith('.log')),
            analysisReports: files.filter(f => f.startsWith('analysis-report-') && f.endsWith('.json')),
            archives: files.filter(f => f.startsWith('archive-'))
        };
    }

    extractTimestamp(filename) {
        const match = filename.match(/(\d{8}_\d{6}|\d{13})/);
        if (!match) return null;

        if (match[1].length === 15) { // timestamp
            return new Date(parseInt(match[1]));
        } else { // date format
            const dateStr = match[1].replace(/_/g, '').replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6');
            return new Date(dateStr);
        }
    }

    archiveFile(filePath, reason) {
        const filename = path.basename(filePath);
        const archiveName = `archive-${Date.now()}-${reason}-${filename}`;
        const archivePath = path.join(ARCHIVE_DIR, archiveName);

        try {
            fs.renameSync(filePath, archivePath);
            console.log(`Archived: ${filename} (${reason})`);
        } catch (error) {
            console.error(`Failed to archive ${filename}:`, error.message);
        }
    }

    cleanupTestResults(files) {
        if (files.length <= this.retention.testResults) return;

        const sorted = files
            .map(f => ({ name: f, timestamp: this.extractTimestamp(f) }))
            .filter(f => f.timestamp)
            .sort((a, b) => b.timestamp - a.timestamp);

        const toArchive = sorted.slice(this.retention.testResults);
        toArchive.forEach(file => {
            this.archiveFile(path.join(LOG_DIR, file.name), 'retention-limit');
        });
    }

    cleanupTimeBased(files, daysRetention, type) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysRetention);

        files.forEach(filename => {
            const timestamp = this.extractTimestamp(filename);
            if (timestamp && timestamp < cutoff) {
                this.archiveFile(path.join(LOG_DIR, filename), `${type}-age`);
            }
        });
    }

    cleanupAnalysisReports(files) {
        if (files.length <= this.retention.analysisReports) return;

        const sorted = files
            .map(f => ({ name: f, timestamp: this.extractTimestamp(f) }))
            .filter(f => f.timestamp)
            .sort((a, b) => b.timestamp - a.timestamp);

        const toArchive = sorted.slice(this.retention.analysisReports);
        toArchive.forEach(file => {
            this.archiveFile(path.join(LOG_DIR, file.name), 'analysis-retention');
        });
    }

    generateCleanupReport(before, after) {
        const report = {
            cleanupRun: this.now.toISOString(),
            retention: this.retention,
            before: before,
            after: after,
            archived: {
                testResults: before.testResults.length - after.testResults.length,
                infraLogs: before.infraLogs.length - after.infraLogs.length,
                analysisReports: before.analysisReports.length - after.analysisReports.length
            }
        };

        const reportPath = path.join(LOG_DIR, `cleanup-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\nCleanup report saved: ${reportPath}`);

        return report;
    }

    run() {
        console.log('Starting Web UI smoke test log cleanup...\n');

        this.ensureArchiveDir();

        const before = this.getFilesByType();
        console.log('Files before cleanup:');
        Object.entries(before).forEach(([type, files]) => {
            console.log(`  ${type}: ${files.length} files`);
        });
        console.log('');

        // Cleanup each type
        this.cleanupTestResults(before.testResults);
        this.cleanupTimeBased(before.infraLogs, this.retention.infraLogs, 'infra');
        this.cleanupAnalysisReports(before.analysisReports);

        const after = this.getFilesByType();
        console.log('\nFiles after cleanup:');
        Object.entries(after).forEach(([type, files]) => {
            console.log(`  ${type}: ${files.length} files`);
        });

        return this.generateCleanupReport(before, after);
    }
}

// Run cleanup if called directly
if (require.main === module) {
    const cleanup = new LogCleanup();
    cleanup.run();
}

module.exports = LogCleanup;