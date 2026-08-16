import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth';
import { searchCustomers, updateCustomer } from '../controllers/customer.controller';

export default async function customerRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { q?: string; limit?: string } }>(
    '/api/customers',
    { preHandler: requireAuth },
    searchCustomers,
  );
  app.patch<{
    Params: { id: string };
    Body: { name?: string; phone?: string; address?: string };
  }>('/api/customers/:id', { preHandler: requireAuth }, updateCustomer);
}
