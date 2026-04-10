/**
 * Coordinator Contract — стандартный XML-формат для inter-agent коммуникации.
 * Портировано из OpenHarness coordinator/coordinator_mode.py.
 *
 * Формат TaskNotification XML:
 * <task-notification>
 *   <task-id>agent-abc123</task-id>
 *   <status>completed</status>
 *   <summary>Agent completed analysis of auth module</summary>
 *   <result>Found null pointer in validate.ts:42...</result>
 *   <usage>
 *     <total-tokens>1234</total-tokens>
 *     <tool-uses>5</tool-uses>
 *     <duration-ms>3200</duration-ms>
 *     <llm-calls>3</llm-calls>
 *   </usage>
 * </task-notification>
 */

export type TaskStatus = 'completed' | 'failed' | 'killed' | 'truncated';

export interface TaskUsage {
    totalTokens?: number;
    toolUses?: number;
    durationMs?: number;
    llmCalls?: number;
}

export interface TaskNotification {
    taskId: string;
    status: TaskStatus;
    summary: string;
    result?: string;
    usage?: TaskUsage;
}

const USAGE_FIELDS = ['total-tokens', 'tool-uses', 'duration-ms', 'llm-calls'] as const;

function escapeXml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function extractTag(xml: string, tag: string): string | undefined {
    const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const m = xml.match(re);
    return m ? m[1].trim() : undefined;
}

/**
 * Serialize a TaskNotification to the canonical XML envelope.
 * Compatible with OpenHarness task-notification format.
 */
export function formatTaskNotification(n: TaskNotification): string {
    const parts: string[] = [
        '<task-notification>',
        `  <task-id>${escapeXml(n.taskId)}</task-id>`,
        `  <status>${escapeXml(n.status)}</status>`,
        `  <summary>${escapeXml(n.summary)}</summary>`,
    ];

    if (n.result !== undefined) {
        parts.push(`  <result>${escapeXml(n.result)}</result>`);
    }

    if (n.usage) {
        parts.push('  <usage>');
        if (n.usage.totalTokens !== undefined) parts.push(`    <total-tokens>${n.usage.totalTokens}</total-tokens>`);
        if (n.usage.toolUses !== undefined)    parts.push(`    <tool-uses>${n.usage.toolUses}</tool-uses>`);
        if (n.usage.durationMs !== undefined)  parts.push(`    <duration-ms>${n.usage.durationMs}</duration-ms>`);
        if (n.usage.llmCalls !== undefined)    parts.push(`    <llm-calls>${n.usage.llmCalls}</llm-calls>`);
        parts.push('  </usage>');
    }

    parts.push('</task-notification>');
    return parts.join('\n');
}

/**
 * Parse a <task-notification> XML string into a TaskNotification.
 * Returns null if the input is not a valid task-notification.
 */
export function parseTaskNotification(xml: string): TaskNotification | null {
    const trimmed = xml.trim();
    if (!trimmed.includes('<task-notification>')) return null;

    const taskId  = extractTag(trimmed, 'task-id');
    const status  = extractTag(trimmed, 'status') as TaskStatus | undefined;
    const summary = extractTag(trimmed, 'summary');

    if (!taskId || !status || !summary) return null;

    const result = extractTag(trimmed, 'result');

    let usage: TaskUsage | undefined;
    const usageBlock = extractTag(trimmed, 'usage');
    if (usageBlock) {
        usage = {};
        const totalTokens = extractTag(usageBlock, 'total-tokens');
        const toolUses    = extractTag(usageBlock, 'tool-uses');
        const durationMs  = extractTag(usageBlock, 'duration-ms');
        const llmCalls    = extractTag(usageBlock, 'llm-calls');
        if (totalTokens) usage.totalTokens = parseInt(totalTokens, 10);
        if (toolUses)    usage.toolUses    = parseInt(toolUses, 10);
        if (durationMs)  usage.durationMs  = parseInt(durationMs, 10);
        if (llmCalls)    usage.llmCalls    = parseInt(llmCalls, 10);
    }

    return {taskId, status, summary, result, usage};
}

/**
 * Quick check: does this string contain a task-notification envelope?
 */
export function isTaskNotificationMessage(text: string): boolean {
    return text.trim().startsWith('<task-notification>');
}
