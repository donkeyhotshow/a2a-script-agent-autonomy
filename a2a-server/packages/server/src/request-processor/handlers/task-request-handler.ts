/**
 * Task Request Handler
 * 
 * Handles processing of new task requests, proposing actions
 */

import {logger} from "@a2a/server-utils/logger";
import {actionProcessor} from '../../../../actions/src/action-processor.js';
import {actionRegistry} from '../../../../actions/src/action-registry.js';
import type {ActionDefinition} from '../../../../actions/src/types.js';
import type {
    RequestContext,
    ProcessResult,
    ProcessOutcome,
} from '../request-processor.interfaces';
import {buildRouterForm, LLM_PIPELINE_ACTIONS, ROUTER_CONFIG, ACTION_TO_SCHEMA} from '../../../../server-config/router-static.js';
import {dialogRequestProcessor} from '../dialog-request-processor.js';

/**
 * Strip markdown noise from a choice label or description.
 * Action definitions may contain markdown-formatted metadata lines (e.g. "**ID:** `foo`",
 * "**Description:** ...") that leak into router form choices when used verbatim.
 * This sanitizer removes those patterns to keep labels/descriptions plain text.
 */
function stripMarkdownNoise(text: string): string {
    if (!text) return text;
    // Remove bold key-value prefix patterns like "**ID:** " or "*ID:** "
    let out = text.replace(/^\*{1,2}[A-Za-z ]+:\*{1,2}\s*/u, '');
    // Remove trailing source annotation like "**Source:** `path`"
    out = out.replace(/\s+\*{1,2}Source:\*{1,2}\s+`[^`]+`\s*$/u, '');
    // Remove inline backtick code spans
    out = out.replace(/`([^`]+)`/gu, '$1');
    // Collapse extra whitespace
    return out.replace(/\s+/g, ' ').trim();
}


export function parseTaskText(ctx: Record<string, unknown>): string {
    const toStr = (v: unknown): string | null => {
        if (!v) return null;
        if (Array.isArray(v)) return v.join(' ');
        if (typeof v === 'string') return v;
        return null;
    };
    const nestedCtx = ctx['context'] as Record<string, unknown> | undefined;
    const resultObj = ctx['result'];
    const resultMsg =
        resultObj && typeof resultObj === 'object' && !Array.isArray(resultObj)
            ? toStr((resultObj as Record<string, unknown>)['message'])
            : null;
    // Prefer explicit message/result.message over task (task can be stale on context when user submits a new line).
    return (
        toStr(ctx['message']) ??
        resultMsg ??
        toStr(ctx['task']) ??
        toStr(ctx['new_task']) ??
        toStr(nestedCtx?.['task']) ??
        ''
    );
}

/**
 * Analyze task description to determine suitability for automatic router selection
 * @param taskDescription - The task text to analyze
 * @returns Analysis result with suitability score and preferred choice
 */
export function analyzeTaskForAutoRouting(taskDescription: string): {
    suitable: boolean;
    confidence: number;
    preferredChoice: string | null;
    reason: string;
} {
    if (!taskDescription || typeof taskDescription !== 'string') {
        return { suitable: false, confidence: 0, preferredChoice: null, reason: 'No task description' };
    }

    const text = taskDescription.toLowerCase().trim();
    const scores = { agent: 0, 'task-decomposition': 0, dialog: 0 };

    // Keywords that strongly indicate agent usage
    const agentKeywords = [
        'search', 'find', 'grep', 'code', 'file', 'edit', 'modify', 'create', 'delete',
        'run', 'execute', 'command', 'script', 'tool', 'fix', 'bug', 'error',
        'implement', 'add', 'update', 'refactor', 'debug', 'test', 'lint'
    ];

    // Keywords that indicate task decomposition
    const decompositionKeywords = [
        'plan', 'break down', 'steps', 'phases', 'organize', 'structure',
        'multiple', 'several', 'various', 'complex', 'large', 'comprehensive'
    ];

    // Keywords that indicate dialog preference
    const dialogKeywords = [
        'explain', 'tell me', 'what is', 'how does', 'describe', 'conversation',
        'chat', 'discuss', 'question', 'ask', 'answer',
        'dialog', 'диалог', 'діалог',
    ];

    // Score based on keyword presence
    agentKeywords.forEach(keyword => {
        if (text.includes(keyword)) scores.agent += 1;
    });

    decompositionKeywords.forEach(keyword => {
        if (text.includes(keyword)) scores['task-decomposition'] += 1;
    });

    dialogKeywords.forEach(keyword => {
        if (text.includes(keyword)) scores.dialog += 1;
    });

    // Find the highest scoring choice
    const maxScore = Math.max(...Object.values(scores));
    let preferredChoice: string | null = null;
    if (maxScore > 0) {
        for (const [choice, score] of Object.entries(scores)) {
            if (score === maxScore) {
                preferredChoice = choice as string;
                break;
            }
        }
    }

    // Determine suitability using router configuration
    const totalKeywords = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const suitable = totalKeywords >= ROUTER_CONFIG.minKeywordMatches;
    const confidence = totalKeywords > 0 ? Math.min(totalKeywords / 5, 1) : 0;

    return {
        suitable,
        confidence,
        preferredChoice: preferredChoice as string | null,
        reason: suitable ? `Detected ${preferredChoice} pattern with ${totalKeywords} keyword matches` : `Insufficient keywords (${totalKeywords}) for confident auto-selection`
    };
}

/**
 * Handle task_request - client sends new task, propose actions
 */
export async function handleTaskRequest(
    sessionId: string,
    _promiseId: string,
    ctx: Record<string, unknown>
): Promise<ProcessResult> {
    const taskText = parseTaskText(ctx);

    if (!taskText) {
        logger.warn('[TaskRequestHandler] No task text found in request');
        return {
            outcome: 'failed',
            error: 'No task text found in request'
        } as ProcessResult;
    }

    logger.info('[TaskRequestHandler] Processing task_request', {
        taskText: taskText.substring(0, 50)
    });

    // Use keyword-based routing - skip LLM transform
    // Find matching actions based on task keywords
    const keywordMatches = actionRegistry.findAction(taskText);
    const candidates = keywordMatches.filter(m => m.matchScore >= 0.3);
    const actionsToUse: ActionDefinition[] = candidates.map(m => m.action);

    // Build choices from keyword matches
    let rankedChoices: Array<{id: string, label: string, description: string}> = [];
    
    if (actionsToUse.length > 0) {
        // Use keyword-matched actions as choices, sorted by score
        rankedChoices = actionsToUse.map(action => ({
            id: action.id,
            label: stripMarkdownNoise(action.title || action.id),
            description: stripMarkdownNoise(action.description || '')
        }));
        logger.info('[TaskRequestHandler] Found keyword-matched actions', {
            count: rankedChoices.length,
            actionIds: rankedChoices.map(c => c.id)
        });
    } else {
        // No keyword matches - use default fallback choices
        logger.info('[TaskRequestHandler] No keyword matches, using default choices');
        rankedChoices = [
            { id: 'dialog', label: 'AI діалог з користувачем', description: 'Вільний текстовий діалог з моделлю без інструментів коду.' },
            { id: 'agent', label: 'Agent (універсальний режим)', description: 'Агент з інструментами: пошук по коду, файли, команди.' },
            { id: 'task-decomposition', label: 'Декомпозиція задачі', description: 'Розбиття задачі на підзадачі та план виконання.' }
        ];
    }

    const execution: Record<string, unknown> = {
        action: 'task',
        step: 'router',
    };
    if (ROUTER_CONFIG.autoSelectionEnabled) {
        execution.routerAnalysis = analyzeTaskForAutoRouting(taskText);
    }

    const resultContext: Record<string, unknown> = {
        execution,
        task: taskText
    };

    return {
        outcome: 'completed',
        context: resultContext,
        execute: {
            form: buildRouterForm(rankedChoices)
        }
    };
}