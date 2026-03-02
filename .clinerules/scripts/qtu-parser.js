#!/usr/bin/env node

/**
 * Unified QTU Parser
 *
 * Handles both legacy and structured QTU output formats with consistent error handling.
 */

class QTUParser {
    constructor() {
        this.supportedFormats = ['structured', 'legacy'];
        this.currentFormat = 'structured';
    }

    /**
     * Parse QTU response with automatic format detection
     */
    parseResponse(responseText) {
        try {
            // Try structured format first
            const structuredResult = this.parseStructuredFormat(responseText);
            if (structuredResult.success) {
                return structuredResult;
            }

            // Fall back to legacy format
            const legacyResult = this.parseLegacyFormat(responseText);
            if (legacyResult.success) {
                return legacyResult;
            }

            return {
                success: false,
                error: 'Unable to parse QTU response in any supported format',
                originalText: responseText
            };

        } catch (error) {
            return {
                success: false,
                error: `Parser error: ${error.message}`,
                originalText: responseText
            };
        }
    }

    /**
     * Parse structured JSON format
     */
    parseStructuredFormat(responseText) {
        try {
            // Look for JSON object in response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return {success: false, error: 'No JSON found in response'};
            }

            const jsonData = JSON.parse(jsonMatch[0]);

            // Validate required fields
            const requiredFields = ['status', 'question', 'answer', 'timestamp'];
            const missingFields = requiredFields.filter(field => !jsonData[field]);

            if (missingFields.length > 0) {
                return {
                    success: false,
                    error: `Missing required fields: ${missingFields.join(', ')}`
                };
            }

            return {
                success: true,
                format: 'structured',
                data: {
                    status: jsonData.status,
                    question: jsonData.question,
                    answer: jsonData.answer,
                    questionId: jsonData.questionId,
                    timestamp: jsonData.timestamp,
                    options: jsonData.options || [],
                    timeout: jsonData.timeout,
                    port: jsonData.port,
                    sessionId: jsonData.sessionId,
                    metadata: jsonData.metadata || {},
                    error: jsonData.error || null
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `Structured format parse error: ${error.message}`
            };
        }
    }

    /**
     * Parse legacy format with multiple fallback methods
     */
    parseLegacyFormat(responseText) {
        try {
            // Method 1: Extract from JSON Output section
            const jsonMatch = responseText.match(/JSON Output:\s*\{[\s\S]*?\}/);
            if (jsonMatch) {
                try {
                    const jsonStr = jsonMatch[0].replace('JSON Output:', '').trim();
                    const jsonData = JSON.parse(jsonStr);

                    return {
                        success: true,
                        format: 'legacy-json',
                        data: {
                            status: 'success',
                            question: jsonData.question || '',
                            answer: jsonData.answer || '',
                            questionId: jsonData.questionId || '',
                            timestamp: jsonData.timestamp || new Date().toISOString(),
                            options: jsonData.options || [],
                            error: null
                        }
                    };
                } catch (parseError) {
                    // Continue to other methods
                }
            }

            // Method 2: Extract from ANSWER RECEIVED section
            const answerMatch = responseText.match(/ANSWER RECEIVED:[\s\S]*?={50}\s*([^\n]+)\s*={50}/);
            if (answerMatch) {
                return {
                    success: true,
                    format: 'legacy-answer',
                    data: {
                        status: 'success',
                        question: this.extractQuestionFromLegacy(responseText),
                        answer: answerMatch[1].trim(),
                        questionId: this.generateQuestionId(),
                        timestamp: new Date().toISOString(),
                        options: [],
                        error: null
                    }
                };
            }

            // Method 3: Extract from [INFO] Completed section
            const completedMatch = responseText.match(/\[INFO\] Completed: \{[\s\S]*?"answer":"([^"]+)"/);
            if (completedMatch) {
                return {
                    success: true,
                    format: 'legacy-completed',
                    data: {
                        status: 'success',
                        question: this.extractQuestionFromLegacy(responseText),
                        answer: completedMatch[1],
                        questionId: this.generateQuestionId(),
                        timestamp: new Date().toISOString(),
                        options: [],
                        error: null
                    }
                };
            }

            // Method 4: Fallback - return the last non-empty line that's not a log line
            const lines = responseText.split('\n').filter(line => line.trim());
            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i].trim();
                // Skip log lines and separators
                if (!line.startsWith('[') && !line.startsWith('=') && !line.startsWith('Press') && !line.startsWith('Waiting')) {
                    return {
                        success: true,
                        format: 'legacy-fallback',
                        data: {
                            status: 'success',
                            question: this.extractQuestionFromLegacy(responseText),
                            answer: line,
                            questionId: this.generateQuestionId(),
                            timestamp: new Date().toISOString(),
                            options: [],
                            error: null
                        }
                    };
                }
            }

            return {success: false, error: 'No legacy format patterns matched'};

        } catch (error) {
            return {
                success: false,
                error: `Legacy format parse error: ${error.message}`
            };
        }
    }

    /**
     * Extract question from legacy format
     */
    extractQuestionFromLegacy(responseText) {
        // Look for question patterns in legacy format
        const questionPatterns = [
            /Question:\s*(.+)/i,
            /Вопрос:\s*(.+)/i,
            /❓\s*(.+)/,
            /Question with options:\s*(.+)/i
        ];

        for (const pattern of questionPatterns) {
            const match = responseText.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return 'Unknown question';
    }

    /**
     * Generate question ID for legacy format
     */
    generateQuestionId() {
        return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Validate parsed data
     */
    validateData(data) {
        const errors = [];

        if (!data.question || data.question.trim() === '') {
            errors.push('Question is required');
        }

        if (!data.answer) {
            errors.push('Answer is required');
        }

        if (!data.timestamp) {
            errors.push('Timestamp is required');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Normalize parsed data to consistent format
     */
    normalizeData(data) {
        return {
            status: data.status || 'success',
            question: data.question || '',
            answer: data.answer || '',
            questionId: data.questionId || this.generateQuestionId(),
            timestamp: data.timestamp || new Date().toISOString(),
            options: data.options || [],
            timeout: data.timeout || null,
            port: data.port || null,
            sessionId: data.sessionId || null,
            metadata: data.metadata || {},
            error: data.error || null,
            sourceFormat: data.sourceFormat || 'unknown'
        };
    }

    /**
     * Get parser statistics
     */
    getStatistics() {
        return {
            supportedFormats: this.supportedFormats,
            currentFormat: this.currentFormat,
            version: '1.0.0'
        };
    }
}

// CLI interface
if (require.main === module) {
    const parser = new QTUParser();

    const args = process.argv.slice(2);
    const command = args[0];
    const responseText = args.slice(1).join(' ');

    if (!command) {
        console.log('Usage: node qtu-parser.js <command> [response]');
        console.log('Commands:');
        console.log('  parse <response>     Parse QTU response');
        console.log('  stats               Show parser statistics');
        process.exit(1);
    }

    switch (command) {
        case 'parse':
            if (!responseText) {
                console.log('Usage: node qtu-parser.js parse <response>');
                process.exit(1);
            }

            const result = parser.parseResponse(responseText);
            console.log('Parse Result:', JSON.stringify(result, null, 2));
            break;

        case 'stats':
            const stats = parser.getStatistics();
            console.log('Parser Statistics:', JSON.stringify(stats, null, 2));
            break;

        default:
            console.log('Unknown command:', command);
    }
}

module.exports = {QTUParser};