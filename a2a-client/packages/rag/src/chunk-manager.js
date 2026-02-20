/**
 * Chunk Manager - Manages code chunking for RAG
 * 
 * Provides utilities for chunking code files into meaningful segments
 * for better information retrieval.
 */

const crypto = require('crypto');

class ChunkManager {
  constructor(config) {
    this.config = config || {};
  }

  /**
   * Hash content for chunk ID
   */
  hashContent(content) {
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 12);
  }

  /**
   * Chunk file content based on file type
   */
  chunkFile(filePath, content, ext) {
    const chunks = [];
    
    // Different chunking strategies by file type
    switch (ext) {
      case '.php':
        chunks.push(...this.chunkPHP(filePath, content));
        break;
      case '.js':
      case '.ts':
        chunks.push(...this.chunkJS(filePath, content));
        break;
      case '.md':
        chunks.push(...this.chunkMarkdown(filePath, content));
        break;
      default:
        chunks.push(...this.chunkLines(filePath, content));
    }

    return chunks;
  }

  /**
   * Chunk PHP file by class/method
   */
  chunkPHP(filePath, content) {
    const chunks = [];
    
    // Extract class definitions
    const classRegex = /class\s+(\w+)/g;
    const methodRegex = /(public|private|protected)\s+function\s+(\w+)/g;
    
    let match;
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

    return chunks;
  }

  /**
   * Chunk JS/TS file by function/class
   */
  chunkJS(filePath, content) {
    const chunks = [];
    
    // Extract function definitions
    const funcRegex = /(function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(|class\s+(\w+))/g;
    
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
      const name = match[2] || match[3] || match[4];
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

    return chunks;
  }

  /**
   * Chunk Markdown by sections
   */
  chunkMarkdown(filePath, content) {
    const chunks = [];
    const lines = content.split('\n');
    
    let currentSection = '';
    let currentTitle = '';
    let startLine = 1;
    let lineNum = 1;

    for (const line of lines) {
      if (line.startsWith('#')) {
        // Save previous section
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

    // Save last section
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

  /**
   * Simple line-based chunking
   */
  chunkLines(filePath, content, chunkSize = 50) {
    const chunks = [];
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

  /**
   * Extract code block from content
   */
  extractBlock(content, startIndex) {
    let braceCount = 0;
    let inBlock = false;
    let block = '';
    
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      
      if (char === '{') {
        braceCount++;
        inBlock = true;
      }
      
      if (inBlock) {
        block += char;
      }
      
      if (char === '}') {
        braceCount--;
        if (braceCount === 0 && inBlock) {
          break;
        }
      }
      
      // Limit block size
      if (block.length > 5000) {
        break;
      }
    }
    
    return block;
  }
}

module.exports = { ChunkManager };
