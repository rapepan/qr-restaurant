import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + '/api',
  timeout: 15000,
});

// Attach token on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/admin/refresh`,
          { refreshToken }
        );
        localStorage.setItem('access_token', data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ──────────────────────────────────────────
export const login = (username: string, password: string) =>
  api.post('/admin/login', { username, password }).then(r => r.data.data);

export const logout = () => {
  const refreshToken = localStorage.getItem('refresh_token');
  return api.post('/admin/logout', { refreshToken }).finally(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  });
};

export const getMe = () => api.get('/admin/me').then(r => r.data.data);

// ─── Menu ─────────────────────────────────────────
export const getAdminMenu = () => api.get('/admin/menu').then(r => r.data.data);
export const getCategories = () => api.get('/admin/categories').then(r => r.data.data);
export const createMenuItem = (form: FormData) =>
  api.post('/admin/menu', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data);
export const updateMenuItem = (id: number, form: FormData) =>
  api.put(`/admin/menu/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data);
export const deleteMenuItem = (id: number) => api.delete(`/admin/menu/${id}`).then(r => r.data);
export const createCategory = (data: any) => api.post('/admin/categories', data).then(r => r.data.data);

// ─── Orders ───────────────────────────────────────
export const getOrders = (params?: any) =>
  api.get('/admin/orders', { params }).then(r => r.data.data);
export const updateOrderStatus = (id: number, status: string) =>
  api.patch(`/admin/orders/${id}/status`, { status }).then(r => r.data.data);
export const getStats = (params?: any) =>
  api.get('/admin/orders/stats', { params }).then(r => r.data.data);

// ─── Tables ───────────────────────────────────────
export const getTables = () => api.get('/admin/tables').then(r => r.data.data);
export const createTable = (data: any) => api.post('/admin/tables', data).then(r => r.data.data);
export const regenerateToken = (id: number) =>
  api.post(`/admin/tables/${id}/regenerate-token`).then(r => r.data.data);

// ─── Staff Calls ──────────────────────────────────
export const getCalls = () => api.get('/admin/calls').then(r => r.data.data);
export const acknowledgeCall = (id: number) =>
  api.patch(`/admin/calls/${id}/acknowledge`).then(r => r.data);

export default api;
