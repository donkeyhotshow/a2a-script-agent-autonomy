import { z } from 'zod';
/**
 * Validation Utilities
 * Common validation schemas and helpers
 */
/**
 * UUID validation schema
 */
export declare const uuidSchema: z.ZodString;
/**
 * Email validation schema
 */
export declare const emailSchema: z.ZodString;
/**
 * Password validation schema (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
 */
export declare const passwordSchema: z.ZodString;
/**
 * Git URL validation schema
 */
export declare const gitUrlSchema: z.ZodString;
/**
 * Branch name validation schema
 */
export declare const branchNameSchema: z.ZodString;
/**
 * File path validation schema
 */
export declare const filePathSchema: z.ZodString;
/**
 * Pagination query schema
 */
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: number | undefined;
    limit?: number | undefined;
}>;
/**
 * Project ID params schema
 */
export declare const projectIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
/**
 * Session ID params schema
 */
export declare const sessionIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
/**
 * Register input schema
 */
export declare const registerInputSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    password: string;
}, {
    name: string;
    email: string;
    password: string;
}>;
/**
 * Login input schema
 */
export declare const loginInputSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
/**
 * Refresh token input schema
 */
export declare const refreshTokenInputSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
/**
 * Create project input schema
 */
export declare const createProjectInputSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    gitUrl: z.ZodString;
    branch: z.ZodDefault<z.ZodString>;
    sshKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    gitUrl: string;
    branch: string;
    description?: string | undefined;
    sshKey?: string | undefined;
}, {
    name: string;
    gitUrl: string;
    description?: string | undefined;
    branch?: string | undefined;
    sshKey?: string | undefined;
}>;
/**
 * Create session input schema
 */
export declare const createSessionInputSchema: z.ZodObject<{
    projectId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    projectId: string;
}, {
    projectId: string;
}>;
/**
 * Search query schema
 */
export declare const searchQuerySchema: z.ZodObject<{
    query: z.ZodString;
    filters: z.ZodOptional<z.ZodObject<{
        file_types: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        directories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        framework: z.ZodOptional<z.ZodString>;
        exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        file_types?: string[] | undefined;
        directories?: string[] | undefined;
        framework?: string | undefined;
        exclude?: string[] | undefined;
    }, {
        file_types?: string[] | undefined;
        directories?: string[] | undefined;
        framework?: string | undefined;
        exclude?: string[] | undefined;
    }>>;
    options: z.ZodOptional<z.ZodObject<{
        limit: z.ZodOptional<z.ZodNumber>;
        min_score: z.ZodOptional<z.ZodNumber>;
        include_context: z.ZodOptional<z.ZodBoolean>;
        highlight_matches: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        limit?: number | undefined;
        min_score?: number | undefined;
        include_context?: boolean | undefined;
        highlight_matches?: boolean | undefined;
    }, {
        limit?: number | undefined;
        min_score?: number | undefined;
        include_context?: boolean | undefined;
        highlight_matches?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    query: string;
    options?: {
        limit?: number | undefined;
        min_score?: number | undefined;
        include_context?: boolean | undefined;
        highlight_matches?: boolean | undefined;
    } | undefined;
    filters?: {
        file_types?: string[] | undefined;
        directories?: string[] | undefined;
        framework?: string | undefined;
        exclude?: string[] | undefined;
    } | undefined;
}, {
    query: string;
    options?: {
        limit?: number | undefined;
        min_score?: number | undefined;
        include_context?: boolean | undefined;
        highlight_matches?: boolean | undefined;
    } | undefined;
    filters?: {
        file_types?: string[] | undefined;
        directories?: string[] | undefined;
        framework?: string | undefined;
        exclude?: string[] | undefined;
    } | undefined;
}>;
/**
 * Validate and parse input
 */
export declare function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T;
/**
 * Check if string is valid JSON
 */
export declare function isValidJson(str: string): boolean;
/**
 * Sanitize string (remove HTML tags, trim)
 */
export declare function sanitizeString(str: string): string;
/**
 * Validate file extension
 */
export declare function isValidFileExtension(filename: string, allowedExtensions: string[]): boolean;
/**
 * Validate MIME type
 */
export declare function isValidMimeType(mimeType: string, allowedTypes: string[]): boolean;
//# sourceMappingURL=validation.d.ts.map