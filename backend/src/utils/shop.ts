import { FastifyReply, FastifyRequest } from 'fastify';
import prisma from './prisma';

export interface ShopContext {
  id: string;
  name: string;
  slug: string;
  currency: string;
  role: string;
}

export async function getShopForUser(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<ShopContext | null> {
  const membership = await prisma.user_roles.findFirst({
    where: { user_id: request.user.sub, shop_id: { not: null } },
    include: {
      shop: { select: { id: true, name: true, slug: true, currency: true } },
      role: { select: { name: true } },
    },
    orderBy: { assigned_at: 'asc' },
  });

  if (!membership) {
    reply.status(403).send({ error: 'No shop access for this account' });
    return null;
  }

  return {
    id: membership.shop!.id,
    name: membership.shop!.name,
    slug: membership.shop!.slug,
    currency: membership.shop!.currency,
    role: membership.role.name,
  };
}
