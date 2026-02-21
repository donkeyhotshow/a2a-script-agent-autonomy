/**
 * Semantic Extractor — extract text/instructions from content, filter non-semantic.
 * Per neurons-and-paths-law: semantics → questions → index.
 */

export interface SemanticChunk {
  text: string;
  source: string;
  type: 'comment' | 'docblock' | 'string' | 'identifier';
}

const LINE_COMMENT = /\/\/\s*(.+)/g;
const BLOCK_COMMENT = /\/\*\*?([\s\S]*?)\*\//g;
const DOCBLOCK_TAG = /@(param|return|throws|var|see)\s+(\S+)\s*(.+)?/g;
const QUOTED_STRING = /['"`]([^'"`]{10,200})['"`]/g;
const CLASS_OR_FUNC = /\b(class|function|interface|enum)\s+(\w+)/g;

/**
 * Extract semantic chunks from file content.
 * Filters out implementation noise, keeps comments, docblocks, hints.
 */
export function extractSemantics(
  files: Array<{ path: string; content: string }>
): SemanticChunk[] {
  const chunks: SemanticChunk[] = [];

  for (const file of files) {
    const { path, content } = file;
    if (!content || typeof content !== 'string') continue;

    // Line comments
    let m;
    const lineRe = /\/\/\s*(.+)/g;
    while ((m = lineRe.exec(content)) !== null) {
      const text = m[1].trim();
      if (text.length > 3 && text.length < 500) {
        chunks.push({ text, source: path, type: 'comment' });
      }
    }

    // Block comments / docblocks
    const blockRe = /\/\*\*?([\s\S]*?)\*\//g;
    while ((m = blockRe.exec(content)) !== null) {
      const block = m[1].replace(/\*\s?/g, ' ').trim();
      if (block.length > 5 && block.length < 1000) {
        chunks.push({ text: block, source: path, type: 'docblock' });
      }
    }

    // Class/function/interface names (identifiers)
    const idRe = /\b(class|function|interface|enum)\s+(\w+)/g;
    while ((m = idRe.exec(content)) !== null) {
      chunks.push({
        text: `${m[1]} ${m[2]}`,
        source: path,
        type: 'identifier',
      });
    }
  }

  return chunks;
}
