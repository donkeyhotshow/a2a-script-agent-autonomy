import { Worker } from 'worker_threads';
import { logger } from "@a2a/server-utils/logger"';
import path from 'path';

/**
 * A2A Thread Manager (ADR-0074)
 * Manages background worker threads for CPU-intensive tasks.
 */
export class ThreadManager {
  private static instance: ThreadManager;
  private activeWorkers = new Map<string, Worker>();

  private constructor() {}

  static getInstance(): ThreadManager {
    if (!ThreadManager.instance) {
      ThreadManager.instance = new ThreadManager();
    }
    return ThreadManager.instance;
  }

  /**
   * Spawn a new background worker.
   */
  spawnWorker(id: string, scriptPath: string, workerData: any): Promise<any> {
    return new Promise((resolve, reject) => {
      logger.info('[ThreadManager] Spawning worker', { id, scriptPath });
      
      const worker = new Worker(scriptPath, { workerData });
      this.activeWorkers.set(id, worker);

      worker.on('message', (result) => {
        logger.info('[ThreadManager] Worker message received', { id });
        resolve(result);
      });

      worker.on('error', (err) => {
        logger.error('[ThreadManager] Worker error', { id, error: err.message });
        this.activeWorkers.delete(id);
        reject(err);
      });

      worker.on('exit', (code) => {
        this.activeWorkers.delete(id);
        if (code !== 0) {
          logger.warn('[ThreadManager] Worker exited with code', { id, code });
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }

  /**
   * Terminate an active worker.
   */
  async terminateWorker(id: string): Promise<void> {
    const worker = this.activeWorkers.get(id);
    if (worker) {
      logger.info('[ThreadManager] Terminating worker', { id });
      await worker.terminate();
      this.activeWorkers.delete(id);
    }
  }

  /**
   * List active workers.
   */
  listWorkers(): string[] {
    return Array.from(this.activeWorkers.keys());
  }
}

export const globalThreadManager = ThreadManager.getInstance();
