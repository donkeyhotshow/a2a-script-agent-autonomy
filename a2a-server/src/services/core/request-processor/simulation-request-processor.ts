/**
 * Simulation Request Processor
 *
 * Handles simulation-based request processing including:
 * - Replay mechanisms for recorded interactions
 * - Simulation directory management
 * - Response replay from simulations
 * - Server transform pipeline integration (server-transforms-request.json, server-transforms-response.json)
 */

import {logger} from '../../../utils/logger.js';
import {readFile} from 'fs/promises';
import {existsSync} from 'fs';
import path from 'path';
import {
    runTransformPipeline,
    runSimulationTransform,
    loadSimulationTransform,
    type TransformPipeline
} from '../../../transform/index.js';
import type {
    RequestContext,
    ProcessResult
} from '../request-processor.interfaces.js';
import {BaseRequestProcessor, type RequestType} from './base-processor.js';

/**
 * Simulation configuration
 */
export interface SimulationConfig {
    simulationsBasePath: string;
    enableReplay: boolean;
    defaultSimulation: string | null;
}

/**
 * Simulation context from request
 */
export interface SimulationContext {
    simulationName: string;
    stepNumber: number;
    replayMode: boolean;
}

/**
 * Simulation Request Processor
 * Handles simulation and replay scenarios
 */
export class SimulationRequestProcessor extends BaseRequestProcessor {
    private simConfig: SimulationConfig;

    constructor(config: Partial<SimulationConfig> = {}) {
        super('SimulationRequestProcessor', config);
        this.config = {
            simulationsBasePath: process.env.SIMULATIONS_PATH || './simulations',
            enableReplay: true,
            defaultSimulation: null,
            ...config
        };
    }

    /**
     * Determine if this processor can handle the request
     * Checks for simulation-related context fields
     */
    canProcess(request: RequestContext): boolean {
        const ctx = request.context;

        // Check for simulation-specific fields
        if (ctx['simulation'] || ctx['replay'] || ctx['simulation_name'] || ctx['simulation_step']) {
            return true;
        }

        // Check for replay mode
        if (ctx['replay_mode'] === true) {
            return true;
        }

        // Check task text for simulation indicators
        const taskText = this.parseTaskText(ctx);
        if (taskText.toLowerCase().includes('simulation') || taskText.toLowerCase().includes('replay')) {
            return true;
        }

        return false;
    }

    /**
     * Get the request type this processor handles
     */
    getRequestType(): RequestType {
        return 'simulation';
    }

    /**
     * Main processing logic for simulation requests
     */
    protected async doProcess(request: RequestContext): Promise<ProcessResult> {
        const {promiseId, context} = request;
        const ctx = context;

        logger.info('[SimulationRequestProcessor] Processing simulation request', {
            promiseId
        });

        // Extract simulation context
        const simContext = this.extractSimulationContext(ctx);

        if (!simContext.simulationName) {
            logger.warn('[SimulationRequestProcessor] No simulation name specified');
            return {
                outcome: 'failed',
                error: 'Simulation name is required'
            } as ProcessResult;
        }

        // Load and replay simulation
        if (simContext.replayMode) {
            return this.handleReplay(simContext, ctx);
        }

        // Process as new simulation scenario
        return this.handleNewSimulation(simContext, ctx);
    }

    /**
     * Extract simulation context from request
     */
    private extractSimulationContext(ctx: Record<string, unknown>): SimulationContext {
        return {
            simulationName: (ctx['simulation'] || ctx['simulation_name'] || '') as string,
            stepNumber: parseInt(String(ctx['simulation_step'] || '0'), 10) || 0,
            replayMode: ctx['replay_mode'] === true || ctx['replay'] === true
        };
    }

    /**
     * Handle replay mode - load recorded response
     * 
     * Pipeline: request.json → server-transforms-request.json → request.md → LLM → response.md → server-transforms-response.json → response.json
     */
    private async handleReplay(
        simContext: SimulationContext,
        ctx: Record<string, unknown>
    ): Promise<ProcessResult> {
        logger.info('[SimulationRequestProcessor] Replay mode', {
            simulation: simContext.simulationName,
            step: simContext.stepNumber
        });

        try {
            // Load request.json
            const requestContent = await this.loadSimulationRequest(
                simContext.simulationName,
                simContext.stepNumber
            );

            // Apply server-transforms-request.json if exists
            let requestData = requestContent ? JSON.parse(requestContent) : ctx;
            const simulationDir = path.join(this.config.simulationsBasePath, simContext.simulationName, String(simContext.stepNumber));
            
            const requestTransformResult = await runSimulationTransform(
                simulationDir,
                requestData,
                'request'
            );
            
            if (requestTransformResult.success) {
                logger.info('[SimulationRequestProcessor] Applied request transforms', {
                    simulation: simContext.simulationName,
                    step: simContext.stepNumber
                });
                requestData = requestTransformResult.output;
            }

            // Load response.md (LLM output)
            const responseContent = await this.loadSimulationResponse(
                simContext.simulationName,
                simContext.stepNumber
            );

            if (!responseContent) {
                return {
                    outcome: 'failed',
                    error: `Simulation response not found: ${simContext.simulationName}/${simContext.stepNumber}`
                } as ProcessResult;
            }

            // Apply server-transforms-response.json if exists
            let responseData = { llm: { response: responseContent } };
            const responseTransformResult = await runSimulationTransform(
                simulationDir,
                responseData,
                'response'
            );
            
            if (responseTransformResult.success) {
                logger.info('[SimulationRequestProcessor] Applied response transforms', {
                    simulation: simContext.simulationName,
                    step: simContext.stepNumber
                });
                responseData = responseTransformResult.output;
            }

            return {
                outcome: 'completed',
                message: 'Simulation replay completed',
                simulation: {
                    name: simContext.simulationName,
                    step: simContext.stepNumber,
                    mode: 'replay'
                },
                content: responseData,
                execute: {
                    message: `Replayed simulation: ${simContext.simulationName}, step ${simContext.stepNumber}`
                }
            } as ProcessResult;

        } catch (error) {
            logger.error('[SimulationRequestProcessor] Replay failed', {
                error: error instanceof Error ? error.message : String(error)
            });

            return {
                outcome: 'failed',
                error: `Replay failed: ${error instanceof Error ? error.message : String(error)}`
            } as ProcessResult;
        }
    }

    /**
     * Handle new simulation scenario
     */
    private async handleNewSimulation(
        simContext: SimulationContext,
        ctx: Record<string, unknown>
    ): Promise<ProcessResult> {
        logger.info('[SimulationRequestProcessor] New simulation scenario', {
            simulation: simContext.simulationName
        });

        const taskText = this.parseTaskText(ctx);

        // Build simulation context
        const simulationData = {
            name: simContext.simulationName,
            task: taskText,
            context: ctx,
            timestamp: new Date().toISOString()
        };

        return {
            outcome: 'completed',
            message: 'Simulation scenario initialized',
            simulation: {
                name: simContext.simulationName,
                mode: 'record',
                data: simulationData
            },
            execute: {
                message: `Started simulation: ${simContext.simulationName}`
            }
        } as ProcessResult;
    }

    /**
     * Load simulation request.json from file
     */
    private async loadSimulationRequest(simulationName: string, step: number): Promise<string | null> {
        const simulationDir = path.join(this.config.simulationsBasePath, simulationName, String(step));
        const requestPath = path.join(simulationDir, 'request.json');

        if (!existsSync(requestPath)) {
            logger.warn('[SimulationRequestProcessor] Request file not found', {requestPath});
            return null;
        }

        try {
            const content = await readFile(requestPath, 'utf8');
            logger.info('[SimulationRequestProcessor] Loaded request', {
                simulation: simulationName,
                step,
                contentLength: content.length
            });
            return content.trim();
        } catch (error) {
            logger.error('[SimulationRequestProcessor] Failed to read request', {
                requestPath,
                error: error instanceof Error ? error.message : String(error)
            });
            return null;
        }
    }

    /**
     * Load simulation response from file
     */
    private async loadSimulationResponse(simulationName: string, step: number): Promise<string | null> {
        const simulationDir = path.join(this.config.simulationsBasePath, simulationName, String(step));
        const responsePath = path.join(simulationDir, 'response.md');

        if (!existsSync(responsePath)) {
            logger.warn('[SimulationRequestProcessor] Response file not found', {responsePath});
            return null;
        }

        try {
            const content = await readFile(responsePath, 'utf8');
            logger.info('[SimulationRequestProcessor] Loaded response', {
                simulation: simulationName,
                step,
                contentLength: content.length
            });
            return content.trim();
        } catch (error) {
            logger.error('[SimulationRequestProcessor] Failed to read response', {
                responsePath,
                error: error instanceof Error ? error.message : String(error)
            });
            return null;
        }
    }

    /**
     * Load server transforms for a simulation step
     * 
     * Uses the transform pipeline module to load and optionally execute transforms
     */
    async loadSimulationTransforms(
        simulationName: string,
        step: number,
        type: 'request' | 'response'
    ): Promise<Record<string, unknown> | null> {
        const simulationDir = path.join(this.config.simulationsBasePath, simulationName, String(step));
        
        // Use the transform module's loadSimulationTransform function
        const pipeline = await loadSimulationTransform(simulationDir, type);
        
        if (!pipeline) {
            return null;
        }
        
        // Return the pipeline structure for reference
        return pipeline as unknown as Record<string, unknown>;
    }

    /**
     * Run server transforms for a simulation step
     * 
     * Applies the transform pipeline to the input data
     */
    async runSimulationTransforms(
        simulationName: string,
        step: number,
        type: 'request' | 'response',
        input: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const simulationDir = path.join(this.config.simulationsBasePath, simulationName, String(step));
        
        const result = await runSimulationTransform(simulationDir, input, type);
        
        if (!result.success) {
            logger.warn('[SimulationRequestProcessor] Transform failed', {
                simulation: simulationName,
                step,
                type,
                error: result.error
            });
            // Return input on failure
            return input;
        }
        
        return result.output;
    }

    /**
     * Get available simulations
     */
    async getAvailableSimulations(): Promise<string[]> {
        // This would list directories in the simulations base path
        // For now, return common simulation names
        return [
            'coder',
            'reviewer',
            'tester',
            'debugger'
        ];
    }

    /**
     * Validate simulation exists
     */
    async validateSimulation(simulationName: string): Promise<boolean> {
        const simulationDir = path.join(this.config.simulationsBasePath, simulationName);
        return existsSync(simulationDir);
    }
}

// Singleton instance
export const simulationRequestProcessor = new SimulationRequestProcessor();
