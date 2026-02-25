import { SecurityAnalysis, SecurityEvent, SecurityRule, SecurityMetrics } from './types';
import { StructuredLogger, Logger, createDefaultLogger, createDefaultStructuredLogger } from './SecurityLogger';
import { Subject } from 'rxjs';

export class SecurityAnalysisResultManager {
  private readonly securityEvents$: Subject<SecurityEvent>;
  private readonly config: any; // Simplified config type for this module
  private readonly structuredLogger: StructuredLogger;
  private readonly metrics: SecurityMetrics;
  private readonly logger: Logger;

  constructor(securityEvents$: Subject<SecurityEvent>, config: any, structuredLogger: StructuredLogger, metrics: SecurityMetrics, logger: Logger) {
    this.securityEvents$ = securityEvents$;
    this.config = config;
    this.structuredLogger = structuredLogger;
    this.metrics = metrics;
    this.logger = logger;
  }

  /**
   * Создание результата анализа
   */
  public createAnalysisResult(
    allowed: boolean,
    reason: string,
    riskLevel: SecurityAnalysis['riskLevel'],
    suggestions: string[],
    startTime: number,
    additionalMetadata?: Record<string, unknown>
  ): SecurityAnalysis {
    const duration = Date.now() - startTime;
    
    return {
      allowed,
      reason,
      riskLevel,
      suggestions,
      metadata: {
        duration,
        // rulesChecked: this.rules.size, // This depends on SecurityAnalyzer rules, so remove for now
        timestamp: Date.now(),
        ...additionalMetadata
      }
    };
  }

  /**
   * Получение наивысшей критичности из правил
   */
  public getHighestSeverity(rules: SecurityRule[]): SecurityAnalysis['riskLevel'] {
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    let highest = 'low';

    for (const rule of rules) {
      if (severityOrder.indexOf(rule.severity) > severityOrder.indexOf(highest)) {
        highest = rule.severity;
      }
    }

    return highest as SecurityAnalysis['riskLevel'];
  }

  /**
   * Логирование события безопасности
   */
  public logSecurityEvent(event: SecurityEvent): void {
    this.securityEvents$.next(event);
    
    if (this.config.logging.enabled) {
      this.structuredLogger.logSecurity(event);
    }
  }

  /**
   * Обновление метрик
   */
  public updateMetrics(event: SecurityEvent): void {
    this.metrics.totalCommands++;
    
    if (event.blocked) {
      this.metrics.blockedCommands++;
      
      switch (event.severity) {
        case 'critical':
          this.metrics.criticalViolations++;
          break;
        case 'high':
          this.metrics.highViolations++;
          break;
        case 'medium':
          this.metrics.mediumViolations++;
          break;
        case 'low':
          this.metrics.lowViolations++;
          break;
      }
    } else {
      this.metrics.allowedCommands++;
    }

    this.metrics.lastUpdated = Date.now();
  }
}
