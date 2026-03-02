import {Request, Response, NextFunction} from 'express';
import {AnyZodObject, ZodError} from 'zod';
import {validationError} from '../errors/http-errors.js';

/**
 * Validation Middleware
 * Validates request body, params, and query using Zod schemas
 */

/**
 * Validate request with Zod schema
 */
export function validate(schema: AnyZodObject) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await schema.parseAsync({
                body: req.body,
                params: req.params,
                query: req.query,
            });

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                // Convert Zod errors to AppError
                const firstError = error.errors[0];
                next(validationError(
                    firstError.path.join('.'),
                    firstError.message
                ));
            } else {
                next(error);
            }
        }
    };
}

/**
 * Validate body only
 */
export function validateBody(schema: AnyZodObject) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            req.body = await schema.parseAsync(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const firstError = error.errors[0];
                next(validationError(
                    firstError.path.join('.'),
                    firstError.message
                ));
            } else {
                next(error);
            }
        }
    };
}

/**
 * Validate params only
 */
export function validateParams(schema: AnyZodObject) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            req.params = await schema.parseAsync(req.params);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const firstError = error.errors[0];
                next(validationError(
                    firstError.path.join('.'),
                    firstError.message
                ));
            } else {
                next(error);
            }
        }
    };
}

/**
 * Validate query only
 */
export function validateQuery(schema: AnyZodObject) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            req.query = await schema.parseAsync(req.query);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const firstError = error.errors[0];
                next(validationError(
                    firstError.path.join('.'),
                    firstError.message
                ));
            } else {
                next(error);
            }
        }
    };
}

/**
 * Sanitize input - remove extra fields
 */
export function sanitize(allowedFields: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (req.body && typeof req.body === 'object') {
            const sanitized: Record<string, unknown> = {};
            for (const field of allowedFields) {
                if (field in req.body) {
                    sanitized[field] = req.body[field];
                }
            }
            req.body = sanitized;
        }

        next();
    };
}
