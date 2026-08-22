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
  is_pinned?: boolean;
  category: { id: string; name: string } | null;
  match_score?: number;
}

export interface CategoryListParams {
  q?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ProductListParams {
  q?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  category_id?: string;
}

export const catalogApi = {
  // Non-paginated when no page/limit given (used for dropdowns); paginated otherwise.
  listCategories: (params?: CategoryListParams) => {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.sort) search.set('sort', params.sort);
    if (params?.order) search.set('order', params.order);
    const qs = search.toString();
    return request<{ categories: Category[]; total?: number; page?: number; limit?: number }>(
      `/categories${qs ? `?${qs}` : ''}`,
    );
  },

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

  listProducts: (params: ProductListParams) => {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    if (params.sort) search.set('sort', params.sort);
    if (params.order) search.set('order', params.order);
    if (params.category_id) search.set('category_id', params.category_id);
    const qs = search.toString();
    return request<{ products: Product[]; total: number; page: number; limit: number }>(
      `/products/list${qs ? `?${qs}` : ''}`,
    );
  },

  searchProducts: (q: string, limit = 8, categoryId?: string) => {
    const params = new URLSearchParams();
    params.set('q', q);
    params.set('limit', String(limit));
    if (categoryId) params.set('category_id', categoryId);
    return request<{ products: Product[] }>(`/products?${params.toString()}`);
  },

  listPinned: () => request<{ products: Product[] }>('/products/pinned'),

  togglePin: (id: string, isPinned: boolean) =>
    request<{ product: Product }>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_pinned: isPinned }),
    }),

  createProduct: (data: {
    name: string;
    price: number;
    category_id?: string;
    sku?: string;
    stock_quantity?: number;
  }) =>
    request<{ product: Product }>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProduct: (id: string, data: {
    name?: string;
    price?: number;
    sku?: string;
    stock_quantity?: number;
    category_id?: string | null;
    is_available?: boolean;
    is_pinned?: boolean;
  }) =>
    request<{ product: Product }>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteProduct: (id: string) =>
    request<{ ok: boolean }>(`/products/${id}`, { method: 'DELETE' }),
};
