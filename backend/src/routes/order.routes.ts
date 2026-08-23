import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth';
import {
  createOrder,
  getOrder,
  getPublicOrder,
  listOrders,
  markOrderPaid,
  updateOrderStatus,
} from '../controllers/order.controller';
import type {
  CreateOrderBody,
  ListOrdersQuery,
  PaymentMethodValue,
} from '../controllers/order.controller';

export default async function orderRoutes(app: FastifyInstance) {
  // Public, shareable order view — no authentication required.
  app.get<{ Params: { shopId: string; orderId: string } }>(
    '/api/public/orders/:shopId/:orderId',
    getPublicOrder,
  );
  app.get<{ Querystring: ListOrdersQuery }>('/api/orders', { preHandler: requireAuth }, listOrders);
  app.post<{ Body: CreateOrderBody }>('/api/orders', { preHandler: requireAuth }, createOrder);
  app.get<{ Params: { id: string } }>('/api/orders/:id', { preHandler: requireAuth }, getOrder);
  app.patch<{ Params: { id: string }; Body: { status?: string; cancel_reason?: string } }>(
    '/api/orders/:id/status',
    { preHandler: requireAuth },
    updateOrderStatus,
  );
  app.post<{ Params: { id: string }; Body: { payment_method?: PaymentMethodValue } }>(
    '/api/orders/:id/pay',
    { preHandler: requireAuth },
    markOrderPaid,
  );
}
