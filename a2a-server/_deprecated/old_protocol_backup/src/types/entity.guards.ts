/**
 * Type guards for entity-like objects (Prisma models / API DTOs).
 *
 * Note: isRequestLike function moved to validators.ts to avoid duplication
 */

export function hasId(x: unknown): x is { id: string } {
  return (
    typeof x === "object" &&
    x !== null &&
    "id" in x &&
    typeof (x as { id: unknown }).id === "string"
  );
}

export function isSessionLike(
  x: unknown,
): x is { id: string; projectId: string } {
  return (
    hasId(x) && typeof (x as { projectId?: unknown }).projectId === "string"
  );
}

export function isTaskLike(x: unknown): x is { id: string; sessionId: string } {
  return (
    hasId(x) && typeof (x as { sessionId?: unknown }).sessionId === "string"
  );
}

export function isMessageLike(
  x: unknown,
): x is { id: string; sessionId: string; direction: string } {
  return (
    hasId(x) &&
    typeof (x as { sessionId?: unknown }).sessionId === "string" &&
    typeof (
      x as {
        direction?: unknown;
      }
    ).direction === "string"
  );
}
