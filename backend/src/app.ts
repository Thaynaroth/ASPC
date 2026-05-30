import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';

const app = Fastify({ logger: true });

await app.register(cors, {
  credentials: true,
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
});
await app.register(cookie);
await app.register(formbody);

export default app;
