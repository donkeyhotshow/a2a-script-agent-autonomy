export function assertObject(value, name = "(value)") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`${name} must be a plain object`);
    }
}
export function assertString(value, name = "(value)") {
    if (typeof value !== "string") {
        throw new Error(`${name} must be a string`);
    }
}
export function asString(value) {
    return typeof value === "string" ? value : undefined;
}
//# sourceMappingURL=validation.js.map