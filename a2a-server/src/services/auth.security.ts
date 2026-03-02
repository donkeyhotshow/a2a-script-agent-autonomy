/** Security helpers (hash, compare). */

export async function hashPassword(password: string): Promise<string> {
    const {createHash} = await import('crypto');
    return createHash('sha256').update(password).digest('hex');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const h = await hashPassword(password);
    return h === hash;
}

