/**
 * Document Writer Service
 * 
 * Сервис для генерации и записи документов:
 * - Генерация документации по коду
 * - Создание отчетов о задачах
 * - Запись файлов с валидацией
 * - Поддержка различных форматов (MD, JSON, YAML, etc.)
 */

import {logger} from '../utils/logger.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {LLMInput, callLLM} from './llm-adapter.js';

export type DocumentFormat = 'markdown' | 'json' | 'yaml' | 'typescript' | 'javascript' | 'plain';
export type DocumentType = 'documentation' | 'report' | 'specification' | 'guide' | 'api-doc' | 'changelog';

export interface DocumentTemplate {
    id: string;
    name: string;
    type: DocumentType;
    format: DocumentFormat;
    template: string;
    variables: string[];
}

export interface DocumentContext {
    title: string;
    description?: string;
    author?: string;
    date?: Date;
    version?: string;
    sections?: DocumentSection[];
    metadata?: Record<string, unknown>;
}

export interface DocumentSection {
    heading: string;
    content: string;
    level: number;
    subsections?: DocumentSection[];
}

export interface WriteDocumentInput {
    filePath: string;
    content: string;
    format?: DocumentFormat;
    overwrite?: boolean;
    createBackup?: boolean;
}

export interface GenerateDocumentInput {
    type: DocumentType;
    format: DocumentFormat;
    context: DocumentContext;
    template?: string;
    useLLM?: boolean;
}

export interface DocumentValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface WriteResult {
    success: boolean;
    filePath: string;
    bytesWritten: number;
    backupPath?: string;
    error?: string;
}

/**
 * Service for writing and generating documents
 */
export class DocumentWriterService {
    private static instance: DocumentWriterService;
    private templates: Map<string, DocumentTemplate> = new Map();

    private constructor() {
        this.initializeDefaultTemplates();
        logger.info('[DocumentWriterService] Initialized');
    }

    static getInstance(): DocumentWriterService {
        if (!DocumentWriterService.instance) {
            DocumentWriterService.instance = new DocumentWriterService();
        }
        return DocumentWriterService.instance;
    }

    /**
     * Write content to a file with validation and safety checks
     */
    async writeDocument(input: WriteDocumentInput): Promise<WriteResult> {
        logger.info('[DocumentWriterService] Writing document', {filePath: input.filePath});

        try {
            // Validate path
            const validation = this.validatePath(input.filePath);
            if (!validation.valid) {
                return {
                    success: false,
                    filePath: input.filePath,
                    bytesWritten: 0,
                    error: validation.errors.join('; '),
                };
            }

            // Resolve full path
            const fullPath = path.resolve(input.filePath);
            const dir = path.dirname(fullPath);

            // Check if file exists
            let fileExists = false;
            try {
                await fs.access(fullPath);
                fileExists = true;
            } catch {
                fileExists = false;
            }

            if (fileExists && !input.overwrite) {
                return {
                    success: false,
                    filePath: input.filePath,
                    bytesWritten: 0,
                    error: 'File already exists and overwrite is false',
                };
            }

            // Create backup if requested
            let backupPath: string | undefined;
            if (fileExists && input.createBackup) {
                backupPath = `${fullPath}.backup-${Date.now()}`;
                await fs.copyFile(fullPath, backupPath);
                logger.info('[DocumentWriterService] Backup created', {backupPath});
            }

            // Ensure directory exists
            await fs.mkdir(dir, {recursive: true});

            // Validate content
            const contentValidation = this.validateContent(input.content, input.format);
            if (!contentValidation.valid) {
                return {
                    success: false,
                    filePath: input.filePath,
                    bytesWritten: 0,
                    error: contentValidation.errors.join('; '),
                };
            }

            // Write file
            await fs.writeFile(fullPath, input.content, 'utf8');
            const bytesWritten = Buffer.byteLength(input.content, 'utf8');

            logger.info('[DocumentWriterService] Document written', {
                filePath: input.filePath,
                bytesWritten,
            });

            return {
                success: true,
                filePath: input.filePath,
                bytesWritten,
                backupPath,
            };
        } catch (error) {
            logger.error('[DocumentWriterService] Failed to write document', {error: String(error)});
            return {
                success: false,
                filePath: input.filePath,
                bytesWritten: 0,
                error: String(error),
            };
        }
    }

    /**
     * Generate document content based on type and context
     */
    async generateDocument(input: GenerateDocumentInput): Promise<string> {
        logger.info('[DocumentWriterService] Generating document', {
            type: input.type,
            format: input.format,
        });

        try {
            if (input.useLLM) {
                return await this.generateWithLLM(input);
            }

            return this.generateWithTemplate(input);
        } catch (error) {
            logger.error('[DocumentWriterService] Failed to generate document', {error: String(error)});
            throw new Error(`Failed to generate document: ${String(error)}`);
        }
    }

    /**
     * Read file content
     */
    async readDocument(filePath: string): Promise<string> {
        logger.info('[DocumentWriterService] Reading document', {filePath});

        try {
            const fullPath = path.resolve(filePath);
            const content = await fs.readFile(fullPath, 'utf8');
            return content;
        } catch (error) {
            logger.error('[DocumentWriterService] Failed to read document', {error: String(error)});
            throw new Error(`Failed to read document: ${String(error)}`);
        }
    }

    /**
     * Append content to an existing document
     */
    async appendToDocument(
        filePath: string,
        content: string,
        options?: {
            ensureNewline?: boolean;
            createIfMissing?: boolean;
        }
    ): Promise<WriteResult> {
        logger.info('[DocumentWriterService] Appending to document', {filePath});

        try {
            const fullPath = path.resolve(filePath);
            const dir = path.dirname(fullPath);

            // Check if file exists
            let existingContent = '';
            try {
                existingContent = await fs.readFile(fullPath, 'utf8');
            } catch (error) {
                if (!options?.createIfMissing) {
                    throw error;
                }
                await fs.mkdir(dir, {recursive: true});
            }

            // Ensure newline if requested
            let contentToAppend = content;
            if (options?.ensureNewline && existingContent && !existingContent.endsWith('\n')) {
                contentToAppend = '\n' + content;
            }

            await fs.appendFile(fullPath, contentToAppend, 'utf8');
            const bytesWritten = Buffer.byteLength(contentToAppend, 'utf8');

            return {
                success: true,
                filePath,
                bytesWritten,
            };
        } catch (error) {
            logger.error('[DocumentWriterService] Failed to append to document', {error: String(error)});
            return {
                success: false,
                filePath,
                bytesWritten: 0,
                error: String(error),
            };
        }
    }

    /**
     * Register a custom template
     */
    registerTemplate(template: DocumentTemplate): void {
        this.templates.set(template.id, template);
        logger.info('[DocumentWriterService] Template registered', {templateId: template.id});
    }

    /**
     * Get registered template
     */
    getTemplate(templateId: string): DocumentTemplate | undefined {
        return this.templates.get(templateId);
    }

    /**
     * List all registered templates
     */
    listTemplates(): DocumentTemplate[] {
        return Array.from(this.templates.values());
    }

    /**
     * Validate file content based on format
     */
    validateContent(content: string, format?: DocumentFormat): DocumentValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!content || content.trim().length === 0) {
            errors.push('Content is empty');
        }

        switch (format) {
            case 'json':
                try {
                    JSON.parse(content);
                } catch {
                    errors.push('Invalid JSON format');
                }
                break;

            case 'yaml':
                // Basic YAML validation - check for common issues
                if (content.includes('\t')) {
                    warnings.push('YAML should use spaces, not tabs');
                }
                break;

            case 'markdown':
                // Check for common markdown issues
                if (content.includes('```') && (content.match(/```/g) || []).length % 2 !== 0) {
                    warnings.push('Unclosed code block detected');
                }
                break;
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Generate task report
     */
    async generateTaskReport(context: {
        taskTitle: string;
        taskDescription: string;
        subtasks: Array<{
            title: string;
            status: string;
            description?: string;
        }>;
        executionTime?: number;
        sessionId?: string;
    }): Promise<string> {
        const lines: string[] = [
            `# Task Report: ${context.taskTitle}`,
            '',
            `**Generated:** ${new Date().toISOString()}`,
            context.sessionId ? `**Session:** ${context.sessionId}` : '',
            context.executionTime ? `**Execution Time:** ${context.executionTime}ms` : '',
            '',
            '## Description',
            '',
            context.taskDescription,
            '',
            '## Subtasks',
            '',
        ];

        for (const subtask of context.subtasks) {
            const statusEmoji = this.getStatusEmoji(subtask.status);
            lines.push(`- ${statusEmoji} **${subtask.title}** (${subtask.status})`);
            if (subtask.description) {
                lines.push(`  - ${subtask.description}`);
            }
        }

        lines.push('', '## Summary', '');
        
        const completed = context.subtasks.filter(s => s.status === 'completed').length;
        const total = context.subtasks.length;
        lines.push(`- Completed: ${completed}/${total}`);
        lines.push(`- Progress: ${Math.round((completed / total) * 100)}%`);

        return lines.filter(Boolean).join('\n');
    }

    /**
     * Generate API documentation
     */
    async generateApiDocumentation(context: {
        endpoints: Array<{
            method: string;
            path: string;
            description: string;
            parameters?: Array<{name: string; type: string; required: boolean; description: string}>;
            responses?: Array<{code: number; description: string; example?: string}>;
        }>;
        title: string;
        version?: string;
    }): Promise<string> {
        const lines: string[] = [
            `# ${context.title}`,
            '',
            context.version ? `**Version:** ${context.version}` : '',
            '',
            '## Endpoints',
            '',
        ];

        for (const endpoint of context.endpoints) {
            lines.push(`### ${endpoint.method.toUpperCase()} ${endpoint.path}`, '');
            lines.push(endpoint.description, '');

            if (endpoint.parameters && endpoint.parameters.length > 0) {
                lines.push('**Parameters:**', '');
                lines.push('| Name | Type | Required | Description |');
                lines.push('|------|------|----------|-------------|');
                for (const param of endpoint.parameters) {
                    lines.push(`| ${param.name} | ${param.type} | ${param.required ? 'Yes' : 'No'} | ${param.description} |`);
                }
                lines.push('');
            }

            if (endpoint.responses && endpoint.responses.length > 0) {
                lines.push('**Responses:**', '');
                for (const response of endpoint.responses) {
                    lines.push(`- **${response.code}**: ${response.description}`);
                    if (response.example) {
                        lines.push('', '  ```json');
                        lines.push(`  ${response.example}`);
                        lines.push('  ```', '');
                    }
                }
                lines.push('');
            }
        }

        return lines.filter(Boolean).join('\n');
    }

    // ============== Private Methods ==============

    private validatePath(filePath: string): DocumentValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check for path traversal
        if (filePath.includes('..')) {
            errors.push('Path traversal detected');
        }

        // Check for absolute paths outside workspace
        if (path.isAbsolute(filePath)) {
            const resolved = path.resolve(filePath);
            const cwd = process.cwd();
            if (!resolved.startsWith(cwd)) {
                warnings.push('Path is outside current working directory');
            }
        }

        // Check for invalid characters
        if (/[<>:"|?*]/.test(filePath)) {
            errors.push('Path contains invalid characters');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }

    private async generateWithLLM(input: GenerateDocumentInput): Promise<string> {
        const template = this.getTemplateForType(input.type);
        
        const llmInput: LLMInput = {
            context: {
                documentType: input.type,
                documentFormat: input.format,
                ...input.context,
            },
            injectedContent: `Generate a ${input.type} document in ${input.format} format.\n\n` +
                `Title: ${input.context.title}\n` +
                `Description: ${input.context.description || 'N/A'}\n\n` +
                `Template:\n${template}`,
        };

        const result = await callLLM(llmInput);
        return this.formatOutput(result, input.format);
    }

    private generateWithTemplate(input: GenerateDocumentInput): string {
        const template = input.template || this.getTemplateForType(input.type);
        let content = this.fillTemplate(template, input.context);
        return this.formatOutput(content, input.format);
    }

    private getTemplateForType(type: DocumentType): string {
        const templates: Record<DocumentType, string> = {
            documentation: `# {{title}}\n\n{{description}}\n\n## Overview\n\n## Installation\n\n## Usage\n\n## API Reference\n\n## Examples`,
            report: `# {{title}}\n\n**Date:** {{date}}\n**Author:** {{author}}\n\n## Executive Summary\n\n{{description}}\n\n## Findings\n\n## Conclusions\n\n## Recommendations`,
            specification: `# Specification: {{title}}\n\n**Version:** {{version}}\n\n## Overview\n\n{{description}}\n\n## Requirements\n\n## Design\n\n## Implementation Details`,
            guide: `# {{title}}\n\n{{description}}\n\n## Prerequisites\n\n## Step-by-Step Instructions\n\n## Troubleshooting\n\n## FAQ`,
            'api-doc': `# API Documentation: {{title}}\n\n**Version:** {{version}}\n\n## Base URL\n\n## Authentication\n\n## Endpoints\n\n## Error Handling`,
            changelog: `# Changelog\n\nAll notable changes to {{title}} will be documented in this file.\n\n## [{{version}}] - {{date}}\n\n### Added\n### Changed\n### Fixed\n### Removed`,
        };

        return templates[type] || templates.documentation;
    }

    private fillTemplate(template: string, context: DocumentContext): string {
        let result = template;

        // Replace simple variables
        result = result.replace(/\{\{title\}\}/g, context.title);
        result = result.replace(/\{\{description\}\}/g, context.description || '');
        result = result.replace(/\{\{author\}\}/g, context.author || '');
        result = result.replace(/\{\{version\}\}/g, context.version || '1.0.0');
        result = result.replace(/\{\{date\}\}/g, (context.date || new Date()).toISOString().split('T')[0]);

        // Replace sections
        if (context.sections && result.includes('{{sections}}')) {
            const sectionsContent = context.sections
                .map(s => `${'#'.repeat(s.level)} ${s.heading}\n\n${s.content}`)
                .join('\n\n');
            result = result.replace(/\{\{sections\}\}/g, sectionsContent);
        }

        return result;
    }

    private formatOutput(content: string, format?: DocumentFormat): string {
        switch (format) {
            case 'json':
                try {
                    const obj = JSON.parse(content);
                    return JSON.stringify(obj, null, 2);
                } catch {
                    return content;
                }

            case 'typescript':
            case 'javascript':
                // Basic formatting - ensure newline at end
                return content.endsWith('\n') ? content : content + '\n';

            case 'markdown':
                // Ensure newline at end
                return content.endsWith('\n') ? content : content + '\n';

            default:
                return content;
        }
    }

    private getStatusEmoji(status: string): string {
        const emojis: Record<string, string> = {
            completed: '✅',
            'in-progress': '🔄',
            pending: '⏳',
            failed: '❌',
            blocked: '🚫',
        };
        return emojis[status] || '⚪';
    }

    private initializeDefaultTemplates(): void {
        const defaultTemplates: DocumentTemplate[] = [
            {
                id: 'default-documentation',
                name: 'Default Documentation',
                type: 'documentation',
                format: 'markdown',
                template: this.getTemplateForType('documentation'),
                variables: ['title', 'description', 'author', 'version'],
            },
            {
                id: 'default-report',
                name: 'Default Report',
                type: 'report',
                format: 'markdown',
                template: this.getTemplateForType('report'),
                variables: ['title', 'description', 'author', 'date'],
            },
            {
                id: 'default-api-doc',
                name: 'Default API Documentation',
                type: 'api-doc',
                format: 'markdown',
                template: this.getTemplateForType('api-doc'),
                variables: ['title', 'version'],
            },
        ];

        for (const template of defaultTemplates) {
            this.templates.set(template.id, template);
        }
    }
}

// Export singleton instance
export const documentWriterService = DocumentWriterService.getInstance();
