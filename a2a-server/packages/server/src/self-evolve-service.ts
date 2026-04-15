import { logger } from '@a2a/server-utils/logger';
import { globalThreadManager } from './thread-manager.js';
import { globalMcpRegistry } from '../mcp/registry.js';

/**
 * A2A Self-Evolve Service (ADR-0077)
 * Implements an autonomous background loop for agent self-improvement.
 */
export class SelfEvolveService {
  private static instance: SelfEvolveService;
  private isRunning = false;

  private constructor() {}

  static getInstance(): SelfEvolveService {
    if (!SelfEvolveService.instance) {
      SelfEvolveService.instance = new SelfEvolveService();
    }
    return SelfEvolveService.instance;
  }

  /**
   * Start the self-evolution loop.
   */
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('[SelfEvolve] Autonomous loop started');
    
    // Background execution without await
    this.run().catch((err: unknown) => {
      logger.error('[SelfEvolve] Loop crashed', {
        error: err instanceof Error ? err.message : String(err),
      });
      this.isRunning = false;
    });
  }

  private async run() {
    while (this.isRunning) {
      try {
        logger.info('[SelfEvolve] Scanning for optimization opportunities...');
        
        // 1. Analyze tool usage (ADR-0075 connection)
        const tools = globalMcpRegistry.listTools();
        logger.info('[SelfEvolve] Analyzing active tools', { count: tools.length });

        // 2. Spawn a background worker to analyze performance (ADR-0074)
        // Note: In real implementation, this would point to an actual analysis script.
        /*
        await globalThreadManager.spawnWorker('evolve-analyzer', './workers/performance-analyzer.js', {
          tools: tools.map(t => t.name)
        });
        */

        // 3. Simulated cooldown (e.g. 1 hour in production, 1 min for demo)
        await new Promise(r => setTimeout(r, 60000));
        
      } catch (err) {
        logger.error('[SelfEvolve] Iteration failed', { error: err.message });
        await new Promise(r => setTimeout(r, 5000)); // Short cooldown on error
      }
    }
  }

  stop() {
    this.isRunning = false;
    logger.info('[SelfEvolve] Autonomous loop stopped');
  }
}

export const globalSelfEvolveService = SelfEvolveService.getInstance();
