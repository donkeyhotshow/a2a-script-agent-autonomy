const { validatePathWithCategories, validateFsParams } = require('../index.cjs');
const path = require('path');

describe('PathValidation', () => {
  describe('validatePathWithCategories', () => {
    test('should validate workspace path', async () => {
      const result = await validatePathWithCategories('workspace/project', 'read');
      
      expect(result.isValid).toBe(true);
      expect(result.category).toBe('WORKSPACE');
      expect(result.error).toBeNull();
      expect(result.details.matchedCategory).toEqual({
        key: 'WORKSPACE',
        description: 'Рабочая область проекта'
      });
    });

    test('should validate source code path', async () => {
      const result = await validatePathWithCategories('src/components/Button.js', 'read');
      
      expect(result.isValid).toBe(true);
      expect(result.category).toBe('SOURCE_CODE');
      expect(result.error).toBeNull();
    });

    test('should validate docs config path', async () => {
      const result = await validatePathWithCategories('docs/README.md', 'read');
      
      expect(result.isValid).toBe(true);
      expect(result.category).toBe('DOCS_CONFIG');
      expect(result.error).toBeNull();
    });

    test('should validate tests path', async () => {
      const result = await validatePathWithCategories('tests/unit/Button.test.js', 'read');
      
      expect(result.isValid).toBe(true);
      expect(result.category).toBe('TESTS');
      expect(result.error).toBeNull();
    });

    test('should validate temp logs path', async () => {
      const result = await validatePathWithCategories('logs/error.log', 'read');
      
      expect(result.isValid).toBe(true);
      expect(result.category).toBe('TEMP_LOGS');
      expect(result.error).toBeNull();
    });

    test('should validate work reports path', async () => {
      const result = await validatePathWithCategories('work/reports/summary.json', 'read');
      
      expect(result.isValid).toBe(true);
      expect(result.category).toBe('WORK_REPORTS');
      expect(result.error).toBeNull();
    });

    test('should validate archive path', async () => {
      const result = await validatePathWithCategories('archive/backup.zip', 'read');
      
      expect(result.isValid).toBe(true);
      expect(result.category).toBe('ARCHIVE');
      expect(result.error).toBeNull();
    });

    test('should validate build dist path', async () => {
      const result = await validatePathWithCategories('build/dist/app.js', 'read');
      
      expect(result.isValid).toBe(true);
      expect(result.category).toBe('BUILD_DIST');
      expect(result.error).toBeNull();
    });

    test('should normalize path separators', async () => {
      const result = await validatePathWithCategories('src\\components\\Button.js', 'read');
      
      expect(result.isValid).toBe(true);
      expect(result.category).toBe('SOURCE_CODE');
    });

    test('should normalize multiple slashes', async () => {
      const result = await validatePathWithCategories('src///components//Button.js', 'read');
      
      expect(result.isValid).toBe(true);
      expect(result.category).toBe('SOURCE_CODE');
    });

    test('should remove leading ./', async () => {
      const result = await validatePathWithCategories('./src/components/Button.js', 'read');
      
      expect(result.isValid).toBe(true);
      expect(result.category).toBe('SOURCE_CODE');
    });

    test('should remove trailing slash', async () => {
      const result = await validatePathWithCategories('src/components/', 'read');
      
      expect(result.isValid).toBe(true);
      expect(result.category).toBe('SOURCE_CODE');
    });

    test('should reject forbidden paths', async () => {
      const result = await validatePathWithCategories('/etc/passwd', 'read');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Путь заблокирован: содержит запрещенный паттерн');
      expect(result.details.forbiddenPattern).toBeDefined();
    });

    test('should reject system paths', async () => {
      const forbiddenPaths = [
        '/usr/bin/ls',
        '/bin/bash',
        '/var/log/system.log',
        '/proc/cpuinfo',
        '/sys/kernel',
        '/dev/null',
        '/root/.bashrc',
        '/home/user/.ssh/id_rsa'
      ];

      for (const path of forbiddenPaths) {
        const result = await validatePathWithCategories(path, 'read');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Путь заблокирован: содержит запрещенный паттерн');
      }
    });

    test('should reject paths with ..', async () => {
      const result = await validatePathWithCategories('src/../etc/passwd', 'read');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Путь заблокирован: содержит запрещенный паттерн');
    });

    test('should reject absolute Windows paths', async () => {
      const result = await validatePathWithCategories('C:/Windows/System32', 'read');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Путь заблокирован: содержит запрещенный паттерн');
    });

    test('should reject unknown paths', async () => {
      const result = await validatePathWithCategories('unknown/path/file.txt', 'read');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Путь не соответствует ни одной допустимой категории');
      expect(result.details.suggestions).toContain('Используйте пути в рамках проекта');
    });

    test('should provide suggestions for write action on source code', async () => {
      const result = await validatePathWithCategories('src/components/Button.js', 'write');
      
      expect(result.isValid).toBe(true);
      expect(result.category).toBe('SOURCE_CODE');
      expect(result.details.suggestions).toContain('Рекомендуется использовать .gitignore для защиты исходного кода');
    });

    test('should provide suggestions for delete action on docs config', async () => {
      const result = await validatePathWithCategories('config/settings.json', 'delete');
      
      expect(result.isValid).toBe(true);
      expect(result.category).toBe('DOCS_CONFIG');
      expect(result.details.suggestions).toContain('Внимание: удаление конфигурационных файлов может нарушить работу проекта');
    });

    test('should handle empty path', async () => {
      const result = await validatePathWithCategories('', 'read');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Путь не соответствует ни одной допустимой категории');
    });

    test('should handle whitespace only path', async () => {
      const result = await validatePathWithCategories('   ', 'read');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Путь не соответствует ни одной допустимой категории');
    });

    test('should handle null/undefined path', async () => {
      const result = await validatePathWithCategories(null, 'read');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Путь не может быть null или undefined');
      expect(result.details.suggestions).toContain('Предоставьте корректный строковый путь');
    });
  });

  describe('validateFsParams', () => {
    describe('list action', () => {
      test('should validate valid list parameters', async () => {
        const args = { path: 'src/components' };
        const result = await validateFsParams('list', args);
        
        expect(result.errors).toEqual([]);
        expect(result.validated.path).toBe('src/components');
        expect(result.validated.pathCategory).toBe('SOURCE_CODE');
      });

      test('should reject missing path', async () => {
        const args = {};
        const result = await validateFsParams('list', args);
        
        expect(result.errors).toContain('path: must be a string');
      });

      test('should reject non-string path', async () => {
        const args = { path: 123 };
        const result = await validateFsParams('list', args);
        
        expect(result.errors).toContain('path: must be a string');
      });

      test('should reject empty path', async () => {
        const args = { path: '' };
        const result = await validateFsParams('list', args);
        
        expect(result.errors).toContain('path: cannot be empty');
      });

      test('should reject whitespace only path', async () => {
        const args = { path: '   ' };
        const result = await validateFsParams('list', args);
        
        expect(result.errors).toContain('path: cannot be empty');
      });

      test('should reject invalid path', async () => {
        const args = { path: '/etc/passwd' };
        const result = await validateFsParams('list', args);
        
        expect(result.errors.some(e => e.includes('path: Путь заблокирован'))).toBe(true);
      });
    });

    describe('read action', () => {
      test('should validate valid read parameters', async () => {
        const args = { 
          path: 'src/components/Button.js',
          start: 0,
          end: 100
        };
        const result = await validateFsParams('read', args);
        
        expect(result.errors).toEqual([]);
        expect(result.validated.path).toBe('src/components/Button.js');
        expect(result.validated.start).toBe(0);
        expect(result.validated.end).toBe(100);
      });

      test('should validate read parameters without start/end', async () => {
        const args = { path: 'src/components/Button.js' };
        const result = await validateFsParams('read', args);
        
        expect(result.errors).toEqual([]);
        expect(result.validated.path).toBe('src/components/Button.js');
        expect(result.validated.start).toBeUndefined();
        expect(result.validated.end).toBeUndefined();
      });

      test('should reject invalid start parameter', async () => {
        const args = { 
          path: 'src/components/Button.js',
          start: -1
        };
        const result = await validateFsParams('read', args);
        
        expect(result.errors).toContain('start: must be a non-negative number');
      });

      test('should reject invalid end parameter', async () => {
        const args = { 
          path: 'src/components/Button.js',
          end: 'invalid'
        };
        const result = await validateFsParams('read', args);
        
        expect(result.errors).toContain('end: must be a non-negative number');
      });

      test('should floor numeric parameters', async () => {
        const args = { 
          path: 'src/components/Button.js',
          start: 1.5,
          end: 2.7
        };
        const result = await validateFsParams('read', args);
        
        expect(result.errors).toEqual([]);
        expect(result.validated.start).toBe(1);
        expect(result.validated.end).toBe(2);
      });
    });

    describe('write action', () => {
      test('should validate valid write parameters', async () => {
        const args = { 
          path: 'src/components/Button.js',
          content: 'export default Button;',
          mode: 'append'
        };
        const result = await validateFsParams('write', args);
        
        expect(result.errors).toEqual([]);
        expect(result.validated.path).toBe('src/components/Button.js');
        expect(result.validated.content).toBe('export default Button;');
        expect(result.validated.mode).toBe('append');
      });

      test('should reject missing content', async () => {
        const args = { path: 'src/components/Button.js' };
        const result = await validateFsParams('write', args);
        
        expect(result.errors).toContain('content: must be a string');
      });

      test('should reject non-string content', async () => {
        const args = { 
          path: 'src/components/Button.js',
          content: 123
        };
        const result = await validateFsParams('write', args);
        
        expect(result.errors).toContain('content: must be a string');
      });

      test('should reject non-string mode', async () => {
        const args = { 
          path: 'src/components/Button.js',
          content: 'export default Button;',
          mode: 123
        };
        const result = await validateFsParams('write', args);
        
        expect(result.errors).toContain('mode: must be a string');
      });

      test('should allow undefined mode', async () => {
        const args = { 
          path: 'src/components/Button.js',
          content: 'export default Button;'
        };
        const result = await validateFsParams('write', args);
        
        expect(result.errors).toEqual([]);
        expect(result.validated.mode).toBeUndefined();
      });
    });

    describe('delete action', () => {
      test('should validate valid delete parameters', async () => {
        const args = { 
          path: 'tmp/temp-file.txt',
          recursive: true
        };
        const result = await validateFsParams('delete', args);
        
        expect(result.errors).toEqual([]);
        expect(result.validated.path).toBe('tmp/temp-file.txt');
        expect(result.validated.recursive).toBe(true);
      });

      test('should reject non-boolean recursive', async () => {
        const args = { 
          path: 'tmp/temp-file.txt',
          recursive: 'true'
        };
        const result = await validateFsParams('delete', args);
        
        expect(result.errors).toContain('recursive: must be a boolean');
      });

      test('should allow undefined recursive', async () => {
        const args = { path: 'tmp/temp-file.txt' };
        const result = await validateFsParams('delete', args);
        
        expect(result.errors).toEqual([]);
        expect(result.validated.recursive).toBeUndefined();
      });
    });

    describe('copy action', () => {
      test('should validate valid copy parameters', async () => {
        const args = { 
          source: 'src/components/Button.js',
          destination: 'build/components/Button.js'
        };
        const result = await validateFsParams('copy', args);
        
        expect(result.errors).toEqual([]);
        expect(result.validated.source).toBe('src/components/Button.js');
        expect(result.validated.destination).toBe('build/components/Button.js');
        expect(result.validated.sourceCategory).toBe('SOURCE_CODE');
        expect(result.validated.destinationCategory).toBe('BUILD_DIST');
      });

      test('should reject missing source', async () => {
        const args = { destination: 'build/components/Button.js' };
        const result = await validateFsParams('copy', args);
        
        expect(result.errors).toContain('source: must be a string');
      });

      test('should reject missing destination', async () => {
        const args = { source: 'src/components/Button.js' };
        const result = await validateFsParams('copy', args);
        
        expect(result.errors).toContain('destination: must be a string');
      });

      test('should reject invalid source path', async () => {
        const args = { 
          source: '/etc/passwd',
          destination: 'build/components/Button.js'
        };
        const result = await validateFsParams('copy', args);
        
        expect(result.errors.some(e => e.includes('source: Путь заблокирован'))).toBe(true);
      });

      test('should reject invalid destination path', async () => {
        const args = { 
          source: 'src/components/Button.js',
          destination: '/etc/passwd'
        };
        const result = await validateFsParams('copy', args);
        
        expect(result.errors.some(e => e.includes('destination: Путь заблокирован'))).toBe(true);
      });
    });

    describe('move action', () => {
      test('should validate valid move parameters', async () => {
        const args = { 
          source: 'src/components/Button.js',
          destination: 'build/components/Button.js'
        };
        const result = await validateFsParams('move', args);
        
        expect(result.errors).toEqual([]);
        expect(result.validated.source).toBe('src/components/Button.js');
        expect(result.validated.destination).toBe('build/components/Button.js');
      });

      test('should reject invalid move parameters', async () => {
        const args = { 
          source: '/etc/passwd',
          destination: '/usr/bin/malware'
        };
        const result = await validateFsParams('move', args);
        
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(e => e.includes('source: Путь заблокирован'))).toBe(true);
        expect(result.errors.some(e => e.includes('destination: Путь заблокирован'))).toBe(true);
      });
    });

    describe('unknown action', () => {
      test('should handle unknown action gracefully', async () => {
        const args = { path: 'src/components/Button.js' };
        const result = await validateFsParams('unknown', args);
        
        expect(result.errors).toEqual([]);
        expect(result.validated).toEqual({});
      });
    });
  });

  describe('Integration scenarios', () => {
    test('should handle complete file operation workflow', async () => {
      // Validate read operation
      const readArgs = { path: 'src/components/Button.js', start: 0, end: 100 };
      const readResult = await validateFsParams('read', readArgs);
      
      expect(readResult.errors).toEqual([]);
      expect(readResult.validated.pathCategory).toBe('SOURCE_CODE');

      // Validate write operation
      const writeArgs = { 
        path: 'src/components/Button.js', 
        content: 'export default Button;' 
      };
      const writeResult = await validateFsParams('write', writeArgs);
      
      expect(writeResult.errors).toEqual([]);
      expect(writeResult.validated.pathCategory).toBe('SOURCE_CODE');

      // Validate copy operation
      const copyArgs = { 
        source: 'src/components/Button.js',
        destination: 'build/components/Button.js'
      };
      const copyResult = await validateFsParams('copy', copyArgs);
      
      expect(copyResult.errors).toEqual([]);
      expect(copyResult.validated.sourceCategory).toBe('SOURCE_CODE');
      expect(copyResult.validated.destinationCategory).toBe('BUILD_DIST');
    });

    test('should handle security scenarios', async () => {
      const dangerousPaths = [
        '/etc/passwd',
        '/usr/bin/ls',
        '/var/log/system.log',
        '/proc/cpuinfo',
        '/sys/kernel',
        '/dev/null',
        '/root/.bashrc',
        '/home/user/.ssh/id_rsa',
        'src/../etc/passwd',
        'C:/Windows/System32'
      ];

      for (const dangerousPath of dangerousPaths) {
        const pathResult = await validatePathWithCategories(dangerousPath, 'read');
        expect(pathResult.isValid).toBe(false);
        expect(pathResult.error).toBe('Путь заблокирован: содержит запрещенный паттерн');

        const fsResult = await validateFsParams('read', { path: dangerousPath });
        expect(fsResult.errors.length).toBeGreaterThan(0);
        expect(fsResult.errors.some(e => e.includes('Путь заблокирован'))).toBe(true);
      }
    });

    test('should provide helpful suggestions for invalid paths', async () => {
      const invalidPath = 'unknown/path/file.txt';
      const pathResult = await validatePathWithCategories(invalidPath, 'read');
      
      expect(pathResult.isValid).toBe(false);
      expect(pathResult.details.suggestions).toContain('Используйте пути в рамках проекта');
      expect(pathResult.details.suggestions).toContain('Допустимые категории: WORKSPACE, DOCS_CONFIG, SOURCE_CODE, TESTS, TEMP_LOGS, WORK_REPORTS, ARCHIVE, BUILD_DIST');
      expect(pathResult.details.suggestions).toContain('Примеры: src/, docs/, tests/, work/reports/, tmp/');

      const fsResult = await validateFsParams('read', { path: invalidPath });
      expect(fsResult.errors.some(e => e.includes('Подсказки:'))).toBe(true);
    });
  });
});
