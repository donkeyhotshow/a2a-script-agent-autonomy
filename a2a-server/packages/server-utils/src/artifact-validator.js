const REQUIRED_STRING_FIELDS = [
    "artifact_id",
    "artifact_type",
    "session_id",
    "turn_id",
    "schema_version",
    "summary",
];
const VALID_SEVERITIES = new Set(["info", "warning", "critical"]);
const SCHEMA_VERSION_RE = /^\d+\.\d+$/;
const ISO_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d/;
export function validateArtifact(artifact) {
    const errors = [];
    if (typeof artifact !== "object" || artifact === null) {
        return { valid: false, errors: ["(root) must be an object"] };
    }
    const a = artifact;
    for (const field of REQUIRED_STRING_FIELDS) {
        if (typeof a[field] !== "string" || a[field].length === 0) {
            errors.push(`${field} must be a non-empty string`);
        }
    }
    if (typeof a["created_at"] !== "string" || !ISO_DATE_RE.test(a["created_at"])) {
        errors.push("created_at must be an ISO 8601 date-time string");
    }
    if (typeof a["schema_version"] === "string" && !SCHEMA_VERSION_RE.test(a["schema_version"])) {
        errors.push('schema_version must match pattern N.N (e.g. "1.0")');
    }
    if (a["severity"] !== undefined && !VALID_SEVERITIES.has(a["severity"])) {
        errors.push(`severity must be one of: ${[...VALID_SEVERITIES].join(", ")}`);
    }
    if (a["consumed_by"] !== undefined) {
        if (!Array.isArray(a["consumed_by"])) {
            errors.push("consumed_by must be an array");
        }
        else {
            const cb = a["consumed_by"];
            for (let i = 0; i < cb.length; i++) {
                if (typeof cb[i] !== "string") {
                    errors.push(`consumed_by[${i}] must be a string`);
                }
            }
        }
    }
    if (a["data"] !== undefined &&
        (typeof a["data"] !== "object" || a["data"] === null || Array.isArray(a["data"]))) {
        errors.push("data must be an object");
    }
    return { valid: errors.length === 0, errors };
}
//# sourceMappingURL=artifact-validator.js.map