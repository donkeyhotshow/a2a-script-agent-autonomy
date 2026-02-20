/**
 * @a2a/graph - Graph Indexing and Search Module
 * 
 * Provides knowledge graph building and search capabilities for code projects.
 * Part of the A2A distributed system.
 * 
 * @module @a2a/graph
 */

const { GraphBuilder } = require('./builder');
const { GraphSearcher } = require('./searcher');
const { GraphManager } = require('./manager');

/**
 * Create a Graph instance with builder, searcher, and manager
 * @param {Object} config - Configuration options
 * @param {string} config.projectPath - Path to project directory
 * @param {string} config.storagePath - Path to store graph.json (optional)
 * @returns {{builder: GraphBuilder, searcher: GraphSearcher, manager: GraphManager}}
 */
function createGraph(config) {
  const manager = new GraphManager(config);
  const builder = new GraphBuilder(config, manager);
  const searcher = new GraphSearcher(config, manager);
  
  return { builder, searcher, manager };
}

module.exports = {
  GraphBuilder,
  GraphSearcher,
  GraphManager,
  createGraph,
};
