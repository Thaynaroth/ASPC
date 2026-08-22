import { FastifyReply, FastifyRequest } from 'fastify';
import prisma from '../utils/prisma';
import { getShopForUser } from '../utils/shop';
import { bestMatches, normalizeName } from '../utils/match';
import type { Prisma } from '@prisma/client';

const PRODUCT_SORTABLE = [
  'name',
  'price',
  'stock_quantity',
  'created_at',
  'updated_at',
] as const;
type ProductSortField = (typeof PRODUCT_SORTABLE)[number];

export async function listProducts(
  request: FastifyRequest<{
    Querystring: {
      q?: string;
      page?: string;
      limit?: string;
      sort?: string;
      order?: string;
      category_id?: string;
    };
  }>,
  reply: FastifyReply,
) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const q = (request.query.q ?? '').trim();
  const page = Math.max(1, Number(request.query.page) || 1);
  const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 100);
  const categoryId = request.query.category_id || undefined;
  const sortField: ProductSortField = PRODUCT_SORTABLE.includes(
    request.query.sort as ProductSortField,
  )
    ? (request.query.sort as ProductSortField)
    : 'created_at';
  const sortOrder: 'asc' | 'desc' = request.query.order === 'asc' ? 'asc' : 'desc';

  const where: Prisma.productsWhereInput = {
    shop_id: shop.id,
    deleted_at: null,
    ...(categoryId ? { product_type_id: categoryId } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [products, total] = await prisma.$transaction([
    prisma.products.findMany({
      where,
      include: { product_type: { select: { id: true, name: true } } },
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.products.count({ where }),
  ]);

  return {
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: Number(p.price),
      cost_price: p.cost_price ? Number(p.cost_price) : null,
      stock_quantity: p.stock_quantity,
      is_available: p.is_available,
      is_pinned: p.is_pinned,
      category: p.product_type ? { id: p.product_type.id, name: p.product_type.name } : null,
    })),
    total,
    page,
    limit,
  };
}

export async function searchProducts(
  request: FastifyRequest<{
    Querystring: { q?: string; limit?: string; category_id?: string };
  }>,
  reply: FastifyReply,
) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const q = (request.query.q ?? '').trim();
  const limit = Math.min(Number(request.query.limit) || 8, 20);
  const normalized = normalizeName(q);
  const qWords = normalized.split(' ').filter(Boolean);

  const products = await prisma.products.findMany({
    where: {
      shop_id: shop.id,
      deleted_at: null,
      ...(request.query.category_id
        ? { product_type_id: request.query.category_id }
        : {}),
      ...(qWords.length && normalized.length > 4
        ? {
            OR: qWords.flatMap((word) => [
              { name: { contains: word, mode: 'insensitive' } },
              { sku: { contains: word, mode: 'insensitive' } },
            ]),
          }
        : {}),
    },
    include: {
      product_type: { select: { id: true, name: true } },
    },
    orderBy: [{ name: 'asc' }],
    take: 200,
  });

  const matches = normalized
    ? bestMatches(q, products, (p) => p.name, limit)
    : products
        .map((p) => ({ item: p, score: 100 }))
        .slice(0, limit);

  return {
    products: matches.map(({ item: p, score }) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: Number(p.price),
      cost_price: p.cost_price ? Number(p.cost_price) : null,
      stock_quantity: p.stock_quantity,
      is_available: p.is_available,
      is_pinned: p.is_pinned,
      category: p.product_type ? { id: p.product_type.id, name: p.product_type.name } : null,
      match_score: score,
    })),
  };
}

export async function listPinnedProducts(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const products = await prisma.products.findMany({
    where: { shop_id: shop.id, deleted_at: null, is_pinned: true, is_available: true },
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
      stock_quantity: true,
      is_available: true,
      is_pinned: true,
    },
    orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    take: 100,
  });

  return {
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: Number(p.price),
      stock_quantity: p.stock_quantity,
      is_available: p.is_available,
      is_pinned: p.is_pinned,
    })),
  };
}

export async function reorderPinned(
  request: FastifyRequest<{
    Body: { ids: string[] };
  }>,
  reply: FastifyReply,
) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const ids = Array.isArray(request.body?.ids) ? request.body.ids : [];
  if (ids.length === 0) return { ok: true };

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.products.updateMany({
        where: { id, shop_id: shop.id, is_pinned: true, deleted_at: null },
        data: { sort_order: index },
      }),
    ),
  );

  return { ok: true };
}

export async function updateProduct(
  request: FastifyRequest<{
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
  }>,
  reply: FastifyReply,
) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const existing = await prisma.products.findFirst({
    where: { id: request.params.id, shop_id: shop.id, deleted_at: null },
    select: { id: true },
  });
  if (!existing) {
    return reply.status(404).send({ error: 'Product not found' });
  }

  const body = request.body ?? {};
  const data: Prisma.productsUpdateInput = {};

  if (typeof body.is_pinned === 'boolean') {
    data.is_pinned = body.is_pinned;
    if (body.is_pinned) {
      const last = await prisma.products.aggregate({
        where: { shop_id: shop.id, is_pinned: true, deleted_at: null },
        _max: { sort_order: true },
      });
      data.sort_order = (last._max.sort_order ?? -1) + 1;
    }
  }

  if (body.name !== undefined) {
    const name = (body.name ?? '').trim();
    if (!name) return reply.status(400).send({ error: 'Product name is required' });
    data.name = name;
  }

  if (body.price !== undefined) {
    const price = Number(body.price);
    if (Number.isNaN(price) || price < 0) {
      return reply.status(400).send({ error: 'A valid price is required' });
    }
    data.price = price;
  }

  if (body.sku !== undefined) data.sku = body.sku?.trim() || null;
  if (body.stock_quantity !== undefined) {
    data.stock_quantity = Math.max(0, Number(body.stock_quantity) || 0);
  }
  if (body.is_available !== undefined) data.is_available = !!body.is_available;

  if (body.category_id !== undefined) {
    const categoryId = body.category_id || null;
    if (categoryId) {
      const category = await prisma.product_types.findFirst({
        where: { id: categoryId, shop_id: shop.id },
      });
      if (!category) return reply.status(400).send({ error: 'Category not found' });
    }
    data.product_type = categoryId
      ? { connect: { id: categoryId } }
      : { disconnect: true };
  }

  const product = await prisma.products.update({
    where: { id: existing.id },
    data,
    include: { product_type: { select: { id: true, name: true } } },
  });

  return {
    product: {
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: Number(product.price),
      cost_price: product.cost_price ? Number(product.cost_price) : null,
      stock_quantity: product.stock_quantity,
      is_available: product.is_available,
      is_pinned: product.is_pinned,
      category: product.product_type
        ? { id: product.product_type.id, name: product.product_type.name }
        : null,
    },
  };
}

export async function deleteProduct(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const existing = await prisma.products.findFirst({
    where: { id: request.params.id, shop_id: shop.id, deleted_at: null },
  });
  if (!existing) {
    return reply.status(404).send({ error: 'Product not found' });
  }

  await prisma.products.update({
    where: { id: existing.id },
    data: { deleted_at: new Date() },
  });

  return { ok: true };
}

export async function createProduct(
  request: FastifyRequest<{
    Body: {
      name?: string;
      price?: number | string;
      category_id?: string;
      sku?: string;
      stock_quantity?: number;
    };
  }>,
  reply: FastifyReply,
) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const name = (request.body?.name ?? '').trim();
  if (!name) {
    return reply.status(400).send({ error: 'Product name is required' });
  }

  const price = Number(request.body?.price ?? NaN);
  if (Number.isNaN(price) || price < 0) {
    return reply.status(400).send({ error: 'A valid price is required' });
  }

  const categoryId = request.body?.category_id || null;
  if (categoryId) {
    const category = await prisma.product_types.findFirst({
      where: { id: categoryId, shop_id: shop.id },
    });
    if (!category) {
      return reply.status(400).send({ error: 'Category not found' });
    }
  }

  const product = await prisma.products.create({
    data: {
      shop_id: shop.id,
      product_type_id: categoryId,
      name,
      sku: request.body?.sku?.trim() || null,
      price,
      stock_quantity: Math.max(0, Number(request.body?.stock_quantity) || 0),
      is_available: true,
    },
    include: {
      product_type: { select: { id: true, name: true } },
    },
  });

  return reply.status(201).send({
    product: {
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: Number(product.price),
      stock_quantity: product.stock_quantity,
      category: product.product_type
        ? { id: product.product_type.id, name: product.product_type.name }
        : null,
    },
  });
}
