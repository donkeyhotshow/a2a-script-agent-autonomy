export declare function encrypt(text: string): string;
export declare function decrypt(encryptedData: string): string;
export declare function generateRandomString(length?: number): string;
export declare function generateUuid(): string;
export declare function hashSha256(text: string): string;
export declare function generateHmac(data: string, secret?: string): string;
export declare function verifyHmac(data: string, hmac: string, secret?: string): boolean;
export declare function generateApiKey(prefix?: string): string;
export declare function hashPassword(password: string): Promise<string>;
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
export declare function constantTimeCompare(a: string, b: string): boolean;
//# sourceMappingURL=crypto.d.ts.map