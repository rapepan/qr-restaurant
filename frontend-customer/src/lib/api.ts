import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + '/api',
  timeout: 10000,
});

export const fetchMenu = () => api.get('/menu').then(r => r.data.data);

export const verifyTable = (table: string, token: string) =>
  api.get('/table/verify', { params: { table, token } }).then(r => r.data.data);

export const submitOrder = (payload: {
  table_id: number;
  items: { menu_item_id: number; quantity: number; note?: string }[];
  note?: string;
}) => api.post('/order', payload).then(r => r.data.data);

export const submitPaymentSlip = (orderNumber: string, slip: File) => {
  const form = new FormData();
  form.append('slip', slip);
  return api.post(`/order/${orderNumber}/slip`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  }).then(r => r.data.data);
};

export const getOrder = (order_number: string) =>
  api.get(`/order/${order_number}`).then(r => r.data.data);

export const callStaff = (table_id: number, type: 'call_staff' | 'request_bill') =>
  api.post('/table/call', { table_id, type }).then(r => r.data);

export default api;
