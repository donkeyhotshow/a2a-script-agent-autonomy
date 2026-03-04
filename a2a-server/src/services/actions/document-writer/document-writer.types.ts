/**
 * Document Writer Types
 * 
 * Типы для генерации и записи документов
 */

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
