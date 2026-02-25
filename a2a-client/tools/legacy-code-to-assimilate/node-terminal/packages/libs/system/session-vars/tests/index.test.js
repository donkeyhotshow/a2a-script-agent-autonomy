const { 
  sessionVars,
  setSessionVar, 
  getSessionVar, 
  deleteSessionVar, 
  getAllSessionVars, 
  clearSessionVars, 
  hasSessionVar,
  setProjectWorkspace,
  getProjectWorkspace,
  hasProjectWorkspace
} = require('../index.cjs');

describe('SessionVars', () => {
  beforeEach(() => {
    // Clear all session variables before each test
    clearSessionVars();
  });

  describe('setSessionVar', () => {
    test('should set a session variable', () => {
      const result = setSessionVar('test_key', 'test_value');
      
      expect(result.success).toBe(true);
      expect(result.key).toBe('test_key');
      expect(result.value).toBe('test_value');
    });

    test('should overwrite existing session variable', () => {
      setSessionVar('test_key', 'initial_value');
      const result = setSessionVar('test_key', 'updated_value');
      
      expect(result.success).toBe(true);
      expect(result.key).toBe('test_key');
      expect(result.value).toBe('updated_value');
    });

    test('should handle different data types', () => {
      const testCases = [
        { key: 'string', value: 'hello world' },
        { key: 'number', value: 42 },
        { key: 'boolean', value: true },
        { key: 'object', value: { name: 'test', id: 1 } },
        { key: 'array', value: [1, 2, 3, 'test'] },
        { key: 'null', value: null },
        { key: 'undefined', value: undefined }
      ];

      for (const testCase of testCases) {
        const result = setSessionVar(testCase.key, testCase.value);
        expect(result.success).toBe(true);
        expect(result.key).toBe(testCase.key);
        expect(result.value).toBe(testCase.value);
      }
    });

    test('should handle empty string key', () => {
      const result = setSessionVar('', 'test_value');
      
      expect(result.success).toBe(true);
      expect(result.key).toBe('');
      expect(result.value).toBe('test_value');
    });
  });

  describe('getSessionVar', () => {
    test('should get existing session variable', () => {
      setSessionVar('test_key', 'test_value');
      const result = getSessionVar('test_key');
      
      expect(result.success).toBe(true);
      expect(result.key).toBe('test_key');
      expect(result.value).toBe('test_value');
      expect(result.exists).toBe(true);
    });

    test('should return undefined for non-existent variable', () => {
      const result = getSessionVar('non_existent_key');
      
      expect(result.success).toBe(true);
      expect(result.key).toBe('non_existent_key');
      expect(result.value).toBeUndefined();
      expect(result.exists).toBe(false);
    });

    test('should handle null and undefined values', () => {
      setSessionVar('null_key', null);
      setSessionVar('undefined_key', undefined);
      
      const nullResult = getSessionVar('null_key');
      expect(nullResult.value).toBeNull();
      expect(nullResult.exists).toBe(true);
      
      const undefinedResult = getSessionVar('undefined_key');
      expect(undefinedResult.value).toBeUndefined();
      expect(undefinedResult.exists).toBe(true);
    });
  });

  describe('deleteSessionVar', () => {
    test('should delete existing session variable', () => {
      setSessionVar('test_key', 'test_value');
      const result = deleteSessionVar('test_key');
      
      expect(result.success).toBe(true);
      expect(result.key).toBe('test_key');
      expect(result.deleted).toBe(true);
      
      // Verify it's actually deleted
      const getResult = getSessionVar('test_key');
      expect(getResult.exists).toBe(false);
    });

    test('should handle deleting non-existent variable', () => {
      const result = deleteSessionVar('non_existent_key');
      
      expect(result.success).toBe(true);
      expect(result.key).toBe('non_existent_key');
      expect(result.deleted).toBe(false);
    });

    test('should handle deleting multiple variables', () => {
      setSessionVar('key1', 'value1');
      setSessionVar('key2', 'value2');
      setSessionVar('key3', 'value3');
      
      deleteSessionVar('key1');
      deleteSessionVar('key2');
      
      expect(getSessionVar('key1').exists).toBe(false);
      expect(getSessionVar('key2').exists).toBe(false);
      expect(getSessionVar('key3').exists).toBe(true);
    });
  });

  describe('getAllSessionVars', () => {
    test('should return empty object when no variables exist', () => {
      const result = getAllSessionVars();
      
      expect(result.success).toBe(true);
      expect(result.variables).toEqual({});
      expect(result.count).toBe(0);
    });

    test('should return all session variables', () => {
      setSessionVar('key1', 'value1');
      setSessionVar('key2', 'value2');
      setSessionVar('key3', 'value3');
      
      const result = getAllSessionVars();
      
      expect(result.success).toBe(true);
      expect(result.variables).toEqual({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3'
      });
      expect(result.count).toBe(3);
    });

    test('should handle different data types in variables', () => {
      setSessionVar('string', 'hello');
      setSessionVar('number', 42);
      setSessionVar('boolean', true);
      setSessionVar('object', { name: 'test' });
      setSessionVar('array', [1, 2, 3]);
      setSessionVar('null', null);
      
      const result = getAllSessionVars();
      
      expect(result.success).toBe(true);
      expect(result.variables.string).toBe('hello');
      expect(result.variables.number).toBe(42);
      expect(result.variables.boolean).toBe(true);
      expect(result.variables.object).toEqual({ name: 'test' });
      expect(result.variables.array).toEqual([1, 2, 3]);
      expect(result.variables.null).toBeNull();
      expect(result.count).toBe(6);
    });
  });

  describe('clearSessionVars', () => {
    test('should clear all session variables', () => {
      setSessionVar('key1', 'value1');
      setSessionVar('key2', 'value2');
      setSessionVar('key3', 'value3');
      
      const result = clearSessionVars();
      
      expect(result.success).toBe(true);
      expect(result.cleared).toBe(3);
      
      // Verify all variables are cleared
      const getAllResult = getAllSessionVars();
      expect(getAllResult.variables).toEqual({});
      expect(getAllResult.count).toBe(0);
    });

    test('should handle clearing empty session', () => {
      const result = clearSessionVars();
      
      expect(result.success).toBe(true);
      expect(result.cleared).toBe(0);
    });

    test('should allow setting new variables after clearing', () => {
      setSessionVar('old_key', 'old_value');
      clearSessionVars();
      
      setSessionVar('new_key', 'new_value');
      const result = getSessionVar('new_key');
      
      expect(result.exists).toBe(true);
      expect(result.value).toBe('new_value');
    });
  });

  describe('hasSessionVar', () => {
    test('should return true for existing variable', () => {
      setSessionVar('test_key', 'test_value');
      const result = hasSessionVar('test_key');
      
      expect(result.success).toBe(true);
      expect(result.key).toBe('test_key');
      expect(result.exists).toBe(true);
    });

    test('should return false for non-existent variable', () => {
      const result = hasSessionVar('non_existent_key');
      
      expect(result.success).toBe(true);
      expect(result.key).toBe('non_existent_key');
      expect(result.exists).toBe(false);
    });

    test('should return true for null and undefined values', () => {
      setSessionVar('null_key', null);
      setSessionVar('undefined_key', undefined);
      
      expect(hasSessionVar('null_key').exists).toBe(true);
      expect(hasSessionVar('undefined_key').exists).toBe(true);
    });
  });

  describe('Project Workspace Functions', () => {
    const PROJECT_WORKSPACE_KEY = 'project_workspace';

    describe('setProjectWorkspace', () => {
      test('should set project workspace path', () => {
        const path = '/path/to/project';
        const result = setProjectWorkspace(path);
        
        expect(result.success).toBe(true);
        expect(result.key).toBe(PROJECT_WORKSPACE_KEY);
        expect(result.value).toBe(path);
      });

      test('should overwrite existing project workspace', () => {
        setProjectWorkspace('/old/path');
        const result = setProjectWorkspace('/new/path');
        
        expect(result.success).toBe(true);
        expect(result.value).toBe('/new/path');
      });

      test('should handle different path formats', () => {
        const paths = [
          'C:\\path\\to\\project',
          '/path/to/project',
          './relative/path',
          '~/user/project'
        ];

        for (const path of paths) {
          const result = setProjectWorkspace(path);
          expect(result.success).toBe(true);
          expect(result.value).toBe(path);
        }
      });
    });

    describe('getProjectWorkspace', () => {
      test('should return project workspace path when set', () => {
        const path = '/path/to/project';
        setProjectWorkspace(path);
        
        const result = getProjectWorkspace();
        expect(result).toBe(path);
      });

      test('should return null when project workspace is not set', () => {
        const result = getProjectWorkspace();
        expect(result).toBeNull();
      });

      test('should return null after clearing session', () => {
        setProjectWorkspace('/path/to/project');
        clearSessionVars();
        
        const result = getProjectWorkspace();
        expect(result).toBeNull();
      });
    });

    describe('hasProjectWorkspace', () => {
      test('should return true when project workspace is set', () => {
        setProjectWorkspace('/path/to/project');
        
        const result = hasProjectWorkspace();
        expect(result).toBe(true);
      });

      test('should return false when project workspace is not set', () => {
        const result = hasProjectWorkspace();
        expect(result).toBe(false);
      });

      test('should return false after clearing session', () => {
        setProjectWorkspace('/path/to/project');
        clearSessionVars();
        
        const result = hasProjectWorkspace();
        expect(result).toBe(false);
      });
    });
  });

  describe('sessionVars object', () => {
    test('should provide all functions through sessionVars object', () => {
      expect(typeof sessionVars.set).toBe('function');
      expect(typeof sessionVars.get).toBe('function');
      expect(typeof sessionVars.delete).toBe('function');
      expect(typeof sessionVars.getAll).toBe('function');
      expect(typeof sessionVars.clear).toBe('function');
      expect(typeof sessionVars.has).toBe('function');
      expect(typeof sessionVars.setProjectWorkspace).toBe('function');
      expect(typeof sessionVars.getProjectWorkspace).toBe('function');
      expect(typeof sessionVars.hasProjectWorkspace).toBe('function');
    });

    test('should work through sessionVars object', () => {
      sessionVars.set('test_key', 'test_value');
      const result = sessionVars.get('test_key');
      
      expect(result.success).toBe(true);
      expect(result.value).toBe('test_value');
      expect(result.exists).toBe(true);
    });

    test('should handle project workspace through sessionVars object', () => {
      const path = '/path/to/project';
      sessionVars.setProjectWorkspace(path);
      
      expect(sessionVars.getProjectWorkspace()).toBe(path);
      expect(sessionVars.hasProjectWorkspace()).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    test('should handle typical session management workflow', () => {
      // Set multiple variables
      setSessionVar('user_id', 123);
      setSessionVar('username', 'testuser');
      setSessionVar('session_id', 'abc123');
      setProjectWorkspace('/path/to/project');
      
      // Verify all variables exist
      expect(hasSessionVar('user_id').exists).toBe(true);
      expect(hasSessionVar('username').exists).toBe(true);
      expect(hasSessionVar('session_id').exists).toBe(true);
      expect(hasProjectWorkspace()).toBe(true);
      
      // Get all variables
      const allVars = getAllSessionVars();
      expect(allVars.count).toBe(4); // 3 + project_workspace
      expect(allVars.variables.user_id).toBe(123);
      expect(allVars.variables.username).toBe('testuser');
      expect(allVars.variables.session_id).toBe('abc123');
      expect(allVars.variables.project_workspace).toBe('/path/to/project');
      
      // Update a variable
      setSessionVar('username', 'updateduser');
      expect(getSessionVar('username').value).toBe('updateduser');
      
      // Delete a variable
      deleteSessionVar('session_id');
      expect(hasSessionVar('session_id').exists).toBe(false);
      
      // Clear all and verify
      clearSessionVars();
      expect(getAllSessionVars().count).toBe(0);
      expect(hasProjectWorkspace()).toBe(false);
    });

    test('should handle concurrent operations', () => {
      // Simulate concurrent operations
      setSessionVar('counter', 0);
      
      // Multiple set operations
      setSessionVar('counter', 1);
      setSessionVar('counter', 2);
      setSessionVar('counter', 3);
      
      expect(getSessionVar('counter').value).toBe(3);
      
      // Multiple get operations
      const result1 = getSessionVar('counter');
      const result2 = getSessionVar('counter');
      const result3 = getSessionVar('counter');
      
      expect(result1.value).toBe(3);
      expect(result2.value).toBe(3);
      expect(result3.value).toBe(3);
    });

    test('should handle edge cases', () => {
      // Empty string key
      setSessionVar('', 'empty_key_value');
      expect(getSessionVar('').value).toBe('empty_key_value');
      
      // Special characters in key
      setSessionVar('key.with.dots', 'dot_value');
      setSessionVar('key-with-dashes', 'dash_value');
      setSessionVar('key_with_underscores', 'underscore_value');
      
      expect(getSessionVar('key.with.dots').value).toBe('dot_value');
      expect(getSessionVar('key-with-dashes').value).toBe('dash_value');
      expect(getSessionVar('key_with_underscores').value).toBe('underscore_value');
      
      // Large values
      const largeValue = 'x'.repeat(10000);
      setSessionVar('large_key', largeValue);
      expect(getSessionVar('large_key').value).toBe(largeValue);
    });
  });
});
