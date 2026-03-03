/**
 * Terminal Emulator Module
 * Provides terminal emulator in the browser with WebSocket streaming
 * Integrates with a2a-client/packages/terminal/ via WebSocket
 */

(function (global) {
    'use strict';

    const TerminalEmulator = {
        // Configuration
        wsUrl: null,
        apiBase: '/api/v1',
        terminalEndpoint: '/terminal',
        
        // State
        isConnected: false,
        isConnecting: false,
        sessionId: null,
        socket: null,
        
        // Terminal state
        commandHistory: [],
        historyIndex: -1,
        currentInput: '',
        
        // UI Elements
        container: null,
        outputContainer: null,
        inputLine: null,
        
        // Terminal settings
        settings: {
            fontSize: 14,
            fontFamily: 'Monaco, Menlo, "Courier New", monospace',
            lineHeight: 1.4,
            theme: 'dark',
            scrollback: 1000
        },
        
        /**
         * Configure Terminal Emulator
         */
        configure(options = {}) {
            if (options.wsUrl) this.wsUrl = options.wsUrl;
            if (options.apiBase) this.apiBase = options.apiBase.replace(/\/?$/, '');
            if (options.terminalEndpoint) this.terminalEndpoint = options.terminalEndpoint;
            if (options.fontSize) this.settings.fontSize = options.fontSize;
            if (options.fontFamily) this.settings.fontFamily = options.fontFamily;
            if (options.theme) this.settings.theme = options.theme;
            return this;
        },
        
        /**
         * Initialize Terminal Emulator
         */
        init(containerSelector = '#terminal-container') {
            this.container = document.querySelector(containerSelector);
            if (!this.container) {
                console.warn('[Terminal] Container not found:', containerSelector);
                return this;
            }
            
            this._createUI();
            this._bindEvents();
            this._applyTheme();
            
            console.log('[Terminal] Initialized');
            return this;
        },
        
        /**
         * Create UI elements
         */
        _createUI() {
            this.container.innerHTML = `
                <div class="terminal-wrapper">
                    <div class="terminal-header">
                        <span class="terminal-title">Terminal</span>
                        <div class="terminal-controls">
                            <button class="terminal-btn terminal-btn-connect" id="terminal-connect-btn">
                                Connect
                            </button>
                            <button class="terminal-btn terminal-btn-clear" id="terminal-clear-btn">
                                Clear
                            </button>
                            <button class="terminal-btn terminal-btn-settings" id="terminal-settings-btn">
                                ⚙
                            </button>
                        </div>
                    </div>
                    <div class="terminal-output" id="terminal-output"></div>
                    <div class="terminal-input-line">
                        <span class="terminal-prompt">$</span>
                        <input type="text" 
                               class="terminal-input" 
                               id="terminal-input"
                               autocomplete="off"
                               spellcheck="false">
                    </div>
                    <div class="terminal-status" id="terminal-status">
                        <span class="status-indicator disconnected"></span>
                        <span class="status-text">Disconnected</span>
                    </div>
                </div>
            `;
            
            this.outputContainer = this.container.querySelector('#terminal-output');
            this.inputLine = this.container.querySelector('#terminal-input');
            this.statusIndicator = this.container.querySelector('.status-indicator');
            this.statusText = this.container.querySelector('.status-text');
        },
        
        /**
         * Bind event listeners
         */
        _bindEvents() {
            // Connect button
            const connectBtn = this.container.querySelector('#terminal-connect-btn');
            connectBtn?.addEventListener('click', () => {
                if (this.isConnected) {
                    this.disconnect();
                } else {
                    this.connect();
                }
            });
            
            // Clear button
            const clearBtn = this.container.querySelector('#terminal-clear-btn');
            clearBtn?.addEventListener('click', () => this.clear());
            
            // Input handling
            this.inputLine?.addEventListener('keydown', (e) => {
                this._handleInputKeydown(e);
            });
            
            // Auto-scroll on output changes
            if (this.outputContainer) {
                const observer = new MutationObserver(() => {
                    this._scrollToBottom();
                });
                observer.observe(this.outputContainer, { childList: true });
            }
        },
        
        /**
         * Handle input keydown events
         */
        _handleInputKeydown(e) {
            switch (e.key) {
                case 'Enter':
                    e.preventDefault();
                    this._executeCommand();
                    break;
                    
                case 'ArrowUp':
                    e.preventDefault();
                    this._navigateHistory(-1);
                    break;
                    
                case 'ArrowDown':
                    e.preventDefault();
                    this._navigateHistory(1);
                    break;
                    
                case 'Tab':
                    e.preventDefault();
                    this._handleTabCompletion();
                    break;
                    
                case 'c':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this._sendInterrupt();
                    }
                    break;
            }
        },
        
        /**
         * Connect to terminal WebSocket
         */
        connect(sessionId = null) {
            if (this.isConnected || this.isConnecting) {
                console.log('[Terminal] Already connected or connecting');
                return;
            }
            
            const sid = sessionId || this.sessionId || this._generateSessionId();
            this.sessionId = sid;
            
            // Determine WebSocket URL
            let wsUrl = this.wsUrl;
            if (!wsUrl) {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const host = window.location.host;
                wsUrl = `${protocol}//${host}${this.apiBase}${this.terminalEndpoint}/${encodeURIComponent(sid)}`;
            }
            
            this.isConnecting = true;
            this._updateStatus('connecting', 'Connecting...');
            
            console.log('[Terminal] Connecting to:', wsUrl);
            
            try {
                this.socket = new WebSocket(wsUrl);
                
                this.socket.onopen = (event) => {
                    console.log('[Terminal] Connected!');
                    this.isConnected = true;
                    this.isConnecting = false;
                    this._updateStatus('connected', 'Connected');
                    this._writeOutput('Connected to terminal session: ' + sid + '\n');
                    this.inputLine?.focus();
                    
                    this._emit('connected', { sessionId: sid });
                };
                
                this.socket.onmessage = (event) => {
                    this._handleMessage(event);
                };
                
                this.socket.onerror = (error) => {
                    console.error('[Terminal] Error:', error);
                    this._writeOutput('\r\n[Error] Connection error\r\n');
                };
                
                this.socket.onclose = (event) => {
                    console.log('[Terminal] Closed:', event.code, event.reason);
                    this.isConnected = false;
                    this.isConnecting = false;
                    this._updateStatus('disconnected', 'Disconnected');
                    
                    if (!event.wasClean) {
                        this._writeOutput('\r\n[Error] Connection lost\r\n');
                    }
                    
                    this._emit('disconnected', { code: event.code, reason: event.reason });
                };
                
            } catch (e) {
                console.error('[Terminal] Failed to create WebSocket:', e);
                this.isConnecting = false;
                this._updateStatus('error', 'Error');
                this._writeOutput('[Error] Failed to connect: ' + e.message + '\n');
            }
        },
        
        /**
         * Disconnect from terminal
         */
        disconnect() {
            if (this.socket) {
                this.socket.close(1000, 'User disconnected');
                this.socket = null;
            }
            this.isConnected = false;
            this.isConnecting = false;
            this._updateStatus('disconnected', 'Disconnected');
        },
        
        /**
         * Handle incoming WebSocket messages
         */
        _handleMessage(event) {
            try {
                const data = JSON.parse(event.data);
                console.log('[Terminal] Message:', data);
                
                switch (data.type) {
                    case 'output':
                        this._writeOutput(data.content || '');
                        break;
                        
                    case 'error':
                        this._writeOutput('\r\n[Error] ' + (data.message || 'Unknown error') + '\r\n');
                        break;
                        
                    case 'prompt':
                        this._writeOutput(data.prompt || '$ ');
                        break;
                        
                    case 'welcome':
                        this._writeOutput(data.message || 'Welcome to terminal\r\n');
                        break;
                        
                    default:
                        // Raw output
                        if (data.content) {
                            this._writeOutput(data.content);
                        } else if (typeof data === 'string') {
                            this._writeOutput(data);
                        }
                }
                
                this._emit('message', data);
                
            } catch (e) {
                // Not JSON, treat as raw output
                this._writeOutput(event.data);
            }
        },
        
        /**
         * Execute command
         */
        _executeCommand() {
            const command = this.inputLine?.value || '';
            this.inputLine.value = '';
            
            // Add to history
            if (command.trim()) {
                this.commandHistory.unshift(command);
                if (this.commandHistory.length > 100) {
                    this.commandHistory.pop();
                }
                this.historyIndex = -1;
            }
            
            // Display command
            this._writeOutput('$ ' + command + '\n');
            
            // Send to server
            if (this.isConnected && this.socket) {
                this.socket.send(JSON.stringify({
                    type: 'command',
                    content: command,
                    timestamp: Date.now()
                }));
            } else {
                this._writeOutput('[Error] Not connected\r\n');
            }
            
            this._emit('command', { command });
        },
        
        /**
         * Send interrupt signal (Ctrl+C)
         */
        _sendInterrupt() {
            if (this.isConnected && this.socket) {
                this.socket.send(JSON.stringify({
                    type: 'interrupt',
                    timestamp: Date.now()
                }));
            }
            this._writeOutput('^C\n');
        },
        
        /**
         * Navigate command history
         */
        _navigateHistory(direction) {
            if (this.commandHistory.length === 0) return;
            
            const newIndex = this.historyIndex + direction;
            
            if (newIndex < 0) {
                // Restore current input
                this.historyIndex = -1;
                this.inputLine.value = this.currentInput;
            } else if (newIndex >= this.commandHistory.length) {
                // Clear input at end of history
                this.historyIndex = this.commandHistory.length;
                this.inputLine.value = '';
            } else {
                // Navigate history
                this.historyIndex = newIndex;
                this.inputLine.value = this.commandHistory[this.historyIndex];
            }
            
            // Move cursor to end
            this.inputLine.setSelectionRange(
                this.inputLine.value.length,
                this.inputLine.value.length
            );
        },
        
        /**
         * Handle tab completion
         */
        async _handleTabCompletion() {
            const currentInput = this.inputLine?.value || '';
            const cursorPos = this.inputLine?.selectionStart || currentInput.length;
            
            // Get word at cursor
            const beforeCursor = currentInput.substring(0, cursorPos);
            const wordMatch = beforeCursor.match(/(\S+)$/);
            if (!wordMatch) return;
            
            const partialWord = wordMatch[1];
            
            // Request completions from server
            if (this.isConnected && this.socket) {
                this.socket.send(JSON.stringify({
                    type: 'complete',
                    partial: partialWord,
                    timestamp: Date.now()
                }));
                
                // For now, just show common commands
                const commonCommands = ['ls', 'cd', 'cat', 'grep', 'find', 'git', 'npm', 'node', 'pwd', 'echo', 'mkdir', 'rm', 'cp', 'mv'];
                const matches = commonCommands.filter(cmd => cmd.startsWith(partialWord));
                
                if (matches.length === 1) {
                    // Complete the word
                    const newInput = beforeCursor.substring(0, beforeCursor.length - partialWord.length) + matches[0];
                    this.inputLine.value = newInput + currentInput.substring(cursorPos);
                } else if (matches.length > 1) {
                    // Show options
                    this._writeOutput('\r\n' + matches.join('  ') + '\r\n$ ' + currentInput);
                }
            }
        },
        
        /**
         * Write output to terminal
         */
        _writeOutput(text) {
            if (!this.outputContainer) return;
            
            // Create output element
            const span = document.createElement('span');
            span.className = 'terminal-output-line';
            span.textContent = text;
            
            // Handle special characters
            span.innerHTML = span.innerHTML
                .replace(/\r\n/g, '<br>')
                .replace(/\n/g, '<br>')
                .replace(/\r/g, '');
            
            this.outputContainer.appendChild(span);
            
            // Apply scrollback limit
            const lines = this.outputContainer.querySelectorAll('.terminal-output-line');
            if (lines.length > this.settings.scrollback) {
                lines[0].remove();
            }
            
            this._scrollToBottom();
        },
        
        /**
         * Clear terminal output
         */
        clear() {
            if (this.outputContainer) {
                this.outputContainer.innerHTML = '';
            }
            this._emit('cleared');
        },
        
        /**
         * Scroll to bottom of output
         */
        _scrollToBottom() {
            if (this.outputContainer) {
                this.outputContainer.scrollTop = this.outputContainer.scrollHeight;
            }
        },
        
        /**
         * Update connection status
         */
        _updateStatus(state, text) {
            if (this.statusIndicator) {
                this.statusIndicator.className = 'status-indicator ' + state;
            }
            if (this.statusText) {
                this.statusText.textContent = text;
            }
            
            // Update connect button
            const connectBtn = this.container?.querySelector('#terminal-connect-btn');
            if (connectBtn) {
                connectBtn.textContent = this.isConnected ? 'Disconnect' : 'Connect';
                connectBtn.classList.toggle('connected', this.isConnected);
            }
        },
        
        /**
         * Apply terminal theme
         */
        _applyTheme() {
            if (this.settings.theme === 'dark') {
                this.container?.classList.add('terminal-dark');
                this.container?.classList.remove('terminal-light');
            } else {
                this.container?.classList.add('terminal-light');
                this.container?.classList.remove('terminal-dark');
            }
            
            // Apply font settings
            if (this.inputLine) {
                this.inputLine.style.fontSize = this.settings.fontSize + 'px';
                this.inputLine.style.fontFamily = this.settings.fontFamily;
            }
            
            if (this.outputContainer) {
                this.outputContainer.style.fontSize = this.settings.fontSize + 'px';
                this.outputContainer.style.fontFamily = this.settings.fontFamily;
                this.outputContainer.style.lineHeight = this.settings.lineHeight;
            }
        },
        
        /**
         * Generate session ID
         */
        _generateSessionId() {
            return 'term_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        },
        
        // Event system
        _listeners: new Map(),
        
        on(event, callback) {
            if (!this._listeners.has(event)) {
                this._listeners.set(event, new Set());
            }
            this._listeners.get(event).add(callback);
            return () => this.off(event, callback);
        },
        
        off(event, callback) {
            this._listeners.get(event)?.delete(callback);
        },
        
        _emit(event, data) {
            this._listeners.get(event)?.forEach(cb => {
                try { cb(data); } catch (e) {
                    console.error('[Terminal] Event handler error:', e);
                }
            });
        },
        
        // Public API
        write(text) {
            this._writeOutput(text);
        },
        
        send(data) {
            if (this.isConnected && this.socket) {
                this.socket.send(typeof data === 'string' ? data : JSON.stringify(data));
            }
        },
        
        setTheme(theme) {
            this.settings.theme = theme;
            this._applyTheme();
        },
        
        setFontSize(size) {
            this.settings.fontSize = size;
            this._applyTheme();
        }
    };

    // Export
    global.TerminalEmulator = TerminalEmulator;

})(typeof window !== 'undefined' ? window : global);
