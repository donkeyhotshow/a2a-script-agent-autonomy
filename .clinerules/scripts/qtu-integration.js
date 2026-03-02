#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * QTU Integration for Cline Documentation Workflow System
 * 
 * This module provides integration between QTU (Question to User) and the
 * Unified Documentation Workflow System, allowing for user input at
 * decision points in the workflow.
 */

class QTUIntegration {
    constructor() {
        this.qtuScriptPath = 'C:\\workspace\\bin\\qtu.ps1';
        this.questionsDir = '.clinerules/questions';
        this.answersFile = '.clinerules/user-answers.json';
        this.sessionId = `cline_${Date.now()}`;
        this.answerProcessor = null;
    }

    /**
     * Initialize QTU integration
     */
    async initialize() {
        try {
            // Create questions directory
            await fs.mkdir(this.questionsDir, { recursive: true });
            
            // Initialize answers file
            await this.ensureAnswersFile();
            
            // Initialize Answer Processor
            const { AnswerProcessor } = require('./answer-processor.js');
            this.answerProcessor = new AnswerProcessor();
            const processorInitialized = await this.answerProcessor.initialize();
            
            if (!processorInitialized) {
                console.log('⚠️  Answer Processor initialization failed, continuing without caching');
                this.answerProcessor = null;
            }
            
            console.log('✅ QTU Integration initialized');
            return true;
        } catch (error) {
            console.error('❌ QTU Integration initialization failed:', error.message);
            return false;
        }
    }

    /**
     * Ensure answers file exists
     */
    async ensureAnswersFile() {
        try {
            await fs.access(this.answersFile);
        } catch (error) {
            const initialData = {
                sessionId: this.sessionId,
                answers: {},
                questions: {},
                lastUpdated: new Date().toISOString()
            };
            await fs.writeFile(this.answersFile, JSON.stringify(initialData, null, 2));
        }
    }

    /**
     * Ask user a question with optional choices
     * @param {string} question - The question to ask
     * @param {string[]} options - Optional array of choices
     * @param {string} timeout - Timeout in seconds (default: 60)
     * @param {string} port - Port for PHP server (default: 8765)
     * @returns {Promise<string>} User's answer
     */
    async askUser(question, options = null, timeout = 60, port = 8765) {
        try {
            console.log(`\n❓ Asking user: ${question}`);
            
            // Check cache first if AnswerProcessor is available
            if (this.answerProcessor) {
                const cachedAnswer = await this.answerProcessor.processQTUResponse(question, `q_${Date.now()}`, '');
                if (cachedAnswer.success && cachedAnswer.source === 'cache') {
                    console.log(`🔄 Using cached answer: ${cachedAnswer.answer}`);
                    return cachedAnswer.answer;
                }
            }
            
            // Build QTU command
            let command = `powershell -ExecutionPolicy Bypass -File "${this.qtuScriptPath}"`;
            command += ` -Question "${question}"`;
            command += ` -Timeout ${timeout}`;
            command += ` -Port ${port}`;
            
            if (options && options.length > 0) {
                command += ` -Options "${options.join(',')}"`;
            }

            console.log(`🚀 Executing: ${command}`);
            
            // Execute QTU command
            const result = execSync(command, { 
                encoding: 'utf8',
                timeout: (timeout + 10) * 1000 // Add buffer for startup
            });

            console.log('QTU raw output:', result);

            // Process QTU response using AnswerProcessor
            if (this.answerProcessor) {
                const processedResult = await this.answerProcessor.processQTUResponse(
                    question, 
                    `q_${Date.now()}`, 
                    result
                );
                
                if (processedResult.success) {
                    console.log(`✅ User answered: ${processedResult.answer}`);
                    return processedResult.answer;
                } else {
                    console.log(`❌ Failed to process QTU response: ${processedResult.error}`);
                    return null;
                }
            }

            // Fallback to original parsing if AnswerProcessor not available
            let response;
            try {
                // Try to extract JSON from output
                const jsonMatch = result.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    response = JSON.parse(jsonMatch[0]);
                } else {
                    // If no JSON found, create basic response
                    response = {
                        answer: result.trim(),
                        questionId: `q_${Date.now()}`,
                        timestamp: new Date().toISOString(),
                        options: options
                    };
                }
            } catch (parseError) {
                console.log('JSON parse error, using fallback:', parseError.message);
                // Fallback: use the raw output as answer
                response = {
                    answer: result.trim(),
                    questionId: `q_${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    options: options
                };
            }

            const answer = response.answer;

            // Save answer to file with enhanced error handling
            await this.saveUserAnswer(question, answer, response);

            console.log(`✅ User answered: ${answer}`);
            return answer;

        } catch (error) {
            if (error.status === 1) {
                console.log('⏰ User did not respond within timeout');
                return null;
            }
            console.error('❌ Error asking user:', error.message);
            return null;
        }
    }

    /**
     * Save user answer to answers file
     */
    async saveUserAnswer(question, answer, response) {
        try {
            let answersData;
            
            // Try to read existing file
            try {
                const fileContent = await fs.readFile(this.answersFile, 'utf8');
                answersData = JSON.parse(fileContent);
            } catch (readError) {
                // File doesn't exist or is invalid, create new structure
                answersData = {
                    sessionId: this.sessionId,
                    answers: {},
                    questions: {},
                    lastUpdated: new Date().toISOString()
                };
            }
            
            const questionId = response.questionId;
            answersData.answers[questionId] = answer;
            answersData.questions[questionId] = {
                question: question,
                timestamp: response.timestamp,
                type: response.options ? 'multiple_choice' : 'text'
            };
            answersData.lastUpdated = new Date().toISOString();

            await fs.writeFile(this.answersFile, JSON.stringify(answersData, null, 2));
            console.log(`✅ Answer saved: ${questionId} = ${answer}`);
        } catch (error) {
            console.error('❌ Error saving user answer:', error.message);
            console.error('Stack trace:', error.stack);
        }
    }

    /**
     * Get user answer history
     */
    async getAnswerHistory() {
        try {
            const answersData = JSON.parse(await fs.readFile(this.answersFile, 'utf8'));
            return answersData;
        } catch (error) {
            console.error('❌ Error reading answer history:', error.message);
            return { answers: {}, questions: {}, sessionId: this.sessionId };
        }
    }

    /**
     * Clear user answers (for testing)
     */
    async clearAnswers() {
        try {
            const initialData = {
                sessionId: this.sessionId,
                answers: {},
                questions: {},
                lastUpdated: new Date().toISOString()
            };
            await fs.writeFile(this.answersFile, JSON.stringify(initialData, null, 2));
            console.log('✅ User answers cleared');
        } catch (error) {
            console.error('❌ Error clearing answers:', error.message);
        }
    }
}

/**
 * Workflow Decision Points with User Input
 */
class WorkflowDecisionPoints {
    constructor() {
        this.qtu = new QTUIntegration();
    }

    /**
     * Initialize decision points
     */
    async initialize() {
        return await this.qtu.initialize();
    }

    /**
     * Phase 1: Discovery Decision Points
     */
    async discoveryDecisions(context) {
        console.log('\n🔍 DISCOVERY PHASE - User Decision Points');
        
        const decisions = {};

        // Decision 1: Processing Mode Selection
        if (context.documentCount > 50) {
            const mode = await this.qtu.askUser(
                'Выберите режим обработки документов:',
                ['Последовательная обработка (качество)', 'Пакетная обработка (скорость)', 'Гибридный режим (баланс)'],
                60
            );
            decisions.processingMode = mode || 'hybrid';
        } else {
            decisions.processingMode = 'sequential';
        }

        // Decision 2: Priority Override
        if (context.existingReviews > 30) {
            const action = await this.qtu.askUser(
                'Обнаружено много существующих ревью. Что приоритетнее?',
                ['Сначала обработать новые документы', 'Сначала привести в порядок существующие', 'Смешанный подход'],
                45
            );
            decisions.priorityOverride = action || 'mixed';
        }

        // Decision 3: Quality Threshold
        const qualityThreshold = await this.qtu.askUser(
            'Установите минимальный порог качества (в процентах):',
            ['70%', '80%', '90%', '95%'],
            30
        );
        decisions.qualityThreshold = parseInt(qualityThreshold) || 85;

        return decisions;
    }

    /**
     * Phase 2: Processing Decision Points
     */
    async processingDecisions(context) {
        console.log('\n⚙️  PROCESSING PHASE - User Decision Points');
        
        const decisions = {};

        // Decision 1: Batch Size
        if (context.processingMode === 'batch' || context.processingMode === 'hybrid') {
            const batchSize = await this.qtu.askUser(
                'Выберите размер пачки для обработки:',
                ['Маленькая (5 документов)', 'Средняя (10 документов)', 'Большая (20 документов)'],
                45
            );
            decisions.batchSize = this.parseBatchSize(batchSize) || 10;
        }

        // Decision 2: Error Handling Strategy
        const errorStrategy = await this.qtu.askUser(
            'Как поступать при ошибках обработки?',
            ['Остановить и уведомить', 'Пропустить и продолжить', 'Автоматически повторить'],
            30
        );
        decisions.errorStrategy = errorStrategy || 'continue';

        // Decision 3: Review Type
        const reviewType = await this.qtu.askUser(
            'Выберите тип ревью для документов:',
            ['Техническое ревью', 'Контент-ревью', 'Полное ревью', 'Быстрое ревью'],
            45
        );
        decisions.reviewType = reviewType || 'content';

        return decisions;
    }

    /**
     * Phase 3: Organization Decision Points
     */
    async organizationDecisions(context) {
        console.log('\n🗂️  ORGANIZATION PHASE - User Decision Points');
        
        const decisions = {};

        // Decision 1: Directory Structure
        const structure = await this.qtu.askUser(
            'Выберите структуру каталогов:',
            ['По типу документа', 'По приоритету', 'По дате создания', 'Смешанная структура'],
            45
        );
        decisions.directoryStructure = structure || 'by_type';

        // Decision 2: Cross-Reference Strategy
        const crossRefStrategy = await this.qtu.askUser(
            'Стратегия создания перекрестных ссылок:',
            ['Только между документами одного типа', 'Между всеми связанными документами', 'Только для высокоприоритетных документов'],
            45
        );
        decisions.crossReferenceStrategy = crossRefStrategy || 'related_only';

        // Decision 3: Cleanup Level
        const cleanupLevel = await this.qtu.askUser(
            'Уровень очистки устаревших документов:',
            ['Только архивация', 'Архивация + удаление дубликатов', 'Полная очистка'],
            30
        );
        decisions.cleanupLevel = cleanupLevel || 'archive_only';

        return decisions;
    }

    /**
     * Phase 4: QA Decision Points
     */
    async qaDecisions(context) {
        console.log('\n✅ QA PHASE - User Decision Points');
        
        const decisions = {};

        // Decision 1: Quality Metrics Focus
        const metricsFocus = await this.qtu.askUser(
            'На чем сосредоточиться при проверке качества?',
            ['Техническая точность', 'Читаемость и понятность', 'Структура и организация', 'Все аспекты'],
            45
        );
        decisions.metricsFocus = metricsFocus || 'all_aspects';

        // Decision 2: Manual Review Threshold
        const manualThreshold = await this.qtu.askUser(
            'Порог для ручного ревью (если качество ниже):',
            ['70%', '80%', '90%', 'Не использовать ручное ревью'],
            30
        );
        decisions.manualReviewThreshold = parseInt(manualThreshold) || 80;

        // Decision 3: Final Report Format
        const reportFormat = await this.qtu.askUser(
            'Формат финального отчета:',
            ['JSON', 'Markdown', 'HTML', 'Текстовый файл'],
            30
        );
        decisions.reportFormat = reportFormat || 'markdown';

        return decisions;
    }

    /**
     * Parse batch size from user selection
     */
    parseBatchSize(selection) {
        const sizeMap = {
            'Маленькая (5 документов)': 5,
            'Средняя (10 документов)': 10,
            'Большая (20 документов)': 20
        };
        return sizeMap[selection] || null;
    }

    /**
     * Get all user decisions for a workflow
     */
    async getWorkflowDecisions(context) {
        const decisions = {
            sessionId: this.qtu.sessionId,
            timestamp: new Date().toISOString(),
            discovery: await this.discoveryDecisions(context),
            processing: await this.processingDecisions(context),
            organization: await this.organizationDecisions(context),
            qa: await this.qaDecisions(context)
        };

        // Save decisions
        await this.saveWorkflowDecisions(decisions);

        return decisions;
    }

    /**
     * Save workflow decisions
     */
    async saveWorkflowDecisions(decisions) {
        const decisionsFile = '.clinerules/workflow-decisions.json';
        try {
            await fs.writeFile(decisionsFile, JSON.stringify(decisions, null, 2));
            console.log('✅ Workflow decisions saved');
        } catch (error) {
            console.error('❌ Error saving workflow decisions:', error.message);
        }
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command) {
        console.log('Usage: node qtu-integration.js <command> [options]');
        console.log('Commands:');
        console.log('  test                                    Test QTU integration');
        console.log('  ask <question> [options]               Ask user a question');
        console.log('  decisions <phase> <context>            Get decisions for phase');
        console.log('  history                                 Show answer history');
        console.log('  clear                                   Clear user answers');
        process.exit(1);
    }

    const qtu = new QTUIntegration();
    const decisionPoints = new WorkflowDecisionPoints();

    async function run() {
        switch (command) {
            case 'test':
                await qtu.initialize();
                const testAnswer = await qtu.askUser(
                    'Тестовый вопрос: Как дела?',
                    ['Хорошо', 'Плохо', 'Нормально'],
                    30
                );
                console.log('Test result:', testAnswer);
                break;

            case 'ask':
                await qtu.initialize();
                const question = args[1];
                const options = args[2] ? args[2].split(',') : null;
                const answer = await qtu.askUser(question, options, 60);
                console.log('Answer:', answer);
                break;

            case 'decisions':
                await decisionPoints.initialize();
                const phase = args[1];
                const context = args[2] ? JSON.parse(args[2]) : {};
                
                let decisions;
                switch (phase) {
                    case 'discovery':
                        decisions = await decisionPoints.discoveryDecisions(context);
                        break;
                    case 'processing':
                        decisions = await decisionPoints.processingDecisions(context);
                        break;
                    case 'organization':
                        decisions = await decisionPoints.organizationDecisions(context);
                        break;
                    case 'qa':
                        decisions = await decisionPoints.qaDecisions(context);
                        break;
                    default:
                        console.log('Unknown phase. Use: discovery, processing, organization, qa');
                        return;
                }
                
                console.log('Decisions:', JSON.stringify(decisions, null, 2));
                break;

            case 'history':
                await qtu.initialize();
                const history = await qtu.getAnswerHistory();
                console.log('Answer History:', JSON.stringify(history, null, 2));
                break;

            case 'clear':
                await qtu.initialize();
                await qtu.clearAnswers();
                break;

            default:
                console.log('Unknown command:', command);
        }
    }

    run().catch(console.error);
}

module.exports = { QTUIntegration, WorkflowDecisionPoints };