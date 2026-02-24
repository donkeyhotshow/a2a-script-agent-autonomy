/** Semantic chunking of file content for RAG. */

export interface SemanticChunk {
  start: number;
  end: number;
  text: string;
  kind?: string;
}

export function chunkByLines(text: string, maxLines = 50): SemanticChunk[] {
  const lines = text.split(/\r?\n/);
  const chunks: SemanticChunk[] = [];
  for (let i = 0; i < lines.length; i += maxLines) {
    const slice = lines.slice(i, i + maxLines);
    const text = slice.join('\n');
    chunks.push({ start: i, end: i + slice.length, text });
  }
  return chunks;
}

export function chunkByDelimiter(text: string, delimiter: RegExp): SemanticChunk[] {
  const chunks: SemanticChunk[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(delimiter.source, delimiter.flags + 'g');
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      chunks.push({
        start: 0,
        end: 0,
        text: text.slice(lastIndex, m.index),
      });
    }
    lastIndex = m.index;
  }
  if (lastIndex < text.length) {
    chunks.push({ start: 0, end: 0, text: text.slice(lastIndex) });
  }
  return chunks;
}
