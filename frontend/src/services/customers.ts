import { request } from './api';

export interface Customer {
  id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  match_score?: number;
}

export const customerApi = {
  search: (q: string, limit = 6) => {
    const params = new URLSearchParams();
    params.set('q', q);
    params.set('limit', String(limit));
    return request<{ customers: Customer[] }>(`/customers?${params.toString()}`);
  },

  update: (id: string, data: { name?: string; address?: string; phone?: string }) =>
    request<{ customer: Customer }>(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
