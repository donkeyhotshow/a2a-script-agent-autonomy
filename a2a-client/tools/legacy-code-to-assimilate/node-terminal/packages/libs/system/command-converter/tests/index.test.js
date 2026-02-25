const { CommandConverter, commandConverter } = require('../index.cjs');

describe('CommandConverter', () => {
  let converter;

  beforeEach(() => {
    converter = new CommandConverter();
  });

  describe('constructor', () => {
    test('should create instance with command map', () => {
      expect(converter).toBeInstanceOf(CommandConverter);
      expect(converter.commandMap).toBeInstanceOf(Map);
      expect(converter.commandMap.size).toBeGreaterThan(0);
    });

    test('should setup command map on initialization', () => {
      expect(converter.commandMap.has('set_project_workspace')).toBe(true);
      expect(converter.commandMap.has('get_project_workspace')).toBe(true);
      expect(converter.commandMap.has('set_mode')).toBe(true);
      expect(converter.commandMap.has('get_mode')).toBe(true);
    });
  });

  describe('setupCommandMap', () => {
    test('should setup workspace commands', () => {
      const setWorkspace = converter.commandMap.get('set_project_workspace');
      expect(setWorkspace).toBeDefined();
      expect(setWorkspace.tool).toBe('terminal');
      expect(setWorkspace.action).toBe('workspace');
      expect(setWorkspace.subAction).toBe('set');
      expect(typeof setWorkspace.paramMap).toBe('function');
      expect(setWorkspace.description).toBe('Устанавливает рабочую директорию проекта');

      const getWorkspace = converter.commandMap.get('get_project_workspace');
      expect(getWorkspace).toBeDefined();
      expect(getWorkspace.tool).toBe('terminal');
      expect(getWorkspace.action).toBe('workspace');
      expect(getWorkspace.subAction).toBe('get');
    });

    test('should setup mode commands', () => {
      const setMode = converter.commandMap.get('set_mode');
      expect(setMode).toBeDefined();
      expect(setMode.tool).toBe('terminal');
      expect(setMode.action).toBe('mode');
      expect(setMode.subAction).toBe('set');

      const getMode = converter.commandMap.get('get_mode');
      expect(getMode).toBeDefined();
      expect(getMode.tool).toBe('terminal');
      expect(getMode.action).toBe('mode');
      expect(getMode.subAction).toBe('get');
    });

    test('should setup history commands', () => {
      const showHistory = converter.commandMap.get('show_history');
      expect(showHistory).toBeDefined();
      expect(showHistory.tool).toBe('terminal');
      expect(showHistory.action).toBe('history');
    });

    test('should setup file commands', () => {
      const listFiles = converter.commandMap.get('list_files');
      expect(listFiles).toBeDefined();
      expect(listFiles.tool).toBe('file');
      expect(listFiles.action).toBe('list');

      const readFile = converter.commandMap.get('read_file');
      expect(readFile).toBeDefined();
      expect(readFile.tool).toBe('file');
      expect(readFile.action).toBe('read');
    });

    test('should setup search commands', () => {
      const searchCode = converter.commandMap.get('search_code');
      expect(searchCode).toBeDefined();
      expect(searchCode.tool).toBe('search');
      expect(searchCode.action).toBe('find');
    });

    test('should setup test commands', () => {
      const testSecurity = converter.commandMap.get('test_security');
      expect(testSecurity).toBeDefined();
      expect(testSecurity.tool).toBe('test');
      expect(testSecurity.action).toBe('security');
    });

    test('should setup feedback commands', () => {
      const addSuggestion = converter.commandMap.get('add_suggestion');
      expect(addSuggestion).toBeDefined();
      expect(addSuggestion.tool).toBe('feedback');
      expect(addSuggestion.action).toBe('add');

      const listSuggestions = converter.commandMap.get('list_suggestions');
      expect(listSuggestions).toBeDefined();
      expect(listSuggestions.tool).toBe('feedback');
      expect(listSuggestions.action).toBe('list');
    });

    test('should setup atomic operation commands', () => {
      const atomicListSets = converter.commandMap.get('atomic_list_sets');
      expect(atomicListSets).toBeDefined();
      expect(atomicListSets.tool).toBe('atomic');
      expect(atomicListSets.action).toBe('list_sets');

      const atomicShowSet = converter.commandMap.get('atomic_show_set');
      expect(atomicShowSet).toBeDefined();
      expect(atomicShowSet.tool).toBe('atomic');
      expect(atomicShowSet.action).toBe('show_set');

      const atomicExecuteSet = converter.commandMap.get('atomic_execute_set');
      expect(atomicExecuteSet).toBeDefined();
      expect(atomicExecuteSet.tool).toBe('atomic');
      expect(atomicExecuteSet.action).toBe('execute_set');
    });
  });

  describe('extractCommandName', () => {
    test('should extract command name from simple command', () => {
      expect(converter.extractCommandName('set_project_workspace')).toBe('set_project_workspace');
    });

    test('should extract command name from command with arguments', () => {
      expect(converter.extractCommandName('set_project_workspace /path/to/project')).toBe('set_project_workspace');
    });

    test('should extract command name with multiple spaces', () => {
      expect(converter.extractCommandName('  set_project_workspace   /path/to/project  ')).toBe('set_project_workspace');
    });

    test('should handle empty string', () => {
      expect(converter.extractCommandName('')).toBe('');
    });

    test('should handle whitespace only', () => {
      expect(converter.extractCommandName('   ')).toBe('');
    });
  });

  describe('extractArguments', () => {
    test('should extract arguments from command', () => {
      expect(converter.extractArguments('set_project_workspace /path/to/project')).toEqual(['/path/to/project']);
    });

    test('should extract multiple arguments', () => {
      expect(converter.extractArguments('read_file file.txt 1 10')).toEqual(['file.txt', '1', '10']);
    });

    test('should return empty array for command without arguments', () => {
      expect(converter.extractArguments('get_project_workspace')).toEqual([]);
    });

    test('should handle multiple spaces', () => {
      expect(converter.extractArguments('  set_project_workspace   /path/to/project  ')).toEqual(['/path/to/project']);
    });

    test('should handle empty string', () => {
      expect(converter.extractArguments('')).toEqual([]);
    });

    test('should handle whitespace only', () => {
      expect(converter.extractArguments('   ')).toEqual([]);
    });
  });

  describe('convertToMCPTool', () => {
    test('should convert set_project_workspace command', () => {
      const result = converter.convertToMCPTool('set_project_workspace /path/to/project');
      
      expect(result).toEqual({
        tool: 'terminal',
        action: 'workspace',
        subAction: 'set',
        params: { workspace: '/path/to/project' },
        description: 'Устанавливает рабочую директорию проекта',
        originalCommand: 'set_project_workspace /path/to/project'
      });
    });

    test('should convert get_project_workspace command', () => {
      const result = converter.convertToMCPTool('get_project_workspace');
      
      expect(result).toEqual({
        tool: 'terminal',
        action: 'workspace',
        subAction: 'get',
        params: {},
        description: 'Получает текущую рабочую директорию проекта',
        originalCommand: 'get_project_workspace'
      });
    });

    test('should convert set_mode command', () => {
      const result = converter.convertToMCPTool('set_mode debug');
      
      expect(result).toEqual({
        tool: 'terminal',
        action: 'mode',
        subAction: 'set',
        params: { mode: 'debug' },
        description: 'Устанавливает режим работы',
        originalCommand: 'set_mode debug'
      });
    });

    test('should convert read_file command with arguments', () => {
      const result = converter.convertToMCPTool('read_file file.txt 1 10');
      
      expect(result).toEqual({
        tool: 'file',
        action: 'read',
        subAction: undefined,
        params: {
          path: 'file.txt',
          start: 1,
          end: 10
        },
        description: 'Читает содержимое файла',
        originalCommand: 'read_file file.txt 1 10'
      });
    });

    test('should convert read_file command without optional arguments', () => {
      const result = converter.convertToMCPTool('read_file file.txt');
      
      expect(result).toEqual({
        tool: 'file',
        action: 'read',
        subAction: undefined,
        params: {
          path: 'file.txt',
          start: undefined,
          end: undefined
        },
        description: 'Читает содержимое файла',
        originalCommand: 'read_file file.txt'
      });
    });

    test('should convert list_files command with default path', () => {
      const result = converter.convertToMCPTool('list_files');
      
      expect(result).toEqual({
        tool: 'file',
        action: 'list',
        subAction: undefined,
        params: { path: '.' },
        description: 'Список файлов в директории',
        originalCommand: 'list_files'
      });
    });

    test('should convert search_code command', () => {
      const result = converter.convertToMCPTool('search_code function');
      
      expect(result).toEqual({
        tool: 'search',
        action: 'find',
        subAction: undefined,
        params: {
          query: 'function',
          include_pattern: '*',
          exclude_pattern: undefined
        },
        description: 'Поиск по коду',
        originalCommand: 'search_code function'
      });
    });

    test('should convert search_code command with patterns', () => {
      const result = converter.convertToMCPTool('search_code function *.js node_modules');
      
      expect(result).toEqual({
        tool: 'search',
        action: 'find',
        subAction: undefined,
        params: {
          query: 'function',
          include_pattern: '*.js',
          exclude_pattern: 'node_modules'
        },
        description: 'Поиск по коду',
        originalCommand: 'search_code function *.js node_modules'
      });
    });

    test('should convert add_suggestion command', () => {
      const result = converter.convertToMCPTool('add_suggestion "Improve error handling" feature high');
      
      expect(result).toEqual({
        tool: 'feedback',
        action: 'add',
        subAction: undefined,
        params: {
          suggestion: '"Improve error handling"',
          category: 'feature',
          priority: 'high'
        },
        description: 'Добавляет предложение',
        originalCommand: 'add_suggestion "Improve error handling" feature high'
      });
    });

    test('should convert atomic commands', () => {
      const result = converter.convertToMCPTool('atomic_show_set cleanup');
      
      expect(result).toEqual({
        tool: 'atomic',
        action: 'show_set',
        subAction: undefined,
        params: { set: 'cleanup' },
        description: 'Показать детали набора атомарных операций',
        originalCommand: 'atomic_show_set cleanup'
      });
    });

    test('should return null for unknown command', () => {
      const result = converter.convertToMCPTool('unknown_command');
      expect(result).toBeNull();
    });

    test('should handle empty command', () => {
      const result = converter.convertToMCPTool('');
      expect(result).toBeNull();
    });

    test('should handle whitespace only', () => {
      const result = converter.convertToMCPTool('   ');
      expect(result).toBeNull();
    });
  });

  describe('validateCommand', () => {
    test('should validate known command', () => {
      const result = converter.validateCommand('set_project_workspace /path/to/project');
      
      expect(result.valid).toBe(true);
      expect(result.mapping).toBeDefined();
      expect(result.args).toEqual(['/path/to/project']);
    });

    test('should validate command without arguments', () => {
      const result = converter.validateCommand('get_project_workspace');
      
      expect(result.valid).toBe(true);
      expect(result.mapping).toBeDefined();
      expect(result.args).toEqual([]);
    });

    test('should reject unknown command', () => {
      const result = converter.validateCommand('unknown_command');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Команда 'unknown_command' не поддерживается");
    });

    test('should handle empty command', () => {
      const result = converter.validateCommand('');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Команда '' не поддерживается");
    });

    test('should handle whitespace only', () => {
      const result = converter.validateCommand('   ');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Команда '' не поддерживается");
    });
  });

  describe('Static methods', () => {
    describe('convertCommand', () => {
      test('should convert command and add converted flag', () => {
        const result = CommandConverter.convertCommand('set_project_workspace /path/to/project');
        
        expect(result.converted).toBe(true);
        expect(result.tool).toBe('terminal');
        expect(result.action).toBe('workspace');
      });

      test('should return converted false for unknown command', () => {
        const result = CommandConverter.convertCommand('unknown_command');
        
        expect(result.converted).toBe(false);
      });
    });

    describe('isEmulatedCommand', () => {
      test('should return true for known command', () => {
        expect(CommandConverter.isEmulatedCommand('set_project_workspace')).toBe(true);
        expect(CommandConverter.isEmulatedCommand('get_project_workspace')).toBe(true);
        expect(CommandConverter.isEmulatedCommand('set_mode')).toBe(true);
      });

      test('should return false for unknown command', () => {
        expect(CommandConverter.isEmulatedCommand('unknown_command')).toBe(false);
      });

      test('should handle command with arguments', () => {
        expect(CommandConverter.isEmulatedCommand('set_project_workspace /path/to/project')).toBe(true);
      });
    });

    describe('listEmulatedCommands', () => {
      test('should return list of all emulated commands', () => {
        const commands = CommandConverter.listEmulatedCommands();
        
        expect(Array.isArray(commands)).toBe(true);
        expect(commands.length).toBeGreaterThan(0);
        
        // Check structure of each command
        for (const command of commands) {
          expect(command).toHaveProperty('name');
          expect(command).toHaveProperty('description');
          expect(command).toHaveProperty('tool');
          expect(command).toHaveProperty('action');
        }
        
        // Check for specific commands
        const commandNames = commands.map(cmd => cmd.name);
        expect(commandNames).toContain('set_project_workspace');
        expect(commandNames).toContain('get_project_workspace');
        expect(commandNames).toContain('set_mode');
        expect(commandNames).toContain('get_mode');
      });
    });
  });

  describe('Global instance', () => {
    test('should export global commandConverter instance', () => {
      expect(commandConverter).toBeInstanceOf(CommandConverter);
      expect(commandConverter.commandMap.size).toBeGreaterThan(0);
    });

    test('should work with global instance', () => {
      const result = commandConverter.convertToMCPTool('set_project_workspace /path/to/project');
      
      expect(result).toBeDefined();
      expect(result.tool).toBe('terminal');
      expect(result.action).toBe('workspace');
    });
  });

  describe('Integration scenarios', () => {
    test('should handle typical workflow', () => {
      // Validate command
      const validation = converter.validateCommand('set_project_workspace /path/to/project');
      expect(validation.valid).toBe(true);
      
      // Convert command
      const conversion = converter.convertToMCPTool('set_project_workspace /path/to/project');
      expect(conversion).toBeDefined();
      expect(conversion.tool).toBe('terminal');
      
      // Check if it's emulated
      const isEmulated = CommandConverter.isEmulatedCommand('set_project_workspace');
      expect(isEmulated).toBe(true);
    });

    test('should handle multiple command types', () => {
      const commands = [
        'set_project_workspace /path/to/project',
        'get_project_workspace',
        'set_mode debug',
        'read_file file.txt',
        'list_files',
        'search_code function',
        'add_suggestion "Test suggestion"'
      ];

      for (const command of commands) {
        const validation = converter.validateCommand(command);
        expect(validation.valid).toBe(true);
        
        const conversion = converter.convertToMCPTool(command);
        expect(conversion).toBeDefined();
        expect(conversion.originalCommand).toBe(command);
      }
    });

    test('should handle error scenarios', () => {
      const invalidCommands = [
        'unknown_command',
        '',
        '   ',
        'command_with_invalid_args'
      ];

      for (const command of invalidCommands) {
        const validation = converter.validateCommand(command);
        expect(validation.valid).toBe(false);
        
        const conversion = converter.convertToMCPTool(command);
        expect(conversion).toBeNull();
      }
    });
  });
});
