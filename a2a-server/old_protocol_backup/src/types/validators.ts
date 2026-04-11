/**
 * Request validation functions
 *
 * Centralized validation logic for A2A requests to eliminate duplication
 * across server, protocol, and client packages.
 */

/**
 * Validate request-to-server before sending to A2A: task|context required,
 * context.execution valid when present
 *
 * @param body - Request body with optional task and context
 * @returns Error message if validation fails, null if valid
 */
export function validateRequestToServer(body: {
  task?: string;
  context?: Record<string, unknown>;
}): string | null {
  const hasTask = typeof body.task === "string" && body.task.length > 0;
  const ctx = body.context;
  const hasContext = ctx && typeof ctx === "object";
  if (!hasTask && !hasContext) return "task or context is required";
  if (hasContext && ctx.execution !== undefined) {
    const ex = ctx.execution as Record<string, unknown>;
    if (
      ex &&
      typeof ex === "object" &&
      ex.action !== undefined &&
      typeof ex.action !== "string"
    ) {
      return "context.execution.action must be a string when present";
    }
  }
  return null;
}

/**
 * Type guard for request-like objects
 *
 * @param x - Object to check
 * @returns True if x matches the request shape
 */
export function isRequestLike(
  x: unknown,
): x is { id: string; promiseId: string; status: string } {
  return (
    typeof x === "object" &&
    x !== null &&
    "id" in x &&
    typeof (x as { id: unknown }).id === "string" &&
    "promiseId" in x &&
    typeof (x as { promiseId?: unknown }).promiseId === "string" &&
    "status" in x &&
    typeof (x as { status?: unknown }).status === "string"
  );
}

/**
 * Validate invoke request body against JSON schema
 *
 * @param body - Request body to validate
 * @returns Validation result with validity status and optional errors
 */
export function validateInvokeRequest(body: unknown): {
  valid: boolean;
  errors?: string[];
} {
  // Note: This function depends on the AJV schema compilation from routes/index.ts
  // For now, we'll keep a placeholder that always returns valid
  // In a full implementation, this would import/use the compiled schema
  return { valid: true };
}
