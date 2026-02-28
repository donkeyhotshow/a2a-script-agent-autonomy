/**
 * AppState - Central State Management for A2A Client
 * Provides reactive state management with event system
 */

class AppState {
  constructor() {
    this.state = {
      // Current user/session
      user: null,
      session: null,
      sessionId: null,
      
      // Connection status
      connected: false,
      sseConnected: false,
      
      // Current project
      project: null,
      projectPath: null,
      
      // Flow/graph state
      nodes: [],
      edges: [],
      selectedNode: null,
      
      // Actions and proposals
      proposedActions: [],
      currentAction: null,
      
      // Messages and history
      messages: [],
      history: [],
      
      // Tasks and tickets
      tasks: [],
      activeTask: null,
      
      // UI state
      ui: {
        sidebarOpen: true,
        activePanel: 'sessions',
        theme: 'dark',
        searchQuery: '',
        searchFilter: 'all'
      },
      
      // Loading states
      loading: {
        actions: false,
        sessions: false,
        tasks: false
      }
    };
    
    this.listeners = new Map();
    this.historyStack = [];
    this.undoStack = [];
  }

  /**
   * Get current state value
   */
  get(key) {
    if (!key) return this.state;
    const keys = key.split('.');
    let value = this.state;
    for (const k of keys) {
      if (value === undefined) return undefined;
      value = value[k];
    }
    return value;
  }

  /**
   * Set state value
   */
  set(key, value) {
    const keys = key.split('.');
    const lastKey = keys.pop();
    let target = this.state;
    
    for (const k of keys) {
      if (target[k] === undefined) {
        target[k] = {};
      }
      target = target[k];
    }
    
    const oldValue = target[lastKey];
    target[lastKey] = value;
    
    // Emit change event
    this.emit(key, { 
      key, 
      value, 
      oldValue,
      fullKey: key 
    });
    
    // Add to history for undo
    if (this._isStateKey(key)) {
      this.historyStack.push({
        key,
        oldValue,
        newValue: value,
        timestamp: Date.now()
      });
      
      // Limit history size
      if (this.historyStack.length > 100) {
        this.historyStack.shift();
      }
    }
    
    return this;
  }

  /**
   * Check if key is a state key (for history tracking)
   */
  _isStateKey(key) {
    const stateKeys = ['nodes', 'edges', 'messages', 'tasks', 'proposedActions', 'session'];
    return stateKeys.some(k => key.startsWith(k));
  }

  /**
   * Update multiple values at once
   */
  update(updates) {
    for (const [key, value] of Object.entries(updates)) {
      this.set(key, value);
    }
    return this;
  }

  /**
   * Subscribe to state changes
   */
  on(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  /**
   * Emit event to listeners
   */
  emit(key, data) {
    // Emit to specific key listeners
    this.listeners.get(key)?.forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error('[AppState] Callback error:', e);
      }
    });

    // Emit to wildcard listeners
    this.listeners.get('*')?.forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error('[AppState] Wildcard callback error:', e);
      }
    });

    // Emit to parent key listeners (e.g., 'nodes' for 'nodes.selected')
    const parts = key.split('.');
    if (parts.length > 1) {
      const parentKey = parts.slice(0, -1).join('.');
      this.listeners.get(parentKey)?.forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          console.error('[AppState] Parent callback error:', e);
        }
      });
    }
  }

  /**
   * Push to array in state
   */
  push(key, item) {
    const array = this.get(key) || [];
    if (Array.isArray(array)) {
      array.push(item);
      this.set(key, array);
    }
    return this;
  }

  /**
   * Remove from array in state
   */
  remove(key, predicate) {
    const array = this.get(key) || [];
    if (Array.isArray(array)) {
      const index = array.findIndex(predicate);
      if (index > -1) {
        array.splice(index, 1);
        this.set(key, array);
      }
    }
    return this;
  }

  /**
   * Update item in array
   */
  updateItem(key, predicate, updates) {
    const array = this.get(key) || [];
    if (Array.isArray(array)) {
      const index = array.findIndex(predicate);
      if (index > -1) {
        array[index] = { ...array[index], ...updates };
        this.set(key, array);
      }
    }
    return this;
  }

  /**
   * Find item in array
   */
  find(key, predicate) {
    const array = this.get(key) || [];
    return array.find(predicate);
  }

  /**
   * Clear state
   */
  clear() {
    this.state = {
      user: null,
      session: null,
      sessionId: null,
      connected: false,
      sseConnected: false,
      project: null,
      projectPath: null,
      nodes: [],
      edges: [],
      selectedNode: null,
      proposedActions: [],
      currentAction: null,
      messages: [],
      history: [],
      tasks: [],
      activeTask: null,
      ui: {
        sidebarOpen: true,
        activePanel: 'sessions',
        theme: 'dark',
        searchQuery: '',
        searchFilter: 'all'
      },
      loading: {
        actions: false,
        sessions: false,
        tasks: false
      }
    };
    this.emit('clear', {});
    return this;
  }

  /**
   * Serialize state for storage
   */
  serialize() {
    return JSON.stringify({
      state: this.state,
      history: this.historyStack.slice(-20)
    });
  }

  /**
   * Restore state from storage
   */
  deserialize(data) {
    try {
      const parsed = JSON.parse(data);
      this.state = { ...this.state, ...parsed.state };
      this.emit('restore', {});
    } catch (e) {
      console.error('[AppState] Deserialize error:', e);
    }
  }

  /**
   * Get state snapshot
   */
  snapshot() {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Undo last change
   */
  undo() {
    const lastChange = this.historyStack.pop();
    if (lastChange) {
      this.undoStack.push(lastChange);
      this.set(lastChange.key, lastChange.oldValue);
      return true;
    }
    return false;
  }
}

// Create global singleton
const appState = new AppState();

// Make available globally
if (typeof window !== 'undefined') {
  window.AppState = AppState;
  window.appState = appState;
}
