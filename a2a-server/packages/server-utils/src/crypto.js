import crypto from "node:crypto";
const ALG = "aes-256-gcm";
const IV_LEN = 16;
const AUTH_TAG_LEN = 16;
function getEncryptionKey() {
    let key = process.env["ENCRYPTION_KEY"] || process.env["JWT_SECRET"];
    if (!key) {
        if (process.env["NODE_ENV"] === "production" || process.env["A2A_REQUIRE_SECRETS"] === "1") {
            throw new Error("ENCRYPTION_KEY or JWT_SECRET must be set in production or when A2A_REQUIRE_SECRETS=1");
        }
        key = "default-dev-key-32-chars-min!";
    }
    return crypto.createHash("sha256").update(key).digest();
}
export function encrypt(text) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALG, key, iv);
    const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString("base64");
}
export function decrypt(encryptedData) {
    const key = getEncryptionKey();
    const buf = Buffer.from(encryptedData, "base64");
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
    const enc = buf.subarray(IV_LEN + AUTH_TAG_LEN);
    const decipher = crypto.createDecipheriv(ALG, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc) + decipher.final("utf8");
}
export function generateRandomString(length = 32) {
    return crypto
        .randomBytes(Math.ceil(length / 2))
        .toString("hex")
        .slice(0, length);
}
export function generateUuid() {
    return crypto.randomUUID();
}
export function hashSha256(text) {
    return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}
export function generateHmac(data, secret) {
    let key = secret || process.env["JWT_SECRET"];
    if (!key) {
        if (process.env["NODE_ENV"] === "production" || process.env["A2A_REQUIRE_SECRETS"] === "1") {
            throw new Error("JWT_SECRET must be set in production or when A2A_REQUIRE_SECRETS=1");
        }
        key = "default-dev-key-32-chars-min!";
    }
    return crypto.createHmac("sha256", key).update(data, "utf8").digest("hex");
}
export function verifyHmac(data, hmac, secret) {
    const expected = generateHmac(data, secret);
    return constantTimeCompare(expected, hmac);
}
export function generateApiKey(prefix = "sk_a2a") {
    return `${prefix}_${generateRandomString(32)}`;
}
export async function hashPassword(password) {
    const { hash } = (await import("bcrypt"));
    return hash(password, 10);
}
export async function verifyPassword(password, hash) {
    const { compare } = (await import("bcrypt"));
    return compare(password, hash);
}
export function constantTimeCompare(a, b) {
    if (a.length !== b.length)
        return false;
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length)
        return false;
    return crypto.timingSafeEqual(bufA, bufB);
}
//# sourceMappingURL=crypto.js.map