/**
 * Client persistence — minimal surface for auth; tests mock this module.
 */

export interface ClientRecord {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    apiKey: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export async function emailExists(_email: string): Promise<boolean> {
    return false;
}

export async function createClient(_data: {
    name: string;
    email: string;
    passwordHash: string;
    apiKey: string;
}): Promise<ClientRecord> {
    throw new Error('client.repository.createClient not wired');
}

export async function findClientByEmail(_email: string): Promise<ClientRecord | null> {
    return null;
}

export async function findClientByApiKey(_key: string): Promise<ClientRecord | null> {
    return null;
}

export async function findClientById(_id: string): Promise<ClientRecord | null> {
    return null;
}
