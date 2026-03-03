/**
 * Transform Pipeline Runtime Types
 *
 * Types for the transform DSL defined in server-transform.schema.json
 */
/**
 * Transform error with context
 */
export class TransformError extends Error {
    constructor(message, step, context) {
        super(message);
        this.step = step;
        this.context = context;
        this.name = 'TransformError';
    }
}
