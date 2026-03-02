/** RBAC role check (stub). */

export type Role = 'admin' | 'user' | 'viewer';

export function hasRole(_userId: string, role: Role): boolean {
    return role === 'user';
}

export function hasPermission(_userId: string, _permission: string): boolean {
    return false;
}

