/**
 * OpenTelemetry Tracing — Gray Room pipeline instrumentation.
 *
 * Usage:
 *   import { traceStep } from '../utils/telemetry.js';
 *
 *   const result = await traceStep('thinking', sessionId, () => callLLM(...));
 *
 * Set OTLP_ENDPOINT env var to point at your collector (e.g. Jaeger all-in-one).
 * When the env var is absent, a no-op tracer is used — zero overhead, zero deps.
 */

import { logger } from './logger.js';

// ---------------------------------------------------------------------------
// Tracer abstraction — resolves to real OTLP or no-op at runtime
// ---------------------------------------------------------------------------

interface SpanLike {
    setStatus(status: { code: number; message?: string }): void;
    setAttribute(key: string, value: string | number | boolean): void;
    end(): void;
}

interface TracerLike {
    startSpan(name: string, options?: { attributes?: Record<string, string | number | boolean> }): SpanLike;
}

const SpanStatusCode = { OK: 1, ERROR: 2 } as const;

// ---------------------------------------------------------------------------
// No-op tracer (used when OTLP is not configured)
// ---------------------------------------------------------------------------

const noopSpan: SpanLike = {
    setStatus:    () => undefined,
    setAttribute: () => undefined,
    end:          () => undefined,
};

const noopTracer: TracerLike = {
    startSpan: () => noopSpan,
};

// ---------------------------------------------------------------------------
// Real OTLP tracer (loaded lazily so the server starts without optional deps)
// ---------------------------------------------------------------------------

let _tracer: TracerLike | null = null;

async function getTracer(): Promise<TracerLike> {
    if (_tracer) return _tracer;

    const endpoint = process.env['OTLP_ENDPOINT'];
    if (!endpoint) {
        _tracer = noopTracer;
        return _tracer;
    }

    try {
        const [{ NodeSDK }, { OTLPTraceExporter }, { trace }] = await Promise.all([
            import('@opentelemetry/sdk-node' as string),
            import('@opentelemetry/exporter-trace-otlp-http' as string),
            import('@opentelemetry/api' as string),
        ]) as [
            { NodeSDK: new (opts: unknown) => { start(): void } },
            { OTLPTraceExporter: new (opts: unknown) => unknown },
            { trace: { getTracer(name: string): TracerLike } },
        ];

        const sdk = new NodeSDK({
            traceExporter: new OTLPTraceExporter({ url: endpoint }),
            serviceName:   'a2a-server',
        });
        sdk.start();

        _tracer = trace.getTracer('gray-room');
        logger.info('[Telemetry] OpenTelemetry OTLP tracer initialised', { endpoint });
    } catch (err) {
        logger.warn('[Telemetry] OTLP packages not installed — falling back to no-op tracer', {
            error: err instanceof Error ? err.message : String(err),
        });
        _tracer = noopTracer;
    }

    return _tracer;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Wrap an async step inside an OpenTelemetry span.
 *
 * @param stepName   Human-readable step identifier (e.g. 'thinking', 'auto_rag_page').
 * @param sessionId  Session context attached to the span as an attribute.
 * @param fn         The async work to instrument.
 */
export async function traceStep<T>(
    stepName: string,
    sessionId: string,
    fn: () => Promise<T>,
): Promise<T> {
    const tracer = await getTracer();
    const span   = tracer.startSpan(`gray_room.${stepName}`, {
        attributes: {
            'session.id': sessionId,
            'step.name':  stepName,
        },
    });

    const start = Date.now();
    try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: msg });
        throw err;
    } finally {
        span.setAttribute('duration_ms', Date.now() - start);
        span.end();
    }
}
