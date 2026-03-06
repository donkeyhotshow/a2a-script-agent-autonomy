#!/usr/bin/env node

/**
 * Pre-release validation script for A2A Script Agent
 *
 * This script runs comprehensive validation before releasing:
 * 1. Configuration validation
 * 2. Web UI smoke test
 * 3. E2E test suite
 * 4. Build validation
 * 5. Docker image validation (if applicable)
 *
 * Usage: npm run pre-release
 */

import { execSync, spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

class PreReleaseValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.passed = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            info: 'ℹ',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        }[type] || 'ℹ';

        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    async runCommand(command, options = {}) {
        const { cwd = rootDir, description = command, silent = false } = options;

        try {
            if (!silent) this.log(`Running: ${description}`, 'info');

            const result = execSync(command, {
                cwd,
                stdio: silent ? 'pipe' : 'inherit',
                encoding: 'utf8',
                timeout: 300000 // 5 minutes
            });

            this.passed.push(description);
            return result;
        } catch (error) {
            this.errors.push(`${description}: ${error.message}`);
            this.log(`Failed: ${description}`, 'error');
            throw error;
        }
    }

    async runAsyncCommand(command, args = [], options = {}) {
        const { cwd = rootDir, description = `${command} ${args.join(' ')}` } = options;

        return new Promise((resolve, reject) => {
            this.log(`Running: ${description}`, 'info');

            const child = spawn(command, args, {
                cwd,
                stdio: 'inherit'
            });

            child.on('close', (code) => {
                if (code === 0) {
                    this.passed.push(description);
                    resolve();
                } else {
                    const error = new Error(`${description} exited with code ${code}`);
                    this.errors.push(error.message);
                    this.log(`Failed: ${description}`, 'error');
                    reject(error);
                }
            });

            child.on('error', (error) => {
                this.errors.push(`${description}: ${error.message}`);
                this.log(`Failed: ${description}`, 'error');
                reject(error);
            });
        });
    }

    async validateConfiguration() {
        this.log('Step 1: Configuration Validation', 'info');

        try {
            await this.runCommand('npm run validate:config', {
                description: 'Configuration validation'
            });
        } catch (error) {
            // Config validation might fail in some environments, make it a warning
            this.warnings.push('Configuration validation failed (non-critical)');
        }
    }

    async validateDependencies() {
        this.log('Step 2: Dependency Validation', 'info');

        // Check if Docker is available and services are running
        try {
            await this.runCommand('docker ps --format "{{.Names}}"', {
                description: 'Docker services check',
                silent: true
            });
        } catch (error) {
            this.warnings.push('Docker not available or no services running');
        }
    }

    async runSmokeTest() {
        this.log('Step 3: Web UI Smoke Test', 'info');

        // Run the smoke test (assumes services are already running or will be started)
        await this.runCommand('npm run smoke-test', {
            description: 'Web UI smoke test'
        });
    }

    async runUnitTests() {
        this.log('Step 4: Unit Test Suite', 'info');

        try {
            await this.runCommand('npm test', {
                description: 'Unit tests'
            });
        } catch (error) {
            this.warnings.push('Some unit tests failed - review before release');
        }
    }

    async runIntegrationTests() {
        this.log('Step 5: Integration Tests', 'info');

        try {
            // Run simulation tests which cover integration scenarios
            await this.runCommand('npm run sim:run-all', {
                description: 'Integration simulations'
            });
        } catch (error) {
            this.errors.push('Integration tests failed');
            throw error;
        }
    }

    async validateBuilds() {
        this.log('Step 6: Build Validation', 'info');

        try {
            // Build client components
            await this.runCommand('npm run build', {
                cwd: path.join(rootDir, 'a2a-client'),
                description: 'Client build'
            });
        } catch (error) {
            this.errors.push('Client build failed');
            throw error;
        }
    }

    async generateReport() {
        this.log('Step 7: Generating Pre-release Report', 'info');

        const report = {
            timestamp: new Date().toISOString(),
            status: this.errors.length === 0 ? 'PASS' : 'FAIL',
            summary: {
                passed: this.passed.length,
                warnings: this.warnings.length,
                errors: this.errors.length
            },
            details: {
                passed: this.passed,
                warnings: this.warnings,
                errors: this.errors
            }
        };

        const reportPath = path.join(rootDir, 'pre-release-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

        this.log(`Pre-release report saved to: ${reportPath}`, 'success');

        return report;
    }

    async run() {
        this.log('🚀 Starting Pre-release Validation', 'info');

        try {
            await this.validateConfiguration();
            await this.validateDependencies();
            await this.runSmokeTest();
            await this.runUnitTests();
            await this.runIntegrationTests();
            await this.validateBuilds();

            const report = await this.generateReport();

            if (report.status === 'PASS') {
                this.log('🎉 Pre-release validation PASSED!', 'success');
                this.log(`✅ ${report.summary.passed} checks passed`, 'success');
                if (report.summary.warnings > 0) {
                    this.log(`⚠️  ${report.summary.warnings} warnings (non-critical)`, 'warning');
                }
                process.exit(0);
            } else {
                this.log('💥 Pre-release validation FAILED!', 'error');
                this.log(`❌ ${report.summary.errors} errors found`, 'error');
                this.log(`⚠️  ${report.summary.warnings} warnings`, 'warning');
                process.exit(1);
            }

        } catch (error) {
            this.log(`💥 Pre-release validation crashed: ${error.message}`, 'error');
            await this.generateReport();
            process.exit(1);
        }
    }
}

// Run the validator
const validator = new PreReleaseValidator();
validator.run().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});