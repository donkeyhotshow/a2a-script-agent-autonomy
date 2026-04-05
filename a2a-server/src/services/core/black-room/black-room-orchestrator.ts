/**
 * Black Room Orchestrator - Executes algorithms on local Ollama
 *
 * Handles deterministic algorithm execution for the Black Room (Algorithm Mode)
 * as defined in ADR-0058.
 */

import {logger} from '../../../utils/logger.js';
import {pollReadyThenFetch} from '../../../daemon/llm-hub-poll.js';
import {AlgorithmDefinition, AlgorithmContext, AlgorithmData, AlgorithmResult, BlackRoomExecutionOptions} from './types.js';
import {algorithmRegistry} from './algorithm-registry.js';

const DEFAULT_OLLAMA_URL = 'http://localhost:11435';
const DEFAULT_MAX_RETRIES = 1;

export class BlackRoomOrchestrator {
    private ollamaUrl: string;
    private defaultModel: string;
    private maxRetries: number;

    constructor(options: BlackRoomExecutionOptions = {}) {
        this.ollamaUrl = options.ollamaUrl || process.env.A2A_BLACK_ROOM_OLLAMA_URL || DEFAULT_OLLAMA_URL;
        this.defaultModel = options.defaultModel || process.env.A2A_BLACK_ROOM_DEFAULT_MODEL || 'llama3.1:8b';
        this.maxRetries = options.maxRetries || DEFAULT_MAX_RETRIES;
    }

    /**
     * Execute an algorithm with the given context and data
     */
    async executeAlgorithm(
        algorithmId: string,
        context: AlgorithmContext,
        data: AlgorithmData
    ): Promise<AlgorithmResult> {
        const startTime = Date.now();
        const algorithm = algorithmRegistry.getAlgorithm(algorithmId);

        if (!algorithm) {
            logger.error('[BlackRoom] Algorithm not found', {algorithmId});
            return {
                status: 'failed',
                error: `Algorithm ${algorithmId} not found`,
                metrics: { durationMs: Date.now() - startTime, tokensIn: 0, tokensOut: 0 }
            };
        }

        logger.info('[BlackRoom] Starting algorithm execution', {
            algorithmId,
            sessionId: context.sessionId,
            model: algorithm.model
        });

        try {
            // Validate context requirements
            const missingRequirements = algorithm.contextRequirements.filter(req => !context[req]);
            if (missingRequirements.length > 0) {
                logger.warn('[BlackRoom] Missing context requirements', {
                    algorithmId,
                    missing: missingRequirements
                });
                return {
                    status: 'failed',
                    error: `Missing required context: ${missingRequirements.join(', ')}`,
                    metrics: { durationMs: Date.now() - startTime, tokensIn: 0, tokensOut: 0 }
                };
            }

            // Build prompt from template (simplified - in real implementation, load from files)
            const prompt = this.buildAlgorithmPrompt(algorithm, context, data);

            // Execute on Ollama with retries
            let result: AlgorithmResult | null = null;
            let lastError: string | null = null;

            for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
                try {
                    result = await this.executeOnOllama(algorithm, prompt, startTime);
                    if (result.status === 'completed') {
                        break;
                    }
                    lastError = result.error || 'Unknown error';
                } catch (error) {
                    lastError = String(error);
                    logger.warn(`[BlackRoom] Attempt ${attempt} failed`, {algorithmId, error: lastError});

                    if (attempt < this.maxRetries) {
                        // Brief delay before retry
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }

            if (!result || result.status !== 'completed') {
                logger.error('[BlackRoom] Algorithm execution failed after retries', {
                    algorithmId,
                    attempts: this.maxRetries,
                    lastError
                });
                return {
                    status: 'failed',
                    error: lastError || 'Execution failed after retries',
                    metrics: { durationMs: Date.now() - startTime, tokensIn: 0, tokensOut: 0 }
                };
            }

            // Validate output against schema (simplified)
            if (!this.validateAlgorithmOutput(result.output, algorithm.outputSchema)) {
                logger.warn('[BlackRoom] Algorithm output validation failed', {algorithmId});
                return {
                    status: 'failed',
                    error: 'Output validation failed',
                    metrics: result.metrics
                };
            }

            logger.info('[BlackRoom] Algorithm execution completed', {
                algorithmId,
                durationMs: result.metrics?.durationMs,
                tokensIn: result.metrics?.tokensIn,
                tokensOut: result.metrics?.tokensOut
            });

            return result;

        } catch (error) {
            const errorMsg = String(error);
            logger.error('[BlackRoom] Algorithm execution error', {algorithmId, error: errorMsg});
            return {
                status: 'failed',
                error: errorMsg,
                metrics: { durationMs: Date.now() - startTime, tokensIn: 0, tokensOut: 0 }
            };
        }
    }

    private buildAlgorithmPrompt(
        algorithm: AlgorithmDefinition,
        context: AlgorithmContext,
        data: AlgorithmData
    ): { system: string; user: string } {
        // Simplified prompt building - in real implementation, load templates from files
        const systemPrompt = `You are executing algorithm ${algorithm.id} v${algorithm.version}.
Context: ${JSON.stringify(context, null, 2)}
Execute deterministically with temperature ${algorithm.temperature}.`;

        let userPrompt = `Algorithm: ${algorithm.id}
Data: ${JSON.stringify(data, null, 2)}

Instructions: `;

        switch (algorithm.id) {
            case 'ctx-gather-v2':
                userPrompt += `Find all TypeScript/JavaScript files matching the patterns in targetFiles.
Extract import statements and dependencies. Return as JSON with files array and imports array.`;
                break;
            case 'edit-apply-ts-imports':
                userPrompt += `Apply the import mappings to fix import statements in the provided files.
Return the edit operations as JSON.`;
                break;
            case 'pattern-match-dead-code':
                userPrompt += `Analyze the source files for dead code (unused exports, imports).
Return findings as JSON.`;
                break;
            default:
                userPrompt += `Execute the algorithm with the given data and context.`;
        }

        return { system: systemPrompt, user: userPrompt };
    }

    private async executeOnOllama(
        algorithm: AlgorithmDefinition,
        prompt: { system: string; user: string },
        startTime: number
    ): Promise<AlgorithmResult> {
        const model = algorithm.model || this.defaultModel;

        // Create promise for Ollama chat
        const promiseId = `black-room-${algorithm.id}-${Date.now()}`;
        const chatRes = await fetch(`${this.ollamaUrl}/api/chat?promise=1`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Server-Promise-Id': promiseId,
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: prompt.system },
                    { role: 'user', content: prompt.user }
                ],
                stream: false,
                options: {
                    temperature: algorithm.temperature,
                    num_predict: algorithm.maxTokens
                }
            }),
        });

        if (chatRes.status !== 202) {
            const errorText = await chatRes.text();
            throw new Error(`Ollama chat init failed: ${chatRes.status} ${errorText}`);
        }

        const initData = await chatRes.json() as { promiseId?: string };
        const ollamaPromiseId = initData?.promiseId;
        if (!ollamaPromiseId) {
            throw new Error('No promiseId in Ollama response');
        }

        // Poll for completion
        const response = await pollReadyThenFetch(this.ollamaUrl, ollamaPromiseId);
        if (!response) {
            throw new Error('Ollama response fetch failed');
        }

        const durationMs = Date.now() - startTime;

        try {
            const parsed = JSON.parse(response.trim());

            // Estimate token counts (simplified)
            const tokensIn = Math.ceil((prompt.system.length + prompt.user.length) / 4); // rough estimate
            const tokensOut = Math.ceil(response.length / 4);

            return {
                status: 'completed',
                output: parsed,
                metrics: {
                    durationMs,
                    tokensIn,
                    tokensOut
                }
            };
        } catch (parseError) {
            logger.warn('[BlackRoom] Failed to parse algorithm output as JSON', {
                algorithmId: algorithm.id,
                response: response.substring(0, 200)
            });
            throw new Error(`Invalid JSON output: ${parseError}`);
        }
    }

    private validateAlgorithmOutput(output: Record<string, unknown> | undefined, schema: Record<string, unknown>): boolean {
        if (!output) return false;

        // Simplified validation - check required fields exist
        if (schema.required && Array.isArray(schema.required)) {
            for (const required of schema.required) {
                if (!(required in output)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Check if Black Room is enabled and available
     */
    async isAvailable(): Promise<boolean> {
        try {
            const healthRes = await fetch(`${this.ollamaUrl}/api/tags`);
            return healthRes.ok;
        } catch (err: unknown) {
            logger.debug('[BlackRoomOrchestrator] Ollama health check failed', {
                url: this.ollamaUrl,
                error: err instanceof Error ? err.message : String(err),
            });
            return false;
        }
    }
}