const { PluginRegistry } = require('../index.cjs');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock fs module
jest.mock('fs', () => ({
  readdirSync: jest.fn(),
  existsSync: jest.fn()
}));

describe('PluginRegistry', () => {
  let registry;
  let testDir;
  let mockPluginDir;

  beforeEach(() => {
    jest.clearAllMocks();
    
    testDir = path.join(os.tmpdir(), `plugin-registry-test-${Date.now()}`);
    mockPluginDir = path.join(testDir, 'plugins');
    
    registry = new PluginRegistry(testDir);
  });

  afterEach(() => {
    try {
      require('fs').rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    test('should create instance with default values', () => {
      expect(registry.rootDir).toBe(testDir);
      expect(registry.pluginsDir).toBe(mockPluginDir);
      expect(registry.tools).toEqual([]);
      expect(registry.handlers).toBeInstanceOf(Map);
      expect(registry.errors).toEqual([]);
      expect(registry.disabledTools).toBeInstanceOf(Set);
      expect(registry.disabledTools.size).toBe(0);
    });

    test('should create instance with custom root directory', () => {
      const customDir = '/custom/root';
      const customRegistry = new PluginRegistry(customDir);
      
      expect(customRegistry.rootDir).toBe(customDir);
      expect(customRegistry.pluginsDir).toBe(path.join(customDir, 'plugins'));
    });

    test('should create instance with disabled tools', () => {
      const disabledTools = ['tool1', 'tool2'];
      const customRegistry = new PluginRegistry(testDir, { disabled: disabledTools });
      
      expect(customRegistry.disabledTools.has('tool1')).toBe(true);
      expect(customRegistry.disabledTools.has('tool2')).toBe(true);
    });

    test('should use process.cwd() when no rootDir provided', () => {
      const defaultRegistry = new PluginRegistry();
      
      expect(defaultRegistry.rootDir).toBe(process.cwd());
      expect(defaultRegistry.pluginsDir).toBe(path.join(process.cwd(), 'plugins'));
    });

    test('should handle empty disabled tools array', () => {
      const customRegistry = new PluginRegistry(testDir, { disabled: [] });
      
      expect(customRegistry.disabledTools.size).toBe(0);
    });

    test('should handle null/undefined disabled tools', () => {
      const customRegistry = new PluginRegistry(testDir, { disabled: null });
      
      expect(customRegistry.disabledTools.size).toBe(0);
    });
  });

  describe('setDisabledTools', () => {
    test('should set disabled tools from array', () => {
      const tools = ['tool1', 'tool2', 'tool3'];
      registry.setDisabledTools(tools);
      
      expect(registry.disabledTools.has('tool1')).toBe(true);
      expect(registry.disabledTools.has('tool2')).toBe(true);
      expect(registry.disabledTools.has('tool3')).toBe(true);
    });

    test('should handle non-array input', () => {
      registry.setDisabledTools('not-an-array');
      
      expect(registry.disabledTools.size).toBe(0);
    });

    test('should filter out empty and null values', () => {
      const tools = ['tool1', '', null, 'tool2', undefined, 'tool3'];
      registry.setDisabledTools(tools);
      
      expect(registry.disabledTools.has('tool1')).toBe(true);
      expect(registry.disabledTools.has('tool2')).toBe(true);
      expect(registry.disabledTools.has('tool3')).toBe(true);
      expect(registry.disabledTools.has('')).toBe(false);
    });

    test('should trim tool names', () => {
      const tools = ['  tool1  ', 'tool2', '  tool3'];
      registry.setDisabledTools(tools);
      
      expect(registry.disabledTools.has('tool1')).toBe(true);
      expect(registry.disabledTools.has('tool2')).toBe(true);
      expect(registry.disabledTools.has('tool3')).toBe(true);
    });
  });

  describe('isDisabled', () => {
    test('should return true for disabled tools', () => {
      registry.setDisabledTools(['tool1', 'tool2']);
      
      expect(registry.isDisabled('tool1')).toBe(true);
      expect(registry.isDisabled('tool2')).toBe(true);
    });

    test('should return false for enabled tools', () => {
      registry.setDisabledTools(['tool1']);
      
      expect(registry.isDisabled('tool2')).toBe(false);
      expect(registry.isDisabled('tool3')).toBe(false);
    });

    test('should handle null/undefined input', () => {
      expect(registry.isDisabled(null)).toBe(false);
      expect(registry.isDisabled(undefined)).toBe(false);
    });

    test('should trim input before checking', () => {
      registry.setDisabledTools(['tool1']);
      
      expect(registry.isDisabled('  tool1  ')).toBe(true);
    });
  });

  describe('registerPlugin', () => {
    test('should register plugin with tools', () => {
      const pluginModule = {
        tools: [
          {
            name: 'test-tool',
            description: 'A test tool',
            inputSchema: { type: 'object', properties: {} }
          }
        ],
        handleToolCall: jest.fn()
      };

      registry.registerPlugin(pluginModule, 'test-plugin');

      expect(registry.tools).toHaveLength(1);
      expect(registry.tools[0].name).toBe('test-tool');
      expect(registry.tools[0].description).toBe('A test tool');
      expect(registry.handlers.has('test-tool')).toBe(true);
      expect(registry.handlers.has('test-plugin')).toBe(true);
    });

    test('should not register disabled tools', () => {
      registry.setDisabledTools(['test-tool']);

      const pluginModule = {
        tools: [
          {
            name: 'test-tool',
            description: 'A test tool'
          }
        ],
        handleToolCall: jest.fn()
      };

      registry.registerPlugin(pluginModule, 'test-plugin');

      expect(registry.tools).toHaveLength(0);
      expect(registry.handlers.has('test-tool')).toBe(false);
    });

    test('should not register duplicate tools', () => {
      const pluginModule1 = {
        tools: [{ name: 'test-tool', description: 'First tool' }],
        handleToolCall: jest.fn()
      };

      const pluginModule2 = {
        tools: [{ name: 'test-tool', description: 'Second tool' }],
        handleToolCall: jest.fn()
      };

      registry.registerPlugin(pluginModule1, 'plugin1');
      registry.registerPlugin(pluginModule2, 'plugin2');

      expect(registry.tools).toHaveLength(1);
      expect(registry.tools[0].description).toBe('First tool');
    });

    test('should handle plugin without tools', () => {
      const pluginModule = {
        handleToolCall: jest.fn()
      };

      registry.registerPlugin(pluginModule, 'test-plugin');

      expect(registry.tools).toHaveLength(0);
      expect(registry.handlers.has('test-plugin')).toBe(true);
    });

    test('should handle plugin without handleToolCall', () => {
      const pluginModule = {
        tools: [{ name: 'test-tool', description: 'A test tool' }]
      };

      registry.registerPlugin(pluginModule, 'test-plugin');

      expect(registry.tools).toHaveLength(1);
      expect(registry.handlers.has('test-tool')).toBe(false);
    });

    test('should handle null/undefined module', () => {
      registry.registerPlugin(null, 'test-plugin');
      registry.registerPlugin(undefined, 'test-plugin');

      expect(registry.tools).toHaveLength(0);
      expect(registry.handlers.size).toBe(0);
    });

    test('should normalize tool descriptors', () => {
      const pluginModule = {
        tools: [
          {
            name: '  test-tool  ',
            description: '  A test tool  ',
            inputSchema: { type: 'object', properties: { test: { type: 'string' } } }
          }
        ],
        handleToolCall: jest.fn()
      };

      registry.registerPlugin(pluginModule, 'test-plugin');

      expect(registry.tools).toHaveLength(1);
      expect(registry.tools[0].name).toBe('test-tool');
      expect(registry.tools[0].description).toBe('A test tool');
      expect(registry.tools[0].inputSchema).toEqual({ type: 'object', properties: { test: { type: 'string' } } });
    });

    test('should use default inputSchema when not provided', () => {
      const pluginModule = {
        tools: [
          {
            name: 'test-tool',
            description: 'A test tool'
          }
        ],
        handleToolCall: jest.fn()
      };

      registry.registerPlugin(pluginModule, 'test-plugin');

      expect(registry.tools).toHaveLength(1);
      expect(registry.tools[0].inputSchema).toEqual({ type: 'object', properties: {}, additionalProperties: true });
    });

    test('should use name as description when description is empty', () => {
      const pluginModule = {
        tools: [
          {
            name: 'test-tool',
            description: ''
          }
        ],
        handleToolCall: jest.fn()
      };

      registry.registerPlugin(pluginModule, 'test-plugin');

      expect(registry.tools).toHaveLength(1);
      expect(registry.tools[0].description).toBe('test-tool');
    });
  });

  describe('load', () => {
    test('should load plugins from plugins directory', () => {
      const mockPluginFile = {
        name: 'test-plugin.js',
        isFile: () => true
      };

      fs.readdirSync.mockReturnValue([mockPluginFile]);

      // Mock require to return a plugin module
      const originalRequire = require;
      const mockPluginModule = {
        tools: [{ name: 'test-tool', description: 'A test tool' }],
        handleToolCall: jest.fn()
      };

      jest.doMock(path.join(mockPluginDir, 'test-plugin.js'), () => mockPluginModule);

      registry.load();

      expect(registry.tools).toHaveLength(1);
      expect(registry.tools[0].name).toBe('test-tool');
      expect(registry.handlers.has('test-tool')).toBe(true);
      expect(registry.handlers.has('test-plugin')).toBe(true);
    });

    test('should handle missing plugins directory', () => {
      fs.readdirSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      registry.load();

      expect(registry.tools).toHaveLength(0);
      expect(registry.errors).toHaveLength(0);
    });

    test('should skip non-js files', () => {
      const mockFiles = [
        { name: 'test-plugin.js', isFile: () => true },
        { name: 'test-plugin.txt', isFile: () => true },
        { name: 'test-plugin.json', isFile: () => true }
      ];

      fs.readdirSync.mockReturnValue(mockFiles);

      // Mock require for js file only
      const mockPluginModule = {
        tools: [{ name: 'test-tool', description: 'A test tool' }],
        handleToolCall: jest.fn()
      };

      jest.doMock(path.join(mockPluginDir, 'test-plugin.js'), () => mockPluginModule);

      registry.load();

      expect(registry.tools).toHaveLength(1);
    });

    test('should skip directories', () => {
      const mockEntries = [
        { name: 'test-plugin.js', isFile: () => true },
        { name: 'subdir', isFile: () => false }
      ];

      fs.readdirSync.mockReturnValue(mockEntries);

      const mockPluginModule = {
        tools: [{ name: 'test-tool', description: 'A test tool' }],
        handleToolCall: jest.fn()
      };

      jest.doMock(path.join(mockPluginDir, 'test-plugin.js'), () => mockPluginModule);

      registry.load();

      expect(registry.tools).toHaveLength(1);
    });

    test('should handle plugin loading errors', () => {
      const mockPluginFile = {
        name: 'error-plugin.js',
        isFile: () => true
      };

      fs.readdirSync.mockReturnValue([mockPluginFile]);

      // Mock require to throw error
      jest.doMock(path.join(mockPluginDir, 'error-plugin.js'), () => {
        throw new Error('Plugin loading error');
      });

      registry.load();

      expect(registry.tools).toHaveLength(0);
      expect(registry.errors).toHaveLength(1);
      expect(registry.errors[0].plugin).toBe('error-plugin.js');
      expect(registry.errors[0].error).toBe('Plugin loading error');
    });

    test('should handle plugin with invalid tools array', () => {
      const mockPluginFile = {
        name: 'invalid-plugin.js',
        isFile: () => true
      };

      fs.readdirSync.mockReturnValue([mockPluginFile]);

      const mockPluginModule = {
        tools: 'not-an-array',
        handleToolCall: jest.fn()
      };

      jest.doMock(path.join(mockPluginDir, 'invalid-plugin.js'), () => mockPluginModule);

      registry.load();

      expect(registry.tools).toHaveLength(0);
      expect(registry.handlers.has('invalid-plugin')).toBe(true);
    });

    test('should clear existing tools and handlers on load', () => {
      // First, register a plugin programmatically
      const pluginModule = {
        tools: [{ name: 'programmatic-tool', description: 'A tool' }],
        handleToolCall: jest.fn()
      };

      registry.registerPlugin(pluginModule, 'programmatic');

      expect(registry.tools).toHaveLength(1);
      expect(registry.handlers.size).toBeGreaterThan(0);

      // Then load plugins from directory
      fs.readdirSync.mockReturnValue([]);

      registry.load();

      expect(registry.tools).toHaveLength(0);
      expect(registry.handlers.size).toBe(0);
      expect(registry.errors).toHaveLength(0);
    });
  });

  describe('listTools and getAllTools', () => {
    test('should return copy of tools array', () => {
      const pluginModule = {
        tools: [
          { name: 'tool1', description: 'First tool' },
          { name: 'tool2', description: 'Second tool' }
        ],
        handleToolCall: jest.fn()
      };

      registry.registerPlugin(pluginModule, 'test-plugin');

      const tools1 = registry.listTools();
      const tools2 = registry.getAllTools();

      expect(tools1).toEqual(tools2);
      expect(tools1).toHaveLength(2);
      expect(tools1).not.toBe(registry.tools); // Should be a copy
    });

    test('should return empty array when no tools registered', () => {
      const tools = registry.listTools();
      const allTools = registry.getAllTools();

      expect(tools).toEqual([]);
      expect(allTools).toEqual([]);
    });
  });

  describe('hasHandler', () => {
    test('should return true for registered handlers', () => {
      const pluginModule = {
        tools: [{ name: 'test-tool', description: 'A test tool' }],
        handleToolCall: jest.fn()
      };

      registry.registerPlugin(pluginModule, 'test-plugin');

      expect(registry.hasHandler('test-tool')).toBe(true);
      expect(registry.hasHandler('test-plugin')).toBe(true);
    });

    test('should return false for non-existent handlers', () => {
      expect(registry.hasHandler('non-existent-tool')).toBe(false);
    });

    test('should return false for disabled tools', () => {
      registry.setDisabledTools(['test-tool']);

      const pluginModule = {
        tools: [{ name: 'test-tool', description: 'A test tool' }],
        handleToolCall: jest.fn()
      };

      registry.registerPlugin(pluginModule, 'test-plugin');

      expect(registry.hasHandler('test-tool')).toBe(false);
    });
  });

  describe('callTool', () => {
    test('should call tool handler successfully', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ result: 'success' });
      const pluginModule = {
        tools: [{ name: 'test-tool', description: 'A test tool' }],
        handleToolCall: mockHandler
      };

      registry.registerPlugin(pluginModule, 'test-plugin');

      const args = { param1: 'value1' };
      const result = await registry.callTool('test-tool', args);

      expect(mockHandler).toHaveBeenCalledWith('test-tool', args, {});
      expect(result).toEqual({ result: 'success' });
    });

    test('should throw error for disabled tools', async () => {
      registry.setDisabledTools(['test-tool']);

      await expect(registry.callTool('test-tool', {})).rejects.toThrow("Tool 'test-tool' is disabled");
    });

    test('should throw error for non-existent tools', async () => {
      await expect(registry.callTool('non-existent-tool', {})).rejects.toThrow("No plugin handler for tool 'non-existent-tool'");
    });

    test('should throw error when handler throws', async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
      const pluginModule = {
        tools: [{ name: 'test-tool', description: 'A test tool' }],
        handleToolCall: mockHandler
      };

      registry.registerPlugin(pluginModule, 'test-plugin');

      await expect(registry.callTool('test-tool', {})).rejects.toThrow("Error calling tool 'test-tool': Handler error");
    });

    test('should handle trimmed tool names', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ result: 'success' });
      const pluginModule = {
        tools: [{ name: 'test-tool', description: 'A test tool' }],
        handleToolCall: mockHandler
      };

      registry.registerPlugin(pluginModule, 'test-plugin');

      const result = await registry.callTool('  test-tool  ', {});

      expect(result).toEqual({ result: 'success' });
    });
  });

  describe('dispatch', () => {
    test('should dispatch tool call successfully', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ result: 'success' });
      const pluginModule = {
        tools: [{ name: 'test-tool', description: 'A test tool' }],
        handleToolCall: mockHandler
      };

      registry.registerPlugin(pluginModule, 'test-plugin');

      const args = { param1: 'value1' };
      const context = { user: 'test-user' };
      const result = await registry.dispatch('test-tool', args, context);

      expect(mockHandler).toHaveBeenCalledWith('test-tool', args, context);
      expect(result).toEqual({ result: 'success' });
    });

    test('should return error for disabled tools', async () => {
      registry.setDisabledTools(['test-tool']);

      const result = await registry.dispatch('test-tool', {});

      expect(result).toEqual({ ok: false, message: "Tool 'test-tool' is disabled" });
    });

    test('should return error for non-existent tools', async () => {
      const result = await registry.dispatch('non-existent-tool', {});

      expect(result).toEqual({ ok: false, message: "No plugin handler for tool 'non-existent-tool'" });
    });

    test('should return error when handler throws', async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
      const pluginModule = {
        tools: [{ name: 'test-tool', description: 'A test tool' }],
        handleToolCall: mockHandler
      };

      registry.registerPlugin(pluginModule, 'test-plugin');

      const result = await registry.dispatch('test-tool', {});

      expect(result).toEqual({ ok: false, message: "Error calling tool 'test-tool': Handler error" });
    });

    test('should handle null/undefined args and context', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ result: 'success' });
      const pluginModule = {
        tools: [{ name: 'test-tool', description: 'A test tool' }],
        handleToolCall: mockHandler
      };

      registry.registerPlugin(pluginModule, 'test-plugin');

      const result = await registry.dispatch('test-tool', null, undefined);

      expect(mockHandler).toHaveBeenCalledWith('test-tool', {}, {});
      expect(result).toEqual({ result: 'success' });
    });
  });

  describe('Integration scenarios', () => {
    test('should handle complete plugin workflow', async () => {
      // Register a plugin programmatically
      const pluginModule = {
        tools: [
          { name: 'tool1', description: 'First tool' },
          { name: 'tool2', description: 'Second tool' }
        ],
        handleToolCall: jest.fn().mockImplementation((name, args) => {
          return Promise.resolve({ tool: name, args });
        })
      };

      registry.registerPlugin(pluginModule, 'test-plugin');

      // Verify tools are registered
      expect(registry.tools).toHaveLength(2);
      expect(registry.hasHandler('tool1')).toBe(true);
      expect(registry.hasHandler('tool2')).toBe(true);

      // Call tools
      const result1 = await registry.callTool('tool1', { param: 'value1' });
      const result2 = await registry.dispatch('tool2', { param: 'value2' });

      expect(result1).toEqual({ tool: 'tool1', args: { param: 'value1' } });
      expect(result2).toEqual({ tool: 'tool2', args: { param: 'value2' } });

      // List tools
      const tools = registry.listTools();
      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.name)).toEqual(['tool1', 'tool2']);
    });

    test('should handle disabled tools workflow', () => {
      const pluginModule = {
        tools: [
          { name: 'enabled-tool', description: 'Enabled tool' },
          { name: 'disabled-tool', description: 'Disabled tool' }
        ],
        handleToolCall: jest.fn()
      };

      registry.setDisabledTools(['disabled-tool']);
      registry.registerPlugin(pluginModule, 'test-plugin');

      expect(registry.tools).toHaveLength(1);
      expect(registry.tools[0].name).toBe('enabled-tool');
      expect(registry.hasHandler('enabled-tool')).toBe(true);
      expect(registry.hasHandler('disabled-tool')).toBe(false);
    });
  });
});
