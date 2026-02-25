import { SecurityMetrics } from './types';

export class SecurityMetricsAndUtils {

  /**
   * Определение типа MCP команды
   */
  public static detectMCPCommandType(command: string): 'tool' | 'resource' | 'notification' {
    if (command.includes('tool')) return 'tool';
    if (command.includes('resource')) return 'resource';
    if (command.includes('notification')) return 'notification';
    return 'tool'; // По умолчанию
  }

  /**
   * Извлечение имени MCP инструмента
   */
  public static extractMCPToolName(command: string): string | undefined {
    const match = command.match(/mcp\s+tool\s+(\w+)/i);
    return match?.[1];
  }

  /**
   * Извлечение имени MCP ресурса
   */
  public static extractMCPResourceName(command: string): string | undefined {
    const match = command.match(/mcp\s+resource\s+(\w+)/i);
    return match?.[1];
  }

  /**
   * Инициализация метрик
   */
  public static initializeMetrics(): SecurityMetrics {
    return {
      totalCommands: 0,
      blockedCommands: 0,
      allowedCommands: 0,
      criticalViolations: 0,
      highViolations: 0,
      mediumViolations: 0,
      lowViolations: 0,
      averageAnalysisTime: 0,
      lastUpdated: Date.now()
    };
  }
}
