/**
 * Progress Indicators Module
 * Visual progress tracking for long-running operations
 *
 * Features:
 * - Loading state for POST /api/sessions/:id/next
 * - "Running…" status with promiseId polling
 * - Cancel/stop updates UI
 * - Integration with SSE events
 */

(function (global) {
    'use strict';

    const ProgressIndicators = {
        // Active progress trackers
        _trackers: new Map(),
        _listeners: new Map(),
        
        // Wait indicator state
        _waitIndicator: null,
        
        // Default configuration
        defaults: {
            animated: true,
            showPercentage: true,
            showMessage: true,
            indeterminateSpeed: 300,
            autoRemove: true
        },

        /**
         * Create a new progress tracker
         */
        create(id, options = {}) {
            const tracker = new ProgressTracker(id, {
                ...this.defaults,
                ...options
            });
            this._trackers.set(id, tracker);
            return tracker;
        },

        /**
         * Get tracker by ID
         */
        get(id) {
            return this._trackers.get(id);
        },

        /**
         * Remove tracker
         */
        remove(id) {
            const tracker = this._trackers.get(id);
            if (tracker) {
                tracker.destroy();
                this._trackers.delete(id);
            }
        },

        /**
         * Show wait indicator - called when server sends execute.wait
         * @param {Object} waitData - { message?: string, showFormAfter?: boolean }
         */
        showWaitIndicator(waitData = {}) {
            // Remove existing wait indicator if any
            this.hideWaitIndicator();
            
            const message = waitData.message || 'Ожидайте...';
            const containerId = 'wait-indicator-container';
            
            // Create container
            let container = document.getElementById(containerId);
            if (!container) {
                container = document.createElement('div');
                container.id = containerId;
                container.className = 'wait-indicator';
                document.body.appendChild(container);
            }
            
            // Build HTML
            container.innerHTML = `
                <div class="wait-indicator-content">
                    <div class="wait-spinner"></div>
                    <div class="wait-message">${this._escapeHtml(message)}</div>
                </div>
            `;
            
            // Add styles if not already added
            this._ensureWaitIndicatorStyles();
            
            // Show with animation
            container.classList.add('wait-indicator-visible');
            
            this._waitIndicator = {
                container,
                message,
                showFormAfter: waitData.showFormAfter
            };
            
            console.log('[ProgressIndicators] Wait indicator shown:', message);
        },

        /**
         * Hide wait indicator - called when server sends final execute
         */
        hideWaitIndicator() {
            if (!this._waitIndicator) return;
            
            const container = this._waitIndicator.container;
            if (container) {
                container.classList.remove('wait-indicator-visible');
                
                // Remove after animation
                setTimeout(() => {
                    if (container.parentNode) {
                        container.parentNode.removeChild(container);
                    }
                }, 300);
            }
            
            console.log('[ProgressIndicators] Wait indicator hidden');
            this._waitIndicator = null;
        },

        /**
         * Get current wait indicator state
         */
        getWaitIndicator() {
            return this._waitIndicator;
        },

        /**
         * Escape HTML to prevent XSS
         */
        _escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        /**
         * Ensure wait indicator styles are loaded
         */
        _ensureWaitIndicatorStyles() {
            const styleId = 'wait-indicator-styles';
            if (document.getElementById(styleId)) return;
            
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .wait-indicator {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.85);
                    border-radius: 12px;
                    padding: 24px 40px;
                    z-index: 10000;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    pointer-events: none;
                }
                .wait-indicator-visible {
                    opacity: 1;
                    pointer-events: auto;
                }
                .wait-indicator-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                }
                .wait-spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid rgba(255, 255, 255, 0.2);
                    border-top-color: #4CAF50;
                    border-radius: 50%;
                    animation: wait-spin 1s linear infinite;
                }
                @keyframes wait-spin {
                    to { transform: rotate(360deg); }
                }
                .wait-message {
                    color: #fff;
                    font-size: 16px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    text-align: center;
                }
            `;
            document.head.appendChild(style);
        },

        /**
         * Update progress from SSE/progress event
         */
        handleProgressEvent(eventData) {
            const { current, total, message, progressId } = eventData;
            const id = progressId || 'default';
            
            let tracker = this._trackers.get(id);
            if (!tracker) {
                tracker = this.create(id);
            }

            if (total > 0) {
                const percent = Math.round((current / total) * 100);
                tracker.setProgress(percent, message);
            } else if (current !== undefined) {
                // Indeterminate mode
                tracker.setIndeterminate(message);
            } else {
                tracker.setMessage(message || 'Processing...');
            }
        },

        /**
         * Task 3.2: Handle progress from context.execution.progress
         * @param {Object} progressData - { progress, action, step }
         */
        handleExecutionProgress(progressData) {
            const { progress, action, step } = progressData;
            const id = `execution-${action || 'default'}`;
            
            let tracker = this._trackers.get(id);
            if (!tracker) {
                tracker = this.create(id, {
                    showLabel: true,
                    showMessage: true,
                    autoRemove: false
                });
            }

            const message = step ? `Step: ${step}` : `Action: ${action || 'Processing...'}`;
            tracker.setProgress(progress, message);
            
            return tracker;
        },

        /**
         * Subscribe to events
         */
        on(event, callback) {
            if (!this._listeners.has(event)) {
                this._listeners.set(event, new Set());
            }
            this._listeners.get(event).add(callback);
        },

        /**
         * Emit event
         */
        emit(event, data) {
            this._listeners.get(event)?.forEach(cb => cb(data));
        },

        /**
         * Render progress bar to container
         */
        renderTo(containerId, options = {}) {
            const container = document.getElementById(containerId);
            if (!container) return null;

            const id = options.id || `progress-${Date.now()}`;
            const tracker = this.create(id, options);

            const html = `
                <div class="progress-indicator" id="${id}">
                    ${options.showLabel !== false ? `<div class="progress-label"></div>` : ''}
                    <div class="progress-bar-container">
                        <div class="progress-bar"></div>
                    </div>
                    ${options.showPercentage !== false ? `<div class="progress-percentage">0%</div>` : ''}
                    ${options.showMessage !== false ? `<div class="progress-message"></div>` : ''}
                </div>
            `;

            container.innerHTML = html;
            tracker.setElement(container.querySelector(`#${id}`));

            return tracker;
        }
    };

    /**
     * Progress Tracker Class
     */
    class ProgressTracker {
        constructor(id, options) {
            this.id = id;
            this.options = options;
            this.progress = 0;
            this.message = '';
            this.state = 'idle'; // idle, indeterminate, determinate, complete, error
            this.element = null;
            this._animationFrame = null;
        }

        setElement(el) {
            this.element = el;
            this.updateDOM();
        }

        /**
         * Set determinate progress (0-100)
         */
        setProgress(percent, message = '') {
            this.state = 'determinate';
            this.progress = Math.max(0, Math.min(100, percent));
            this.message = message || `${this.progress}%`;
            this.updateDOM();
            
            // Emit event
            ProgressIndicators.emit('progress', {
                id: this.id,
                progress: this.progress,
                message: this.message
            });

            // Auto-complete at 100%
            if (this.progress >= 100) {
                this.complete();
            }
        }

        /**
         * Set indeterminate progress (animated)
         */
        setIndeterminate(message = 'Processing...') {
            this.state = 'indeterminate';
            this.message = message;
            this.updateDOM();
        }

        /**
         * Set just message without progress
         */
        setMessage(message) {
            this.message = message;
            this.updateDOM();
        }

        /**
         * Mark as complete
         */
        complete(message = 'Complete!') {
            this.state = 'complete';
            this.progress = 100;
            this.message = message;
            this.updateDOM();
            
            ProgressIndicators.emit('complete', { id: this.id });

            if (this.options.autoRemove) {
                setTimeout(() => ProgressIndicators.remove(this.id), 2000);
            }
        }

        /**
         * Mark as error
         */
        error(message = 'Error') {
            this.state = 'error';
            this.message = message;
            this.updateDOM();
            
            ProgressIndicators.emit('error', { id: this.id, message });
        }

        /**
         * Reset tracker
         */
        reset() {
            this.state = 'idle';
            this.progress = 0;
            this.message = '';
            this.updateDOM();
        }

        /**
         * Update DOM elements
         */
        updateDOM() {
            if (!this.element) return;

            const bar = this.element.querySelector('.progress-bar');
            const percentage = this.element.querySelector('.progress-percentage');
            const messageEl = this.element.querySelector('.progress-message');
            const label = this.element.querySelector('.progress-label');

            // Update state class
            this.element.className = `progress-indicator state-${this.state}`;

            // Update bar
            if (bar) {
                if (this.state === 'indeterminate') {
                    bar.style.width = '100%';
                    bar.classList.add('indeterminate');
                    if (this.options.animated) {
                        bar.classList.add('animated');
                    }
                } else {
                    bar.classList.remove('indeterminate', 'animated');
                    bar.style.width = `${this.progress}%`;
                }
            }

            // Update percentage
            if (percentage && this.options.showPercentage) {
                percentage.textContent = this.state === 'indeterminate' ? '' : `${this.progress}%`;
            }

            // Update message
            if (messageEl && this.options.showMessage) {
                messageEl.textContent = this.message;
            }

            // Update label
            if (label) {
                label.textContent = this.message;
            }
        }

        /**
         * Destroy tracker
         */
        destroy() {
            if (this._animationFrame) {
                cancelAnimationFrame(this._animationFrame);
            }
            if (this.element) {
                this.element.remove();
            }
        }
    }

    // Export
    global.ProgressIndicators = ProgressIndicators;

    // Auto-integrate with SSE client events
    if (global.SSEClient) {
        global.SSEClient.on('progress', (data) => {
            ProgressIndicators.handleProgressEvent(data);
        });
        
        global.SSEClient.on('complete', (data) => {
            ProgressIndicators.emit('complete', data);
        });
        
        global.SSEClient.on('error', (data) => {
            ProgressIndicators.emit('error', data);
        });
    }

    /**
     * Session Progress Manager
     * Manages progress for session operations with promiseId polling
     */
    const SessionProgressManager = {
        _activeSessions: new Map(),
        _pollingIntervals: new Map(),
        _apiBase: '/api',

        /**
         * Start progress tracking for session operation
         */
        async startSessionProgress(sessionId, operation = 'next', options = {}) {
            const progressId = `session-${sessionId}-${operation}`;
            
            // Create progress tracker
            const tracker = ProgressIndicators.create(progressId, {
                showLabel: true,
                showMessage: true,
                autoRemove: false,
                ...options
            });

            // Create UI container if not exists
            let container = document.getElementById('session-progress-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'session-progress-container';
                container.className = 'session-progress-wrapper';
                
                // Insert after session panel
                const sessionPanel = document.querySelector('.session-panel');
                if (sessionPanel) {
                    sessionPanel.parentNode.insertBefore(container, sessionPanel.nextSibling);
                } else {
                    document.body.appendChild(container);
                }
            }

            // Render progress bar
            tracker.renderTo(container.id, {
                id: progressId,
                showPercentage: true,
                showMessage: true
            });

            // Add cancel button
            this._addCancelButton(container, progressId, sessionId);

            // Set initial "Running..." state
            tracker.setIndeterminate('Running...');

            // Store session info
            this._activeSessions.set(progressId, {
                sessionId,
                operation,
                tracker,
                startTime: Date.now()
            });

            return tracker;
        },

        /**
         * Handle promiseId polling for session operations
         */
        async pollPromiseId(sessionId, promiseId, progressId) {
            const sessionInfo = this._activeSessions.get(progressId);
            if (!sessionInfo) return;

            const { tracker } = sessionInfo;
            let attempts = 0;
            const maxAttempts = 100; // 5 minutes with 3s intervals
            const pollInterval = 3000;

            // Clear existing polling
            if (this._pollingIntervals.has(progressId)) {
                clearInterval(this._pollingIntervals.get(progressId));
            }

            const intervalId = setInterval(async () => {
                attempts++;
                
                try {
                    // FIX: Use correct server endpoint for promise status
                    const pollUrl = `/api/v1/requests/${promiseId}/status`;
                    console.log('[SessionProgressManager] Polling URL (FIXED):', pollUrl);
                    const response = await fetch(pollUrl);
                    const json = await response.json();
                    
                    // Server returns { success: true, data: { status, ... } }
                    const data = json.data || json;

                    if (response.ok) {
                        if (data.status === 'completed') {
                            clearInterval(intervalId);
                            this._pollingIntervals.delete(progressId);
                            
                            tracker.setProgress(100, 'Operation completed');
                            
                            // Fetch the result after completion
                            try {
                                const resultUrl = `/api/v1/requests/${promiseId}/result`;
                                console.log('[SessionProgressManager] Fetching result from:', resultUrl);
                                const resultResponse = await fetch(resultUrl);
                                const resultJson = await resultResponse.json();
                                const result = resultJson.data || resultJson;
                                
                                // Emit completion event with result
                                this._emit('promiseCompleted', { promiseId, result, sessionId });
                            } catch (e) {
                                console.warn('[SessionProgressManager] Failed to fetch result:', e);
                            }
                            
                            setTimeout(() => {
                                ProgressIndicators.remove(progressId);
                                this._activeSessions.delete(progressId);
                            }, 2000);
                            
                        } else if (data.status === 'failed') {
                            clearInterval(intervalId);
                            this._pollingIntervals.delete(progressId);
                            
                            tracker.error(data.error || 'Operation failed');
                            
                        } else if (data.progress) {
                            // Update progress
                            const { current, total, message } = data.progress;
                            if (total > 0) {
                                const percent = Math.round((current / total) * 100);
                                tracker.setProgress(percent, message || `Processing... (${current}/${total})`);
                            } else {
                                tracker.setIndeterminate(message || 'Processing...');
                            }
                        } else {
                            // Still running, show elapsed time
                            const elapsed = Math.floor((Date.now() - sessionInfo.startTime) / 1000);
                            tracker.setIndeterminate(`Running... (${elapsed}s elapsed)`);
                        }
                    } else {
                        throw new Error(data.error || 'Polling failed');
                    }

                    if (attempts >= maxAttempts) {
                        clearInterval(intervalId);
                        this._pollingIntervals.delete(progressId);
                        tracker.error('Operation timed out');
                    }

                } catch (error) {
                    clearInterval(intervalId);
                    this._pollingIntervals.delete(progressId);
                    tracker.error(`Polling error: ${error.message}`);
                }
            }, pollInterval);

            this._pollingIntervals.set(progressId, intervalId);
        },

        /**
         * Handle POST /api/sessions/:id/next response
         */
        async handleSessionNextResponse(sessionId, response) {
            const { promiseId, message } = response;

            if (promiseId) {
                // Start progress tracking with promiseId
                const tracker = await this.startSessionProgress(sessionId, 'next');
                const progressId = tracker.id;
                
                if (message) {
                    tracker.setMessage(message);
                }

                // Start polling for promiseId
                this.pollPromiseId(sessionId, promiseId, progressId);
                
                return progressId;
            } else {
                // Immediate response, no progress needed
                return null;
            }
        },

        /**
         * Cancel session operation
         */
        async cancelSessionOperation(sessionId, operation = 'next') {
            const progressId = `session-${sessionId}-${operation}`;
            const sessionInfo = this._activeSessions.get(progressId);

            if (!sessionInfo) return false;

            try {
                const response = await fetch(`${this._apiBase}/sessions/${sessionId}/cancel`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ operation })
                });

                if (response.ok) {
                    const tracker = sessionInfo.tracker;
                    tracker.setMessage('Operation cancelled');
                    tracker.error('Cancelled by user');

                    // Clean up
                    setTimeout(() => {
                        ProgressIndicators.remove(progressId);
                        this._activeSessions.delete(progressId);
                    }, 3000);

                    return true;
                } else {
                    throw new Error('Cancel request failed');
                }

            } catch (error) {
                console.error('Failed to cancel session operation:', error);
                return false;
            }
        },

        /**
         * Add cancel button to progress container
         */
        _addCancelButton(container, progressId, sessionId) {
            // Remove existing cancel button
            const existingCancel = container.querySelector('.progress-cancel-btn');
            if (existingCancel) {
                existingCancel.remove();
            }

            const cancelButton = document.createElement('button');
            cancelButton.className = 'progress-cancel-btn';
            cancelButton.textContent = 'Stop';
            cancelButton.title = 'Stop current operation';
            cancelButton.onclick = () => {
                this.cancelSessionOperation(sessionId, 'next');
            };

            container.appendChild(cancelButton);
        },

        /**
         * Clean up all session progress
         */
        cleanup() {
            // Clear all polling intervals
            this._pollingIntervals.forEach(intervalId => clearInterval(intervalId));
            this._pollingIntervals.clear();

            // Remove all trackers
            this._activeSessions.forEach((sessionInfo, progressId) => {
                ProgressIndicators.remove(progressId);
            });
            this._activeSessions.clear();

            // Remove container
            const container = document.getElementById('session-progress-container');
            if (container) {
                container.remove();
            }
        }
    };

    // Export session progress manager
    global.SessionProgressManager = SessionProgressManager;

    // Integrate with existing session manager if available
    if (global.SessionManager) {
        // Override or extend session next method to include progress tracking
        const originalNext = global.SessionManager.next;
        if (originalNext) {
            global.SessionManager.next = async function(sessionId, data) {
                const result = await originalNext.call(this, sessionId, data);
                
                // Handle progress tracking
                if (result && result.promiseId) {
                    await SessionProgressManager.handleSessionNextResponse(sessionId, result);
                }
                
                return result;
            };
        }
    }

})(typeof window !== 'undefined' ? window : globalThis);
