/**
 * @fileoverview Основной экспорт библиотеки core-security-analyzer
 * @author MCP Terminal Team
 * @version 2.0.0
 */

// Основные классы
export { SecurityAnalyzer } from './security-analyzer';
export { MCPSecurityMask } from './mcp-security-mask';

// Правила безопасности
export { 
  PatternSecurityRule, 
  FunctionSecurityRule,
  createDefaultRules,
  createOSSpecificRules,
  createMCPRules
} from './rules';

// Типы и интерфейсы
export type {
  SecurityRule,
  SecurityAnalysis,
  SecurityEvent,
  SecurityConfig,
  SecurityMetrics,
  SecuritySelfTestResult,
  MCPCommandContext,
  MCPCommandAnalysis,
  SecuritySeverity,
  SecurityRiskLevel,
  SecurityEventType
} from './types';

// Схемы валидации
export {
  SecurityRuleSchema,
  SecurityAnalysisSchema,
  SecurityEventSchema,
  SecurityConfigSchema
} from './types';

// Legacy функции для обратной совместимости
export {
  analyzeCommand,
  getOsCriticalPatterns,
  getSuggestions,
  selfTest,
  quickCriticalTest
} from './mcp-security-mask';

// Интерфейсы логгеров
export type { Logger, StructuredLogger } from './security-analyzer';

// Версия библиотеки
export const VERSION = '2.0.0';
