/**
 * Metacognitive Audit Module v2.0
 *
 * Inspired by research papers:
 * - "Language Models Are Capable of Metacognitive Monitoring and Control"
 * - "Agentic Metacognition: Designing a Self-Aware Low-Code Agent for Failure Prediction and Human Handoff"
 *
 * Features:
 * 1. Strategy consistency check: Does the final action match the stated strategy?
 * 2. Confidence alignment: Is confidence level justified by reasoning quality?
 * 3. Completeness check: Are all necessary steps covered?
 * 4. Safety check: Are there any contradictions or unsafe assumptions?
 * 5. FAILURE PREDICTION: Detect high-risk situations and trigger Human Handoff
 * 6. LOOP DETECTION: Detect repetitive behavior and interrupt
 */

import {logger} from '../../../utils/logger.js';

/**
 * Internal state representation for audit
 */
export interface InternalState {
    /** Stated reasoning strategy */
    strategy: string;
    /** Confidence in solution (0-1) */
    confidence: number;
    /** Key assumptions made */
    assumptions: string[];
    /** Constraints considered */
    constraints: string[];
    /** Intermediate conclusions */
    conclusions: string[];
    /** Current step in reasoning */
    step: number;
    /** Action history for loop detection */
    actionHistory?: string[];
}

/**
 * Proposed action/response
 */
export interface ProposedAction {
    /** Type of action (execute, message, form, etc.) */
    type: string;
    /** Action payload */
    payload: Record<string, unknown>;
    /** Justification for this action */
    justification?: string;
    /** Subtasks for risk assessment */
    subtasks?: Subtask[];
}

/**
 * Subtask for risk assessment
 */
export interface Subtask {
    /** Description of subtask */
    description: string;
    /** Risk score (0-1) */
    riskScore: number;
    /** Alternative path if risk is high */
    alternativePath?: string;
}

/**
 * Audit result
 */
export interface AuditResult {
    /** Whether audit passed */
    passed: boolean;
    /** Consistency score (0-1) */
    consistencyScore: number;
    /** Issues found */
    issues: AuditIssue[];
    /** Recommendations for improvement */
    recommendations: string[];
    /** Overall audit confidence (0-1) */
    auditConfidence: number;
    /** Human handoff required */
    handoffRequired: boolean;
    /** Handoff reason if required */
    handoffReason?: string;
    /** Loop detected */
    loopDetected: boolean;
    /** Internal thoughts for audit trail */
    internalThoughts?: string;
}

/**
 * Individual audit issue
 */
export interface AuditIssue {
    /** Issue type */
    type: 'consistency' | 'confidence' | 'completeness' | 'safety' | 'contradiction' | 'loop';
    /** Severity level */
    severity: 'info' | 'warning' | 'error';
    /** Description of issue */
    description: string;
    /** Suggested fix */
    suggestedFix?: string;
}

/**
 * Metacognitive Handoff Request
 */
export interface HandoffRequest {
    /** Whether handoff is required */
    required: boolean;
    /** Confidence threshold that triggered handoff */
    threshold: number;
    /** Current confidence level */
    currentConfidence: number;
    /** Reason for handoff */
    reason: string;
    /** Alternative suggestions */
    suggestions: string[];
}

/**
 * Environment configuration
 */
const METACOGNITION_ENABLED = process.env.A2A_METACOGNITION_ENABLED === 'true';
const METACOGNITION_THRESHOLD = parseFloat(process.env.A2A_METACOGNITION_THRESHOLD || '0.7');
const LOOP_DETECTION_THRESHOLD = parseInt(process.env.A2A_LOOP_THRESHOLD || '3');

/**
 * Metacognitive Audit Engine v2.0
 */
export class MetacognitiveAudit {
    /**
     * Perform comprehensive audit of internal state vs proposed action
     * Enhanced with Failure Prediction and Human Handoff
     */
    static async audit(
        internalState: InternalState,
        proposedAction: ProposedAction,
        context?: Record<string, unknown>
    ): Promise<AuditResult> {
        const issues: AuditIssue[] = [];
        let consistencyScore = 1.0;

        logger.debug('[MetacognitiveAudit] Starting audit v2.0', {
            strategy: internalState.strategy,
            confidence: internalState.confidence,
            actionType: proposedAction.type,
            metagEnabled: METACOGNITION_ENABLED,
        });

        // Collect internal thoughts for audit trail
        const internalThoughts: string[] = [];

        // 1. Strategy Consistency Check
        internalThoughts.push('[Analysis] Checking strategy consistency...');
        const strategyIssues = this.checkStrategyConsistency(internalState, proposedAction);
        issues.push(...strategyIssues);
        consistencyScore *= 1 - strategyIssues.filter(i => i.severity === 'error').length * 0.2;

        // 2. Confidence Alignment Check
        internalThoughts.push('[Analysis] Checking confidence alignment...');
        const confidenceIssues = this.checkConfidenceAlignment(internalState, proposedAction);
        issues.push(...confidenceIssues);
        consistencyScore *= 1 - confidenceIssues.filter(i => i.severity === 'error').length * 0.15;

        // 3. Completeness Check
        internalThoughts.push('[Analysis] Checking completeness...');
        const completenessIssues = this.checkCompleteness(internalState, proposedAction);
        issues.push(...completenessIssues);
        consistencyScore *= 1 - completenessIssues.filter(i => i.severity === 'error').length * 0.15;

        // 4. Safety Check
        internalThoughts.push('[Analysis] Checking safety...');
        const safetyIssues = this.checkSafety(internalState, proposedAction, context);
        issues.push(...safetyIssues);
        consistencyScore *= 1 - safetyIssues.filter(i => i.severity === 'error').length * 0.2;

        // 5. Assumption Validity Check
        internalThoughts.push('[Analysis] Checking assumptions...');
        const assumptionIssues = this.checkAssumptions(internalState, proposedAction);
        issues.push(...assumptionIssues);
        consistencyScore *= 1 - assumptionIssues.filter(i => i.severity === 'error').length * 0.15;

        // 6. Loop Detection (NEW)
        internalThoughts.push('[Critique] Checking for repetitive behavior...');
        const loopIssues = this.checkLoopDetection(internalState);
        issues.push(...loopIssues);
        const loopDetected = loopIssues.some(i => i.type === 'loop' && i.severity === 'error');

        // 7. Failure Prediction & Human Handoff (NEW)
        internalThoughts.push('[Critique] Evaluating failure risk and handoff criteria...');
        const handoffCheck = this.evaluateHandoffRequirement(internalState, proposedAction, issues);

        // Ensure consistency score stays in bounds
        consistencyScore = Math.max(0, Math.min(1, consistencyScore));

        // Generate recommendations
        const recommendations = this.generateRecommendations(issues, internalState);

        // Add handoff recommendations if needed
        if (handoffCheck.required) {
            recommendations.push(...handoffCheck.suggestions);
        }

        // Determine if audit passed
        const errorCount = issues.filter(i => i.severity === 'error').length;
        const passed = errorCount === 0 && consistencyScore >= 0.6 && !loopDetected && !handoffCheck.required;

        const result: AuditResult = {
            passed,
            consistencyScore,
            issues,
            recommendations,
            auditConfidence: this.calculateAuditConfidence(issues),
            handoffRequired: handoffCheck.required,
            handoffReason: handoffCheck.required ? handoffCheck.reason : undefined,
            loopDetected,
            internalThoughts: internalThoughts.join('\n'),
        };

        logger.info('[MetacognitiveAudit] Audit completed v2.0', {
            passed,
            consistencyScore,
            issueCount: issues.length,
            errorCount,
            loopDetected,
            handoffRequired: handoffCheck.required,
        });

        return result;
    }

    /**
     * NEW: Evaluate Human Handoff requirement
     * Based on Agentic Metacognition research
     */
    static evaluateHandoffRequirement(
        internalState: InternalState,
        proposedAction: ProposedAction,
        issues: AuditIssue[]
    ): HandoffRequest {
        // Check if metacognition is enabled
        if (!METACOGNITION_ENABLED) {
            return { required: false, threshold: METACOGNITION_THRESHOLD, currentConfidence: internalState.confidence, reason: '', suggestions: [] };
        }

        const suggestions: string[] = [];
        let reason = '';

        // Rule 1: Confidence below threshold triggers handoff
        if (internalState.confidence < METACOGNITION_THRESHOLD) {
            reason = `Confidence (${internalState.confidence.toFixed(2)}) below threshold (${METACOGNITION_THRESHOLD})`;
            suggestions.push('Request clarification from user before proceeding');
            suggestions.push('Consider breaking task into smaller subtasks');
            suggestions.push('Review similar past tasks for guidance');
        }

        // Rule 2: Critical safety issues trigger handoff
        const criticalIssues = issues.filter(i => i.severity === 'error' && i.type === 'safety');
        if (criticalIssues.length > 0) {
            reason = reason || 'Critical safety issues detected';
            suggestions.push('CRITICAL: Dangerous operations detected - request explicit confirmation');
            suggestions.push('Consider alternative approach with lower risk');
        }

        // Rule 3: Too many assumptions suggest uncertainty
        if (internalState.assumptions.length > 5) {
            suggestions.push('Too many assumptions - verify key facts before proceeding');
        }

        // Rule 4: Low confidence + risky action = handoff
        if (internalState.confidence < 0.5 && proposedAction.type === 'execute') {
            reason = reason || 'Low confidence + risky execution detected';
            suggestions.push('Switch to dialog mode to clarify requirements');
            suggestions.push('Request user confirmation for execution');
        }

        return {
            required: !!reason,
            threshold: METACOGNITION_THRESHOLD,
            currentConfidence: internalState.confidence,
            reason,
            suggestions,
        };
    }

    /**
     * NEW: Loop Detection
     * Detects if agent is stuck in repetitive behavior
     */
    static checkLoopDetection(internalState: InternalState): AuditIssue[] {
        const issues: AuditIssue[] = [];

        if (!internalState.actionHistory || internalState.actionHistory.length < LOOP_DETECTION_THRESHOLD) {
            return issues;
        }

        const recentActions = internalState.actionHistory.slice(-LOOP_DETECTION_THRESHOLD);
        const uniqueActions = new Set(recentActions);

        // If all recent actions are the same, we have a loop
        if (uniqueActions.size === 1) {
            issues.push({
                type: 'loop',
                severity: 'error',
                description: `[STATUS: INTERRUPT_LOOP] Detected ${LOOP_DETECTION_THRESHOLD} consecutive identical actions: "${Array.from(uniqueActions)[0]}"`,
                suggestedFix: 'Propose alternative strategy or request user intervention',
            });
        }

        // Check for alternating patterns (A-B-A-B)
        if (recentActions.length >= 4) {
            const pattern = recentActions.slice(0, 2);
            let isAlternating = true;
            for (let i = 2; i < recentActions.length; i++) {
                if (recentActions[i] !== pattern[(i - 2) % 2]) {
                    isAlternating = false;
                    break;
                }
            }
            if (isAlternating) {
                issues.push({
                    type: 'loop',
                    severity: 'warning',
                    description: `Detected alternating pattern: ${pattern.join(' <-> ')}`,
                    suggestedFix: 'Break pattern by introducing a different approach',
                });
            }
        }

        return issues;
    }

    /**
     * NEW: Subtask Risk Assessment
     * From Internal Trace process
     */
    static assessSubtaskRisks(subtasks: Subtask[]): { totalRisk: number; highRiskCount: number; alternatives: Map<string, string> } {
        let totalRisk = 0;
        let highRiskCount = 0;
        const alternatives = new Map<string, string>();

        for (const subtask of subtasks) {
            totalRisk += subtask.riskScore;
            if (subtask.riskScore > 0.5) {
                highRiskCount++;
            }
            if (subtask.alternativePath) {
                alternatives.set(subtask.description, subtask.alternativePath);
            }
        }

        return {
            totalRisk: totalRisk / Math.max(subtasks.length, 1),
            highRiskCount,
            alternatives,
        };
    }

    /**
     * Check if proposed action aligns with stated strategy
     */
    private static checkStrategyConsistency(
        state: InternalState,
        action: ProposedAction
    ): AuditIssue[] {
        const issues: AuditIssue[] = [];

        // Extract strategy keywords
        const strategyKeywords = state.strategy.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const actionStr = JSON.stringify(action).toLowerCase();

        // Check if action mentions strategy or related concepts
        const strategyMentioned = strategyKeywords.some(kw => actionStr.includes(kw));

        if (!strategyMentioned && strategyKeywords.length > 0) {
            issues.push({
                type: 'consistency',
                severity: 'warning',
                description: `Proposed action does not explicitly reference stated strategy: "${state.strategy}"`,
                suggestedFix: 'Ensure action justification explicitly connects to strategy',
            });
        }

        // Check for contradictory action type
        if (state.strategy.toLowerCase().includes('dialog') && action.type === 'execute') {
            issues.push({
                type: 'consistency',
                severity: 'warning',
                description: 'Strategy emphasizes dialog but proposing direct execution',
                suggestedFix: 'Consider proposing dialog/clarification before execution',
            });
        }

        return issues;
    }

    /**
     * Check if confidence level is justified
     */
    private static checkConfidenceAlignment(
        state: InternalState,
        action: ProposedAction
    ): AuditIssue[] {
        const issues: AuditIssue[] = [];

        // High confidence should correlate with clear justification
        if (state.confidence > 0.8 && !action.justification) {
            issues.push({
                type: 'confidence',
                severity: 'warning',
                description: 'High confidence claimed but no justification provided',
                suggestedFix: 'Provide clear reasoning for high confidence',
            });
        }

        // Low confidence should not lead to risky actions
        if (state.confidence < 0.4 && action.type === 'execute') {
            issues.push({
                type: 'confidence',
                severity: 'error',
                description: 'Low confidence but proposing direct execution',
                suggestedFix: 'With low confidence, propose clarification or analysis first',
            });
        }

        // Moderate confidence with vague action
        if (state.confidence < 0.6 && !action.justification) {
            issues.push({
                type: 'confidence',
                severity: 'warning',
                description: 'Moderate confidence without clear justification',
                suggestedFix: 'Provide reasoning to support confidence level',
            });
        }

        // Check subtask risks if available
        if (action.subtasks && action.subtasks.length > 0) {
            const riskAssessment = this.assessSubtaskRisks(action.subtasks);
            if (riskAssessment.highRiskCount > 0) {
                issues.push({
                    type: 'confidence',
                    severity: 'warning',
                    description: `${riskAssessment.highRiskCount} subtasks have high risk (>0.5). Consider alternatives.`,
                    suggestedFix: 'Review and prepare alternative paths for high-risk subtasks',
                });
            }
        }

        return issues;
    }

    /**
     * Check if reasoning is complete
     */
    private static checkCompleteness(
        state: InternalState,
        action: ProposedAction
    ): AuditIssue[] {
        const issues: AuditIssue[] = [];

        // Check if conclusions are present
        if (state.conclusions.length === 0) {
            issues.push({
                type: 'completeness',
                severity: 'warning',
                description: 'No intermediate conclusions recorded',
                suggestedFix: 'Ensure reasoning steps are documented',
            });
        }

        // Check if constraints were considered
        if (state.constraints.length === 0) {
            issues.push({
                type: 'completeness',
                severity: 'info',
                description: 'No constraints explicitly identified',
                suggestedFix: 'Consider potential constraints or limitations',
            });
        }

        // Check if assumptions are reasonable
        if (state.assumptions.length > 5) {
            issues.push({
                type: 'completeness',
                severity: 'warning',
                description: `Many assumptions (${state.assumptions.length}) may indicate incomplete analysis`,
                suggestedFix: 'Verify assumptions or gather more information',
            });
        }

        return issues;
    }

    /**
     * Check for safety issues
     */
    private static checkSafety(
        state: InternalState,
        action: ProposedAction,
        context?: Record<string, unknown>
    ): AuditIssue[] {
        const issues: AuditIssue[] = [];

        const actionStr = JSON.stringify(action).toLowerCase();

        // Check for dangerous operations
        const dangerousKeywords = ['delete', 'drop', 'remove', 'destroy', 'uninstall', 'truncate', 'rm -rf'];
        const isDangerous = dangerousKeywords.some(kw => actionStr.includes(kw));

        if (isDangerous && state.confidence < 0.9) {
            issues.push({
                type: 'safety',
                severity: 'error',
                description: 'Dangerous operation proposed with insufficient confidence',
                suggestedFix: 'Require explicit confirmation or higher confidence for destructive actions',
            });
        }

        // Check for contradictions in assumptions
        const contradictions = this.findContradictions(state.assumptions);
        if (contradictions.length > 0) {
            issues.push({
                type: 'safety',
                severity: 'error',
                description: `Contradictory assumptions detected: ${contradictions.join(', ')}`,
                suggestedFix: 'Resolve contradictions before proceeding',
            });
        }

        // Check file operations safety
        if (actionStr.includes('file') && state.confidence < 0.7) {
            issues.push({
                type: 'safety',
                severity: 'warning',
                description: 'File operations with moderate confidence - verify paths',
                suggestedFix: 'Confirm file paths and permissions before execution',
            });
        }

        return issues;
    }

    /**
     * Check if assumptions are valid
     */
    private static checkAssumptions(
        state: InternalState,
        action: ProposedAction
    ): AuditIssue[] {
        const issues: AuditIssue[] = [];

        // Check for implicit assumptions in action
        const actionStr = JSON.stringify(action);
        const hasFileOps = actionStr.includes('file') || actionStr.includes('path');

        if (hasFileOps && !state.assumptions.some(a => a.toLowerCase().includes('file'))) {
            issues.push({
                type: 'completeness',
                severity: 'warning',
                description: 'File operations proposed but no file-related assumptions stated',
                suggestedFix: 'Explicitly state assumptions about file paths and permissions',
            });
        }

        return issues;
    }

    /**
     * Find contradictions in assumptions
     */
    private static findContradictions(assumptions: string[]): string[] {
        const contradictions: string[] = [];

        for (let i = 0; i < assumptions.length; i++) {
            for (let j = i + 1; j < assumptions.length; j++) {
                const a = assumptions[i].toLowerCase();
                const b = assumptions[j].toLowerCase();

                // Simple contradiction detection
                if (
                    (a.includes('must') && b.includes('must not')) ||
                    (a.includes('always') && b.includes('never')) ||
                    (a.includes('true') && b.includes('false')) ||
                    (a.includes('exists') && b.includes('does not exist')) ||
                    (a.includes('is') && b.includes('is not'))
                ) {
                    contradictions.push(`"${assumptions[i]}" vs "${assumptions[j]}"`);
                }
            }
        }

        return contradictions;
    }

    /**
     * Generate recommendations based on issues
     */
    private static generateRecommendations(
        issues: AuditIssue[],
        state: InternalState
    ): string[] {
        const recommendations: string[] = [];

        // Group issues by type
        const byType = new Map<string, AuditIssue[]>();
        for (const issue of issues) {
            if (!byType.has(issue.type)) {
                byType.set(issue.type, []);
            }
            byType.get(issue.type)!.push(issue);
        }

        // Generate recommendations
        if (byType.has('consistency') && byType.get('consistency')!.length > 0) {
            recommendations.push('Review strategy alignment - ensure action matches stated approach');
        }

        if (byType.has('confidence') && byType.get('confidence')!.length > 0) {
            recommendations.push('Strengthen confidence justification or lower confidence level');
        }

        if (byType.has('completeness') && byType.get('completeness')!.length > 0) {
            recommendations.push('Complete reasoning analysis - verify all steps are documented');
        }

        if (byType.has('safety') && byType.get('safety')!.length > 0) {
            recommendations.push('Address safety concerns before proceeding');
        }

        // General recommendations based on state
        if (state.confidence < 0.5) {
            recommendations.push('Consider additional analysis or clarification steps');
        }

        if (state.assumptions.length > 3) {
            recommendations.push('Validate key assumptions before finalizing');
        }

        return recommendations;
    }

    /**
     * Calculate overall audit confidence
     */
    private static calculateAuditConfidence(issues: AuditIssue[]): number {
        if (issues.length === 0) return 1.0;

        const errorCount = issues.filter(i => i.severity === 'error').length;
        const warningCount = issues.filter(i => i.severity === 'warning').length;
        const infoCount = issues.filter(i => i.severity === 'info').length;

        // Confidence decreases with issues
        let confidence = 1.0;
        confidence -= errorCount * 0.3;
        confidence -= warningCount * 0.1;
        confidence -= infoCount * 0.02;

        return Math.max(0, Math.min(1, confidence));
    }
}

/**
 * Helper to extract internal state from LLM response
 */
export function extractInternalState(
    responseMd: string,
    defaultState?: Partial<InternalState>
): InternalState {
    // Simple extraction from markdown response
    // In production, this would use more sophisticated parsing

    const state: InternalState = {
        strategy: extractSection(responseMd, 'strategy') || defaultState?.strategy || 'unspecified',
        confidence: parseConfidence(extractSection(responseMd, 'confidence')) ?? defaultState?.confidence ?? 0.5,
        assumptions: extractList(responseMd, 'assumptions') || defaultState?.assumptions || [],
        constraints: extractList(responseMd, 'constraints') || defaultState?.constraints || [],
        conclusions: extractList(responseMd, 'conclusions') || defaultState?.conclusions || [],
        step: defaultState?.step || 1,
        actionHistory: defaultState?.actionHistory || [],
    };

    return state;
}

/**
 * Extract section from markdown
 */
function extractSection(text: string, sectionName: string): string | null {
    const regex = new RegExp(`## ${sectionName}[\\s\\S]*?(?=##|$)`, 'i');
    const match = text.match(regex);
    if (match) {
        return match[0].replace(new RegExp(`## ${sectionName}`, 'i'), '').trim();
    }
    return null;
}

/**
 * Parse confidence from text
 */
function parseConfidence(text: string | null): number | null {
    if (!text) return null;
    const match = text.match(/(\d+(?:\.\d+)?)/);
    if (match) {
        const value = parseFloat(match[1]);
        return Math.min(1, Math.max(0, value / 100)); // Normalize to 0-1
    }
    return null;
}

/**
 * Extract list from markdown
 */
function extractList(text: string, listName: string): string[] | null {
    const regex = new RegExp(`## ${listName}[\\s\\S]*?(?=##|$)`, 'i');
    const match = text.match(regex);
    if (match) {
        const items = match[0]
            .split('\n')
            .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
            .map(line => line.replace(/^[-*]\s*/, '').trim())
            .filter(item => item.length > 0);
        return items.length > 0 ? items : null;
    }
    return null;
}
