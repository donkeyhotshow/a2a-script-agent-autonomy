const {
  MCPHandlersManager,
  BaseToolHandler,
  TerminalHandler,
  FileHandler,
  SearchHandler,
  HandlerState,
  ToolType,
  HandlerError,
  ValidationError,
  SecurityError
} = require('../index.js');

// TODO: Создать полные тесты для MCP Terminal Handlers
describe('MCP Terminal Handlers', () => {
  let mockServer;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    mockServer = {
      logger: mockLogger,
      config: {
        security: {
          maxCommandLength: 10000,
          timeout: 30000
        }
      },
      commandExecutor: {
        execute: jest.fn()
      },
      securityAnalyzer: {
        analyzeCommand: jest.fn()
      },
      fileUtils: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        listFiles: jest.fn()
      },
      pathUtils: {
        validatePath: jest.fn()
      },
      searchEngine: {
        searchText: jest.fn()
      }
    };
  });

  describe('HandlerState constants', () => {
    test('should have correct state values', () => {
      expect(HandlerState.PENDING).toBe('pending');
      expect(HandlerState.PROCESSING).toBe('processing');
      expect(HandlerState.COMPLETED).toBe('completed');
      expect(HandlerState.FAILED).toBe('failed');
      expect(HandlerState.CANCELLED).toBe('cancelled');
    });

    test('should have unique state values', () => {
      const states = Object.values(HandlerState);
      const uniqueStates = new Set(states);
      expect(uniqueStates.size).toBe(states.length);
    });

    test('should have all required states', () => {
      const requiredStates = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
      requiredStates.forEach(state => {
        expect(Object.values(HandlerState)).toContain(state);
      });
    });
  });

  describe('ToolType constants', () => {
    test('should have correct tool type values', () => {
      expect(ToolType.TERMINAL).toBe('terminal');
      expect(ToolType.FILE).toBe('file');
      expect(ToolType.SEARCH).toBe('search');
      expect(ToolType.ARCHIVE).toBe('archive');
      expect(ToolType.ATOMIC).toBe('atomic');
      expect(ToolType.POWERSHELL).toBe('powershell');
      expect(ToolType.INTERCEPTOR).toBe('interceptor');
      expect(ToolType.TEST).toBe('test');
    });

    test('should have unique tool type values', () => {
      const toolTypes = Object.values(ToolType);
      const uniqueToolTypes = new Set(toolTypes);
      expect(uniqueToolTypes.size).toBe(toolTypes.length);
    });

    test('should have all required tool types', () => {
      const requiredTypes = ['terminal', 'file', 'search', 'archive', 'atomic', 'powershell', 'interceptor', 'test'];
      requiredTypes.forEach(type => {
        expect(Object.values(ToolType)).toContain(type);
      });
    });
  });

  describe('Error classes', () => {
    test('should create HandlerError with correct properties', () => {
      const error = new HandlerError('Test error', 'TEST_CODE', 400, { field: 'test' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'test' });
      expect(error).toBeInstanceOf(Error);
    });

    test('should create HandlerError with default values', () => {
      const error = new HandlerError('Default error');
      expect(error.code).toBe('HANDLER_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({});
    });

    test('should create ValidationError', () => {
      const error = new ValidationError('Invalid field', 'email');

      expect(error.message).toBe('Invalid field');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.field).toBe('email');
      expect(error).toBeInstanceOf(HandlerError);
    });

    test('should create ValidationError without field', () => {
      const error = new ValidationError('General validation error');
      expect(error.field).toBeNull();
    });

    test('should create SecurityError', () => {
      const error = new SecurityError('Access denied', 'unauthorized');

      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('SECURITY_ERROR');
      expect(error.details).toEqual({ reason: 'unauthorized' });
      expect(error).toBeInstanceOf(HandlerError);
    });

    test('should create SecurityError with default reason', () => {
      const error = new SecurityError('Security violation');
      expect(error.details).toEqual({ reason: 'security_violation' });
    });

    test('should have correct error inheritance chain', () => {
      const handlerError = new HandlerError('Handler error');
      const validationError = new ValidationError('Validation error');
      const securityError = new SecurityError('Security error');

      expect(validationError).toBeInstanceOf(HandlerError);
      expect(securityError).toBeInstanceOf(HandlerError);
      expect(handlerError).toBeInstanceOf(Error);
    });
  });

  describe('BaseToolHandler', () => {
    let baseHandler;

    beforeEach(() => {
      baseHandler = new BaseToolHandler(mockServer, 'test-handler');
    });

    test('should initialize with correct properties', () => {
      expect(baseHandler.server).toBe(mockServer);
      expect(baseHandler.name).toBe('test-handler');
      expect(baseHandler.logger).toBe(mockLogger);
      expect(baseHandler.state).toBe(HandlerState.PENDING);
    });

    test('should initialize with config from server', () => {
      expect(baseHandler.config).toBe(mockServer.config);
    });

    test('should be an EventEmitter', () => {
      expect(baseHandler).toBeInstanceOf(require('events').EventEmitter);
    });

    test('should return empty tools array by default', () => {
      const tools = baseHandler.getTools();
      expect(tools).toEqual([]);
    });

    test('should validate params with default implementation', () => {
      const result = baseHandler.validateParams({ test: 'value' });
      expect(result).toEqual({ valid: true, errors: [] });
    });

    test('should validate empty params', () => {
      const result = baseHandler.validateParams({});
      expect(result).toEqual({ valid: true, errors: [] });
    });

    test('should validate null params', () => {
      const result = baseHandler.validateParams(null);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    test('should throw error for unimplemented handleRequest', async () => {
      await expect(baseHandler.handleRequest('id', {})).rejects.toThrow(
        'Handler test-handler must implement handleRequest'
      );
    });

    test('should return status information', () => {
      const status = baseHandler.getStatus();
      expect(status).toHaveProperty('name', 'test-handler');
      expect(status).toHaveProperty('state', HandlerState.PENDING);
      expect(status).toHaveProperty('uptime');
      expect(typeof status.uptime).toBe('number');
    });

    test('should update state and return updated status', () => {
      baseHandler.state = HandlerState.PROCESSING;
      const status = baseHandler.getStatus();
      expect(status.state).toBe(HandlerState.PROCESSING);
    });

    test('should cleanup resources', async () => {
      await baseHandler.cleanup();
      expect(baseHandler.state).toBe(HandlerState.CANCELLED);
    });

    test('should emit events during lifecycle', (done) => {
      baseHandler.on('stateChanged', (newState) => {
        expect(newState).toBe(HandlerState.PROCESSING);
        done();
      });

      baseHandler.state = HandlerState.PROCESSING;
    });

    test('should handle multiple state changes', () => {
      const stateChanges = [];
      baseHandler.on('stateChanged', (newState) => {
        stateChanges.push(newState);
      });

      baseHandler.state = HandlerState.PROCESSING;
      baseHandler.state = HandlerState.COMPLETED;
      baseHandler.state = HandlerState.FAILED;

      expect(stateChanges).toEqual([
        HandlerState.PROCESSING,
        HandlerState.COMPLETED,
        HandlerState.FAILED
      ]);
    });
  });

  describe('TerminalHandler', () => {
    let terminalHandler;

    beforeEach(() => {
      terminalHandler = new TerminalHandler(mockServer);
    });

    test('should initialize with server dependencies', () => {
      expect(terminalHandler.commandExecutor).toBe(mockServer.commandExecutor);
      expect(terminalHandler.securityAnalyzer).toBe(mockServer.securityAnalyzer);
    });

    test('should extend BaseToolHandler', () => {
      expect(terminalHandler).toBeInstanceOf(BaseToolHandler);
    });

    test('should have correct handler name', () => {
      expect(terminalHandler.name).toBe('terminal');
    });

    describe('getTools', () => {
      test('should return terminal tools', () => {
        const tools = terminalHandler.getTools();
        expect(tools).toHaveLength(1);
        expect(tools[0].name).toBe('terminal_exec');
        expect(tools[0].inputSchema).toBeDefined();
      });

      test('should have correct tool structure', () => {
        const tools = terminalHandler.getTools();
        const tool = tools[0];
        
        expect(tool).toHaveProperty('name', 'terminal_exec');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool).toHaveProperty('handler', 'terminal');
      });

      test('should have valid input schema', () => {
        const tools = terminalHandler.getTools();
        const schema = tools[0].inputSchema;
        
        expect(schema).toHaveProperty('type', 'object');
        expect(schema).toHaveProperty('properties');
        expect(schema.properties).toHaveProperty('action');
        expect(schema.properties).toHaveProperty('command');
        expect(schema.properties).toHaveProperty('cwd');
        expect(schema.properties).toHaveProperty('timeout');
        expect(schema.properties).toHaveProperty('is_background');
      });
    });

    describe('validateParams', () => {
      test('should validate valid exec parameters', () => {
        const params = {
          action: 'exec',
          command: 'echo hello',
          cwd: '/tmp',
          timeout: 5000,
          is_background: false
        };

        const result = terminalHandler.validateParams(params);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      test('should validate help action', () => {
        const result = terminalHandler.validateParams({ action: 'help' });
        expect(result.valid).toBe(true);
      });

      test('should reject invalid actions', () => {
        const result = terminalHandler.validateParams({ action: 'invalid' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Action is required');
      });

      test('should reject missing action', () => {
        const result = terminalHandler.validateParams({ command: 'test' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Action is required');
      });

      test('should require command for exec action', () => {
        const result = terminalHandler.validateParams({ action: 'exec' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Command is required for exec action');
      });

      test('should require command for exec action with empty string', () => {
        const result = terminalHandler.validateParams({ action: 'exec', command: '' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Command is required for exec action');
      });

      test('should validate timeout range - minimum', () => {
        const result = terminalHandler.validateParams({
          action: 'exec',
          command: 'test',
          timeout: 0
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Timeout must be between 1 and 300000 ms');
      });

      test('should validate timeout range - maximum', () => {
        const result = terminalHandler.validateParams({
          action: 'exec',
          command: 'test',
          timeout: 300001
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Timeout must be between 1 and 300000 ms');
      });

      test('should validate valid timeout values', () => {
        const validTimeouts = [1, 1000, 300000];
        
        validTimeouts.forEach(timeout => {
          const result = terminalHandler.validateParams({
            action: 'exec',
            command: 'test',
            timeout
          });
          expect(result.valid).toBe(true);
        });
      });

      test('should validate command length', () => {
        const longCommand = 'a'.repeat(10001);
        const result = terminalHandler.validateParams({
          action: 'exec',
          command: longCommand
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Command length exceeds maximum of 10000 characters');
      });

      test('should validate command length boundary', () => {
        const maxLengthCommand = 'a'.repeat(10000);
        const result = terminalHandler.validateParams({
          action: 'exec',
          command: maxLengthCommand
        });
        expect(result.valid).toBe(true);
      });

      test('should validate cwd parameter', () => {
        const result = terminalHandler.validateParams({
          action: 'exec',
          command: 'test',
          cwd: '/valid/path'
        });
        expect(result.valid).toBe(true);
      });

      test('should validate is_background parameter', () => {
        const result = terminalHandler.validateParams({
          action: 'exec',
          command: 'test',
          is_background: true
        });
        expect(result.valid).toBe(true);
      });

      test('should handle multiple validation errors', () => {
        const result = terminalHandler.validateParams({
          action: 'invalid',
          command: 'a'.repeat(10001),
          timeout: 0
        });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });

      test('should validate null parameters', () => {
        const result = terminalHandler.validateParams(null);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Action is required');
      });

      test('should validate empty parameters', () => {
        const result = terminalHandler.validateParams({});
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Action is required');
      });
    });

    describe('handleRequest', () => {
      test('should handle exec action', async () => {
        const mockResult = {
          success: true,
          stdout: 'Hello World',
          stderr: '',
          exitCode: 0,
          duration: 100,
          metadata: { pid: 123 }
        };

        mockServer.commandExecutor.execute.mockResolvedValue(mockResult);
        mockServer.securityAnalyzer.analyzeCommand.mockResolvedValue({ safe: true });

        const args = {
          action: 'exec',
          command: 'echo "Hello World"',
          cwd: '/tmp',
          timeout: 5000
        };

        const result = await terminalHandler.handleRequest('test-id', args);

        expect(mockServer.securityAnalyzer.analyzeCommand).toHaveBeenCalledWith('echo "Hello World"');
        expect(mockServer.commandExecutor.execute).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.stdout).toBe('Hello World');
      });

      test('should handle exec action with background flag', async () => {
        const mockResult = {
          success: true,
          stdout: 'Background task',
          stderr: '',
          exitCode: 0,
          duration: 50,
          metadata: { pid: 456, background: true }
        };

        mockServer.commandExecutor.execute.mockResolvedValue(mockResult);
        mockServer.securityAnalyzer.analyzeCommand.mockResolvedValue({ safe: true });

        const args = {
          action: 'exec',
          command: 'sleep 10',
          is_background: true
        };

        const result = await terminalHandler.handleRequest('test-id', args);

        expect(result.success).toBe(true);
        expect(result.metadata.background).toBe(true);
      });

      test('should handle help action', async () => {
        const result = await terminalHandler.handleRequest('test-id', { action: 'help' });
        expect(result.help).toContain('Terminal Handler Commands');
        expect(result.success).toBe(true);
      });

      test('should throw SecurityError for unsafe commands', async () => {
        mockServer.securityAnalyzer.analyzeCommand.mockResolvedValue({
          safe: false,
          reason: 'dangerous_command'
        });

        const args = {
          action: 'exec',
          command: 'rm -rf /'
        };

        await expect(terminalHandler.handleRequest('test-id', args)).rejects.toThrow(SecurityError);
      });

      test('should throw SecurityError with correct details', async () => {
        mockServer.securityAnalyzer.analyzeCommand.mockResolvedValue({
          safe: false,
          reason: 'path_traversal'
        });

        const args = {
          action: 'exec',
          command: 'cat ../../../etc/passwd'
        };

        try {
          await terminalHandler.handleRequest('test-id', args);
        } catch (error) {
          expect(error).toBeInstanceOf(SecurityError);
          expect(error.details.reason).toBe('path_traversal');
        }
      });

      test('should throw ValidationError for invalid parameters', async () => {
        const args = { action: 'invalid' };

        await expect(terminalHandler.handleRequest('test-id', args)).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for missing command', async () => {
        const args = { action: 'exec' };

        await expect(terminalHandler.handleRequest('test-id', args)).rejects.toThrow(ValidationError);
      });

      test('should handle command execution failure', async () => {
        const mockResult = {
          success: false,
          stdout: '',
          stderr: 'Command not found',
          exitCode: 127,
          duration: 10,
          metadata: { pid: 789 }
        };

        mockServer.commandExecutor.execute.mockResolvedValue(mockResult);
        mockServer.securityAnalyzer.analyzeCommand.mockResolvedValue({ safe: true });

        const args = {
          action: 'exec',
          command: 'nonexistent_command'
        };

        const result = await terminalHandler.handleRequest('test-id', args);

        expect(result.success).toBe(false);
        expect(result.exitCode).toBe(127);
        expect(result.stderr).toContain('Command not found');
      });

      test('should handle security analyzer failure', async () => {
        mockServer.securityAnalyzer.analyzeCommand.mockRejectedValue(new Error('Security service unavailable'));

        const args = {
          action: 'exec',
          command: 'echo test'
        };

        await expect(terminalHandler.handleRequest('test-id', args)).rejects.toThrow('Security service unavailable');
      });

      test('should handle command executor failure', async () => {
        mockServer.securityAnalyzer.analyzeCommand.mockResolvedValue({ safe: true });
        mockServer.commandExecutor.execute.mockRejectedValue(new Error('Execution failed'));

        const args = {
          action: 'exec',
          command: 'echo test'
        };

        await expect(terminalHandler.handleRequest('test-id', args)).rejects.toThrow('Execution failed');
      });

      test('should update handler state during execution', async () => {
        const mockResult = {
          success: true,
          stdout: 'test',
          stderr: '',
          exitCode: 0,
          duration: 10,
          metadata: { pid: 123 }
        };

        mockServer.commandExecutor.execute.mockResolvedValue(mockResult);
        mockServer.securityAnalyzer.analyzeCommand.mockResolvedValue({ safe: true });

        const args = {
          action: 'exec',
          command: 'echo test'
        };

        const originalState = terminalHandler.state;
        await terminalHandler.handleRequest('test-id', args);
        
        // State should be restored after execution
        expect(terminalHandler.state).toBe(originalState);
      });
    });

    describe('handleExec', () => {
      test('should execute command with correct parameters', async () => {
        const mockResult = {
          success: true,
          stdout: 'output',
          stderr: '',
          exitCode: 0,
          duration: 50,
          metadata: { pid: 456, cwd: '/tmp' }
        };

        mockServer.commandExecutor.execute.mockResolvedValue(mockResult);

        const result = await terminalHandler.handleExec('test-id', {
          command: 'ls -la',
          cwd: '/tmp',
          timeout: 10000,
          is_background: true
        });

        expect(mockServer.commandExecutor.execute).toHaveBeenCalledWith({
          command: 'ls -la',
          cwd: '/tmp',
          timeout: 10000,
          env: expect.objectContaining({ BACKGROUND: '1' })
        });

        expect(result.success).toBe(true);
        expect(result.metadata.cwd).toBe('/tmp');
      });

      test('should execute command without background flag', async () => {
        const mockResult = {
          success: true,
          stdout: 'foreground output',
          stderr: '',
          exitCode: 0,
          duration: 30,
          metadata: { pid: 789 }
        };

        mockServer.commandExecutor.execute.mockResolvedValue(mockResult);

        const result = await terminalHandler.handleExec('test-id', {
          command: 'echo "foreground"',
          timeout: 5000
        });

        expect(mockServer.commandExecutor.execute).toHaveBeenCalledWith({
          command: 'echo "foreground"',
          timeout: 5000,
          env: expect.not.objectContaining({ BACKGROUND: '1' })
        });

        expect(result.success).toBe(true);
        expect(result.stdout).toBe('foreground output');
      });

      test('should handle command execution failure', async () => {
        const mockResult = {
          success: false,
          stdout: '',
          stderr: 'Permission denied',
          exitCode: 13,
          duration: 5,
          metadata: { pid: 123 }
        };

        mockServer.commandExecutor.execute.mockResolvedValue(mockResult);

        const result = await terminalHandler.handleExec('test-id', {
          command: 'touch /root/test'
        });

        expect(result.success).toBe(false);
        expect(result.exitCode).toBe(13);
        expect(result.stderr).toContain('Permission denied');
      });

      test('should handle command executor exception', async () => {
        mockServer.commandExecutor.execute.mockRejectedValue(new Error('Command execution failed'));

        await expect(terminalHandler.handleExec('test-id', {
          command: 'invalid_command'
        })).rejects.toThrow('Command execution failed');
      });

      test('should pass environment variables correctly', async () => {
        const mockResult = {
          success: true,
          stdout: 'env test',
          stderr: '',
          exitCode: 0,
          duration: 10,
          metadata: { pid: 456 }
        };

        mockServer.commandExecutor.execute.mockResolvedValue(mockResult);

        await terminalHandler.handleExec('test-id', {
          command: 'echo $TEST_VAR',
          env: { TEST_VAR: 'test_value' }
        });

        expect(mockServer.commandExecutor.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            env: expect.objectContaining({ TEST_VAR: 'test_value' })
          })
        );
      });

      test('should merge background flag with existing environment', async () => {
        const mockResult = {
          success: true,
          stdout: 'test',
          stderr: '',
          exitCode: 0,
          duration: 10,
          metadata: { pid: 123 }
        };

        mockServer.commandExecutor.execute.mockResolvedValue(mockResult);

        await terminalHandler.handleExec('test-id', {
          command: 'echo test',
          env: { CUSTOM_VAR: 'custom_value' },
          is_background: true
        });

        expect(mockServer.commandExecutor.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            env: expect.objectContaining({
              CUSTOM_VAR: 'custom_value',
              BACKGROUND: '1'
            })
          })
        );
      });

      test('should handle missing optional parameters', async () => {
        const mockResult = {
          success: true,
          stdout: 'minimal test',
          stderr: '',
          exitCode: 0,
          duration: 5,
          metadata: { pid: 789 }
        };

        mockServer.commandExecutor.execute.mockResolvedValue(mockResult);

        const result = await terminalHandler.handleExec('test-id', {
          command: 'echo "minimal test"'
        });

        expect(result.success).toBe(true);
        expect(mockServer.commandExecutor.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            command: 'echo "minimal test"'
          })
        );
      });
    });
  });

  describe('FileHandler', () => {
    let fileHandler;

    beforeEach(() => {
      fileHandler = new FileHandler(mockServer);
    });

    test('should initialize with server dependencies', () => {
      expect(fileHandler.fileUtils).toBe(mockServer.fileUtils);
      expect(fileHandler.pathUtils).toBe(mockServer.pathUtils);
    });

    test('should extend BaseToolHandler', () => {
      expect(fileHandler).toBeInstanceOf(BaseToolHandler);
    });

    test('should have correct handler name', () => {
      expect(fileHandler.name).toBe('file');
    });

    describe('getTools', () => {
      test('should return file tools', () => {
        const tools = fileHandler.getTools();
        expect(tools).toHaveLength(3);

        const toolNames = tools.map(t => t.name);
        expect(toolNames).toContain('file_read');
        expect(toolNames).toContain('file_write');
        expect(toolNames).toContain('file_list');
      });

      test('should have correct tool structure', () => {
        const tools = fileHandler.getTools();
        
        tools.forEach(tool => {
          expect(tool).toHaveProperty('name');
          expect(tool).toHaveProperty('description');
          expect(tool).toHaveProperty('inputSchema');
          expect(tool).toHaveProperty('handler', 'file');
        });
      });

      test('should have valid input schemas', () => {
        const tools = fileHandler.getTools();
        
        tools.forEach(tool => {
          expect(tool.inputSchema).toHaveProperty('type', 'object');
          expect(tool.inputSchema).toHaveProperty('properties');
          expect(tool.inputSchema.properties).toHaveProperty('action');
          expect(tool.inputSchema.properties).toHaveProperty('path');
        });
      });
    });

    describe('validateParams', () => {
      test('should validate read parameters', () => {
        mockServer.pathUtils.validatePath.mockReturnValue({ valid: true });

        const params = {
          action: 'read',
          path: '/test/file.txt',
          encoding: 'utf8'
        };

        const result = fileHandler.validateParams(params);
        expect(result.valid).toBe(true);
        expect(mockServer.pathUtils.validatePath).toHaveBeenCalledWith('/test/file.txt');
      });

      test('should validate write parameters', () => {
        mockServer.pathUtils.validatePath.mockReturnValue({ valid: true });

        const params = {
          action: 'write',
          path: '/test/file.txt',
          content: 'test content'
        };

        const result = fileHandler.validateParams(params);
        expect(result.valid).toBe(true);
      });

      test('should validate list parameters', () => {
        mockServer.pathUtils.validatePath.mockReturnValue({ valid: true });

        const params = {
          action: 'list',
          path: '/test/dir',
          recursive: true
        };

        const result = fileHandler.validateParams(params);
        expect(result.valid).toBe(true);
      });

      test('should reject invalid paths', () => {
        mockServer.pathUtils.validatePath.mockReturnValue({
          valid: false,
          reason: 'Path traversal detected'
        });

        const params = {
          action: 'read',
          path: '../../../etc/passwd'
        };

        const result = fileHandler.validateParams(params);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid path: Path traversal detected');
      });

      test('should reject missing action', () => {
        const params = {
          path: '/test/file.txt'
        };

        const result = fileHandler.validateParams(params);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Action is required');
      });

      test('should reject invalid action', () => {
        const params = {
          action: 'invalid',
          path: '/test/file.txt'
        };

        const result = fileHandler.validateParams(params);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Action must be one of: read, write, list');
      });

      test('should reject missing path', () => {
        const params = {
          action: 'read'
        };

        const result = fileHandler.validateParams(params);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Path is required');
      });

      test('should reject empty path', () => {
        const params = {
          action: 'read',
          path: ''
        };

        const result = fileHandler.validateParams(params);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Path is required');
      });

      test('should validate encoding parameter for read', () => {
        mockServer.pathUtils.validatePath.mockReturnValue({ valid: true });

        const params = {
          action: 'read',
          path: '/test/file.txt',
          encoding: 'base64'
        };

        const result = fileHandler.validateParams(params);
        expect(result.valid).toBe(true);
      });

      test('should validate content parameter for write', () => {
        mockServer.pathUtils.validatePath.mockReturnValue({ valid: true });

        const params = {
          action: 'write',
          path: '/test/file.txt',
          content: 'test content',
          encoding: 'utf8'
        };

        const result = fileHandler.validateParams(params);
        expect(result.valid).toBe(true);
      });

      test('should reject write without content', () => {
        mockServer.pathUtils.validatePath.mockReturnValue({ valid: true });

        const params = {
          action: 'write',
          path: '/test/file.txt'
        };

        const result = fileHandler.validateParams(params);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Content is required for write action');
      });

      test('should validate recursive parameter for list', () => {
        mockServer.pathUtils.validatePath.mockReturnValue({ valid: true });

        const params = {
          action: 'list',
          path: '/test/dir',
          recursive: false
        };

        const result = fileHandler.validateParams(params);
        expect(result.valid).toBe(true);
      });

      test('should handle multiple validation errors', () => {
        mockServer.pathUtils.validatePath.mockReturnValue({
          valid: false,
          reason: 'Invalid path'
        });

        const params = {
          action: 'invalid',
          path: ''
        };

        const result = fileHandler.validateParams(params);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });

      test('should validate null parameters', () => {
        const result = fileHandler.validateParams(null);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Action is required');
      });

      test('should validate empty parameters', () => {
        const result = fileHandler.validateParams({});
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Action is required');
      });
    });

    describe('handleRequest', () => {
      test('should handle read action', async () => {
        mockServer.pathUtils.validatePath.mockReturnValue({ valid: true });
        mockServer.fileUtils.readFile.mockResolvedValue('file content');

        const args = {
          action: 'read',
          path: '/test/file.txt',
          encoding: 'utf8'
        };

        const result = await fileHandler.handleRequest('test-id', args);

        expect(mockServer.fileUtils.readFile).toHaveBeenCalledWith('/test/file.txt', 'utf8');
        expect(result.success).toBe(true);
        expect(result.content).toBe('file content');
      });

      test('should handle read action with default encoding', async () => {
        mockServer.pathUtils.validatePath.mockReturnValue({ valid: true });
        mockServer.fileUtils.readFile.mockResolvedValue('file content');

        const args = {
          action: 'read',
          path: '/test/file.txt'
        };

        const result = await fileHandler.handleRequest('test-id', args);

        expect(mockServer.fileUtils.readFile).toHaveBeenCalledWith('/test/file.txt', 'utf8');
        expect(result.success).toBe(true);
      });

      test('should handle read action with base64 encoding', async () => {
        mockServer.pathUtils.validatePath.mockReturnValue({ valid: true });
        mockServer.fileUtils.readFile.mockResolvedValue('ZmlsZSBjb250ZW50');

        const args = {
          action: 'read',
          path: '/test/file.bin',
          encoding: 'base64'
        };

        const result = await fileHandler.handleRequest('test-id', args);

        expect(mockServer.fileUtils.readFile).toHaveBeenCalledWith('/test/file.bin', 'base64');
        expect(result.success).toBe(true);
        expect(result.content).toBe('ZmlsZSBjb250ZW50');
      });

      test('should handle write action', async () => {
        mockServer.pathUtils.validatePath.mockReturnValue({ valid: true });
        mockServer.fileUtils.writeFile.mockResolvedValue();

        const args = {
          action: 'write',
          path: '/test/file.txt',
          content: 'new content',
          encoding: 'utf8'
        };

        const result = await fileHandler.handleRequest('test-id', args);

        expect(mockServer.fileUtils.writeFile).toHaveBeenCalledWith('/test/file.txt', 'new content', 'utf8');
        expect(result.success).toBe(true);
      });

      test('should handle write action with default encoding', async () => {
        mockServer.pathUtils.validatePath.mockReturnValue({ valid: true });
        mockServer.fileUtils.writeFile.mockResolvedValue();

        const args = {
          action: 'write',
          path: '/test/file.txt',
          content: 'new content'
        };

        const result = await fileHandler.handleRequest('test-id', args);

        expect(mockServer.fileUtils.writeFile).toHaveBeenCalledWith('/test/file.txt', 'new content', 'utf8');
        expect(result.success).toBe(true);
      });

      test('should handle list action', async () => {
        mockServer.pathUtils.validatePath.mockReturnValue({ valid: true });
        mockServer.fileUtils.listFiles.mockResolvedValue(['file1.txt', 'file2.js']);

        const args = {
          action: 'list',
          path: '/test/dir',
          recursive: true
        };

        const result = await fileHandler.handleRequest('test-id', args);

        expect(mockServer.fileUtils.listFiles).toHaveBeenCalledWith('/test/dir', true);
        expect(result.success).toBe(true);
        expect(result.files).toEqual(['file1.txt', 'file2.js']);
      });

      test('should handle list action without recursive flag', async () => {
        mockServer.pathUtils.validatePath.mockReturnValue({ valid: true });
        mockServer.fileUtils.listFiles.mockResolvedValue(['file1.txt']);

        const args = {
          action: 'list',
          path: '/test/dir'
        };

        const result = await fileHandler.handleRequest('test-id', args);

        expect(mockServer.fileUtils.listFiles).toHaveBeenCalledWith('/test/dir', false);
        expect(result.success).toBe(true);
        expect(result.files).toEqual(['file1.txt']);
      });

      test('should throw ValidationError for invalid parameters', async () => {
        const args = { action: 'invalid' };

        await expect(fileHandler.handleRequest('test-id', args)).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for missing path', async () => {
        const args = { action: 'read' };

        await expect(fileHandler.handleRequest('test-id', args)).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for invalid path', async () => {
        mockServer.pathUtils.validatePath.mockReturnValue({
          valid: false,
          reason: 'Path traversal detected'
        });

        const args = {
          action: 'read',
          path: '../../../etc/passwd'
        };

        await expect(fileHandler.handleRequest('test-id', args)).rejects.toThrow(ValidationError);
      });

      test('should handle file read error', async () => {
        mockServer.pathUtils.validatePath.mockReturnValue({ valid: true });
        mockServer.fileUtils.readFile.mockRejectedValue(new Error('File not found'));

        const args = {
          action: 'read',
          path: '/test/nonexistent.txt'
        };

        await expect(fileHandler.handleRequest('test-id', args)).rejects.toThrow('File not found');
      });

      test('should handle file write error', async () => {
        mockServer.pathUtils.validatePath.mockReturnValue({ valid: true });
        mockServer.fileUtils.writeFile.mockRejectedValue(new Error('Permission denied'));

        const args = {
          action: 'write',
          path: '/root/test.txt',
          content: 'test'
        };

        await expect(fileHandler.handleRequest('test-id', args)).rejects.toThrow('Permission denied');
      });

      test('should handle file list error', async () => {
        mockServer.pathUtils.validatePath.mockReturnValue({ valid: true });
        mockServer.fileUtils.listFiles.mockRejectedValue(new Error('Directory not found'));

        const args = {
          action: 'list',
          path: '/test/nonexistent'
        };

        await expect(fileHandler.handleRequest('test-id', args)).rejects.toThrow('Directory not found');
      });

      test('should handle path validation error', async () => {
        mockServer.pathUtils.validatePath.mockRejectedValue(new Error('Path validation failed'));

        const args = {
          action: 'read',
          path: '/test/file.txt'
        };

        await expect(fileHandler.handleRequest('test-id', args)).rejects.toThrow('Path validation failed');
      });
    });
  });

  describe('SearchHandler', () => {
    let searchHandler;

    beforeEach(() => {
      searchHandler = new SearchHandler(mockServer);
    });

    test('should initialize with server dependencies', () => {
      expect(searchHandler.searchEngine).toBe(mockServer.searchEngine);
    });

    test('should extend BaseToolHandler', () => {
      expect(searchHandler).toBeInstanceOf(BaseToolHandler);
    });

    test('should have correct handler name', () => {
      expect(searchHandler.name).toBe('search');
    });

    describe('getTools', () => {
      test('should return search tools', () => {
        const tools = searchHandler.getTools();
        expect(tools).toHaveLength(1);
        expect(tools[0].name).toBe('search_text');
      });

      test('should have correct tool structure', () => {
        const tools = searchHandler.getTools();
        const tool = tools[0];
        
        expect(tool).toHaveProperty('name', 'search_text');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool).toHaveProperty('handler', 'search');
      });

      test('should have valid input schema', () => {
        const tools = searchHandler.getTools();
        const schema = tools[0].inputSchema;
        
        expect(schema).toHaveProperty('type', 'object');
        expect(schema).toHaveProperty('properties');
        expect(schema.properties).toHaveProperty('action');
        expect(schema.properties).toHaveProperty('query');
        expect(schema.properties).toHaveProperty('path');
        expect(schema.properties).toHaveProperty('pattern');
        expect(schema.properties).toHaveProperty('case_sensitive');
      });
    });

    describe('validateParams', () => {
      test('should validate search parameters', () => {
        const params = {
          action: 'search',
          query: 'test query',
          path: '/src',
          pattern: '*.js',
          case_sensitive: false
        };

        const result = searchHandler.validateParams(params);
        expect(result.valid).toBe(true);
      });

      test('should validate minimal search parameters', () => {
        const params = {
          action: 'search',
          query: 'test'
        };

        const result = searchHandler.validateParams(params);
        expect(result.valid).toBe(true);
      });

      test('should require query', () => {
        const result = searchHandler.validateParams({ action: 'search' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Query is required');
      });

      test('should require query with empty string', () => {
        const result = searchHandler.validateParams({ 
          action: 'search', 
          query: '' 
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Query is required');
      });

      test('should validate query length', () => {
        const longQuery = 'a'.repeat(1001);
        const result = searchHandler.validateParams({
          action: 'search',
          query: longQuery
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Query length exceeds maximum of 1000 characters');
      });

      test('should validate query length boundary', () => {
        const maxLengthQuery = 'a'.repeat(1000);
        const result = searchHandler.validateParams({
          action: 'search',
          query: maxLengthQuery
        });
        expect(result.valid).toBe(true);
      });

      test('should reject missing action', () => {
        const result = searchHandler.validateParams({ query: 'test' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Action is required');
      });

      test('should reject invalid action', () => {
        const result = searchHandler.validateParams({ 
          action: 'invalid', 
          query: 'test' 
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Action must be search');
      });

      test('should validate path parameter', () => {
        const params = {
          action: 'search',
          query: 'test',
          path: '/valid/path'
        };

        const result = searchHandler.validateParams(params);
        expect(result.valid).toBe(true);
      });

      test('should validate pattern parameter', () => {
        const params = {
          action: 'search',
          query: 'test',
          pattern: '*.txt'
        };

        const result = searchHandler.validateParams(params);
        expect(result.valid).toBe(true);
      });

      test('should validate case_sensitive parameter', () => {
        const params = {
          action: 'search',
          query: 'test',
          case_sensitive: true
        };

        const result = searchHandler.validateParams(params);
        expect(result.valid).toBe(true);
      });

      test('should validate all optional parameters', () => {
        const params = {
          action: 'search',
          query: 'test query',
          path: '/src',
          pattern: '*.js',
          case_sensitive: true
        };

        const result = searchHandler.validateParams(params);
        expect(result.valid).toBe(true);
      });

      test('should handle multiple validation errors', () => {
        const result = searchHandler.validateParams({
          action: 'invalid',
          query: 'a'.repeat(1001)
        });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });

      test('should validate null parameters', () => {
        const result = searchHandler.validateParams(null);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Action is required');
      });

      test('should validate empty parameters', () => {
        const result = searchHandler.validateParams({});
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Action is required');
      });
    });

    describe('handleRequest', () => {
      test('should handle search action', async () => {
        const mockResults = [
          { file: 'file1.js', line: 10, content: 'test query match' },
          { file: 'file2.js', line: 25, content: 'another test query' }
        ];

        mockServer.searchEngine.searchText.mockResolvedValue(mockResults);

        const args = {
          action: 'search',
          query: 'test query',
          path: '/src',
          pattern: '*.js',
          case_sensitive: true
        };

        const result = await searchHandler.handleRequest('test-id', args);

        expect(mockServer.searchEngine.searchText).toHaveBeenCalledWith('test query', {
          path: '/src',
          pattern: '*.js',
          caseSensitive: true
        });

        expect(result.success).toBe(true);
        expect(result.results).toEqual(mockResults);
        expect(result.metadata.count).toBe(2);
      });

      test('should handle search action with minimal parameters', async () => {
        const mockResults = [
          { file: 'file1.txt', line: 5, content: 'simple test' }
        ];

        mockServer.searchEngine.searchText.mockResolvedValue(mockResults);

        const args = {
          action: 'search',
          query: 'simple test'
        };

        const result = await searchHandler.handleRequest('test-id', args);

        expect(mockServer.searchEngine.searchText).toHaveBeenCalledWith('simple test', {
          path: undefined,
          pattern: undefined,
          caseSensitive: false
        });

        expect(result.success).toBe(true);
        expect(result.results).toEqual(mockResults);
        expect(result.metadata.count).toBe(1);
      });

      test('should handle search action with path only', async () => {
        const mockResults = [];

        mockServer.searchEngine.searchText.mockResolvedValue(mockResults);

        const args = {
          action: 'search',
          query: 'nonexistent',
          path: '/src'
        };

        const result = await searchHandler.handleRequest('test-id', args);

        expect(mockServer.searchEngine.searchText).toHaveBeenCalledWith('nonexistent', {
          path: '/src',
          pattern: undefined,
          caseSensitive: false
        });

        expect(result.success).toBe(true);
        expect(result.results).toEqual([]);
        expect(result.metadata.count).toBe(0);
      });

      test('should handle search action with pattern only', async () => {
        const mockResults = [
          { file: 'test.js', line: 1, content: 'pattern match' }
        ];

        mockServer.searchEngine.searchText.mockResolvedValue(mockResults);

        const args = {
          action: 'search',
          query: 'pattern',
          pattern: '*.js'
        };

        const result = await searchHandler.handleRequest('test-id', args);

        expect(mockServer.searchEngine.searchText).toHaveBeenCalledWith('pattern', {
          path: undefined,
          pattern: '*.js',
          caseSensitive: false
        });

        expect(result.success).toBe(true);
        expect(result.results).toEqual(mockResults);
      });

      test('should handle case insensitive search', async () => {
        const mockResults = [
          { file: 'file.txt', line: 1, content: 'CASE INSENSITIVE' }
        ];

        mockServer.searchEngine.searchText.mockResolvedValue(mockResults);

        const args = {
          action: 'search',
          query: 'case insensitive',
          case_sensitive: false
        };

        const result = await searchHandler.handleRequest('test-id', args);

        expect(mockServer.searchEngine.searchText).toHaveBeenCalledWith('case insensitive', {
          path: undefined,
          pattern: undefined,
          caseSensitive: false
        });

        expect(result.success).toBe(true);
      });

      test('should throw ValidationError for invalid parameters', async () => {
        const args = { action: 'invalid' };

        await expect(searchHandler.handleRequest('test-id', args)).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for missing query', async () => {
        const args = { action: 'search' };

        await expect(searchHandler.handleRequest('test-id', args)).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for query too long', async () => {
        const args = {
          action: 'search',
          query: 'a'.repeat(1001)
        };

        await expect(searchHandler.handleRequest('test-id', args)).rejects.toThrow(ValidationError);
      });

      test('should handle search engine error', async () => {
        mockServer.searchEngine.searchText.mockRejectedValue(new Error('Search engine unavailable'));

        const args = {
          action: 'search',
          query: 'test'
        };

        await expect(searchHandler.handleRequest('test-id', args)).rejects.toThrow('Search engine unavailable');
      });

      test('should handle empty search results', async () => {
        mockServer.searchEngine.searchText.mockResolvedValue([]);

        const args = {
          action: 'search',
          query: 'nonexistent term'
        };

        const result = await searchHandler.handleRequest('test-id', args);

        expect(result.success).toBe(true);
        expect(result.results).toEqual([]);
        expect(result.metadata.count).toBe(0);
      });

      test('should handle large search results', async () => {
        const largeResults = Array.from({ length: 1000 }, (_, i) => ({
          file: `file${i}.js`,
          line: i + 1,
          content: `match ${i}`
        }));

        mockServer.searchEngine.searchText.mockResolvedValue(largeResults);

        const args = {
          action: 'search',
          query: 'match'
        };

        const result = await searchHandler.handleRequest('test-id', args);

        expect(result.success).toBe(true);
        expect(result.results).toEqual(largeResults);
        expect(result.metadata.count).toBe(1000);
      });
    });
  });

  describe('MCPHandlersManager', () => {
    let handlersManager;

    beforeEach(() => {
      handlersManager = new MCPHandlersManager(mockServer);
    });

    test('should initialize with server', () => {
      expect(handlersManager.server).toBe(mockServer);
      expect(handlersManager.logger).toBe(mockLogger);
      expect(handlersManager.handlers).toBeInstanceOf(Map);
    });

    test('should be an EventEmitter', () => {
      expect(handlersManager).toBeInstanceOf(require('events').EventEmitter);
    });

    test('should initialize default handlers', () => {
      expect(handlersManager.handlers.size).toBe(3); // terminal, file, search
      expect(handlersManager.handlers.has('terminal')).toBe(true);
      expect(handlersManager.handlers.has('file')).toBe(true);
      expect(handlersManager.handlers.has('search')).toBe(true);
    });

    test('should have correct handler types', () => {
      expect(handlersManager.getHandler('terminal')).toBeInstanceOf(TerminalHandler);
      expect(handlersManager.getHandler('file')).toBeInstanceOf(FileHandler);
      expect(handlersManager.getHandler('search')).toBeInstanceOf(SearchHandler);
    });

    test('should have correct handler names', () => {
      expect(handlersManager.getHandler('terminal').name).toBe('terminal');
      expect(handlersManager.getHandler('file').name).toBe('file');
      expect(handlersManager.getHandler('search').name).toBe('search');
    });

    test('should register handler', () => {
      const customHandler = new BaseToolHandler(mockServer, 'custom');
      handlersManager.registerHandler('custom', customHandler);

      expect(handlersManager.handlers.has('custom')).toBe(true);
      expect(handlersManager.getHandler('custom')).toBe(customHandler);
    });

    test('should register multiple handlers', () => {
      const handler1 = new BaseToolHandler(mockServer, 'handler1');
      const handler2 = new BaseToolHandler(mockServer, 'handler2');

      handlersManager.registerHandler('handler1', handler1);
      handlersManager.registerHandler('handler2', handler2);

      expect(handlersManager.handlers.size).toBe(5); // 3 default + 2 custom
      expect(handlersManager.getHandler('handler1')).toBe(handler1);
      expect(handlersManager.getHandler('handler2')).toBe(handler2);
    });

    test('should reject non-BaseToolHandler instances', () => {
      expect(() => {
        handlersManager.registerHandler('invalid', {});
      }).toThrow('Handler invalid must extend BaseToolHandler');
    });

    test('should reject null handler', () => {
      expect(() => {
        handlersManager.registerHandler('null', null);
      }).toThrow('Handler null must extend BaseToolHandler');
    });

    test('should reject undefined handler', () => {
      expect(() => {
        handlersManager.registerHandler('undefined', undefined);
      }).toThrow('Handler undefined must extend BaseToolHandler');
    });

    test('should reject handler with invalid name', () => {
      const handler = new BaseToolHandler(mockServer, 'valid');
      expect(() => {
        handlersManager.registerHandler('', handler);
      }).toThrow('Handler name cannot be empty');
    });

    test('should reject handler with null name', () => {
      const handler = new BaseToolHandler(mockServer, 'valid');
      expect(() => {
        handlersManager.registerHandler(null, handler);
      }).toThrow('Handler name cannot be empty');
    });

    test('should override existing handler', () => {
      const originalHandler = new BaseToolHandler(mockServer, 'original');
      const newHandler = new BaseToolHandler(mockServer, 'new');

      handlersManager.registerHandler('test', originalHandler);
      expect(handlersManager.getHandler('test')).toBe(originalHandler);

      handlersManager.registerHandler('test', newHandler);
      expect(handlersManager.getHandler('test')).toBe(newHandler);
    });

    test('should get all tools', () => {
      const tools = handlersManager.getAllTools();
      expect(tools.length).toBeGreaterThan(0);

      // Каждый инструмент должен иметь handler поле
      tools.forEach(tool => {
        expect(tool).toHaveProperty('handler');
        expect(typeof tool.handler).toBe('string');
      });
    });

    test('should get tools from all handlers', () => {
      const tools = handlersManager.getAllTools();
      
      // Проверить что есть инструменты от всех обработчиков
      const handlers = tools.map(tool => tool.handler);
      expect(handlers).toContain('terminal');
      expect(handlers).toContain('file');
      expect(handlers).toContain('search');
    });

    test('should have correct tool structure', () => {
      const tools = handlersManager.getAllTools();
      
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool).toHaveProperty('handler');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.handler).toBe('string');
      });
    });

    test('should have unique tool names', () => {
      const tools = handlersManager.getAllTools();
      const toolNames = tools.map(tool => tool.name);
      const uniqueNames = new Set(toolNames);
      expect(uniqueNames.size).toBe(toolNames.length);
    });

    test('should include tools from custom handlers', () => {
      const customHandler = new BaseToolHandler(mockServer, 'custom');
      customHandler.getTools = jest.fn().mockReturnValue([
        { name: 'custom_tool', handler: 'custom', description: 'Custom tool' }
      ]);

      handlersManager.registerHandler('custom', customHandler);
      const tools = handlersManager.getAllTools();
      
      const customTools = tools.filter(tool => tool.handler === 'custom');
      expect(customTools).toHaveLength(1);
      expect(customTools[0].name).toBe('custom_tool');
    });

    test('should handle tool call', async () => {
      const toolParams = {
        name: 'terminal_exec',
        arguments: {
          action: 'help'
        }
      };

      const result = await handlersManager.handleToolCall('call-id', toolParams);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('help');
      expect(result.metadata.handler).toBe('terminal');
    });

    test('should handle file tool call', async () => {
      const toolParams = {
        name: 'file_read',
        arguments: {
          action: 'read',
          path: '/test/file.txt'
        }
      };

      mockServer.pathUtils.validatePath.mockReturnValue({ valid: true });
      mockServer.fileUtils.readFile.mockResolvedValue('file content');

      const result = await handlersManager.handleToolCall('call-id', toolParams);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('content');
      expect(result.metadata.handler).toBe('file');
    });

    test('should handle search tool call', async () => {
      const toolParams = {
        name: 'search_text',
        arguments: {
          action: 'search',
          query: 'test'
        }
      };

      mockServer.searchEngine.searchText.mockResolvedValue([]);

      const result = await handlersManager.handleToolCall('call-id', toolParams);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('results');
      expect(result.metadata.handler).toBe('search');
    });

    test('should throw error for unknown tool', async () => {
      const toolParams = {
        name: 'unknown_tool',
        arguments: {}
      };

      await expect(handlersManager.handleToolCall('call-id', toolParams)).rejects.toThrow(HandlerError);
    });

    test('should throw error for malformed tool params', async () => {
      await expect(handlersManager.handleToolCall('call-id', null)).rejects.toThrow();
      await expect(handlersManager.handleToolCall('call-id', {})).rejects.toThrow();
      await expect(handlersManager.handleToolCall('call-id', { name: '' })).rejects.toThrow();
    });

    test('should handle tool call with validation error', async () => {
      const toolParams = {
        name: 'terminal_exec',
        arguments: {
          action: 'invalid'
        }
      };

      await expect(handlersManager.handleToolCall('call-id', toolParams)).rejects.toThrow(ValidationError);
    });

    test('should handle tool call with handler error', async () => {
      const toolParams = {
        name: 'terminal_exec',
        arguments: {
          action: 'exec',
          command: 'rm -rf /'
        }
      };

      mockServer.securityAnalyzer.analyzeCommand.mockResolvedValue({
        safe: false,
        reason: 'dangerous_command'
      });

      await expect(handlersManager.handleToolCall('call-id', toolParams)).rejects.toThrow(SecurityError);
    });

    test('should include call ID in result', async () => {
      const toolParams = {
        name: 'terminal_exec',
        arguments: {
          action: 'help'
        }
      };

      const result = await handlersManager.handleToolCall('test-call-id', toolParams);

      expect(result.metadata.callId).toBe('test-call-id');
    });

    test('should include handler name in result', async () => {
      const toolParams = {
        name: 'file_read',
        arguments: {
          action: 'read',
          path: '/test/file.txt'
        }
      };

      mockServer.pathUtils.validatePath.mockReturnValue({ valid: true });
      mockServer.fileUtils.readFile.mockResolvedValue('content');

      const result = await handlersManager.handleToolCall('call-id', toolParams);

      expect(result.metadata.handler).toBe('file');
    });

    test('should get handlers status', () => {
      const status = handlersManager.getHandlersStatus();

      expect(status).toHaveProperty('terminal');
      expect(status).toHaveProperty('file');
      expect(status).toHaveProperty('search');

      Object.values(status).forEach(handlerStatus => {
        expect(handlerStatus).toHaveProperty('name');
        expect(handlerStatus).toHaveProperty('state');
        expect(handlerStatus).toHaveProperty('uptime');
      });
    });

    test('should include custom handlers in status', () => {
      const customHandler = new BaseToolHandler(mockServer, 'custom');
      handlersManager.registerHandler('custom', customHandler);

      const status = handlersManager.getHandlersStatus();
      expect(status).toHaveProperty('custom');
      expect(status.custom.name).toBe('custom');
    });

    test('should have correct status structure', () => {
      const status = handlersManager.getHandlersStatus();

      Object.entries(status).forEach(([name, handlerStatus]) => {
        expect(handlerStatus.name).toBe(name);
        expect(typeof handlerStatus.state).toBe('string');
        expect(typeof handlerStatus.uptime).toBe('number');
        expect(handlerStatus.uptime).toBeGreaterThanOrEqual(0);
      });
    });

    test('should get statistics', () => {
      const stats = handlersManager.getStats();

      expect(stats).toHaveProperty('totalHandlers', 3);
      expect(stats).toHaveProperty('handlers');
      expect(stats).toHaveProperty('tools');

      expect(Object.keys(stats.handlers)).toHaveLength(3);
      expect(stats.handlers.terminal).toHaveProperty('name', 'terminal');
      expect(stats.handlers.terminal).toHaveProperty('state');
      expect(stats.handlers.terminal).toHaveProperty('tools');
    });

    test('should include custom handlers in statistics', () => {
      const customHandler = new BaseToolHandler(mockServer, 'custom');
      customHandler.getTools = jest.fn().mockReturnValue([
        { name: 'custom_tool', handler: 'custom' }
      ]);

      handlersManager.registerHandler('custom', customHandler);
      const stats = handlersManager.getStats();

      expect(stats.totalHandlers).toBe(4);
      expect(stats.handlers).toHaveProperty('custom');
      expect(stats.handlers.custom.name).toBe('custom');
    });

    test('should have correct statistics structure', () => {
      const stats = handlersManager.getStats();

      expect(typeof stats.totalHandlers).toBe('number');
      expect(Array.isArray(stats.tools)).toBe(true);
      expect(typeof stats.handlers).toBe('object');

      Object.values(stats.handlers).forEach(handler => {
        expect(handler).toHaveProperty('name');
        expect(handler).toHaveProperty('state');
        expect(handler).toHaveProperty('tools');
        expect(Array.isArray(handler.tools)).toBe(true);
      });
    });

    test('should count total tools correctly', () => {
      const stats = handlersManager.getStats();
      const totalToolsFromHandlers = Object.values(stats.handlers)
        .reduce((sum, handler) => sum + handler.tools.length, 0);

      expect(stats.tools.length).toBe(totalToolsFromHandlers);
    });

    test('should cleanup all handlers', async () => {
      await handlersManager.cleanup();

      // Проверить что все обработчики были очищены
      for (const [name, handler] of handlersManager.handlers) {
        expect(handler.state).toBe(HandlerState.CANCELLED);
      }
    });

    test('should cleanup custom handlers', async () => {
      const customHandler = new BaseToolHandler(mockServer, 'custom');
      handlersManager.registerHandler('custom', customHandler);

      await handlersManager.cleanup();

      expect(customHandler.state).toBe(HandlerState.CANCELLED);
    });

    test('should handle cleanup errors gracefully', async () => {
      const problematicHandler = new BaseToolHandler(mockServer, 'problematic');
      problematicHandler.cleanup = jest.fn().mockRejectedValue(new Error('Cleanup failed'));

      handlersManager.registerHandler('problematic', problematicHandler);

      // Cleanup should not throw even if individual handlers fail
      await expect(handlersManager.cleanup()).resolves.not.toThrow();
    });
  });

  describe('event handling', () => {
    test('should emit handlerError on handler error', (done) => {
      const terminalHandler = handlersManager.getHandler('terminal');

      handlersManager.once('handlerError', (data) => {
        expect(data.handler).toBe('terminal');
        expect(data.error).toBeInstanceOf(Error);
        expect(data.error.message).toBe('Test handler error');
        done();
      });

      // Имитировать ошибку в обработчике
      terminalHandler.emit('error', new Error('Test handler error'));
    });

    test('should emit handlerError with correct data structure', (done) => {
      const fileHandler = handlersManager.getHandler('file');

      handlersManager.once('handlerError', (data) => {
        expect(data).toHaveProperty('handler', 'file');
        expect(data).toHaveProperty('error');
        expect(data).toHaveProperty('timestamp');
        expect(typeof data.timestamp).toBe('number');
        done();
      });

      fileHandler.emit('error', new Error('File handler error'));
    });

    test('should handle multiple handler errors', (done) => {
      const terminalHandler = handlersManager.getHandler('terminal');
      const fileHandler = handlersManager.getHandler('file');
      let errorCount = 0;

      handlersManager.on('handlerError', (data) => {
        errorCount++;
        expect(data.error).toBeInstanceOf(Error);
        
        if (errorCount === 2) {
          done();
        }
      });

      terminalHandler.emit('error', new Error('Terminal error'));
      fileHandler.emit('error', new Error('File error'));
    });

    test('should emit handlerStateChanged on handler state change', (done) => {
      const searchHandler = handlersManager.getHandler('search');

      handlersManager.once('handlerStateChanged', (data) => {
        expect(data.handler).toBe('search');
        expect(data.state).toBe(HandlerState.PROCESSING);
        done();
      });

      searchHandler.state = HandlerState.PROCESSING;
    });
  });

  describe('error handling and edge cases', () => {
    test('should handle malformed tool parameters', async () => {
      await expect(handlersManager.handleToolCall('id', null)).rejects.toThrow();
      await expect(handlersManager.handleToolCall('id', {})).rejects.toThrow();
    });

    test('should handle handler method failures', async () => {
      // Мокаем метод handleRequest чтобы он выбрасывал ошибку
      const terminalHandler = handlersManager.getHandler('terminal');
      const originalHandleRequest = terminalHandler.handleRequest;
      terminalHandler.handleRequest = jest.fn().mockRejectedValue(new Error('Handler failure'));

      const toolParams = {
        name: 'terminal_exec',
        arguments: { action: 'help' }
      };

      await expect(handlersManager.handleToolCall('call-id', toolParams)).rejects.toThrow('Handler failure');

      // Восстановить оригинальный метод
      terminalHandler.handleRequest = originalHandleRequest;
    });

    test('should handle concurrent tool calls', async () => {
      const promises = [];

      for (let i = 0; i < 5; i++) {
        const toolParams = {
          name: 'terminal_exec',
          arguments: { action: 'help' }
        };
        promises.push(handlersManager.handleToolCall(`call-${i}`, toolParams));
      }

      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    test('should handle large parameter payloads', async () => {
      const largeContent = 'a'.repeat(100000); // 100KB контента

      const toolParams = {
        name: 'terminal_exec',
        arguments: {
          action: 'exec',
          command: `echo "${largeContent}"`
        }
      };

      // Это должно либо успешно выполниться, либо дать осмысленную ошибку
      try {
        const result = await handlersManager.handleToolCall('large-call', toolParams);
        expect(result.success).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        // Ожидаем осмысленное сообщение об ошибке
        expect(error.message).not.toBe('');
      }
    });

    test('should validate tool parameters thoroughly', async () => {
      const invalidParams = [
        { name: '', arguments: {} },
        { name: 'nonexistent_tool', arguments: {} },
        { name: null, arguments: {} },
        { name: 'terminal_exec', arguments: null },
        { name: 'terminal_exec', arguments: { invalidField: 'value' } }
      ];

      for (const params of invalidParams) {
        await expect(handlersManager.handleToolCall('test-id', params)).rejects.toThrow();
      }
    });

    test('should handle handler registration with duplicate names', () => {
      const handler1 = new BaseToolHandler(mockServer, 'duplicate');
      const handler2 = new BaseToolHandler(mockServer, 'duplicate');

      handlersManager.registerHandler('duplicate', handler1);
      expect(handlersManager.getHandler('duplicate')).toBe(handler1);

      handlersManager.registerHandler('duplicate', handler2);
      expect(handlersManager.getHandler('duplicate')).toBe(handler2);
    });

    test('should handle getHandler with non-existent handler', () => {
      expect(handlersManager.getHandler('nonexistent')).toBeUndefined();
    });

    test('should handle empty handlers map', () => {
      const emptyManager = new MCPHandlersManager(mockServer);
      // Удаляем все обработчики
      emptyManager.handlers.clear();

      expect(emptyManager.getAllTools()).toEqual([]);
      expect(emptyManager.getHandlersStatus()).toEqual({});
      expect(emptyManager.getStats().totalHandlers).toBe(0);
    });

    test('should handle handler with no tools', () => {
      const emptyHandler = new BaseToolHandler(mockServer, 'empty');
      emptyHandler.getTools = jest.fn().mockReturnValue([]);

      handlersManager.registerHandler('empty', emptyHandler);
      const tools = handlersManager.getAllTools();
      const emptyTools = tools.filter(tool => tool.handler === 'empty');

      expect(emptyTools).toHaveLength(0);
    });

    test('should handle handler with invalid tool structure', () => {
      const invalidHandler = new BaseToolHandler(mockServer, 'invalid');
      invalidHandler.getTools = jest.fn().mockReturnValue([
        { name: 'invalid_tool' } // Отсутствует handler поле
      ]);

      handlersManager.registerHandler('invalid', invalidHandler);
      
      // Должно обработать без ошибок
      expect(() => handlersManager.getAllTools()).not.toThrow();
    });

    test('should handle cleanup of already cleaned up handlers', async () => {
      await handlersManager.cleanup();
      
      // Повторная очистка не должна вызывать ошибки
      await expect(handlersManager.cleanup()).resolves.not.toThrow();
    });

    test('should handle tool call with very long call ID', async () => {
      const longCallId = 'a'.repeat(1000);
      const toolParams = {
        name: 'terminal_exec',
        arguments: { action: 'help' }
      };

      const result = await handlersManager.handleToolCall(longCallId, toolParams);
      expect(result.success).toBe(true);
      expect(result.metadata.callId).toBe(longCallId);
    });

    test('should handle tool call with special characters in parameters', async () => {
      const toolParams = {
        name: 'terminal_exec',
        arguments: {
          action: 'exec',
          command: 'echo "test with \'quotes\' and \"double quotes\""'
        }
      };

      mockServer.securityAnalyzer.analyzeCommand.mockResolvedValue({ safe: true });
      mockServer.commandExecutor.execute.mockResolvedValue({
        success: true,
        stdout: 'test with \'quotes\' and "double quotes"',
        stderr: '',
        exitCode: 0,
        duration: 10,
        metadata: { pid: 123 }
      });

      const result = await handlersManager.handleToolCall('special-chars', toolParams);
      expect(result.success).toBe(true);
    });
  });
});
