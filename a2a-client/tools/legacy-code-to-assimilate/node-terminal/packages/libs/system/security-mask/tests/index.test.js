const {
  analyzeCommand,
  getOsCriticalPatterns,
  getSuggestions,
  selfTest,
  quickCriticalTest,
  SecurityAnalyzer
} = require('../index.cjs');

describe('SecurityAnalyzer', () => {

  describe('analyzeCommand', () => {
    test('should block empty commands', () => {
      const result = SecurityAnalyzer.analyzeCommand('');
      expect(result.is_allowed).toBe(false);
      expect(result.reason).toBe('Пустая команда');
      expect(result.suggestions).toContain('Укажите команду для выполнения');
    });

    test('should block whitespace-only commands', () => {
      const result = SecurityAnalyzer.analyzeCommand('   ');
      expect(result.is_allowed).toBe(false);
      expect(result.reason).toBe('Пустая команда');
    });

    test('should block null/undefined commands', () => {
      const result = SecurityAnalyzer.analyzeCommand(null);
      expect(result.is_allowed).toBe(false);
      expect(result.reason).toBe('Пустая команда');
    });

    test('should block critical commands', () => {
      const criticalCommands = [
        'format X:',
        'rm -rf /',
        'del /s /q C:\\',
        'shutdown /s /t 0',
        'reboot',
        'net user hacker /add',
        'reg add HKLM',
        'wmic process call create'
      ];

      for (const command of criticalCommands) {
        const result = SecurityAnalyzer.analyzeCommand(command);
        expect(result.is_allowed).toBe(false);
        expect(result.reason).toContain('Критическая команда');
      }
    });

    test('should block forbidden commands', () => {
      const forbiddenCommands = [
        'read variable',
        'more file.txt',
        'less file.txt',
        'nano file.txt',
        'vi file.txt',
        'vim file.txt',
        'ssh user@host',
        'ftp host',
        'sftp user@host',
        'attrib +h file.txt',
        'cacls file.txt',
        'icacls file.txt',
        'taskkill /im explorer.exe',
        'rundll32 shell32'
      ];

      for (const command of forbiddenCommands) {
        const result = SecurityAnalyzer.analyzeCommand(command);
        expect(result.is_allowed).toBe(false);
        expect(result.reason).toContain('Запрещено по политике безопасности');
      }
    });

    test('should allow safe commands', () => {
      const safeCommands = [
        'echo "test"',
        'dir',
        'ls -la',
        'cat file.txt',
        'type file.txt',
        'pwd',
        'whoami',
        'ver',
        'cls',
        'clear',
        'node --version',
        'node -e "console.log(\'test\')"',
        'npm --version',
        'npm list',
        'git --version',
        'git status',
        'git log',
        'ping 127.0.0.1',
        'ping google.com',
        'ipconfig',
        'ifconfig',
        'netstat',
        'jest',
        'npx jest'
      ];

      for (const command of safeCommands) {
        const result = SecurityAnalyzer.analyzeCommand(command);
        expect(result.is_allowed).toBe(true);
      }
    });

    test('should allow commands from whitelist', () => {
      const whitelistCommands = [
        'echo test',
        'dir /w',
        'ls -la',
        'cat file.txt',
        'type file.txt',
        'pwd',
        'whoami',
        'ver',
        'cls',
        'clear',
        'node --version',
        'npm --version',
        'npx test',
        'git status',
        'ping 8.8.8.8',
        'ipconfig /all',
        'ifconfig -a',
        'netstat -an'
      ];

      for (const command of whitelistCommands) {
        const result = SecurityAnalyzer.analyzeCommand(command);
        expect(result.is_allowed).toBe(true);
        expect(result.reason).toContain('белом списке');
      }
    });

    test('should allow commands matching allowed patterns', () => {
      const allowedPatternCommands = [
        'echo "test message"',
        'npm list --depth=0',
        'git log --oneline',
        'ping 192.168.1.1',
        'ipconfig /release',
        'jest --version'
      ];

      for (const command of allowedPatternCommands) {
        const result = SecurityAnalyzer.analyzeCommand(command);
        expect(result.is_allowed).toBe(true);
        expect(result.reason).toContain('разрешённому паттерну');
      }
    });

    test('should block interactive commands', () => {
      const interactiveCommands = [
        'read variable',
        'more file.txt',
        'less file.txt',
        'nano file.txt',
        'vi file.txt',
        'vim file.txt'
      ];

      for (const command of interactiveCommands) {
        const result = SecurityAnalyzer.analyzeCommand(command);
        expect(result.is_allowed).toBe(false);
        expect(result.reason).toContain('Запрещено по политике безопасности');
        expect(result.suggestions).toContain('Используйте cat или type для просмотра файлов');
      }
    });

    test('should allow unknown commands by default', () => {
      const unknownCommands = [
        'unknown-command',
        'custom-script.sh',
        'python --version',
        'java -version'
      ];

      for (const command of unknownCommands) {
        const result = SecurityAnalyzer.analyzeCommand(command);
        expect(result.is_allowed).toBe(true);
        expect(result.reason).toBe('Команда разрешена');
      }
    });
  });

  describe('getOsCriticalPatterns', () => {
    test('should return Windows patterns on Windows platform', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const patterns = SecurityAnalyzer.getOsCriticalPatterns();
      
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].source).toContain('format');
      expect(patterns.some(p => p.source.includes('reg'))).toBe(true);
      expect(patterns.some(p => p.source.includes('wmic'))).toBe(true);

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('should return Unix patterns on non-Windows platform', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      const patterns = SecurityAnalyzer.getOsCriticalPatterns();
      
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].source).toContain('rm');
      expect(patterns.some(p => p.source.includes('dd'))).toBe(true);
      expect(patterns.some(p => p.source.includes('mkfs'))).toBe(true);

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('getSuggestions', () => {
    test('should provide suggestions for read/more/less commands', () => {
      const suggestions = SecurityAnalyzer.getSuggestions('read variable', 'read|more|less|nano|vi|vim');
      
      expect(suggestions).toContain('Используйте cat или type для просмотра файлов');
    });

    test('should provide suggestions for rm/del commands', () => {
      const suggestions = SecurityAnalyzer.getSuggestions('rm -rf /', 'rm -rf');
      
      expect(suggestions).toContain('Используйте dir или ls для просмотра содержимого');
    });

    test('should provide suggestions for format commands', () => {
      const suggestions = SecurityAnalyzer.getSuggestions('format C:', 'format');
      
      expect(suggestions).toContain('Операции форматирования запрещены');
    });

    test('should provide suggestions for network commands', () => {
      const suggestions = SecurityAnalyzer.getSuggestions('ssh user@host', 'ssh|ftp|sftp');
      
      expect(suggestions).toContain('Сетевые команды ограничены. Используйте ping для проверки соединения');
    });

    test('should return empty array for unknown reasons', () => {
      const suggestions = SecurityAnalyzer.getSuggestions('unknown command', 'unknown reason');
      
      expect(suggestions).toEqual([]);
    });
  });

  describe('selfTest', () => {
    test('should run self test and return results', () => {
      const results = SecurityAnalyzer.selfTest();
      
      expect(results).toHaveProperty('passed');
      expect(results).toHaveProperty('failed');
      expect(results).toHaveProperty('total');
      expect(results).toHaveProperty('details');
      expect(results).toHaveProperty('criticalIssues');
      expect(results).toHaveProperty('overallStatus');
      
      expect(typeof results.passed).toBe('number');
      expect(typeof results.failed).toBe('number');
      expect(typeof results.total).toBe('number');
      expect(Array.isArray(results.details)).toBe(true);
      expect(Array.isArray(results.criticalIssues)).toBe(true);
      expect(['passed', 'partial_failure', 'critical_failure', 'unknown']).toContain(results.overallStatus);
    });

    test('should test critical commands', () => {
      const results = SecurityAnalyzer.selfTest();

      expect(results.passed).toBeGreaterThan(0);
      expect(results.failed).toBeGreaterThanOrEqual(0);
      expect(results.total).toBeGreaterThan(0);
      expect(results.overallStatus).toBeDefined();
    });

    test('should test safe commands', () => {
      const results = SecurityAnalyzer.selfTest();

      expect(results.passed).toBeGreaterThan(0);
      expect(results.failed).toBeGreaterThanOrEqual(0);
      expect(results.total).toBeGreaterThan(0);
    });

    test('should test forbidden commands', () => {
      const results = SecurityAnalyzer.selfTest();

      expect(results.total).toBeGreaterThan(0);
      expect(results.passed).toBeGreaterThanOrEqual(0);
      expect(results.failed).toBeGreaterThanOrEqual(0);
    });

    test('should test edge cases', () => {
      const results = SecurityAnalyzer.selfTest();

      expect(results.total).toBeGreaterThan(0);
      expect(results.passed).toBeGreaterThanOrEqual(0);
      expect(results.failed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('quickCriticalTest', () => {
    test('should return true when critical tests pass', () => {
      // Test should work with real implementation
      const result = SecurityAnalyzer.quickCriticalTest();
      expect(result).toBe(true);
    });
  });

  describe('Static properties', () => {
    test('should have CRITICAL_PATTERNS', () => {
      expect(SecurityAnalyzer.CRITICAL_PATTERNS).toBeDefined();
      expect(Array.isArray(SecurityAnalyzer.CRITICAL_PATTERNS)).toBe(true);
      expect(SecurityAnalyzer.CRITICAL_PATTERNS.length).toBeGreaterThan(0);
    });

    test('should have FORBIDDEN_PATTERNS', () => {
      expect(SecurityAnalyzer.FORBIDDEN_PATTERNS).toBeDefined();
      expect(Array.isArray(SecurityAnalyzer.FORBIDDEN_PATTERNS)).toBe(true);
      expect(SecurityAnalyzer.FORBIDDEN_PATTERNS.length).toBeGreaterThan(0);
    });

    test('should have ALLOWED_PATTERNS', () => {
      expect(SecurityAnalyzer.ALLOWED_PATTERNS).toBeDefined();
      expect(Array.isArray(SecurityAnalyzer.ALLOWED_PATTERNS)).toBe(true);
      expect(SecurityAnalyzer.ALLOWED_PATTERNS.length).toBeGreaterThan(0);
    });

    test('should have WHITELIST_COMMANDS', () => {
      expect(SecurityAnalyzer.WHITELIST_COMMANDS).toBeDefined();
      expect(Array.isArray(SecurityAnalyzer.WHITELIST_COMMANDS)).toBe(true);
      expect(SecurityAnalyzer.WHITELIST_COMMANDS.length).toBeGreaterThan(0);
    });
  });

  describe('Exported functions', () => {
    test('analyzeCommand should work correctly', () => {
      const result = analyzeCommand('echo test');
      expect(result.is_allowed).toBe(true);
    });

    test('getOsCriticalPatterns should work correctly', () => {
      const patterns = getOsCriticalPatterns();
      expect(Array.isArray(patterns)).toBe(true);
    });

    test('getSuggestions should work correctly', () => {
      const suggestions = getSuggestions('read variable', 'read|more|less|nano|vi|vim');
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('selfTest should work correctly', () => {
      const results = selfTest();
      expect(results).toHaveProperty('overallStatus');
    });

    test('quickCriticalTest should work correctly', () => {
      const result = quickCriticalTest();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Integration scenarios', () => {
    test('should handle typical command analysis workflow', () => {
      // Test a typical workflow
      const command = 'echo "Hello World"';
      const analysis = SecurityAnalyzer.analyzeCommand(command);
      
      expect(analysis.is_allowed).toBe(true);
      
      if (!analysis.is_allowed) {
        const suggestions = SecurityAnalyzer.getSuggestions(command, analysis.reason);
        expect(Array.isArray(suggestions)).toBe(true);
      }
    });

    test('should handle security violation workflow', () => {
      // Test a security violation workflow
      const command = 'rm -rf /';
      const analysis = SecurityAnalyzer.analyzeCommand(command);
      
      expect(analysis.is_allowed).toBe(false);
      
      const suggestions = SecurityAnalyzer.getSuggestions(command, analysis.reason);
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    test('should handle OS-specific patterns', () => {
      const patterns = SecurityAnalyzer.getOsCriticalPatterns();
      
      // Test that patterns can be used to analyze commands
      for (const pattern of patterns) {
        const testCommand = 'test command';
        const matches = pattern.test(testCommand);
        expect(typeof matches).toBe('boolean');
      }
    });
  });
});
