import { FastifyReply, FastifyRequest } from 'fastify';
import prisma from '../utils/prisma';
import { getShopForUser } from '../utils/shop';
import type { Prisma } from '@prisma/client';

// Normalize a Khmer phone number to local form: digits only, +855 → 0.
export function normalizePhone(raw: string): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return '';
  const without855 = digits.startsWith('855') ? digits.slice(3) : digits;
  if (without855.startsWith('0')) return without855;
  if (without855.length === 9) return '0' + without855;
  return without855;
}

export interface CustomerShape {
  id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
}

function serializeCustomer(c: {
  id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
}): CustomerShape {
  return { id: c.id, name: c.name, phone: c.phone, address: c.address };
}

const CUSTOMER_SORTABLE = ['name', 'phone', 'created_at', 'updated_at'] as const;
type CustomerSortField = (typeof CUSTOMER_SORTABLE)[number];

export async function listCustomers(
  request: FastifyRequest<{
    Querystring: { q?: string; page?: string; limit?: string; sort?: string; order?: string };
  }>,
  reply: FastifyReply,
) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const q = (request.query.q ?? '').trim();
  const page = Math.max(1, Number(request.query.page) || 1);
  const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 100);
  const sortField: CustomerSortField = CUSTOMER_SORTABLE.includes(
    request.query.sort as CustomerSortField,
  )
    ? (request.query.sort as CustomerSortField)
    : 'updated_at';
  const sortOrder: 'asc' | 'desc' = request.query.order === 'asc' ? 'asc' : 'desc';

  const where: Prisma.customersWhereInput = {
    shop_id: shop.id,
    deleted_at: null,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
            { address: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [customers, total] = await prisma.$transaction([
    prisma.customers.findMany({
      where,
      select: { id: true, name: true, phone: true, address: true },
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customers.count({ where }),
  ]);

  return {
    customers: customers.map(serializeCustomer),
    total,
    page,
    limit,
  };
}

export async function createCustomer(
  request: FastifyRequest<{
    Body: { name?: string; phone?: string; address?: string };
  }>,
  reply: FastifyReply,
) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const body = request.body ?? {};
  const name = (body.name ?? '').trim() || null;
  const phoneRaw = (body.phone ?? '').trim() || null;
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  const address = (body.address ?? '').trim() || null;

  const customer = await prisma.customers.create({
    data: { shop_id: shop.id, name, phone, address },
    select: { id: true, name: true, phone: true, address: true },
  });

  return reply.status(201).send({ customer: serializeCustomer(customer) });
}

export async function deleteCustomer(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const existing = await prisma.customers.findFirst({
    where: { id: request.params.id, shop_id: shop.id, deleted_at: null },
  });
  if (!existing) {
    return reply.status(404).send({ error: 'Customer not found' });
  }

  await prisma.customers.update({
    where: { id: existing.id },
    data: { deleted_at: new Date() },
  });

  return { ok: true };
}

export async function searchCustomers(
  request: FastifyRequest<{ Querystring: { q?: string; limit?: string } }>,
  reply: FastifyReply,
) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const q = (request.query.q ?? '').trim();
  const limit = Math.min(Number(request.query.limit) || 8, 20);

  const customers = await prisma.customers.findMany({
    where: { shop_id: shop.id, deleted_at: null },
    select: { id: true, name: true, phone: true, address: true },
    orderBy: { updated_at: 'desc' },
    take: 500,
  });

  if (!q) {
    return { customers: customers.slice(0, limit).map(serializeCustomer) };
  }

  const qLower = q.toLowerCase();
  const qDigits = normalizePhone(q);
  const matches = customers
    .map((c) => {
      const phoneDigits = normalizePhone(c.phone ?? '');
      let score = 0;
      if (c.name && c.name.toLowerCase().includes(qLower)) score = Math.max(score, 90);
      if (phoneDigits) {
        if (qDigits && phoneDigits === qDigits) score = Math.max(score, 100);
        else if (qDigits && phoneDigits.startsWith(qDigits)) score = Math.max(score, 80);
        else if (qDigits && phoneDigits.includes(qDigits)) score = Math.max(score, 60);
      }
      return { customer: c, score };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    customers: matches.map(({ customer, score }) => ({
      ...serializeCustomer(customer),
      match_score: score,
    })),
  };
}

export async function updateCustomer(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { name?: string; phone?: string; address?: string };
  }>,
  reply: FastifyReply,
) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const existing = await prisma.customers.findFirst({
    where: { id: request.params.id, shop_id: shop.id, deleted_at: null },
  });
  if (!existing) {
    return reply.status(404).send({ error: 'Customer not found' });
  }

  const body = request.body ?? {};
  const name = body.name !== undefined ? (body.name ?? '').trim() || null : undefined;
  const phoneRaw = body.phone !== undefined ? (body.phone ?? '').trim() || null : undefined;
  const phone = phoneRaw === null ? null : phoneRaw ? normalizePhone(phoneRaw) : undefined;
  const address = body.address !== undefined ? (body.address ?? '').trim() || null : undefined;

  const customer = await prisma.customers.update({
    where: { id: existing.id },
    data: { name, phone, address },
    select: { id: true, name: true, phone: true, address: true },
  });

  return { customer: serializeCustomer(customer) };
}
