import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.roles.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin', description: 'Super Admin — full platform access' },
  });

  await prisma.roles.upsert({
    where: { name: 'owner' },
    update: {},
    create: { name: 'owner', description: 'Shop owner — full shop-level access' },
  });

  await prisma.roles.upsert({
    where: { name: 'staff' },
    update: {},
    create: { name: 'staff', description: 'Shop staff — limited operational access' },
  });

  const hash = await bcrypt.hash('admin123456', 10);

  const adminUser = await prisma.users.upsert({
    where: { email: 'admin@aspc.com' },
    update: { password_hash: hash },
    create: {
      email: 'admin@aspc.com',
      password_hash: hash,
      full_name: 'Super Admin',
      is_verified: true,
    },
  });

  const existing = await prisma.user_roles.findFirst({
    where: {
      user_id: adminUser.id,
      role_id: adminRole.id,
      shop_id: null,
    },
  });

  if (!existing) {
    await prisma.user_roles.create({
      data: {
        user_id: adminUser.id,
        role_id: adminRole.id,
        assigned_by: adminUser.id,
      },
    });
  }

  console.log('Seeded:', adminUser.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
