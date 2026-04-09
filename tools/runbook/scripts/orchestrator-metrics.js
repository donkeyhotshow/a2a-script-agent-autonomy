#!/usr/bin/env node
/**
 * Orchestrator Metrics Tracker
 * Обновляет метрики оркестратора в runtime/metrics.json
 * 
 * Usage:
 *   node scripts/orchestrator-metrics.js --record        # Record current cycle
 *   node scripts/orchestrator-metrics.js --report        # Show current metrics
 */

import fs from 'fs';
import path from 'path';

const METRICS_PATH = path.join(process.cwd(), 'runtime', 'metrics.json');

/**
 * Load existing metrics or initialize
 */
function loadMetrics() {
    try {
        if (fs.existsSync(METRICS_PATH)) {
            return JSON.parse(fs.readFileSync(METRICS_PATH, 'utf8'));
        }
    } catch (e) {
        // ignore, return default
    }
    return { cycles: [] };
}

/**
 * Save metrics to file
 */
function saveMetrics(metrics) {
    const dir = path.dirname(METRICS_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(METRICS_PATH, JSON.stringify(metrics, null, 2));
}

/**
 * Record a new cycle
 */
function recordCycle(cycleData = {}) {
    const metrics = loadMetrics();
    const cycle = {
        timestamp: new Date().toISOString(),
        cycleTime: cycleData.cycleTime || 0,
        taskSuccessRate: cycleData.taskSuccessRate || 0,
        errorRate: cycleData.errorRate || 0,
        pendingQueueAge: cycleData.pendingQueueAge || 0,
        tasksCompleted: cycleData.tasksCompleted || 0,
        tasksFailed: cycleData.tasksFailed || 0
    };
    metrics.cycles.push(cycle);
    
    // Keep last 100 cycles
    if (metrics.cycles.length > 100) {
        metrics.cycles = metrics.cycles.slice(-100);
    }
    
    saveMetrics(metrics);
    console.log('✅ Cycle recorded:', cycle.timestamp);
    return cycle;
}

/**
 * Show current metrics report
 */
function showReport() {
    const metrics = loadMetrics();
    if (metrics.cycles.length === 0) {
        console.log('No cycles recorded yet.');
        return;
    }
    
    const totalCycles = metrics.cycles.length;
    const lastCycle = metrics.cycles[totalCycles - 1];
    const totalTasks = metrics.cycles.reduce((sum, c) => sum + (c.tasksCompleted || 0) + (c.tasksFailed || 0), 0);
    const completedTasks = metrics.cycles.reduce((sum, c) => sum + (c.tasksCompleted || 0), 0);
    const failedTasks = metrics.cycles.reduce((sum, c) => sum + (c.tasksFailed || 0), 0);
    
    const successRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0;
    
    console.log('=== Orchestrator Metrics ===');
    console.log(`Total Cycles: ${totalCycles}`);
    console.log(`Total Tasks: ${totalTasks} (completed: ${completedTasks}, failed: ${failedTasks})`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Last Cycle: ${lastCycle?.timestamp}`);
}

// CLI
const args = process.argv.slice(2);
if (args.includes('--record')) {
    recordCycle();
} else if (args.includes('--report')) {
    showReport();
} else {
    console.log('Usage:');
    console.log('  node scripts/orchestrator-metrics.js --record   # Record cycle');
    console.log('  node scripts/orchestrator-metrics.js --report   # Show report');
}