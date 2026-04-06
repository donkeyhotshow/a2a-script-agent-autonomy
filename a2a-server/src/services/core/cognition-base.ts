import { createArtifactWriteInput, globalArtifactStore } from './artifact-store.js';
import type { EpisodicMemory } from '../memory/episodic-memory.js';
import { promises as fs } from 'node:fs';
import { join } from 'path';
import { logger } from '../../utils/logger.js';

export interface RepoKnowledgePrior {
  topic: string;
  tech_stack: string[];           // ['Next.js', 'TypeScript', 'Redis']
  known_patterns: string[];       // ['singleton service', 'event-sourcing']
  known_anti_patterns: string[];  // ['boolean soup', 'direct main push']
  common_failure_modes: string[]; // ['context overflow', 'loop escalation']
  recommended_approaches: string[]; // ['branch-isolated', 'DRY-RUN first']
  source: 'lesson_store' | 'pattern_store' | 'episodic' | 'static' | 'dynamic';
  confidence: number;
}

export interface InjectedPriors {
  priors: RepoKnowledgePrior[];
  total_tokens_estimate: number;  // контроль контекста
  truncated: boolean;
  sources_used: string[];
}

export interface LessonStoreMock {
    query(topic: string): Promise<any[]>;
}

export interface PatternStoreMock {
    query(topic: string): Promise<any[]>;
}

const DEFAULT_COGNITION_PATH = join(process.cwd(), 'storage', 'cognition_priors.json');

export class CognitionBase {
  private readonly MAX_PRIOR_TOKENS = 500; // мягкий лимит
  private readonly COMPONENT_ID = 'CognitionBase';
  private dynamicPriors: RepoKnowledgePrior[] = [];
  private readonly filePath: string;

  constructor(filePath: string = process.env['COGNITION_PRIORS_PATH'] ?? DEFAULT_COGNITION_PATH) {
    this.filePath = filePath;
    globalArtifactStore.registerWriter('COGNITION_PRIORS', this.COMPONENT_ID);
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        this.dynamicPriors = parsed;
      } else {
        logger.warn('[CognitionBase] priors file is not an array; keeping in-memory priors only', {
          path: this.filePath,
        });
      }
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === 'ENOENT') return;
      logger.error('[CognitionBase] load failed', {
        path: this.filePath,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async save(): Promise<void> {
    try {
      await fs.mkdir(join(this.filePath, '..'), { recursive: true });
      await fs.writeFile(this.filePath, JSON.stringify(this.dynamicPriors, null, 2), 'utf-8');
    } catch (err) {
      console.error('[CognitionBase] Save failure', err);
    }
  }

  async recordPrior(prior: Omit<RepoKnowledgePrior, 'source'>): Promise<void> {
    this.dynamicPriors.push({ ...prior, source: 'dynamic' });
    await this.save();
  }

  async injectPriors(
    topic: string,
    sessionId: string,
    lessonStore: LessonStoreMock,
    patternStore: PatternStoreMock,
    episodicMemory: EpisodicMemory,
  ): Promise<InjectedPriors> {
    const allPriors: RepoKnowledgePrior[] = [...this.dynamicPriors.filter(p => p.topic === topic)];

    // 1. Lessons from LessonStore (post-rollback learnings)
    const lessons = await lessonStore.query(topic);
    for (const lesson of lessons.slice(0, 3)) {
      allPriors.push({
        topic,
        tech_stack: lesson.tags ?? [],
        known_patterns: [],
        known_anti_patterns: lesson.anti_patterns ?? [],
        common_failure_modes: [lesson.failure_mode ?? ''],
        recommended_approaches: [lesson.recommendation ?? ''],
        source: 'lesson_store',
        confidence: lesson.confidence ?? 0.8,
      });
    }

    // 2. Patterns from PatternStore (recurring code patterns)
    const patterns = await patternStore.query(topic);
    for (const pattern of patterns.slice(0, 3)) {
      allPriors.push({
        topic,
        tech_stack: pattern.tech_stack ?? [],
        known_patterns: [pattern.description],
        known_anti_patterns: pattern.anti_pattern ? [pattern.description] : [],
        common_failure_modes: [],
        recommended_approaches: pattern.anti_pattern ? [] : [pattern.description],
        source: 'pattern_store',
        confidence: pattern.confidence ?? 0.7,
      });
    }

    // 3. Top-1 episodic recall for warm start
    const episodes = await episodicMemory.recall(topic);
    if (episodes.length > 0) {
      const ep = episodes[0]!;
      allPriors.push({
        topic,
        tech_stack: [],
        known_patterns: ep.applicable_lessons ?? [],
        known_anti_patterns: [],
        common_failure_modes: ep.episode.outcome === 'failure' ? [ep.episode.task_description] : [],
        recommended_approaches: ep.episode.outcome === 'success' ? [ep.episode.task_description] : [],
        source: 'episodic',
        confidence: ep.similarity_score ?? 0.6,
      });
    }

    // Token budget control
    let totalTokens = 0;
    const selected: RepoKnowledgePrior[] = [];
    let truncated = false;

    for (const prior of allPriors.sort((a, b) => b.confidence - a.confidence)) {
      const estimatedTokens = JSON.stringify(prior).length / 4; // ~4 chars/token
      if (totalTokens + estimatedTokens > this.MAX_PRIOR_TOKENS) {
        truncated = true;
        break;
      }
      selected.push(prior);
      totalTokens += estimatedTokens;
    }

    await globalArtifactStore.write(
      createArtifactWriteInput({
        artifact_id: `cognition-${Date.now()}`,
        artifact_type: 'COGNITION_PRIORS',
        session_id: sessionId,
        turn_id: 'startup',
        schema_version: '1.0',
        data: { priors: selected, topic, truncated } as Record<string, unknown>,
        summary: `Injected ${selected.length} priors for topic: ${topic} (${totalTokens} tokens est.)`,
        severity: 'info',
      }),
      this.COMPONENT_ID,
    );

    return {
      priors: selected,
      total_tokens_estimate: totalTokens,
      truncated,
      sources_used: [...new Set(selected.map(p => p.source))],
    };
  }

  formatForContext(injected: InjectedPriors): string {
    if (injected.priors.length === 0) return '';

    const lines = ['## Prior Knowledge (from memory)'];
    for (const prior of injected.priors) {
      if (prior.known_anti_patterns.length > 0) {
        lines.push(`- ⚠️ Avoid: ${prior.known_anti_patterns.slice(0, 2).join('; ')}`);
      }
      if (prior.recommended_approaches.length > 0) {
        lines.push(`- ✅ Prefer: ${prior.recommended_approaches.slice(0, 2).join('; ')}`);
      }
      if (prior.common_failure_modes.filter(Boolean).length > 0) {
        lines.push(`- 🔴 Common failures: ${prior.common_failure_modes.filter(Boolean).slice(0, 2).join('; ')}`);
      }
    }
    return lines.join('\n');
  }
}
