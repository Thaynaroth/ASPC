const BASE_URL = '/api';

export interface UserShop {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
  roles: string[];
  shops: UserShop[];
}

export interface ApiError {
  error: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${BASE_URL}${url}`, {
    credentials: 'include',
    headers,
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    try {
      const body = JSON.parse(text);
      throw new Error(body.error || body.message || `HTTP ${res.status}`);
    } catch {
      throw new Error(text || `HTTP ${res.status} ${res.statusText}`);
    }
  }

  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),

  me: () =>
    request<{ user: User }>('/auth/me'),
};
