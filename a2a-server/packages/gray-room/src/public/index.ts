import { logger } from '@a2a/server-utils/logger';

/**
 * Stub-backed public API (explicitly stubbed).
 *
 * Gray-room internal implementation is still being migrated away from deep cross-package imports.
 * Consumers must not rely on private `src/**` paths. Use this package entry point only.
 */
export class GrayRoomOrchestrator {
  static halt(_promiseId: string): boolean {
    logger.error('[gray-room] GrayRoomOrchestrator.halt called, but gray-room package is stub-backed', {
      reason: 'import-migration-in-progress',
    });
    throw new Error('GrayRoomOrchestrator is stub-backed (import migration in progress)');
  }
}

