import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth';
import {
  createProduct,
  deleteProduct,
  listProducts,
  searchProducts,
  listPinnedProducts,
  reorderPinned,
  updateProduct,
} from '../controllers/product.controller';

export default async function productRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { q?: string; limit?: string; category_id?: string } }>(
    '/api/products',
    { preHandler: requireAuth },
    searchProducts,
  );
  app.get<{
    Querystring: {
      q?: string;
      page?: string;
      limit?: string;
      sort?: string;
      order?: string;
      category_id?: string;
    };
  }>('/api/products/list', { preHandler: requireAuth }, listProducts);
  app.get('/api/products/pinned', { preHandler: requireAuth }, listPinnedProducts);
  app.patch<{ Body: { ids: string[] } }>(
    '/api/products/pinned/order',
    { preHandler: requireAuth },
    reorderPinned,
  );
  app.patch<{
    Params: { id: string };
    Body: {
      is_pinned?: boolean;
      name?: string;
      price?: number | string;
      sku?: string;
      stock_quantity?: number;
      category_id?: string | null;
      is_available?: boolean;
    };
  }>('/api/products/:id', { preHandler: requireAuth }, updateProduct);
  app.post<{
    Body: {
      name?: string;
      price?: number | string;
      category_id?: string;
      sku?: string;
      stock_quantity?: number;
    };
  }>('/api/products', { preHandler: requireAuth }, createProduct);
  app.delete<{ Params: { id: string } }>(
    '/api/products/:id',
    { preHandler: requireAuth },
    deleteProduct,
  );
}
