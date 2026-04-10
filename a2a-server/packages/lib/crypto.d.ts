/**
 * Encrypt sensitive data (e.g., SSH keys)
 */
export declare function encrypt(text: string): string;
/**
 * Decrypt sensitive data
 */
export declare function decrypt(encryptedData: string): string;
/**
 * Generate random string
 */
export declare function generateRandomString(length?: number): string;
/**
 * Generate UUID v4
 */
export declare function generateUuid(): string;
/**
 * Hash string with SHA-256
 */
export declare function hashSha256(text: string): string;
/**
 * Generate HMAC
 */
export declare function generateHmac(data: string, secret?: string): string;
/**
 * Verify HMAC
 */
export declare function verifyHmac(data: string, hmac: string, secret?: string): boolean;
/**
 * Generate API key
 */
export declare function generateApiKey(prefix?: string): string;
/**
 * Hash password with bcrypt
 */
export declare function hashPassword(password: string): Promise<string>;
/**
 * Verify password against hash
 */
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
/**
 * Constant-time string comparison
 */
export declare function constantTimeCompare(a: string, b: string): boolean;
//# sourceMappingURL=crypto.d.ts.map