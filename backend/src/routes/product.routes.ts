import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth';
import {
  createProduct,
  searchProducts,
  listPinnedProducts,
  updateProduct,
} from '../controllers/product.controller';

export default async function productRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { q?: string; limit?: string; category_id?: string } }>(
    '/api/products',
    { preHandler: requireAuth },
    searchProducts,
  );
  app.get('/api/products/pinned', { preHandler: requireAuth }, listPinnedProducts);
  app.patch<{ Params: { id: string }; Body: { is_pinned?: boolean } }>(
    '/api/products/:id',
    { preHandler: requireAuth },
    updateProduct,
  );
  app.post<{ Body: { name?: string; price?: number | string; category_id?: string } }>(
    '/api/products',
    { preHandler: requireAuth },
    createProduct,
  );
}
