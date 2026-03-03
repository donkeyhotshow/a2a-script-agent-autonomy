import type {CodeBlock, RecognitionResult} from '../../types/entity.types.js';
import {recognizeEntities} from '../entity-recognition/index.js';
import type {EnrichedContextFile, FileScore} from './types.js';

type RecognizeEntitiesFn = (block: CodeBlock) => RecognitionResult;

const APPROX_TOKENS_PER_CHAR = 0.25;
const RELATED_FILES_LIMIT = 2;

export class EntityContextAssembler {
  constructor(
    private readonly recognizeFn: RecognizeEntitiesFn = recognizeEntities
  ) {}

  assemble(
    scoredFiles: FileScore[],
    maxFiles: number,
    maxTokens: number
  ): EnrichedContextFile[] {
    const selected = scoredFiles.slice(0, maxFiles);
    const assembled: EnrichedContextFile[] = [];
    let totalTokens = 0;

    for (const fileScore of selected) {
      const approxTokens = Math.ceil(fileScore.file.content.length * APPROX_TOKENS_PER_CHAR);
      if (totalTokens + approxTokens > maxTokens) {
        break;
      }

      totalTokens += approxTokens;
      const recognition = this.recognizeFn({
        path: fileScore.file.filePath,
        content: fileScore.file.content,
      });

      assembled.push({
        path: fileScore.file.filePath,
        content: fileScore.file.content,
        entities: recognition.entities,
        relatedFiles: this.getRelatedFiles(fileScore, scoredFiles),
        relevanceExplanation: this.buildExplanation(fileScore),
        finalScore: Number(fileScore.finalScore.toFixed(3)),
      });
    }

    return assembled;
  }

  private getRelatedFiles(current: FileScore, scoredFiles: FileScore[]): string[] {
    const related = new Set<string>();

    for (const entry of scoredFiles) {
      if (related.size >= RELATED_FILES_LIMIT) break;
      if (entry.file.filePath === current.file.filePath) continue;
      related.add(entry.file.filePath);
    }

    return Array.from(related);
  }

  private buildExplanation(entry: FileScore): string {
    return `Final ${entry.finalScore.toFixed(3)} (base ${entry.baseScore.toFixed(3)}, entity ${entry.entityScore.toFixed(3)}, relation ${entry.relationshipScore.toFixed(3)})`;
  }
}
