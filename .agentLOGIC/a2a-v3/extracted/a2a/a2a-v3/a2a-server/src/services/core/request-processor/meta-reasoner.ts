/**
 * Meta-Reasoner: Dynamic Strategy Advisor for Gray Room Loop
 * 
 * Inspired by research paper "Meta-Reasoner: Dynamic Guidance for Optimized Inference-time Reasoning"
 * Enables LLMs to "think about how to think" by dynamically selecting reasoning strategies.
 * 
 * Strategies:
 * - CONTINUE: Proceed with current approach
 * - BACKTRACK: Revert to previous state and try alternative
 * - SWITCH_APPROACH: Change strategy entirely (e.g., different method)
 * - RESTART: Start from scratch with fresh perspective
 * - REFINE: Clarify current approach before proceeding
 */

import {logger} from '../../../utils/logger.js';

/**
 * Progress report from LLM reasoning step
 */
export interface ProgressReport {
    /** Current step number */
    stepNumber: number;
    /** Summary of progress so far */
    progressSummary: string;
    /** Current reasoning path/strategy */
    currentStrategy: string;
    /** Confidence level (0-1) */
    confidence: number;
    /** Estimated steps remaining */
    stepsRemaining: number;
    /** Any blockers or issues encountered */
    blockers?: string[];
    /** Quality metrics (optional) */
    qualityMetrics?: {
        coherence: number;
        relevance: number;
        completeness: number;
    };
}

/**
 * Strategy recommendation from Meta-Reasoner
 */
export interface StrategyRecommendation {
    /** Recommended strategy */
    strategy: 'CONTINUE' | 'BACKTRACK' | 'SWITCH_APPROACH' | 'RESTART' | 'REFINE';
    /** Confidence in recommendation (0-1) */
    confidence: number;
    /** Reason for recommendation */
    reason: string;
    /** Specific guidance for next step */
    guidance?: string;
    /** Alternative strategies to consider */
    alternatives?: string[];
}

/**
 * Meta-Reasoner configuration
 */
export interface MetaReasonerConfig {
    /** Enable meta-reasoning (default: true) */
    enabled?: boolean;
    /** Minimum confidence threshold for strategy change (0-1, default: 0.7) */
    confidenceThreshold?: number;
    /** Maximum consecutive CONTINUE steps before forcing evaluation (default: 3) */
    maxConsecutueContinue?: number;
    /** Enable adaptive thresholds based on task complexity (default: true) */
    adaptiveThresholds?: boolean;
}

/**
 * Meta-Reasoner state tracker
 */
interface MetaReasonerState {
    consecutiveContinueCount: number;
    lastStrategyChange: number;
    strategyHistory: Array<{step: number; strategy: string}>;
    performanceMetrics: {
        avgConfidence: number;
        strategyChangeCount: number;
        restartCount: number;
    };
}

/**
 * Meta-Reasoner: Dynamic strategy advisor for reasoning loops
 */
export class MetaReasoner {
    private config: Required<MetaReasonerConfig>;
    private state: MetaReasonerState;

    constructor(config: MetaReasonerConfig = {}) {
        this.config = {
            enabled: config.enabled ?? true,
            confidenceThreshold: config.confidenceThreshold ?? 0.7,
            maxConsecutueContinue: config.maxConsecutueContinue ?? 3,
            adaptiveThresholds: config.adaptiveThresholds ?? true,
        };

        this.state = {
            consecutiveContinueCount: 0,
            lastStrategyChange: 0,
            strategyHistory: [],
            performanceMetrics: {
                avgConfidence: 0,
                strategyChangeCount: 0,
                restartCount: 0,
            },
        };
    }

    /**
     * Evaluate progress report and recommend strategy
     */
    async evaluateProgress(report: ProgressReport): Promise<StrategyRecommendation> {
        if (!this.config.enabled) {
            return {
                strategy: 'CONTINUE',
                confidence: 1.0,
                reason: 'Meta-reasoning disabled',
            };
        }

        logger.debug('[MetaReasoner] Evaluating progress', {
            step: report.stepNumber,
            confidence: report.confidence,
            strategy: report.currentStrategy,
        });

        // Check for critical issues
        if (report.blockers && report.blockers.length > 0) {
            return this.handleBlockers(report);
        }

        // Check confidence levels
        if (report.confidence < 0.3) {
            return this.handleLowConfidence(report);
        }

        // Check for stagnation
        if (this.state.consecutiveContinueCount >= this.config.maxConsecutueContinue) {
            return this.handleStagnation(report);
        }

        // Check quality metrics
        if (report.qualityMetrics) {
            const avgQuality =
                (report.qualityMetrics.coherence +
                    report.qualityMetrics.relevance +
                    report.qualityMetrics.completeness) /
                3;
            if (avgQuality < 0.4) {
                return this.handleLowQuality(report);
            }
        }

        // Normal progression
        this.state.consecutiveContinueCount++;
        return {
            strategy: 'CONTINUE',
            confidence: report.confidence,
            reason: 'Progress is satisfactory, continuing current approach',
            guidance: `Step ${report.stepNumber + 1}: ${this.generateGuidance(report)}`,
        };
    }

    /**
     * Handle situation with blockers
     */
    private handleBlockers(report: ProgressReport): StrategyRecommendation {
        const blockers = report.blockers || [];
        logger.warn('[MetaReasoner] Blockers detected', {blockers});

        // Categorize blockers
        const isLogicalError = blockers.some(b =>
            b.toLowerCase().includes('contradiction') ||
            b.toLowerCase().includes('invalid') ||
            b.toLowerCase().includes('error')
        );

        const isAmbiguity = blockers.some(b =>
            b.toLowerCase().includes('unclear') ||
            b.toLowerCase().includes('ambiguous') ||
            b.toLowerCase().includes('conflicting')
        );

        if (isLogicalError) {
            this.state.consecutiveContinueCount = 0;
            this.recordStrategyChange('BACKTRACK', report.stepNumber);
            return {
                strategy: 'BACKTRACK',
                confidence: 0.8,
                reason: 'Logical error detected, need to reconsider previous steps',
                guidance: 'Review the last 2-3 steps and identify where the reasoning diverged',
                alternatives: ['SWITCH_APPROACH', 'RESTART'],
            };
        }

        if (isAmbiguity) {
            this.state.consecutiveContinueCount = 0;
            this.recordStrategyChange('REFINE', report.stepNumber);
            return {
                strategy: 'REFINE',
                confidence: 0.75,
                reason: 'Ambiguity in reasoning, need clarification',
                guidance: 'Clarify assumptions and constraints before proceeding',
                alternatives: ['SWITCH_APPROACH'],
            };
        }

        // Generic blocker
        this.state.consecutiveContinueCount = 0;
        this.recordStrategyChange('SWITCH_APPROACH', report.stepNumber);
        return {
            strategy: 'SWITCH_APPROACH',
            confidence: 0.7,
            reason: `Blocker encountered: ${blockers[0]}`,
            guidance: 'Try a different approach or methodology',
        };
    }

    /**
     * Handle low confidence situation
     */
    private handleLowConfidence(report: ProgressReport): StrategyRecommendation {
        logger.warn('[MetaReasoner] Low confidence detected', {
            confidence: report.confidence,
            step: report.stepNumber,
        });

        this.state.consecutiveContinueCount = 0;

        // Very low confidence → restart
        if (report.confidence < 0.15) {
            this.state.performanceMetrics.restartCount++;
            this.recordStrategyChange('RESTART', report.stepNumber);
            return {
                strategy: 'RESTART',
                confidence: 0.6,
                reason: 'Very low confidence in current approach, starting fresh',
                guidance: 'Begin with a completely different perspective or methodology',
                alternatives: ['SWITCH_APPROACH'],
            };
        }

        // Low confidence → backtrack or refine
        if (report.confidence < 0.25) {
            this.recordStrategyChange('BACKTRACK', report.stepNumber);
            return {
                strategy: 'BACKTRACK',
                confidence: 0.65,
                reason: 'Low confidence, need to reconsider recent steps',
                guidance: 'Review and correct the most recent reasoning steps',
                alternatives: ['REFINE', 'SWITCH_APPROACH'],
            };
        }

        // Moderate low confidence → refine
        this.recordStrategyChange('REFINE', report.stepNumber);
        return {
            strategy: 'REFINE',
            confidence: 0.7,
            reason: 'Moderate confidence, refine current approach',
            guidance: 'Clarify and strengthen the current reasoning path',
            alternatives: ['BACKTRACK'],
        };
    }

    /**
     * Handle stagnation (too many consecutive CONTINUE steps)
     */
    private handleStagnation(report: ProgressReport): StrategyRecommendation {
        logger.warn('[MetaReasoner] Stagnation detected', {
            consecutiveContinueCount: this.state.consecutiveContinueCount,
            step: report.stepNumber,
        });

        this.state.consecutiveContinueCount = 0;

        // If we've been continuing for too long, try a different approach
        this.recordStrategyChange('SWITCH_APPROACH', report.stepNumber);
        return {
            strategy: 'SWITCH_APPROACH',
            confidence: 0.75,
            reason: `Stagnation detected after ${this.state.consecutiveContinueCount} consecutive steps`,
            guidance: 'Try a fundamentally different approach or decompose the problem differently',
            alternatives: ['RESTART', 'BACKTRACK'],
        };
    }

    /**
     * Handle low quality metrics
     */
    private handleLowQuality(report: ProgressReport): StrategyRecommendation {
        logger.warn('[MetaReasoner] Low quality detected', {
            metrics: report.qualityMetrics,
            step: report.stepNumber,
        });

        this.state.consecutiveContinueCount = 0;
        this.recordStrategyChange('REFINE', report.stepNumber);

        return {
            strategy: 'REFINE',
            confidence: 0.7,
            reason: 'Quality metrics indicate coherence or relevance issues',
            guidance: 'Improve clarity and ensure reasoning steps are well-connected',
            alternatives: ['BACKTRACK', 'SWITCH_APPROACH'],
        };
    }

    /**
     * Generate specific guidance for next step
     */
    private generateGuidance(report: ProgressReport): string {
        if (report.stepsRemaining > 0) {
            return `Continue with current strategy. Estimated ${report.stepsRemaining} steps remaining.`;
        }
        return 'Approaching completion. Verify solution and prepare final answer.';
    }

    /**
     * Record strategy change in history
     */
    private recordStrategyChange(strategy: string, step: number): void {
        this.state.strategyHistory.push({step, strategy});
        this.state.performanceMetrics.strategyChangeCount++;
        this.state.lastStrategyChange = step;
    }

    /**
     * Get current state for diagnostics
     */
    getState(): Readonly<MetaReasonerState> {
        return Object.freeze({...this.state});
    }

    /**
     * Reset state for new reasoning session
     */
    reset(): void {
        this.state = {
            consecutiveContinueCount: 0,
            lastStrategyChange: 0,
            strategyHistory: [],
            performanceMetrics: {
                avgConfidence: 0,
                strategyChangeCount: 0,
                restartCount: 0,
            },
        };
        logger.debug('[MetaReasoner] State reset');
    }

    /**
     * Update average confidence metric
     */
    updateConfidenceMetric(confidence: number): void {
        const metrics = this.state.performanceMetrics;
        const count = this.state.strategyHistory.length + 1;
        metrics.avgConfidence = (metrics.avgConfidence * (count - 1) + confidence) / count;
    }
}

/**
 * Factory function for creating Meta-Reasoner with default config
 */
export function createMetaReasoner(config?: MetaReasonerConfig): MetaReasoner {
    return new MetaReasoner(config);
}
