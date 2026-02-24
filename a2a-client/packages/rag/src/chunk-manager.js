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
      case '.vue':
        chunks.push(...this.chunkVue(filePath, content));
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
   * Chunk Vue Single File Component
   */
  chunkVue(filePath, content) {
    const chunks = [];
    
    // Extract script section
    const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    if (scriptMatch && scriptMatch[1]) {
      const scriptContent = scriptMatch[1];
      chunks.push({
        id: this.hashContent(`${filePath}:script`),
        filePath,
        type: 'vue-script',
        name: 'script',
        content: scriptContent.trim(),
        startLine: content.substring(0, content.indexOf('<script')).split('\n').length,
      });
      
      // Extract exports (Vue 3 script setup or module.exports)
      const exportsMatch = scriptContent.match(/(?:export\s+(?:default|const)|module\.exports)\s*[=({]/);
      if (exportsMatch) {
        chunks.push(...this.chunkJS(filePath + ':vue', scriptContent));
      }
    }
    
    // Extract template section
    const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/);
    if (templateMatch && templateMatch[1]) {
      chunks.push({
        id: this.hashContent(`${filePath}:template`),
        filePath,
        type: 'vue-template',
        name: 'template',
        content: templateMatch[1].trim(),
        startLine: content.substring(0, content.indexOf('<template')).split('\n').length,
      });
    }
    
    // Extract style section
    const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);
    if (styleMatch && styleMatch[1]) {
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

    // Laravel-specific extractions
    if (content.includes('use Illuminate') || content.includes('extends Controller')) {
      // Extract route definitions
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

      // Extract service container bindings
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

    // Extract TypeScript interfaces
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

      // Extract TypeScript types
      const typeRegex = /type\s+(\w+)(?:\s*<[^>]+>)?\s*=/g;
      while ((match = typeRegex.exec(content)) !== null) {
        // Find the full type definition
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
