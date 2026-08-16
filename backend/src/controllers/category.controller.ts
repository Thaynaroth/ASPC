import { FastifyReply, FastifyRequest } from 'fastify';
import prisma from '../utils/prisma';
import { getShopForUser } from '../utils/shop';

export async function listCategories(request: FastifyRequest, reply: FastifyReply) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const categories = await prisma.product_types.findMany({
    where: { shop_id: shop.id },
    include: { _count: { select: { products: true } } },
    orderBy: [{ name: 'asc' }],
  });

  return {
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      created_at: c.created_at,
      product_count: c._count.products,
    })),
  };
}

export async function createCategory(
  request: FastifyRequest<{ Body: { name?: string; description?: string } }>,
  reply: FastifyReply,
) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const name = (request.body?.name ?? '').trim();
  if (!name) {
    return reply.status(400).send({ error: 'Category name is required' });
  }
  if (name.length > 60) {
    return reply.status(400).send({ error: 'Category name is too long (max 60 characters)' });
  }

  const description = (request.body?.description ?? '').trim() || null;

  const existing = await prisma.product_types.findUnique({
    where: { shop_id_name: { shop_id: shop.id, name } },
  });
  if (existing) {
    return reply.status(409).send({ error: 'A category with this name already exists' });
  }

  const category = await prisma.product_types.create({
    data: { shop_id: shop.id, name, description },
  });

  return reply.status(201).send({ category });
}

export async function updateCategory(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { name?: string; description?: string };
  }>,
  reply: FastifyReply,
) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const category = await prisma.product_types.findFirst({
    where: { id: request.params.id, shop_id: shop.id },
  });
  if (!category) {
    return reply.status(404).send({ error: 'Category not found' });
  }

  const name = (request.body?.name ?? category.name).trim();
  if (!name) {
    return reply.status(400).send({ error: 'Category name is required' });
  }

  const description =
    request.body?.description === undefined
      ? category.description
      : request.body.description.trim() || null;

  if (name !== category.name) {
    const existing = await prisma.product_types.findUnique({
      where: { shop_id_name: { shop_id: shop.id, name } },
    });
    if (existing) {
      return reply.status(409).send({ error: 'A category with this name already exists' });
    }
  }

  const updated = await prisma.product_types.update({
    where: { id: category.id },
    data: { name, description },
  });

  return { category: updated };
}

export async function deleteCategory(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const category = await prisma.product_types.findFirst({
    where: { id: request.params.id, shop_id: shop.id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) {
    return reply.status(404).send({ error: 'Category not found' });
  }

  if (category._count.products > 0) {
    return reply.status(409).send({
      error: `Cannot delete: ${category._count.products} product(s) still use this category`,
    });
  }

  await prisma.product_types.delete({ where: { id: category.id } });

  return { ok: true };
}
