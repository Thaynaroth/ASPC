import { request } from './api';

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  product_count: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  stock_quantity: number;
  is_available: boolean;
  category: { id: string; name: string } | null;
  match_score?: number;
}

export const catalogApi = {
  listCategories: () => request<{ categories: Category[] }>('/categories'),

  createCategory: (data: { name: string; description?: string }) =>
    request<{ category: Category }>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCategory: (id: string, data: { name: string; description?: string }) =>
    request<{ category: Category }>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteCategory: (id: string) =>
    request<{ ok: boolean }>(`/categories/${id}`, { method: 'DELETE' }),

  searchProducts: (q: string, limit = 8, categoryId?: string) => {
    const params = new URLSearchParams();
    params.set('q', q);
    params.set('limit', String(limit));
    if (categoryId) params.set('category_id', categoryId);
    return request<{ products: Product[] }>(`/products?${params.toString()}`);
  },

  createProduct: (data: { name: string; price: number; category_id?: string }) =>
    request<{ product: Product }>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
