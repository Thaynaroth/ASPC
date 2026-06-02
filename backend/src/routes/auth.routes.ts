import { FastifyInstance } from 'fastify';
import { login, logout, me } from '../controllers/auth.controller';

export default async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/login', login);
  app.post('/api/auth/logout', logout);
  app.get('/api/auth/me', me);
}
