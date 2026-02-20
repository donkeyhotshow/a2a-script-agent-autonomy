/**
 * GraphBuilder - Builds knowledge graph from project files
 * 
 * Scans project directory, extracts dependencies and relationships.
 */

const fs = require('fs');
const path = require('path');

class GraphBuilder {
  constructor(config, manager) {
    this.projectPath = config.projectPath;
    this.manager = manager;
    this.nodes = [];
    this.edges = [];
  }

  /**
   * Build complete graph index
   * @returns {Promise<{nodes: Array, edges: Array}>}
   */
  async build() {
    this.nodes = [];
    this.edges = [];
    
    const files = this.scanDirectory(this.projectPath);
    
    for (const file of files) {
      this.processFile(file);
    }

    const graphData = { nodes: this.nodes, edges: this.edges };
    
    // Save to storage
    if (this.manager) {
      await this.manager.save(graphData);
    }

    return graphData;
  }

  /**
   * Scan directory recursively for files
   * @private
   */
  scanDirectory(dir, base = '') {
    const files = [];
    
    if (!fs.existsSync(dir)) return files;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      // Skip hidden and common exclude directories
      if (entry.name.startsWith('.') || 
          ['node_modules', 'vendor', 'storage', 'cache', 'dist', 'build'].includes(entry.name)) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      const relativePath = base ? `${base}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        files.push(...this.scanDirectory(fullPath, relativePath));
      } else {
        files.push(relativePath);
      }
    }
    
    return files;
  }

  /**
   * Process single file - create node and extract dependencies
   * @private
   */
  processFile(file) {
    const ext = path.extname(file);
    const nodeType = this.getFileType(file);
    
    // Create node
    const node = {
      id: file,
      type: nodeType,
      relations: []
    };
    
    this.nodes.push(node);

    // Extract dependencies
    const fullPath = path.join(this.projectPath, file);
    if (!fs.existsSync(fullPath)) return;

    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const deps = this.extractDependencies(content, ext, file);
      
      for (const dep of deps) {
        this.edges.push({
          from: file,
          to: dep.target,
          type: dep.type
        });
        
        // Add to node relations
        node.relations.push({
          type: dep.type,
          target: dep.target
        });
      }
    } catch (e) {
      // Skip files that can't be read
    }
  }

  /**
   * Determine file type based on extension and naming
   * @private
   */
  getFileType(file) {
    const ext = path.extname(file);
    const fileName = path.basename(file, ext);
    
    const typeMap = {
      '.php': file.includes('Controller') ? 'controller' : 
              file.match(/Models?\//) || fileName.includes('Model') ? 'model' :
              file.includes('Service') || fileName.includes('Service') ? 'service' :
              file.includes('Repository') || fileName.includes('Repository') ? 'repository' :
              file.includes('Middleware') || fileName.includes('Middleware') ? 'middleware' : 'php',
      '.js': 'js',
      '.ts': 'ts',
      '.vue': 'vue',
      '.json': 'config',
      '.md': 'doc',
      '.yaml': 'config',
      '.yml': 'config'
    };
    
    return typeMap[ext] || 'file';
  }

  /**
   * Extract dependencies from file content
   * @private
   */
  extractDependencies(content, ext, currentFile) {
    const deps = [];

    if (ext === '.php') {
      // PHP: use statements
      const useMatches = content.matchAll(/use\s+([^;]+);/g);
      for (const match of useMatches) {
        const className = match[1].split('\\').pop();
        deps.push({ target: className, type: 'uses' });
      }

      // PHP: extends
      const extendsMatch = content.match(/class\s+\w+\s+extends\s+(\w+)/);
      if (extendsMatch) {
        deps.push({ target: extendsMatch[1], type: 'extends' });
      }

      // PHP: implements
      const implementsMatch = content.match(/class\s+\w+\s+implements\s+([\w,\s]+)/);
      if (implementsMatch) {
        implementsMatch[1].split(',').forEach(i => {
          deps.push({ target: i.trim(), type: 'implements' });
        });
      }
    } 
    else if (ext === '.js' || ext === '.ts' || ext === '.vue') {
      // ES6 imports
      const importMatches = content.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
      for (const match of importMatches) {
        if (!match[1].startsWith('.')) continue; // Only local imports
        deps.push({ target: match[1], type: 'imports' });
      }

      // CommonJS requires
      const requireMatches = content.matchAll(/require\(['"]([^'"]+)['"]\)/g);
      for (const match of requireMatches) {
        if (!match[1].startsWith('.')) continue; // Only local requires
        deps.push({ target: match[1], type: 'requires' });
      }
      
      // Dynamic imports
      const dynamicImportMatches = content.matchAll(/import\(['"]([^'"]+)['"]\)/g);
      for (const match of dynamicImportMatches) {
        if (!match[1].startsWith('.')) continue;
        deps.push({ target: match[1], type: 'dynamic-imports' });
      }
    }

    return deps;
  }
}

module.exports = { GraphBuilder };
