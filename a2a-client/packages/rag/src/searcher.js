/**
 * RAG Searcher - Search in indexed files
 * 
 * Локальный поиск по индексу без использования LLM.
 */

const fs = require('fs').promises;
const path = require('path');

class RAGSearcher {
  constructor(config) {
    this.projectPath = config.projectPath || process.cwd();
    this.indexPath = path.join(this.projectPath, '.a2a', 'index');
    this.index = null;
  }

  /**
   * Load index if not loaded
   */
  async loadIndex() {
    if (this.index) return this.index;
    
    try {
      const indexPath = path.join(this.indexPath, 'rag-files.json');
      const content = await fs.readFile(indexPath, 'utf-8');
      this.index = JSON.parse(content);
      return this.index;
    } catch (err) {
      console.warn('Index not found. Run `a2a index` first.');
      return { files: [], chunks: [] };
    }
  }

  /**
   * Search for relevant files
   */
  async search(query, options = {}) {
    const index = await this.loadIndex();
    const results = [];
    
    // Extract keywords from query
    const keywords = this.extractKeywords(query);
    
    // Search in chunks
    for (const chunk of index.chunks) {
      const score = this.scoreChunk(chunk, keywords, query);
      if (score > 0) {
        results.push({
          chunk,
          score,
          highlights: this.findHighlights(chunk.content, keywords),
        });
      }
    }
    
    // Sort by score and limit
    results.sort((a, b) => b.score - a.score);
    const limit = options.limit || 10;
    
    return results.slice(0, limit);
  }

  /**
   * Search for files matching pattern
   */
  async searchFiles(pattern, options = {}) {
    const index = await this.loadIndex();
    const results = [];
    
    for (const file of index.files) {
      if (this.matchPattern(file.path, pattern)) {
        results.push(file);
      }
    }
    
    return results;
  }

  /**
   * Get file content
   */
  async getFileContent(relativePath) {
    const fullPath = path.join(this.projectPath, relativePath);
    return fs.readFile(fullPath, 'utf-8');
  }

  /**
   * Get chunks for file
   */
  async getFileChunks(relativePath) {
    const index = await this.loadIndex();
    return index.chunks.filter(c => c.filePath === relativePath);
  }

  /**
   * Extract keywords from query
   */
  extractKeywords(query) {
    // Remove common words
    const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 
                       'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
                       'would', 'could', 'should', 'may', 'might', 'must', 'shall',
                       'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
                       'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
                       'добавь', 'создай', 'удали', 'измени', 'покажи', 'найди'];
    
    // Extract words
    const words = query.toLowerCase()
      .replace(/[^\w\sа-яё]/gi, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.includes(w));
    
    // Also extract technical terms
    const techTerms = query.match(/[A-Z][a-z]+[A-Z][a-z]+/g) || []; // CamelCase
    const classNames = query.match(/\b[A-Z][a-zA-Z]+\b/g) || []; // Class names
    const methodNames = query.match(/\b[a-z][a-zA-Z]+\(\)/g) || []; // Method calls
    
    return {
      words,
      techTerms: [...techTerms, ...classNames],
      methodNames: methodNames.map(m => m.replace('()', '')),
    };
  }

  /**
   * Score chunk relevance
   */
  scoreChunk(chunk, keywords, originalQuery) {
    let score = 0;
    const content = chunk.content.toLowerCase();
    
    // Score by keyword matches
    for (const word of keywords.words) {
      const regex = new RegExp(word, 'gi');
      const matches = content.match(regex);
      if (matches) {
        score += matches.length * 2;
      }
    }
    
    // Higher score for technical terms
    for (const term of keywords.techTerms) {
      if (content.toLowerCase().includes(term.toLowerCase())) {
        score += 10;
      }
    }
    
    // Higher score for method names
    for (const method of keywords.methodNames) {
      if (content.includes(method)) {
        score += 15;
      }
    }
    
    // Bonus for chunk type
    if (chunk.type === 'class' || chunk.type === 'method') {
      score *= 1.2;
    }
    
    // Bonus for name match
    if (chunk.name && keywords.techTerms.some(t => 
      chunk.name.toLowerCase().includes(t.toLowerCase())
    )) {
      score += 20;
    }
    
    return score;
  }

  /**
   * Find highlights in content
   */
  findHighlights(content, keywords) {
    const highlights = [];
    const allTerms = [
      ...keywords.words,
      ...keywords.techTerms,
      ...keywords.methodNames,
    ];
    
    for (const term of allTerms) {
      const regex = new RegExp(`.{0,50}${term}.{0,50}`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        highlights.push(...matches.slice(0, 2));
      }
    }
    
    return [...new Set(highlights)].slice(0, 5);
  }

  /**
   * Simple pattern matching
   */
  matchPattern(path, pattern) {
    // Use placeholder to avoid ** being processed as two *
    const regexPattern = pattern
      .replace(/\./g, '\\.')  // Escape dots first
      .replace(/\*\*/g, '{{GLOBSTAR}}')  // Replace ** with placeholder
      .replace(/\*/g, '[^/]*')  // Replace single *
      .replace(/{{GLOBSTAR}}/g, '.*');  // Replace placeholder with .*
    
    const regex = new RegExp(regexPattern);
    return regex.test(path);
  }

}

module.exports = { RAGSearcher };
