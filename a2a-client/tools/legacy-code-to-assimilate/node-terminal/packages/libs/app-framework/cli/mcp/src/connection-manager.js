/**
 * Connection Manager
 * Extracted from mcp applications
 */

class ConnectionManager {
  constructor() {
    this.connections = new Map();
  }

  /**
   * Add connection
   */
  addConnection(id, connection) {
    this.connections.set(id, connection);
  }

  /**
   * Remove connection
   */
  removeConnection(id) {
    this.connections.delete(id);
  }

  /**
   * Get connection
   */
  getConnection(id) {
    return this.connections.get(id);
  }
}

export default ConnectionManager;
