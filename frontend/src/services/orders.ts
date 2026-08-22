import { request } from './api';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'confirmed'
  | 'payment_pending'
  | 'paid'
  | 'preparing'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'khqr' | 'cash' | 'bank_transfer';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed';

export interface OrderItem {
  id: string;
  product_id: string;
  name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  number: string;
  shop_name: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  note: string | null;
  status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  total_amount: number;
  currency: string;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  paid_at: string | null;
  placed_via: 'bot' | 'pos' | 'manual';
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
  handled_by: string | null;
  items: OrderItem[];
}

export interface OrderDraftItem {
  name: string;
  quantity: number;
  price: number | null;
  product_id: string | null;
  isNewProduct?: boolean;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
  counts: Record<string, number>;
  page: number;
  limit: number;
}

export interface CreateOrderInput {
  items: Array<{ name: string; quantity: number; price?: number; product_id?: string | null }>;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  note?: string;
  discount_amount?: number;
  delivery_fee?: number;
  payment_method?: PaymentMethod | null;
  status?: OrderStatus;
}

export const orderApi = {
  list: (params: {
    status?: string;
    q?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  }) => {
    const search = new URLSearchParams();
    if (params.status && params.status !== 'all') search.set('status', params.status);
    if (params.q) search.set('q', params.q);
    if (params.from) search.set('from', params.from);
    if (params.to) search.set('to', params.to);
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    if (params.sort) search.set('sort', params.sort);
    if (params.order) search.set('order', params.order);
    const qs = search.toString();
    return request<OrderListResponse>(`/orders${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) => request<{ order: Order }>(`/orders/${id}`),

  create: (data: CreateOrderInput) =>
    request<{ order: Order; new_products: number }>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, data: { status: OrderStatus; cancel_reason?: string }) =>
    request<{ order: Order }>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  markPaid: (id: string, payment_method?: PaymentMethod) =>
    request<{ order: Order }>(`/orders/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(payment_method ? { payment_method } : {}),
    }),
};
