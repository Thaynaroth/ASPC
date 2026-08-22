import { request } from './api';

export interface Customer {
  id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  match_score?: number;
}

export interface CustomerListParams {
  q?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export const customerApi = {
  search: (q: string, limit = 6) => {
    const params = new URLSearchParams();
    params.set('q', q);
    params.set('limit', String(limit));
    return request<{ customers: Customer[] }>(`/customers?${params.toString()}`);
  },

  list: (params: CustomerListParams) => {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    if (params.sort) search.set('sort', params.sort);
    if (params.order) search.set('order', params.order);
    const qs = search.toString();
    return request<{ customers: Customer[]; total: number; page: number; limit: number }>(
      `/customers/list${qs ? `?${qs}` : ''}`,
    );
  },

  create: (data: { name?: string; phone?: string; address?: string }) =>
    request<{ customer: Customer }>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { name?: string; address?: string; phone?: string }) =>
    request<{ customer: Customer }>(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/customers/${id}`, { method: 'DELETE' }),
};
