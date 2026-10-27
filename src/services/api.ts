const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getToken(): string {
  try {
    return localStorage.getItem('smartstore-token') || 'smart-mart-admin-jwt';
  } catch {
    return 'smart-mart-admin-jwt';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {})
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}: Request failed`);
  }

  return data;
}

export const api = {
  // Auth
  auth: {
    login: async (email: string, password: string) => {
      const res = await request<{ success: boolean; token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (res.token) {
        localStorage.setItem('smartstore-token', res.token);
      }
      return res;
    },
    logout: async () => {
      localStorage.removeItem('smartstore-token');
      return request('/auth/logout', { method: 'POST' });
    },
    me: async () => request<{ success: boolean; user: any }>('/auth/me')
  },

  // Products
  products: {
    getAll: async (category?: string, search?: string) => {
      const params = new URLSearchParams();
      if (category && category !== 'All') params.set('category', category);
      if (search) params.set('search', search);
      const query = params.toString() ? `?${params.toString()}` : '';
      return request<{ success: boolean; data: any[] }>(`/products${query}`);
    },
    getById: async (id: string) => request<{ success: boolean; data: any }>(`/products/${id}`),
    create: async (product: any) => request<{ success: boolean; data: any }>('/products', {
      method: 'POST',
      body: JSON.stringify(product)
    }),
    update: async (id: string, updates: any) => request<{ success: boolean; data: any }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),
    delete: async (id: string) => request<{ success: boolean; message: string }>(`/products/${id}`, {
      method: 'DELETE'
    }),
    updatePrice: async (id: string, price: number) => request<{ success: boolean; data: any }>(`/products/${id}/price`, {
      method: 'PATCH',
      body: JSON.stringify({ price })
    }),
    updateExpiry: async (id: string, expiry_date: string | null) => request<{ success: boolean; data: any }>(`/products/${id}/expiry`, {
      method: 'PATCH',
      body: JSON.stringify({ expiry_date })
    })
  },

  // Inventory & Stock
  inventory: {
    getAll: async (status?: string, search?: string) => {
      const params = new URLSearchParams();
      if (status && status !== 'All') params.set('status', status);
      if (search) params.set('search', search);
      const query = params.toString() ? `?${params.toString()}` : '';
      return request<{ success: boolean; data: any[] }>(`/inventory${query}`);
    },
    restock: async (productId: string, quantity: number, notes?: string) => request<{ success: boolean; data: any }>('/inventory/restock', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity, notes })
    }),
    deduct: async (productId: string, quantity: number, reason: string) => request<{ success: boolean; data: any }>('/inventory/deduct', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity, reason })
    }),
    getAlerts: async () => request<{ success: boolean; count: number; data: any[] }>('/inventory/alerts'),
    getExpiry: async (status?: string) => {
      const query = status && status !== 'All' ? `?status=${status}` : '';
      return request<{ success: boolean; summary: any; data: any[] }>(`/inventory/expiry${query}`);
    },
    getPredictions: async (windowDays: number = 7) => request<{ success: boolean; data: any[] }>(`/inventory/prediction?windowDays=${windowDays}`),
    getReorder: async () => request<{ success: boolean; count: number; totalEstimatedProcurementCost: number; data: any[] }>('/inventory/reorder'),
    getLogs: async (productId?: string) => {
      const query = productId ? `?productId=${productId}` : '';
      return request<{ success: boolean; data: any[] }>(`/inventory/logs${query}`);
    }
  },

  // Billing & Sales Records
  sales: {
    checkout: async (items: { productId: string; quantity: number }[], paymentMethod: string, notes?: string) => {
      const idempotencyKey = `chk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      return request<{ success: boolean; message: string; data: any }>('/sales/checkout', {
        method: 'POST',
        body: JSON.stringify({ items, paymentMethod, notes, idempotencyKey })
      });
    },
    getAll: async (search?: string, limit?: number) => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (limit) params.set('limit', String(limit));
      const query = params.toString() ? `?${params.toString()}` : '';
      return request<{ success: boolean; count: number; data: any[] }>(`/sales${query}`);
    },
    getById: async (id: string) => request<{ success: boolean; data: any }>(`/sales/${id}`)
  },

  // Expenses & Financials
  expenses: {
    getAll: async (category?: string) => {
      const query = category && category !== 'All' ? `?category=${category}` : '';
      return request<{ success: boolean; totalAmount: number; categoryBreakdown: Record<string, number>; data: any[] }>(`/expenses${query}`);
    },
    create: async (expense: { title: string; category: string; amount: number; expense_date: string }) => request<{ success: boolean; data: any }>('/expenses', {
      method: 'POST',
      body: JSON.stringify(expense)
    }),
    delete: async (id: string) => request<{ success: boolean; message: string }>(`/expenses/${id}`, {
      method: 'DELETE'
    })
  },

  // Analytics & Dashboard
  analytics: {
    getDashboard: async () => request<{ success: boolean; data: any }>('/dashboard/stats'),
    getFinances: async (range: string = '7d') => request<{ success: boolean; data: any }>(`/finances/profit?range=${range}`),
    getRevenue: async (range: string = '7d') => request<{ success: boolean; data: any }>(`/analytics/revenue?range=${range}`),
    getPerformance: async (range: string = '7d', category: string = 'All') => request<{ success: boolean; data: any }>(`/analytics/performance?range=${range}&category=${category}`)
  }
};
