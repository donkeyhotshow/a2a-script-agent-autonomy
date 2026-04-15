/** ContextManager metrics (in-memory counters). */

const counters: Record<string, number> = {};

export function incrementContextMetric(name: string, value = 1): void {
    counters[name] = (counters[name] ?? 0) + value;
}

export function getContextMetric(name: string): number {
    return counters[name] ?? 0;
}

export function getContextMetrics(): Record<string, number> {
    return {...counters};
}

