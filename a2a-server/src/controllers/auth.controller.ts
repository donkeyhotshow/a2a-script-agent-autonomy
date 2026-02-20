import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/error.middleware.js';
import * as clientRepo from '../repositories/client.repository.js';
import { hashPassword, generateApiKey, verifyPassword } from '../utils/crypto.js';
import { config } from '../config/index.js';
import { loginInputSchema, refreshTokenInputSchema } from '../utils/validation.js';

type JwtPayload = { sub: string; email: string; type: 'access' | 'refresh' };

function signAccessToken(clientId: string, email: string): string {
  return jwt.sign(
    { sub: clientId, email, type: 'access' } as JwtPayload,
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function signRefreshToken(clientId: string, email: string): string {
  return jwt.sign(
    { sub: clientId, email, type: 'refresh' } as JwtPayload,
    config.jwtSecret,
    { expiresIn: config.jwtRefreshExpiresIn }
  );
}

function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}

/**
 * Auth Controller
 * Handles authentication-related operations
 */

// POST /api/v1/auth/register
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, email, password } = req.body as { name?: string; email?: string; password?: string };
    if (!name || !email || !password) {
      throw new AppError('VALIDATION_001', 'name, email and password required', 400);
    }

    if (await clientRepo.emailExists(email)) {
      throw new AppError('AUTH_002', 'Email already registered', 409);
    }

    const passwordHash = await hashPassword(password);
    const apiKey = generateApiKey();

    const client = await clientRepo.createClient({ name, email, passwordHash, apiKey });

    res.status(201).json({
      success: true,
      data: {
        id: client.id,
        name: client.name,
        email: client.email,
        apiKey,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Dev bypass: dev@example.com / dev works without DB (dev@localhost fails zod email)
const DEV_CREDS = { email: 'dev@example.com', password: 'dev' };

// POST /api/v1/auth/token
export async function getToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string | undefined;
    if (apiKey) {
      const client = await clientRepo.findClientByApiKey(apiKey);
      if (!client) throw new AppError('AUTH_001', 'Invalid API key', 401);
      const accessToken = signAccessToken(client.id, client.email);
      const refreshToken = signRefreshToken(client.id, client.email);
      res.json({ success: true, data: { accessToken, refreshToken } });
      return;
    }
    const body = req.body as { email?: string; password?: string };
    if (process.env.NODE_ENV === 'development' && body?.email === DEV_CREDS.email && body?.password === DEV_CREDS.password) {
      const accessToken = signAccessToken('dev-client', DEV_CREDS.email);
      const refreshToken = signRefreshToken('dev-client', DEV_CREDS.email);
      res.json({ success: true, data: { accessToken, refreshToken } });
      return;
    }
    const { email, password } = loginInputSchema.parse(req.body);
    const client = await clientRepo.findClientByEmail(email);
    if (!client) throw new AppError('AUTH_001', 'Invalid credentials', 401);
    if (!(await verifyPassword(password, client.passwordHash))) {
      throw new AppError('AUTH_001', 'Invalid credentials', 401);
    }
    if (!client.isActive) throw new AppError('AUTH_001', 'Account inactive', 401);
    const accessToken = signAccessToken(client.id, client.email);
    const refreshToken = signRefreshToken(client.id, client.email);
    res.json({ success: true, data: { accessToken, refreshToken } });
  } catch (error) {
    next(error);
  }
}

// POST /api/v1/auth/refresh
export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken: token } = refreshTokenInputSchema.parse(req.body);
    let payload: JwtPayload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new AppError('AUTH_001', 'Invalid token', 401);
    }
    if (payload.type !== 'refresh') throw new AppError('AUTH_001', 'Invalid token', 401);
    const client = await clientRepo.findClientById(payload.sub);
    if (!client || !client.isActive) throw new AppError('AUTH_001', 'Client not found', 401);
    const accessToken = signAccessToken(client.id, client.email);
    const newRefreshToken = signRefreshToken(client.id, client.email);
    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch (error) {
    next(error);
  }
}

// GET /api/v1/auth/me
export async function getCurrentClient(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.client) throw new AppError('AUTH_001', 'Authentication required', 401);

    const client = await clientRepo.findClientById(req.client.id);
    if (!client) throw new AppError('AUTH_001', 'Client not found', 401);

    res.json({
      success: true,
      data: {
        id: client.id,
        name: client.name,
        email: client.email,
      },
    });
  } catch (error) {
    next(error);
  }
}
