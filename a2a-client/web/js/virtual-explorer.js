/**
 * Virtual Explorer - Virtualized file tree for large projects
 * 
 * Provides efficient rendering of large file trees using virtual scrolling.
 * Supports lazy loading and dynamic expansion.
 * 
 * @module VirtualExplorer
 * @version 1.0.0
 */

const VirtualExplorer = {
  // State
  state: {
    files: [],
    filteredFiles: [],
    expandedDirs: new Set(),
    selectedFile: null,
    filter: '',
    
    // Virtual scroll state
    visibleStartIndex: 0,
    visibleEndIndex: 50,
    itemHeight: 28,  // Height of each file item in pixels
    
    // Loading state
    loading: false,
    loadingMore: false,
  },

  /**
   * Initialize the virtual explorer
   * @param {Object} options - Configuration options
   */
  init(options = {}) {
    this.state.itemHeight = options.itemHeight || 28;
    this.state.batchSize = options.batchSize || 100;
    
    // Bind scroll handler
    this._bindScrollHandler();
    
    // Bind keyboard shortcuts
    this._bindKeyboardShortcuts();
  },

  /**
   * Set file data
   * @param {Array} files - Array of file objects
   */
  setFiles(files) {
    this.state.files = files;
    this.state.filteredFiles = this._buildFileTree(files);
    this.render();
  },

  /**
   * Build file tree structure
   * @param {Array} files - Flat array of file paths
   * @returns {Array} Tree structure
   * @private
   */
  _buildFileTree(files) {
    const root = [];
    const pathMap = new Map();
    
    // Sort files alphabetically
    const sortedFiles = [...files].sort();
    
    for (const file of sortedFiles) {
      const path = typeof file === 'string' ? file : file.path;
      const parts = path.split(/[/\\]/);
      
      let currentLevel = root;
      let currentPath = '';
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        // Check if directory or file
        const isFile = i === parts.length - 1;
        const isDir = !isFile;
        
        // Find existing node
        let node = pathMap.get(currentPath);
        
        if (!node) {
          // Create new node
          node = {
            name: part,
            path: currentPath,
            isDir,
            isFile,
            children: isDir ? [] : undefined,
            expanded: this.state.expandedDirs.has(currentPath),
            level: i,
          };
          
          pathMap.set(currentPath, node);
          
          if (currentLevel !== root) {
            // Add to parent
            const parentPath = parts.slice(0, i).join('/');
            const parent = pathMap.get(parentPath);
            if (parent && parent.children) {
              parent.children.push(node);
            }
          } else {
            currentLevel.push(node);
          }
        }
        
        currentLevel = node.children || root;
      }
    }
    
    return root;
  },

  /**
   * Filter files by search term
   * @param {string} filter - Search filter
   */
  filterFiles(filter) {
    this.state.filter = filter;
    
    if (!filter) {
      this.state.filteredFiles = this._buildFileTree(this.state.files);
    } else {
      // Filter files matching the pattern
      const lowerFilter = filter.toLowerCase();
      const filtered = this.state.files.filter(f => {
        const path = typeof f === 'string' ? f : f.path;
        return path.toLowerCase().includes(lowerFilter);
      });
      this.state.filteredFiles = this._buildFileTree(filtered);
      
      // Auto-expand all parent directories
      this._expandAllParents(filtered);
    }
    
    this.render();
  },

  /**
   * Expand all parent directories for filtered files
   * @param {Array} files - Filtered files
   * @private
   */
  _expandAllParents(files) {
    const dirs = new Set();
    
    for (const file of files) {
      const path = typeof file === 'string' ? file : file.path;
      const parts = path.split(/[/\\]/);
      
      let currentPath = '';
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        dirs.add(currentPath);
      }
    }
    
    this.state.expandedDirs = dirs;
  },

  /**
   * Toggle directory expansion
   * @param {string} path - Directory path
   */
  toggleDirectory(path) {
    if (this.state.expandedDirs.has(path)) {
      this.state.expandedDirs.delete(path);
    } else {
      this.state.expandedDirs.add(path);
    }
    
    this.render();
  },

  /**
   * Get visible items based on scroll position
   * @returns {Array} Visible items
   * @private
   */
  _getVisibleItems() {
    const items = [];
    const traverse = (nodes, parentExpanded = true) => {
      for (const node of nodes) {
        items.push({
          ...node,
          visible: parentExpanded,
        });
        
        if (node.isDir && node.expanded) {
          traverse(node.children || [], true);
        }
      }
    };
    
    traverse(this.state.filteredFiles, true);
    
    // Filter visible items
    return items.filter(item => item.visible);
  },

  /**
   * Render the file tree
   */
  render() {
    const container = document.getElementById('fileTree');
    if (!container) return;
    
    const visibleItems = this._getVisibleItems();
    const totalHeight = visibleItems.length * this.state.itemHeight;
    
    // Get scroll container
    const scrollContainer = container.parentElement;
    const scrollTop = scrollContainer?.scrollTop || 0;
    const containerHeight = scrollContainer?.clientHeight || 500;
    
    // Calculate visible range
    const startIndex = Math.floor(scrollTop / this.state.itemHeight);
    const endIndex = Math.min(
      visibleItems.length,
      Math.ceil((scrollTop + containerHeight) / this.state.itemHeight) + 5
    );
    
    this.state.visibleStartIndex = startIndex;
    this.state.visibleEndIndex = endIndex;
    
    // Get visible subset
    const visibleSubset = visibleItems.slice(startIndex, endIndex);
    const offsetY = startIndex * this.state.itemHeight;
    
    // Build HTML
    let html = `<div class="virtual-scroll-container" style="height: ${totalHeight}px; position: relative;">`;
    html += `<div class="virtual-scroll-content" style="transform: translateY(${offsetY}px);">`;
    
    for (const item of visibleSubset) {
      const indent = item.level * 16;
      const isSelected = this.state.selectedFile === item.path;
      const icon = this._getFileIcon(item);
      
      if (item.isDir) {
        html += `
          <div class="file-item dir-item ${isSelected ? 'active' : ''}" 
               data-path="${this._escape(item.path)}"
               data-type="dir"
               style="padding-left: ${indent + 8}px; height: ${this.state.itemHeight}px; line-height: ${this.state.itemHeight}px;">
            <span class="expand-icon">${item.expanded ? '▼' : '▶'}</span>
            ${icon} ${this._escape(item.name)}
          </div>
        `;
      } else {
        html += `
          <div class="file-item ${isSelected ? 'active' : ''}" 
               data-path="${this._escape(item.path)}"
               data-type="file"
               style="padding-left: ${indent + 24}px; height: ${this.state.itemHeight}px; line-height: ${this.state.itemHeight}px;">
            ${icon} ${this._escape(item.name)}
          </div>
        `;
      }
    }
    
    html += '</div></div>';
    
    container.innerHTML = html;
    
    // Bind click events
    this._bindClickEvents(container);
  },

  /**
   * Get file icon
   * @param {Object} item - File item
   * @returns {string} Icon HTML
   * @private
   */
  _getFileIcon(item) {
    if (item.isDir) {
      return item.expanded ? '📂' : '📁';
    }
    
    const ext = item.name.split('.').pop()?.toLowerCase();
    const icons = {
      js: '📜',
      ts: '📘',
      vue: '💚',
      php: '🐘',
      css: '🎨',
      scss: '🎀',
      html: '🌐',
      json: '📋',
      md: '📝',
      gitignore: '🔒',
    };
    
    return icons[ext] || '📄';
  },

  /**
   * Escape HTML
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   * @private
   */
  _escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Bind click events
   * @param {HTMLElement} container - Container element
   * @private
   */
  _bindClickEvents(container) {
    container.querySelectorAll('.file-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const path = item.dataset.path;
        const type = item.dataset.type;
        
        if (type === 'dir') {
          this.toggleDirectory(path);
        } else {
          this.selectFile(path);
        }
      });
      
      item.addEventListener('dblclick', () => {
        if (item.dataset.type === 'file') {
          this.openFile(item.dataset.path);
        }
      });
    });
  },

  /**
   * Bind scroll handler
   * @private
   */
  _bindScrollHandler() {
    const container = document.getElementById('fileTree');
    if (!container) return;
    
    const scrollContainer = container.parentElement;
    if (!scrollContainer) return;
    
    let scrollTimeout;
    scrollContainer.addEventListener('scroll', () => {
      // Debounce scroll updates
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      scrollTimeout = setTimeout(() => {
        this.render();
      }, 50);
    });
  },

  /**
   * Bind keyboard shortcuts
   * @private
   */
  _bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+F to focus filter
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        const filterInput = document.getElementById('fileFilter');
        filterInput?.focus();
      }
      
      // Arrow keys for navigation
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        this._navigateWithArrows(e);
      }
      
      // Enter to open
      if (e.key === 'Enter' && this.state.selectedFile) {
        this.openFile(this.state.selectedFile);
      }
      
      // Backspace to go up
      if (e.key === 'Backspace') {
        const parts = this.state.selectedFile?.split(/[/\\]/);
        if (parts && parts.length > 1) {
          parts.pop();
          const parentPath = parts.join('/');
          this.selectFile(parentPath);
        }
      }
    });
  },

  /**
   * Navigate with arrow keys
   * @param {KeyboardEvent} e - Keyboard event
   * @private
   */
  _navigateWithArrows(e) {
    const visibleItems = this._getVisibleItems().filter(i => i.isFile);
    if (visibleItems.length === 0) return;
    
    const currentIndex = visibleItems.findIndex(
      i => i.path === this.state.selectedFile
    );
    
    let newIndex;
    if (e.key === 'ArrowDown') {
      newIndex = Math.min(currentIndex + 1, visibleItems.length - 1);
    } else {
      newIndex = Math.max(currentIndex - 1, 0);
    }
    
    if (newIndex !== currentIndex) {
      this.selectFile(visibleItems[newIndex].path);
      
      // Scroll into view
      const container = document.getElementById('fileTree')?.parentElement;
      if (container) {
        const itemTop = newIndex * this.state.itemHeight;
        const containerScroll = container.scrollTop;
        const containerHeight = container.clientHeight;
        
        if (itemTop < containerScroll || itemTop > containerScroll + containerHeight - this.state.itemHeight) {
          container.scrollTop = itemTop - containerHeight / 2;
        }
      }
    }
  },

  /**
   * Select a file
   * @param {string} path - File path
   */
  selectFile(path) {
    this.state.selectedFile = path;
    this.render();
    
    // Emit selection event
    if (typeof this.onSelect === 'function') {
      this.onSelect(path);
    }
  },

  /**
   * Open a file
   * @param {string} path - File path
   */
  openFile(path) {
    // Emit open event
    if (typeof this.onOpen === 'function') {
      this.onOpen(path);
    }
  },

  /**
   * Get stats
   * @returns {Object} Stats
   */
  getStats() {
    return {
      totalFiles: this.state.files.length,
      visibleFiles: this._getVisibleItems().filter(i => i.isFile).length,
      expandedDirs: this.state.expandedDirs.size,
    };
  },
};

// Export
window.VirtualExplorer = VirtualExplorer;
