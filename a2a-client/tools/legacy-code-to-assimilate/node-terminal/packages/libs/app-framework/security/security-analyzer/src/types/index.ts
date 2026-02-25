/**
 * @fileoverview Типы для анализатора безопасности команд
 * @author MCP Terminal Team
 * @version 2.0.0
 */

import { z } from 'zod';

// ===========================================
// Базовые типы безопасности
// ===========================================

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export type SecurityRiskLevel = 'safe' | 'warning' | 'dangerous' | 'blocked';

export type SecurityEventType = 
  | 'command_analyzed'
  | 'command_blocked'
  | 'rule_violation'
  | 'security_alert'
  | 'self_test_completed';

// ===========================================
// Схемы валидации Zod
// ===========================================

export const SecurityRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  patterns: z.array(z.instanceof(RegExp)).min(1),
  suggestions: z.array(z.string()).min(1),
  enabled: z.boolean().default(true),
  category: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const SecurityAnalysisSchema = z.object({
  allowed: z.boolean(),
  reason: z.string(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  suggestions: z.array(z.string()),
  metadata: z.object({
    duration: z.number(),
    rulesChecked: z.number(),
    failedRules: z.array(z.string()).optional(),
    primaryRule: z.string().optional(),
    commandHash: z.string().optional(),
    timestamp: z.number().optional()
  }).optional()
});

export const SecurityEventSchema = z.object({
  event: z.enum(['command_analyzed', 'command_blocked', 'rule_violation', 'security_alert', 'self_test_completed']),
  command: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  blocked: z.boolean(),
  reason: z.string(),
  timestamp: z.number().optional(),
  context: z.record(z.unknown()).optional()
});

export const SecurityConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxCommandLength: z.number().min(1).default(10000),
  sandboxMode: z.boolean().default(false),
  strictMode: z.boolean().default(false),
  allowlist: z.array(z.string()).default([]),
  blocklist: z.array(z.string()).default([]),
  customRules: z.array(SecurityRuleSchema).default([]),
  logging: z.object({
    enabled: z.boolean().default(true),
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    includeMetadata: z.boolean().default(true)
  }).default({}),
  monitoring: z.object({
    enabled: z.boolean().default(true),
    alertThreshold: z.number().min(0).max(100).default(10),
    autoBlock: z.boolean().default(false)
  }).default({})
});

// ===========================================
// Интерфейсы
// ===========================================

export interface SecurityRule {
  readonly name: string;
  readonly description: string;
  readonly severity: SecuritySeverity;
  readonly patterns: RegExp[];
  readonly suggestions: string[];
  readonly enabled: boolean;
  readonly category?: string;
  readonly metadata?: Record<string, unknown>;
  
  test(command: string): boolean;
  getSuggestions(command: string): string[];
}

export interface SecurityAnalysis {
  allowed: boolean;
  reason: string;
  riskLevel: SecuritySeverity;
  suggestions: string[];
  metadata?: {
    duration: number;
    rulesChecked: number;
    failedRules?: string[];
    primaryRule?: string;
    commandHash?: string;
    timestamp?: number;
  };
}

export interface SecurityEvent {
  event: SecurityEventType;
  command: string;
  severity: SecuritySeverity;
  blocked: boolean;
  reason: string;
  timestamp?: number;
  context?: Record<string, unknown>;
}

export interface SecurityConfig {
  enabled: boolean;
  maxCommandLength: number;
  sandboxMode: boolean;
  strictMode: boolean;
  allowlist: string[];
  blocklist: string[];
  customRules: SecurityRule[];
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    includeMetadata: boolean;
  };
  monitoring: {
    enabled: boolean;
    alertThreshold: number;
    autoBlock: boolean;
  };
}

export interface SecurityMetrics {
  totalCommands: number;
  blockedCommands: number;
  allowedCommands: number;
  criticalViolations: number;
  highViolations: number;
  mediumViolations: number;
  lowViolations: number;
  averageAnalysisTime: number;
  lastUpdated: number;
}

export interface SecuritySelfTestResult {
  passed: number;
  failed: number;
  total: number;
  details: Array<{
    test: string;
    command: string;
    expected: 'blocked' | 'allowed';
    actual: 'blocked' | 'allowed';
    reason?: string;
    category: string;
  }>;
  criticalIssues: Array<{
    test: string;
    command: string;
    expected: 'blocked' | 'allowed';
    actual: 'blocked' | 'allowed';
    reason?: string;
    category: string;
  }>;
  overallStatus: 'passed' | 'partial_failure' | 'critical_failure';
}

// ===========================================
// Типы для MCP интеграции
// ===========================================

export interface MCPCommandContext {
  sessionId: string;
  userId?: string;
  workspace?: string;
  environment: 'development' | 'staging' | 'production';
  permissions: string[];
  metadata?: Record<string, unknown>;
}

export interface MCPCommandAnalysis extends SecurityAnalysis {
  context: MCPCommandContext;
  mcpSpecific: {
    sessionId: string;
    commandType: 'tool' | 'resource' | 'notification';
    toolName?: string;
    resourceName?: string;
  };
}

// ===========================================
// Экспорт типов
// ===========================================

export type {
  SecurityRule,
  SecurityAnalysis,
  SecurityEvent,
  SecurityConfig,
  SecurityMetrics,
  SecuritySelfTestResult,
  MCPCommandContext,
  MCPCommandAnalysis
};
