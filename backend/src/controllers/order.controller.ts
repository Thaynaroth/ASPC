import { FastifyReply, FastifyRequest } from 'fastify';
import prisma from '../utils/prisma';
import { getShopForUser } from '../utils/shop';
import { bestMatches, normalizeName } from '../utils/match';
import { findOrderIdsByShortNumber } from '../utils/orderSearch';
import type { Prisma } from '@prisma/client';

const ORDER_STATUSES = [
  'pending',
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
}

const orderInclude = {
  order_items: true,
  handled_user: { select: { id: true, full_name: true } },
} as const;

type OrderWithDetails = Prisma.ordersGetPayload<{ include: typeof orderInclude }>;

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
    result = await prisma.$transaction(async (tx) => {
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
    const status = body.status && ORDER_STATUSES.includes(body.status)
      ? body.status
      : isCash
        ? 'paid'
        : 'pending';

    const order = await tx.orders.create({
      data: {
        shop_id: shop.id,
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
        payment_status: isCash ? 'paid' : 'unpaid',
        paid_at: isCash ? new Date() : null,
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

    return order;
  });
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

  const { status, q, from, to } = request.query;
  const page = Math.max(1, Number(request.query.page) || 1);
  const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 100);
  const query = (q ?? '').trim();

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
      ...(idMatches.length ? [{ id: { in: idMatches } }] : []),
      { order_items: { some: { product_name: { contains: query, mode: 'insensitive' } } } },
    ];
  }

  const [orders, total] = await prisma.$transaction([
    prisma.orders.findMany({
      where,
      include: orderInclude,
      orderBy: { created_at: 'desc' },
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
    number: `#${order.id.slice(0, 6).toUpperCase()}`,
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
