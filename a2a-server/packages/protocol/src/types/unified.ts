/**
 * Unified JSON types — stub.
 * Canonical types are defined in index.ts; this file exists for import compatibility.
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;
