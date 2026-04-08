/**
 * @a2a/json - Validation schemas using Zod
 */
import { z } from 'zod';
import type { ValidationResult, ResponseType } from './types.js';
/**
 * Base response schema
 */
export declare const baseResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    timestamp: string;
}, {
    success: boolean;
    timestamp: string;
}>;
/**
 * Task schema
 */
export declare const taskSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["analyze", "refactor", "test", "document", "fix", "create", "delete"]>;
    status: z.ZodEnum<["pending", "in_progress", "completed", "failed", "cancelled"]>;
    target: z.ZodOptional<z.ZodString>;
    progress: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
    type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
    id: string;
    progress?: number | undefined;
    target?: string | undefined;
}, {
    status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
    type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
    id: string;
    progress?: number | undefined;
    target?: string | undefined;
}>;
/**
 * Protocol error schema
 */
export declare const protocolErrorSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    file: z.ZodOptional<z.ZodString>;
    line: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    code: string;
    message: string;
    file?: string | undefined;
    line?: number | undefined;
}, {
    code: string;
    message: string;
    file?: string | undefined;
    line?: number | undefined;
}>;
/**
 * Context block schema
 */
export declare const contextBlockSchema: z.ZodObject<{
    version: z.ZodLiteral<"1.0">;
    session_id: z.ZodString;
    new_task: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    architectural_features: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    continue: z.ZodOptional<z.ZodBoolean>;
    tasks: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["analyze", "refactor", "test", "document", "fix", "create", "delete"]>;
        status: z.ZodEnum<["pending", "in_progress", "completed", "failed", "cancelled"]>;
        target: z.ZodOptional<z.ZodString>;
        progress: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
        type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
        id: string;
        progress?: number | undefined;
        target?: string | undefined;
    }, {
        status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
        type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
        id: string;
        progress?: number | undefined;
        target?: string | undefined;
    }>, "many">>;
    request_files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    confirm: z.ZodOptional<z.ZodBoolean>;
    errors: z.ZodOptional<z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        file: z.ZodOptional<z.ZodString>;
        line: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        file?: string | undefined;
        line?: number | undefined;
    }, {
        code: string;
        message: string;
        file?: string | undefined;
        line?: number | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    version: "1.0";
    session_id: string;
    new_task?: string[] | undefined;
    architectural_features?: string[] | undefined;
    continue?: boolean | undefined;
    tasks?: {
        status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
        type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
        id: string;
        progress?: number | undefined;
        target?: string | undefined;
    }[] | undefined;
    request_files?: string[] | undefined;
    confirm?: boolean | undefined;
    errors?: {
        code: string;
        message: string;
        file?: string | undefined;
        line?: number | undefined;
    }[] | undefined;
}, {
    version: "1.0";
    session_id: string;
    new_task?: string[] | undefined;
    architectural_features?: string[] | undefined;
    continue?: boolean | undefined;
    tasks?: {
        status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
        type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
        id: string;
        progress?: number | undefined;
        target?: string | undefined;
    }[] | undefined;
    request_files?: string[] | undefined;
    confirm?: boolean | undefined;
    errors?: {
        code: string;
        message: string;
        file?: string | undefined;
        line?: number | undefined;
    }[] | undefined;
}>;
/**
 * Action schema
 */
export declare const actionSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodNumber>;
    dsl: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    dslScript: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    description?: string | undefined;
    priority?: number | undefined;
    dsl?: Record<string, unknown> | undefined;
    dslScript?: string | undefined;
}, {
    id: string;
    name: string;
    description?: string | undefined;
    priority?: number | undefined;
    dsl?: Record<string, unknown> | undefined;
    dslScript?: string | undefined;
}>;
/**
 * Fallback action schema
 */
export declare const fallbackActionSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    description?: string | undefined;
    reason?: string | undefined;
}, {
    id: string;
    name: string;
    description?: string | undefined;
    reason?: string | undefined;
}>;
/**
 * Action proposal result schema
 * @deprecated Use canonical format with execute.form.choices
 */
export declare const actionProposalResultSchema: z.ZodObject<{
    context: z.ZodObject<{
        version: z.ZodLiteral<"1.0">;
        session_id: z.ZodString;
        new_task: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        architectural_features: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        continue: z.ZodOptional<z.ZodBoolean>;
        tasks: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["analyze", "refactor", "test", "document", "fix", "create", "delete"]>;
            status: z.ZodEnum<["pending", "in_progress", "completed", "failed", "cancelled"]>;
            target: z.ZodOptional<z.ZodString>;
            progress: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
            type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
            id: string;
            progress?: number | undefined;
            target?: string | undefined;
        }, {
            status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
            type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
            id: string;
            progress?: number | undefined;
            target?: string | undefined;
        }>, "many">>;
        request_files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        confirm: z.ZodOptional<z.ZodBoolean>;
        errors: z.ZodOptional<z.ZodArray<z.ZodObject<{
            code: z.ZodString;
            message: z.ZodString;
            file: z.ZodOptional<z.ZodString>;
            line: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            code: string;
            message: string;
            file?: string | undefined;
            line?: number | undefined;
        }, {
            code: string;
            message: string;
            file?: string | undefined;
            line?: number | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        version: "1.0";
        session_id: string;
        new_task?: string[] | undefined;
        architectural_features?: string[] | undefined;
        continue?: boolean | undefined;
        tasks?: {
            status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
            type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
            id: string;
            progress?: number | undefined;
            target?: string | undefined;
        }[] | undefined;
        request_files?: string[] | undefined;
        confirm?: boolean | undefined;
        errors?: {
            code: string;
            message: string;
            file?: string | undefined;
            line?: number | undefined;
        }[] | undefined;
    }, {
        version: "1.0";
        session_id: string;
        new_task?: string[] | undefined;
        architectural_features?: string[] | undefined;
        continue?: boolean | undefined;
        tasks?: {
            status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
            type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
            id: string;
            progress?: number | undefined;
            target?: string | undefined;
        }[] | undefined;
        request_files?: string[] | undefined;
        confirm?: boolean | undefined;
        errors?: {
            code: string;
            message: string;
            file?: string | undefined;
            line?: number | undefined;
        }[] | undefined;
    }>;
    proposedActions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        priority: z.ZodOptional<z.ZodNumber>;
        dsl: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        dslScript: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        description?: string | undefined;
        priority?: number | undefined;
        dsl?: Record<string, unknown> | undefined;
        dslScript?: string | undefined;
    }, {
        id: string;
        name: string;
        description?: string | undefined;
        priority?: number | undefined;
        dsl?: Record<string, unknown> | undefined;
        dslScript?: string | undefined;
    }>, "many">>;
    fallbackActions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        reason: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        description?: string | undefined;
        reason?: string | undefined;
    }, {
        id: string;
        name: string;
        description?: string | undefined;
        reason?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    context: {
        version: "1.0";
        session_id: string;
        new_task?: string[] | undefined;
        architectural_features?: string[] | undefined;
        continue?: boolean | undefined;
        tasks?: {
            status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
            type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
            id: string;
            progress?: number | undefined;
            target?: string | undefined;
        }[] | undefined;
        request_files?: string[] | undefined;
        confirm?: boolean | undefined;
        errors?: {
            code: string;
            message: string;
            file?: string | undefined;
            line?: number | undefined;
        }[] | undefined;
    };
    proposedActions?: {
        id: string;
        name: string;
        description?: string | undefined;
        priority?: number | undefined;
        dsl?: Record<string, unknown> | undefined;
        dslScript?: string | undefined;
    }[] | undefined;
    fallbackActions?: {
        id: string;
        name: string;
        description?: string | undefined;
        reason?: string | undefined;
    }[] | undefined;
}, {
    context: {
        version: "1.0";
        session_id: string;
        new_task?: string[] | undefined;
        architectural_features?: string[] | undefined;
        continue?: boolean | undefined;
        tasks?: {
            status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
            type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
            id: string;
            progress?: number | undefined;
            target?: string | undefined;
        }[] | undefined;
        request_files?: string[] | undefined;
        confirm?: boolean | undefined;
        errors?: {
            code: string;
            message: string;
            file?: string | undefined;
            line?: number | undefined;
        }[] | undefined;
    };
    proposedActions?: {
        id: string;
        name: string;
        description?: string | undefined;
        priority?: number | undefined;
        dsl?: Record<string, unknown> | undefined;
        dslScript?: string | undefined;
    }[] | undefined;
    fallbackActions?: {
        id: string;
        name: string;
        description?: string | undefined;
        reason?: string | undefined;
    }[] | undefined;
}>;
/**
 * Action proposal response schema
 */
export declare const actionProposalResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    timestamp: z.ZodString;
} & {
    type: z.ZodLiteral<"action_proposal">;
    result: z.ZodObject<{
        context: z.ZodObject<{
            version: z.ZodLiteral<"1.0">;
            session_id: z.ZodString;
            new_task: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            architectural_features: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            continue: z.ZodOptional<z.ZodBoolean>;
            tasks: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                type: z.ZodEnum<["analyze", "refactor", "test", "document", "fix", "create", "delete"]>;
                status: z.ZodEnum<["pending", "in_progress", "completed", "failed", "cancelled"]>;
                target: z.ZodOptional<z.ZodString>;
                progress: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
                type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
                id: string;
                progress?: number | undefined;
                target?: string | undefined;
            }, {
                status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
                type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
                id: string;
                progress?: number | undefined;
                target?: string | undefined;
            }>, "many">>;
            request_files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            confirm: z.ZodOptional<z.ZodBoolean>;
            errors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                code: z.ZodString;
                message: z.ZodString;
                file: z.ZodOptional<z.ZodString>;
                line: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                code: string;
                message: string;
                file?: string | undefined;
                line?: number | undefined;
            }, {
                code: string;
                message: string;
                file?: string | undefined;
                line?: number | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            version: "1.0";
            session_id: string;
            new_task?: string[] | undefined;
            architectural_features?: string[] | undefined;
            continue?: boolean | undefined;
            tasks?: {
                status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
                type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
                id: string;
                progress?: number | undefined;
                target?: string | undefined;
            }[] | undefined;
            request_files?: string[] | undefined;
            confirm?: boolean | undefined;
            errors?: {
                code: string;
                message: string;
                file?: string | undefined;
                line?: number | undefined;
            }[] | undefined;
        }, {
            version: "1.0";
            session_id: string;
            new_task?: string[] | undefined;
            architectural_features?: string[] | undefined;
            continue?: boolean | undefined;
            tasks?: {
                status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
                type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
                id: string;
                progress?: number | undefined;
                target?: string | undefined;
            }[] | undefined;
            request_files?: string[] | undefined;
            confirm?: boolean | undefined;
            errors?: {
                code: string;
                message: string;
                file?: string | undefined;
                line?: number | undefined;
            }[] | undefined;
        }>;
        proposedActions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            priority: z.ZodOptional<z.ZodNumber>;
            dsl: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            dslScript: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }, {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }>, "many">>;
        fallbackActions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            reason: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            description?: string | undefined;
            reason?: string | undefined;
        }, {
            id: string;
            name: string;
            description?: string | undefined;
            reason?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        context: {
            version: "1.0";
            session_id: string;
            new_task?: string[] | undefined;
            architectural_features?: string[] | undefined;
            continue?: boolean | undefined;
            tasks?: {
                status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
                type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
                id: string;
                progress?: number | undefined;
                target?: string | undefined;
            }[] | undefined;
            request_files?: string[] | undefined;
            confirm?: boolean | undefined;
            errors?: {
                code: string;
                message: string;
                file?: string | undefined;
                line?: number | undefined;
            }[] | undefined;
        };
        proposedActions?: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }[] | undefined;
        fallbackActions?: {
            id: string;
            name: string;
            description?: string | undefined;
            reason?: string | undefined;
        }[] | undefined;
    }, {
        context: {
            version: "1.0";
            session_id: string;
            new_task?: string[] | undefined;
            architectural_features?: string[] | undefined;
            continue?: boolean | undefined;
            tasks?: {
                status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
                type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
                id: string;
                progress?: number | undefined;
                target?: string | undefined;
            }[] | undefined;
            request_files?: string[] | undefined;
            confirm?: boolean | undefined;
            errors?: {
                code: string;
                message: string;
                file?: string | undefined;
                line?: number | undefined;
            }[] | undefined;
        };
        proposedActions?: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }[] | undefined;
        fallbackActions?: {
            id: string;
            name: string;
            description?: string | undefined;
            reason?: string | undefined;
        }[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    timestamp: string;
    type: "action_proposal";
    result: {
        context: {
            version: "1.0";
            session_id: string;
            new_task?: string[] | undefined;
            architectural_features?: string[] | undefined;
            continue?: boolean | undefined;
            tasks?: {
                status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
                type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
                id: string;
                progress?: number | undefined;
                target?: string | undefined;
            }[] | undefined;
            request_files?: string[] | undefined;
            confirm?: boolean | undefined;
            errors?: {
                code: string;
                message: string;
                file?: string | undefined;
                line?: number | undefined;
            }[] | undefined;
        };
        proposedActions?: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }[] | undefined;
        fallbackActions?: {
            id: string;
            name: string;
            description?: string | undefined;
            reason?: string | undefined;
        }[] | undefined;
    };
}, {
    success: boolean;
    timestamp: string;
    type: "action_proposal";
    result: {
        context: {
            version: "1.0";
            session_id: string;
            new_task?: string[] | undefined;
            architectural_features?: string[] | undefined;
            continue?: boolean | undefined;
            tasks?: {
                status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
                type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
                id: string;
                progress?: number | undefined;
                target?: string | undefined;
            }[] | undefined;
            request_files?: string[] | undefined;
            confirm?: boolean | undefined;
            errors?: {
                code: string;
                message: string;
                file?: string | undefined;
                line?: number | undefined;
            }[] | undefined;
        };
        proposedActions?: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }[] | undefined;
        fallbackActions?: {
            id: string;
            name: string;
            description?: string | undefined;
            reason?: string | undefined;
        }[] | undefined;
    };
}>;
/**
 * Next step schema
 */
export declare const nextStepSchema: z.ZodObject<{
    actionId: z.ZodString;
    title: z.ZodString;
}, "strip", z.ZodTypeAny, {
    actionId: string;
    title: string;
}, {
    actionId: string;
    title: string;
}>;
/**
 * Action executing result schema
 */
export declare const actionExecutingResultSchema: z.ZodObject<{
    executingAction: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        priority: z.ZodOptional<z.ZodNumber>;
        dsl: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        dslScript: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        description?: string | undefined;
        priority?: number | undefined;
        dsl?: Record<string, unknown> | undefined;
        dslScript?: string | undefined;
    }, {
        id: string;
        name: string;
        description?: string | undefined;
        priority?: number | undefined;
        dsl?: Record<string, unknown> | undefined;
        dslScript?: string | undefined;
    }>;
    nextSteps: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        priority: z.ZodOptional<z.ZodNumber>;
        dsl: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        dslScript: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        description?: string | undefined;
        priority?: number | undefined;
        dsl?: Record<string, unknown> | undefined;
        dslScript?: string | undefined;
    }, {
        id: string;
        name: string;
        description?: string | undefined;
        priority?: number | undefined;
        dsl?: Record<string, unknown> | undefined;
        dslScript?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    executingAction: {
        id: string;
        name: string;
        description?: string | undefined;
        priority?: number | undefined;
        dsl?: Record<string, unknown> | undefined;
        dslScript?: string | undefined;
    };
    nextSteps: {
        id: string;
        name: string;
        description?: string | undefined;
        priority?: number | undefined;
        dsl?: Record<string, unknown> | undefined;
        dslScript?: string | undefined;
    }[];
}, {
    executingAction: {
        id: string;
        name: string;
        description?: string | undefined;
        priority?: number | undefined;
        dsl?: Record<string, unknown> | undefined;
        dslScript?: string | undefined;
    };
    nextSteps: {
        id: string;
        name: string;
        description?: string | undefined;
        priority?: number | undefined;
        dsl?: Record<string, unknown> | undefined;
        dslScript?: string | undefined;
    }[];
}>;
/**
 * Action executing response schema
 */
export declare const actionExecutingResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    timestamp: z.ZodString;
} & {
    type: z.ZodLiteral<"action_executing">;
    result: z.ZodObject<{
        executingAction: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            priority: z.ZodOptional<z.ZodNumber>;
            dsl: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            dslScript: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }, {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }>;
        nextSteps: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            priority: z.ZodOptional<z.ZodNumber>;
            dsl: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            dslScript: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }, {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        executingAction: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        };
        nextSteps: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }[];
    }, {
        executingAction: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        };
        nextSteps: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }[];
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    timestamp: string;
    type: "action_executing";
    result: {
        executingAction: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        };
        nextSteps: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }[];
    };
}, {
    success: boolean;
    timestamp: string;
    type: "action_executing";
    result: {
        executingAction: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        };
        nextSteps: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }[];
    };
}>;
/**
 * Current step schema
 */
export declare const currentStepSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
    progress: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    progress: number;
    id: string;
    title: string;
    code?: string | undefined;
}, {
    progress: number;
    id: string;
    title: string;
    code?: string | undefined;
}>;
/**
 * Action progress result schema
 */
export declare const actionProgressResultSchema: z.ZodObject<{
    actionId: z.ZodString;
    currentStep: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        code: z.ZodOptional<z.ZodString>;
        progress: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        progress: number;
        id: string;
        title: string;
        code?: string | undefined;
    }, {
        progress: number;
        id: string;
        title: string;
        code?: string | undefined;
    }>;
    completedSteps: z.ZodArray<z.ZodString, "many">;
    remainingSteps: z.ZodArray<z.ZodString, "many">;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    actionId: string;
    currentStep: {
        progress: number;
        id: string;
        title: string;
        code?: string | undefined;
    };
    completedSteps: string[];
    remainingSteps: string[];
    message?: string | undefined;
}, {
    actionId: string;
    currentStep: {
        progress: number;
        id: string;
        title: string;
        code?: string | undefined;
    };
    completedSteps: string[];
    remainingSteps: string[];
    message?: string | undefined;
}>;
/**
 * Action progress response schema
 */
export declare const actionProgressResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    timestamp: z.ZodString;
} & {
    type: z.ZodLiteral<"action_progress">;
    result: z.ZodObject<{
        actionId: z.ZodString;
        currentStep: z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            code: z.ZodOptional<z.ZodString>;
            progress: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            progress: number;
            id: string;
            title: string;
            code?: string | undefined;
        }, {
            progress: number;
            id: string;
            title: string;
            code?: string | undefined;
        }>;
        completedSteps: z.ZodArray<z.ZodString, "many">;
        remainingSteps: z.ZodArray<z.ZodString, "many">;
        message: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        actionId: string;
        currentStep: {
            progress: number;
            id: string;
            title: string;
            code?: string | undefined;
        };
        completedSteps: string[];
        remainingSteps: string[];
        message?: string | undefined;
    }, {
        actionId: string;
        currentStep: {
            progress: number;
            id: string;
            title: string;
            code?: string | undefined;
        };
        completedSteps: string[];
        remainingSteps: string[];
        message?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    timestamp: string;
    type: "action_progress";
    result: {
        actionId: string;
        currentStep: {
            progress: number;
            id: string;
            title: string;
            code?: string | undefined;
        };
        completedSteps: string[];
        remainingSteps: string[];
        message?: string | undefined;
    };
}, {
    success: boolean;
    timestamp: string;
    type: "action_progress";
    result: {
        actionId: string;
        currentStep: {
            progress: number;
            id: string;
            title: string;
            code?: string | undefined;
        };
        completedSteps: string[];
        remainingSteps: string[];
        message?: string | undefined;
    };
}>;
/**
 * Action completed result schema
 */
export declare const actionCompletedResultSchema: z.ZodObject<{
    actionId: z.ZodString;
    summary: z.ZodString;
    output: z.ZodOptional<z.ZodUnknown>;
    filesModified: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    executionTimeMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    actionId: string;
    summary: string;
    output?: unknown;
    filesModified?: string[] | undefined;
    executionTimeMs?: number | undefined;
}, {
    actionId: string;
    summary: string;
    output?: unknown;
    filesModified?: string[] | undefined;
    executionTimeMs?: number | undefined;
}>;
/**
 * Action completed response schema
 */
export declare const actionCompletedResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    timestamp: z.ZodString;
} & {
    type: z.ZodLiteral<"action_completed">;
    result: z.ZodObject<{
        actionId: z.ZodString;
        summary: z.ZodString;
        output: z.ZodOptional<z.ZodUnknown>;
        filesModified: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        executionTimeMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        actionId: string;
        summary: string;
        output?: unknown;
        filesModified?: string[] | undefined;
        executionTimeMs?: number | undefined;
    }, {
        actionId: string;
        summary: string;
        output?: unknown;
        filesModified?: string[] | undefined;
        executionTimeMs?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    timestamp: string;
    type: "action_completed";
    result: {
        actionId: string;
        summary: string;
        output?: unknown;
        filesModified?: string[] | undefined;
        executionTimeMs?: number | undefined;
    };
}, {
    success: boolean;
    timestamp: string;
    type: "action_completed";
    result: {
        actionId: string;
        summary: string;
        output?: unknown;
        filesModified?: string[] | undefined;
        executionTimeMs?: number | undefined;
    };
}>;
/**
 * Action error schema
 */
export declare const actionErrorSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    stack: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code: string;
    message: string;
    details?: Record<string, unknown> | undefined;
    stack?: string | undefined;
}, {
    code: string;
    message: string;
    details?: Record<string, unknown> | undefined;
    stack?: string | undefined;
}>;
/**
 * Action error result schema
 */
export declare const actionErrorResultSchema: z.ZodObject<{
    actionId: z.ZodString;
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        stack: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        details?: Record<string, unknown> | undefined;
        stack?: string | undefined;
    }, {
        code: string;
        message: string;
        details?: Record<string, unknown> | undefined;
        stack?: string | undefined;
    }>;
    failedStep: z.ZodOptional<z.ZodString>;
    canRetry: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    actionId: string;
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown> | undefined;
        stack?: string | undefined;
    };
    canRetry: boolean;
    failedStep?: string | undefined;
}, {
    actionId: string;
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown> | undefined;
        stack?: string | undefined;
    };
    canRetry: boolean;
    failedStep?: string | undefined;
}>;
/**
 * Action error response schema
 */
export declare const actionErrorResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    timestamp: z.ZodString;
} & {
    type: z.ZodLiteral<"action_error">;
    result: z.ZodObject<{
        actionId: z.ZodString;
        error: z.ZodObject<{
            code: z.ZodString;
            message: z.ZodString;
            details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            stack: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            code: string;
            message: string;
            details?: Record<string, unknown> | undefined;
            stack?: string | undefined;
        }, {
            code: string;
            message: string;
            details?: Record<string, unknown> | undefined;
            stack?: string | undefined;
        }>;
        failedStep: z.ZodOptional<z.ZodString>;
        canRetry: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        actionId: string;
        error: {
            code: string;
            message: string;
            details?: Record<string, unknown> | undefined;
            stack?: string | undefined;
        };
        canRetry: boolean;
        failedStep?: string | undefined;
    }, {
        actionId: string;
        error: {
            code: string;
            message: string;
            details?: Record<string, unknown> | undefined;
            stack?: string | undefined;
        };
        canRetry: boolean;
        failedStep?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    timestamp: string;
    type: "action_error";
    result: {
        actionId: string;
        error: {
            code: string;
            message: string;
            details?: Record<string, unknown> | undefined;
            stack?: string | undefined;
        };
        canRetry: boolean;
        failedStep?: string | undefined;
    };
}, {
    success: boolean;
    timestamp: string;
    type: "action_error";
    result: {
        actionId: string;
        error: {
            code: string;
            message: string;
            details?: Record<string, unknown> | undefined;
            stack?: string | undefined;
        };
        canRetry: boolean;
        failedStep?: string | undefined;
    };
}>;
/**
 * Unified response schema - union of all response types
 */
export declare const unifiedResponseSchema: z.ZodUnion<[z.ZodObject<{
    success: z.ZodBoolean;
    timestamp: z.ZodString;
} & {
    type: z.ZodLiteral<"action_proposal">;
    result: z.ZodObject<{
        context: z.ZodObject<{
            version: z.ZodLiteral<"1.0">;
            session_id: z.ZodString;
            new_task: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            architectural_features: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            continue: z.ZodOptional<z.ZodBoolean>;
            tasks: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                type: z.ZodEnum<["analyze", "refactor", "test", "document", "fix", "create", "delete"]>;
                status: z.ZodEnum<["pending", "in_progress", "completed", "failed", "cancelled"]>;
                target: z.ZodOptional<z.ZodString>;
                progress: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
                type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
                id: string;
                progress?: number | undefined;
                target?: string | undefined;
            }, {
                status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
                type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
                id: string;
                progress?: number | undefined;
                target?: string | undefined;
            }>, "many">>;
            request_files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            confirm: z.ZodOptional<z.ZodBoolean>;
            errors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                code: z.ZodString;
                message: z.ZodString;
                file: z.ZodOptional<z.ZodString>;
                line: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                code: string;
                message: string;
                file?: string | undefined;
                line?: number | undefined;
            }, {
                code: string;
                message: string;
                file?: string | undefined;
                line?: number | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            version: "1.0";
            session_id: string;
            new_task?: string[] | undefined;
            architectural_features?: string[] | undefined;
            continue?: boolean | undefined;
            tasks?: {
                status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
                type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
                id: string;
                progress?: number | undefined;
                target?: string | undefined;
            }[] | undefined;
            request_files?: string[] | undefined;
            confirm?: boolean | undefined;
            errors?: {
                code: string;
                message: string;
                file?: string | undefined;
                line?: number | undefined;
            }[] | undefined;
        }, {
            version: "1.0";
            session_id: string;
            new_task?: string[] | undefined;
            architectural_features?: string[] | undefined;
            continue?: boolean | undefined;
            tasks?: {
                status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
                type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
                id: string;
                progress?: number | undefined;
                target?: string | undefined;
            }[] | undefined;
            request_files?: string[] | undefined;
            confirm?: boolean | undefined;
            errors?: {
                code: string;
                message: string;
                file?: string | undefined;
                line?: number | undefined;
            }[] | undefined;
        }>;
        proposedActions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            priority: z.ZodOptional<z.ZodNumber>;
            dsl: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            dslScript: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }, {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }>, "many">>;
        fallbackActions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            reason: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            description?: string | undefined;
            reason?: string | undefined;
        }, {
            id: string;
            name: string;
            description?: string | undefined;
            reason?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        context: {
            version: "1.0";
            session_id: string;
            new_task?: string[] | undefined;
            architectural_features?: string[] | undefined;
            continue?: boolean | undefined;
            tasks?: {
                status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
                type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
                id: string;
                progress?: number | undefined;
                target?: string | undefined;
            }[] | undefined;
            request_files?: string[] | undefined;
            confirm?: boolean | undefined;
            errors?: {
                code: string;
                message: string;
                file?: string | undefined;
                line?: number | undefined;
            }[] | undefined;
        };
        proposedActions?: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }[] | undefined;
        fallbackActions?: {
            id: string;
            name: string;
            description?: string | undefined;
            reason?: string | undefined;
        }[] | undefined;
    }, {
        context: {
            version: "1.0";
            session_id: string;
            new_task?: string[] | undefined;
            architectural_features?: string[] | undefined;
            continue?: boolean | undefined;
            tasks?: {
                status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
                type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
                id: string;
                progress?: number | undefined;
                target?: string | undefined;
            }[] | undefined;
            request_files?: string[] | undefined;
            confirm?: boolean | undefined;
            errors?: {
                code: string;
                message: string;
                file?: string | undefined;
                line?: number | undefined;
            }[] | undefined;
        };
        proposedActions?: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }[] | undefined;
        fallbackActions?: {
            id: string;
            name: string;
            description?: string | undefined;
            reason?: string | undefined;
        }[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    timestamp: string;
    type: "action_proposal";
    result: {
        context: {
            version: "1.0";
            session_id: string;
            new_task?: string[] | undefined;
            architectural_features?: string[] | undefined;
            continue?: boolean | undefined;
            tasks?: {
                status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
                type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
                id: string;
                progress?: number | undefined;
                target?: string | undefined;
            }[] | undefined;
            request_files?: string[] | undefined;
            confirm?: boolean | undefined;
            errors?: {
                code: string;
                message: string;
                file?: string | undefined;
                line?: number | undefined;
            }[] | undefined;
        };
        proposedActions?: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }[] | undefined;
        fallbackActions?: {
            id: string;
            name: string;
            description?: string | undefined;
            reason?: string | undefined;
        }[] | undefined;
    };
}, {
    success: boolean;
    timestamp: string;
    type: "action_proposal";
    result: {
        context: {
            version: "1.0";
            session_id: string;
            new_task?: string[] | undefined;
            architectural_features?: string[] | undefined;
            continue?: boolean | undefined;
            tasks?: {
                status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
                type: "analyze" | "refactor" | "test" | "document" | "fix" | "create" | "delete";
                id: string;
                progress?: number | undefined;
                target?: string | undefined;
            }[] | undefined;
            request_files?: string[] | undefined;
            confirm?: boolean | undefined;
            errors?: {
                code: string;
                message: string;
                file?: string | undefined;
                line?: number | undefined;
            }[] | undefined;
        };
        proposedActions?: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }[] | undefined;
        fallbackActions?: {
            id: string;
            name: string;
            description?: string | undefined;
            reason?: string | undefined;
        }[] | undefined;
    };
}>, z.ZodObject<{
    success: z.ZodBoolean;
    timestamp: z.ZodString;
} & {
    type: z.ZodLiteral<"action_executing">;
    result: z.ZodObject<{
        executingAction: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            priority: z.ZodOptional<z.ZodNumber>;
            dsl: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            dslScript: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }, {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }>;
        nextSteps: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            priority: z.ZodOptional<z.ZodNumber>;
            dsl: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            dslScript: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }, {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        executingAction: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        };
        nextSteps: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }[];
    }, {
        executingAction: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        };
        nextSteps: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }[];
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    timestamp: string;
    type: "action_executing";
    result: {
        executingAction: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        };
        nextSteps: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }[];
    };
}, {
    success: boolean;
    timestamp: string;
    type: "action_executing";
    result: {
        executingAction: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        };
        nextSteps: {
            id: string;
            name: string;
            description?: string | undefined;
            priority?: number | undefined;
            dsl?: Record<string, unknown> | undefined;
            dslScript?: string | undefined;
        }[];
    };
}>, z.ZodObject<{
    success: z.ZodBoolean;
    timestamp: z.ZodString;
} & {
    type: z.ZodLiteral<"action_progress">;
    result: z.ZodObject<{
        actionId: z.ZodString;
        currentStep: z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            code: z.ZodOptional<z.ZodString>;
            progress: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            progress: number;
            id: string;
            title: string;
            code?: string | undefined;
        }, {
            progress: number;
            id: string;
            title: string;
            code?: string | undefined;
        }>;
        completedSteps: z.ZodArray<z.ZodString, "many">;
        remainingSteps: z.ZodArray<z.ZodString, "many">;
        message: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        actionId: string;
        currentStep: {
            progress: number;
            id: string;
            title: string;
            code?: string | undefined;
        };
        completedSteps: string[];
        remainingSteps: string[];
        message?: string | undefined;
    }, {
        actionId: string;
        currentStep: {
            progress: number;
            id: string;
            title: string;
            code?: string | undefined;
        };
        completedSteps: string[];
        remainingSteps: string[];
        message?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    timestamp: string;
    type: "action_progress";
    result: {
        actionId: string;
        currentStep: {
            progress: number;
            id: string;
            title: string;
            code?: string | undefined;
        };
        completedSteps: string[];
        remainingSteps: string[];
        message?: string | undefined;
    };
}, {
    success: boolean;
    timestamp: string;
    type: "action_progress";
    result: {
        actionId: string;
        currentStep: {
            progress: number;
            id: string;
            title: string;
            code?: string | undefined;
        };
        completedSteps: string[];
        remainingSteps: string[];
        message?: string | undefined;
    };
}>, z.ZodObject<{
    success: z.ZodBoolean;
    timestamp: z.ZodString;
} & {
    type: z.ZodLiteral<"action_completed">;
    result: z.ZodObject<{
        actionId: z.ZodString;
        summary: z.ZodString;
        output: z.ZodOptional<z.ZodUnknown>;
        filesModified: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        executionTimeMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        actionId: string;
        summary: string;
        output?: unknown;
        filesModified?: string[] | undefined;
        executionTimeMs?: number | undefined;
    }, {
        actionId: string;
        summary: string;
        output?: unknown;
        filesModified?: string[] | undefined;
        executionTimeMs?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    timestamp: string;
    type: "action_completed";
    result: {
        actionId: string;
        summary: string;
        output?: unknown;
        filesModified?: string[] | undefined;
        executionTimeMs?: number | undefined;
    };
}, {
    success: boolean;
    timestamp: string;
    type: "action_completed";
    result: {
        actionId: string;
        summary: string;
        output?: unknown;
        filesModified?: string[] | undefined;
        executionTimeMs?: number | undefined;
    };
}>, z.ZodObject<{
    success: z.ZodBoolean;
    timestamp: z.ZodString;
} & {
    type: z.ZodLiteral<"action_error">;
    result: z.ZodObject<{
        actionId: z.ZodString;
        error: z.ZodObject<{
            code: z.ZodString;
            message: z.ZodString;
            details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            stack: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            code: string;
            message: string;
            details?: Record<string, unknown> | undefined;
            stack?: string | undefined;
        }, {
            code: string;
            message: string;
            details?: Record<string, unknown> | undefined;
            stack?: string | undefined;
        }>;
        failedStep: z.ZodOptional<z.ZodString>;
        canRetry: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        actionId: string;
        error: {
            code: string;
            message: string;
            details?: Record<string, unknown> | undefined;
            stack?: string | undefined;
        };
        canRetry: boolean;
        failedStep?: string | undefined;
    }, {
        actionId: string;
        error: {
            code: string;
            message: string;
            details?: Record<string, unknown> | undefined;
            stack?: string | undefined;
        };
        canRetry: boolean;
        failedStep?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    timestamp: string;
    type: "action_error";
    result: {
        actionId: string;
        error: {
            code: string;
            message: string;
            details?: Record<string, unknown> | undefined;
            stack?: string | undefined;
        };
        canRetry: boolean;
        failedStep?: string | undefined;
    };
}, {
    success: boolean;
    timestamp: string;
    type: "action_error";
    result: {
        actionId: string;
        error: {
            code: string;
            message: string;
            details?: Record<string, unknown> | undefined;
            stack?: string | undefined;
        };
        canRetry: boolean;
        failedStep?: string | undefined;
    };
}>]>;
/**
 * Validate raw JSON data against unified response schema
 * @param data - Raw JSON data to validate
 * @returns ValidationResult with validation status and parsed data
 */
export declare function validateResponse(data: unknown): ValidationResult;
/**
 * Validate and extract response type from data
 * @param data - Raw JSON data
 * @returns Response type if valid, undefined otherwise
 */
export declare function getResponseType(data: unknown): ResponseType | undefined;
/**
 * Check if data is a valid unified response
 * @param data - Data to check
 * @returns True if valid unified response
 */
export declare function isUnifiedResponse(data: unknown): boolean;
/**
 * Validate specific response type
 * @param data - Data to validate
 * @param type - Expected response type
 * @returns ValidationResult
 */
export declare function validateResponseType(data: unknown, type: ResponseType): ValidationResult;
//# sourceMappingURL=validator.d.ts.map