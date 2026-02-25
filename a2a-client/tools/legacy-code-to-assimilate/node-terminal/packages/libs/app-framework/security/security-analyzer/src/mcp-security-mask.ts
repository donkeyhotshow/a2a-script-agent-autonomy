/**
 * @fileoverview MCP SecurityMask - совместимость с legacy кодом
 * @author MCP Terminal Team
 * @version 2.0.0
 */

import { SecurityAnalyzer } from './security-analyzer';
import { PatternSecurityRule } from './rules';
import { SecurityConfig, SecuritySelfTestResult } from './types';

/**
 * Статический класс для совместимости с legacy SecurityMask.cjs
 */
export class MCPSecurityMask {
  private static analyzer: SecurityAnalyzer;
  private static initialized = false;

  // Legacy константы для обратной совместимости
  static readonly CRITICAL_PATTERNS = [
    /\b(rm\s+-rf?|del\s+\/s|format\s+[a-z]:)/i,
    /\b(shutdown|reboot|restart)\b/i,
    /\b(net\s+user|net\s+localgroup)\b/i,
    /\b(reg\s+add|reg\s+delete)\b/i,
    /\b(wmic\s+process|wmic\s+service)\b/i
  ];

  static readonly FORBIDDEN_PATTERNS = [
    /\b(read|more|less|nano|vi|vim|ssh|ftp|sftp)\b/i,
    /\b(attrib\s+[+-][hsr])\b/i,
    /\b(cacls|icacls)\b/i,
    /\b(taskkill\s+\/im\s+explorer)\b/i,
    /\b(rundll32\s+shell32)\b/i
  ];

  static readonly ALLOWED_PATTERNS = [
    /\b(echo|dir|ls|cat|type|pwd|whoami|ver|cls|clear)\b/i,
    /\b(node\s+-e|node\s+--version)\b/i,
    /\b(npm\s+--version|npm\s+list)\b/i,
    /\b(git\s+--version|git\s+status|git\s+log)\b/i,
    /\b(ping\s+[0-9.]+|ping\s+[a-z.]+)\b/i,
    /\b(ipconfig|ifconfig|netstat)\b/i,
    /\b(jest|npx\s+jest)\b/i,
    /\b(echo\s+"[^"]*")\b/i
  ];

  static readonly WHITELIST_COMMANDS = [
    'echo', 'dir', 'ls', 'cat', 'type', 'pwd', 'whoami', 'ver', 'cls', 'clear',
    'node', 'npm', 'npx', 'git', 'ping', 'ipconfig', 'ifconfig', 'netstat'
  ];

  /**
   * Инициализация анализатора
   */
  private static initialize(): void {
    if (this.initialized) {
      return;
    }

    const config: Partial<SecurityConfig> = {
      enabled: true,
      maxCommandLength: 10000,
      sandboxMode: false,
      strictMode: false,
      allowlist: this.WHITELIST_COMMANDS,
      blocklist: [],
      logging: {
        enabled: true,
        level: 'info',
        includeMetadata: true
      },
      monitoring: {
        enabled: true,
        alertThreshold: 10,
        autoBlock: false
      }
    };

    this.analyzer = new SecurityAnalyzer(config);
    this.initialized = true;
  }

  /**
   * Анализ команды (legacy метод)
   */
  static analyzeCommand(command: string): {
    is_allowed: boolean;
    reason: string;
    suggestions: string[];
  } {
    this.initialize();

    const cmd = String(command || '').trim();
    if (!cmd) {
      return {
        is_allowed: false,
        reason: 'Пустая команда',
        suggestions: ['Укажите команду для выполнения']
      };
    }

    // Быстрая проверка критических паттернов
    for (const pattern of this.CRITICAL_PATTERNS) {
      if (pattern.test(cmd)) {
        return {
          is_allowed: false,
          reason: 'Критическая команда: ' + pattern.source,
          suggestions: this.getSuggestions(cmd, pattern.source)
        };
      }
    }

    // Проверка OS-специфичных критических паттернов
    for (const pattern of this.getOsCriticalPatterns()) {
      if (pattern.test(cmd)) {
        return {
          is_allowed: false,
          reason: 'Критическая команда для ОС: ' + pattern.source,
          suggestions: this.getSuggestions(cmd, pattern.source)
        };
      }
    }

    // Проверка белого списка
    for (const allowed of this.WHITELIST_COMMANDS) {
      if (cmd.toLowerCase().startsWith(allowed.toLowerCase())) {
        return { is_allowed: true, reason: 'Команда в белом списке', suggestions: [] };
      }
    }

    // Проверка разрешённых паттернов
    for (const pattern of this.ALLOWED_PATTERNS) {
      if (pattern.test(cmd)) {
        return { is_allowed: true, reason: 'Соответствует разрешённому паттерну', suggestions: [] };
      }
    }

    // Проверка запрещённых паттернов
    for (const pattern of this.FORBIDDEN_PATTERNS) {
      if (pattern.test(cmd)) {
        return {
          is_allowed: false,
          reason: 'Запрещено по политике безопасности: соответствует паттерну \'' + pattern.source + '\'',
          suggestions: this.getSuggestions(cmd, pattern.source)
        };
      }
    }

    // Проверка интерактивных команд
    if (/\b(read|more|less|nano|vi|vim)\b/i.test(cmd)) {
      return {
        is_allowed: false,
        reason: 'Интерактивные команды запрещены',
        suggestions: ['Используйте cat или type для просмотра файлов']
      };
    }

    // По умолчанию разрешаем
    return { is_allowed: true, reason: 'Команда разрешена', suggestions: [] };
  }

  /**
   * Получение OS-специфичных критических паттернов
   */
  static getOsCriticalPatterns(): RegExp[] {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      return [
        /\b(format\s+[a-z]:)\b/i,
        /\b(del\s+\/s\s+[a-z]:\\windows)\b/i,
        /\b(reg\s+add\s+HKLM)\b/i,
        /\b(wmic\s+process\s+where)\b/i
      ];
    }
    return [
      /\b(rm\s+-rf\s+\/)\b/i,
      /\b(dd\s+if=\/dev\/zero)\b/i,
      /\b(mkfs\s+\/dev\/)\b/i
    ];
  }

  /**
   * Получение предложений для команды
   */
  static getSuggestions(command: string, reason: string): string[] {
    const suggestions: string[] = [];
    
    if (reason.includes('read|more|less|nano|vi|vim')) {
      suggestions.push('Используйте cat или type для просмотра файлов');
    }
    
    if (reason.includes('rm -rf') || reason.includes('del /s')) {
      suggestions.push('Используйте dir или ls для просмотра содержимого');
    }
    
    if (reason.includes('format') || reason.includes('mkfs')) {
      suggestions.push('Операции форматирования запрещены');
    }
    
    if (reason.includes('ssh|ftp|sftp')) {
      suggestions.push('Сетевые команды ограничены. Используйте ping для проверки соединения');
    }
    
    return suggestions;
  }

  /**
   * Самопроверка системы безопасности
   */
  static async selfTest(): Promise<SecuritySelfTestResult> {
    this.initialize();
    return await this.analyzer.selfTest();
  }

  /**
   * Быстрая проверка критических паттернов
   */
  static quickCriticalTest(): boolean {
    this.initialize();
    return this.analyzer.quickCriticalTest();
  }

  /**
   * Получение анализатора для расширенного использования
   */
  static getAnalyzer(): SecurityAnalyzer {
    this.initialize();
    return this.analyzer;
  }

  /**
   * Создание нового анализатора с кастомной конфигурацией
   */
  static createAnalyzer(config?: Partial<SecurityConfig>): SecurityAnalyzer {
    return new SecurityAnalyzer(config);
  }
}

// Экспорт функций для обратной совместимости
export function analyzeCommand(command: string) {
  return MCPSecurityMask.analyzeCommand(command);
}

export function getOsCriticalPatterns() {
  return MCPSecurityMask.getOsCriticalPatterns();
}

export function getSuggestions(command: string, reason: string) {
  return MCPSecurityMask.getSuggestions(command, reason);
}

export function selfTest() {
  return MCPSecurityMask.selfTest();
}

export function quickCriticalTest() {
  return MCPSecurityMask.quickCriticalTest();
}

// Экспорт для CommonJS совместимости
export default {
  analyzeCommand,
  getOsCriticalPatterns,
  getSuggestions,
  selfTest,
  quickCriticalTest,
  MCPSecurityMask
};
