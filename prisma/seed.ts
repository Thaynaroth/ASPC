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

  // ─── Shoes Reseller Demo Shop ─────────────────────────────
  const ownerRole = await prisma.roles.findUnique({ where: { name: 'owner' } });
  const shopType = await prisma.shop_types.upsert({
    where: { name: 'shoes_reseller' },
    update: {},
    create: { name: 'shoes_reseller', description: 'Shoes & sneakers reseller shop' },
  });

  const devHash = await bcrypt.hash('dev123456', 10);

  const devUser = await prisma.users.upsert({
    where: { email: 'dev@aspc.com' },
    update: { password_hash: devHash },
    create: {
      email: 'dev@aspc.com',
      password_hash: devHash,
      full_name: 'Dara Dev',
      phone: '012 345 678',
      is_verified: true,
    },
  });

  const sneakerShop = await prisma.shops.upsert({
    where: { slug: 'sneaker-nest' },
    update: { name: 'Sneaker Nest', owner_id: devUser.id },
    create: {
      owner_id: devUser.id,
      shop_type_id: shopType.id,
      name: 'Sneaker Nest',
      slug: 'sneaker-nest',
      description: 'Premium sneakers & shoes reseller — Nike, Adidas, New Balance',
      phone: '012 345 678',
      address: 'St. 271, Toul Tompoung',
      city: 'Phnom Penh',
      currency: 'KHR',
    },
  });

  await prisma.user_roles.upsert({
    where: {
      user_id_role_id_shop_id: {
        user_id: devUser.id,
        role_id: ownerRole!.id,
        shop_id: sneakerShop.id,
      },
    },
    update: {},
    create: {
      user_id: devUser.id,
      role_id: ownerRole!.id,
      shop_id: sneakerShop.id,
      assigned_by: adminUser.id,
    },
  });

  await prisma.shop_features.upsert({
    where: { shop_id: sneakerShop.id },
    update: {},
    create: { shop_id: sneakerShop.id },
  });

  const sneakers = [
    { name: 'Classic White Sneaker', sku: 'CSN-001', price: 45.0, stock: 24 },
    { name: 'Retro Running Shoe', sku: 'RRS-002', price: 62.0, stock: 18 },
    { name: 'High-Top Street Sneaker', sku: 'HTS-003', price: 78.0, stock: 12 },
    { name: 'Canvas Slip-On', sku: 'CSO-004', price: 28.0, stock: 30 },
  ];

  for (const item of sneakers) {
    const existingProduct = await prisma.products.findFirst({
      where: { shop_id: sneakerShop.id, sku: item.sku },
    });

    if (!existingProduct) {
      await prisma.products.create({
        data: {
          shop_id: sneakerShop.id,
          name: item.name,
          sku: item.sku,
          price: item.price,
          cost_price: item.price * 0.7,
          stock_quantity: item.stock,
          low_stock_threshold: 5,
          is_available: true,
        },
      });
    }
  }

  console.log('Seeded:', adminUser.email, '|', devUser.email, '→', sneakerShop.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
