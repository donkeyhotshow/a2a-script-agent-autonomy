import crypto from 'node:crypto';

const ALG = 'aes-256-gcm';
const IV_LEN = 16;
const AUTH_TAG_LEN = 16;

function getEncryptionKey(): Buffer {
    let key = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!key) {
        if (process.env.NODE_ENV === 'production' || process.env.A2A_REQUIRE_SECRETS === '1') {
            throw new Error('ENCRYPTION_KEY or JWT_SECRET must be set in production or when A2A_REQUIRE_SECRETS=1');
        }
        key = 'default-dev-key-32-chars-min!';
    }
    return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt sensitive data (e.g., SSH keys)
 */
export function encrypt(text: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALG, key, iv);
    const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string): string {
    const key = getEncryptionKey();
    const buf = Buffer.from(encryptedData, 'base64');
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
    const enc = buf.subarray(IV_LEN + AUTH_TAG_LEN);
    const decipher = crypto.createDecipheriv(ALG, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc) + decipher.final('utf8');
}

/**
 * Generate random string
 */
export function generateRandomString(length: number = 32): string {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

/**
 * Generate UUID v4
 */
export function generateUuid(): string {
    return crypto.randomUUID();
}

/**
 * Hash string with SHA-256
 */
export function hashSha256(text: string): string {
    return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Generate HMAC
 */
export function generateHmac(data: string, secret?: string): string {
    let key = secret || process.env.JWT_SECRET;
    if (!key) {
        if (process.env.NODE_ENV === 'production' || process.env.A2A_REQUIRE_SECRETS === '1') {
            throw new Error('JWT_SECRET must be set in production or when A2A_REQUIRE_SECRETS=1');
        }
        key = 'default-dev-key-32-chars-min!';
    }
    return crypto.createHmac('sha256', key).update(data, 'utf8').digest('hex');
}

/**
 * Verify HMAC
 */
export function verifyHmac(data: string, hmac: string, secret?: string): boolean {
    const expected = generateHmac(data, secret);
    return constantTimeCompare(expected, hmac);
}

/**
 * Generate API key
 */
export function generateApiKey(prefix: string = 'sk_a2a'): string {
    return `${prefix}_${generateRandomString(32)}`;
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    const {hash} = await import('bcrypt');
    return hash(password, 10);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const {compare} = await import('bcrypt');
    return compare(password, hash);
}

/**
 * Constant-time string comparison
 */
export function constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}
