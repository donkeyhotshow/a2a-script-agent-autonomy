export function assertObject(value: unknown, name: string = "(value)"): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be a plain object`);
  }
}

export function assertString(value: unknown, name: string = "(value)"): asserts value is string {
  if (typeof value !== "string") {
    throw new Error(`${name} must be a string`);
  }
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
