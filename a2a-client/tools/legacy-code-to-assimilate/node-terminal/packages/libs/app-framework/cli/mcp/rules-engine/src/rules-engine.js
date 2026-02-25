const fs = require('fs-extra');
const path = require('path');


// Используем относительные пути к библиотекам
const { formatWithFrontMatter, parseWithFrontMatter } = require('../../../core/markdown-utils/src/front-matter-parser.js');
const { detectLanguage, hasTests, hasDocumentation, assessComplexity } = require('../../../core/code-analyzer/src/code-analyzer.js');
const { getProjectInfo, getProjectSystemData, validateProject } = require('../../../core/project-utils/src/project-utils.js');
const { extractForbiddenPatterns, checkRuleViolation, validateCodeAgainstRules, generateRecommendations } = require('../../../core/validation-engine/src/validation-engine.js');

class RulesEngine {
    constructor(logger) {
        this.rulesCache = new Map();
        this.versionHistory = new Map();
        this.logger = logger; // Сохраняем экземпляр логгера
    }

    /**
     * Валидация входных данных для создания/обновления правил
     */
    _validateRuleInput(title, content, category, metadata) {
        if (!title || typeof title !== 'string' || title.trim() === '') {
            throw new Error('Название правила обязательно и должно быть непустой строкой.');
        }
        if (!content || typeof content !== 'string' || content.trim() === '') {
            throw new Error('Содержимое правила обязательно и должно быть непустой строкой.');
        }
        const validCategories = ['programming', 'processes', 'workflows', 'standards', 'templates'];
        if (!category || !validCategories.includes(category)) {
            throw new Error(`Недопустимая категория: ${category}. Допустимые категории: ${validCategories.join(', ')}.`);
        }
        if (metadata && typeof metadata !== 'object') {
            throw new Error('Метаданные должны быть объектом.');
        }
    }



    /**
     * Получение пути к файлу правила/стандарта
     */
    _getRuleFilePath(title, category) {
        const baseDir = path.join(process.cwd(), 'data', 'rules-with-standards');
        let targetDir;
        let fileName = title; // Используем оригинальное название

        if (category === 'standards') {
            targetDir = path.join(baseDir, 'standards');
            fileName = `${title}.standard.md`;
        } else {
            targetDir = path.join(baseDir, 'rules');
            fileName = `${title}.rule.md`;
        }
        return path.join(targetDir, fileName);
    }

    /**
     * Создание нового правила
     */
    async createRule({ title, content, category, metadata = {} }) {
        this._validateRuleInput(title, content, category, metadata);

        const filePath = this._getRuleFilePath(title, category);

        if (await fs.pathExists(filePath)) {
            throw new Error(`Правило с названием "${title}" уже существует.`);
        }

        const formattedContent = formatWithFrontMatter(content, metadata);

        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, formattedContent, 'utf8');

        return { success: true, message: `Правило "${title}" успешно создано.` };
    }

    /**
     * Обновление существующего правила
     */
    async updateRule({ title, content, category, metadata = {} }) {
        this._validateRuleInput(title, content, category, metadata);

        const filePath = this._getRuleFilePath(title, category);

        if (!await fs.pathExists(filePath)) {
            throw new Error(`Правило с названием "${title}" не найдено.`);
        }

        const formattedContent = formatWithFrontMatter(content, metadata);

        await fs.writeFile(filePath, formattedContent, 'utf8');

        return { success: true, message: `Правило "${title}" успешно обновлено.` };
    }

    /**
     * Валидация кода на соответствие правилам
     */
    async validateCodeAgainstRules({ filePath, ruleNames, category }) {
        // 1. Определить правила для применения
        let rulesToApply = [];
        if (ruleNames && ruleNames.length > 0) {
            for (const name of ruleNames) {
                try {
                    const ruleContent = await this.getRuleOrStandard({ name, type: 'rule' });
                    rulesToApply.push({ name, content: ruleContent });
                } catch (error) {
                    this.logger.warn(`Правило не найдено: ${name}`);
                }
            }
        } else if (category) {
            // Получаем правила по категории
            const baseDir = path.join(process.cwd(), 'data', 'rules-with-standards');
            const rulesDir = path.join(baseDir, 'rules');
            const standardsDir = path.join(baseDir, 'standards');

            const readDirRules = async (dir, type) => {
                const files = await fs.readdir(dir);
                const rules = [];
                for (const file of files) {
                    if (file.endsWith('.md')) {
                        const rulePath = path.join(dir, file);
                        const fileContent = await fs.readFile(rulePath, 'utf8');
                        const parsedContent = parseWithFrontMatter(fileContent);
                        if (parsedContent.metadata.category === category) {
                            rules.push({ name: file.replace(/\.(rule|standard)\.md$/, '').replace(/\.md$/, ''), content: parsedContent.content, metadata: parsedContent.metadata });
                        }
                    }
                }
                return rules;
            };

            if (category === 'standards') {
                rulesToApply = await readDirRules(standardsDir, 'standard');
            } else {
                rulesToApply = await readDirRules(rulesDir, 'rule');
            }
        } else {
            throw new Error('Необходимо указать имена правил (ruleNames) или категорию (category) для валидации.');
        }

        // 2. Используем validation-engine для валидации
        const results = await validateCodeAgainstRules({ filePath, rules: rulesToApply });
        return { success: true, results: results };
    }

    /**
     * Получение обязательных правил для создания функций (из rules-engine/src/mcp-server.js)
     */
    async getFunctionRules(args) {
        try {
            const configFile = path.join(process.cwd(), 'config', 'function-rules.json');

            if (!await fs.pathExists(configFile)) {
                throw new Error(`Файл правил не найден: ${configFile}`);
            }

            const rules = await fs.readJson(configFile);

            return rules;
        } catch (error) {
            throw new Error(`Ошибка получения обязательных правил: ${error.message}`);
        }
    }

    /**
     * Получить документ правила/стандарта по имени с нормализацией (из rules-engine/src/mcp-server.js)
     */
    async getRuleOrStandard(args) {
        try {
            const { name, type } = args;
            if (!name) throw new Error('Не указано имя документа');

            const baseDir = path.join(process.cwd(), 'data', 'rules-with-standards');
            const standardsDir = path.join(baseDir, 'standards');
            const rulesDir = path.join(baseDir, 'rules');

            const normalizedName = String(name)
                .replace(/^@+/, '')
                .replace(/\.md$/i, '')
                .replace(/\.(standard|rule)$/i, '')
                .trim();

            const candidates = [];

            const pushStandard = () => {
                candidates.push(path.join(standardsDir, `${normalizedName}.standard.md`));
                candidates.push(path.join(standardsDir, `${normalizedName}.md`));
            };
            const pushRule = () => {
                candidates.push(path.join(rulesDir, `${normalizedName}.rule.md`));
                candidates.push(path.join(rulesDir, `${normalizedName}.md`));
            };

            if (type === 'standard') {
                pushStandard();
            } else if (type === 'rule') {
                pushRule();
            } else {
                if (/\.standard$/i.test(name)) {
                    pushStandard();
                } else if (/\.rule$/i.test(name)) {
                    pushRule();
                } else {
                    pushStandard();
                    pushRule();
                }
            }

            let foundPath = null;
            for (const candidate of candidates) {
                if (await fs.pathExists(candidate)) {
                    foundPath = candidate;
                    break;
                }
            }

            if (!foundPath) {
                throw new Error(`Документ не найден: ${name}`);
            }

            const content = await fs.readFile(foundPath, 'utf8');
            return content;
        } catch (error) {
            throw new Error(`Ошибка получения документа: ${error.message}`);
        }
    }

    /**
     * Алиас для совместимости: get_standard -> getRuleOrStandard
     */
    async getStandard(args) {
        return this.getRuleOrStandard(args);
    }

    /**
     * Получение информации о проекте
     */
    async getProjectInfo(projectPath) {
        return await getProjectInfo(projectPath);
    }

    /**
     * Получение системных данных проекта
     */
    async getProjectSystemData(projectPath) {
        return await getProjectSystemData(projectPath);
    }

    /**
     * Валидация проекта
     */
    async validateProject(projectPath, options = {}) {
        return await validateProject(projectPath, options);
    }

    /**
     * Анализ контекста файла для определения применимости правил
     */
    async analyzeFileContext(filePath) {
        try {
            const context = {
                filePath,
                fileName: path.basename(filePath),
                extension: path.extname(filePath),
                language: detectLanguage(filePath),
                size: 0, // Инициализация
                hasTests: false, // Инициализация
                hasDocumentation: false, // Инициализация
                complexity: 'low' // Инициализация
            };

            if (await fs.pathExists(filePath)) {
                const stats = await fs.stat(filePath);
                context.size = stats.size;
                
                const content = await fs.readFile(filePath, 'utf8');
                context.hasTests = hasTests(content, filePath);
                context.hasDocumentation = hasDocumentation(content);
                context.complexity = assessComplexity(content);
            }

            return context;
        } catch (error) {
            this.logger.error('Ошибка при анализе контекста файла:', error.message);
            return { filePath, error: error.message };
        }
    }

    /**
     * Проверка применимости правила к контексту
     */
    async checkRuleApplicability(ruleName, context) {
        try {
            const rule = await this.getRuleOrStandard({ name: ruleName });
            if (!rule) {
                return { applicable: false, reason: 'Правило не найдено' };
            }

            const { metadata } = parseWithFrontMatter(rule);
            const applicability = metadata.applicability || {};

            // Проверка языка программирования
            if (applicability.languages && !applicability.languages.includes(context.language)) {
                return { 
                    applicable: false, 
                    reason: `Правило не применимо к языку ${context.language}`,
                    requiredLanguages: applicability.languages
                };
            }

            // Проверка размера файла
            if (applicability.maxFileSize && context.size > applicability.maxFileSize) {
                return { 
                    applicable: false, 
                    reason: `Файл слишком большой (${context.size} байт)`,
                    maxSize: applicability.maxFileSize
                };
            }

            // Проверка сложности
            if (applicability.complexity && !applicability.complexity.includes(context.complexity)) {
                return { 
                    applicable: false, 
                    reason: `Правило не подходит для файлов со сложностью ${context.complexity}`,
                    allowedComplexity: applicability.complexity
                };
            }

            // Проверка наличия тестов
            if (applicability.requiresTests && !context.hasTests) {
                return { 
                    applicable: false, 
                    reason: 'Правило требует наличия тестов',
                    suggestion: 'Добавьте тесты для этого файла'
                };
            }

            return { 
                applicable: true, 
                reason: 'Правило применимо к данному контексту',
                context: context
            };

        } catch (error) {
            return { applicable: false, reason: `Ошибка проверки: ${error.message}` };
        }
    }

    /**
     * Умная валидация кода с рекомендациями
     */
    async validateCodeWithRecommendations(filePath, ruleNames = []) {
        try {
            const context = await this.analyzeFileContext(filePath);
            const results = {
                filePath,
                context,
                applicableRules: [],
                violations: [],
                recommendations: [],
                score: 100
            };

            // Если правила не указаны, найдем подходящие автоматически
            if (ruleNames.length === 0) {
                ruleNames = await this._findApplicableRules(context);
            }

            for (const ruleName of ruleNames) {
                const applicability = await this.checkRuleApplicability(ruleName, context);
                
                if (applicability.applicable) {
                    results.applicableRules.push({
                        name: ruleName,
                        applicability: applicability
                    });

                    // Проверяем соответствие правилу
                    const violation = await this._checkRuleViolation(filePath, ruleName);
                    if (violation) {
                        results.violations.push(violation);
                        results.score -= violation.severity * 10;
                    }
                }
            }

            // Генерируем рекомендации
            results.recommendations = generateRecommendations(context, results.violations);

            return results;

        } catch (error) {
            return { 
                filePath, 
                error: error.message,
                score: 0
            };
        }
    }

    /**
     * Автоматический поиск применимых правил
     */
    async _findApplicableRules(context) {
        const rulesDir = path.join(process.cwd(), 'data', 'rules-with-standards', 'rules');
        const applicableRules = [];

        try {
            if (await fs.pathExists(rulesDir)) {
                const files = await fs.readdir(rulesDir);
                
                for (const file of files) {
                    if (file.endsWith('.rule.md')) {
                        const ruleName = file.replace('.rule.md', '');
                        const applicability = await this.checkRuleApplicability(ruleName, context);
                        
                        if (applicability.applicable) {
                            applicableRules.push(ruleName);
                        }
                    }
                }
            }
        } catch (error) {
            this.logger.error('Ошибка при поиске применимых правил:', error.message);
        }

        return applicableRules;
    }

    /**
     * Проверка нарушения правила
     */
    async _checkRuleViolation(filePath, ruleName) {
        try {
            const rule = await this.getRuleOrStandard({ name: ruleName });
            if (!rule) return null;

            const parsed = parseWithFrontMatter(rule);
            const content = parsed.content || rule; // Fallback к исходному содержимому
            
            if (!content) {
                this.logger.warn(`Правило "${ruleName}" не содержит контента для проверки`);
                return null;
            }
            
            return await checkRuleViolation(filePath, content);
        } catch (error) {
            this.logger.error('Ошибка при проверке нарушения правила:', error.message);
            return null;
        }
    }

    /**
     * Простое версионирование правил
     */
    async createRuleVersion(ruleName, version, changes) {
        try {
            const rule = await this.getRuleOrStandard({ name: ruleName });
            if (!rule) {
                throw new Error(`Правило "${ruleName}" не найдено`);
            }

            const versionData = {
                version,
                timestamp: new Date().toISOString(),
                changes: changes || 'Обновление правила',
                content: rule
            };

            // Сохраняем версию
            const versionsDir = path.join(process.cwd(), 'data', 'rules-with-standards', 'versions');
            await fs.ensureDir(versionsDir);
            
            const versionFile = path.join(versionsDir, `${ruleName}_v${version}.json`);
            await fs.writeJson(versionFile, versionData, { spaces: 2 });

            // Обновляем историю версий
            if (!this.versionHistory.has(ruleName)) {
                this.versionHistory.set(ruleName, []);
            }
            this.versionHistory.get(ruleName).push(versionData);

            return { 
                success: true, 
                message: `Версия ${version} правила "${ruleName}" создана`,
                versionFile
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Получение истории версий правила
     */
    async getRuleVersions(ruleName) {
        try {
            const versionsDir = path.join(process.cwd(), 'data', 'rules-with-standards', 'versions');
            const versions = [];

            if (await fs.pathExists(versionsDir)) {
                const files = await fs.readdir(versionsDir);
                const ruleVersions = files.filter(f => f.startsWith(`${ruleName}_v`) && f.endsWith('.json'));

                for (const file of ruleVersions) {
                    const versionData = await fs.readJson(path.join(versionsDir, file));
                    versions.push(versionData);
                }
            }

            return versions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        } catch (error) {
            this.logger.error('Ошибка при получении версий правила:', error.message);
            return [];
        }
    }
}

export default RulesEngine;
