/**
 * @fileoverview Основной анализатор безопасности команд
 * @author MCP Terminal Team
 * @version 2.0.0
 */

import { Subject, Observable, timer } from 'rxjs';
import { filter, debounceTime, distinctUntilChanged, share } from 'rxjs/operators';
import {
  SecurityRule,
  SecurityAnalysis,
  SecurityEvent,
  SecurityConfig,
  SecurityMetrics,
  SecuritySelfTestResult,
  MCPCommandContext,
  MCPCommandAnalysis,
  SecurityConfigSchema
} from './types';
import { Logger, StructuredLogger, createDefaultLogger, createDefaultStructuredLogger } from './SecurityLogger';
import { createDefaultRules, createOSSpecificRules, createMCPRules } from './rules';
import { SecurityMetricsAndUtils } from './SecurityMetricsAndUtils';
import { SecurityAnalysisResultManager } from './SecurityAnalysisResultManager';

/**
 * Основной класс анализатора безопасности
 */
export class SecurityAnalyzer {
  private readonly rules = new Map<string, SecurityRule>();
  private readonly config: SecurityConfig;
  private readonly logger: Logger;
  private readonly structuredLogger: StructuredLogger;
  private readonly metrics: SecurityMetrics;
  private readonly securityEvents$ = new Subject<SecurityEvent>();
  private readonly commandStream$ = new Subject<string>();
  private readonly analysisResultManager: SecurityAnalysisResultManager;

  constructor(
    config: Partial<SecurityConfig> = {},
    logger?: Logger,
    structuredLogger?: StructuredLogger
  ) {
    // Валидация конфигурации
    this.config = SecurityConfigSchema.parse({
      enabled: true,
      maxCommandLength: 10000,
      sandboxMode: false,
      strictMode: false,
      allowlist: [],
      blocklist: [],
      customRules: [],
      logging: {
        enabled: true,
        level: 'info',
        includeMetadata: true
      },
      monitoring: {
        enabled: true,
        alertThreshold: 10,
        autoBlock: false
      },
      ...config
    });

    this.logger = logger || createDefaultLogger();
    this.structuredLogger = structuredLogger || createDefaultStructuredLogger();
    this.metrics = SecurityMetricsAndUtils.initializeMetrics();
    this.analysisResultManager = new SecurityAnalysisResultManager(this.securityEvents$, this.config, this.structuredLogger, this.metrics, this.logger);
    
    this.initializeRules();
    this.setupMonitoring();
  }

  /**
   * Анализирует команду на безопасность
   */
  async analyze(command: string, context?: MCPCommandContext): Promise<SecurityAnalysis> {
    const startTime = Date.now();
    
    try {
      // Базовая валидация
      if (!command || command.trim().length === 0) {
        return this.analysisResultManager.createAnalysisResult(false, 'Пустая команда', 'medium', [
          'Укажите команду для выполнения'
        ], startTime);
      }

      // Проверка длины команды
      if (command.length > this.config.maxCommandLength) {
        return this.analysisResultManager.createAnalysisResult(false,
          `Команда превышает максимальную длину ${this.config.maxCommandLength} символов`,
          'medium',
          ['Уменьшите длину команды или разделите на несколько команд'],
          startTime
        );
      }

      // Проверка белого списка
      if (this.config.allowlist.length > 0) {
        const isAllowed = this.config.allowlist.some(allowed => 
          command.toLowerCase().startsWith(allowed.toLowerCase())
        );
        if (isAllowed) {
          return this.analysisResultManager.createAnalysisResult(true, 'Команда в белом списке', 'low', [], startTime);
        }
      }

      // Проверка черного списка
      if (this.config.blocklist.length > 0) {
        const isBlocked = this.config.blocklist.some(blocked => 
          command.toLowerCase().includes(blocked.toLowerCase())
        );
        if (isBlocked) {
          return this.analysisResultManager.createAnalysisResult(false, 'Команда в черном списке', 'high', [
            'Используйте альтернативную команду'
          ], startTime);
        }
      }

      // Проверка правил
      const failedRules: SecurityRule[] = [];
      const allSuggestions: string[] = [];

      for (const rule of this.rules.values()) {
        if (rule.test(command)) {
          failedRules.push(rule);
          allSuggestions.push(...rule.getSuggestions(command));
        }
      }

      // Определение результата
      if (failedRules.length === 0) {
        const analysis = this.analysisResultManager.createAnalysisResult(true, 'Команда прошла все проверки безопасности', 'low', [], startTime);
        
        this.analysisResultManager.logSecurityEvent({
          event: 'command_analyzed',
          command,
          severity: 'low',
          blocked: false,
          reason: 'Команда прошла анализ безопасности'
        });

        return analysis;
      }

      // Поиск наивысшей критичности
      const codeExecRule = failedRules.find(r => r.name === 'code_execution');
      let highestSeverity = this.analysisResultManager.getHighestSeverity(failedRules);
      let primaryRule = failedRules.find(r => r.severity === highestSeverity)!;
      
      if (codeExecRule) {
        highestSeverity = 'high';
        primaryRule = codeExecRule;
      }

      const analysis = this.analysisResultManager.createAnalysisResult(
        false,
        `Команда заблокирована правилом безопасности: ${primaryRule.description}`,
        highestSeverity,
        [...new Set(allSuggestions)],
        startTime,
        {
          failedRules: failedRules.map(r => r.name),
          primaryRule: primaryRule.name
        }
      );

      this.analysisResultManager.logSecurityEvent({
        event: 'command_blocked',
        command,
        severity: highestSeverity,
        blocked: true,
        reason: primaryRule.description
      });

      return analysis;

    } catch (error) {
      this.structuredLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        { command, operation: 'security_analysis' }
      );

      throw new Error(`Ошибка анализа безопасности: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Быстрая проверка разрешения команды
   */
  async isAllowed(command: string): Promise<boolean> {
    const analysis = await this.analyze(command);
    return analysis.allowed;
  }

  /**
   * Анализ MCP команды с контекстом
   */
  async analyzeMCPCommand(
    command: string, 
    context: MCPCommandContext
  ): Promise<MCPCommandAnalysis> {
    const baseAnalysis = await this.analyze(command);
    
    return {
      ...baseAnalysis,
      context,
      mcpSpecific: {
        sessionId: context.sessionId,
        commandType: SecurityMetricsAndUtils.detectMCPCommandType(command),
        toolName: SecurityMetricsAndUtils.extractMCPToolName(command),
        resourceName: SecurityMetricsAndUtils.extractMCPResourceName(command)
      }
    };
  }

  /**
   * Добавляет правило безопасности
   */
  addRule(rule: SecurityRule): void {
    if (!rule.validate()) {
      throw new Error(`Некорректное правило безопасности: ${rule.name}`);
    }

    this.rules.set(rule.name, rule);
    this.logger.info('Правило безопасности добавлено', { 
      name: rule.name, 
      severity: rule.severity,
      category: rule.category 
    });
  }

  /**
   * Удаляет правило безопасности
   */
  removeRule(name: string): void {
    const removed = this.rules.delete(name);
    if (removed) {
      this.logger.info('Правило безопасности удалено', { name });
    }
  }

  /**
   * Получает все правила
   */
  getRules(): SecurityRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Получает правила по категории
   */
  getRulesByCategory(category: string): SecurityRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.category === category);
  }

  /**
   * Получает метрики безопасности
   */
  getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  /**
   * Получает поток событий безопасности
   */
  getSecurityEvents(): Observable<SecurityEvent> {
    return this.securityEvents$.asObservable().pipe(share());
  }

  /**
   * Получает поток команд
   */
  getCommandStream(): Observable<string> {
    return this.commandStream$.asObservable().pipe(share());
  }

  /**
   * Выполняет самопроверку системы безопасности
   */
  async selfTest(): Promise<SecuritySelfTestResult> {
    const testCases = [
      // Критические команды - должны быть заблокированы
      { command: 'format X:', expectedBlocked: true, description: 'Форматирование диска', category: 'critical' },
      { command: 'rm -rf /', expectedBlocked: true, description: 'Удаление корневой директории', category: 'critical' },
      { command: 'shutdown /s /t 0', expectedBlocked: true, description: 'Выключение системы', category: 'critical' },
      
      // Безопасные команды - должны быть разрешены
      { command: 'echo "test"', expectedBlocked: false, description: 'Безопасная команда echo', category: 'safe' },
      { command: 'dir', expectedBlocked: false, description: 'Безопасная команда dir', category: 'safe' },
      { command: 'node --version', expectedBlocked: false, description: 'Безопасная команда node', category: 'safe' },
      
      // Запрещенные команды - должны быть заблокированы
      { command: 'read variable', expectedBlocked: true, description: 'Интерактивная команда', category: 'forbidden' },
      { command: 'ssh user@host', expectedBlocked: true, description: 'Сетевая команда', category: 'forbidden' },
      
      // Граничные случаи
      { command: '', expectedBlocked: true, description: 'Пустая команда', category: 'edge' },
      { command: '   ', expectedBlocked: true, description: 'Команда с пробелами', category: 'edge' }
    ];

    const results: SecuritySelfTestResult = {
      passed: 0,
      failed: 0,
      total: testCases.length,
      details: [],
      criticalIssues: [],
      overallStatus: 'unknown'
    };

    for (const testCase of testCases) {
      try {
        const analysis = await this.analyze(testCase.command);
        const isBlocked = !analysis.allowed;
        const testPassed = isBlocked === testCase.expectedBlocked;

        if (testPassed) {
          results.passed++;
        } else {
          results.failed++;
          
          const issue = {
            test: testCase.description,
            command: testCase.command,
            expected: testCase.expectedBlocked ? 'blocked' : 'allowed',
            actual: isBlocked ? 'blocked' : 'allowed',
            reason: analysis.reason,
            category: testCase.category
          };

          results.details.push(issue);
          
          if (testCase.category === 'critical') {
            results.criticalIssues.push(issue);
          }
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          test: testCase.description,
          command: testCase.command,
          expected: testCase.expectedBlocked ? 'blocked' : 'allowed',
          actual: 'error',
          reason: error instanceof Error ? error.message : String(error),
          category: testCase.category
        });
      }
    }

    // Определение общего статуса
    if (results.failed === 0) {
      results.overallStatus = 'passed';
    } else if (results.criticalIssues.length > 0) {
      results.overallStatus = 'critical_failure';
    } else {
      results.overallStatus = 'partial_failure';
    }

    this.analysisResultManager.logSecurityEvent({
      event: 'self_test_completed',
      command: 'self_test',
      severity: results.criticalIssues.length > 0 ? 'high' : 'low',
      blocked: false,
      reason: `Самопроверка завершена: ${results.overallStatus}`,
      context: {
        passed: results.passed,
        failed: results.failed,
        total: results.total,
        criticalIssues: results.criticalIssues.length
      }
    });

    return results;
  }

  /**
   * Быстрая проверка критических паттернов
   */
  quickCriticalTest(): boolean {
    const criticalTests = [
      { command: 'format X:', shouldBlock: true },
      { command: 'rm -rf /', shouldBlock: true },
      { command: 'echo test', shouldBlock: false }
    ];

    for (const test of criticalTests) {
      const analysis = this.analyzeSync(test.command);
      const isBlocked = !analysis.allowed;
      
      if (isBlocked !== test.shouldBlock) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Синхронная версия анализа (для быстрых проверок)
   */
  private analyzeSync(command: string): SecurityAnalysis {
    // Упрощенная синхронная версия для быстрых тестов
    if (!command || command.trim().length === 0) {
      return {
        allowed: false,
        reason: 'Пустая команда',
        riskLevel: 'medium',
        suggestions: ['Укажите команду для выполнения']
      };
    }

    // Проверка критических паттернов
    const criticalPatterns = [
      /\b(rm\s+-rf?\s+\/|del\s+\/s\s+c:\\)/i,
      /\b(format\s+[a-z]:|mkfs\s+\/dev\/)/i,
      /\b(shutdown|reboot|restart)\b/i
    ];

    for (const pattern of criticalPatterns) {
      if (pattern.test(command)) {
        return {
          allowed: false,
          reason: 'Критическая команда заблокирована',
          riskLevel: 'critical',
          suggestions: ['Используйте безопасные альтернативы']
        };
      }
    }

    return {
      allowed: true,
      reason: 'Команда разрешена',
      riskLevel: 'low',
      suggestions: []
    };
  }

  /**
   * Инициализация правил по умолчанию
   */
  private initializeRules(): void {
    // Добавляем стандартные правила
    const defaultRules = createDefaultRules();
    const osRules = createOSSpecificRules();
    const mcpRules = createMCPRules();

    [...defaultRules, ...osRules, ...mcpRules].forEach(rule => {
      this.addRule(rule);
    });

    // Добавляем пользовательские правила
    this.config.customRules.forEach(rule => {
      this.addRule(rule);
    });

    this.logger.info('Правила безопасности инициализированы', { 
      total: this.rules.size,
      default: defaultRules.length,
      os: osRules.length,
      mcp: mcpRules.length,
      custom: this.config.customRules.length
    });
  }

  /**
   * Настройка мониторинга
   */
  private setupMonitoring(): void {
    if (!this.config.monitoring.enabled) {
      return;
    }

    // Мониторинг событий безопасности
    this.securityEvents$.pipe(
      filter(event => event.severity === 'critical' || event.severity === 'high'),
      debounceTime(1000),
      distinctUntilChanged()
    ).subscribe(event => {
      this.analysisResultManager.updateMetrics(event);
      
      if (this.config.monitoring.autoBlock && event.severity === 'critical') {
        this.logger.warn('Автоматическая блокировка активирована', {
          event: event.event,
          command: event.command,
          reason: event.reason
        });
      }
    });

    // Периодическое обновление метрик
    timer(60000, 60000).subscribe(() => {
      this.metrics.lastUpdated = Date.now();
    });
  }
}
