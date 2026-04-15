/**
 * A2A Server daemon — background queue processing (timer-driven).
 * Facade over `request-processor.service` for a clear entrypoint in `src/index.ts`.
 */
import { logger } from "@a2a/server-utils/logger";

export function startRequestProcessor(_intervalMs?: number): void {
  logger.warn(
    "[server-daemon] startRequestProcessor is not wired in this package build",
  );
}

export function stopRequestProcessor(): void {
  logger.warn("[server-daemon] stopRequestProcessor is not wired in this package build");
}

export async function processOneRequest(): Promise<void> {
  logger.warn(
    "[server-daemon] processOneRequest is not wired in this package build",
  );
}
