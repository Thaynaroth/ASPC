import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@aspc.com' },
    update: {},
    create: {
      email: 'admin@aspc.com',
      password: '$2b$10$placeholder', // replace with bcrypt hash
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  });

  console.log('Seeded:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
