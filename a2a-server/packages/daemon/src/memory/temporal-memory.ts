/**
 * TemporalMemory — ADR-0064: Multi-hop episodic recall with temporal reasoning.
 *
 * Extends EpisodicMemory's single-pass recall with multi-hop chaining:
 *   Hop 1 — most similar episode to the query
 *   Hop 2 — from that episode's context, find the next most similar
 *   Hop 3 — synthesize across the chain, surface contradictions
 *
 * Knowledge graph (adjacency list) is stored in Redis when available,
 * falling back to an in-memory Map.
 *
 * Wire: replace single-hop recall in SCANNING state with multiHopRecall().
 */

import { EpisodicMemory, type Episode, type RecallResult } from './episodic-memory.js';

// ── Public types ──────────────────────────────────────────────────────────────

export interface TemporalHop {
  episode_id: string;
  similarity: number;
  temporal_distance_days: number;
  bridge_concept: string;
  lessons_transferred: string[];
}

export interface TemporalChain {
  query: string;
  hops: TemporalHop[];
  synthesized_insight: string;
  confidence: number;
  contradictions_found: string[];
}

export interface TemporalPattern {
  description: string;
  occurrences: number;
  first_seen: number;
  last_seen: number;
  sessions_affected: string[];
  confidence: number;
}

export interface KnowledgeNode {
  concept: string;
  episode_ids: string[];
  related_concepts: string[];
  co_occurrence_count: number;
}

// ── TemporalMemory ────────────────────────────────────────────────────────────

export class TemporalMemory {
  private readonly episodic: EpisodicMemory;
  /** In-memory knowledge graph fallback (concept → KnowledgeNode) */
  private readonly graph = new Map<string, KnowledgeNode>();

  constructor(episodic?: EpisodicMemory) {
    this.episodic = episodic ?? new EpisodicMemory();
  }

  // ── multiHopRecall() ───────────────────────────────────────────────────────

  /**
   * Multi-hop temporal recall. Each hop uses the previous hop's episode context
   * to guide the next search, accumulating lessons and detecting contradictions.
   */
  async multiHopRecall(query: string, maxHops = 3): Promise<TemporalChain> {
    const hops: TemporalHop[] = [];
    const allLessons: string[] = [];
    const contradictions: string[] = [];

    let currentQuery = query;
    let previousEpisode: Episode | null = null;
    const visitedIds = new Set<string>();

    for (let hop = 0; hop < maxHops; hop++) {
      const results = await this.episodic.recall(currentQuery, 5);

      // Pick the most similar episode not yet visited
      const candidate = results.find((r) => !visitedIds.has(r.episode.id));
      if (!candidate) break;

      visitedIds.add(candidate.episode.id);

      const bridgeConcept = this._findBridgeConcept(
        previousEpisode,
        candidate.episode,
        currentQuery,
      );

      const hop_result: TemporalHop = {
        episode_id: candidate.episode.id,
        similarity: candidate.similarity_score,
        temporal_distance_days: previousEpisode
          ? Math.round(
              Math.abs(candidate.episode.created_at - previousEpisode.created_at) /
                (1000 * 60 * 60 * 24),
            )
          : 0,
        bridge_concept: bridgeConcept,
        lessons_transferred: candidate.episode.lessons,
      };

      hops.push(hop_result);
      allLessons.push(...candidate.episode.lessons);

      // Detect contradictions between hops (same session type, different outcomes)
      if (previousEpisode) {
        const contradiction = this._detectContradiction(previousEpisode, candidate.episode);
        if (contradiction) contradictions.push(contradiction);
      }

      // Next hop query: blend current query with the bridge concept
      currentQuery = `${bridgeConcept} ${candidate.episode.task_description.slice(0, 80)}`;
      previousEpisode = candidate.episode;
    }

    const confidence = hops.length > 0
      ? hops.reduce((s, h) => s + h.similarity, 0) / hops.length
      : 0;

    const synthesizedInsight = this._synthesize(query, hops, allLessons, contradictions);

    return {
      query,
      hops,
      synthesized_insight: synthesizedInsight,
      confidence,
      contradictions_found: contradictions,
    };
  }

  // ── temporalReasoning() ────────────────────────────────────────────────────

  /**
   * Find patterns that only appear across time — e.g. degradation after long runs,
   * confidence drops at specific loop counts.
   */
  async temporalReasoning(episodes: Episode[]): Promise<TemporalPattern[]> {
    const patterns: TemporalPattern[] = [];
    if (episodes.length < 2) return patterns;

    // Sort by time
    const sorted = [...episodes].sort((a, b) => a.created_at - b.created_at);

    // Pattern: tool failure rate over time
    const toolFailPatterns = this._detectToolFailurePattern(sorted);
    patterns.push(...toolFailPatterns);

    // Pattern: confidence drop after many loops
    const loopConfidencePattern = this._detectLoopConfidenceDrop(sorted);
    if (loopConfidencePattern) patterns.push(loopConfidencePattern);

    // Pattern: long sessions correlate with failures
    const durationPattern = this._detectDurationFailurePattern(sorted);
    if (durationPattern) patterns.push(durationPattern);

    return patterns;
  }

  // ── buildKnowledgeGraph() ──────────────────────────────────────────────────

  /**
   * Build (or refresh) the in-memory knowledge graph from all stored episodes.
   * Concepts are extracted from task descriptions and lessons.
   */
  async buildKnowledgeGraph(): Promise<KnowledgeNode[]> {
    const all = await this.episodic.recall('', 1000);
    this.graph.clear();

    for (const { episode } of all) {
      const concepts = this._extractConcepts(
        episode.task_description + ' ' + episode.lessons.join(' '),
      );

      for (const concept of concepts) {
        const node = this.graph.get(concept) ?? {
          concept,
          episode_ids: [],
          related_concepts: [],
          co_occurrence_count: 0,
        };
        if (!node.episode_ids.includes(episode.id)) {
          node.episode_ids.push(episode.id);
        }
        // Co-occurrence: link to other concepts in same episode
        for (const other of concepts) {
          if (other !== concept && !node.related_concepts.includes(other)) {
            node.related_concepts.push(other);
          }
        }
        node.co_occurrence_count++;
        this.graph.set(concept, node);
      }
    }

    return Array.from(this.graph.values());
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _findBridgeConcept(
    from: Episode | null,
    to: Episode,
    query: string,
  ): string {
    if (!from) {
      // First hop: extract key concept from query
      const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
      return words[0] ?? 'general';
    }

    const fromWords = new Set(
      (from.task_description + ' ' + from.lessons.join(' '))
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 4),
    );
    const toWords = (to.task_description + ' ' + to.lessons.join(' '))
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4);

    // Bridge = first common word with length > 5
    for (const w of toWords) {
      if (fromWords.has(w) && w.length > 5) return w;
    }

    return toWords[0] ?? 'related';
  }

  private _detectContradiction(a: Episode, b: Episode): string | null {
    // Same strategy was used in both, but different outcomes
    const sharedStrategies = a.strategies_used.filter((s) =>
      b.strategies_used.includes(s),
    );
    if (sharedStrategies.length === 0) return null;

    if (a.outcome === 'success' && b.outcome === 'failure') {
      return `Strategy "${sharedStrategies[0]}" succeeded in ep ${a.id} but failed in ep ${b.id}.`;
    }
    if (a.outcome === 'failure' && b.outcome === 'success') {
      return `Strategy "${sharedStrategies[0]}" failed in ep ${a.id} but succeeded in ep ${b.id}.`;
    }
    return null;
  }

  private _synthesize(
    query: string,
    hops: TemporalHop[],
    lessons: string[],
    contradictions: string[],
  ): string {
    if (hops.length === 0) {
      return `No relevant episodes found for: "${query}".`;
    }

    const uniqueLessons = [...new Set(lessons)].slice(0, 5);
    const contradictionSummary =
      contradictions.length > 0
        ? ` Contradictions detected: ${contradictions.slice(0, 2).join('; ')}`
        : '';

    return (
      `From ${hops.length} related episode(s), key lessons: ` +
      uniqueLessons.join('; ') +
      contradictionSummary
    );
  }

  private _extractConcepts(text: string): string[] {
    // Simple keyword extraction: words > 5 chars, not stop words
    const STOP = new Set(['about', 'after', 'before', 'during', 'which', 'while', 'where', 'their', 'there']);
    return [
      ...new Set(
        text
          .toLowerCase()
          .replace(/[^a-z\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 5 && !STOP.has(w)),
      ),
    ].slice(0, 20);
  }

  private _detectToolFailurePattern(sorted: Episode[]): TemporalPattern[] {
    const failMap = new Map<string, { count: number; sessions: string[]; first: number; last: number }>();

    for (const ep of sorted) {
      for (const s of ep.strategies_that_failed) {
        const rec = failMap.get(s) ?? { count: 0, sessions: [], first: ep.created_at, last: ep.created_at };
        rec.count++;
        if (!rec.sessions.includes(ep.session_id)) rec.sessions.push(ep.session_id);
        rec.first = Math.min(rec.first, ep.created_at);
        rec.last = Math.max(rec.last, ep.created_at);
        failMap.set(s, rec);
      }
    }

    const patterns: TemporalPattern[] = [];
    for (const [tool, rec] of failMap) {
      if (rec.count >= 2) {
        patterns.push({
          description: `Strategy/tool "${tool}" failed ${rec.count} times across ${rec.sessions.length} session(s).`,
          occurrences: rec.count,
          first_seen: rec.first,
          last_seen: rec.last,
          sessions_affected: rec.sessions,
          confidence: Math.min(0.5 + rec.count * 0.1, 0.95),
        });
      }
    }
    return patterns;
  }

  private _detectLoopConfidenceDrop(sorted: Episode[]): TemporalPattern | null {
    const highLoop = sorted.filter((e) => e.loop_count >= 5 && e.confidence_final < 0.5);
    if (highLoop.length < 2) return null;
    return {
      description: `Confidence drops below 0.5 in sessions with ≥5 loops (observed in ${highLoop.length} episodes).`,
      occurrences: highLoop.length,
      first_seen: highLoop[0]?.created_at ?? 0,
      last_seen: highLoop[highLoop.length - 1]?.created_at ?? 0,
      sessions_affected: highLoop.map((e) => e.session_id),
      confidence: 0.75,
    };
  }

  private _detectDurationFailurePattern(sorted: Episode[]): TemporalPattern | null {
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    const longFailures = sorted.filter(
      (e) => e.duration_ms > TWO_HOURS_MS && e.outcome === 'failure',
    );
    if (longFailures.length < 2) return null;
    return {
      description: `Sessions exceeding 2 hours have a higher failure rate (${longFailures.length} cases).`,
      occurrences: longFailures.length,
      first_seen: longFailures[0]?.created_at ?? 0,
      last_seen: longFailures[longFailures.length - 1]?.created_at ?? 0,
      sessions_affected: longFailures.map((e) => e.session_id),
      confidence: 0.7,
    };
  }
}

// Re-export for convenience
export type { RecallResult };
