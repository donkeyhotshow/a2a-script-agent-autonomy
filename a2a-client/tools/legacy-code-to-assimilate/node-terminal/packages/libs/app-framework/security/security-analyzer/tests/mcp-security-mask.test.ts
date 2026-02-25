/**
 * @fileoverview Тесты для MCP SecurityMask
 * @author MCP Terminal Team
 * @version 2.0.0
 */

import { MCPSecurityMask, analyzeCommand, getOsCriticalPatterns, getSuggestions } from '../src/mcp-security-mask';

describe('MCPSecurityMask', () => {
  describe('Статические методы', () => {
    it('должен иметь критические паттерны', () => {
      expect(MCPSecurityMask.CRITICAL_PATTERNS).toBeDefined();
      expect(Array.isArray(MCPSecurityMask.CRITICAL_PATTERNS)).toBe(true);
      expect(MCPSecurityMask.CRITICAL_PATTERNS.length).toBeGreaterThan(0);
    });

    it('должен иметь запрещенные паттерны', () => {
      expect(MCPSecurityMask.FORBIDDEN_PATTERNS).toBeDefined();
      expect(Array.isArray(MCPSecurityMask.FORBIDDEN_PATTERNS)).toBe(true);
      expect(MCPSecurityMask.FORBIDDEN_PATTERNS.length).toBeGreaterThan(0);
    });

    it('должен иметь разрешенные паттерны', () => {
      expect(MCPSecurityMask.ALLOWED_PATTERNS).toBeDefined();
      expect(Array.isArray(MCPSecurityMask.ALLOWED_PATTERNS)).toBe(true);
      expect(MCPSecurityMask.ALLOWED_PATTERNS.length).toBeGreaterThan(0);
    });

    it('должен иметь белый список команд', () => {
      expect(MCPSecurityMask.WHITELIST_COMMANDS).toBeDefined();
      expect(Array.isArray(MCPSecurityMask.WHITELIST_COMMANDS)).toBe(true);
      expect(MCPSecurityMask.WHITELIST_COMMANDS.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeCommand', () => {
    it('должен блокировать критические команды', () => {
      const criticalCommands = [
        'format X:',
        'rm -rf /',
        'del /s c:\\',
        'shutdown /s /t 0'
      ];

      for (const command of criticalCommands) {
        const result = MCPSecurityMask.analyzeCommand(command);
        expect(result.is_allowed).toBe(false);
        expect(result.reason).toContain('Критическая команда');
      }
    });

    it('должен блокировать запрещенные команды', () => {
      const forbiddenCommands = [
        'read variable',
        'more file.txt',
        'ssh user@host',
        'taskkill /f /im explorer'
      ];

      for (const command of forbiddenCommands) {
        const result = MCPSecurityMask.analyzeCommand(command);
        expect(result.is_allowed).toBe(false);
        expect(result.reason).toContain('Запрещено');
      }
    });

    it('должен разрешать безопасные команды', () => {
      const safeCommands = [
        'echo "test"',
        'dir',
        'node --version',
        'git status'
      ];

      for (const command of safeCommands) {
        const result = MCPSecurityMask.analyzeCommand(command);
        expect(result.is_allowed).toBe(true);
      }
    });

    it('должен блокировать пустые команды', () => {
      const result = MCPSecurityMask.analyzeCommand('');
      expect(result.is_allowed).toBe(false);
      expect(result.reason).toContain('Пустая команда');
    });

    it('должен блокировать команды с пробелами', () => {
      const result = MCPSecurityMask.analyzeCommand('   ');
      expect(result.is_allowed).toBe(false);
      expect(result.reason).toContain('Пустая команда');
    });
  });

  describe('getOsCriticalPatterns', () => {
    it('должен возвращать Windows паттерны на Windows', () => {
      const patterns = MCPSecurityMask.getOsCriticalPatterns();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
      
      // Проверяем, что паттерны содержат Windows-специфичные команды
      const patternSources = patterns.map(p => p.source);
      expect(patternSources.some(p => p.includes('format'))).toBe(true);
    });
  });

  describe('getSuggestions', () => {
    it('должен возвращать предложения для интерактивных команд', () => {
      const suggestions = getSuggestions('read variable', 'read|more|less|nano|vi|vim');
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('cat или type');
    });

    it('должен возвращать предложения для деструктивных команд', () => {
      const suggestions = getSuggestions('rm -rf /', 'rm -rf');
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('dir или ls');
    });

    it('должен возвращать предложения для форматирования', () => {
      const suggestions = getSuggestions('format C:', 'format');
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('запрещены');
    });

    it('должен возвращать предложения для сетевых команд', () => {
      const suggestions = getSuggestions('ssh user@host', 'ssh|ftp|sftp');
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('ping');
    });
  });

  describe('Самопроверка', () => {
    it('должен выполнять самопроверку', async () => {
      const result = await MCPSecurityMask.selfTest();
      
      expect(result.total).toBeGreaterThan(0);
      expect(result.passed + result.failed).toBe(result.total);
      expect(['passed', 'partial_failure', 'critical_failure']).toContain(result.overallStatus);
    });

    it('должен выполнять быструю критическую проверку', () => {
      const result = MCPSecurityMask.quickCriticalTest();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Legacy функции', () => {
    it('должен экспортировать analyzeCommand', () => {
      const result = analyzeCommand('echo "test"');
      expect(result.is_allowed).toBe(true);
    });

    it('должен экспортировать getOsCriticalPatterns', () => {
      const patterns = getOsCriticalPatterns();
      expect(Array.isArray(patterns)).toBe(true);
    });

    it('должен экспортировать getSuggestions', () => {
      const suggestions = getSuggestions('test', 'test');
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('должен экспортировать selfTest', async () => {
      const result = await selfTest();
      expect(result.total).toBeGreaterThan(0);
    });

    it('должен экспортировать quickCriticalTest', () => {
      const result = quickCriticalTest();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Создание анализатора', () => {
    it('должен создавать новый анализатор', () => {
      const analyzer = MCPSecurityMask.createAnalyzer();
      expect(analyzer).toBeDefined();
    });

    it('должен создавать анализатор с конфигурацией', () => {
      const analyzer = MCPSecurityMask.createAnalyzer({
        maxCommandLength: 100,
        allowlist: ['custom']
      });
      expect(analyzer).toBeDefined();
    });

    it('должен получать анализатор', () => {
      const analyzer = MCPSecurityMask.getAnalyzer();
      expect(analyzer).toBeDefined();
    });
  });
});
