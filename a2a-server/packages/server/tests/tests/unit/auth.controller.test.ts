/**
 * Auth Controller Unit Tests
 */

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {Request, Response, NextFunction} from 'express';

// Mock dependencies
vi.mock('../../src/config/index', () => ({
    config: {
        jwtSecret: 'test-jwt-secret-min-32-characters-long-test',
        jwtExpiresIn: '1h',
        jwtRefreshExpiresIn: '7d',
    },
}));

vi.mock('../../src/repositories/client.repository', () => ({
    emailExists: vi.fn(),
    createClient: vi.fn(),
    findClientByEmail: vi.fn(),
    findClientByApiKey: vi.fn(),
    findClientById: vi.fn(),
}));

vi.mock('../../src/utils/crypto', () => ({
    hashPassword: vi.fn().mockResolvedValue('hashed_password'),
    verifyPassword: vi.fn().mockResolvedValue(true),
    generateApiKey: vi.fn().mockReturnValue('sk_test_123456'),
}));

vi.mock('../../src/utils/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

import * as clientRepo from '../../src/repositories/client.repository';

// Import after mocks
const {register, getToken, refreshToken, getCurrentClient} = await import('../../src/controllers/auth.controller');

describe('Auth Controller', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        vi.clearAllMocks();
        mockReq = {
            body: {},
            headers: {},
        };
        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
        mockNext = vi.fn();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('register', () => {
        it('should reject registration with missing fields', async () => {
            mockReq.body = {name: 'Test'};

            await register(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('required'),
                })
            );
        });

        it('should reject registration with duplicate email', async () => {
            mockReq.body = {name: 'Test', email: 'test@example.com', password: 'password123'};
            vi.mocked(clientRepo.emailExists).mockResolvedValue(true);

            await register(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('already registered'),
                })
            );
        });

        it('should successfully register a new client', async () => {
            mockReq.body = {name: 'Test User', email: 'test@example.com', password: 'password123'};
            vi.mocked(clientRepo.emailExists).mockResolvedValue(false);
            vi.mocked(clientRepo.createClient).mockResolvedValue({
                id: 'client-123',
                name: 'Test User',
                email: 'test@example.com',
                passwordHash: 'hashed',
                apiKey: 'sk_test_123',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            await register(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        id: 'client-123',
                        apiKey: 'sk_test_123456',
                    }),
                })
            );
        });
    });

    describe('getToken', () => {
        it('should reject missing credentials', async () => {
            mockReq.body = {};

            await getToken(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should reject dev credentials with wrong password', async () => {
            mockReq.body = {email: 'dev@example.com', password: 'wrong_password'};

            await getToken(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should reject inactive client', async () => {
            mockReq.body = {email: 'test@example.com', password: 'password123'};
            vi.mocked(clientRepo.findClientByEmail).mockResolvedValue({
                id: 'client-123',
                name: 'Test',
                email: 'test@example.com',
                passwordHash: 'hashed_password',
                apiKey: 'sk_test_123',
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            await getToken(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('inactive'),
                })
            );
        });
    });

    describe('refreshToken', () => {
        it('should reject missing refresh token', async () => {
            mockReq.body = {};

            await refreshToken(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('refreshToken'),
                })
            );
        });
    });

    describe('getCurrentClient', () => {
        it('should return 401 without authentication', async () => {
            mockReq.client = undefined;

            await getCurrentClient(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Authentication'),
                })
            );
        });
    });
});
