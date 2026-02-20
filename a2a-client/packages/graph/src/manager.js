/**
 * GraphManager - Manages graph data storage and retrieval
 * 
 * Handles loading, saving, and caching of graph data.
 */

const fs = require('fs').promises;
const path = require('path');

class GraphManager {
  constructor(config) {
    this.projectPath = config.projectPath;
    this.storagePath = config.storagePath || this.getDefaultStoragePath();
    this.cache = null;
    this.cacheTimestamp = null;
  }

  /**
   * Get default storage path (project's .a2a directory)
   * @private
   */
  getDefaultStoragePath() {
    return path.join(this.projectPath, '.a2a', 'graph.json');
  }

  /**
   * Load graph data from storage
   * @returns {Promise<{nodes: Array, edges: Array}>}
   */
  async getData() {
    // Return cached data if available
    if (this.cache) {
      return this.cache;
    }

    try {
      const content = await fs.readFile(this.storagePath, 'utf8');
      const data = JSON.parse(content);
      
      // Validate structure
      if (!data.nodes || !data.edges) {
        return { nodes: [], edges: [] };
      }

      // Cache data
      this.cache = data;
      this.cacheTimestamp = Date.now();

      return data;
    } catch (error) {
      // File doesn't exist or is invalid
      return { nodes: [], edges: [] };
    }
  }

  /**
   * Save graph data to storage
   * @param {{nodes: Array, edges: Array}} data - Graph data
   */
  async save(data) {
    // Ensure directory exists
    const dir = path.dirname(this.storagePath);
    await fs.mkdir(dir, { recursive: true });

    // Validate data
    const validatedData = {
      nodes: data.nodes || [],
      edges: data.edges || [],
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    // Write to file
    await fs.writeFile(
      this.storagePath,
      JSON.stringify(validatedData, null, 2)
    );

    // Update cache
    this.cache = validatedData;
    this.cacheTimestamp = Date.now();
  }

  /**
   * Check if graph data exists
   * @returns {Promise<boolean>}
   */
  async exists() {
    try {
      await fs.access(this.storagePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get graph build timestamp
   * @returns {Promise<string|null>}
   */
  async getTimestamp() {
    const data = await this.getData();
    return data.timestamp || null;
  }

  /**
   * Clear cached data (force reload on next getData)
   */
  clearCache() {
    this.cache = null;
    this.cacheTimestamp = null;
  }

  /**
   * Delete graph data
   */
  async delete() {
    try {
      await fs.unlink(this.storagePath);
      this.clearCache();
    } catch (error) {
      // File doesn't exist, that's fine
    }
  }

  /**
   * Get storage path
   * @returns {string}
   */
  getPath() {
    return this.storagePath;
  }

  /**
   * Export graph to different formats
   * @param {string} format - Export format (json, dot, csv)
   * @returns {Promise<string>}
   */
  async export(format = 'json') {
    const data = await this.getData();

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      
      case 'dot': // GraphViz format
        return this.toDotFormat(data);
      
      case 'csv':
        return this.toCsvFormat(data);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Convert to GraphViz DOT format
   * @private
   */
  toDotFormat(data) {
    let dot = 'digraph KnowledgeGraph {\n';
    dot += '  rankdir=LR;\n';
    dot += '  node [shape=box, style=rounded];\n\n';

    // Add nodes
    for (const node of data.nodes) {
      const label = path.basename(node.id);
      const color = this.getNodeColor(node.type);
      dot += `  "${node.id}" [label="${label}", color="${color}"];\n`;
    }

    dot += '\n';

    // Add edges
    for (const edge of data.edges) {
      dot += `  "${edge.from}" -> "${edge.to}" [label="${edge.type}"];\n`;
    }

    dot += '}\n';
    return dot;
  }

  /**
   * Convert to CSV format
   * @private
   */
  toCsvFormat(data) {
    // Nodes CSV
    let csv = 'Type: Nodes\n';
    csv += 'id,type\n';
    for (const node of data.nodes) {
      csv += `"${node.id}","${node.type}"\n`;
    }

    // Edges CSV
    csv += '\nType: Edges\n';
    csv += 'from,to,type\n';
    for (const edge of data.edges) {
      csv += `"${edge.from}","${edge.to}","${edge.type}"\n`;
    }

    return csv;
  }

  /**
   * Get color for node type (for DOT format)
   * @private
   */
  getNodeColor(type) {
    const colors = {
      controller: '#4CAF50',
      model: '#2196F3',
      service: '#FF9800',
      repository: '#9C27B0',
      middleware: '#607D8B',
      js: '#F7DF1E',
      ts: '#3178C6',
      vue: '#4FC08D',
      config: '#795548',
      doc: '#9E9E9E',
      php: '#777BB4'
    };
    return colors[type] || '#CCCCCC';
  }
}

module.exports = { GraphManager };
