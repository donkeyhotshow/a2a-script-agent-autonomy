/**
 * Simulation Replay Module
 * Integrates with simulation-helpers for client-side simulation execution
 * 
 * Features:
 * - Replay simulation steps using simulation-helpers API
 * - Track execution state and history
 * - Support for both Actions and AI-Actions modes
 */

(function (global) {
    'use strict';

    /**
     * SimulationReplay class for managing simulation execution
     */
    class SimulationReplay {
        constructor(options = {}) {
            this.apiBase = options.apiBase || '/api';
            this.projectId = options.projectId || 'default';
            this.client = options.client || this._createDefaultClient();
            
            // Execution state
            this.state = {
                currentSessionId: null,
                currentStep: 0,
                history: [],
                isExecuting: false,
                simulationData: null
            };

            // Event listeners
            this._listeners = new Map();
        }

        /**
         * Create default HTTP client
         */
        _createDefaultClient() {
            return {
                request: async (method, path, body) => {
                    const url = `${this.apiBase}${path}`;
                    const options = {
                        method,
                        headers: { 'Content-Type': 'application/json' }
                    };
                    if (body) {
                        options.body = JSON.stringify(body);
                    }
                    const response = await fetch(url, options);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    return await response.json();
                }
            };
        }

        /**
         * Event system
         */
        on(event, callback) {
            if (!this._listeners.has(event)) {
                this._listeners.set(event, new Set());
            }
            this._listeners.get(event).add(callback);
            return () => this.off(event, callback);
        }

        off(event, callback) {
            this._listeners.get(event)?.delete(callback);
        }

        _emit(event, data) {
            this._listeners.get(event)?.forEach(cb => {
                try { cb(data); } catch (e) { console.error('[SimulationReplay] Event error:', e); }
            });
        }

        /**
         * Load simulation data
         */
        async loadSimulation(simulationId) {
            this._emit('loading', { simulationId });
            
            try {
                const response = await fetch(`${this.apiBase}/simulations/${simulationId}`);
                if (!response.ok) throw new Error(`Failed to load simulation: ${response.status}`);
                
                this.state.simulationData = await response.json();
                this.state.currentStep = 0;
                this.state.history = [];
                
                this._emit('loaded', { simulation: this.state.simulationData });
                return this.state.simulationData;
            } catch (error) {
                this._emit('error', { type: 'load', error });
                throw error;
            }
        }

        /**
         * Start simulation execution from beginning
         */
        async start(task, options = {}) {
            if (this.state.isExecuting) {
                throw new Error('Simulation already running');
            }

            this.state.isExecuting = true;
            this.state.history = [];
            this.state.currentStep = 0;

            this._emit('started', { task });

            try {
                // Create session and send initial task
                const result = await this._invokeFirstTask(task, options);
                this.state.currentSessionId = result.context?.session_id;
                
                this._recordStep({
                    type: 'initial',
                    request: { task },
                    response: result
                });

                this._emit('step', { step: 0, result });
                return result;
            } catch (error) {
                this.state.isExecuting = false;
                this._emit('error', { type: 'start', error });
                throw error;
            }
        }

        /**
         * Send form choice (for Actions mode)
         */
        async sendFormChoice(choiceId, extra = {}) {
            if (!this.state.isExecuting) {
                throw new Error('No active simulation');
            }

            const context = this._getCurrentContext();
            
            this._emit('sending', { type: 'form-choice', choiceId });

            try {
                const result = await this._sendFormChoice(context, choiceId, extra);
                
                this.state.currentStep++;
                this._recordStep({
                    type: 'form-choice',
                    request: { choiceId, extra },
                    response: result
                });

                this._emit('step', { step: this.state.currentStep, result });
                
                if (this._isComplete(result)) {
                    this._complete();
                }

                return result;
            } catch (error) {
                this._emit('error', { type: 'form-choice', error });
                throw error;
            }
        }

        /**
         * Send message (for AI-Actions mode)
         */
        async sendMessage(message) {
            if (!this.state.isExecuting) {
                throw new Error('No active simulation');
            }

            const context = this._getCurrentContext();
            
            this._emit('sending', { type: 'message', message });

            try {
                const result = await this._sendMessage(context, message);
                
                this.state.currentStep++;
                this._recordStep({
                    type: 'message',
                    request: { message },
                    response: result
                });

                this._emit('step', { step: this.state.currentStep, result });
                
                if (this._isComplete(result)) {
                    this._complete();
                }

                return result;
            } catch (error) {
                this._emit('error', { type: 'message', error });
                throw error;
            }
        }

        /**
         * Send client action result
         */
        async sendActionResult(actionKey, actionResult) {
            if (!this.state.isExecuting) {
                throw new Error('No active simulation');
            }

            const context = this._getCurrentContext();
            
            this._emit('sending', { type: 'action-result', actionKey });

            try {
                const result = await this._sendClientActionResult(context, actionKey, actionResult);
                
                this.state.currentStep++;
                this._recordStep({
                    type: 'action-result',
                    request: { actionKey, actionResult },
                    response: result
                });

                this._emit('step', { step: this.state.currentStep, result });
                
                if (this._isComplete(result)) {
                    this._complete();
                }

                return result;
            } catch (error) {
                this._emit('error', { type: 'action-result', error });
                throw error;
            }
        }

        /**
         * Replay a specific step from loaded simulation
         */
        async replayStep(stepIndex, stepData) {
            this._emit('replaying', { stepIndex, stepData });

            try {
                let result;
                const request = stepData.request;

                if (stepIndex === 0 || request.new_task) {
                    // First step - create session and send task
                    const task = request.new_task?.[0] || request.task;
                    result = await this._invokeFirstTask(task, { projectId: this.projectId });
                    this.state.currentSessionId = result.context?.session_id;
                } else if (request.result?.choice) {
                    // Form choice step
                    result = await this._sendFormChoice(
                        this._getCurrentContext(),
                        request.result.choice,
                        request.result
                    );
                } else if (request.result?.message) {
                    // Message step
                    result = await this._sendMessage(
                        this._getCurrentContext(),
                        request.result.message
                    );
                } else if (request.result) {
                    // Action result step
                    const actionKeys = Object.keys(request.result).filter(k => 
                        !['choice', 'message', 'completed'].includes(k)
                    );
                    if (actionKeys.length > 0) {
                        const actionKey = actionKeys[0];
                        result = await this._sendClientActionResult(
                            this._getCurrentContext(),
                            actionKey,
                            request.result[actionKey]
                        );
                    }
                }

                this._emit('replayed', { stepIndex, result });
                return result;
            } catch (error) {
                this._emit('error', { type: 'replay', stepIndex, error });
                throw error;
            }
        }

        /**
         * Stop simulation execution
         */
        stop() {
            this.state.isExecuting = false;
            this._emit('stopped', { history: this.state.history });
        }

        /**
         * Reset simulation state
         */
        reset() {
            this.state = {
                currentSessionId: null,
                currentStep: 0,
                history: [],
                isExecuting: false,
                simulationData: this.state.simulationData
            };
            this._emit('reset', {});
        }

        /**
         * Get execution history
         */
        getHistory() {
            return [...this.state.history];
        }

        /**
         * Get current context for next request
         */
        _getCurrentContext() {
            if (this.state.history.length === 0) {
                return { session_id: this.state.currentSessionId };
            }
            const lastStep = this.state.history[this.state.history.length - 1];
            return lastStep.response?.context || { session_id: this.state.currentSessionId };
        }

        /**
         * Record step in history
         */
        _recordStep(step) {
            this.state.history.push({
                step: this.state.currentStep,
                timestamp: new Date().toISOString(),
                ...step
            });
        }

        /**
         * Check if response indicates completion
         */
        _isComplete(response) {
            return !!(
                response?.result?.completed ||
                response?.finalResult ||
                (response?.result && Object.keys(response.result).length === 0)
            );
        }

        /**
         * Mark simulation as complete
         */
        _complete() {
            this.state.isExecuting = false;
            this._emit('completed', { 
                history: this.state.history,
                finalResult: this.state.history[this.state.history.length - 1]?.response?.finalResult
            });
        }

        // ===== simulation-helpers API wrappers =====

        async _invokeFirstTask(task, options = {}) {
            // Use native fetch if simulation-helpers not available
            if (typeof global.invokeFirstTask === 'function') {
                return await global.invokeFirstTask(this.client, task, options);
            }

            // Native implementation
            const sessionResponse = await this.client.request('POST', '/sessions', {
                project_id: options.projectId || this.projectId
            });

            const sessionData = sessionResponse.data || sessionResponse;
            const sessionId = sessionData.session_id;

            if (!sessionId) {
                throw new Error('Failed to create session: no session_id returned');
            }

            const messageResponse = await this.client.request('POST', `/sessions/${sessionId}/message`, {
                context: { version: '1.0', session_id: sessionId, new_task: [task] },
                new_task: [task]
            });

            const responseData = messageResponse.data || messageResponse;
            return {
                context: responseData,
                execute: responseData.execute,
                promiseId: responseData.promiseId,
                status: responseData.status
            };
        }

        async _sendFormChoice(context, choiceId, extra = {}) {
            if (typeof global.sendFormChoice === 'function') {
                return await global.sendFormChoice(this.client, context, choiceId, extra);
            }

            const sessionId = context.session_id;
            if (!sessionId) throw new Error('No session_id in context');

            const result = { choice: choiceId, ...extra };
            const response = await this.client.request('POST', `/sessions/${sessionId}/message`, {
                context: { ...context, result },
                result
            });

            return response.data || response;
        }

        async _sendMessage(context, message) {
            if (typeof global.sendMessage === 'function') {
                return await global.sendMessage(this.client, context, message);
            }

            const sessionId = context.session_id;
            if (!sessionId) throw new Error('No session_id in context');

            const result = { message };
            const response = await this.client.request('POST', `/sessions/${sessionId}/message`, {
                context: { ...context, result },
                result
            });

            return response.data || response;
        }

        async _sendClientActionResult(context, actionKey, actionResult) {
            if (typeof global.sendClientActionResult === 'function') {
                return await global.sendClientActionResult(this.client, context, actionKey, actionResult);
            }

            const sessionId = context.session_id;
            if (!sessionId) throw new Error('No session_id in context');

            const result = { [actionKey]: actionResult };
            const response = await this.client.request('POST', `/sessions/${sessionId}/message`, {
                context: { ...context, result },
                result
            });

            return response.data || response;
        }
    }

    // Export
    global.SimulationReplay = SimulationReplay;

    // Also export as ES module if supported
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { SimulationReplay };
    }

})(typeof window !== 'undefined' ? window : global);
