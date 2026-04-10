/**
 * Mock LLM Adapter for Tests
 * 
 * Provides a mock implementation of callLLM() with:
 * - Preset responses from files
 * - Replay mode (reading from LLM_REPLAY_DIR)
 * - Canonical response format with step, message, execute, completed
 */

import { vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve as resolvePath } from 'node:path';
import type { LLMInput } from '../../../src/services/ai/llm-adapter.js';

// Map of response keys to preset responses
const responseMap = new Map<string, string>();

// Call count for generating unique response keys
let callCount = 0;

export interface LLMMockConfig {
    /** Custom response generator function */
    responseGenerator?: (input: LLMInput) => string;
    /** Default response when no preset is found */
    defaultResponse?: string;
    /** Enable console logging of calls */
    verbose?: boolean;
}

export interface ReplayProviderOptions {
    /** Directory containing replay files */
    replayDir: string;
    /** Fallback to real LLM if replay file not found */
    fallbackToReal?: boolean;
}

/**
 * Generate a unique response key from LLM input
 */
function generateResponseKey(input: LLMInput): string {
    const contextStr = JSON.stringify(input.context || {});
    const hash = simpleHash(contextStr + callCount++);
    return `call_${hash}`;
}

/**
 * Simple hash function for generating keys
 */
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

/**
 * Create a canonical mock response in the expected format
 */
export function createCanonicalResponse(params: {
    step?: string;
    message?: string;
    execute?: Record<string, unknown>;
    completed?: boolean;
} = {}): string {
    return JSON.stringify({
        step: params.step || 'plan',
        message: params.message || 'Mock response from test',
        execute: params.execute || { 'message': { text: 'Test message' } },
        completed: params.completed ?? false
    });
}

/**
 * Setup LLM mock with vitest
 */
export function setupLLMMock(config: LLMMockConfig = {}) {
    const { 
        responseGenerator, 
        defaultResponse,
        verbose = false 
    } = config;

    const mockCallLLM = vi.fn(async (input: LLMInput): Promise<string> => {
        if (verbose) {
            console.log('[LLM Mock] Called with input:', JSON.stringify(input, null, 2));
        }

        // Check if we have a preset response for this input
        const key = generateResponseKey(input);
        
        if (responseMap.has(key)) {
            const response = responseMap.get(key)!;
            if (verbose) {
                console.log('[LLM Mock] Returning preset response for key:', key);
            }
            return response;
        }

        // Use custom response generator if provided
        if (responseGenerator) {
            return responseGenerator(input);
        }

        // Return default response or canonical format
        if (defaultResponse) {
            return defaultResponse;
        }

        // Default canonical response
        return createCanonicalResponse({
            step: 'completed',
            message: 'Mock response',
            execute: { 'message': { text: 'Mock completed' } },
            completed: true
        });
    });

    return { mockCallLLM, responseMap };
}

/**
 * Set a preset response for a specific key
 */
export function mockLLMResponse(key: string, response: string): void {
    responseMap.set(key, response);
}

/**
 * Set a preset response using canonical format
 */
export function mockLLMCanonicalResponse(
    key: string, 
    params: {
        step?: string;
        message?: string;
        execute?: Record<string, unknown>;
        completed?: boolean;
    } = {}
): void {
    responseMap.set(key, createCanonicalResponse(params));
}

/**
 * Clear all preset responses
 */
export function clearLLMResponses(): void {
    responseMap.clear();
    callCount = 0;
}

/**
 * Replay provider - reads responses from files (compatible with LLM_REPLAY_DIR)
 */
export async function createReplayProvider(options: ReplayProviderOptions): Promise<(input: LLMInput) => Promise<string>> {
    const { replayDir, fallbackToReal = false } = options;

    return async (_input: LLMInput): Promise<string> => {
        try {
            // Try to read from replay directory
            const responsePath = resolvePath(replayDir, 'response.md');
            const content = await readFile(responsePath, 'utf8');
            return content.trim();
        } catch (err) {
            if (fallbackToReal) {
                // In test mode, we shouldn't call real LLM
                console.warn('[LLM Replay] File not found, using fallback:', replayDir);
            }
            
            // Return placeholder response for tests
            return createCanonicalResponse({
                step: 'completed',
                message: 'Replay not found',
                execute: { 'message': { text: 'Test placeholder' } },
                completed: true
            });
        }
    };
}

/**
 * Load responses from a directory of preset files
 */
export async function loadPresetResponses(
    responsesDir: string
): Promise<Map<string, string>> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    
    const presets = new Map<string, string>();
    
    try {
        const files = await fs.readdir(responsesDir);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.resolve(responsesDir, file);
                const content = await fs.readFile(filePath, 'utf8');
                const data = JSON.parse(content);
                
                // Support { key, response } format
                if (data.key && data.response) {
                    presets.set(data.key, data.response);
                }
            }
        }
    } catch (err) {
        console.warn('[LLM Mock] Could not load preset responses:', String(err));
    }
    
    return presets;
}

/**
 * Preload preset responses into the response map
 */
export function preloadResponses(presets: Map<string, string>): void {
    for (const [key, response] of presets) {
        responseMap.set(key, response);
    }
}

/**
 * Get current call count
 */
export function getCallCount(): number {
    return callCount;
}

/**
 * Reset call count
 */
export function resetCallCount(): void {
    callCount = 0;
}
