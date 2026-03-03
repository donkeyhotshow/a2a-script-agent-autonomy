/**
 * Progress Indicators Module
 * Visual progress tracking for long-running operations
 *
 * TODO(Task-09): loading state for POST /api/sessions/:id/next; "Running…" / promiseId polling – tasks/client/09-web-errors-progress-and-ux.md
 * TODO(Task-09): cancel/stop updates UI (e.g. back to "Далее")
 */

(function (global) {
    'use strict';

    const ProgressIndicators = {
        // Active progress trackers
        _trackers: new Map(),
        _listeners: new Map(),
        
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

})(typeof window !== 'undefined' ? window : globalThis);
