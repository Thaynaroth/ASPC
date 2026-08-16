import { FastifyReply, FastifyRequest } from 'fastify';
import prisma from '../utils/prisma';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const user = await prisma.users.findUnique({
    where: { id: request.user.sub, deleted_at: null },
    select: { id: true, is_active: true },
  });

  if (!user || !user.is_active) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}
