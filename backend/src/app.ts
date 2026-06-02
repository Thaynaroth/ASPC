import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import jwt from '@fastify/jwt';

const app = Fastify({ logger: true });

await app.register(cors, {
  credentials: true,
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
});
await app.register(cookie);
await app.register(formbody);
await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'change-me-in-production',
  cookie: {
    cookieName: 'token',
    signed: false,
  },
});

export default app;
