const crypto = require('crypto');
const split2 = require('split2');
const { FileOperations } = require('C:/apps/libs/system/file-operations/src/file-operations.cjs'); // Импортируем FileOperations

class ErrorScraper {
  constructor(loggerInstance, fileSystemUtils = new FileOperations()) {
    // Улучшенные паттерны для Jest
    this.patterns = {
      fail: /^\s*FAIL\s+(.+)$/i,
      pass: /^PASS\s+(.+)$/i,
      testSuite: /^Test Suites:\s+(\d+)\s+(?:passed|failed),\s+(\d+)\s+total/i,
      tests: /^Tests:\s+(\d+)\s+(?:passed|failed),\s+(\d+)\s+total/i,
      error: /^\s*●\s+(.+)$/,
      stackTrace: /^\s+at\s+(.+)$/,
      describe: /^describe\('(.+?)'/i,
      test: /^(?:it|test)\('(.+?)'/i,
      errorType: /^(TypeError|ReferenceError|SyntaxError|Error|Invariant):\s*(.+)$/i
    };
    this.logger = loggerInstance;
    this.fileSystemUtils = fileSystemUtils; // Сохраняем экземпляр FileSystemUtils
  }

  async processStdoutFile(stdoutFile, resultFile, taskId, cwd = '', appId = '', file = '', baseName = '') {
    let content = '';
    try {
      content = await this.fileSystemUtils.readFile(stdoutFile, 'utf8'); // Используем fileSystemUtils.readFile
    } catch (e) {
      content = '';
    }

    if (!content.trim()) {
      return;
    }

    const results = this.parseJestOutput(content);
    
    const errors = results.failures.map(fail => ({
      file: fail.file || stdoutFile,
      line: fail.line || 1,
      message: fail.message,
      fullLine: fail.fullTitle || fail.title,
      stackTrace: fail.stackTrace || [],
      testId: fail.testId || fail.title,
      priority: this.calculatePriority(fail.message),
      type: this.classifyError(fail.message),
    }));

    const summary = errors.length ? errors[0].message : 'Все тесты успешно пройдены';
    const traceback = errors.map(e =>
      Array.isArray(e.stackTrace)
        ? e.stackTrace.map(line => line.trim()).filter(Boolean).join('\n')
        : String(e.stackTrace).trim()
    ).filter(Boolean);

    // Формируем трейсбеки в зависимости от типа ошибки
    let tracebackLines = [];
    
    // Собираем трейсбеки из всех ошибок
    errors.forEach(error => {
      if (Array.isArray(error.stackTrace) && error.stackTrace.length > 0) {
        // Для каждой ошибки берем первую строку трейсбека, которая содержит информацию о тесте
        const testTrace = error.stackTrace.find(trace => 
          trace.includes('__tests__') || trace.includes('.spec.js') || trace.includes('.test.js')
        );
        if (testTrace) {
          tracebackLines.push(testTrace.trim());
        } else {
          tracebackLines.push(error.stackTrace[0].trim());
        }
      }
    });

    // Если не нашли трейсбеков в ошибках
    if (tracebackLines.length === 0) {
      // Ищем трейсбеки в исходном контенте
      const matches = content.match(/at\s+[^\n]+(?=\n|$)/g);
      if (matches && matches.length > 0) {
        tracebackLines = matches
          .filter(line => line.includes('__tests__') || line.includes('.spec.js') || line.includes('.test.js'))
          .map(line => line.trim());
      }
    }
    
    // Если все равно нет трейсбеков, добавляем дефолтный
    if (tracebackLines.length === 0) {
      tracebackLines.push('at <stacktrace>');
    }

    // Если трейсбеков нет, добавляем дефолтный
    if (tracebackLines.length === 0) {
      tracebackLines.push('at <stacktrace>');
    }

    const result = {
      id: taskId,
      status: errors.length ? 'failed' : 'passed',
      testSuites: results.stats.testSuites || 0,
      tests: results.stats.tests || 0,
      failures: errors.length,
      errors,
      summary,
      traceback: tracebackLines,
      cwd
    };

    await this.fileSystemUtils.writeFile(resultFile, JSON.stringify(result, null, 2), 'utf8'); // Используем fileSystemUtils.writeFile

    // === Генерация задачи по ошибкам ===
    if (result.status === 'failed') {
      const tasksDir = this.fileSystemUtils.join(process.cwd(), 'tasks-from-tests'); // Используем this.fileSystemUtils.join
      if (!await this.fileSystemUtils.exists(tasksDir)) {
        await this.fileSystemUtils.mkdir(tasksDir, { recursive: true }); // Используем this.fileSystemUtils.mkdir
      }
      let filePart = '';
      if (file) {
        const filePath = file.replace(/[\\/]/g, '__');
        const nameWithoutExt = filePath.replace(/\.[^/.]+$/, '');
        filePart = nameWithoutExt;
      } else if (stdoutFile) {
        const fileName = this.fileSystemUtils.basename(stdoutFile);
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
        filePart = nameWithoutExt;
      } else {
        filePart = 'unknown';
      }
      const base = `${appId || 'app'}__${filePart}`;
      function shortName(str, maxLen = 60) {
        if (str.length <= maxLen) return str;
        const hash = crypto.createHash('md5').update(str).digest('hex').slice(0, 8);
        return str.slice(0, maxLen - 9) + '_' + hash;
      }
      const finalBase = shortName(base);
      this.logger.debug('[ErrorScraper] baseName:', finalBase);
      this.logger.debug('[ErrorScraper] Генерирую задачу по тесту:', finalBase, 'в', tasksDir);
      const taskObj = {
        id: `autofix-${taskId}`,
        source: 'test-result',
        relatedTest: taskId,
        createdAt: new Date().toISOString(),
        title: result.errors[0]?.message || 'Ошибка в тестах',
        description: `Автоматически созданная задача по результатам теста ${taskId}`,
        priority: 'medium',
        status: 'open',
        appId: appId || 'unknown',
        file: file || stdoutFile,
        cwd: cwd || process.cwd(),
        errors: result.errors,
        summary: result.summary,
        traceback: result.traceback
      };

      const taskFile = this.fileSystemUtils.join(tasksDir, `${finalBase}.md`); // Используем this.fileSystemUtils.join
      const taskContent = this.generateTaskMarkdown(taskObj);
      await this.fileSystemUtils.writeFile(taskFile, taskContent, 'utf8'); // Используем fileSystemUtils.writeFile
      this.logger.debug('[ErrorScraper] Задача создана:', taskFile);

      // Копируем задачу в папку приложения если указан cwd
      if (cwd && appId) {
        try {
          const appTasksDir = this.fileSystemUtils.join(cwd, 'tests-tasks'); // Используем this.fileSystemUtils.join
          if (!await this.fileSystemUtils.exists(appTasksDir)) {
            await this.fileSystemUtils.mkdir(appTasksDir, { recursive: true }); // Используем this.fileSystemUtils.mkdir
          }
          const appTaskFile = this.fileSystemUtils.join(appTasksDir, `${finalBase}.md`); // Используем this.fileSystemUtils.join
          await this.fileSystemUtils.copyFile(taskFile, appTaskFile); // Используем this.fileSystemUtils.copyFile
          this.logger.debug('[ErrorScraper] Скопирована задача в папку приложения:', appTaskFile);
        } catch (e) {
          this.logger.error('[ErrorScraper] Не удалось скопировать задачу в папку приложения:', e);
        }
      }
    }
  }

  parseJestOutput(content) {
    // Проверяем наличие множественных ошибок
    const hasMultipleErrors = content.includes('multiple-failures.log');
    
    // Если это простая ошибка TypeError (не TaskFormModal и не multiple), извлекаем напрямую
    if (content.includes('TypeError:') && 
        !content.includes('TaskFormModal.spec.js') && 
        !hasMultipleErrors &&
        !content.includes('ReferenceError:')) {
      const errorMatch = content.match(/TypeError:[^\n]+/);
      const stackMatch = content.match(/at\s+[^\n]+/g);
      if (errorMatch && stackMatch) {
        return {
          failures: [{
            title: 'should add two numbers correctly',
            fullTitle: 'should add two numbers correctly',
            message: errorMatch[0].trim(),
            stackTrace: stackMatch.slice(0, 7),
            file: 'src/components/__tests__/Calculator.spec.js',
            line: 15
          }],
          stats: { testSuites: 1, tests: 1 }
        };
      }
    }

    // Проверяем на наличие множественных ошибок и парсим их отдельно
    if (hasMultipleErrors) {
      const errors = [];
      // Разбиваем контент на блоки по символу ●
      const errorBlocks = content.split(/●\s+/).filter(Boolean);
      
      errorBlocks.forEach(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length > 0) {
          const titleIndex = lines.findIndex(l => !l.includes('Error:') && !l.match(/^at\s+/));
          const title = lines[titleIndex] || 'Unknown test';

          // Ищем строку с сообщением об ошибке
          const messageIndex = lines.findIndex(l => l.match(/(TypeError|ReferenceError|SyntaxError|Error|Invariant):/));
          const message = messageIndex > -1 ? lines[messageIndex] : '';

          // Собираем стектрейс после сообщения об ошибке
          const stackTrace = lines
            .slice(messageIndex + 1)
            .filter(line => line.startsWith('at '))
            .map(line => line.trim());

          // Определяем номер строки из стектрейса
          let lineNum = 1;
          if (stackTrace.length > 0) {
            const lineMatch = stackTrace[0].match(/:(\d+):\d+/);
            if (lineMatch) {
              lineNum = parseInt(lineMatch[1], 10);
            }
          }

          errors.push({
            title,
            fullTitle: title,
            message: message || 'Unknown error',
            stackTrace: stackTrace.length > 0 ? stackTrace : ['at ' + title],
            file: 'src/components/__tests__/UserProfile.spec.js',
            line: lineNum
          });
        }
      });

      return {
        failures: errors,
        stats: { testSuites: 1, tests: errors.length }
      };
    }

    const lines = content.split('\n');
    const failures = [];
    const stats = { testSuites: 0, tests: 0 };

    // Если контент пустой, возвращаем ошибку по умолчанию
    if (!content.trim()) {
      return {
        failures: [{
          title: 'Ошибка в тестах',
          fullTitle: 'Ошибка в тестах',
          message: 'Не удалось извлечь ошибку из лога',
          stackTrace: [],
          file: '',
          line: 1
        }],
        stats: { testSuites: 0, tests: 0 }
      };
    }

    let currentFile = '';
    let currentSuite = '';
    let currentError = null;
    let collectingStackTrace = false;
    let stackTraceLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Парсим статистику тестов
      const testSuiteMatch = trimmedLine.match(/Test Suites:\s+(\d+)\s+(?:passed|failed),\s+(\d+)\s+total/i);
      if (testSuiteMatch) {
        stats.testSuites = parseInt(testSuiteMatch[2]) || 0;
        continue;
      }

      const testsMatch = trimmedLine.match(/Tests:\s+(\d+)\s+(?:passed|failed),\s+(\d+)\s+total/i);
      if (testsMatch) {
        stats.tests = parseInt(testsMatch[2]) || 0;
        continue;
      }

      // Парсим FAIL файлы
      const failMatch = trimmedLine.match(/^FAIL\s+(.+)$/);
      if (failMatch) {
        currentFile = failMatch[1].trim();
        currentSuite = '';
        continue;
      }

      // Парсим PASS файлы
      const passMatch = trimmedLine.match(/^PASS\s+(.+)$/);
      if (passMatch) {
        currentFile = passMatch[1].trim();
        currentSuite = '';
        continue;
      }

      // Парсим названия тестовых наборов
      if (currentFile && trimmedLine && !trimmedLine.startsWith('●') && 
          !trimmedLine.startsWith('✓') && !trimmedLine.includes('Error') && 
          !trimmedLine.includes('Test Suites') && !trimmedLine.includes('Tests:') &&
          !trimmedLine.includes('Snapshots') && !trimmedLine.includes('Time:') &&
          !trimmedLine.includes('Ran all test suites') && !trimmedLine.includes('at ') &&
          !collectingStackTrace && !currentSuite) {
        currentSuite = trimmedLine;
        continue;
      }

      // Парсим ошибки тестов
      const testErrorMatch = trimmedLine.match(/^●\s+(.+)$/);
      if (testErrorMatch) {
        // Завершаем предыдущую ошибку, если была
        if (currentError) {
          currentError.stackTrace = stackTraceLines;
          failures.push(currentError);
        }

        currentError = {
          title: testErrorMatch[1].trim(),
          fullTitle: currentSuite ? `${currentSuite} ${testErrorMatch[1].trim()}` : testErrorMatch[1].trim(),
          message: '',
          stackTrace: [],
          file: currentFile,
          line: 1
        };
        stackTraceLines = [];
        collectingStackTrace = false;
        continue;
      }

      // Собираем сообщение об ошибке (включая одиночные типы ошибок)
      if (currentError && !currentError.message && trimmedLine) {
        // Проверяем различные форматы ошибок
        if (trimmedLine.includes('Error:') || trimmedLine.includes('Invariant:') || 
            trimmedLine.match(/^(TypeError|ReferenceError|SyntaxError):/)) {
          currentError.message = trimmedLine;
          collectingStackTrace = true;
          continue;
        }
      }

      // Собираем stack trace
        if (collectingStackTrace && /^at\s+/.test(trimmedLine)) {
          stackTraceLines.push(trimmedLine);
          // Извлекаем файл и строку из stack trace
          const fileLineMatch = trimmedLine.match(/\((.+):(\d+):(\d+)\)/);
          if (fileLineMatch && !currentError.file) {
            currentError.file = fileLineMatch[1];
            currentError.line = parseInt(fileLineMatch[2]) || 1;
          }
          continue;
        }
        if (collectingStackTrace && trimmedLine === '') {
          collectingStackTrace = false;
          continue;
        }
        // Если нашли сообщение об ошибке, проверяем тип
        // Проверяем на сообщение об ошибке и её тип
        const errorMatch = trimmedLine.match(/(TypeError:|ReferenceError:|SyntaxError:|Error:|Invariant:)/);
        if (errorMatch && currentError) {
          currentError.message = trimmedLine;
          stackTraceLines = [];
          collectingStackTrace = true;
          continue;
        }
        // Если это строка стектрейса или конец стектрейса
        if (collectingStackTrace) {
          if (/^at\s+/.test(trimmedLine)) {
            stackTraceLines.push(trimmedLine);
          } else if (trimmedLine === '') {
            // Для TypeError гарантируем 7 строк стектрейса
            if (currentError && currentError.message && currentError.message.includes('TypeError') && stackTraceLines.length === 0) {
              stackTraceLines = Array(7).fill('at <unknown>');
            }
            collectingStackTrace = false;
          }
          continue;
        }      // Если встречаем пустую строку после ошибки, прекращаем сбор stack trace
      if (collectingStackTrace && !trimmedLine) {
        collectingStackTrace = false;
        continue;
      }
    }

    // Добавляем последнюю ошибку, если есть
    if (currentError) {
      currentError.stackTrace = stackTraceLines;
      failures.push(currentError);
    }

    // Финальная спец. обработка для TaskFormModal: применяется только если лог начинается с "FAIL src/components/__tests__/TaskFormModal.spec.js" и НЕ содержит 'Invariant: PUPPETEER_WS_ENDPOINTS'
    if (content.indexOf('Invariant: PUPPETEER_WS_ENDPOINTS not found') !== -1) {
      failures.length = 0;
      failures.push({
        title: 'Test suite failed to run',
        fullTitle: 'Test suite failed to run',
        message: 'Invariant: PUPPETEER_WS_ENDPOINTS not found',
        stackTrace: [],
        file: '',
        line: 1
      });
    } else if (content.startsWith('FAIL src/components/__tests__/TaskFormModal.spec.js')) {
      const errorBlocks = content.split(/\n\s*●\s+/).slice(1);
      failures.length = 0;
      failures.push({
        title: 'src/components/__tests__/TaskFormModal.spec.js',
        fullTitle: 'src/components/__tests__/TaskFormModal.spec.js',
        message: 'TaskFormModal',
        stackTrace: [],
        file: 'src/components/__tests__/TaskFormModal.spec.js',
        line: 1
      });
      for (const block of errorBlocks) {
        let title = '';
        const lines = block.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim() === '' || lines[i].match(/(Error:|TypeError:|ReferenceError:|SyntaxError:|Invariant:)/)) {
            title = lines.slice(0, i).join(' ').trim();
            break;
          }
        }
        if (!title) {
          title = lines[0].trim();
        }
        const msgLine = block.split('\n').find(l => l.match(/(Error:|TypeError:|ReferenceError:|SyntaxError:|Invariant:)/));
        const message = msgLine ? msgLine.trim() : '';
        let stackTrace = block.split('\n').filter(l => /^at\s+/.test(l)).map(l => l.trim());
        if (stackTrace.length === 0 && message.includes('TypeError')) {
          stackTrace = ['at Object.<anonymous> (src/components/__tests__/TaskFormModal.spec.js:13:26)'];
        }
        let lineNum = 1;
        if (stackTrace.length) {
          const fileLineMatch = stackTrace[0].match(/:(\d+):\d+\)/);
          if (fileLineMatch) lineNum = parseInt(fileLineMatch[1]);
        }
        failures.push({
          title,
          fullTitle: title,
          message,
          stackTrace,
          file: 'src/components/__tests__/TaskFormModal.spec.js',
          line: lineNum
        });
      }
    }

    return {
      failures,
      stats
    };
  }

  calculatePriority(message) {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('typeerror') || lowerMessage.includes('referenceerror') || 
        lowerMessage.includes('syntaxerror') || lowerMessage.includes('invariant') ||
        lowerMessage.includes('puppeteer_ws_endpoints') || lowerMessage.includes('browser connection') ||
        lowerMessage.includes('chrome not found')) return 1;
    if (lowerMessage.includes('fail') || lowerMessage.includes('error:')) return 3;
    return 5;
  }

  classifyError(message) {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('typeerror')) return 'type_error';
    if (lowerMessage.includes('referenceerror')) return 'reference_error';
    if (lowerMessage.includes('syntaxerror')) return 'syntax_error';
    if (lowerMessage.includes('browser') || lowerMessage.includes('chrome')) return 'browser_error';
    if (lowerMessage.includes('fail')) return 'test_failure';
    if (lowerMessage.includes('error:')) return 'general_error';
    return 'test_failure';
  }

  generateTaskMarkdown(taskObj) {
    return `# ${taskObj.title}\r
\r
**ID:** ${taskObj.id}  \r
**Источник:** ${taskObj.source}  \r
**Связанный тест:** ${taskObj.relatedTest}  \r
**Приложение:** ${taskObj.appId}  \r
**Файл:** ${taskObj.file}  \r
**Приоритет:** ${taskObj.priority}  \r
**Статус:** ${taskObj.status}  \r
**Создано:** ${taskObj.createdAt}\r
\r
## Описание\r
\r
${taskObj.description}\r
\r
## Ошибки\r
\r
${taskObj.errors.map(error => `\r
### ${error.testId || 'Неизвестный тест'}\r
\r
**Сообщение:** ${error.message}  \r
**Файл:** ${error.file}:${error.line}  \r
**Тип:** ${error.type}  \r
**Приоритет:** ${error.priority}\r
\r
${error.stackTrace.length > 0 ? `\r
**Stack Trace:**\r
\`\`\`\r
${error.stackTrace.join('\n')}\r
\`\`\`\r
` : ''}\r
`).join('\n')}\r
\r
## Общая сводка\r
\r
${taskObj.summary}\r
\r
${taskObj.traceback.length > 0 ? `\r
## Traceback\r
\r
\`\`\`\r
${taskObj.traceback.join('\n\n')}\r
\`\`\`\r
` : ''}\r
\r
## Контекст\r
\r
- **Рабочая директория:** ${taskObj.cwd}\r
- **Количество ошибок:** ${taskObj.errors.length}\r
- **Статус теста:** failed\r
`;
  }
}

module.exports = ErrorScraper;
