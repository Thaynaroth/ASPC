import bcrypt from 'bcrypt';
import { FastifyReply, FastifyRequest } from 'fastify';
import prisma from '../utils/prisma';

export async function login(
  request: FastifyRequest<{ Body: { email: string; password: string } }>,
  reply: FastifyReply,
) {
  const { email, password } = request.body;

  if (!email || !password) {
    return reply.status(400).send({ error: 'Email and password are required' });
  }

  const user = await prisma.users.findUnique({ where: { email } });
  if (!user || !user.is_active) {
    return reply.status(401).send({ error: 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return reply.status(401).send({ error: 'Invalid email or password' });
  }

  const token = await reply.jwtSign({ sub: user.id });

  await prisma.users.update({
    where: { id: user.id },
    data: { last_login_at: new Date() },
  });

  reply.setCookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      avatar_url: user.avatar_url,
    },
  };
}

export async function logout(_request: FastifyRequest, reply: FastifyReply) {
  reply.clearCookie('token', { path: '/' });
  return { ok: true };
}

export async function me(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const user = await prisma.users.findUnique({
    where: { id: request.user.sub },
    select: {
      id: true,
      email: true,
      full_name: true,
      phone: true,
      avatar_url: true,
      is_verified: true,
      created_at: true,
    },
  });

  if (!user) {
    return reply.status(401).send({ error: 'User not found' });
  }

  const roles = await prisma.user_roles.findMany({
    where: { user_id: user.id },
    include: { role: { select: { name: true } } },
  });

  return {
    user: {
      ...user,
      roles: roles.map((r) => r.role.name),
    },
  };
}
