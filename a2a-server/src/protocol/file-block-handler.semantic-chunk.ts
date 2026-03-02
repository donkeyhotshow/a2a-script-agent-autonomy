/** Semantic chunking of file content for RAG. */

export interface SemanticChunk {
    content: string;
    lineStart: number;
    lineEnd: number;
    type?: string;
    name?: string;
}

export interface ChunkByDelimiterOptions {
    /** Array of delimiter patterns to split by (e.g., ['class ', 'function ', 'interface ']) */
    delimiters: string[];
    /** Whether to include metadata (type, name) in each chunk */
    includeMetadata?: boolean;
    /** Language for language-specific delimiter detection */
    language?: 'php' | 'typescript' | 'javascript' | 'unknown';
}

type SupportedLanguage = 'php' | 'typescript' | 'javascript';

/**
 * Get default delimiters based on language
 */
export function getDefaultDelimiters(language: ChunkByDelimiterOptions['language']): string[] {
    const defaults: Record<SupportedLanguage, string[]> = {
        php: ['<?php', 'class ', 'function ', 'interface ', 'trait ', 'enum ', 'const ', 'public function ', 'private function ', 'protected function '],
        typescript: ['class ', 'function ', 'interface ', 'type ', 'enum ', 'const ', 'export ', 'async ', 'public ', 'private ', 'protected '],
        javascript: ['class ', 'function ', 'const ', 'let ', 'var ', 'export ', 'async ', 'import '],
    };

    if (language && language in defaults) {
        return defaults[language as SupportedLanguage];
    }
    return defaults.typescript;
}

/**
 * Detect language from file extension or content
 */
export function detectLanguageFromContent(content: string, filename?: string): ChunkByDelimiterOptions['language'] {
    if (filename) {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (ext === 'php') return 'php';
        if (ext === 'ts' || ext === 'tsx' || ext === 'mts' || ext === 'cts') return 'typescript';
        if (ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs') return 'javascript';
    }

    // Detect from content
    if (content.includes('<?php') || content.startsWith('<?')) return 'php';
    if (content.includes(': string') || content.includes(': number') || content.includes('interface ') || content.includes(': boolean')) return 'typescript';

    return 'unknown';
}

/**
 * Extract type and name from delimiter match
 */
function extractMetadata(delimiter: string, matchText: string): { type: string; name: string } | null {
    const patterns: { regex: RegExp; type: string }[] = [
        {regex: /class\s+(\w+)/, type: 'class'},
        {regex: /function\s+(\w+)/, type: 'function'},
        {regex: /interface\s+(\w+)/, type: 'interface'},
        {regex: /type\s+(\w+)/, type: 'type'},
        {regex: /enum\s+(\w+)/, type: 'enum'},
        {regex: /trait\s+(\w+)/, type: 'trait'},
        {regex: /const\s+(\w+)/, type: 'const'},
        {regex: /let\s+(\w+)/, type: 'variable'},
        {regex: /var\s+(\w+)/, type: 'variable'},
        {regex: /export\s+(class|function|const|let|var|interface|type)/, type: 'export'},
        {regex: /async\s+function\s+(\w+)/, type: 'async-function'},
        {regex: /public\s+function\s+(\w+)/, type: 'public-method'},
        {regex: /private\s+function\s+(\w+)/, type: 'private-method'},
        {regex: /protected\s+function\s+(\w+)/, type: 'protected-method'},
        {regex: /<\?php/, type: 'php-open'},
    ];

    for (const {regex, type} of patterns) {
        const match = matchText.match(regex);
        if (match) {
            return {type, name: match[1] || type};
        }
    }

    return {type: 'unknown', name: delimiter.trim()};
}

/**
 * Calculate line number from byte offset
 */
function getLineAtOffset(text: string, offset: number): number {
    const slice = text.slice(0, offset);
    return (slice.match(/\r?\n/g) || []).length + 1;
}

/**
 * Semantic chunking by delimiters (classes, functions, methods).
 * Splits content based on code structure delimiters.
 *
 * @example
 * const chunks = chunkByDelimiter(content, {
 *   delimiters: ['class ', 'function ', 'interface '],
 *   includeMetadata: true
 * });
 * // Returns: [{ content: 'class User...', lineStart: 1, lineEnd: 50, type: 'class' }]
 */
export function chunkByDelimiter(
    content: string,
    options: ChunkByDelimiterOptions
): SemanticChunk[] {
    const {delimiters, includeMetadata = true} = options;

    if (!content || !delimiters || delimiters.length === 0) {
        return [{
            content,
            lineStart: 1,
            lineEnd: (content.match(/\r?\n/g) || []).length + 1,
        }];
    }

    // Build regex pattern from delimiters (escape special chars)
    const escapedDelimiters = delimiters.map(d =>
        d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const pattern = new RegExp(`(${escapedDelimiters.join('|')})`, 'g');

    const chunks: SemanticChunk[] = [];
    const totalLines = (content.match(/\r?\n/g) || []).length + 1;

    // Find all matches with their positions
    const matches: { index: number; delimiter: string; text: string }[] = [];
    let match: RegExpExecArray | null;

    // Reset lastIndex for fresh search
    pattern.lastIndex = 0;

    while ((match = pattern.exec(content)) !== null) {
        const delimiter = match[1];
        if (delimiter) {
            matches.push({
                index: match.index,
                delimiter,
                text: match[0],
            });
        }
    }

    // If no matches, return entire content as single chunk
    if (matches.length === 0) {
        return [{
            content,
            lineStart: 1,
            lineEnd: totalLines,
        }];
    }

    // Sort matches by index
    matches.sort((a, b) => a.index - b.index);

    // Create chunks from matches
    for (let i = 0; i < matches.length; i++) {
        const matchInfo = matches[i];
        if (!matchInfo) continue;

        const startOffset = matchInfo.index;
        const nextMatch = matches[i + 1];
        const endOffset = nextMatch ? nextMatch.index : content.length;

        // Get content for this chunk (including the delimiter)
        const chunkContent = content.slice(startOffset, endOffset).trim();
        if (!chunkContent) continue;

        // Calculate line numbers
        const lineStart = getLineAtOffset(content, startOffset);
        const lineEnd = getLineAtOffset(content, endOffset);

        // Extract metadata if requested
        let type: string | undefined;
        let name: string | undefined;

        if (includeMetadata) {
            const metadata = extractMetadata(matchInfo.delimiter, matchInfo.text);
            if (metadata) {
                type = metadata.type;
                name = metadata.name;
            }
        }

        const chunk: SemanticChunk = {
            content: chunkContent,
            lineStart,
            lineEnd,
        };

        // Add optional properties only if they exist
        if (type) chunk.type = type;
        if (name) chunk.name = name;

        chunks.push(chunk);
    }

    return chunks;
}

/**
 * Legacy function - kept for backward compatibility
 * @deprecated Use chunkByDelimiter with options object instead
 */
export function chunkByDelimiterLegacy(text: string, delimiter: RegExp): SemanticChunk[] {
    const chunks: SemanticChunk[] = [];
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    const re = new RegExp(delimiter.source, delimiter.flags + 'g');
    while ((m = re.exec(text)) !== null) {
        if (m.index > lastIndex) {
            chunks.push({
                content: text.slice(lastIndex, m.index),
                lineStart: getLineAtOffset(text, lastIndex),
                lineEnd: getLineAtOffset(text, m.index),
            });
        }
        lastIndex = m.index;
    }
    if (lastIndex < text.length) {
        chunks.push({
            content: text.slice(lastIndex),
            lineStart: getLineAtOffset(text, lastIndex),
            lineEnd: getLineAtOffset(text, text.length),
        });
    }
    return chunks;
}

export function chunkByLines(text: string, maxLines = 50): SemanticChunk[] {
    const lines = text.split(/\r?\n/);
    const chunks: SemanticChunk[] = [];
    for (let i = 0; i < lines.length; i += maxLines) {
        const slice = lines.slice(i, i + maxLines);
        const content = slice.join('\n');
        chunks.push({
            content,
            lineStart: i + 1,
            lineEnd: i + slice.length,
        });
    }
    return chunks;
}
