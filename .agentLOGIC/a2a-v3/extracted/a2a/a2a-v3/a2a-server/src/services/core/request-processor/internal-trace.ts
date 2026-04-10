/**
 * Internal Trace System v2.0
 *
 * Inspired by SFR-DeepResearch: "На пути к эффективному подкреплению
 * для автономных рассуждений отдельных агентов"
 *
 * Features:
 * 1. Subtask decomposition with risk assessment
 * 2. Alternative path generation for high-risk subtasks
 * 3. Internal audit/critique of reasoning
 * 4. Minimizes hallucinations in complex tasks
 *
 * Usage:
 *   Before giving final answer, perform Internal Trace:
 *   Step 1 (Analysis): Break task into subtasks
 *   Step 2 (Verification): Assess risk for each subtask (0-1)
 *   Step 3 (Critique): Find weak points in logic
 */

import {logger} from '../../../utils/logger.js';

/**
 * Subtask with risk assessment
 */
export interface Subtask {
    /** Unique identifier */
    id: string;
    /** Description of the subtask */
    description: string;
    /** Estimated risk score (0-1) */
    riskScore: number;
    /** Why this subtask has this risk level */
    riskFactors: string[];
    /** Alternative approach if risk is high */
    alternativePath?: string;
    /** Dependencies on other subtasks */
    dependencies: string[];
    /** Status */
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
}

/**
 * Internal Trace Result
 */
export interface InternalTraceResult {
    /** Whether trace completed successfully */
    success: boolean;
    /** All subtasks identified */
    subtasks: Subtask[];
    /** Total risk score across all subtasks */
    totalRiskScore: number;
    /** Subtasks with high risk (>0.5) */
    highRiskSubtasks: Subtask[];
    /** Weak points identified in critique */
    weakPoints: WeakPoint[];
    /** Alternative paths suggested */
    alternativePaths: AlternativePath[];
    /** Internal audit trail */
    auditTrail: string[];
    /** Final thought (critique result) */
    finalThought: string;
    /** Whether to proceed with current approach */
    proceed: boolean;
    /** Suggestion if not proceeding */
    suggestion?: string;
}

/**
 * Weak point identified during critique
 */
export interface WeakPoint {
    /** Description of the weak point */
    description: string;
    /** Severity (0-1) */
    severity: number;
    /** Related subtask ID */
    subtaskId?: string;
    /** How to address this weak point */
    fix?: string;
}

/**
 * Alternative path suggestion
 */
export interface AlternativePath {
    /** Subtask this applies to */
    subtaskId: string;
    /** Description of alternative approach */
    description: string;
    /** Estimated risk improvement */
    riskImprovement: number;
    /** Implementation hint */
    hint: string;
}

/**
 * Internal Trace Configuration
 */
const RISK_THRESHOLD = parseFloat(process.env.A2A_INTERNAL_TRACE_RISK_THRESHOLD || '0.5');
const MIN_ALTERNATIVES = parseInt(process.env.A2A_INTERNAL_TRACE_MIN_ALTERNATIVES || '2');

/**
 * Internal Trace Engine
 */
export class InternalTrace {
    /**
     * Perform Internal Trace on a task
     * Returns comprehensive risk assessment and critique
     */
    static async trace(
        task: string,
        context?: Record<string, unknown>
    ): Promise<InternalTraceResult> {
        const auditTrail: string[] = [];

        logger.debug('[InternalTrace] Starting trace', { task: task.substring(0, 100) });

        // Step 1: Analysis - Break into subtasks
        auditTrail.push('[Analysis] Decomposing task into subtasks...');
        const subtasks = this.decomposeTask(task, context);

        // Step 2: Verification - Assess risks
        auditTrail.push('[Verification] Assessing risk for each subtask...');
        const subtasksWithRisk = subtasks.map(st => this.assessRisk(st, context));
        const highRiskSubtasks = subtasksWithRisk.filter(st => st.riskScore > RISK_THRESHOLD);

        // Step 3: Critique - Find weak points
        auditTrail.push('[Critique] Identifying weak points in reasoning...');
        const weakPoints = this.performCritique(subtasksWithRisk, task, context);

        // Generate alternative paths for high-risk subtasks
        const alternativePaths: AlternativePath[] = [];
        for (const subtask of highRiskSubtasks) {
            const alternatives = this.generateAlternatives(subtask, context);
            alternativePaths.push(...alternatives);
            if (alternatives.length > 0) {
                subtask.alternativePath = alternatives[0].description;
                auditTrail.push(`[Critique] Generated ${alternatives.length} alternatives for high-risk subtask: ${subtask.id}`);
            }
        }

        // Calculate total risk
        const totalRiskScore = subtasksWithRisk.reduce((sum, st) => sum + st.riskScore, 0) / subtasksWithRisk.length;

        // Determine if we should proceed
        const proceed = highRiskSubtasks.length === 0 || alternativePaths.length >= MIN_ALTERNATIVES;

        // Generate final thought
        const finalThought = this.generateFinalThought(
            subtasksWithRisk,
            highRiskSubtasks,
            weakPoints,
            proceed
        );

        const result: InternalTraceResult = {
            success: proceed,
            subtasks: subtasksWithRisk,
            totalRiskScore,
            highRiskSubtasks,
            weakPoints,
            alternativePaths,
            auditTrail,
            finalThought,
            proceed,
            suggestion: proceed ? undefined : 'Review high-risk subtasks and consider alternative approaches',
        };

        logger.info('[InternalTrace] Trace completed', {
            subtaskCount: subtasksWithRisk.length,
            highRiskCount: highRiskSubtasks.length,
            totalRiskScore,
            proceed,
        });

        return result;
    }

    /**
     * Decompose task into subtasks
     */
    private static decomposeTask(
        task: string,
        context?: Record<string, unknown>
    ): Subtask[] {
        const subtasks: Subtask[] = [];

        // Simple heuristic decomposition
        // In production, this could use LLM or more sophisticated parsing

        // Common subtask patterns
        const patterns = [
            { regex: /read|analyze|examine|review|inspect/i, type: 'read' },
            { regex: /write|create|generate|make|build/i, type: 'write' },
            { regex: /test|verify|validate|check/i, type: 'test' },
            { regex: /fix|debug|resolve|repair/i, type: 'fix' },
            { regex: /deploy|deploy|release|publish/i, type: 'deploy' },
            { regex: /search|find|locate|discover/i, type: 'search' },
            { regex: /explain|describe|document/i, type: 'explain' },
            { regex: /refactor|optimize|improve|enhance/i, type: 'refactor' },
        ];

        const lowerTask = task.toLowerCase();

        for (const pattern of patterns) {
            if (pattern.regex.test(task)) {
                const id = `subtask_${subtasks.length + 1}`;
                subtasks.push({
                    id,
                    description: `Task component: ${pattern.type} operation`,
                    riskScore: 0.5, // Will be refined by assessRisk
                    riskFactors: [],
                    dependencies: [],
                    status: 'pending',
                });
            }
        }

        // If no patterns matched, create a single subtask
        if (subtasks.length === 0) {
            subtasks.push({
                id: 'subtask_1',
                description: task.substring(0, 100),
                riskScore: 0.5,
                riskFactors: ['Generic task - risk unclear'],
                dependencies: [],
                status: 'pending',
            });
        }

        // Add dependencies based on order
        for (let i = 1; i < subtasks.length; i++) {
            subtasks[i].dependencies.push(subtasks[i - 1].id);
        }

        return subtasks;
    }

    /**
     * Assess risk for a subtask
     */
    private static assessRisk(
        subtask: Subtask,
        context?: Record<string, unknown>
    ): Subtask {
        const riskFactors: string[] = [];
        let riskScore = 0.3; // Base risk

        const desc = subtask.description.toLowerCase();
        const contextStr = JSON.stringify(context || {}).toLowerCase();

        // High-risk keywords
        const highRiskKeywords = [
            'delete', 'drop', 'remove', 'destroy', 'uninstall',
            'database', 'sql', 'migration', 'schema',
            'production', 'live', 'deploy', 'release',
            'config', 'permission', 'security', 'auth',
        ];

        for (const keyword of highRiskKeywords) {
            if (desc.includes(keyword) || contextStr.includes(keyword)) {
                riskFactors.push(`Contains high-risk keyword: ${keyword}`);
                riskScore += 0.15;
            }
        }

        // Medium-risk keywords
        const mediumRiskKeywords = [
            'file', 'directory', 'folder', 'path',
            'api', 'endpoint', 'http', 'request',
            'test', 'mock', 'stub',
            'code', 'script', 'function',
        ];

        for (const keyword of mediumRiskKeywords) {
            if (desc.includes(keyword) || contextStr.includes(keyword)) {
                riskFactors.push(`Contains medium-risk keyword: ${keyword}`);
                riskScore += 0.08;
            }
        }

        // Cap risk at 1.0
        riskScore = Math.min(1.0, riskScore);

        return {
            ...subtask,
            riskScore,
            riskFactors,
        };
    }

    /**
     * Perform critique - find weak points in reasoning
     */
    private static performCritique(
        subtasks: Subtask[],
        task: string,
        context?: Record<string, unknown>
    ): WeakPoint[] {
        const weakPoints: WeakPoint[] = [];

        // Check for missing error handling
        const hasErrorHandling = task.toLowerCase().includes('error') ||
            task.toLowerCase().includes('exception') ||
            task.toLowerCase().includes('try');

        if (!hasErrorHandling && subtasks.length > 2) {
            weakPoints.push({
                description: 'Task does not mention error handling',
                severity: 0.7,
                fix: 'Add explicit error handling strategy',
            });
        }

        // Check for missing verification
        const hasVerification = task.toLowerCase().includes('verify') ||
            task.toLowerCase().includes('test') ||
            task.toLowerCase().includes('check');

        if (!hasVerification && subtasks.length > 1) {
            weakPoints.push({
                description: 'No explicit verification step mentioned',
                severity: 0.5,
                fix: 'Add verification or testing step after execution',
            });
        }

        // Check for missing rollback
        const hasRollback = task.toLowerCase().includes('rollback') ||
            task.toLowerCase().includes('revert') ||
            task.toLowerCase().includes('undo');

        const hasDestructiveOps = subtasks.some(st =>
            st.riskFactors.some(rf => rf.includes('delete') || rf.includes('drop'))
        );

        if (hasDestructiveOps && !hasRollback) {
            weakPoints.push({
                description: 'Destructive operations without rollback strategy',
                severity: 0.9,
                fix: 'Add rollback or backup strategy before destructive operations',
            });
        }

        // Check for dependency gaps
        for (const subtask of subtasks) {
            if (subtask.dependencies.length === 0 && subtasks.length > 1) {
                weakPoints.push({
                    description: `Subtask "${subtask.id}" has no dependencies but other tasks exist`,
                    severity: 0.3,
                    subtaskId: subtask.id,
                    fix: 'Consider adding dependencies for better ordering',
                });
            }
        }

        // Check for high accumulated risk
        const totalRisk = subtasks.reduce((sum, st) => sum + st.riskScore, 0) / subtasks.length;
        if (totalRisk > 0.6) {
            weakPoints.push({
                description: `High accumulated risk across all subtasks: ${(totalRisk * 100).toFixed(0)}%`,
                severity: totalRisk,
                fix: 'Consider breaking into smaller tasks or adding safeguards',
            });
        }

        return weakPoints;
    }

    /**
     * Generate alternative paths for a high-risk subtask
     */
    private static generateAlternatives(
        subtask: Subtask,
        context?: Record<string, unknown>
    ): AlternativePath[] {
        const alternatives: AlternativePath[] = [];

        // Generate alternatives based on risk factors
        for (const riskFactor of subtask.riskFactors) {
            const lowerRisk = riskFactor.toLowerCase();

            if (lowerRisk.includes('delete') || lowerRisk.includes('drop')) {
                alternatives.push({
                    subtaskId: subtask.id,
                    description: 'Use soft delete or create backup before deletion',
                    riskImprovement: 0.3,
                    hint: 'Create temporary backup, verify before permanent delete',
                });
                alternatives.push({
                    subtaskId: subtask.id,
                    description: 'Add confirmation step before destructive operation',
                    riskImprovement: 0.2,
                    hint: 'Request explicit user confirmation via form',
                });
            }

            if (lowerRisk.includes('database') || lowerRisk.includes('sql')) {
                alternatives.push({
                    subtaskId: subtask.id,
                    description: 'Run in transaction with rollback on error',
                    riskImprovement: 0.25,
                    hint: 'Wrap database operations in transaction',
                });
            }

            if (lowerRisk.includes('production') || lowerRisk.includes('deploy')) {
                alternatives.push({
                    subtaskId: subtask.id,
                    description: 'Deploy to staging first, then promote to production',
                    riskImprovement: 0.35,
                    hint: 'Use blue-green deployment or canary release',
                });
            }

            if (lowerRisk.includes('file') || lowerRisk.includes('path')) {
                alternatives.push({
                    subtaskId: subtask.id,
                    description: 'Verify file existence and permissions before operation',
                    riskImprovement: 0.2,
                    hint: 'Add read-file step to verify paths exist',
                });
            }
        }

        // General alternatives if none specific were generated
        if (alternatives.length === 0) {
            alternatives.push({
                subtaskId: subtask.id,
                description: 'Break this subtask into smaller, verifiable steps',
                riskImprovement: 0.3,
                hint: 'Each step should be independently testable',
            });
        }

        return alternatives;
    }

    /**
     * Generate final thought after critique
     */
    private static generateFinalThought(
        subtasks: Subtask[],
        highRiskSubtasks: Subtask[],
        weakPoints: WeakPoint[],
        proceed: boolean
    ): string {
        const parts: string[] = [];

        parts.push(`Analyzed ${subtasks.length} subtask(s).`);

        if (highRiskSubtasks.length > 0) {
            parts.push(`${highRiskSubtasks.length} high-risk subtask(s) identified.`);
        }

        if (weakPoints.length > 0) {
            const severeWeakPoints = weakPoints.filter(wp => wp.severity > 0.6);
            if (severeWeakPoints.length > 0) {
                parts.push(`${severeWeakPoints.length} critical weak point(s) require attention.`);
            }
        }

        if (proceed) {
            parts.push('Approach is acceptable with current safeguards.');
        } else {
            parts.push('Recommend reviewing alternatives before proceeding.');
        }

        return parts.join(' ');
    }

    /**
     * Format trace result for LLM prompt
     */
    static formatForPrompt(result: InternalTraceResult): string {
        const lines: string[] = [];

        lines.push('## Internal Trace Analysis\n');

        // Subtasks
        lines.push('### Subtasks:');
        for (const st of result.subtasks) {
            const riskIcon = st.riskScore > 0.6 ? '🔴' : st.riskScore > 0.4 ? '🟡' : '🟢';
            lines.push(`- ${riskIcon} [${st.id}] ${st.description} (risk: ${(st.riskScore * 100).toFixed(0)}%)`);
        }

        // High-risk warnings
        if (result.highRiskSubtasks.length > 0) {
            lines.push('\n### ⚠️ High-Risk Subtasks:');
            for (const st of result.highRiskSubtasks) {
                lines.push(`- **${st.id}**: ${st.riskFactors.join(', ')}`);
                if (st.alternativePath) {
                    lines.push(`  → Alternative: ${st.alternativePath}`);
                }
            }
        }

        // Weak points
        if (result.weakPoints.length > 0) {
            lines.push('\n### Weak Points:');
            for (const wp of result.weakPoints) {
                const severityIcon = wp.severity > 0.7 ? '🔴' : wp.severity > 0.4 ? '🟡' : '🟢';
                lines.push(`- ${severityIcon} ${wp.description}`);
                if (wp.fix) {
                    lines.push(`  → Fix: ${wp.fix}`);
                }
            }
        }

        // Final recommendation
        lines.push('\n### Recommendation:');
        if (result.proceed) {
            lines.push('✅ Proceed with current approach.');
        } else {
            lines.push('⚠️ Review alternatives before proceeding.');
            if (result.suggestion) {
                lines.push(`→ ${result.suggestion}`);
            }
        }

        return lines.join('\n');
    }
}
