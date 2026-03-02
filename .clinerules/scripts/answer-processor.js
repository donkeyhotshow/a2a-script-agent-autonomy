#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

/**
 * Answer Processor for QTU Integration
 *
 * This module processes QTU responses to extract clean answers,
 * implements caching to prevent duplicate questions, and provides
 * proper notifications for cached responses.
 */

class AnswerProcessor {
    constructor() {
        this.answersFile = '.clinerules/user-answers.json';
        this.cacheFile = '.clinerules/answer-cache.json';
        this.data = null;
        this.cache = null;
    }

    /**
     * Initialize the answer processor
     */
    async initialize() {
        try {
            await this.loadAnswers();
            await this.loadCache();
            console.log('✅ Answer Processor initialized');
            return true;
        } catch (error) {
            console.error('❌ Answer Processor initialization failed:', error.message);
            return false;
        }
    }

    /**
     * Load answers data
     */
    async loadAnswers() {
        try {
            const data = await fs.readFile(this.answersFile, 'utf8');
            this.data = JSON.parse(data);
        } catch (error) {
            console.error('Error loading answers:', error.message);
            this.data = {
                sessionId: `cline_${Date.now()}`,
                answers: {},
                questions: {},
                lastUpdated: new Date().toISOString()
            };
        }
    }

    /**
     * Load answer cache
     */
    async loadCache() {
        try {
            const data = await fs.readFile(this.cacheFile, 'utf8');
            this.cache = JSON.parse(data);
        } catch (error) {
            console.error('Error loading cache:', error.message);
            this.cache = {
                questions: {}, // question_text -> { questionId, answer, timestamp }
                questionIds: {}, // questionId -> question_text
                lastUpdated: new Date().toISOString()
            };
        }
    }

    /**
     * Save answers data
     */
    async saveAnswers() {
        try {
            await fs.writeFile(this.answersFile, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error('Error saving answers:', error.message);
        }
    }

    /**
     * Save answer cache
     */
    async saveCache() {
        try {
            await fs.writeFile(this.cacheFile, JSON.stringify(this.cache, null, 2));
        } catch (error) {
            console.error('Error saving cache:', error.message);
        }
    }

    /**
     * Extract clean answer from QTU verbose output
     */
    extractCleanAnswer(qtuOutput) {
        if (!qtuOutput || typeof qtuOutput !== 'string') {
            return null;
        }

        // Method 1: Extract from JSON Output section
        const jsonMatch = qtuOutput.match(/JSON Output:\s*\{[\s\S]*?\}/);
        if (jsonMatch) {
            try {
                const jsonStr = jsonMatch[0].replace('JSON Output:', '').trim();
                const jsonData = JSON.parse(jsonStr);
                return jsonData.answer || null;
            } catch (parseError) {
                // Continue to other methods
            }
        }

        // Method 2: Extract from ANSWER RECEIVED section
        const answerMatch = qtuOutput.match(/ANSWER RECEIVED:[\s\S]*?={50}\s*([^\n]+)\s*={50}/);
        if (answerMatch) {
            return answerMatch[1].trim();
        }

        // Method 3: Extract from [INFO] Completed section
        const completedMatch = qtuOutput.match(/\[INFO\] Completed: \{[\s\S]*?"answer":"([^"]+)"/);
        if (completedMatch) {
            return completedMatch[1];
        }

        // Method 4: Fallback - return the last non-empty line that's not a log line
        const lines = qtuOutput.split('\n').filter(line => line.trim());
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            // Skip log lines and separators
            if (!line.startsWith('[') && !line.startsWith('=') && !line.startsWith('Press') && !line.startsWith('Waiting')) {
                return line;
            }
        }

        return null;
    }

    /**
     * Check if question is already answered in cache
     */
    isQuestionCached(questionText) {
        if (!questionText || !this.cache) {
            return false;
        }

        // Normalize question text for comparison
        const normalizedQuestion = this.normalizeQuestion(questionText);

        return this.cache.questions[normalizedQuestion] !== undefined;
    }

    /**
     * Get cached answer for question
     */
    getCachedAnswer(questionText) {
        if (!this.isQuestionCached(questionText)) {
            return null;
        }

        const normalizedQuestion = this.normalizeQuestion(questionText);
        return this.cache.questions[normalizedQuestion];
    }

    /**
     * Normalize question text for comparison
     */
    normalizeQuestion(questionText) {
        return questionText
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s\u0080-\uFFFF]/g, ''); // Keep Unicode characters
    }

    /**
     * Process QTU response and extract clean answer
     */
    async processQTUResponse(questionText, questionId, qtuOutput) {
        try {
            // Check cache first
            if (this.isQuestionCached(questionText)) {
                const cached = this.getCachedAnswer(questionText);
                console.log(`🔄 Using cached answer for question: ${questionText}`);
                console.log(`💾 Cached answer: ${cached.answer}`);
                console.log(`⏰ Cached at: ${cached.timestamp}`);

                return {
                    success: true,
                    answer: cached.answer,
                    source: 'cache',
                    cachedAt: cached.timestamp
                };
            }

            // Extract clean answer
            const cleanAnswer = this.extractCleanAnswer(qtuOutput);

            if (!cleanAnswer) {
                console.log(`❌ Could not extract clean answer from QTU output`);
                return {
                    success: false,
                    answer: null,
                    source: 'qtu',
                    error: 'Could not extract clean answer'
                };
            }

            // Save to answers file
            const normalizedQuestion = this.normalizeQuestion(questionText);

            this.data.answers[questionId] = cleanAnswer;
            this.data.questions[questionId] = {
                question: questionText,
                timestamp: new Date().toISOString(),
                type: 'processed'
            };
            this.data.lastUpdated = new Date().toISOString();

            await this.saveAnswers();

            // Save to cache
            this.cache.questions[normalizedQuestion] = {
                questionId: questionId,
                answer: cleanAnswer,
                timestamp: new Date().toISOString()
            };
            this.cache.questionIds[questionId] = normalizedQuestion;
            this.cache.lastUpdated = new Date().toISOString();

            await this.saveCache();

            console.log(`✅ Processed QTU response for question: ${questionText}`);
            console.log(`📝 Clean answer: ${cleanAnswer}`);
            console.log(`🆔 Question ID: ${questionId}`);

            return {
                success: true,
                answer: cleanAnswer,
                source: 'qtu',
                questionId: questionId
            };

        } catch (error) {
            console.error('❌ Error processing QTU response:', error.message);
            return {
                success: false,
                answer: null,
                source: 'error',
                error: error.message
            };
        }
    }

    /**
     * Ask user a question with caching
     */
    async askUser(questionText, options = null, timeout = 60) {
        try {
            // Check cache first
            if (this.isQuestionCached(questionText)) {
                const cached = this.getCachedAnswer(questionText);
                console.log(`🔄 Question already answered in cache: ${questionText}`);
                console.log(`💾 Answer: ${cached.answer}`);
                console.log(`⏰ Answered at: ${cached.timestamp}`);
                console.log(`💡 Use cached answer or rephrase question to get new response`);

                return {
                    success: true,
                    answer: cached.answer,
                    source: 'cache',
                    cachedAt: cached.timestamp,
                    questionId: cached.questionId
                };
            }

            // Import QTU integration to ask the question
            const {QTUIntegration} = require('./qtu-integration.js');
            const qtu = new QTUIntegration();

            const initialized = await qtu.initialize();
            if (!initialized) {
                throw new Error('QTU integration not available');
            }

            console.log(`❓ Asking user: ${questionText}`);

            // Ask user via QTU
            const qtuOutput = await qtu.askUser(questionText, options, timeout);

            if (!qtuOutput) {
                return {
                    success: false,
                    answer: null,
                    source: 'timeout',
                    error: 'User did not respond within timeout'
                };
            }

            // Process the QTU response
            const result = await this.processQTUResponse(questionText, `q_${Date.now()}`, qtuOutput);

            return result;

        } catch (error) {
            console.error('❌ Error asking user:', error.message);
            return {
                success: false,
                answer: null,
                source: 'error',
                error: error.message
            };
        }
    }

    /**
     * Clear answer cache
     */
    async clearCache() {
        try {
            this.cache = {
                questions: {},
                questionIds: {},
                lastUpdated: new Date().toISOString()
            };
            await this.saveCache();
            console.log('✅ Answer cache cleared');
            return true;
        } catch (error) {
            console.error('❌ Error clearing cache:', error.message);
            return false;
        }
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        if (!this.cache) {
            return {questions: 0, questionIds: 0, lastUpdated: null};
        }

        return {
            questions: Object.keys(this.cache.questions).length,
            questionIds: Object.keys(this.cache.questionIds).length,
            lastUpdated: this.cache.lastUpdated
        };
    }

    /**
     * Get answers statistics
     */
    getAnswersStats() {
        if (!this.data) {
            return {answers: 0, questions: 0, lastUpdated: null};
        }

        return {
            answers: Object.keys(this.data.answers).length,
            questions: Object.keys(this.data.questions).length,
            lastUpdated: this.data.lastUpdated
        };
    }

    /**
     * List all cached questions
     */
    listCachedQuestions() {
        if (!this.cache || !this.cache.questions) {
            return [];
        }

        return Object.entries(this.cache.questions).map(([question, data]) => ({
            question: question,
            answer: data.answer,
            questionId: data.questionId,
            timestamp: data.timestamp
        }));
    }

    /**
     * List all answers
     */
    listAnswers() {
        if (!this.data || !this.data.questions) {
            return [];
        }

        return Object.entries(this.data.questions).map(([questionId, questionData]) => ({
            questionId: questionId,
            question: questionData.question,
            answer: this.data.answers[questionId],
            timestamp: questionData.timestamp,
            type: questionData.type
        }));
    }
}

// CLI interface
if (require.main === module) {
    const processor = new AnswerProcessor();

    const args = process.argv.slice(2);
    const command = args[0];

    if (!command) {
        console.log('Usage: node answer-processor.js <command> [options]');
        console.log('Commands:');
        console.log('  process <question> <questionId> <qtuOutput>    Process QTU response');
        console.log('  ask <question> [options] [timeout]             Ask user with caching');
        console.log('  cache-check <question>                         Check if question is cached');
        console.log('  cache-list                                     List cached questions');
        console.log('  cache-clear                                    Clear answer cache');
        console.log('  stats                                          Show statistics');
        console.log('  list-answers                                   List all answers');
        process.exit(1);
    }

    processor.initialize().then(async () => {
        switch (command) {
            case 'process':
                const question = args[1];
                const questionId = args[2];
                const qtuOutput = args.slice(3).join(' ');

                if (!question || !questionId || !qtuOutput) {
                    console.log('Usage: node answer-processor.js process <question> <questionId> <qtuOutput>');
                    process.exit(1);
                }

                const result = await processor.processQTUResponse(question, questionId, qtuOutput);
                console.log('Result:', JSON.stringify(result, null, 2));
                break;

            case 'ask':
                const askQuestion = args[1];
                const askOptions = args[2] ? args[2].split(',') : null;
                const askTimeout = args[3] ? parseInt(args[3]) : 60;

                if (!askQuestion) {
                    console.log('Usage: node answer-processor.js ask <question> [options] [timeout]');
                    process.exit(1);
                }

                const askResult = await processor.askUser(askQuestion, askOptions, askTimeout);
                console.log('Result:', JSON.stringify(askResult, null, 2));
                break;

            case 'cache-check':
                const checkQuestion = args[1];
                if (!checkQuestion) {
                    console.log('Usage: node answer-processor.js cache-check <question>');
                    process.exit(1);
                }

                const isCached = processor.isQuestionCached(checkQuestion);
                console.log(`Question cached: ${isCached}`);
                if (isCached) {
                    const cached = processor.getCachedAnswer(checkQuestion);
                    console.log(`Answer: ${cached.answer}`);
                    console.log(`Cached at: ${cached.timestamp}`);
                }
                break;

            case 'cache-list':
                const cachedQuestions = processor.listCachedQuestions();
                console.log('Cached Questions:');
                cachedQuestions.forEach((item, index) => {
                    console.log(`${index + 1}. ${item.question}`);
                    console.log(`   Answer: ${item.answer}`);
                    console.log(`   ID: ${item.questionId}`);
                    console.log(`   Time: ${item.timestamp}`);
                    console.log('');
                });
                break;

            case 'cache-clear':
                await processor.clearCache();
                break;

            case 'stats':
                const cacheStats = processor.getCacheStats();
                const answerStats = processor.getAnswersStats();

                console.log('📊 Answer Processor Statistics');
                console.log('='.repeat(40));
                console.log('Cache Stats:');
                console.log(`  Questions: ${cacheStats.questions}`);
                console.log(`  Question IDs: ${cacheStats.questionIds}`);
                console.log(`  Last Updated: ${cacheStats.lastUpdated}`);
                console.log('');
                console.log('Answers Stats:');
                console.log(`  Answers: ${answerStats.answers}`);
                console.log(`  Questions: ${answerStats.questions}`);
                console.log(`  Last Updated: ${answerStats.lastUpdated}`);
                break;

            case 'list-answers':
                const answers = processor.listAnswers();
                console.log('📋 All Answers:');
                answers.forEach((item, index) => {
                    console.log(`${index + 1}. ${item.question}`);
                    console.log(`   Answer: ${item.answer}`);
                    console.log(`   ID: ${item.questionId}`);
                    console.log(`   Time: ${item.timestamp}`);
                    console.log(`   Type: ${item.type}`);
                    console.log('');
                });
                break;

            default:
                console.log('Unknown command:', command);
        }
    });
}

module.exports = {AnswerProcessor};
