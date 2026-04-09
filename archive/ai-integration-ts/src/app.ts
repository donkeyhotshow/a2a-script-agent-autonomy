import Fastify, { type FastifyInstance } from 'fastify';
import { registerRoutes } from './routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  await registerRoutes(app);
  return app;
}
