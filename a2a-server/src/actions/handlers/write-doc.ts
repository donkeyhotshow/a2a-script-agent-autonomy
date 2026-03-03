/**
 * Action Handler: write-doc
 * 
 * Handles document writing and generation actions.
 */

import {logger} from '../../utils/logger.js';
import {
    documentWriterService,
    type WriteDocumentInput,
    type GenerateDocumentInput,
    type DocumentType,
    type DocumentFormat,
} from '../../services/document-writer.service.js';

export interface WriteDocActionInput {
    filePath: string;
    content?: string;
    format?: DocumentFormat;
    overwrite?: boolean;
    createBackup?: boolean;
    generate?: GenerateDocumentInput;
}

export interface ReadDocActionInput {
    filePath: string;
}

export interface AppendDocActionInput {
    filePath: string;
    content: string;
    ensureNewline?: boolean;
    createIfMissing?: boolean;
}

export interface GenerateReportInput {
    type: 'task-report' | 'api-doc' | 'custom';
    filePath: string;
    context: Record<string, unknown>;
    overwrite?: boolean;
}

export interface WriteDocActionOutput {
    success: boolean;
    filePath?: string;
    bytesWritten?: number;
    backupPath?: string;
    content?: string;
    error?: string;
}

/**
 * Execute write-doc action
 */
export async function executeWriteDoc(
    input: WriteDocActionInput
): Promise<WriteDocActionOutput> {
    logger.info('[write-doc] Executing', {filePath: input.filePath});

    try {
        let content: string;

        // Generate content if requested
        if (input.generate) {
            content = await documentWriterService.generateDocument(input.generate);
        } else if (input.content) {
            content = input.content;
        } else {
            return {
                success: false,
                error: 'Either content or generate must be provided',
            };
        }

        // Write the document
        const result = await documentWriterService.writeDocument({
            filePath: input.filePath,
            content,
            format: input.format,
            overwrite: input.overwrite,
            createBackup: input.createBackup,
        });

        if (!result.success) {
            return {
                success: false,
                error: result.error,
            };
        }

        logger.info('[write-doc] Document written', {
            filePath: result.filePath,
            bytesWritten: result.bytesWritten,
        });

        return {
            success: true,
            filePath: result.filePath,
            bytesWritten: result.bytesWritten,
            backupPath: result.backupPath,
        };
    } catch (error) {
        logger.error('[write-doc] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

/**
 * Execute read-doc action
 */
export async function executeReadDoc(
    input: ReadDocActionInput
): Promise<WriteDocActionOutput> {
    logger.info('[read-doc] Executing', {filePath: input.filePath});

    try {
        const content = await documentWriterService.readDocument(input.filePath);

        return {
            success: true,
            filePath: input.filePath,
            content,
        };
    } catch (error) {
        logger.error('[read-doc] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

/**
 * Execute append-doc action
 */
export async function executeAppendDoc(
    input: AppendDocActionInput
): Promise<WriteDocActionOutput> {
    logger.info('[append-doc] Executing', {filePath: input.filePath});

    try {
        const result = await documentWriterService.appendToDocument(
            input.filePath,
            input.content,
            {
                ensureNewline: input.ensureNewline,
                createIfMissing: input.createIfMissing,
            }
        );

        if (!result.success) {
            return {
                success: false,
                error: result.error,
            };
        }

        return {
            success: true,
            filePath: result.filePath,
            bytesWritten: result.bytesWritten,
        };
    } catch (error) {
        logger.error('[append-doc] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

/**
 * Execute generate-doc action
 */
export async function executeGenerateDoc(
    input: GenerateDocumentInput
): Promise<WriteDocActionOutput> {
    logger.info('[generate-doc] Executing', {
        type: input.type,
        format: input.format,
    });

    try {
        const content = await documentWriterService.generateDocument(input);

        return {
            success: true,
            content,
        };
    } catch (error) {
        logger.error('[generate-doc] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

/**
 * Execute generate-report action
 */
export async function executeGenerateReport(
    input: GenerateReportInput
): Promise<WriteDocActionOutput> {
    logger.info('[generate-report] Executing', {
        type: input.type,
        filePath: input.filePath,
    });

    try {
        let content: string;

        switch (input.type) {
            case 'task-report':
                content = await documentWriterService.generateTaskReport(
                    input.context as {
                        taskTitle: string;
                        taskDescription: string;
                        subtasks: Array<{
                            title: string;
                            status: string;
                            description?: string;
                        }>;
                        executionTime?: number;
                        sessionId?: string;
                    }
                );
                break;

            case 'api-doc':
                content = await documentWriterService.generateApiDocumentation(
                    input.context as {
                        endpoints: Array<{
                            method: string;
                            path: string;
                            description: string;
                            parameters?: Array<{
                                name: string;
                                type: string;
                                required: boolean;
                                description: string;
                            }>;
                            responses?: Array<{
                                code: number;
                                description: string;
                                example?: string;
                            }>;
                        }>;
                        title: string;
                        version?: string;
                    }
                );
                break;

            case 'custom':
                content = input.context.content as string;
                break;

            default:
                return {
                    success: false,
                    error: `Unknown report type: ${input.type}`,
                };
        }

        // Write the report
        const result = await documentWriterService.writeDocument({
            filePath: input.filePath,
            content,
            format: 'markdown',
            overwrite: input.overwrite,
        });

        if (!result.success) {
            return {
                success: false,
                error: result.error,
            };
        }

        logger.info('[generate-report] Report generated', {
            filePath: result.filePath,
            type: input.type,
        });

        return {
            success: true,
            filePath: result.filePath,
            bytesWritten: result.bytesWritten,
        };
    } catch (error) {
        logger.error('[generate-report] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

/**
 * Execute validate-doc action
 */
export async function executeValidateDoc(
    input: {
        content: string;
        format?: DocumentFormat;
    }
): Promise<{
    success: boolean;
    valid: boolean;
    errors?: string[];
    warnings?: string[];
}> {
    logger.info('[validate-doc] Executing', {format: input.format});

    try {
        const result = documentWriterService.validateContent(input.content, input.format);

        return {
            success: true,
            valid: result.valid,
            errors: result.errors,
            warnings: result.warnings,
        };
    } catch (error) {
        logger.error('[validate-doc] Execution failed', {error: String(error)});
        return {
            success: false,
            valid: false,
            errors: [String(error)],
        };
    }
}

/**
 * Execute list-templates action
 */
export async function executeListTemplates(): Promise<{
    success: boolean;
    templates?: Array<{
        id: string;
        name: string;
        type: string;
        format: string;
    }>;
}> {
    logger.info('[list-templates] Executing');

    try {
        const templates = documentWriterService.listTemplates();

        return {
            success: true,
            templates: templates.map(t => ({
                id: t.id,
                name: t.name,
                type: t.type,
                format: t.format,
            })),
        };
    } catch (error) {
        logger.error('[list-templates] Execution failed', {error: String(error)});
        return {
            success: false,
        };
    }
}
