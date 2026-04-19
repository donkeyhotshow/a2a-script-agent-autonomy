/**
 * Logging Configuration Schema
 */
import { z } from 'zod';
export declare const loggingConfigSchema: z.ZodObject<{
    logLevel: z.ZodDefault<z.ZodEnum<["error", "warn", "info", "debug"]>>;
    logFormat: z.ZodDefault<z.ZodEnum<["json", "pretty", "text"]>>;
}, "strip", z.ZodTypeAny, {
    logLevel: "error" | "info" | "debug" | "warn";
    logFormat: "json" | "text" | "pretty";
}, {
    logLevel?: "error" | "info" | "debug" | "warn" | undefined;
    logFormat?: "json" | "text" | "pretty" | undefined;
}>;
export type LoggingConfig = z.infer<typeof loggingConfigSchema>;
//# sourceMappingURL=logging.schema.d.ts.map