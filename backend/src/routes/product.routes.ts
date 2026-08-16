import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth';
import { createProduct, searchProducts } from '../controllers/product.controller';

export default async function productRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { q?: string; limit?: string; category_id?: string } }>(
    '/api/products',
    { preHandler: requireAuth },
    searchProducts,
  );
  app.post<{ Body: { name?: string; price?: number | string; category_id?: string } }>(
    '/api/products',
    { preHandler: requireAuth },
    createProduct,
  );
}
