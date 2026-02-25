const { SyntaxFixer, syntaxFixer } = require('../index.cjs');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock dependencies
jest.mock('C:/apps/libs/validation/validation/validation-utils.js', () => ({
  validationUtils: {
    isString: jest.fn((val) => typeof val === 'string'),
  }
}));

jest.mock('C:/apps/libs/system/file-operations/index.js', () => ({
  fileSystemUtils: {
    join: jest.fn((...args) => path.join(...args)),
  }
}));

jest.mock('C:/apps/libs/error-management/error-handler/error-utils.js', () => ({
  errorUtils: {
    safeExecute: jest.fn((fn) => fn()),
  }
}));

jest.mock('C:/apps/root/mcp/node-terminal/mcp/DebugSystem.cjs', () => ({
  debugSystem: {
    registerProblem: jest.fn(),
    log: jest.fn(),
  },
  DEBUG_CATEGORIES: {
    SYNTAX_FIXED: 'syntax_fixed',
    GENERAL: 'general',
  }
}));

// Mock fs module for file operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('SyntaxFixer', () => {
  let fixer;
  let testDir;

  beforeEach(() => {
    jest.clearAllMocks();
    
    testDir = path.join(os.tmpdir(), `syntax-fixer-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    fixer = new SyntaxFixer();

    // Restore actual fs.mkdirSync for test directory setup
    fs.mkdirSync = jest.requireActual('fs').mkdirSync;
    fs.rmSync = jest.requireActual('fs').rmSync;
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    test('should initialize with empty maps', () => {
      expect(fixer.fixPatterns).toBeInstanceOf(Map);
      expect(fixer.filePatterns).toBeInstanceOf(Map);
      expect(fixer.fixPatterns.size).toBeGreaterThan(0);
      expect(fixer.filePatterns.size).toBeGreaterThan(0);
    });
  });

  describe('initializePatterns', () => {
    test('should initialize command fix patterns', () => {
      const powershellFix = fixer.fixPatterns.get('powershell_in_cmd');
      expect(powershellFix).toBeDefined();
      expect(powershellFix.pattern).toBeInstanceOf(RegExp);
      expect(powershellFix.replacement).toBe('powershell -Command "');
      expect(powershellFix.description).toBe('Исправление PowerShell команд');
    });

    test('should initialize file fix patterns', () => {
      const javascriptPatterns = fixer.filePatterns.get('javascript');
      expect(javascriptPatterns).toBeDefined();
      expect(javascriptPatterns.extensions).toEqual(['.js', '.cjs']);
      expect(javascriptPatterns.patterns).toHaveLength(1);
      expect(javascriptPatterns.patterns[0].name).toBe('missing_semicolon');
    });
  });

  describe('analyzeCommand', () => {
    test('should find powershell_in_cmd issue', () => {
      const issues = fixer.analyzeCommand('powershell -Command get-service');
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('powershell_in_cmd');
      expect(issues[0].description).toBe('Исправление PowerShell команд');
      expect(issues[0].canAutoFix).toBe(true);
    });

    test('should not find issues for valid command', () => {
      const issues = fixer.analyzeCommand('ls -la');
      expect(issues).toHaveLength(0);
    });

    test('should handle empty command', () => {
      const issues = fixer.analyzeCommand('');
      expect(issues).toHaveLength(0);
    });
  });

  describe('fixCommand', () => {
    test('should fix powershell_in_cmd issue', () => {
      const originalCommand = 'powershell -Command get-service';
      const fixedCommand = fixer.fixCommand(originalCommand);
      expect(fixedCommand).toBe('powershell -Command "get-service');
    });

    test('should not change valid command', () => {
      const originalCommand = 'ls -la';
      const fixedCommand = fixer.fixCommand(originalCommand);
      expect(fixedCommand).toBe(originalCommand);
    });

    test('should handle empty command', () => {
      const originalCommand = '';
      const fixedCommand = fixer.fixCommand(originalCommand);
      expect(fixedCommand).toBe(originalCommand);
    });
  });

  describe('getAllFiles', () => {
    test('should get all files in a directory', async () => {
      const file1 = path.join(testDir, 'file1.js');
      const file2 = path.join(testDir, 'file2.txt');
      fs.writeFileSync(file1, 'content');
      fs.writeFileSync(file2, 'content');

      // Mock fs.readdirSync and fs.statSync
      fs.readdirSync.mockReturnValueOnce([{ name: 'file1.js', isDirectory: () => false }, { name: 'file2.txt', isDirectory: () => false }]);
      fs.statSync.mockReturnValueOnce({ isDirectory: () => false });
      fs.statSync.mockReturnValueOnce({ isDirectory: () => false });

      const files = await fixer.getAllFiles(testDir);
      expect(files).toHaveLength(2);
      expect(files).toContain(file1);
      expect(files).toContain(file2);
    });

    test('should exclude specified directories', async () => {
      const file1 = path.join(testDir, 'file1.js');
      const nodeModulesDir = path.join(testDir, 'node_modules');
      const nodeModulesFile = path.join(nodeModulesDir, 'lib.js');

      fs.mkdirSync(nodeModulesDir, { recursive: true });
      fs.writeFileSync(file1, 'content');
      fs.writeFileSync(nodeModulesFile, 'content');

      fs.readdirSync.mockReturnValueOnce([{ name: 'file1.js', isDirectory: () => false }, { name: 'node_modules', isDirectory: () => true }]);
      fs.readdirSync.mockReturnValueOnce([{ name: 'lib.js', isDirectory: () => false }]);
      fs.statSync.mockReturnValueOnce({ isDirectory: () => false });
      fs.statSync.mockReturnValueOnce({ isDirectory: () => true });
      fs.statSync.mockReturnValueOnce({ isDirectory: () => false });

      const files = await fixer.getAllFiles(testDir, ['node_modules']);
      expect(files).toHaveLength(1);
      expect(files).toContain(file1);
      expect(files).not.toContain(nodeModulesFile);
    });

    test('should handle nested directories', async () => {
      const subDir = path.join(testDir, 'subdir');
      const file1 = path.join(testDir, 'file1.js');
      const file2 = path.join(subDir, 'file2.js');

      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(file1, 'content');
      fs.writeFileSync(file2, 'content');

      fs.readdirSync.mockReturnValueOnce([{ name: 'file1.js', isDirectory: () => false }, { name: 'subdir', isDirectory: () => true }]);
      fs.readdirSync.mockReturnValueOnce([{ name: 'file2.js', isDirectory: () => false }]);
      fs.statSync.mockReturnValueOnce({ isDirectory: () => false });
      fs.statSync.mockReturnValueOnce({ isDirectory: () => true });
      fs.statSync.mockReturnValueOnce({ isDirectory: () => false });

      const files = await fixer.getAllFiles(testDir);
      expect(files).toHaveLength(2);
      expect(files).toContain(file1);
      expect(files).toContain(file2);
    });
  });

  describe('scanFile', () => {
    test('should find missing semicolon issue in js file', async () => {
      const filePath = path.join(testDir, 'test.js');
      fs.writeFileSync(filePath, 'const x = 1');

      fs.readFileSync.mockReturnValueOnce('const x = 1');

      const result = await fixer.scanFile(filePath);
      expect(result.path).toBe(filePath);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('missing_semicolon');
      expect(result.issues[0].canAutoFix).toBe(true);
    });

    test('should not find issues in valid js file', async () => {
      const filePath = path.join(testDir, 'test.js');
      fs.writeFileSync(filePath, 'const x = 1;');

      fs.readFileSync.mockReturnValueOnce('const x = 1;');

      const result = await fixer.scanFile(filePath);
      expect(result.issues).toHaveLength(0);
    });

    test('should ignore non-javascript files', async () => {
      const filePath = path.join(testDir, 'test.txt');
      fs.writeFileSync(filePath, 'const x = 1');

      fs.readFileSync.mockReturnValueOnce('const x = 1');

      const result = await fixer.scanFile(filePath);
      expect(result.issues).toHaveLength(0);
    });

    test('should handle empty file', async () => {
      const filePath = path.join(testDir, 'empty.js');
      fs.writeFileSync(filePath, '');

      fs.readFileSync.mockReturnValueOnce('');

      const result = await fixer.scanFile(filePath);
      expect(result.issues).toHaveLength(0);
    });

    test('should handle file read errors', async () => {
      const filePath = path.join(testDir, 'non-existent.js');

      fs.readFileSync.mockImplementationOnce(() => { throw new Error('File not found'); });

      const result = await fixer.scanFile(filePath);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('fixFile', () => {
    test('should fix file and create backup', async () => {
      const filePath = path.join(testDir, 'test.js');
      const originalContent = 'const x = 1';
      fs.writeFileSync(filePath, originalContent);

      const fileResult = {
        path: filePath,
        issues: [
          {
            type: 'missing_semicolon',
            description: 'Добавление отсутствующих точек с запятой',
            severity: 'medium',
            canAutoFix: true,
            pattern: { pattern: /([^;])\s*$/m, replacement: '$1;' }
          }
        ],
        fixed: false,
        originalContent: originalContent,
        fixedContent: ''
      };

      fs.readFileSync.mockReturnValueOnce(originalContent);

      await fixer.fixFile(fileResult);

      expect(fileResult.fixed).toBe(true);
      expect(fileResult.fixedContent).toBe('const x = 1;');
      expect(fs.writeFileSync).toHaveBeenCalledWith(filePath + '.backup', originalContent);
      expect(fs.writeFileSync).toHaveBeenCalledWith(filePath, 'const x = 1;');
      expect(require('C:/apps/root/mcp/node-terminal/mcp/DebugSystem.cjs').debugSystem.registerProblem).toHaveBeenCalled();
    });

    test('should not fix if no auto-fixable issues', async () => {
      const filePath = path.join(testDir, 'test.js');
      const originalContent = 'const x = 1; // some comment';
      fs.writeFileSync(filePath, originalContent);

      const fileResult = {
        path: filePath,
        issues: [
          {
            type: 'non_autofixable',
            description: 'Some non-autofixable issue',
            severity: 'high',
            canAutoFix: false
          }
        ],
        fixed: false,
        originalContent: originalContent,
        fixedContent: ''
      };

      fs.readFileSync.mockReturnValueOnce(originalContent);

      await fixer.fixFile(fileResult);

      expect(fileResult.fixed).toBe(false);
      expect(fileResult.fixedContent).toBe('');
      expect(fs.writeFileSync).not.toHaveBeenCalledWith(expect.any(String), originalContent);
      expect(fs.writeFileSync).not.toHaveBeenCalledWith(filePath, expect.any(String));
      expect(require('C:/apps/root/mcp/node-terminal/mcp/DebugSystem.cjs').debugSystem.registerProblem).not.toHaveBeenCalled();
    });
  });

  describe('autoFixProject', () => {
    test('should autofix all fixable files', async () => {
      const file1Path = path.join(testDir, 'file1.js');
      const file2Path = path.join(testDir, 'file2.js');
      fs.writeFileSync(file1Path, 'const a = 1');
      fs.writeFileSync(file2Path, 'const b = 2;');

      const fileResults = [
        {
          path: file1Path,
          issues: [
            {
              type: 'missing_semicolon',
              canAutoFix: true,
              pattern: { pattern: /([^;])\s*$/m, replacement: '$1;' }
            }
          ],
          fixed: false,
          originalContent: 'const a = 1',
          fixedContent: ''
        },
        {
          path: file2Path,
          issues: [], // No issues
          fixed: false,
          originalContent: 'const b = 2;',
          fixedContent: ''
        }
      ];

      // Mock fixFile
      jest.spyOn(fixer, 'fixFile').mockImplementationOnce(async (fileResult) => {
        fileResult.fixed = true;
        fileResult.fixedContent = fileResult.originalContent + ';';
      });

      await fixer.autoFixProject(fileResults);

      expect(fixer.fixFile).toHaveBeenCalledTimes(1);
      expect(fileResults[0].fixed).toBe(true);
      expect(fileResults[1].fixed).toBe(false);
    });
  });

  describe('scanProject', () => {
    test('should scan and autofix project files', async () => {
      const file1Path = path.join(testDir, 'file1.js');
      const file2Path = path.join(testDir, 'file2.js');
      fs.writeFileSync(file1Path, 'const a = 1');
      fs.writeFileSync(file2Path, 'const b = 2;'); // Already fixed

      // Mock getAllFiles
      jest.spyOn(fixer, 'getAllFiles').mockResolvedValue([file1Path, file2Path]);

      // Mock scanFile
      jest.spyOn(fixer, 'scanFile').mockImplementation(async (filePath) => {
        if (filePath === file1Path) {
          return {
            path: filePath,
            issues: [
              {
                type: 'missing_semicolon',
                canAutoFix: true,
                pattern: { pattern: /([^;])\s*$/m, replacement: '$1;' }
              }
            ],
            fixed: false,
            originalContent: 'const a = 1',
            fixedContent: ''
          };
        } else {
          return {
            path: filePath,
            issues: [],
            fixed: false,
            originalContent: 'const b = 2;',
            fixedContent: ''
          };
        }
      });

      // Mock fixFile
      jest.spyOn(fixer, 'fixFile').mockImplementationOnce(async (fileResult) => {
        fileResult.fixed = true;
        fileResult.fixedContent = fileResult.originalContent + ';';
      });

      const results = await fixer.scanProject(testDir);

      expect(results.scannedFiles).toBe(2);
      expect(results.fixedFiles).toBe(1);
      expect(results.totalIssues).toBe(1);
      expect(results.issuesByType.get('missing_semicolon')).toBe(1);
      expect(results.files).toHaveLength(1); // Only file1 has issues
      expect(results.files[0].fixed).toBe(true);
    });

    test('should not autofix if no issues found', async () => {
      const file1Path = path.join(testDir, 'file1.js');
      fs.writeFileSync(file1Path, 'const a = 1;');

      jest.spyOn(fixer, 'getAllFiles').mockResolvedValue([file1Path]);
      jest.spyOn(fixer, 'scanFile').mockResolvedValue({
        path: file1Path,
        issues: [],
        fixed: false,
        originalContent: 'const a = 1;',
        fixedContent: ''
      });
      jest.spyOn(fixer, 'autoFixProject');

      const results = await fixer.scanProject(testDir);

      expect(results.scannedFiles).toBe(1);
      expect(results.fixedFiles).toBe(0);
      expect(results.totalIssues).toBe(0);
      expect(fixer.autoFixProject).not.toHaveBeenCalled();
    });

    test('should handle project scanning errors', async () => {
      jest.spyOn(fixer, 'getAllFiles').mockImplementationOnce(() => { throw new Error('Scan error'); });
      
      const results = await fixer.scanProject(testDir);

      expect(results.scannedFiles).toBe(0);
      expect(results.fixedFiles).toBe(0);
      expect(results.totalIssues).toBe(0);
    });
  });

  describe('Integration scenarios', () => {
    test('should perform full scan, fix, and analyze workflow', async () => {
      const powershellCommand = 'powershell -Command Get-Date';
      const jsFileContent = 'const greeting = "Hello"';
      const jsFilePath = path.join(testDir, 'greeting.js');

      fs.writeFileSync(jsFilePath, jsFileContent);

      // Analyze and fix command
      const commandIssues = fixer.analyzeCommand(powershellCommand);
      expect(commandIssues).toHaveLength(1);
      expect(commandIssues[0].type).toBe('powershell_in_cmd');
      
      const fixedCommand = fixer.fixCommand(powershellCommand);
      expect(fixedCommand).toBe('powershell -Command "Get-Date');

      // Scan and fix file
      jest.spyOn(fixer, 'getAllFiles').mockResolvedValue([jsFilePath]);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(jsFileContent);
      jest.spyOn(fs, 'writeFileSync');

      const projectResults = await fixer.scanProject(testDir);

      expect(projectResults.scannedFiles).toBe(1);
      expect(projectResults.fixedFiles).toBe(1);
      expect(projectResults.totalIssues).toBe(1);
      expect(projectResults.files[0].fixedContent).toBe('const greeting = "Hello";');
    });
  });
});
