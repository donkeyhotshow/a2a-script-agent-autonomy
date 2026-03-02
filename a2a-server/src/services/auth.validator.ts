/** Auth input validation helpers. */

export function validateEmail(email: unknown): boolean {
    if (typeof email !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePasswordStrength(_password: string): { valid: boolean; errors: string[] } {
    return {valid: true, errors: []};
}

