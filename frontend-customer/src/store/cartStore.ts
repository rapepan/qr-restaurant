import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MenuItem {
  id: number;
  category_id: number;
  name: string;
  name_en?: string;
  description?: string;
  price: number;
  image_url?: string;
  is_recommended: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
  note?: string;
}

interface CartStore {
  items: CartItem[];
  tableId: number | null;
  tableNumber: string | null;
  tableToken: string | null;
  addItem: (item: MenuItem, qty?: number, note?: string) => void;
  removeItem: (id: number) => void;
  updateQty: (id: number, qty: number) => void;
  updateNote: (id: number, note: string) => void;
  clearCart: () => void;
  setTable: (id: number, number: string, token: string) => void;
  getTotal: () => number;
  getCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      tableId: null,
      tableNumber: null,
      tableToken: null,

      addItem: (item, qty = 1, note = '') => {
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + qty } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: qty, note }] };
        });
      },

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      updateQty: (id, qty) => {
        if (qty <= 0) { get().removeItem(id); return; }
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
        }));
      },

      updateNote: (id, note) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, note } : i)),
        })),

      clearCart: () => set({ items: [] }),

      setTable: (id, number, token) =>
        set({ tableId: id, tableNumber: number, tableToken: token }),

      getTotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      getCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'qr-restaurant-cart' }
  )
);
