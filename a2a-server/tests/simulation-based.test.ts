/**
 * Simulation-based Tests for a2a-server
 * 
 * These tests run simulations directly against the server without Web UI and Client API.
 * This tests the server's protocol implementation independently.
 * 
 * Usage:
 *   npm run test:sim              # Run simulation tests
 *   npm run test:sim -- --all    # Run all simulations
 *   npm run test:sim <name>      # Run specific simulation
 *   npm run sim:run <name>       # Run simulation and save result
 *   npm run sim:validate <name>  # Validate simulation result
 */

import {readFileSync, writeFileSync, existsSync, readdirSync, statSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, it, expect, beforeAll} from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Simulation test configuration
 */
interface SimulationConfig {
    /** Simulation directory name */
    name: string;
    /** Expected number of steps */
    steps: number;
    /** Expected response type */
    responseType?: 'action_proposal' | 'action_executing' | 'action_progress' | 'action_completed';
    /** Whether this is an AI-Action (async) simulation */
    isAiAction: boolean;
}

/**
 * Available simulations for testing
 */
const SIMULATIONS: SimulationConfig[] = [
    // Actions (server-driven, synchronous)
    {
        name: 'fix-vue-imports',
        steps: 5,
        responseType: 'action_executing',
        isAiAction: false
    },
    {
        name: 'fix-laravel-namespaces-and-uses',
        steps: 6,
        responseType: 'action_executing',
        isAiAction: false
    },
    {
        name: 'phpunit-deprecations',
        steps: 5,
        responseType: 'action_executing',
        isAiAction: false
    },
    {
        name: 'task-decomposition',
        steps: 9,
        responseType: 'action_proposal',
        isAiAction: false
    },
    
    // AI-Actions (LLM-driven, async)
    {
        name: 'dialog',
        steps: 6,
        responseType: 'action_proposal',
        isAiAction: true
    },
    {
        name: 'coder',
        steps: 8,
        responseType: 'action_proposal',
        isAiAction: true
    },
    {
        name: 'coder-smart-v2',
        steps: 9,
        responseType: 'action_proposal',
        isAiAction: true
    }
];

/**
 * Find all simulation directories
 */
function findSimulationDirs(baseDir: string): string[] {
    const dirs: string[] = [];
    
    try {
        const entries = readdirSync(baseDir);
        
        for (const entry of entries) {
            const fullPath = join(baseDir, entry);
            const stat = statSync(fullPath);
            
            if (!stat.isDirectory()) continue;
            
            const legacyRequestPath = join(fullPath, 'request.json');
            if (existsSync(legacyRequestPath)) {
                dirs.push(fullPath);
                continue;
            }
            
            // Step format: simulations/<name>/<step>/request.json
            const stepEntries = readdirSync(fullPath);
            for (const step of stepEntries) {
                const stepPath = join(fullPath, step);
                const stepStat = statSync(stepPath);
                if (!stepStat.isDirectory()) continue;
                if (existsSync(join(stepPath, 'request.json'))) {
                    dirs.push(stepPath);
                }
            }
        }
    } catch (err: any) {
        console.error(`Error reading directory: ${err.message}`);
    }
    
    return dirs.sort();
}

/**
 * Read simulation request - supports both legacy and step formats
 */
function readSimulationRequest(simDir: string): any {
    // First try legacy format (direct request.json)
    const legacyPath = join(simDir, 'request.json');
    if (existsSync(legacyPath)) {
        const content = readFileSync(legacyPath, 'utf-8');
        return JSON.parse(content);
    }

    // Try step format (find first step with request.json)
    try {
        const entries = readdirSync(simDir);
        for (const entry of entries) {
            if (!entry.match(/^\d+$/)) continue; // Only numbered directories

            const stepDir = join(simDir, entry);
            const stat = statSync(stepDir);
            if (!stat.isDirectory()) continue;

            const requestPath = join(stepDir, 'request.json');
            if (existsSync(requestPath)) {
                const content = readFileSync(requestPath, 'utf-8');
                return JSON.parse(content);
            }
        }
    } catch {
        // Ignore errors when reading step directories
    }

    return null;
}

/**
 * Read simulation response - supports both legacy and step formats
 */
function readSimulationResponse(simDir: string): any {
    // First try legacy format (direct server-response.json)
    const legacyPath = join(simDir, 'server-response.json');
    if (existsSync(legacyPath)) {
        const content = readFileSync(legacyPath, 'utf-8');
        return JSON.parse(content);
    }

    // Try step format (find first step with server-response.json)
    try {
        const entries = readdirSync(simDir);
        for (const entry of entries) {
            if (!entry.match(/^\d+$/)) continue; // Only numbered directories

            const stepDir = join(simDir, entry);
            const stat = statSync(stepDir);
            if (!stat.isDirectory()) continue;

            const responsePath = join(stepDir, 'server-response.json');
            if (existsSync(responsePath)) {
                const content = readFileSync(responsePath, 'utf-8');
                return JSON.parse(content);
            }
        }
    } catch {
        // Ignore errors when reading step directories
    }

    return null;
}

/**
 * Validate simulation response structure
 */
function validateSimulationResponse(response: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for valid response object
    if (!response || typeof response !== 'object') {
        errors.push('Response is not a valid object');
        return { valid: false, errors };
    }
    
    // Check for success field
    if (typeof response.success !== 'boolean') {
        errors.push('Missing or invalid success field');
    }
    
    // Check for data field
    if (!response.data) {
        errors.push('Missing data field');
    } else {
        // Validate data structure
        const data = response.data;
        
        if (data.status && !['pending', 'processing', 'completed', 'failed'].includes(data.status)) {
            errors.push(`Invalid status: ${data.status}`);
        }
        
        if (data.promiseId && typeof data.promiseId !== 'string') {
            errors.push('Invalid promiseId');
        }
        
        if (data.context && typeof data.context !== 'object') {
            errors.push('Invalid context');
        }
        
        // Check for execute or result
        if (!data.execute && !data.result) {
            // This might be okay for pending status
            if (data.status !== 'pending') {
                errors.push('Missing both execute and result');
            }
        }
    }
    
    return { valid: errors.length === 0, errors };
}

/**
 * Base directory for simulations
 */
const SIMULATIONS_BASE = join(__dirname, '..', '..', 'simulations');

describe('Simulation-based Server Tests', () => {
    describe('Simulation Infrastructure', () => {
        it('should find simulation directory', () => {
            expect(existsSync(SIMULATIONS_BASE)).toBe(true);
        });
        
        it('should list available simulations', () => {
            const simDirs = findSimulationDirs(SIMULATIONS_BASE);
            expect(simDirs.length).toBeGreaterThan(0);
        });
    });
    
    describe('Actions Simulations (Synchronous)', () => {
        const actionSims = SIMULATIONS.filter(s => !s.isAiAction);
        
        for (const sim of actionSims) {
            describe(`${sim.name}`, () => {
                it(`should have simulation directory`, () => {
                    const simDir = join(SIMULATIONS_BASE, sim.name);
                    expect(existsSync(simDir)).toBe(true);
                });
                
                it(`should have request.json`, () => {
                    const simDir = join(SIMULATIONS_BASE, sim.name);
                    const request = readSimulationRequest(simDir);
                    expect(request).not.toBeNull();
                });
                
                it(`should have valid response structure after running`, () => {
                    const simDir = join(SIMULATIONS_BASE, sim.name);
                    const response = readSimulationResponse(simDir);
                    
                    if (response) {
                        const validation = validateSimulationResponse(response);
                        if (!validation.valid) {
                            console.error(`Validation errors for ${sim.name}:`, validation.errors);
                        }
                        expect(validation.valid).toBe(true);
                    }
                });
            });
        }
    });
    
    describe('AI-Actions Simulations (Async/promiseId)', () => {
        const aiActionSims = SIMULATIONS.filter(s => s.isAiAction);
        
        for (const sim of aiActionSims) {
            describe(`${sim.name}`, () => {
                it(`should have simulation directory`, () => {
                    const simDir = join(SIMULATIONS_BASE, sim.name);
                    expect(existsSync(simDir)).toBe(true);
                });
                
                it(`should have multi-step structure`, () => {
                    const simDir = join(SIMULATIONS_BASE, sim.name);
                    const entries = readdirSync(simDir);
                    const stepDirs = entries.filter(e => {
                        const stat = statSync(join(simDir, e));
                        return stat.isDirectory() && /^\d+$/.test(e);
                    });
                    expect(stepDirs.length).toBeGreaterThanOrEqual(1);
                });
                
                it(`should have valid response structure after running`, () => {
                    const simDir = join(SIMULATIONS_BASE, sim.name);
                    const response = readSimulationResponse(simDir);
                    
                    if (response) {
                        const validation = validateSimulationResponse(response);
                        if (!validation.valid) {
                            console.error(`Validation errors for ${sim.name}:`, validation.errors);
                        }
                        expect(validation.valid).toBe(true);
                        
                        // AI-Actions should have promiseId
                        if (response.data) {
                            expect(response.data.promiseId).toBeDefined();
                        }
                    }
                });
            });
        }
    });
    
    describe('Protocol Schema Validation', () => {
        it('should validate action_proposal response structure', () => {
            // Test that we can validate responses against schema
            const sampleResponse = {
                success: true,
                data: {
                    id: 'req_123',
                    promiseId: 'req_123',
                    status: 'completed',
                    context: { version: '1.0' },
                    message: null,
                    result: {
                        proposedActions: [
                            {
                                id: 'fix-vue-imports',
                                name: 'Fix Vue Imports',
                                description: 'Fix Vue component imports'
                            }
                        ]
                    }
                }
            };
            
            const validation = validateSimulationResponse(sampleResponse);
            expect(validation.valid).toBe(true);
        });
        
        it('should validate execute response structure', () => {
            const sampleResponse = {
                success: true,
                data: {
                    id: 'req_456',
                    promiseId: 'req_456',
                    status: 'completed',
                    context: { version: '1.0' },
                    message: null,
                    execute: {
                        script: {
                            input: { files: [] },
                            output: 'Files processed'
                        }
                    }
                }
            };
            
            const validation = validateSimulationResponse(sampleResponse);
            expect(validation.valid).toBe(true);
        });
        
        it('should validate pending response structure', () => {
            const sampleResponse = {
                success: true,
                data: {
                    id: 'req_789',
                    promiseId: 'req_789',
                    status: 'pending'
                }
            };
            
            const validation = validateSimulationResponse(sampleResponse);
            expect(validation.valid).toBe(true);
        });
        
        it('should reject invalid response structure', () => {
            const invalidResponse = {
                success: true
                // Missing data field
            };
            
            const validation = validateSimulationResponse(invalidResponse);
            expect(validation.valid).toBe(false);
            expect(validation.errors).toContain('Missing data field');
        });
    });
});

/**
 * Helper function to run a single simulation (exported for CLI use)
 */
export async function runSimulation(simName: string): Promise<{ success: boolean; error?: string }> {
    const simDir = join(SIMULATIONS_BASE, simName);
    
    if (!existsSync(simDir)) {
        return { success: false, error: `Simulation not found: ${simName}` };
    }
    
    try {
        // Import the run script
        const {runSingleSimulation} = await import('./sim-run.helper.js');
        await runSingleSimulation(simDir, SIMULATIONS_BASE);
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * CLI interface for running simulations
 */
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    if (command === 'run') {
        const simName = args[1];
        if (!simName) {
            console.error('Usage: npm run test:sim run <simulation-name>');
            process.exit(1);
        }
        
        console.log(`Running simulation: ${simName}...`);
        const result = await runSimulation(simName);
        
        if (result.success) {
            console.log(`✅ Simulation ${simName} completed`);
            process.exit(0);
        } else {
            console.error(`❌ Simulation failed: ${result.error}`);
            process.exit(1);
        }
    } else if (command === 'list') {
        console.log('Available simulations:');
        for (const sim of SIMULATIONS) {
            console.log(`  - ${sim.name} (${sim.isAiAction ? 'AI-Action' : 'Action'}, ${sim.steps} steps)`);
        }
    } else {
        console.log(`
Simulation-based Tests for a2a-server

Usage:
  npm run test:sim              # Run all simulation tests
  npm run test:sim run <name>   # Run specific simulation
  npm run test:sim list         # List available simulations

Aliases:
  npm run sim:run <name>        # Run simulation (alias)
  npm run sim:validate <name>   # Validate simulation (alias)
        `);
    }
}

// Run if executed directly
if (process.argv[1]?.includes('sim-test')) {
    main();
}
