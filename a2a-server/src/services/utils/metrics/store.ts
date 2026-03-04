/**
 * Metric Store Implementation
 * 
 * Хранилище для метрик
 */

import { logger } from '../../../utils/logger.js';
import { MetricDefinition, MetricValue, MetricSnapshot, TimeSeriesData } from './types.js';

class MetricStore {
    private definitions = new Map<string, MetricDefinition>();
    private values = new Map<string, MetricValue[]>();
    private counters = new Map<string, number>();
    private maxHistory = 1000;

    define(def: MetricDefinition): void {
        this.definitions.set(def.name, def);
        if (!this.values.has(def.name)) {
            this.values.set(def.name, []);
        }
    }

    record(name: string, value: number, labels?: Record<string, string>): void {
        const def = this.definitions.get(name);
        if (!def) {
            logger.warn('[Metrics] Recording undefined metric', { name });
            return;
        }

        const history = this.values.get(name)!;
        
        if (def.type === 'counter') {
            const current = this.counters.get(name) || 0;
            this.counters.set(name, current + value);
            value = this.counters.get(name)!;
        }

        history.push({
            value,
            timestamp: Date.now(),
            labels
        });

        // Trim history
        if (history.length > this.maxHistory) {
            history.shift();
        }
    }

    increment(name: string, labels?: Record<string, string>): void {
        this.record(name, 1, labels);
    }

    gauge(name: string, value: number, labels?: Record<string, string>): void {
        const def = this.definitions.get(name);
        if (def && def.type !== 'gauge') {
            logger.warn('[Metrics] Type mismatch for gauge', { name, expected: def.type });
        }
        this.record(name, value, labels);
    }

    histogram(name: string, value: number, labels?: Record<string, string>): void {
        const def = this.definitions.get(name);
        if (def && def.type !== 'histogram') {
            logger.warn('[Metrics] Type mismatch for histogram', { name, expected: def.type });
        }
        this.record(name, value, labels);
    }

    getSnapshot(name: string, timeWindowMs?: number): MetricSnapshot | undefined {
        const def = this.definitions.get(name);
        const history = this.values.get(name);
        
        if (!def || !history || history.length === 0) {
            return undefined;
        }

        const cutoff = timeWindowMs ? Date.now() - timeWindowMs : 0;
        const relevant = history.filter(h => h.timestamp >= cutoff);
        
        if (relevant.length === 0) {
            return {
                name: def.name,
                type: def.type,
                description: def.description,
                current: 0,
                min: 0,
                max: 0,
                avg: 0,
                count: 0,
                unit: def.unit
            };
        }

        const values = relevant.map(h => h.value);
        const current = values[values.length - 1];
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;

        const timeSeries: TimeSeriesData = {
            timestamps: relevant.map(h => h.timestamp),
            values
        };

        return {
            name: def.name,
            type: def.type,
            description: def.description,
            current,
            min,
            max,
            avg,
            count: values.length,
            unit: def.unit,
            timeSeries
        };
    }

    getAllSnapshots(timeWindowMs?: number): MetricSnapshot[] {
        return Array.from(this.definitions.keys())
            .map(name => this.getSnapshot(name, timeWindowMs))
            .filter((s): s is MetricSnapshot => s !== undefined);
    }

    getCurrent(name: string): number {
        const history = this.values.get(name);
        if (!history || history.length === 0) return 0;
        return history[history.length - 1].value;
    }

    reset(name: string): void {
        this.values.delete(name);
        this.counters.delete(name);
    }

    resetAll(): void {
        this.values.clear();
        this.counters.clear();
    }

    // Expose for external use
    getStore(): MetricStore {
        return this;
    }
}

// Export singleton instance
export const store = new MetricStore();
