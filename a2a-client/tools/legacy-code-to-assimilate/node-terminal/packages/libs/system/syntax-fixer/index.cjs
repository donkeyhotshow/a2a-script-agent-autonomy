/**
 * @fileoverview Система автоматического исправления синтаксических ошибок
 * @author MCP Terminal Team
 * @version 1.0.0
 */
const { validationUtils } = require('@libs/validation/validation/validation-utils.cjs');
const fileUtilsFactory = require('@libs/system/file-operations/index.cjs');
const fileSystemUtils = fileUtilsFactory(console, require('@libs/system/path-utils/index.js').default);
const { errorUtils } = require('@libs/error-management/error-handler/error-utils.cjs');
const { debugSystem, DEBUG_CATEGORIES } = require('C:/apps/root/mcp/node-terminal/mcp/DebugSystem.cjs');
const fs = require('fs');
const path = require('path');

/**
 * Класс для автоматического исправления синтаксических ошибок
 */
class SyntaxFixer {
  constructor() {
    this.fixPatterns = new Map();
    this.filePatterns = new Map();
    this.initializePatterns();
  }

  /**
   * Инициализация паттернов для исправления
   */
  initializePatterns() {
    // Паттерны для исправления команд
    this.fixPatterns.set('powershell_in_cmd', {
      pattern: /powershell\s+-Command\s+/i,
      replacement: 'powershell -Command "',
      description: 'Исправление PowerShell команд'
    });

    // Паттерны для файлов
    this.filePatterns.set('javascript', {
      extensions: ['.js', '.cjs'],
      patterns: [
        {
          name: 'missing_semicolon',
          pattern: /([^;])\s*$/m,
          replacement: '$1;',
          description: 'Добавление отсутствующих точек с запятой'
        }
      ]
    });
  }

  /**
   * Сканирование всего проекта на синтаксические ошибки
   */
  async scanProject(projectPath = process.cwd()) {
    const results = {
      scannedFiles: 0,
      fixedFiles: 0,
      totalIssues: 0,
      issuesByType: new Map(),
      files: []
    };

    try {
      const files = await this.getAllFiles(projectPath);
      
      for (const file of files) {
        const fileResult = await this.scanFile(file);
        results.scannedFiles++;
        
        if (fileResult.issues.length > 0) {
          results.files.push(fileResult);
          results.totalIssues += fileResult.issues.length;
          
          // Группировка по типам
          for (const issue of fileResult.issues) {
            const count = results.issuesByType.get(issue.type) || 0;
            results.issuesByType.set(issue.type, count + 1);
          }
        }
      }

      // Автоматическое исправление
      if (results.totalIssues > 0) {
        await this.autoFixProject(results.files);
        results.fixedFiles = results.files.filter(f => f.fixed).length;
      }
    } catch (error) {
      console.error('Error scanning project:', error.message);
    }

    return results;
  }

  /**
   * Получение всех файлов проекта
   */
  async getAllFiles(dirPath, excludeDirs = ['node_modules', '.git', 'dist', 'build']) {
    const files = [];
    
    const scanDir = async (currentPath) => {
      try {
        const items = fs.readdirSync(currentPath);
        
        for (const item of items) {
          const fullPath = fileSystemUtils.join(currentPath, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            if (!excludeDirs.includes(item)) {
              await scanDir(fullPath);
            }
          } else {
            files.push(fullPath);
          }
        }
      } catch (error) {
        console.error('Error scanning directory:', error.message);
      }
    };

    await scanDir(dirPath);
    return files;
  }

  /**
   * Сканирование отдельного файла
   */
  async scanFile(filePath) {
    const result = {
      path: filePath,
      issues: [],
      fixed: false,
      originalContent: '',
      fixedContent: ''
    };

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      result.originalContent = content;
      
      // Определение типа файла
      const ext = path.extname(filePath);
      const fileName = path.basename(filePath);
      
      // Поиск паттернов для исправления
      for (const [type, config] of this.filePatterns) {
        if (config.extensions.includes(ext) || config.extensions.includes(fileName)) {
          for (const pattern of config.patterns) {
            if (pattern.pattern.test(content)) {
              result.issues.push({
                type: pattern.name,
                description: pattern.description,
                severity: 'medium',
                canAutoFix: true,
                pattern: pattern
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error scanning file:', error.message);
    }

    return result;
  }

  /**
   * Автоматическое исправление файлов
   */
  async autoFixProject(files) {
    for (const file of files) {
      if (file.issues.some(issue => issue.canAutoFix)) {
        await this.fixFile(file);
      }
    }
  }

  /**
   * Исправление отдельного файла
   */
  async fixFile(fileResult) {
    try {
      let fixedContent = fileResult.originalContent;
      const appliedFixes = [];

      for (const issue of fileResult.issues) {
        if (issue.canAutoFix && issue.pattern) {
          const originalContent = fixedContent;
          fixedContent = fixedContent.replace(issue.pattern.pattern, issue.pattern.replacement);
          
          if (fixedContent !== originalContent) {
            appliedFixes.push({
              type: issue.type,
              description: issue.pattern.description,
              original: originalContent,
              fixed: fixedContent
            });
          }
        }
      }

      if (appliedFixes.length > 0) {
        // Создание backup
        const backupPath = `${fileResult.path}.backup`;
        fs.writeFileSync(backupPath, fileResult.originalContent);
        
        // Запись исправленного файла
        fs.writeFileSync(fileResult.path, fixedContent);
        
        fileResult.fixedContent = fixedContent;
        fileResult.fixed = true;
        fileResult.appliedFixes = appliedFixes;

        // Логирование исправления
        debugSystem.registerProblem({
          category: DEBUG_CATEGORIES.SYNTAX_FIXED,
          title: `Файл исправлен: ${path.basename(fileResult.path)}`,
          description: `Применено ${appliedFixes.length} исправлений`,
          errorDetails: JSON.stringify(appliedFixes, null, 2)
        });
      }
    } catch (error) {
      console.error('Error fixing file:', error.message);
    }
  }

  /**
   * Анализ команды на наличие синтаксических ошибок
   */
  analyzeCommand(command) {
    const issues = [];
    
    for (const [type, fix] of this.fixPatterns) {
      if (fix.pattern.test(command)) {
        issues.push({
          type,
          description: fix.description,
          severity: 'medium',
          canAutoFix: true
        });
      }
    }

    return issues;
  }

  /**
   * Исправление команды
   */
  fixCommand(command) {
    let fixedCommand = command;
    
    for (const [type, fix] of this.fixPatterns) {
      fixedCommand = fixedCommand.replace(fix.pattern, fix.replacement);
    }

    return fixedCommand;
  }
}

// Создание экземпляра
const syntaxFixer = new SyntaxFixer();

module.exports = {
  SyntaxFixer,
  syntaxFixer
};
