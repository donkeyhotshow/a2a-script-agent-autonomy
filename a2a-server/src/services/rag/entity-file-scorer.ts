import type {
  EntityQuery,
  FileScore,
  ScoringConfig,
  SearchResult,
} from './types.js';

const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  baseWeight: 0.4,
  entityWeight: 0.4,
  relationshipWeight: 0.2,
};

const RELATIONSHIP_KEYWORDS = [
  'hasmany',
  'hasone',
  'belongsto',
  'uses',
  'calls',
  'imports',
  'extends',
  'implements',
  'validates',
];

export class EntityFileScorer {
  constructor(private readonly config: ScoringConfig = DEFAULT_SCORING_CONFIG) {}

  scoreFiles(ragResults: SearchResult[], query: EntityQuery): FileScore[] {
    if (ragResults.length === 0) return [];

    const maxBaseScore = Math.max(
      ...ragResults.map((result) => Math.abs(result.score)),
      0.0001
    );

    return ragResults
      .map((result) => {
        const entityScore = this.calculateEntityScore(result.content, query);
        const relationshipScore = this.calculateRelationshipScore(result.content, query);
        const normalizedBase = result.score / maxBaseScore;
        const weighted =
          this.config.baseWeight * normalizedBase +
          this.config.entityWeight * entityScore +
          this.config.relationshipWeight * relationshipScore;
        const finalScore = Math.min(1, Math.max(0, weighted));

        const enrichedResult: SearchResult = {
          ...result,
          score: Number(finalScore.toFixed(3)),
          metadata: {
            ...result.metadata,
            baseScore: Number(result.score.toFixed(3)),
            entityScore: Number(entityScore.toFixed(3)),
            relationshipScore: Number(relationshipScore.toFixed(3)),
            explanation: this.buildExplanation(finalScore, result.score, entityScore, relationshipScore),
          },
        };

        return {
          file: enrichedResult,
          baseScore: result.score,
          entityScore,
          relationshipScore,
          finalScore,
        };
      })
      .sort((a, b) => b.finalScore - a.finalScore);
  }

  private calculateEntityScore(content: string, query: EntityQuery): number {
    const text = content.toLowerCase();
    const nameMatches = query.names.reduce((count, name) => {
      const cleaned = name.toLowerCase().trim();
      return count + (cleaned && text.includes(cleaned) ? 1 : 0);
    }, 0);

    const typeMatches = query.types.reduce((count, type) => {
      const cleaned = type.toLowerCase().trim();
      return count + (cleaned && text.includes(cleaned) ? 1 : 0);
    }, 0);

    const nameScore = query.names.length ? nameMatches / query.names.length : 0;
    const typeScore = query.types.length ? typeMatches / query.types.length : 0;

    return Math.min(1, nameScore * 0.7 + typeScore * 0.3);
  }

  private calculateRelationshipScore(content: string, query: EntityQuery): number {
    const text = content.toLowerCase();
    const matchedQueryRelations = query.relations.reduce((count, relation) => {
      const cleaned = relation.toLowerCase().trim();
      return count + (cleaned && text.includes(cleaned) ? 1 : 0);
    }, 0);

    const matchedKeywords = RELATIONSHIP_KEYWORDS.filter((keyword) =>
      text.includes(keyword)
    ).length;

    const relationPool = Math.max(1, query.relations.length + RELATIONSHIP_KEYWORDS.length);

    return Math.min(
      1,
      (matchedQueryRelations * 0.7 + matchedKeywords * 0.3) / relationPool
    );
  }

  private buildExplanation(
    finalScore: number,
    baseScore: number,
    entityScore: number,
    relationshipScore: number
  ): string {
    return `Score ${finalScore.toFixed(3)} (base ${baseScore.toFixed(3)}, entity ${entityScore.toFixed(3)}, relation ${relationshipScore.toFixed(3)})`;
  }
}
