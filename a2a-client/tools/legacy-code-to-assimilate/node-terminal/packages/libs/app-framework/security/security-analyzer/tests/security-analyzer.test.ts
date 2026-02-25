/**
 * @fileoverview Тесты для SecurityAnalyzer
 * @author MCP Terminal Team
 * @version 2.0.0
 */

import { SecurityAnalyzer } from '../src/security-analyzer';
import { PatternSecurityRule, FunctionSecurityRule } from '../src/rules';
import { SecurityConfig } from '../src/types';

describe('SecurityAnalyzer', () => {
  let analyzer: SecurityAnalyzer;

  beforeEach(() => {
    analyzer = new SecurityAnalyzer();
  });

  describe('Базовая функциональность', () => {
    it('должен создавать экземпляр с конфигурацией по умолчанию', () => {
      expect(analyzer).toBeInstanceOf(SecurityAnalyzer);
    });

    it('должен анализировать безопасные команды', async () => {
      const result = await analyzer.analyze('echo "test"');
      expect(result.allowed).toBe(true);
      expect(result.riskLevel).toBe('low');
    });

    it('должен блокировать критические команды', async () => {
      const result = await analyzer.analyze('rm -rf /');
      expect(result.allowed).toBe(false);
      expect(result.riskLevel).toBe('critical');
    });

    it('должен блокировать пустые команды', async () => {
      const result = await analyzer.analyze('');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Пустая команда');
    });

    it('должен блокировать команды с пробелами', async () => {
      const result = await analyzer.analyze('   ');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Пустая команда');
    });
  });

  describe('Правила безопасности', () => {
    it('должен блокировать деструктивные команды', async () => {
      const destructiveCommands = [
        'rm -rf /',
        'del /s c:\\',
        'format C:',
        'shutdown /s /t 0'
      ];

      for (const command of destructiveCommands) {
        const result = await analyzer.analyze(command);
        expect(result.allowed).toBe(false);
        expect(result.riskLevel).toBe('critical');
      }
    });

    it('должен блокировать сетевые команды', async () => {
      const networkCommands = [
        'ssh user@host',
        'ftp server.com',
        'telnet localhost'
      ];

      for (const command of networkCommands) {
        const result = await analyzer.analyze(command);
        expect(result.allowed).toBe(false);
        expect(result.riskLevel).toBe('high');
      }
    });

    it('должен блокировать интерактивные команды', async () => {
      const interactiveCommands = [
        'read variable',
        'more file.txt',
        'nano file.txt',
        'vi file.txt'
      ];

      for (const command of interactiveCommands) {
        const result = await analyzer.analyze(command);
        expect(result.allowed).toBe(false);
        expect(result.riskLevel).toBe('medium');
      }
    });

    it('должен разрешать безопасные команды', async () => {
      const safeCommands = [
        'echo "test"',
        'dir',
        'ls -la',
        'node --version',
        'git status',
        'ping 8.8.8.8'
      ];

      for (const command of safeCommands) {
        const result = await analyzer.analyze(command);
        expect(result.allowed).toBe(true);
        expect(result.riskLevel).toBe('low');
      }
    });
  });

  describe('Управление правилами', () => {
    it('должен добавлять новые правила', () => {
      const customRule = new PatternSecurityRule(
        'custom_test',
        'Тестовое правило',
        'medium',
        [/test-pattern/],
        ['Тестовое предложение']
      );

      analyzer.addRule(customRule);
      const rules = analyzer.getRules();
      expect(rules.some(r => r.name === 'custom_test')).toBe(true);
    });

    it('должен удалять правила', () => {
      const customRule = new PatternSecurityRule(
        'custom_test',
        'Тестовое правило',
        'medium',
        [/test-pattern/],
        ['Тестовое предложение']
      );

      analyzer.addRule(customRule);
      analyzer.removeRule('custom_test');
      
      const rules = analyzer.getRules();
      expect(rules.some(r => r.name === 'custom_test')).toBe(false);
    });

    it('должен получать правила по категории', () => {
      const systemRules = analyzer.getRulesByCategory('system');
      expect(systemRules.length).toBeGreaterThan(0);
      expect(systemRules.every(r => r.category === 'system')).toBe(true);
    });
  });

  describe('Конфигурация', () => {
    it('должен работать с кастомной конфигурацией', async () => {
      const config: Partial<SecurityConfig> = {
        maxCommandLength: 5,
        allowlist: ['test'],
        blocklist: ['blocked']
      };

      const customAnalyzer = new SecurityAnalyzer(config);

      // Тест максимальной длины
      const longCommand = await customAnalyzer.analyze('very long command');
      expect(longCommand.allowed).toBe(false);

      // Тест белого списка
      const allowedCommand = await customAnalyzer.analyze('test command');
      expect(allowedCommand.allowed).toBe(true);

      // Тест черного списка
      const blockedCommand = await customAnalyzer.analyze('blocked command');
      expect(blockedCommand.allowed).toBe(false);
    });
  });

  describe('Метрики', () => {
    it('должен отслеживать метрики', async () => {
      await analyzer.analyze('echo "test"');
      await analyzer.analyze('rm -rf /');

      const metrics = analyzer.getMetrics();
      expect(metrics.totalCommands).toBe(2);
      expect(metrics.allowedCommands).toBe(1);
      expect(metrics.blockedCommands).toBe(1);
      expect(metrics.criticalViolations).toBe(1);
    });
  });

  describe('Самопроверка', () => {
    it('должен выполнять самопроверку', async () => {
      const result = await analyzer.selfTest();
      
      expect(result.total).toBeGreaterThan(0);
      expect(result.passed + result.failed).toBe(result.total);
      expect(['passed', 'partial_failure', 'critical_failure']).toContain(result.overallStatus);
    });

    it('должен выполнять быструю критическую проверку', () => {
      const result = analyzer.quickCriticalTest();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('MCP интеграция', () => {
    it('должен анализировать MCP команды', async () => {
      const context = {
        sessionId: 'test-session',
        userId: 'test-user',
        workspace: '/test/workspace',
        environment: 'development' as const,
        permissions: ['read', 'write']
      };

      const result = await analyzer.analyzeMCPCommand('mcp tool execute test', context);
      
      expect(result.context).toEqual(context);
      expect(result.mcpSpecific.sessionId).toBe('test-session');
      expect(result.mcpSpecific.commandType).toBe('tool');
    });
  });

  describe('Обработка ошибок', () => {
    it('должен обрабатывать ошибки в правилах', async () => {
      const brokenRule = new FunctionSecurityRule(
        'broken_rule',
        'Сломанное правило',
        'medium',
        () => { throw new Error('Test error'); },
        () => ['Test suggestion'],
        []
      );

      analyzer.addRule(brokenRule);
      
      // Не должно выбрасывать исключение
      const result = await analyzer.analyze('test command');
      expect(result).toBeDefined();
    });
  });
});
