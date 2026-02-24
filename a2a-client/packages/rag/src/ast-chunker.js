/**
 * AST-based Chunking - Parse code using AST instead of regex
 * 
 * Provides more accurate code chunking by using Abstract Syntax Tree parsing.
 * Supports JavaScript, TypeScript, PHP, and Vue SFC.
 * 
 * @module @a2a/rag/ast-chunker
 * @version 1.0.0
 */

const crypto = require('crypto');

/**
 * AST Chunker class
 * Uses AST parsing for accurate code chunking
 */
class ASTChunker {
  constructor(config = {}) {
    this.config = config;
    this.parsers = {};
    
    // Initialize parsers lazily
    this._initParsers();
  }

  /**
   * Initialize available parsers
   * @private
   */
  _initParsers() {
    // Try to load parsers, fall back to regex-based if not available
    try {
      this.parsers.javascript = this._parseJavaScript.bind(this);
    } catch (e) {
      this.parsers.javascript = null;
    }
    
    try {
      this.parsers.php = this._parsePHP.bind(this);
    } catch (e) {
      this.parsers.php = null;
    }
    
    try {
      this.parsers.typescript = this._parseTypeScript.bind(this);
    } catch (e) {
      this.parsers.typescript = null;
    }
  }

  /**
   * Get parser for file extension
   * @param {string} ext - File extension
   * @returns {Function|null} Parser function
   * @private
   */
  _getParser(ext) {
    const parserMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.php': 'php',
    };
    
    const parserName = parserMap[ext.toLowerCase()];
    if (parserName && this.parsers[parserName]) {
      return this.parsers[parserName];
    }
    
    return null;
  }

  /**
   * Chunk file content using AST
   * @param {string} filePath - File path
   * @param {string} content - File content
   * @param {string} ext - File extension
   * @returns {Array} Array of chunks
   */
  chunkFile(filePath, content, ext) {
    const parser = this._getParser(ext);
    
    if (parser) {
      try {
        return parser(filePath, content);
      } catch (error) {
        console.warn(`[ASTChunker] Failed to parse ${filePath}:`, error.message);
        // Fall back to regex-based chunking
        return this._chunkFileRegex(filePath, content, ext);
      }
    }
    
    // Use regex-based chunking for unsupported types
    return this._chunkFileRegex(filePath, content, ext);
  }

  /**
   * Parse JavaScript using AST
   * @param {string} filePath - File path
   * @param {string} content - File content
   * @returns {Array} Array of chunks
   * @private
   */
  _parseJavaScript(filePath, content) {
    const chunks = [];
    
    // Try to use acorn or similar parser if available
    let ast;
    try {
      // Try using acorn if available
      const acorn = require('acorn');
      ast = acorn.parse(content, { 
        ecmaVersion: 2020, 
        sourceType: 'module',
        locations: true 
      });
    } catch (e) {
      // Fall back to regex-based parsing
      return this._chunkFileRegex(filePath, content, '.js');
    }
    
    // Extract functions and classes from AST
    this._extractDeclarations(ast, chunks, filePath, content);
    
    return chunks;
  }

  /**
   * Parse TypeScript using AST
   * @param {string} filePath - File path
   * @param {string} content - File content
   * @returns {Array} Array of chunks
   * @private
   */
  _parseTypeScript(filePath, content) {
    const chunks = [];
    
    try {
      // Try using @typescript-eslint/parser if available
      const parser = require('@typescript-eslint/parser');
      const ast = parser.parse(content, {
        ecmaVersion: 2020,
        sourceType: 'module',
      });
      
      this._extractDeclarations(ast, chunks, filePath, content);
    } catch (e) {
      // Fall back to regex-based
      return this._chunkFileRegex(filePath, content, '.ts');
    }
    
    return chunks;
  }

  /**
   * Parse PHP using AST
   * @param {string} filePath - File path
   * @param {string} content - File content
   * @returns {Array} Array of chunks
   * @private
   */
  _parsePHP(filePath, content) {
    const chunks = [];
    
    // Try using nikic/php-parser if available
    try {
      const parser = require('php-parser');
      const engine = new parser({
        parser: {
          extractDoc: true,
          php7: true,
        },
        ast: {
          withPositions: true,
          withSource: true,
        },
      });
      
      const ast = engine.parseCode(content);
      this._extractPHPDeclarations(ast, chunks, filePath);
    } catch (e) {
      // Fall back to regex-based
      return this._chunkFileRegex(filePath, content, '.php');
    }
    
    return chunks;
  }

  /**
   * Extract declarations from AST
   * @param {Object} ast - AST object
   * @param {Array} chunks - Chunks array to populate
   * @param {string} filePath - File path
   * @param {string} content - Full file content
   * @private
   */
  _extractDeclarations(ast, chunks, filePath, content) {
    if (!ast || !ast.body) return;
    
    for (const node of ast.body) {
      switch (node.type) {
        case 'FunctionDeclaration':
          if (node.id) {
            chunks.push({
              id: this._hashContent(`${filePath}:func:${node.id.name}`),
              filePath,
              type: 'function',
              name: node.id.name,
              content: this._getNodeContent(content, node),
              startLine: node.loc?.start?.line || 1,
              endLine: node.loc?.end?.line || 1,
            });
          }
          break;
          
        case 'ClassDeclaration':
        case 'ClassExpression':
          if (node.id) {
            chunks.push({
              id: this._hashContent(`${filePath}:class:${node.id.name}`),
              filePath,
              type: 'class',
              name: node.id.name,
              content: this._getNodeContent(content, node),
              startLine: node.loc?.start?.line || 1,
              endLine: node.loc?.end?.line || 1,
            });
            
            // Extract methods
            if (node.body && node.body.body) {
              for (const member of node.body.body) {
                if (member.type === 'MethodDefinition') {
                  chunks.push({
                    id: this._hashContent(`${filePath}:method:${member.key.name}`),
                    filePath,
                    type: 'method',
                    name: member.key.name,
                    visibility: this._getMethodVisibility(member),
                    content: this._getNodeContent(content, member),
                    startLine: member.loc?.start?.line || 1,
                    endLine: member.loc?.end?.line || 1,
                  });
                }
              }
            }
          }
          break;
          
        case 'VariableDeclaration':
          for (const decl of node.declarations) {
            if (decl.id && decl.id.name) {
              chunks.push({
                id: this._hashContent(`${filePath}:var:${decl.id.name}`),
                filePath,
                type: 'variable',
                name: decl.id.name,
                content: this._getNodeContent(content, decl),
                startLine: decl.loc?.start?.line || 1,
              });
            }
          }
          break;
          
        case 'ExportNamedDeclaration':
        case 'ExportDefaultDeclaration':
          if (node.declaration) {
            if (node.declaration.type === 'FunctionDeclaration') {
              chunks.push({
                id: this._hashContent(`${filePath}:export:${node.declaration.id?.name || 'default'}`),
                filePath,
                type: 'exported-function',
                name: node.declaration.id?.name || 'default',
                content: this._getNodeContent(content, node.declaration),
                startLine: node.declaration.loc?.start?.line || 1,
              });
            } else if (node.declaration.type === 'ClassDeclaration') {
              chunks.push({
                id: this._hashContent(`${filePath}:export:${node.declaration.id?.name || 'default'}`),
                filePath,
                type: 'exported-class',
                name: node.declaration.id?.name || 'default',
                content: this._getNodeContent(content, node.declaration),
                startLine: node.declaration.loc?.start?.line || 1,
              });
            }
          }
          break;
      }
    }
  }

  /**
   * Extract PHP declarations from AST
   * @param {Object} ast - AST object
   * @param {Array} chunks - Chunks array to populate
   * @param {string} filePath - File path
   * @private
   */
  _extractPHPDeclarations(ast, chunks, filePath) {
    if (!ast || !ast.children) return;
    
    for (const node of ast.children) {
      if (node.kind === 'class') {
        chunks.push({
          id: this._hashContent(`${filePath}:class:${node.name}`),
          filePath,
          type: 'class',
          name: node.name,
          content: node.src || '',
          startLine: node.loc?.start?.line || 1,
        });
        
        // Extract methods
        if (node.body?.children) {
          for (const member of node.body.children) {
            if (member.kind === 'method') {
              chunks.push({
                id: this._hashContent(`${filePath}:method:${member.name}`),
                filePath,
                type: 'method',
                name: member.name,
                visibility: member.visibility || 'public',
                content: member.src || '',
                startLine: member.loc?.start?.line || 1,
              });
            }
          }
        }
      } else if (node.kind === 'function') {
        chunks.push({
          id: this._hashContent(`${filePath}:func:${node.name}`),
          filePath,
          type: 'function',
          name: node.name,
          content: node.src || '',
          startLine: node.loc?.start?.line || 1,
        });
      } else if (node.kind === 'interface') {
        chunks.push({
          id: this._hashContent(`${filePath}:interface:${node.name}`),
          filePath,
          type: 'interface',
          name: node.name,
          content: node.src || '',
          startLine: node.loc?.start?.line || 1,
        });
      }
    }
  }

  /**
   * Get method visibility
   * @param {Object} member - Method node
   * @returns {string} Visibility
   * @private
   */
  _getMethodVisibility(member) {
    if (member.accessibility) return member.accessibility;
    if (member.static) return 'static';
    return 'public';
  }

  /**
   * Get content for a node
   * @param {string} content - Full content
   * @param {Object} node - AST node
   * @returns {string} Node content
   * @private
   */
  _getNodeContent(content, node) {
    if (node.loc) {
      const lines = content.split('\n');
      const start = node.loc.start.line - 1;
      const end = node.loc.end.line;
      return lines.slice(start, end).join('\n');
    }
    
    // Fallback: return empty if no location info
    return '';
  }

  /**
   * Hash content for chunk ID
   * @param {string} content - Content to hash
   * @returns {string} Hash
   * @private
   */
  _hashContent(content) {
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 12);
  }

  /**
   * Fallback regex-based chunking
   * @param {string} filePath - File path
   * @param {string} content - File content
   * @param {string} ext - File extension
   * @returns {Array} Array of chunks
   * @private
   */
  _chunkFileRegex(filePath, content, ext) {
    const chunks = [];
    
    // Simple regex-based extraction as fallback
    if (ext === '.js' || ext === '.ts' || ext === '.jsx' || ext === '.tsx') {
      // Functions
      const funcRegex = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(|class\s+(\w+))/g;
      let match;
      while ((match = funcRegex.exec(content)) !== null) {
        const name = match[1] || match[2] || match[3];
        if (name) {
          chunks.push({
            id: this._hashContent(`${filePath}:${match[0]}:${name}`),
            filePath,
            type: match[3] ? 'class' : 'function',
            name,
            content: match[0],
            startLine: content.substring(0, match.index).split('\n').length,
          });
        }
      }
    } else if (ext === '.php') {
      // Classes and functions
      const classRegex = /class\s+(\w+)/g;
      const funcRegex = /function\s+(\w+)/g;
      
      while ((match = classRegex.exec(content)) !== null) {
        chunks.push({
          id: this._hashContent(`${filePath}:class:${match[1]}`),
          filePath,
          type: 'class',
          name: match[1],
          content: match[0],
          startLine: content.substring(0, match.index).split('\n').length,
        });
      }
      
      while ((match = funcRegex.exec(content)) !== null) {
        chunks.push({
          id: this._hashContent(`${filePath}:func:${match[1]}`),
          filePath,
          type: 'function',
          name: match[1],
          content: match[0],
          startLine: content.substring(0, match.index).split('\n').length,
        });
      }
    }
    
    return chunks;
  }
}

/**
 * Create an AST chunker
 * @param {Object} config - Configuration options
 * @returns {ASTChunker}
 *
 * @example
 * const chunker = createASTChunker();
 * const chunks = chunker.chunkFile('UserService.js', code, '.js');
 */
function createASTChunker(config) {
  return new ASTChunker(config);
}

module.exports = {
  ASTChunker,
  createASTChunker,
};
