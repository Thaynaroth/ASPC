import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth';
import { getSettings, updateSettings } from '../controllers/settings.controller';

export default async function settingsRoutes(app: FastifyInstance) {
  app.get('/api/settings', { preHandler: requireAuth }, getSettings);
  app.put<{
    Body: {
      language?: string;
      theme?: string;
      notify_new_order?: boolean;
      notify_low_stock?: boolean;
      notify_payment_done?: boolean;
      currency?: string;
      exchange_rate?: number;
    };
  }>('/api/settings', { preHandler: requireAuth }, updateSettings);
}