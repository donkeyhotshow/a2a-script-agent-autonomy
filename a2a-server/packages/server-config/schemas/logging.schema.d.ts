/**
 * Logging Configuration Schema
 */
import { z } from 'zod';
export declare const loggingConfigSchema: z.ZodObject<{
    logLevel: z.ZodDefault<z.ZodEnum<["error", "warn", "info", "debug"]>>;
    logFormat: z.ZodDefault<z.ZodEnum<["json", "pretty", "text"]>>;
}, "strip", z.ZodTypeAny, {
    logLevel: "info" | "error" | "warn" | "debug";
    logFormat: "json" | "pretty" | "text";
}, {
    logLevel?: "info" | "error" | "warn" | "debug" | undefined;
    logFormat?: "json" | "pretty" | "text" | undefined;
}>;
export type LoggingConfig = z.infer<typeof loggingConfigSchema>;
//# sourceMappingURL=logging.schema.d.ts.map