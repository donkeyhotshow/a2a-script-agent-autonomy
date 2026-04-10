import { config } from './config.js';
import { buildApp } from './app.js';

const app = await buildApp();

await app.listen({ host: config.host, port: config.port });
