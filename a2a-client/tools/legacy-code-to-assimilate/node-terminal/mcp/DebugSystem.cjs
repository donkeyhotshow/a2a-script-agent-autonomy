/**
 * @fileoverview Основная реализация системы отладки для MCP Terminal.
 * Функциональность, связанная с DebugSystem, находится здесь, а не в libs/core/debug-system.
 * @author MCP Terminal Team
 * @version 1.0.0
 */

// Настройка module-alias для корректной работы с путями
// ВАЖНО: Должно быть ДО всех импортов @libs/*
try {
  require('../setup-module-alias.cjs');
  // Принудительно перерегистрируем алиас на случай, если он был переопределён
  const moduleAlias = require('module-alias');
  const path = require('path');
  const libsDir = process.env.MCP_LIBS_ROOT || path.resolve(__dirname, '../packages/libs');
  moduleAlias.addAlias('@libs', libsDir);
} catch (setupError) {
  // Если setup-module-alias не найден, это не критично - продолжим без него
  if (process.stderr && typeof process.stderr.write === 'function') {
    process.stderr.write(`[MCP-SERVER-WARN] setup-module-alias.cjs not found: ${setupError.message}\n`);
  }
}

const {errorUtils} = require('@libs/error-management/error-handler/error-utils.cjs');
const fileUtilsFactory = require('@libs/system/file-operations/index.cjs');
const {default: PathUtils} = require('@libs/system/path-utils/index.js');
const defaultPathUtils = new PathUtils();
const fileSystemUtils = fileUtilsFactory(console, defaultPathUtils);
const {consoleUtils} = require('@libs/logging-monitoring/logging/console-utils.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {getCurrentDir} = require('@libs/app-framework/system-utils/workdir-utils/index.cjs');
const {persistHistoryRecord} = require('@libs/system/history/index.cjs');

// Константы для системы дебага

const DEBUG_CATEGORIES = {
    COMMAND_EXECUTION: 'command_execution',
    COMMAND_CONVERSION: 'command_conversion',
    SECURITY_BLOCK: 'security_block',
    SECURITY_SELFTEST: 'security_selftest',
    FILE_OPERATION: 'file_operation',
    NETWORK_ERROR: 'network_error',
    PERMISSION_ERROR: 'permission_error',
    TIMEOUT_ERROR: 'timeout_error',
    SPAWN_ERROR: 'spawn_error',
    VALIDATION_ERROR: 'validation_error',
    SYSTEM_ERROR: 'system_error',
    TEST_FAILURE: 'test_failure',
    DAEMON_ERROR: 'daemon_error',
    HISTORY_ERROR: 'history_error',
    USER_FEEDBACK: 'user_feedback',
    FILE_SYSTEM_ERROR: 'file_system_error',
    DOCUMENT_GENERATION: 'document_generation'
};


const ERROR_SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};


class DebugSystem {
    constructor() {
        this.workDir = fileSystemUtils.join(process.cwd(), 'work');
        this.debugDir = fileSystemUtils.join(this.workDir, 'debug');
        this.templatesDir = fileSystemUtils.join(this.workDir, 'templates');
        this.ensureDirectories();
    }

    ensureDirectories() {
        try {
            fs.mkdirSync(this.workDir, {recursive: true});
            fs.mkdirSync(this.debugDir, {recursive: true});
            fs.mkdirSync(this.templatesDir, {recursive: true});
        } catch (error) {
            // Игнорируем ошибки создания директорий
        }
    }

    // Генерация MD5-хеша для уникальной идентификации проблемы
    generateProblemId(data) {
        // const content = JSON.stringify({
        //   timestamp: new Date().toISOString(),
        //   category: data.category,
        //   error: data.error,
        //   command: data.command,
        //   context: data.context
        // });
        // return crypto.createHash('md5').update(content).digest('hex');
        return 'disabled';
    }

    // Получение шаблона для категории проблемы
    getTemplate(category) {
        const templatePath = fileSystemUtils.join(this.templatesDir, `${category}.md`);

        if (fs.existsSync(templatePath)) {
            return fs.readFileSync(templatePath, 'utf8');
        }

        // Возвращаем базовый шаблон если специфичный не найден
        return this.getBaseTemplate();
    }

    // Базовый шаблон для всех проблем
    getBaseTemplate() {
        return `# Проблема: {{title}}

## Основная информация
- **ID проблемы**: {{problemId}}
- **Категория**: {{category}}
- **Серьезность**: {{severity}}
- **Время возникновения**: {{timestamp}}
- **Сессия**: {{sessionId}}

## Описание проблемы
{{description}}

## Контекст выполнения
- **Команда**: \`{{command}}\`
- **Рабочая директория**: \`{{cwd}}\`
- **Платформа**: {{platform}}
- **Код возврата**: {{returnCode}}

## Детали ошибки
\`\`\`
{{errorDetails}}
\`\`\`

## Вывод команды
### STDOUT
\`\`\`
{{stdout}}
\`\`\`

### STDERR
\`\`\`
{{stderr}}
\`\`\`

## Анализ и рекомендации
{{analysis}}

## История связанных проблем
{{relatedProblems}}

## Статус решения
- [ ] Проблема решена
- [ ] Требует дополнительного анализа
- [ ] Передано в разработку

## Комментарии
{{comments}}

---
*Сгенерировано автоматически системой дебага MCP Terminal*
`;
    }

    // Создание специфичных шаблонов
    createSpecificTemplates() {
        const templates = {
            [DEBUG_CATEGORIES.COMMAND_EXECUTION]: `# Ошибка выполнения команды: {{title}}

## Основная информация
- **ID проблемы**: {{problemId}}
- **Категория**: Выполнение команды
- **Серьезность**: {{severity}}
- **Время возникновения**: {{timestamp}}

## Команда
\`\`\`bash
{{command}}
\`\`\`

## Ошибка выполнения
\`\`\`
{{errorDetails}}
\`\`\`

## Контекст
- **Рабочая директория**: \`{{cwd}}\`
- **Платформа**: {{platform}}
- **Код возврата**: {{returnCode}}
- **Длительность**: {{duration}}

## Вывод
### STDOUT
\`\`\`
{{stdout}}
\`\`\`

### STDERR
\`\`\`
{{stderr}}
\`\`\`

## Анализ
{{analysis}}

## Рекомендации
{{recommendations}}

---
*Сгенерировано автоматически системой дебага MCP Terminal*
`,

            [DEBUG_CATEGORIES.SECURITY_BLOCK]: `# Блокировка безопасности: {{title}}

## Основная информация
- **ID проблемы**: {{problemId}}
- **Категория**: Блокировка безопасности
- **Серьезность**: {{severity}}
- **Время возникновения**: {{timestamp}}

## Заблокированная команда
\`\`\`bash
{{command}}
\`\`\`

## Причина блокировки
{{reason}}

## Анализ безопасности
{{securityAnalysis}}

## Рекомендуемые альтернативы
{{suggestions}}

## Контекст
- **Рабочая директория**: \`{{cwd}}\`
- **Платформа**: {{platform}}
- **Политика безопасности**: {{securityPolicy}}

---
*Сгенерировано автоматически системой дебага MCP Terminal*
`,

            [DEBUG_CATEGORIES.TEST_FAILURE]: `# Ошибка тестирования: {{title}}

## Основная информация
- **ID проблемы**: {{problemId}}
- **Категория**: Ошибка тестирования
- **Серьезность**: {{severity}}
- **Время возникновения**: {{timestamp}}

## Тест
- **Плагин**: {{pluginName}}
- **Тест**: {{testName}}
- **Команда**: \`{{command}}\`

## Ошибка
\`\`\`
{{errorDetails}}
\`\`\`

## Ожидаемый результат
{{expectedResult}}

## Фактический результат
{{actualResult}}

## Анализ
{{analysis}}

## Рекомендации по исправлению
{{recommendations}}

---
*Сгенерировано автоматически системой дебага MCP Terminal*
`,

            [DEBUG_CATEGORIES.USER_FEEDBACK]: `# Обратная связь пользователя: {{title}}

## Основная информация
- **ID проблемы**: {{problemId}}
- **Категория**: Обратная связь пользователя
- **Серьезность**: {{severity}}
- **Время возникновения**: {{timestamp}}
- **Сессия**: {{sessionId}}

## Описание
{{description}}

## Контекст
- **Пользователь**: {{context.user}}
- **Категория предложения**: {{context.category}}
- **ID предложения**: {{context.suggestionId}}

## Детали
\`\`\`
{{errorDetails}}
\`\`\`

## Анализ
{{analysis}}

## Рекомендации
{{recommendations}}

## Статус решения
- [ ] Обработано
- [ ] Требует внимания
- [ ] Передано в разработку

---
*Сгенерировано автоматически системой дебага MCP Terminal*
`
        };

        // Сохраняем шаблоны
        for (const [category, template] of Object.entries(templates)) {
            const templatePath = fileSystemUtils.join(this.templatesDir, `${category}.md`);
            fs.writeFileSync(templatePath, template, 'utf8');
        }
    }

    // Заполнение шаблона данными
    fillTemplate(template, data) {
        let filled = template;

        // Заменяем все плейсхолдеры
        const replacements = {
            '{{problemId}}': data.problemId,
            '{{title}}': data.title || 'Неизвестная проблема',
            '{{category}}': data.category || 'Неизвестная категория',
            '{{severity}}': data.severity || 'medium',
            '{{timestamp}}': data.timestamp,
            '{{sessionId}}': data.sessionId || 'Неизвестно',
            '{{description}}': data.description || 'Описание отсутствует',
            '{{command}}': data.command || 'Команда не указана',
            '{{cwd}}': data.cwd || 'Неизвестно',
            '{{platform}}': data.platform || process.platform,
            '{{returnCode}}': data.returnCode || 'Неизвестно',
            '{{duration}}': data.duration || 'Неизвестно',
            '{{errorDetails}}': data.errorDetails || 'Детали ошибки отсутствуют',
            '{{stdout}}': data.stdout || 'Вывод отсутствует',
            '{{stderr}}': data.stderr || 'Ошибки отсутствуют',
            '{{analysis}}': data.analysis || 'Анализ не проведен',
            '{{recommendations}}': data.recommendations || 'Рекомендации отсутствуют',
            '{{relatedProblems}}': data.relatedProblems || 'Связанные проблемы не найдены',
            '{{comments}}': data.comments || '',
            '{{reason}}': data.reason || 'Причина не указана',
            '{{securityAnalysis}}': data.securityAnalysis || 'Анализ безопасности не проведен',
            '{{suggestions}}': data.suggestions || 'Альтернативы не предложены',
            '{{securityPolicy}}': data.securityPolicy || 'Политика не определена',
            '{{pluginName}}': data.pluginName || 'Неизвестно',
            '{{testName}}': data.testName || 'Неизвестно',
            '{{expectedResult}}': data.expectedResult || 'Не указано',
            '{{actualResult}}': data.actualResult || 'Не указано'
        };

        for (const [placeholder, value] of Object.entries(replacements)) {
            filled = filled.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
        }

        return filled;
    }

    // Сохранение проблемы в файл
    saveProblem(problemData) {
        try {
            const problemId = this.generateProblemId(problemData);

            // Обработка undefined или отсутствующей категории
            let category = problemData.category;
            if (category === undefined) {
                category = 'undefined';
            }
            if (!category || category === 'undefined' || category === 'null') {
                category = String(category ?? 'undefined');
            }

            const template = this.getTemplate(category);

            const data = {
                problemId,
                timestamp: new Date().toISOString(),
                sessionId: this.getCurrentSessionId(),
                category, // Используем обработанную категорию
                ...problemData
            };

            const filledTemplate = this.fillTemplate(template, data);
            const fileName = `${problemId}_${category}.md`;
            const filePath = fileSystemUtils.join(this.debugDir, fileName);

            fs.writeFileSync(filePath, filledTemplate, 'utf8');

            // Логируем в историю
            this.logToHistory(data);

            return {
                success: true,
                problemId,
                filePath,
                message: `Проблема сохранена: ${fileName}`,
                category: category
            };
        } catch (error) {
            // Игнорируем ошибки
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Получение текущего ID сессии
    getCurrentSessionId() {
        try {
            const currentFile = fileSystemUtils.join(process.cwd(), 'history', 'CURRENT');
            if (fs.existsSync(currentFile)) {
                return fs.readFileSync(currentFile, 'utf8').trim();
            }
        } catch (error) {
            // Игнорируем ошибки чтения файла
        }
        return 'unknown';
    }

    // Логирование в историю
    logToHistory(problemData) {
        try {
            persistHistoryRecord({
                timestamp: new Date().toISOString(),
                operation: 'debug_problem',
                command: problemData.command || 'debug_system',
                success: false,
                stdout: `Проблема зарегистрирована: ${problemData.problemId}`,
                stderr: problemData.errorDetails || problemData.description || 'Проблема без деталей',
                return_code: -1,
                duration: '0',
                cwd: getCurrentDir(),
                platform: process.platform,
                reason: `debug_${problemData.category}`,
                consumer_id: 'debug_system'
            });
        } catch (error) {
            // Игнорируем ошибки логирования
        }
    }

    // Анализ проблемы и генерация рекомендаций
    analyzeProblem(problemData) {
        const analysis = {
            severity: this.determineSeverity(problemData),
            recommendations: this.generateRecommendations(problemData),
            relatedProblems: this.findRelatedProblems(problemData)
        };

        return analysis;
    }

    // Определение серьезности проблемы
    determineSeverity(problemData) {
        const {category, returnCode, errorDetails} = problemData;

        // Критические проблемы
        if (category === DEBUG_CATEGORIES.SECURITY_BLOCK &&
            errorDetails && errorDetails.includes('rm -rf')) {
            return ERROR_SEVERITY.CRITICAL;
        }

        if (returnCode === 126 || returnCode === 127) {
            return ERROR_SEVERITY.HIGH;
        }

        if (category === DEBUG_CATEGORIES.TIMEOUT_ERROR) {
            return ERROR_SEVERITY.MEDIUM;
        }

        if (category === DEBUG_CATEGORIES.COMMAND_EXECUTION && returnCode === 0) {
            return ERROR_SEVERITY.LOW;
        }

        return ERROR_SEVERITY.MEDIUM;
    }

    // Генерация рекомендаций
    generateRecommendations(problemData) {
        const {category, returnCode, command, errorDetails} = problemData;
        const recommendations = [];

        switch (category) {
            case DEBUG_CATEGORIES.COMMAND_EXECUTION:
                if (returnCode === 127) {
                    recommendations.push('- Проверьте, установлена ли команда в системе');
                    recommendations.push('- Убедитесь, что команда доступна в PATH');
                    recommendations.push('- Попробуйте использовать полный путь к исполняемому файлу');
                } else if (returnCode === 126) {
                    recommendations.push('- Проверьте права доступа к файлу');
                    recommendations.push('- Убедитесь, что файл является исполняемым');
                    recommendations.push('- Попробуйте запустить с повышенными привилегиями');
                } else if (returnCode !== 0) {
                    recommendations.push('- Проверьте синтаксис команды');
                    recommendations.push('- Убедитесь в корректности параметров');
                    recommendations.push('- Проверьте наличие необходимых файлов/директорий');
                }
                break;

            case DEBUG_CATEGORIES.SECURITY_BLOCK:
                recommendations.push('- Используйте безопасные альтернативы');
                recommendations.push('- Проверьте политики безопасности');
                recommendations.push('- Обратитесь к администратору при необходимости');
                break;

            case DEBUG_CATEGORIES.TIMEOUT_ERROR:
                recommendations.push('- Увеличьте таймаут выполнения');
                recommendations.push('- Оптимизируйте команду для ускорения выполнения');
                recommendations.push('- Проверьте нагрузку на систему');
                break;

            case DEBUG_CATEGORIES.TEST_FAILURE:
                recommendations.push('- Проверьте окружение выполнения тестов');
                recommendations.push('- Убедитесь в корректности тестовых данных');
                recommendations.push('- Проверьте зависимости тестов');
                break;
        }

        return recommendations.join('\n');
    }

    // Поиск связанных проблем
    findRelatedProblems(problemData) {
        errorUtils.safeExecute(async () => {

            const files = fs.readdirSync(this.debugDir);
            const related = [];

            for (const file of files) {
                if (file.endsWith('.md') && file.includes(problemData.category)) {
                    const filePath = fileSystemUtils.join(this.debugDir, file);
                    const content = fs.readFileSync(filePath, 'utf8');

                    // Простая проверка на схожесть по команде или ошибке
                    if (problemData.command && content.includes(problemData.command)) {
                        const problemId = file.split('_')[0];
                        related.push(`- ${problemId}: Схожая команда`);
                    }
                }
            }

            return related.length > 0 ? related.join('\n') : 'Связанные проблемы не найдены';

        }, 'error')
    }

    // Регистрация проблемы с автоматическим анализом
    registerProblem(problemData) {
        const analysis = this.analyzeProblem(problemData);
        const enrichedData = {
            ...problemData,
            severity: analysis.severity,
            recommendations: analysis.recommendations,
            relatedProblems: analysis.relatedProblems
        };

        return this.saveProblem(enrichedData);
    }

    // Получение списка всех проблем
    getAllProblems() {
        try {
            const files = fs.readdirSync(this.debugDir);
            const problems = [];

            for (const file of files) {
                if (file.endsWith('.md')) {
                    const filePath = fileSystemUtils.join(this.debugDir, file);
                    const content = fs.readFileSync(filePath, 'utf8');

                    // Извлекаем основную информацию из файла
                    const problemId = file.split('_')[0];
                    const category = file.split('_')[1]?.replace('.md', '');

                    const severityMatch = content.match(/Серьезность[:\s]+(\w+)/);
                    const timestampMatch = content.match(/Время возникновения[:\s]+(.+)/);
                    const titleMatch = content.match(/# (.+)/);

                    problems.push({
                        problemId,
                        category,
                        severity: severityMatch ? severityMatch[1] : 'unknown',
                        timestamp: timestampMatch ? timestampMatch[1] : 'unknown',
                        title: titleMatch ? titleMatch[1] : 'Без названия',
                        filePath
                    });
                }
            }

            return problems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            // Игнорируем ошибки
            return [];
        }
    }

    // Получение детальной информации о проблеме
    getProblemDetails(problemId) {
        try {
            const files = fs.readdirSync(this.debugDir);
            const targetFile = files.find(file => file.startsWith(problemId));

            if (targetFile) {
                const filePath = fileSystemUtils.join(this.debugDir, targetFile);
                return fs.readFileSync(filePath, 'utf8');
            }

            return null;
        } catch (error) {
            // Игнорируем ошибки
            return null;
        }
    }

    // Метод для логирования проблем
    log(category, data) {
        try {
            const problemData = {
                category,
                title: data.title || `Проблема категории ${category}`,
                description: data.description || `Проблема в категории ${category}`,
                command: data.command || 'Неизвестная команда',
                returnCode: data.returnCode || -1,
                errorDetails: data.errorDetails || /* JSON.stringify(data) */ 'data disabled',
                stdout: data.stdout || '',
                stderr: data.stderr || '',
                duration: data.duration || '0',
                cwd: data.cwd || getCurrentDir(),
                platform: data.platform || process.platform,
                context: data.context || {}
            };

            return this.registerProblem(problemData);
        } catch (error) {
            // Игнорируем ошибки
            return null;
        }
    }

    // Метод для простого логирования
    simpleLog(category, message, data = {}) {
        try {
            // console.log removed
            return true;
        } catch (error) {
            // Игнорируем ошибки
            return false;
        }
    }
}

// Создаем экземпляр системы дебага
const debugSystem = new DebugSystem();

// Создаем шаблоны при инициализации
debugSystem.createSpecificTemplates();

module.exports = {
    DebugSystem,
    debugSystem,
    DEBUG_CATEGORIES,
    ERROR_SEVERITY
};
