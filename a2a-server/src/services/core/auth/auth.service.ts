/**
 * Auth Service
 * Handles auth logic: tokens, client repo, config.
 * Controllers → services only.
 */

import jwt from 'jsonwebtoken';
import {AppError} from '../../../types/errors.js';
import * as clientRepo from '../../../repositories/client.repository.js';
import {hashPassword, generateApiKey, verifyPassword} from '../../../utils/crypto.js';
import {config} from '../../../config/index.js';

type JwtPayload = { sub: string; email: string; type: 'access' | 'refresh' };

function signAccessToken(clientId: string, email: string): string {
    return jwt.sign(
        {sub: clientId, email, type: 'access'} as JwtPayload,
        config.jwtSecret,
        {expiresIn: config.jwtExpiresIn}
    );
}

function signRefreshToken(clientId: string, email: string): string {
    return jwt.sign(
        {sub: clientId, email, type: 'refresh'} as JwtPayload,
        config.jwtSecret,
        {expiresIn: config.jwtRefreshExpiresIn}
    );
}

function verifyToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
}

const DEV_CREDS = {email: 'dev@example.com', password: 'dev'};

export interface RegisterInput {
    name: string;
    email: string;
    password: string;
}

export interface RegisterResult {
    id: string;
    name: string;
    email: string;
    apiKey: string;
}

export async function register(input: RegisterInput): Promise<RegisterResult> {
    const {name, email, password} = input;
    if (!name || !email || !password) {
        throw new AppError('VALIDATION_001', 'name, email and password required', 400);
    }
    if (await clientRepo.emailExists(email)) {
        throw new AppError('AUTH_002', 'Email already registered', 409);
    }
    const passwordHash = await hashPassword(password);
    const apiKey = generateApiKey();
    const client = await clientRepo.createClient({name, email, passwordHash, apiKey});
    return {
        id: client.id,
        name: client.name,
        email: client.email,
        apiKey,
    };
}

export interface TokenResult {
    accessToken: string;
    refreshToken: string;
}

export async function getTokenByApiKey(apiKey: string): Promise<TokenResult | null> {
    const client = await clientRepo.findClientByApiKey(apiKey);
    if (!client) return null;
    return {
        accessToken: signAccessToken(client.id, client.email),
        refreshToken: signRefreshToken(client.id, client.email),
    };
}

export async function getTokenByCredentials(email: string, password: string): Promise<TokenResult | null> {
    if (process.env.NODE_ENV === 'development' && email === DEV_CREDS.email && password === DEV_CREDS.password) {
        return {
            accessToken: signAccessToken('dev-client', DEV_CREDS.email),
            refreshToken: signRefreshToken('dev-client', DEV_CREDS.email),
        };
    }
    const client = await clientRepo.findClientByEmail(email);
    if (!client) return null;
    if (!(await verifyPassword(password, client.passwordHash))) return null;
    if (!client.isActive) throw new AppError('AUTH_001', 'Account inactive', 401);
    return {
        accessToken: signAccessToken(client.id, client.email),
        refreshToken: signRefreshToken(client.id, client.email),
    };
}

export async function refreshToken(token: string): Promise<TokenResult> {
    let payload: JwtPayload;
    try {
        payload = verifyToken(token);
    } catch {
        throw new AppError('AUTH_001', 'Invalid token', 401);
    }
    if (payload.type !== 'refresh') throw new AppError('AUTH_001', 'Invalid token', 401);
    const client = await clientRepo.findClientById(payload.sub);
    if (!client || !client.isActive) throw new AppError('AUTH_001', 'Client not found', 401);
    return {
        accessToken: signAccessToken(client.id, client.email),
        refreshToken: signRefreshToken(client.id, client.email),
    };
}

export interface ClientInfo {
    id: string;
    name: string;
    email: string;
}

export async function getClientById(id: string): Promise<ClientInfo | null> {
    const client = await clientRepo.findClientById(id);
    if (!client) return null;
    return {id: client.id, name: client.name, email: client.email};
}
