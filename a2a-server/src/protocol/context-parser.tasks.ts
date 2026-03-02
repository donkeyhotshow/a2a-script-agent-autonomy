/** Task extraction helpers for context blocks. */

export interface ContextTask {
    id: string;
    type?: string;
    status?: string;
    progress?: number;
}

export function parseTasksFromContext(context: { tasks?: unknown[] }): ContextTask[] {
    const tasks = context.tasks;
    if (!Array.isArray(tasks)) return [];
    return tasks.filter((t): t is ContextTask => typeof t === 'object' && t !== null && 'id' in t && typeof (t as ContextTask).id === 'string');
}

export function getTaskIds(context: { tasks?: unknown[] }): string[] {
    return parseTasksFromContext(context).map((t) => t.id);
}
