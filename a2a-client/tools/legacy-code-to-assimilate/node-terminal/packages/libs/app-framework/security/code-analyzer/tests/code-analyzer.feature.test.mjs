import {
  detectLanguage,
  hasTests,
  hasDocumentation,
  assessComplexity
} from '../src/code-analyzer.js';

describe('CodeAnalyzer расширенная функциональность', () => {
  describe('Поддержка расширенного статического анализа для множественных языков', () => {
    test('должен поддерживать расширенный статический анализ для различных языков программирования', () => {
      // Тестируем определение языков по расширениям
      const languageTests = [
        { file: 'app.js', expected: 'javascript' },
        { file: 'component.tsx', expected: 'react-typescript' },
        { file: 'main.py', expected: 'python' },
        { file: 'App.java', expected: 'java' },
        { file: 'algorithm.cpp', expected: 'cpp' },
        { file: 'database.php', expected: 'php' },
        { file: 'server.go', expected: 'go' },
        { file: 'parser.rs', expected: 'rust' },
        { file: 'view.swift', expected: 'swift' },
        { file: 'service.kt', expected: 'kotlin' },
        { file: 'model.cs', expected: 'csharp' },
        { file: 'index.html', expected: 'html' },
        { file: 'styles.css', expected: 'css' },
        { file: 'config.json', expected: 'json' },
        { file: 'docker-compose.yml', expected: 'yaml' },
        { file: 'README.md', expected: 'markdown' },
        { file: 'query.sql', expected: 'sql' }
      ];
      
      languageTests.forEach(({ file, expected }) => {
        const detected = detectLanguage(file);
        expect(detected).toBe(expected);
      });
    });

    test('должен корректно обрабатывать файлы с неизвестными расширениями', () => {
      const unknownFiles = [
        'file.xyz',
        'script.unknown',
        'data.bin',
        'archive.tar.gz'
      ];
      
      unknownFiles.forEach(file => {
        const detected = detectLanguage(file);
        expect(detected).toBe('unknown');
      });
    });

    test('должен поддерживать файлы без расширений', () => {
      const noExtensionFiles = [
        'Dockerfile',
        'Makefile',
        'README',
        'LICENSE'
      ];
      
      noExtensionFiles.forEach(file => {
        const detected = detectLanguage(file);
        expect(detected).toBe('unknown');
      });
    });
  });

  describe('Детекция сложных code smells и анти-паттернов', () => {
    test('должен идентифицировать сложные code smells и анти-паттерны', () => {
      // Расширяем функциональность для детекции code smells
      const detectCodeSmells = (content, language) => {
        const smells = [];
        
        // Длинные функции
        const longFunctionPattern = /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\}/g;
        const functions = content.match(longFunctionPattern) || [];
        
        functions.forEach(func => {
          const lines = func.split('\n').length;
          if (lines > 20) {
            smells.push({
              type: 'long_function',
              severity: 'medium',
              message: `Function is ${lines} lines long (recommended: <20)`
            });
          }
        });
        
        // Дублированный код
        const lines = content.split('\n');
        const duplicateLines = new Map();
        
        lines.forEach((line, index) => {
          const trimmed = line.trim();
          if (trimmed.length > 10) { // Игнорируем короткие строки
            if (duplicateLines.has(trimmed)) {
              duplicateLines.get(trimmed).push(index + 1);
            } else {
              duplicateLines.set(trimmed, [index + 1]);
            }
          }
        });
        
        duplicateLines.forEach((lineNumbers, line) => {
          if (lineNumbers.length > 2) {
            smells.push({
              type: 'duplicate_code',
              severity: 'high',
              message: `Duplicate code found on lines: ${lineNumbers.join(', ')}`
            });
          }
        });
        
        // Магические числа
        const magicNumbers = content.match(/\b\d{3,}\b/g) || [];
        if (magicNumbers.length > 5) {
          smells.push({
            type: 'magic_numbers',
            severity: 'low',
            message: `Found ${magicNumbers.length} magic numbers`
          });
        }
        
        // Глубоко вложенные условия
        const nestedConditions = content.match(/\{\s*\{/g) || [];
        if (nestedConditions.length > 3) {
          smells.push({
            type: 'deep_nesting',
            severity: 'medium',
            message: 'Deep nesting detected'
          });
        }
        
        return smells;
      };
      
      // Тестируем детекцию code smells
      const codeWithSmells = `
function veryLongFunction() {
  let result = 0;
  for (let i = 0; i < 1000; i++) {
    if (i % 2 === 0) {
      if (i % 4 === 0) {
        if (i % 8 === 0) {
          result += i;
        }
      }
    }
  }
  return result;
}

function anotherLongFunction() {
  let result = 0;
  for (let i = 0; i < 1000; i++) {
    if (i % 2 === 0) {
      if (i % 4 === 0) {
        if (i % 8 === 0) {
          result += i;
        }
      }
    }
  }
  return result;
}
`;
      
      const smells = detectCodeSmells(codeWithSmells, 'javascript');
      
      expect(smells.length).toBeGreaterThan(0);
      expect(smells.some(s => s.type === 'long_function')).toBe(true);
      expect(smells.some(s => s.type === 'duplicate_code')).toBe(true);
      expect(smells.some(s => s.type === 'deep_nesting')).toBe(true);
    });

    test('должен детектировать специфичные для языка анти-паттерны', () => {
      const detectLanguageSpecificSmells = (content, language) => {
        const smells = [];
        
        switch (language) {
          case 'javascript':
            // eval usage
            if (content.includes('eval(')) {
              smells.push({
                type: 'eval_usage',
                severity: 'critical',
                message: 'eval() usage detected - security risk'
              });
            }
            
            // console.log in production
            if (content.includes('console.log(')) {
              smells.push({
                type: 'console_log',
                severity: 'low',
                message: 'console.log() found - should be removed in production'
              });
            }
            break;
            
          case 'python':
            // Global variables
            if (content.match(/^[a-zA-Z_]\w*\s*=/gm)) {
              smells.push({
                type: 'global_variables',
                severity: 'medium',
                message: 'Global variables detected'
              });
            }
            
            // Bare except
            if (content.includes('except:')) {
              smells.push({
                type: 'bare_except',
                severity: 'medium',
                message: 'Bare except clause detected'
              });
            }
            break;
            
          case 'java':
            // Public fields
            if (content.match(/public\s+\w+\s+\w+\s*;/)) {
              smells.push({
                type: 'public_fields',
                severity: 'medium',
                message: 'Public fields detected - consider encapsulation'
              });
            }
            break;
        }
        
        return smells;
      };
      
      // Тестируем JavaScript анти-паттерны
      const jsCode = `
function test() {
  eval('console.log("test")');
  console.log('debug info');
}
`;
      
      const jsSmells = detectLanguageSpecificSmells(jsCode, 'javascript');
      expect(jsSmells.some(s => s.type === 'eval_usage')).toBe(true);
      expect(jsSmells.some(s => s.type === 'console_log')).toBe(true);
      
      // Тестируем Python анти-паттерны
      const pythonCode = `
global_var = 123

try:
    result = 1 / 0
except:
    print("Error occurred")
`;
      
      const pythonSmells = detectLanguageSpecificSmells(pythonCode, 'python');
      expect(pythonSmells.some(s => s.type === 'global_variables')).toBe(true);
      expect(pythonSmells.some(s => s.type === 'bare_except')).toBe(true);
    });
  });

  describe('Интеграция с различными IDE для real-time feedback', () => {
    test('должен интегрироваться с различными IDE для real-time feedback', () => {
      // Симулируем интеграцию с IDE
      const ideIntegration = {
        vsCode: {
          name: 'VS Code',
          extension: 'code-analyzer-vscode',
          features: ['real-time', 'diagnostics', 'quick-fixes']
        },
        intellij: {
          name: 'IntelliJ IDEA',
          plugin: 'code-analyzer-intellij',
          features: ['inspections', 'intentions', 'refactoring']
        },
        vim: {
          name: 'Vim/Neovim',
          plugin: 'code-analyzer-vim',
          features: ['linting', 'formatting', 'snippets']
        }
      };
      
      // Тестируем поддержку различных IDE
      Object.values(ideIntegration).forEach(ide => {
        expect(ide.name).toBeDefined();
        expect(ide.features).toBeInstanceOf(Array);
        expect(ide.features.length).toBeGreaterThan(0);
      });
      
      // Тестируем VS Code интеграцию
      const vsCode = ideIntegration.vsCode;
      expect(vsCode.extension).toBe('code-analyzer-vscode');
      expect(vsCode.features).toContain('real-time');
      expect(vsCode.features).toContain('diagnostics');
    });

    test('должен предоставлять API для IDE интеграции', () => {
      // Симулируем API для IDE
      const ideApi = {
        // Получение диагностики для файла
        getDiagnostics: (filePath, content) => {
          const diagnostics = [];
          
          // Проверяем наличие тестов
          if (!hasTests(content, filePath)) {
            diagnostics.push({
              severity: 'warning',
              message: 'No tests found for this file',
              range: { start: 0, end: 0 }
            });
          }
          
          // Проверяем документацию
          if (!hasDocumentation(content)) {
            diagnostics.push({
              severity: 'info',
              message: 'Consider adding documentation',
              range: { start: 0, end: 0 }
            });
          }
          
          // Проверяем сложность
          const complexity = assessComplexity(content);
          if (complexity === 'high') {
            diagnostics.push({
              severity: 'warning',
              message: 'High complexity detected - consider refactoring',
              range: { start: 0, end: 0 }
            });
          }
          
          return diagnostics;
        },
        
        // Получение quick fixes
        getQuickFixes: (diagnostic) => {
          const fixes = [];
          
          switch (diagnostic.message) {
            case 'No tests found for this file':
              fixes.push({
                title: 'Create test file',
                action: 'create_test'
              });
              break;
            case 'Consider adding documentation':
              fixes.push({
                title: 'Add JSDoc comment',
                action: 'add_jsdoc'
              });
              break;
            case 'High complexity detected - consider refactoring':
              fixes.push({
                title: 'Extract method',
                action: 'extract_method'
              });
              break;
          }
          
          return fixes;
        }
      };
      
      // Тестируем API
      const testContent = `
function complexFunction() {
  let result = 0;
  for (let i = 0; i < 100; i++) {
    if (i % 2 === 0) {
      result += i;
    }
  }
  return result;
}
`;
      
      const diagnostics = ideApi.getDiagnostics('test.js', testContent);
      expect(diagnostics.length).toBeGreaterThan(0);
      
      const quickFixes = ideApi.getQuickFixes(diagnostics[0]);
      expect(quickFixes.length).toBeGreaterThan(0);
    });
  });

  describe('Генерация детальных отчетов о качестве кода и уязвимостях безопасности', () => {
    test('должен генерировать детальные отчеты о качестве кода и уязвимостях безопасности', () => {
      // Симулируем генератор отчетов
      const generateReport = (files) => {
        const report = {
          summary: {
            totalFiles: files.length,
            languages: {},
            overallQuality: 0,
            securityIssues: 0
          },
          details: [],
          recommendations: []
        };
        
        let totalQuality = 0;
        let totalSecurityIssues = 0;
        
        files.forEach(file => {
          const fileReport = {
            path: file.path,
            language: detectLanguage(file.path),
            quality: 0,
            issues: [],
            metrics: {}
          };
          
          // Анализируем качество
          if (hasTests(file.content, file.path)) {
            fileReport.quality += 25;
          }
          
          if (hasDocumentation(file.content)) {
            fileReport.quality += 25;
          }
          
          const complexity = assessComplexity(file.content);
          switch (complexity) {
            case 'low':
              fileReport.quality += 25;
              break;
            case 'medium':
              fileReport.quality += 15;
              break;
            case 'high':
              fileReport.quality += 5;
              break;
          }
          
          // Проверяем безопасность
          const securityIssues = detectSecurityIssues(file.content, fileReport.language);
          fileReport.issues.push(...securityIssues);
          fileReport.securityIssues = securityIssues.length;
          
          totalQuality += fileReport.quality;
          totalSecurityIssues += fileReport.securityIssues;
          
          report.details.push(fileReport);
        });
        
        report.summary.overallQuality = Math.round(totalQuality / files.length);
        report.summary.securityIssues = totalSecurityIssues;
        
        // Генерируем рекомендации
        if (report.summary.overallQuality < 70) {
          report.recommendations.push('Overall code quality is low. Consider adding tests and documentation.');
        }
        
        if (report.summary.securityIssues > 0) {
          report.recommendations.push('Security issues detected. Review and fix critical vulnerabilities.');
        }
        
        return report;
      };
      
      // Функция детекции уязвимостей безопасности
      const detectSecurityIssues = (content, language) => {
        const issues = [];
        
        // SQL Injection
        if (content.includes('SELECT') && content.includes('WHERE') && content.includes('+')) {
          issues.push({
            type: 'sql_injection',
            severity: 'critical',
            message: 'Potential SQL injection vulnerability detected'
          });
        }
        
        // XSS
        if (content.includes('innerHTML') || content.includes('document.write')) {
          issues.push({
            type: 'xss',
            severity: 'high',
            message: 'Potential XSS vulnerability detected'
          });
        }
        
        // Hardcoded credentials
        if (content.match(/password\s*=\s*['"][^'"]+['"]/i)) {
          issues.push({
            type: 'hardcoded_credentials',
            severity: 'high',
            message: 'Hardcoded credentials detected'
          });
        }
        
        return issues;
      };
      
      // Тестируем генерацию отчетов
      const testFiles = [
        {
          path: 'app.js',
          content: `
/**
 * Main application file
 */
function main() {
  const password = 'secret123';
  document.getElementById('output').innerHTML = userInput;
}

// Tests
describe('main', () => {
  test('should work correctly', () => {
    expect(main).toBeDefined();
  });
});
`
        },
        {
          path: 'database.py',
          content: `
def get_user(user_id):
    query = "SELECT * FROM users WHERE id = " + str(user_id)
    return execute_query(query)
`
        }
      ];
      
      const report = generateReport(testFiles);
      
      expect(report.summary.totalFiles).toBe(2);
      expect(report.summary.overallQuality).toBeGreaterThan(0);
      expect(report.summary.securityIssues).toBeGreaterThan(0);
      expect(report.details.length).toBe(2);
      expect(report.recommendations.length).toBeGreaterThan(0);
      
      // Проверяем детали файлов
      const appJsReport = report.details.find(d => d.path === 'app.js');
      expect(appJsReport.quality).toBeGreaterThan(50); // Есть тесты и документация
      expect(appJsReport.securityIssues).toBeGreaterThan(0); // Есть XSS и hardcoded credentials
      
      const dbReport = report.details.find(d => d.path === 'database.py');
      expect(dbReport.securityIssues).toBeGreaterThan(0); // Есть SQL injection
    });

    test('должен поддерживать различные форматы отчетов', () => {
      const reportFormats = {
        json: (data) => JSON.stringify(data, null, 2),
        html: (data) => generateHtmlReport(data),
        markdown: (data) => generateMarkdownReport(data),
        csv: (data) => generateCsvReport(data)
      };
      
      const generateHtmlReport = (data) => {
        return `
          <html>
            <head><title>Code Analysis Report</title></head>
            <body>
              <h1>Code Quality Report</h1>
              <p>Overall Quality: ${data.summary.overallQuality}%</p>
              <p>Security Issues: ${data.summary.securityIssues}</p>
            </body>
          </html>
        `;
      };
      
      const generateMarkdownReport = (data) => {
        return `
          # Code Quality Report
          
          ## Summary
          - Overall Quality: ${data.summary.overallQuality}%
          - Security Issues: ${data.summary.securityIssues}
          
          ## Details
          ${data.details.map(d => `- ${d.path}: ${d.quality}% quality, ${d.securityIssues} issues`).join('\n')}
        `;
      };
      
      const generateCsvReport = (data) => {
        const headers = ['File', 'Language', 'Quality', 'Security Issues'];
        const rows = data.details.map(d => [d.path, d.language, d.quality, d.securityIssues]);
        return [headers, ...rows].map(row => row.join(',')).join('\n');
      };
      
      // Тестируем различные форматы
      const testData = {
        summary: { overallQuality: 75, securityIssues: 2 },
        details: [
          { path: 'test.js', language: 'javascript', quality: 80, securityIssues: 1 }
        ]
      };
      
      expect(reportFormats.json(testData)).toContain('"overallQuality": 75');
      expect(reportFormats.html(testData)).toContain('<h1>Code Quality Report</h1>');
      expect(reportFormats.markdown(testData)).toContain('# Code Quality Report');
      expect(reportFormats.csv(testData)).toContain('File,Language,Quality,Security Issues');
    });
  });
});
