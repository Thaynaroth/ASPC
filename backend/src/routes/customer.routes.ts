import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth';
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  searchCustomers,
  updateCustomer,
} from '../controllers/customer.controller';

export default async function customerRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { q?: string; limit?: string } }>(
    '/api/customers',
    { preHandler: requireAuth },
    searchCustomers,
  );
  app.get<{
    Querystring: { q?: string; page?: string; limit?: string; sort?: string; order?: string };
  }>('/api/customers/list', { preHandler: requireAuth }, listCustomers);
  app.post<{ Body: { name?: string; phone?: string; address?: string } }>(
    '/api/customers',
    { preHandler: requireAuth },
    createCustomer,
  );
  app.patch<{
    Params: { id: string };
    Body: { name?: string; phone?: string; address?: string };
  }>('/api/customers/:id', { preHandler: requireAuth }, updateCustomer);
  app.delete<{ Params: { id: string } }>(
    '/api/customers/:id',
    { preHandler: requireAuth },
    deleteCustomer,
  );
}
