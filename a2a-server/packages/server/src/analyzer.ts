import {
  createArtifactWriteInput,
  type ArtifactBase,
  type ArtifactStore,
} from './artifact-store';

const COMPONENT_ID = 'DedicatedAnalyzer';

export interface Pattern {
    type: 'repetition' | 'escalation' | 'convergence' | 'divergence';
    description: string;
    confidence: number;          // 0.0–1.0
    evidence_turn_ids: string[]; // какие turn'ы показали паттерн
}

export interface Anomaly {
    type: 'confidence_spike' | 'context_collapse' | 'tool_failure_cluster' | 'loop_semantic';
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggested_action: 'continue' | 'self_correct' | 'wait_human' | 'abort';
}

export interface Hypothesis {
    id: string;
    text: string;                // "Try approach X because Y"
    priority_score: number;      // 0.0–1.0
    basis: string[];             // evidence IDs
}

export interface AnalyzerInsights {
    session_id: string;
    turn_id: string;
    patterns: Pattern[];
    anomalies: Anomaly[];
    next_hypotheses: Hypothesis[];
    recommended_strategy: 'BACKTRACK' | 'SWITCH' | 'REFINE' | 'CONTINUE';
    confidence_delta: number;    // +/- поправка к confidence от текущей оценки
}

export class DedicatedAnalyzer {
    private readonly maxPatternWindow = 5; // анализировать последние 5 turn'ов

    constructor(private readonly artifactStore: ArtifactStore) {
        artifactStore.registerWriter('ANALYZER_INSIGHTS', COMPONENT_ID);
    }

    async analyze(
        responseArtifacts: ArtifactBase[],
        sessionHistory: unknown[],
        currentConfidence: number,
        loopCount: number,
    ): AnalyzerInsights {
        const patterns = this.extractPatterns(sessionHistory);
        const anomalies = this.detectAnomalies(responseArtifacts, currentConfidence, loopCount);
        const hypotheses = this.generateHypotheses(patterns, anomalies);
        const strategy = this.recommendStrategy(anomalies, loopCount);
        const confidenceDelta = this.computeConfidenceDelta(patterns, anomalies);

        const insights: AnalyzerInsights = {
            session_id: responseArtifacts[0]?.session_id ?? 'unknown',
            turn_id: `turn-${Date.now()}`,
            patterns,
            anomalies,
            next_hypotheses: hypotheses.slice(0, 3), // top-3
            recommended_strategy: strategy,
            confidence_delta: confidenceDelta,
        };

        // Emit ANALYZER_INSIGHTS artifact
        const artifactId = `insights-${Date.now()}`;
        await this.artifactStore.write(
            createArtifactWriteInput({
                artifact_id: artifactId,
                artifact_type: 'ANALYZER_INSIGHTS',
                session_id: insights.session_id,
                turn_id: insights.turn_id,
                schema_version: '1.0',
                data: insights as unknown as Record<string, unknown>,
                summary: `Strategy: ${insights.recommended_strategy}, anomalies: ${insights.anomalies.length}`,
                severity: insights.anomalies.some((a) => a.severity === 'high')
                    ? 'warning'
                    : 'info',
            }),
            COMPONENT_ID,
        );

        return insights;
    }

    private extractPatterns(history: unknown[]): Pattern[] {
        const window = history.slice(-this.maxPatternWindow);
        const patterns: Pattern[] = [];

        // Repetition: одинаковые action signatures
        const actionCounts = new Map<string, number>();
        for (const entry of window) {
            const sig = JSON.stringify((entry as Record<string, unknown>)['action'] ?? '');
            actionCounts.set(sig, (actionCounts.get(sig) ?? 0) + 1);
        }
        for (const [sig, count] of actionCounts) {
            if (count >= 2) {
                patterns.push({
                    type: 'repetition',
                    description: `Action repeated ${count}× in last ${this.maxPatternWindow} turns`,
                    confidence: Math.min(count / 3, 1.0),
                    evidence_turn_ids: [sig],
                });
            }
        }

        return patterns;
    }

    private detectAnomalies(
        artifacts: ArtifactBase[],
        confidence: number,
        loopCount: number,
    ): Anomaly[] {
        const anomalies: Anomaly[] = [];

        if (confidence < 0.4) {
            anomalies.push({
                type: 'confidence_spike',
                severity: 'high',
                description: `Confidence dropped to ${confidence.toFixed(2)} — below critical threshold`,
                suggested_action: 'self_correct',
            });
        }

        if (loopCount > 8) {
            anomalies.push({
                type: 'loop_semantic',
                severity: 'high',
                description: `Loop count ${loopCount} exceeds semantic loop threshold`,
                suggested_action: 'wait_human',
            });
        }

        const toolFailures = artifacts.filter(
            a => a.type === 'TOOL_AUDIT' &&
                (a.data as Record<string, unknown>)?.['outcome_class'] === 'fail'
        );
        if (toolFailures.length >= 3) {
            anomalies.push({
                type: 'tool_failure_cluster',
                severity: 'medium',
                description: `${toolFailures.length} tool failures in current batch`,
                suggested_action: 'self_correct',
            });
        }

        return anomalies;
    }

    private generateHypotheses(patterns: Pattern[], anomalies: Anomaly[]): Hypothesis[] {
        const hypotheses: Hypothesis[] = [];

        for (const anomaly of anomalies) {
            if (anomaly.type === 'confidence_spike') {
                hypotheses.push({
                    id: `hyp-conf-${Date.now()}`,
                    text: 'Narrow task scope to a single verifiable sub-goal before proceeding',
                    priority_score: 0.9,
                    basis: [`anomaly:${anomaly.type}`],
                });
            }
            if (anomaly.type === 'tool_failure_cluster') {
                hypotheses.push({
                    id: `hyp-tool-${Date.now()}`,
                    text: 'Switch to alternative tool or decompose failing operation into atomic steps',
                    priority_score: 0.8,
                    basis: [`anomaly:${anomaly.type}`],
                });
            }
        }

        for (const pattern of patterns) {
            if (pattern.type === 'repetition') {
                hypotheses.push({
                    id: `hyp-rep-${Date.now()}`,
                    text: 'Break repetition cycle by introducing REFINE strategy with different approach vector',
                    priority_score: 0.75,
                    basis: [`pattern:${pattern.type}`],
                });
            }
        }

        return hypotheses.sort((a, b) => b.priority_score - a.priority_score);
    }

    private recommendStrategy(anomalies: Anomaly[], loopCount: number): AnalyzerInsights['recommended_strategy'] {
        const hasHighSeverity = anomalies.some(a => a.severity === 'high');
        const hasMediumSeverity = anomalies.some(a => a.severity === 'medium');

        if (hasHighSeverity && loopCount > 5) return 'BACKTRACK';
        if (hasHighSeverity) return 'SWITCH';
        if (hasMediumSeverity) return 'REFINE';
        return 'CONTINUE';
    }

    private computeConfidenceDelta(patterns: Pattern[], anomalies: Anomaly[]): number {
        let delta = 0;
        for (const p of patterns) delta -= p.confidence * 0.1;
        for (const a of anomalies) {
            if (a.severity === 'high') delta -= 0.15;
            if (a.severity === 'medium') delta -= 0.05;
        }
        return Math.max(-0.5, Math.min(0.2, delta)); // clamp [-0.5, +0.2]
    }
}
