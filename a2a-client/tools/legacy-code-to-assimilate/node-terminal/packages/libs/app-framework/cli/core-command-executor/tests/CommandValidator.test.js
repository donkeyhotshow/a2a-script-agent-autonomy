import { CommandValidator } from '../CommandValidator.js';
import { AppError } from '../CommandErrors.js';

describe('CommandValidator', () => {
  let validator;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      security: {
        maxCommandLength: 10000,
        allowedCommands: [],
        blockedCommands: []
      }
    };
    validator = new CommandValidator(mockConfig);
  });

  describe('validateRequest', () => {
    test('should validate valid request', () => {
      const request = { command: 'echo hello' };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should validate request with optional parameters', () => {
      const request = {
        command: 'ls -la',
        cwd: '/tmp',
        timeout: 5000,
        env: { TEST_VAR: 'value' }
      };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should throw error for empty command', () => {
      const request = { command: '' };
      expect(() => validator.validateRequest(request)).toThrow(AppError);
      expect(() => validator.validateRequest(request)).toThrow('Command cannot be empty');
    });

    test('should throw error for command with only whitespace', () => {
      const request = { command: '   ' };
      expect(() => validator.validateRequest(request)).toThrow(AppError);
      expect(() => validator.validateRequest(request)).toThrow('Command cannot be empty');
    });

    test('should throw error for command exceeding max length', () => {
      const longCommand = 'a'.repeat(10001);
      const request = { command: longCommand };
      expect(() => validator.validateRequest(request)).toThrow(AppError);
      expect(() => validator.validateRequest(request)).toThrow(
        `Command length exceeds maximum of ${mockConfig.security.maxCommandLength} characters`
      );
    });

    test('should validate command at max length boundary', () => {
      const maxLengthCommand = 'a'.repeat(10000);
      const request = { command: maxLengthCommand };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should throw error for blocked command', () => {
      mockConfig.security.blockedCommands = ['rm', 'del'];
      const request = { command: 'rm -rf /' };
      expect(() => validator.validateRequest(request)).toThrow(AppError);
      expect(() => validator.validateRequest(request)).toThrow('Command contains blocked pattern: rm');
    });

    test('should throw error for blocked command with arguments', () => {
      mockConfig.security.blockedCommands = ['rm', 'del'];
      const request = { command: 'rm -rf /tmp/test' };
      expect(() => validator.validateRequest(request)).toThrow(AppError);
      expect(() => validator.validateRequest(request)).toThrow('Command contains blocked pattern: rm');
    });

    test('should handle case insensitive blocked commands', () => {
      mockConfig.security.blockedCommands = ['RM', 'DEL'];
      const request = { command: 'rm -rf /' };
      expect(() => validator.validateRequest(request)).toThrow(AppError);
      expect(() => validator.validateRequest(request)).toThrow('Command contains blocked pattern: RM');
    });

    test('should validate allowed commands', () => {
      mockConfig.security.allowedCommands = ['echo', 'ls'];
      expect(() => validator.validateRequest({ command: 'echo hello' })).not.toThrow();
      expect(() => validator.validateRequest({ command: 'ls -la' })).not.toThrow();
      expect(() => validator.validateRequest({ command: 'git status' })).toThrow(AppError);
      expect(() => validator.validateRequest({ command: 'git status' })).toThrow('Command not in allowed list');
    });

    test('should validate allowed command with arguments', () => {
      mockConfig.security.allowedCommands = ['echo', 'ls'];
      expect(() => validator.validateRequest({ command: 'ls -la /tmp' })).not.toThrow();
    });

    test('should handle case insensitive allowed commands', () => {
      mockConfig.security.allowedCommands = ['ECHO', 'LS'];
      expect(() => validator.validateRequest({ command: 'echo hello' })).not.toThrow(); // Should pass due to toLowerCase in validator
      expect(() => validator.validateRequest({ command: 'ls -la' })).not.toThrow(); // Should pass
      expect(() => validator.validateRequest({ command: 'git status' })).toThrow(AppError);
    });

    test('should throw error for null request', () => {
      expect(() => validator.validateRequest(null)).toThrow(AppError);
      expect(() => validator.validateRequest(null)).toThrow('Request cannot be null or undefined');
    });

    test('should throw error for undefined request', () => {
      expect(() => validator.validateRequest(undefined)).toThrow(AppError);
      expect(() => validator.validateRequest(undefined)).toThrow('Request cannot be null or undefined');
    });

    test('should throw error for request without command', () => {
      const request = { cwd: '/tmp' };
      expect(() => validator.validateRequest(request)).toThrow(AppError);
    });

    test('should throw error for request with null command', () => {
      const request = { command: null };
      expect(() => validator.validateRequest(request)).toThrow(AppError);
    });

    test('should throw error for request with undefined command', () => {
      const request = { command: undefined };
      expect(() => validator.validateRequest(request)).toThrow(AppError);
    });

    test('should validate timeout parameter', () => {
      const request = { command: 'sleep 1', timeout: 1000 };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should throw error for negative timeout', () => {
      const request = { command: 'echo test', timeout: -1000 };
      expect(() => validator.validateRequest(request)).toThrow(AppError);
      expect(() => validator.validateRequest(request)).toThrow('Timeout must be positive');
    });

    test('should throw error for zero timeout', () => {
      const request = { command: 'echo test', timeout: 0 };
      expect(() => validator.validateRequest(request)).toThrow(AppError);
      expect(() => validator.validateRequest(request)).toThrow('Timeout must be positive');
    });

    test('should not throw error for valid cwd parameter', () => {
      const request = { command: 'pwd', cwd: '/tmp' };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should not throw error for valid env parameter', () => {
      const request = {
        command: 'echo $TEST_VAR',
        env: { TEST_VAR: 'test_value' }
      };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should not throw error for empty env object', () => {
      const request = { command: 'echo test', env: {} };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should handle multiple blocked commands', () => {
      mockConfig.security.blockedCommands = ['rm', 'del', 'format'];
      const validator = new CommandValidator(mockConfig);
      
      expect(() => validator.validateRequest({ command: 'rm -rf /' })).toThrow(AppError);
      expect(() => validator.validateRequest({ command: 'del /s /q C:\\' })).toThrow(AppError);
      expect(() => validator.validateRequest({ command: 'format C:' })).toThrow(AppError);
      expect(() => validator.validateRequest({ command: 'echo test' })).not.toThrow();
    });

    test('should handle multiple allowed commands', () => {
      mockConfig.security.allowedCommands = ['echo', 'ls', 'pwd', 'cat'];
      const validator = new CommandValidator(mockConfig);
      
      expect(() => validator.validateRequest({ command: 'echo hello' })).not.toThrow();
      expect(() => validator.validateRequest({ command: 'ls -la' })).not.toThrow();
      expect(() => validator.validateRequest({ command: 'pwd' })).not.toThrow();
      expect(() => validator.validateRequest({ command: 'cat file.txt' })).not.toThrow();
      expect(() => validator.validateRequest({ command: 'rm file.txt' })).toThrow(AppError);
    });

    test('should handle mixed case in blocked commands', () => {
      mockConfig.security.blockedCommands = ['RM', 'Del', 'FORMAT'];
      const validator = new CommandValidator(mockConfig);
      
      expect(() => validator.validateRequest({ command: 'rm -rf /' })).toThrow(AppError);
      expect(() => validator.validateRequest({ command: 'del /s /q C:\\' })).toThrow(AppError);
      expect(() => validator.validateRequest({ command: 'format C:' })).toThrow(AppError);
    });

    test('should handle mixed case in allowed commands', () => {
      mockConfig.security.allowedCommands = ['ECHO', 'Ls', 'PWD'];
      const validator = new CommandValidator(mockConfig);
      
      expect(() => validator.validateRequest({ command: 'echo hello' })).not.toThrow();
      expect(() => validator.validateRequest({ command: 'ls -la' })).not.toThrow();
      expect(() => validator.validateRequest({ command: 'pwd' })).not.toThrow();
    });

    test('should handle commands with special characters', () => {
      const request = { command: 'echo "test with spaces and $variables"' };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should handle commands with pipes and redirects', () => {
      const request = { command: 'ls -la | grep test > output.txt' };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should handle commands with semicolons', () => {
      const request = { command: 'echo hello; echo world' };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should handle commands with ampersands', () => {
      const request = { command: 'echo hello && echo world' };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should handle commands with unicode characters', () => {
      const request = { command: 'echo "тест с кириллицей"' };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should handle commands with newlines', () => {
      const request = { command: 'echo "line1\nline2"' };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should handle commands with tabs', () => {
      const request = { command: 'echo "tab\tseparated"' };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should handle empty blocked commands array', () => {
      mockConfig.security.blockedCommands = [];
      const validator = new CommandValidator(mockConfig);
      
      expect(() => validator.validateRequest({ command: 'rm -rf /' })).not.toThrow();
    });

    test('should handle empty allowed commands array', () => {
      mockConfig.security.allowedCommands = [];
      const validator = new CommandValidator(mockConfig);
      
      expect(() => validator.validateRequest({ command: 'echo test' })).not.toThrow();
    });

    test('should handle undefined timeout', () => {
      const request = { command: 'echo test', timeout: undefined };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should handle null timeout', () => {
      const request = { command: 'echo test', timeout: null };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should handle very large timeout values', () => {
      const request = { command: 'echo test', timeout: Number.MAX_SAFE_INTEGER };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should handle floating point timeout values', () => {
      const request = { command: 'echo test', timeout: 1000.5 };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should handle commands with complex shell constructs', () => {
      const request = { command: 'if [ -f file.txt ]; then cat file.txt; else echo "not found"; fi' };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should handle commands with nested quotes', () => {
      const request = { command: 'echo "outer \'inner\' quotes"' };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should handle commands with backticks', () => {
      const request = { command: 'echo `date`' };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should handle commands with dollar sign variables', () => {
      const request = { command: 'echo $HOME $USER' };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should handle commands with wildcards', () => {
      const request = { command: 'ls *.txt' };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should handle commands with redirections', () => {
      const request = { command: 'echo "test" > output.txt 2>&1' };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should handle commands with background execution', () => {
      const request = { command: 'sleep 10 &' };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should handle commands with subshells', () => {
      const request = { command: '(echo "subshell"; exit 0)' };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });

    test('should handle commands with function definitions', () => {
      const request = { command: 'function test() { echo "test"; }; test' };
      expect(() => validator.validateRequest(request)).not.toThrow();
    });
  });

  describe('security validation edge cases', () => {
    test('should handle case sensitivity in blocked commands', () => {
      mockConfig.security.blockedCommands = ['RM', 'Del'];
      const validator = new CommandValidator(mockConfig);
      
      expect(() => validator.validateRequest({ command: 'rm file.txt' })).toThrow(AppError);
      expect(() => validator.validateRequest({ command: 'del file.txt' })).toThrow(AppError);
      expect(() => validator.validateRequest({ command: 'RM file.txt' })).toThrow(AppError);
      expect(() => validator.validateRequest({ command: 'Del file.txt' })).toThrow(AppError);
    });

    test('should handle partial matches in blocked commands', () => {
      mockConfig.security.blockedCommands = ['rm'];
      const validator = new CommandValidator(mockConfig);
      
      expect(() => validator.validateRequest({ command: 'rm file.txt' })).toThrow(AppError);
      expect(() => validator.validateRequest({ command: 'sudo rm file.txt' })).toThrow(AppError);
      expect(() => validator.validateRequest({ command: 'echo "rm command"' })).toThrow(AppError);
    });

    test('should handle partial matches in allowed commands', () => {
      mockConfig.security.allowedCommands = ['echo'];
      const validator = new CommandValidator(mockConfig);
      
      expect(() => validator.validateRequest({ command: 'echo hello' })).not.toThrow();
      expect(() => validator.validateRequest({ command: 'echo "test"' })).not.toThrow();
      expect(() => validator.validateRequest({ command: 'ls file.txt' })).toThrow(AppError);
    });

    test('should handle empty blocked commands list', () => {
      mockConfig.security.blockedCommands = [];
      const validator = new CommandValidator(mockConfig);
      
      expect(() => validator.validateRequest({ command: 'rm -rf /' })).not.toThrow();
    });

    test('should handle empty allowed commands list', () => {
      mockConfig.security.allowedCommands = [];
      const validator = new CommandValidator(mockConfig);
      
      expect(() => validator.validateRequest({ command: 'echo test' })).not.toThrow();
    });

    test('should handle null blocked commands', () => {
      mockConfig.security.blockedCommands = null;
      const validator = new CommandValidator(mockConfig);
      
      expect(() => validator.validateRequest({ command: 'rm file.txt' })).not.toThrow();
    });

    test('should handle null allowed commands', () => {
      mockConfig.security.allowedCommands = null;
      const validator = new CommandValidator(mockConfig);
      
      expect(() => validator.validateRequest({ command: 'echo test' })).not.toThrow();
    });

    test('should handle undefined blocked commands', () => {
      mockConfig.security.blockedCommands = undefined;
      const validator = new CommandValidator(mockConfig);
      
      expect(() => validator.validateRequest({ command: 'rm file.txt' })).not.toThrow();
    });

    test('should handle undefined allowed commands', () => {
      mockConfig.security.allowedCommands = undefined;
      const validator = new CommandValidator(mockConfig);
      
      expect(() => validator.validateRequest({ command: 'echo test' })).not.toThrow();
    });
  });

  describe('performance and stress testing', () => {
    test('should handle very long command validation quickly', () => {
      const longCommand = 'echo "' + 'a'.repeat(9999) + '"';
      const request = { command: longCommand };
      
      const startTime = Date.now();
      expect(() => validator.validateRequest(request)).not.toThrow();
      const endTime = Date.now();
      
      // Валидация должна быть быстрой даже для длинных команд
      expect(endTime - startTime).toBeLessThan(100); // менее 100мс
    });

    test('should handle many blocked commands efficiently', () => {
      mockConfig.security.blockedCommands = Array.from({ length: 1000 }, (_, i) => `cmd${i}`);
      const validator = new CommandValidator(mockConfig);
      
      const startTime = Date.now();
      expect(() => validator.validateRequest({ command: 'cmd500 test' })).toThrow(AppError);
      const endTime = Date.now();
      
      // Валидация должна быть быстрой даже с большим количеством заблокированных команд
      expect(endTime - startTime).toBeLessThan(50); // менее 50мс
    });

    test('should handle many allowed commands efficiently', () => {
      mockConfig.security.allowedCommands = Array.from({ length: 1000 }, (_, i) => `cmd${i}`);
      const validator = new CommandValidator(mockConfig);
      
      const startTime = Date.now();
      expect(() => validator.validateRequest({ command: 'cmd500 test' })).not.toThrow();
      const endTime = Date.now();
      
      // Валидация должна быть быстрой даже с большим количеством разрешенных команд
      expect(endTime - startTime).toBeLessThan(50); // менее 50мс
    });
  });

  describe('configuration validation', () => {
    test('should handle missing security config', () => {
      const incompleteConfig = {};
      const validator = new CommandValidator(incompleteConfig);
      
      // Должно выбросить ошибку при попытке валидации
      expect(() => validator.validateRequest({ command: 'echo test' })).toThrow();
    });

    test('should handle incomplete security config', () => {
      const incompleteConfig = {
        security: {
          maxCommandLength: 1000
          // Отсутствуют blockedCommands и allowedCommands
        }
      };
      const validator = new CommandValidator(incompleteConfig);
      
      expect(() => validator.validateRequest({ command: 'echo test' })).not.toThrow();
    });

    test('should handle null config', () => {
      expect(() => new CommandValidator(null)).not.toThrow();
    });

    test('should handle undefined config', () => {
      expect(() => new CommandValidator(undefined)).not.toThrow();
    });
  });
});
