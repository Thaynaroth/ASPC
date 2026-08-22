import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../controllers/category.controller';

export default async function categoryRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: { q?: string; page?: string; limit?: string; sort?: string; order?: string };
  }>('/api/categories', { preHandler: requireAuth }, listCategories);
  app.post<{ Body: { name?: string; description?: string } }>(
    '/api/categories',
    { preHandler: requireAuth },
    createCategory,
  );
  app.put<{ Params: { id: string }; Body: { name?: string; description?: string } }>(
    '/api/categories/:id',
    { preHandler: requireAuth },
    updateCategory,
  );
  app.delete<{ Params: { id: string } }>(
    '/api/categories/:id',
    { preHandler: requireAuth },
    deleteCategory,
  );
}
