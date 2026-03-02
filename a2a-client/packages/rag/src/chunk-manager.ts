/**
 * Chunk Manager - Manages code chunking for RAG
 */

import crypto from 'crypto';

export interface Chunk {
    id: string;
    filePath: string;
    type: string;
    name?: string;
    content: string;
    startLine: number;
    endLine?: number;
    visibility?: string;
    method?: string;
}

export interface ChunkManagerConfig {
    [key: string]: unknown;
}

export class ChunkManager {
    private config: ChunkManagerConfig;

    constructor(config: ChunkManagerConfig = {}) {
        this.config = config;
    }

    hashContent(content: string): string {
        return crypto.createHash('md5').update(content).digest('hex').substring(0, 12);
    }

    chunkFile(filePath: string, content: string, ext: string): Chunk[] {
        switch (ext) {
            case '.php':
                return this.chunkPHP(filePath, content);
            case '.js':
            case '.ts':
                return this.chunkJS(filePath, content);
            case '.vue':
                return this.chunkVue(filePath, content);
            case '.md':
                return this.chunkMarkdown(filePath, content);
            default:
                return this.chunkLines(filePath, content);
        }
    }

    chunkVue(filePath: string, content: string): Chunk[] {
        const chunks: Chunk[] = [];
        const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
        if (scriptMatch?.[1]) {
            const scriptContent = scriptMatch[1];
            chunks.push({
                id: this.hashContent(`${filePath}:script`),
                filePath,
                type: 'vue-script',
                name: 'script',
                content: scriptContent.trim(),
                startLine: content.substring(0, content.indexOf('<script')).split('\n').length,
            });
            const exportsMatch = scriptContent.match(/(?:export\s+(?:default|const)|module\.exports)\s*[=({]/);
            if (exportsMatch) chunks.push(...this.chunkJS(filePath + ':vue', scriptContent));
        }
        const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/);
        if (templateMatch?.[1]) {
            chunks.push({
                id: this.hashContent(`${filePath}:template`),
                filePath,
                type: 'vue-template',
                name: 'template',
                content: templateMatch[1].trim(),
                startLine: content.substring(0, content.indexOf('<template')).split('\n').length,
            });
        }
        const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);
        if (styleMatch?.[1]) {
            chunks.push({
                id: this.hashContent(`${filePath}:style`),
                filePath,
                type: 'vue-style',
                name: 'style',
                content: styleMatch[1].trim(),
                startLine: content.substring(0, content.indexOf('<style')).split('\n').length,
            });
        }
        return chunks;
    }

    chunkPHP(filePath: string, content: string): Chunk[] {
        const chunks: Chunk[] = [];
        const classRegex = /class\s+(\w+)/g;
        const methodRegex = /(public|private|protected)\s+function\s+(\w+)/g;
        let match: RegExpExecArray | null;
        while ((match = classRegex.exec(content)) !== null) {
            chunks.push({
                id: this.hashContent(`${filePath}:class:${match[1]}`),
                filePath,
                type: 'class',
                name: match[1],
                content: this.extractBlock(content, match.index),
                startLine: content.substring(0, match.index).split('\n').length,
            });
        }
        while ((match = methodRegex.exec(content)) !== null) {
            chunks.push({
                id: this.hashContent(`${filePath}:method:${match[2]}`),
                filePath,
                type: 'method',
                name: match[2],
                visibility: match[1],
                content: this.extractBlock(content, match.index),
                startLine: content.substring(0, match.index).split('\n').length,
            });
        }
        if (content.includes('use Illuminate') || content.includes('extends Controller')) {
            const routeRegex = /(?:Route::|router->)(get|post|put|delete|patch|options)\s*\(\s*['"]([^'"]+)/g;
            while ((match = routeRegex.exec(content)) !== null) {
                chunks.push({
                    id: this.hashContent(`${filePath}:route:${match[2]}`),
                    filePath,
                    type: 'route',
                    name: match[2],
                    method: match[1],
                    content: match[0],
                    startLine: content.substring(0, match.index).split('\n').length,
                });
            }
            const bindingRegex = /(?:app\(|App::make\()\s*['"]([^'"]+)/g;
            while ((match = bindingRegex.exec(content)) !== null) {
                chunks.push({
                    id: this.hashContent(`${filePath}:binding:${match[1]}`),
                    filePath,
                    type: 'binding',
                    name: match[1],
                    content: match[0],
                    startLine: content.substring(0, match.index).split('\n').length,
                });
            }
        }
        return chunks;
    }

    chunkJS(filePath: string, content: string): Chunk[] {
        const chunks: Chunk[] = [];
        const funcRegex = /(function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(|class\s+(\w+))/g;
        let match: RegExpExecArray | null;
        while ((match = funcRegex.exec(content)) !== null) {
            const name = match[2] ?? match[3] ?? match[4];
            if (name) {
                chunks.push({
                    id: this.hashContent(`${filePath}:func:${name}`),
                    filePath,
                    type: match[4] ? 'class' : 'function',
                    name,
                    content: this.extractBlock(content, match.index),
                    startLine: content.substring(0, match.index).split('\n').length,
                });
            }
        }
        if (filePath.endsWith('.ts') || content.includes('interface ')) {
            const interfaceRegex = /interface\s+(\w+)(?:\s*<[^>]+>)?\s*(?:extends\s+\w+)?\s*{/g;
            while ((match = interfaceRegex.exec(content)) !== null) {
                chunks.push({
                    id: this.hashContent(`${filePath}:interface:${match[1]}`),
                    filePath,
                    type: 'interface',
                    name: match[1],
                    content: this.extractBlock(content, match.index),
                    startLine: content.substring(0, match.index).split('\n').length,
                });
            }
            const typeRegex = /type\s+(\w+)(?:\s*<[^>]+>)?\s*=/g;
            while ((match = typeRegex.exec(content)) !== null) {
                let endIndex = content.indexOf(';', match.index);
                if (endIndex === -1) endIndex = content.length;
                const typeContent = content.substring(match.index, endIndex + 1);
                chunks.push({
                    id: this.hashContent(`${filePath}:type:${match[1]}`),
                    filePath,
                    type: 'type',
                    name: match[1],
                    content: typeContent,
                    startLine: content.substring(0, match.index).split('\n').length,
                });
            }
        }
        return chunks;
    }

    chunkMarkdown(filePath: string, content: string): Chunk[] {
        const chunks: Chunk[] = [];
        const lines = content.split('\n');
        let currentSection = '';
        let currentTitle = '';
        let startLine = 1;
        let lineNum = 1;
        for (const line of lines) {
            if (line.startsWith('#')) {
                if (currentSection.trim()) {
                    chunks.push({
                        id: this.hashContent(`${filePath}:section:${currentTitle}`),
                        filePath,
                        type: 'section',
                        name: currentTitle,
                        content: currentSection.trim(),
                        startLine,
                    });
                }
                currentTitle = line.replace(/^#+\s*/, '');
                currentSection = line + '\n';
                startLine = lineNum;
            } else {
                currentSection += line + '\n';
            }
            lineNum++;
        }
        if (currentSection.trim()) {
            chunks.push({
                id: this.hashContent(`${filePath}:section:${currentTitle}`),
                filePath,
                type: 'section',
                name: currentTitle,
                content: currentSection.trim(),
                startLine,
            });
        }
        return chunks;
    }

    chunkLines(filePath: string, content: string, chunkSize = 50): Chunk[] {
        const chunks: Chunk[] = [];
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i += chunkSize) {
            const chunkLines = lines.slice(i, i + chunkSize);
            chunks.push({
                id: this.hashContent(`${filePath}:lines:${i}`),
                filePath,
                type: 'lines',
                content: chunkLines.join('\n'),
                startLine: i + 1,
                endLine: Math.min(i + chunkSize, lines.length),
            });
        }
        return chunks;
    }

    extractBlock(content: string, startIndex: number): string {
        let braceCount = 0;
        let inBlock = false;
        let block = '';
        for (let i = startIndex; i < content.length; i++) {
            const char = content[i];
            if (char === '{') {
                braceCount++;
                inBlock = true;
            }
            if (inBlock) block += char;
            if (char === '}') {
                braceCount--;
                if (braceCount === 0 && inBlock) break;
            }
            if (block.length > 5000) break;
        }
        return block;
    }
}
