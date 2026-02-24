/**
 * Monaco Editor Integration
 * 
 * Provides code viewing and editing capabilities using Monaco Editor.
 * Supports syntax highlighting for PHP, JavaScript, TypeScript, Vue, and more.
 * 
 * @module MonacoEditor
 * @version 1.0.0
 */

const MonacoEditor = {
  // Editor instance
  editor: null,
  
  // State
  state: {
    currentFile: null,
    currentContent: null,
    isDirty: false,
    readOnly: false,
    language: 'plaintext',
  },

  /**
   * Initialize Monaco Editor
   * @param {Object} options - Configuration options
   * @returns {Promise<void>}
   */
  async init(options = {}) {
    const containerId = options.containerId || 'editorContent';
    const container = document.getElementById(containerId);
    
    if (!container) {
      console.error('[MonacoEditor] Container not found:', containerId);
      return;
    }
    
    // Check if Monaco is already loaded
    if (typeof monaco === 'undefined') {
      // Load Monaco from CDN
      await this._loadMonaco();
    }
    
    // Configure Monaco
    this._configureMonaco();
    
    // Create editor
    this.editor = monaco.editor.create(container, {
      value: '',
      language: 'plaintext',
      theme: options.theme || 'vs-dark',
      readOnly: options.readOnly || false,
      automaticLayout: true,
      minimap: { enabled: options.minimap !== false },
      fontSize: options.fontSize || 14,
      fontFamily: options.fontFamily || "'Fira Code', 'Consolas', monospace",
      lineNumbers: options.lineNumbers !== false ? 'on' : 'off',
      scrollBeyondLastLine: false,
      wordWrap: options.wordWrap || 'off',
      tabSize: options.tabSize || 2,
      insertSpaces: true,
      renderWhitespace: options.renderWhitespace || 'selection',
      bracketPairColorization: { enabled: true },
      formatOnPaste: true,
      formatOnType: true,
    });
    
    // Listen for changes
    this.editor.onDidChangeModelContent(() => {
      this.state.isDirty = true;
      this._emitChange();
    });
    
    console.log('[MonacoEditor] Initialized');
  },

  /**
   * Load Monaco from CDN
   * @returns {Promise<void>}
   * @private
   */
  _loadMonaco() {
    return new Promise((resolve, reject) => {
      // Check if already loading
      if (document.querySelector('script[src*="monaco-editor"]')) {
        // Wait for load
        const checkMonaco = setInterval(() => {
          if (typeof monaco !== 'undefined') {
            clearInterval(checkMonaco);
            resolve();
          }
        }, 100);
        return;
      }
      
      // Create loader script
      const loaderScript = document.createElement('script');
      loaderScript.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js';
      loaderScript.onload = () => {
        require.config({ 
          paths: { 
            vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' 
          } 
        });
        
        require(['vs/editor/editor.main'], () => {
          resolve();
        });
      };
      loaderScript.onerror = reject;
      
      document.head.appendChild(loaderScript);
    });
  },

  /**
   * Configure Monaco
   * @private
   */
  _configureMonaco() {
    // Register Vue language if not exists
    if (!monaco.languages.getLanguages().some(lang => lang.id === 'vue')) {
      monaco.languages.register({ id: 'vue' });
      monaco.languages.setMonarchTokensProvider('vue', {
        tokenizer: {
          root: [
            [/<template>/, { token: 'tag', next: '@template' }],
            [/<script[^>]*>/, { token: 'tag', next: '@script' }],
            [/<style[^>]*>/, { token: 'tag', next: '@style' }],
            [/<\/?[\w-]+/, 'tag'],
            [/[^<]+/, ''],
          ],
          template: [
            [/<\/template>/, { token: 'tag', next: '@pop' }],
            [/<[\w-]+/, 'tag'],
            [/>/, 'tag'],
            [/[\w-]+/, 'attribute.name'],
            [/=/, 'delimiter'],
            [/"[^"]*"/, 'string'],
            [/'[^']*'/, 'string'],
            [/[^<]+/, ''],
          ],
          script: [
            [/<\/script>/, { token: 'tag', next: '@pop' }],
            [/\/\/.*$/, 'comment'],
            [/\/\*/, 'comment', '@comment'],
            [/\b(const|let|var|function|class|export|import|from|return|if|else|for|while|switch|case|break|continue)\b/, 'keyword'],
            [/=>/, 'operator'],
            [/[{}()\[\]]/, 'delimiter'],
            [/;/, 'delimiter'],
            [/"/, 'string', '@string'],
            [/'/, 'string', '@stringSingle'],
            [/[^/\s]+/, ''],
          ],
          style: [
            [/<\/style>/, { token: 'tag', next: '@pop' }],
            [/[\w-]+/, 'attribute.name'],
            [/[{}]/, 'delimiter'],
            [/;/, 'delimiter'],
            [/"[^"]*"/, 'string'],
            [/[^<]+/, ''],
          ],
          comment: [
            [/\*\//, 'comment', '@pop'],
            [/./, 'comment'],
          ],
          string: [
            [/[^\\"]+/, 'string'],
            [/\\./, 'string.escape'],
            [/"/, 'string', '@pop'],
          ],
          stringSingle: [
            [/[^\\']+/, 'string'],
            [/\\./, 'string.escape'],
            [/'/, 'string', '@pop'],
          ],
        },
      });
      
      // Configure Vue language configuration
      monaco.languages.setLanguageConfiguration('vue', {
        comments: {
          lineComment: '//',
          blockComment: ['/*', '*/'],
        },
        brackets: [
          ['{', '}'],
          ['[', ']'],
          ['(', ')'],
        ],
      });
    }
    
    // Register PHP if not exists
    if (!monaco.languages.getLanguages().some(lang => lang.id === 'php')) {
      monaco.languages.register({ id: 'php' });
      monaco.languages.setMonarchTokensProvider('php', {
        tokenizer: {
          root: [
            [/<\?php/, { token: 'tag', next: '@php' }],
            [/<script[^>]*language="php"[^>]*>/, { token: 'tag', next: '@php' }],
            [/<\?/, { token: 'tag', next: '@php' }],
            [/<\/?[\w-]+/, 'tag'],
            [/[^<]+/, ''],
          ],
          php: [
            [/\?>/, { token: 'tag', next: '@pop' }],
            [/\/\/.*$/, 'comment'],
            [/\/\*/, 'comment', '@comment'],
            [/#.*$/, 'comment'],
            [/\b(class|trait|interface|extends|implements|public|private|protected|static|function|return|if|else|foreach|for|while|switch|case|break|continue|new|use|namespace|const|var|true|false|null|echo|print|try|catch|throw|finally)\b/, 'keyword'],
            [/->/, 'operator'],
            [/=>/, 'operator'],
            [/::/, 'operator'],
            [/\\/, 'namespace'],
            [/\$\w+/, 'variable'],
            [/"[^"]*"/, 'string'],
            [/'[^']*'/, 'string'],
            [/[{}()\[\]]/, 'delimiter'],
            [/[;,.]/, 'delimiter'],
            [/[0-9]+/, 'number'],
          ],
          comment: [
            [/\*\//, 'comment', '@pop'],
            [/./, 'comment'],
          ],
        },
      });
    }
  },

  /**
   * Get language from file extension
   * @param {string} filePath - File path
   * @returns {string} Monaco language ID
   * @private
   */
  _getLanguageFromPath(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    const languageMap = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      vue: 'vue',
      php: 'php',
      py: 'python',
      rb: 'ruby',
      java: 'java',
      cs: 'csharp',
      go: 'go',
      rs: 'rust',
      cpp: 'cpp',
      c: 'c',
      h: 'c',
      hpp: 'cpp',
      css: 'css',
      scss: 'scss',
      sass: 'scss',
      less: 'less',
      html: 'html',
      json: 'json',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      sql: 'sql',
      sh: 'shell',
      bash: 'shell',
      dockerfile: 'dockerfile',
      graphql: 'graphql',
      prisma: 'prisma',
    };
    
    return languageMap[ext] || 'plaintext';
  },

  /**
   * Open a file in the editor
   * @param {string} filePath - File path
   * @param {string} content - File content
   * @param {Object} options - Options
   */
  async openFile(filePath, content, options = {}) {
    // Get language
    const language = options.language || this._getLanguageFromPath(filePath);
    
    // Set model
    const model = monaco.editor.createModel(
      content,
      language,
      monaco.Uri.parse(filePath)
    );
    
    // Set model to editor
    this.editor.setModel(model);
    
    // Update state
    this.state.currentFile = filePath;
    this.state.currentContent = content;
    this.state.isDirty = false;
    this.state.language = language;
    
    // Set read-only if specified
    if (options.readOnly !== undefined) {
      this.editor.updateOptions({ readOnly: options.readOnly });
      this.state.readOnly = options.readOnly;
    }
    
    // Emit event
    this._emitOpen(filePath, language);
    
    console.log('[MonacoEditor] Opened file:', filePath, 'language:', language);
  },

  /**
   * Get current content
   * @returns {string} Current editor content
   */
  getValue() {
    return this.editor?.getValue() || '';
  },

  /**
   * Set content
   * @param {string} content - Content to set
   */
  setValue(content) {
    this.editor?.setValue(content);
    this.state.currentContent = content;
  },

  /**
   * Get selected text
   * @returns {string} Selected text
   */
  getSelection() {
    const selection = this.editor?.getSelection();
    if (selection) {
      return this.editor?.getModel()?.getValueInRange(selection) || '';
    }
    return '';
  },

  /**
   * Insert text at cursor
   * @param {string} text - Text to insert
   */
  insertText(text) {
    const position = this.editor?.getPosition();
    if (position) {
      this.editor?.executeEdits('', [{
        range: new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        ),
        text,
      }]);
    }
  },

  /**
   * Format document
   */
  formatDocument() {
    this.editor?.getAction('editor.action.formatDocument')?.run();
  },

  /**
   * Toggle minimap
   * @param {boolean} enabled - Enable/disable minimap
   */
  toggleMinimap(enabled) {
    this.editor?.updateOptions({ minimap: { enabled } });
  },

  /**
   * Set theme
   * @param {string} theme - Theme name (vs, vs-dark, hc-black)
   */
  setTheme(theme) {
    monaco?.editor.setTheme(theme);
  },

  /**
   * Go to line
   * @param {number} lineNumber - Line number
   */
  goToLine(lineNumber) {
    this.editor?.revealLineInCenter(lineNumber);
    this.editor?.setPosition({ lineNumber, column: 1 });
    this.editor?.focus();
  },

  /**
   * Find text
   * @param {string} text - Text to find
   */
  find(text) {
    this.editor?.getAction('actions.find')?.run();
  },

  /**
   * Replace text
   * @param {string} findText - Text to find
   * @param {string} replaceText - Replacement text
   */
  replace(findText, replaceText) {
    const model = this.editor?.getModel();
    if (!model) return;
    
    const matches = model.findMatches(findText, false, false, false, null, true);
    if (matches.length > 0) {
      this.editor?.setSelection(matches[0].range);
      this.editor?.executeEdits('', [{
        range: matches[0].range,
        text: replaceText,
      }]);
    }
  },

  /**
   * Add breakpoint at line
   * @param {number} lineNumber - Line number
   */
  addBreakpoint(lineNumber) {
    monaco?.editor.setModelMarker(this.editor?.getModel(), 'breakpoint', [{
      startLineNumber: lineNumber,
      startColumn: 1,
      endLineNumber: lineNumber,
      endColumn: 1,
      message: 'Breakpoint',
      severity: monaco?.MarkerSeverity.Warning,
    }]);
  },

  /**
   * Check if editor has unsaved changes
   * @returns {boolean} True if dirty
   */
  isDirty() {
    return this.state.isDirty;
  },

  /**
   * Save current file
   * @returns {boolean} Success
   */
  async save() {
    if (!this.state.isDirty || this.state.readOnly) {
      return false;
    }
    
    // Emit save event
    const event = new CustomEvent('editor:save', {
      detail: {
        path: this.state.currentFile,
        content: this.getValue(),
      },
    });
    document.dispatchEvent(event);
    
    this.state.isDirty = false;
    this.state.currentContent = this.getValue();
    
    return true;
  },

  /**
   * Close current file
   */
  closeFile() {
    if (this.editor?.getModel()) {
      this.editor.getModel().dispose();
    }
    
    this.state.currentFile = null;
    this.state.currentContent = null;
    this.state.isDirty = false;
  },

  /**
   * Dispose editor
   */
  dispose() {
    this.editor?.dispose();
    this.editor = null;
  },

  /**
   * Emit change event
   * @private
   */
  _emitChange() {
    const event = new CustomEvent('editor:change', {
      detail: {
        content: this.getValue(),
        isDirty: this.state.isDirty,
      },
    });
    document.dispatchEvent(event);
  },

  /**
   * Emit open event
   * @param {string} path - File path
   * @param {string} language - Language
   * @private
   */
  _emitOpen(path, language) {
    const event = new CustomEvent('editor:open', {
      detail: { path, language },
    });
    document.dispatchEvent(event);
  },
};

// Export
window.MonacoEditor = MonacoEditor;
