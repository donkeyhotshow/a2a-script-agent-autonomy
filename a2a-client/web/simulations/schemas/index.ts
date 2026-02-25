/**
 * Экспорт всех схем и типов для симуляций
 */

export * from './real-actions.js';

// Re-export из pilot схем
export {
  actionProposalSchema,
  actionExecutingStartSchema,
  actionExecutingStepSchema,
  actionExecutingDetectSchema,
  actionExecutingResolveSchema,
  actionCompleteSchema,
  simulationSchemas,
  type SimulationType,
  getSchema
} from '../pilot/schemas.js';
