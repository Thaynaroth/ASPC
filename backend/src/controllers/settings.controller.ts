import { FastifyReply, FastifyRequest } from 'fastify';
import prisma from '../utils/prisma';
import { getShopForUser } from '../utils/shop';

const LANGS = ['km', 'en'] as const;
const THEMES = ['light', 'dark'] as const;
const CURRENCIES = ['KHR', 'USD'] as const;

export async function getSettings(request: FastifyRequest, reply: FastifyReply) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const prefs = await prisma.user_preferences.upsert({
    where: { user_id: request.user.sub },
    update: {},
    create: { user_id: request.user.sub },
  });

  return {
    language: prefs.language,
    theme: prefs.theme,
    notify_new_order: prefs.notify_new_order,
    notify_low_stock: prefs.notify_low_stock,
    notify_payment_done: prefs.notify_payment_done,
    currency: shop.currency,
    exchange_rate: shop.exchange_rate.toString(),
  };
}

export async function updateSettings(
  request: FastifyRequest<{
    Body: {
      language?: string;
      theme?: string;
      notify_new_order?: boolean;
      notify_low_stock?: boolean;
      notify_payment_done?: boolean;
      currency?: string;
      exchange_rate?: number;
    };
  }>,
  reply: FastifyReply,
) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const body = request.body ?? {};

  const prefsData: Record<string, unknown> = {};
  if (body.language !== undefined) {
    if (!LANGS.includes(body.language as (typeof LANGS)[number])) {
      return reply.status(400).send({ error: 'language must be "km" or "en"' });
    }
    prefsData.language = body.language;
  }
  if (body.theme !== undefined) {
    if (!THEMES.includes(body.theme as (typeof THEMES)[number])) {
      return reply.status(400).send({ error: 'theme must be "light" or "dark"' });
    }
    prefsData.theme = body.theme;
  }
  for (const key of ['notify_new_order', 'notify_low_stock', 'notify_payment_done'] as const) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== 'boolean') {
        return reply.status(400).send({ error: `${key} must be a boolean` });
      }
      prefsData[key] = body[key];
    }
  }

  if (Object.keys(prefsData).length > 0) {
    await prisma.user_preferences.upsert({
      where: { user_id: request.user.sub },
      update: prefsData,
      create: { user_id: request.user.sub, ...prefsData },
    });
  }

  const shopData: Record<string, unknown> = {};
  if (body.currency !== undefined) {
    if (!CURRENCIES.includes(body.currency as (typeof CURRENCIES)[number])) {
      return reply.status(400).send({ error: 'currency must be "KHR" or "USD"' });
    }
    shopData.currency = body.currency;
  }
  if (body.exchange_rate !== undefined) {
    const rate = Number(body.exchange_rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return reply.status(400).send({ error: 'exchange_rate must be a positive number' });
    }
    shopData.exchange_rate = rate;
  }

  if (Object.keys(shopData).length > 0) {
    await prisma.shops.update({ where: { id: shop.id }, data: shopData });
  }

  return getSettings(request, reply);
}