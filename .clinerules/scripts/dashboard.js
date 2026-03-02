#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

class WorkflowDashboard {
    constructor() {
        this.stateFile = '.clinerules/workflow-state.json';
        this.progressFile = '.clinerules/workflow-progress.json';
        this.logFile = '.clinerules/workflow-logs.json';
        this.state = null;
        this.progress = null;
        this.logs = null;
    }

    async initialize() {
        try {
            this.state = await this.loadState();
            this.progress = await this.loadProgress();
            this.logs = await this.loadLogs();
            console.log('✅ Dashboard initialized');
            return true;
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error.message);
            return false;
        }
    }

    async loadState() {
        try {
            const data = await fs.readFile(this.stateFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading state:', error.message);
            return null;
        }
    }

    async loadProgress() {
        try {
            const data = await fs.readFile(this.progressFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading progress:', error.message);
            return null;
        }
    }

    async loadLogs() {
        try {
            const data = await fs.readFile(this.logFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading logs:', error.message);
            return {decisions: [], errors: [], warnings: [], info: []};
        }
    }

    render() {
        if (!this.state) {
            console.log('❌ No active workflow found');
            return;
        }

        const {current_phase, progress_percentage, quality_metrics, session_id, priority_level} = this.state;
        const runtime = this.calculateRuntime();
        const recentDecisions = this.getRecentDecisions(5);
        const phaseProgress = this.getPhaseProgress();

        console.log('='.repeat(80));
        console.log('UNIFIED DOCUMENTATION WORKFLOW DASHBOARD');
        console.log('='.repeat(80));
        console.log(`Session ID: ${session_id}`);
        console.log(`Priority Level: ${priority_level.toUpperCase()}`);
        console.log(`Current Phase: ${current_phase.toUpperCase()}`);
        console.log(`Overall Progress: ${progress_percentage}%`);
        console.log(`Runtime: ${runtime}`);
        console.log('='.repeat(80));

        // Quality Metrics
        console.log('📊 QUALITY METRICS');
        console.log('-'.repeat(40));
        console.log(`Completion Rate: ${quality_metrics.completion_rate}%`);
        console.log(`Accuracy Score: ${quality_metrics.accuracy_score}%`);
        console.log(`Organization Score: ${quality_metrics.organization_score}%`);
        console.log('');

        // Phase Progress
        console.log('📈 PHASE PROGRESS');
        console.log('-'.repeat(40));
        if (this.progress && this.progress.phases) {
            Object.entries(this.progress.phases).forEach(([phase, phaseData]) => {
                const phasePercent = this.calculatePhaseProgress(phaseData);
                const statusIcon = phaseData.status === 'completed' ? '✅' :
                    phaseData.status === 'in_progress' ? '🔄' : '⏳';
                console.log(`${statusIcon} ${phase.toUpperCase()}: ${phasePercent}%`);

                if (phaseData.tasks) {
                    Object.entries(phaseData.tasks).forEach(([task, taskData]) => {
                        const taskIcon = taskData.status === 'completed' ? '✅' :
                            taskData.status === 'in_progress' ? '🔄' : '⏳';
                        const duration = taskData.duration ? ` (${Math.floor(taskData.duration / 1000)}s)` : '';
                        console.log(`  ${taskIcon} ${task}: ${taskData.status}${duration}`);
                    });
                }
                console.log('');
            });
        }

        // Recent Decisions
        console.log('📋 RECENT DECISIONS');
        console.log('-'.repeat(40));
        if (recentDecisions.length > 0) {
            recentDecisions.forEach((decision, index) => {
                console.log(`${index + 1}. ${decision.decision} (${decision.reasoning})`);
                console.log(`   Phase: ${decision.phase}.${decision.step}`);
                console.log(`   Time: ${new Date(decision.timestamp).toLocaleString()}`);
                console.log('');
            });
        } else {
            console.log('No decisions recorded yet.');
            console.log('');
        }

        // System Status
        console.log('🔧 SYSTEM STATUS');
        console.log('-'.repeat(40));
        const systemStatus = this.state.system_status || {};
        Object.entries(systemStatus).forEach(([key, value]) => {
            const statusIcon = value ? '✅' : '❌';
            console.log(`${statusIcon} ${key}: ${value}`);
        });
        console.log('');

        // Summary
        console.log('📋 SUMMARY');
        console.log('-'.repeat(40));
        const totalDecisions = this.logs.decisions.length;
        const errorCount = this.logs.errors.length;
        const warningCount = this.logs.warnings.length;

        console.log(`Total Decisions: ${totalDecisions}`);
        console.log(`Errors: ${errorCount}`);
        console.log(`Warnings: ${warningCount}`);
        console.log(`Active Tasks: ${this.state.pending_tasks.length}`);
        console.log(`Failed Tasks: ${this.state.failed_tasks.length}`);
        console.log('='.repeat(80));
    }

    calculateRuntime() {
        if (!this.state?.start_time) return '0 minutes';

        const start = new Date(this.state.start_time);
        const now = new Date();
        const diff = now - start;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        if (hours > 0) {
            return `${hours}h ${remainingMinutes}m`;
        }
        return `${minutes} minutes`;
    }

    getRecentDecisions(limit = 5) {
        if (!this.logs?.decisions) return [];
        return this.logs.decisions.slice(-limit).reverse();
    }

    getPhaseProgress() {
        if (!this.progress?.phases) return {};

        const progress = {};
        Object.entries(this.progress.phases).forEach(([phase, phaseData]) => {
            progress[phase] = this.calculatePhaseProgress(phaseData);
        });
        return progress;
    }

    calculatePhaseProgress(phaseData) {
        if (!phaseData.tasks) return 0;

        const totalTasks = Object.keys(phaseData.tasks).length;
        const completedTasks = Object.values(phaseData.tasks).filter(task => task.status === 'completed').length;

        if (totalTasks === 0) return 0;
        return Math.round((completedTasks / totalTasks) * 100);
    }

    async exportReport(format = 'json') {
        if (!this.state) {
            console.log('❌ No active workflow found');
            return null;
        }

        const report = {
            session_id: this.state.session_id,
            workflow_version: this.state.workflow_version,
            start_time: this.state.start_time,
            current_phase: this.state.current_phase,
            progress_percentage: this.state.progress_percentage,
            priority_level: this.state.priority_level,
            runtime: this.calculateRuntime(),
            quality_metrics: this.state.quality_metrics,
            phase_progress: this.getPhaseProgress(),
            recent_decisions: this.getRecentDecisions(10),
            system_status: this.state.system_status,
            summary: {
                total_decisions: this.logs.decisions.length,
                error_count: this.logs.errors.length,
                warning_count: this.logs.warnings.length,
                active_tasks: this.state.pending_tasks.length,
                failed_tasks: this.state.failed_tasks.length
            }
        };

        if (format === 'json') {
            console.log(JSON.stringify(report, null, 2));
        } else if (format === 'markdown') {
            this.renderMarkdownReport(report);
        } else if (format === 'text') {
            this.renderTextReport(report);
        }

        return report;
    }

    renderMarkdownReport(report) {
        console.log('# Workflow Dashboard Report');
        console.log('');
        console.log(`**Session ID:** ${report.session_id}`);
        console.log(`**Priority:** ${report.priority_level.toUpperCase()}`);
        console.log(`**Current Phase:** ${report.current_phase.toUpperCase()}`);
        console.log(`**Progress:** ${report.progress_percentage}%`);
        console.log(`**Runtime:** ${report.runtime}`);
        console.log('');

        console.log('## Quality Metrics');
        console.log(`- Completion Rate: ${report.quality_metrics.completion_rate}%`);
        console.log(`- Accuracy Score: ${report.quality_metrics.accuracy_score}%`);
        console.log(`- Organization Score: ${report.quality_metrics.organization_score}%`);
        console.log('');

        console.log('## Phase Progress');
        Object.entries(report.phase_progress).forEach(([phase, progress]) => {
            console.log(`- ${phase.toUpperCase()}: ${progress}%`);
        });
        console.log('');

        console.log('## Summary');
        console.log(`- Total Decisions: ${report.summary.total_decisions}`);
        console.log(`- Errors: ${report.summary.error_count}`);
        console.log(`- Warnings: ${report.summary.warning_count}`);
        console.log(`- Active Tasks: ${report.summary.active_tasks}`);
        console.log(`- Failed Tasks: ${report.summary.failed_tasks}`);
    }

    renderTextReport(report) {
        console.log('='.repeat(60));
        console.log('WORKFLOW DASHBOARD REPORT');
        console.log('='.repeat(60));
        console.log(`Session ID: ${report.session_id}`);
        console.log(`Priority: ${report.priority_level.toUpperCase()}`);
        console.log(`Current Phase: ${report.current_phase.toUpperCase()}`);
        console.log(`Progress: ${report.progress_percentage}%`);
        console.log(`Runtime: ${report.runtime}`);
        console.log('='.repeat(60));

        console.log('Quality Metrics:');
        console.log(`  Completion Rate: ${report.quality_metrics.completion_rate}%`);
        console.log(`  Accuracy Score: ${report.quality_metrics.accuracy_score}%`);
        console.log(`  Organization Score: ${report.quality_metrics.organization_score}%`);
        console.log('');

        console.log('Phase Progress:');
        Object.entries(report.phase_progress).forEach(([phase, progress]) => {
            console.log(`  ${phase.toUpperCase()}: ${progress}%`);
        });
        console.log('');

        console.log('Summary:');
        console.log(`  Total Decisions: ${report.summary.total_decisions}`);
        console.log(`  Errors: ${report.summary.error_count}`);
        console.log(`  Warnings: ${report.summary.warning_count}`);
        console.log(`  Active Tasks: ${report.summary.active_tasks}`);
        console.log(`  Failed Tasks: ${report.summary.failed_tasks}`);
        console.log('='.repeat(60));
    }
}

// CLI interface
if (require.main === module) {
    const dashboard = new WorkflowDashboard();

    const args = process.argv.slice(2);
    const command = args[0];

    if (!command) {
        console.log('Usage: node dashboard.js <command> [options]');
        console.log('Commands:');
        console.log('  --render                           Render dashboard');
        console.log('  --export [--format json|markdown|text]  Export report');
        console.log('  --watch                            Watch for changes');
        process.exit(1);
    }

    dashboard.initialize().then(async () => {
        switch (command) {
            case '--render':
                dashboard.render();
                break;

            case '--export':
                const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'json';
                await dashboard.exportReport(format);
                break;

            case '--watch':
                console.log('👀 Watching for changes...');
                dashboard.watchForChanges();
                break;

            default:
                console.log('Unknown command:', command);
        }
    });
}

module.exports = WorkflowDashboard;