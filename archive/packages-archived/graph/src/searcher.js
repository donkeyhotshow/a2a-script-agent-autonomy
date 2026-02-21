/**
 * GraphSearcher - Search functionality for knowledge graph
 * 
 * Provides search capabilities for graph nodes and edges.
 */

class GraphSearcher {
  constructor(config, manager) {
    this.projectPath = config.projectPath;
    this.manager = manager;
  }

  /**
   * Search graph nodes by query
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @param {string} [options.type] - Filter by node type
   * @param {number} [options.limit=20] - Max results
   * @returns {Array} Matching nodes
   */
  async search(query, options = {}) {
    const { type, limit = 20 } = options;
    const graph = this.manager ? await this.manager.getData() : { nodes: [], edges: [] };
    
    if (!graph || !graph.nodes) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);

    const results = graph.nodes
      .map(node => {
        let score = 0;
        const nodeIdLower = node.id.toLowerCase();
        const nodeTypeLower = (node.type || '').toLowerCase();

        // Score by ID match
        if (nodeIdLower.includes(queryLower)) {
          score += 10;
          // Bonus for exact match
          if (nodeIdLower === queryLower) score += 5;
          // Bonus for basename match
          if (path.basename(nodeIdLower) === queryLower) score += 3;
        }

        // Score by word matches
        for (const word of queryWords) {
          if (nodeIdLower.includes(word)) score += 2;
          if (nodeTypeLower.includes(word)) score += 1;
        }

        // Score by type filter
        if (type && node.type === type) {
          score += 5;
        }

        return { node, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.node);

    return results;
  }

  /**
   * Find node by exact ID
   * @param {string} nodeId - Node ID to find
   * @returns {Object|null} Node or null if not found
   */
  async findById(nodeId) {
    const graph = this.manager ? await this.manager.getData() : { nodes: [], edges: [] };
    
    if (!graph || !graph.nodes) {
      return null;
    }

    return graph.nodes.find(n => n.id === nodeId) || null;
  }

  /**
   * Get all relations for a node
   * @param {string} nodeId - Node ID
   * @returns {Object} Incoming and outgoing edges
   */
  async getRelations(nodeId) {
    const graph = this.manager ? await this.manager.getData() : { nodes: [], edges: [] };
    
    if (!graph || !graph.edges) {
      return { incoming: [], outgoing: [] };
    }

    const incoming = graph.edges
      .filter(e => e.to === nodeId)
      .map(e => ({
        from: e.from,
        type: e.type,
        node: graph.nodes.find(n => n.id === e.from)
      }));

    const outgoing = graph.edges
      .filter(e => e.from === nodeId)
      .map(e => ({
        to: e.to,
        type: e.type,
        node: graph.nodes.find(n => n.id === e.to)
      }));

    return { incoming, outgoing };
  }

  /**
   * Find path between two nodes
   * @param {string} fromId - Starting node ID
   * @param {string} toId - Target node ID
   * @param {number} [maxDepth=5] - Maximum search depth
   * @returns {Array|null} Path of nodes or null if not found
   */
  async findPath(fromId, toId, maxDepth = 5) {
    const graph = this.manager ? await this.manager.getData() : { nodes: [], edges: [] };
    
    if (!graph || !graph.nodes || !graph.edges) {
      return null;
    }

    // BFS to find shortest path
    const queue = [[fromId]];
    const visited = new Set([fromId]);
    let depth = 0;

    while (queue.length > 0 && depth < maxDepth) {
      const path = queue.shift();
      const currentId = path[path.length - 1];

      if (currentId === toId) {
        // Return full node objects
        return path.map(id => graph.nodes.find(n => n.id === id));
      }

      // Find neighbors
      const neighbors = graph.edges
        .filter(e => e.from === currentId)
        .map(e => e.to);

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }

      depth++;
    }

    return null;
  }

  /**
   * Get nodes by type
   * @param {string} type - Node type
   * @returns {Array} Nodes of specified type
   */
  async getByType(type) {
    const graph = this.manager ? await this.manager.getData() : { nodes: [], edges: [] };
    
    if (!graph || !graph.nodes) {
      return [];
    }

    return graph.nodes.filter(n => n.type === type);
  }

  /**
   * Get graph statistics
   * @returns {Object} Statistics object
   */
  async getStats() {
    const graph = this.manager ? await this.manager.getData() : { nodes: [], edges: [] };
    
    if (!graph || !graph.nodes) {
      return { nodeCount: 0, edgeCount: 0, types: {} };
    }

    const types = {};
    for (const node of graph.nodes) {
      types[node.type] = (types[node.type] || 0) + 1;
    }

    return {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      types
    };
  }
}

// Need path for basename
const path = require('path');

module.exports = { GraphSearcher };
