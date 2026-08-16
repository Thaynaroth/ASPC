import prisma from './prisma';

// Search orders by their short invoice number (first 6 hex chars of the uuid).
// UUID columns don't accept Prisma string filters, so we use Prisma's safe
// parameterized raw query and feed the matched ids back into typed queries.
export async function findOrderIdsByShortNumber(shopId: string, shortNumber: string): Promise<string[]> {
  const clean = shortNumber
    .replace(/^#/, '')
    .toLowerCase()
    .replace(/[^a-f0-9]/g, '');
  if (!clean) return [];

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM orders
    WHERE shop_id = ${shopId}::uuid
      AND lower(left(id::text, CAST(${clean.length} AS INTEGER))) = ${clean}
    LIMIT 50
  `;
  return rows.map((r) => r.id);
}
