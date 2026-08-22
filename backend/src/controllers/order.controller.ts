import { FastifyReply, FastifyRequest } from 'fastify';
import prisma from '../utils/prisma';
import { getShopForUser } from '../utils/shop';
import { bestMatches, normalizeName } from '../utils/match';
import { findOrderIdsByShortNumber } from '../utils/orderSearch';
import { normalizePhone } from './customer.controller';
import type { Prisma } from '@prisma/client';

const ORDER_STATUSES = [
  'pending',
  'processing',
  'confirmed',
  'payment_pending',
  'paid',
  'preparing',
  'delivered',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentMethodValue = 'khqr' | 'cash' | 'bank_transfer';

// Client error thrown inside the transaction, mapped to a 400 response.
class OrderValidationError extends Error {}

// Re-run a transaction if it failed due to a unique-constraint violation on the
// per-shop daily order_number, which can happen if two orders for the same shop
// are created in the same instant. Bounded to avoid infinite loops.
async function retryOnUniqueViolation<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if ((err as { code?: string })?.code === 'P2002' && i < attempts - 1) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export interface CreateOrderBody {
  items?: Array<{
    name?: string;
    quantity?: number;
    price?: number | string;
    product_id?: string;
  }>;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  note?: string;
  discount_amount?: number | string;
  delivery_fee?: number | string;
  payment_method?: PaymentMethodValue;
  status?: OrderStatus;
}

export interface ListOrdersQuery {
  status?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
  sort?: string;
  order?: string;
}

const SORTABLE_FIELDS = [
  'created_at',
  'updated_at',
  'total_amount',
  'customer_name',
  'status',
  'payment_status',
  'order_number',
] as const;

type SortableField = (typeof SORTABLE_FIELDS)[number];

const orderInclude = {
  order_items: true,
  handled_user: { select: { id: true, full_name: true } },
} as const;

type OrderWithDetails = Prisma.ordersGetPayload<{ include: typeof orderInclude }>;

// Find-or-create a customer row by normalized phone inside a transaction.
async function upsertCustomerByPhone(
  tx: Prisma.TransactionClient,
  shopId: string,
  phoneRaw: string,
  name?: string,
  address?: string,
) {
  const phone = normalizePhone(phoneRaw);
  if (!phone) return null;

  const nameValue = (name ?? '').trim() || null;
  const addressValue = (address ?? '').trim() || null;
  const data = {
    ...(nameValue ? { name: nameValue } : {}),
    ...(addressValue ? { address: addressValue } : {}),
  };

  const existing = await tx.customers.findFirst({
    where: { shop_id: shopId, phone },
  });
  if (existing) {
    return tx.customers.update({
      where: { id: existing.id },
      data,
    });
  }

  // Fall back to matching previously stored customers stored in another format.
  const candidates = await tx.customers.findMany({
    where: { shop_id: shopId },
    select: { id: true, phone: true },
    take: 500,
  });
  const hit = candidates.find((c) => c.phone && normalizePhone(c.phone) === phone);
  if (hit) {
    return tx.customers.update({
      where: { id: hit.id },
      data: { phone, ...data },
    });
  }

  return tx.customers.create({
    data: { shop_id: shopId, phone, name: nameValue, address: addressValue },
  });
}

// Cambodia runs on Asia/Phnom_Penh (UTC+7, no DST). The "today" used for the
// order-number date part and daily sequence is the shop's local calendar day.
const SHOP_TZ_OFFSET_MS = 7 * 60 * 60 * 1000;

function localDateParts(now: Date) {
  const shifted = new Date(now.getTime() + SHOP_TZ_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const day = shifted.getUTCDate();
  return { year, month, day };
}

// Lower/upper bound (UTC instants) of the shop's current local calendar day.
function localDayRange(now: Date) {
  const { year, month, day } = localDateParts(now);
  const localMidnight = Date.UTC(year, month, day, 0, 0, 0, 0);
  const start = new Date(localMidnight - SHOP_TZ_OFFSET_MS);
  const end = new Date(localMidnight + 24 * 60 * 60 * 1000 - SHOP_TZ_OFFSET_MS);
  return { start, end };
}

// Build the next order number for a shop on the given local day, e.g. 20260822-001.
// The sequence counts how many orders the shop already has today and increments.
async function nextOrderNumber(
  tx: Prisma.TransactionClient,
  shopId: string,
  now: Date,
): Promise<string> {
  const { year, month, day } = localDateParts(now);
  const { start, end } = localDayRange(now);
  const todaysCount = await tx.orders.count({
    where: { shop_id: shopId, created_at: { gte: start, lt: end } },
  });
  const datePart = `${year}${String(month + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`;
  const seq = String(todaysCount + 1).padStart(3, '0');
  return `${datePart}-${seq}`;
}

export async function createOrder(
  request: FastifyRequest<{ Body: CreateOrderBody }>,
  reply: FastifyReply,
) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const body = request.body ?? {};
  const rawItems = (body.items ?? []).filter(
    (i) => i && typeof i === 'object' && (i.name ?? '').trim(),
  );

  if (rawItems.length === 0) {
    return reply.status(400).send({ error: 'Order needs at least one item' });
  }

  const discount = Math.max(0, Number(body.discount_amount) || 0);
  const deliveryFee = Math.max(0, Number(body.delivery_fee) || 0);

  // Load all shop products once for matching.
  const shopProducts = await prisma.products.findMany({
    where: { shop_id: shop.id, deleted_at: null },
    select: { id: true, name: true, price: true, sku: true },
  });

  const matchedByNormalized = new Map<string, (typeof shopProducts)[number]>();
  for (const p of shopProducts) {
    matchedByNormalized.set(normalizeName(p.name), p);
    if (p.sku) matchedByNormalized.set(normalizeName(p.sku), p);
  }

  let subtotal = 0;
  const prepared: Array<{
    product_id: string;
    product_name: string;
    unit_price: number;
    quantity: number;
    subtotal: number;
    isNewProduct: boolean;
    decrementStock: boolean;
  }> = [];

  let result: OrderWithDetails;
  try {
    // Retry on a rare unique-violation race for the per-shop daily order_number.
    result = await retryOnUniqueViolation(() =>
      prisma.$transaction(async (tx) => {
    for (const raw of rawItems) {
      const name = (raw.name ?? '').trim();
      const quantity = Math.max(1, Math.floor(Number(raw.quantity) || 1));
      const normalized = normalizeName(name);

      let productId = raw.product_id ?? null;
      let unitPrice = Number(raw.price);
      let decrementStock = false;
      let newProduct = false;
      let canonicalName = name;

      if (productId) {
        const product = shopProducts.find((p) => p.id === productId);
        if (!product) {
          throw new OrderValidationError(`Unknown product: ${name}`);
        }
        if (Number.isNaN(unitPrice) || unitPrice < 0) {
          unitPrice = Number(product.price);
        }
        canonicalName = product.name;
        decrementStock = true;
      } else {
        const direct = matchedByNormalized.get(normalized);
        if (direct) {
          productId = direct.id;
          unitPrice = Number.isNaN(unitPrice) ? Number(direct.price) : unitPrice;
          canonicalName = direct.name;
          decrementStock = true;
        } else {
          const fuzzy = bestMatches(name, shopProducts, (p) => p.name, 1)[0];
          if (fuzzy && fuzzy.score >= 70) {
            productId = fuzzy.item.id;
            unitPrice = Number.isNaN(unitPrice) ? Number(fuzzy.item.price) : unitPrice;
            canonicalName = fuzzy.item.name;
            decrementStock = true;
          } else {
            if (Number.isNaN(unitPrice) || unitPrice < 0) {
              throw new OrderValidationError(`Price required for new product: ${name}`);
            }
            const created = await tx.products.create({
              data: {
                shop_id: shop.id,
                name,
                price: unitPrice,
                stock_quantity: 0,
                is_available: true,
              },
            });
            productId = created.id;
            newProduct = true;
          }
        }
      }

      const lineSubtotal = Math.round(unitPrice * quantity * 100) / 100;
      subtotal += lineSubtotal;

      prepared.push({
        product_id: productId,
        product_name: canonicalName,
        unit_price: unitPrice,
        quantity,
        subtotal: lineSubtotal,
        isNewProduct: newProduct,
        decrementStock,
      });
    }

    const totalAmount = Math.max(0, Math.round((subtotal - discount + deliveryFee) * 100) / 100);
    const isCash = body.payment_method === 'cash';
    const isPaid = isCash || body.status === 'paid';
    const status = body.status && ORDER_STATUSES.includes(body.status)
      ? body.status
      : isCash
        ? 'paid'
        : 'pending';

    const orderNumber = await nextOrderNumber(tx, shop.id, new Date());

    const order = await tx.orders.create({
      data: {
        shop_id: shop.id,
        order_number: orderNumber,
        customer_name: (body.customer_name ?? '').trim() || null,
        customer_phone: (body.customer_phone ?? '').trim() || null,
        customer_address: (body.customer_address ?? '').trim() || null,
        note: (body.note ?? '').trim() || null,
        status,
        subtotal,
        discount_amount: discount,
        total_amount: totalAmount,
        currency: shop.currency,
        payment_method: body.payment_method ?? null,
        payment_status: isPaid ? 'paid' : 'unpaid',
        paid_at: isPaid ? new Date() : null,
        delivery_fee: deliveryFee || null,
        placed_via: 'pos',
        handled_by: request.user.sub,
        order_items: {
          create: prepared.map((line) => ({
            product_id: line.product_id,
            product_name: line.product_name,
            unit_price: line.unit_price,
            quantity: line.quantity,
            subtotal: line.subtotal,
          })),
        },
      },
      include: orderInclude,
    });

    // Decrement stock for known products.
    if (prepared.some((l) => l.decrementStock)) {
      for (const line of prepared) {
        if (!line.decrementStock) continue;
        await tx.products.updateMany({
          where: { id: line.product_id, shop_id: shop.id, stock_quantity: { gte: line.quantity } },
          data: { stock_quantity: { decrement: line.quantity } },
        });
      }
    }

    // Upsert the customer by phone so future invoices can look them up.
    const phone = (body.customer_phone ?? '').trim();
    if (phone) {
      await upsertCustomerByPhone(tx, shop.id, phone, body.customer_name, body.customer_address);
    }

    return order;
  }),
    );
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return reply.status(400).send({ error: err.message });
    }
    throw err;
  }

  return reply.status(201).send({
    order: serializeOrder(result, shop.name),
    new_products: prepared.filter((l) => l.isNewProduct).length,
  });
}

export async function listOrders(
  request: FastifyRequest<{ Querystring: ListOrdersQuery }>,
  reply: FastifyReply,
) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const { status, q, from, to, sort, order } = request.query;
  const page = Math.max(1, Number(request.query.page) || 1);
  const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 100);
  const query = (q ?? '').trim();

  const sortField: SortableField = SORTABLE_FIELDS.includes(sort as SortableField)
    ? (sort as SortableField)
    : 'created_at';
  const sortOrder: 'asc' | 'desc' = order === 'asc' ? 'asc' : 'desc';

  const where: Prisma.ordersWhereInput = {
    shop_id: shop.id,
    ...(status && status !== 'all' && ORDER_STATUSES.includes(status as OrderStatus)
      ? { status: status as OrderStatus }
      : {}),
    ...(from || to
      ? {
          created_at: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

    if (query) {
      const idMatches = await findOrderIdsByShortNumber(shop.id, query);
      where.OR = [
        { customer_name: { contains: query, mode: 'insensitive' } },
        { customer_phone: { contains: query, mode: 'insensitive' } },
        { order_number: { contains: query } },
        ...(idMatches.length ? [{ id: { in: idMatches } }] : []),
        { order_items: { some: { product_name: { contains: query, mode: 'insensitive' } } } },
      ];
    }

  const [orders, total] = await prisma.$transaction([
    prisma.orders.findMany({
      where,
      include: orderInclude,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.orders.count({ where }),
  ]);

  const counts = (await prisma.orders.groupBy({
    by: ['status'],
    where: { shop_id: shop.id },
    _count: { _all: true },
  })) as unknown as Array<{ status: string; _count: { _all: number } }>;

  const countMap: Record<string, number> = { all: 0 };
  for (const row of counts) {
    countMap[row.status] = row._count._all;
    countMap.all += row._count._all;
  }

  return {
    orders: orders.map((o) => serializeOrder(o, shop.name)),
    total,
    counts: countMap,
    page,
    limit,
  };
}

export async function getOrder(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const order = await prisma.orders.findFirst({
    where: { id: request.params.id, shop_id: shop.id },
    include: orderInclude,
  });

  if (!order) {
    return reply.status(404).send({ error: 'Order not found' });
  }

  return { order: serializeOrder(order, shop.name) };
}

export async function updateOrderStatus(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { status?: string; cancel_reason?: string };
  }>,
  reply: FastifyReply,
) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const order = await prisma.orders.findFirst({
    where: { id: request.params.id, shop_id: shop.id },
  });
  if (!order) {
    return reply.status(404).send({ error: 'Order not found' });
  }

  const status = request.body?.status;
  if (!status || !ORDER_STATUSES.includes(status as OrderStatus)) {
    return reply.status(400).send({ error: 'Invalid status' });
  }

  if (order.status === 'cancelled' && status !== 'cancelled') {
    return reply.status(409).send({ error: 'Cancelled orders cannot be reopened' });
  }

  const updated = await prisma.orders.update({
    where: { id: order.id },
    data: {
      status: status as OrderStatus,
      cancelled_at: status === 'cancelled' ? new Date() : null,
      cancel_reason: status === 'cancelled' ? (request.body?.cancel_reason ?? '').trim() || null : null,
    },
    include: orderInclude,
  });

  return { order: serializeOrder(updated, shop.name) };
}

export async function markOrderPaid(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { payment_method?: 'khqr' | 'cash' | 'bank_transfer' };
  }>,
  reply: FastifyReply,
) {
  const shop = await getShopForUser(request, reply);
  if (!shop) return;

  const order = await prisma.orders.findFirst({
    where: { id: request.params.id, shop_id: shop.id },
  });
  if (!order) {
    return reply.status(404).send({ error: 'Order not found' });
  }
  if (order.status === 'cancelled') {
    return reply.status(409).send({ error: 'Cancelled orders cannot be paid' });
  }

  const updated = await prisma.orders.update({
    where: { id: order.id },
    data: {
      payment_status: 'paid',
      payment_method: request.body?.payment_method ?? order.payment_method,
      paid_at: order.paid_at ?? new Date(),
      status: order.status === 'payment_pending' ? 'paid' : order.status,
    },
    include: orderInclude,
  });

  return { order: serializeOrder(updated, shop.name) };
}

// ─── Helpers ────────────────────────────────────

function serializeOrder(order: OrderWithDetails, shopName: string) {
  return {
    id: order.id,
    number: order.order_number ? `#${order.order_number}` : `#${order.id.slice(0, 6).toUpperCase()}`,
    shop_name: shopName,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    customer_address: order.customer_address,
    note: order.note,
    status: order.status,
    subtotal: Number(order.subtotal),
    discount_amount: Number(order.discount_amount),
    delivery_fee: Number(order.delivery_fee ?? 0),
    total_amount: Number(order.total_amount),
    currency: order.currency,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    paid_at: order.paid_at,
    placed_via: order.placed_via,
    created_at: order.created_at,
    updated_at: order.updated_at,
    cancelled_at: order.cancelled_at,
    cancel_reason: order.cancel_reason,
    handled_by: order.handled_user?.full_name ?? null,
    items: order.order_items.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      name: item.product_name,
      unit_price: Number(item.unit_price),
      quantity: item.quantity,
      subtotal: Number(item.subtotal),
    })),
  };
}
