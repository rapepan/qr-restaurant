'use client';

import { X, Trash2, Plus, Minus } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function CartSheet({ open, onClose, onConfirm }: Props) {
  const { items, updateQty, removeItem, clearCart, getTotal } = useCartStore();
  const total = getTotal();
  const TAX_RATE = 0.07;
  const subtotal = total;
  const tax = subtotal * TAX_RATE;
  const grandTotal = subtotal + tax;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">ตะกร้าของคุณ</h2>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-600">
                ล้างทั้งหมด
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">🛒</p>
              <p className="text-sm">ตะกร้าว่างเปล่า</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">🍽️</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-brand-600 font-semibold">฿{(Number(item.price) * item.quantity).toFixed(0)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => updateQty(item.id, item.quantity - 1)}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center active:scale-90"
                  >
                    {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-red-400" /> : <Minus className="w-3.5 h-3.5 text-gray-600" />}
                  </button>
                  <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.id, item.quantity + 1)}
                    className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center active:scale-90"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary + CTA */}
        {items.length > 0 && (
          <div className="px-5 pt-3 pb-6 border-t border-gray-100 space-y-3 safe-bottom">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>ยอดรวม</span><span>฿{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>VAT 7%</span><span>฿{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
                <span>รวมทั้งหมด</span><span className="text-brand-600">฿{grandTotal.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={onConfirm}
              className="w-full bg-brand-600 text-white font-semibold py-3.5 rounded-2xl active:scale-[0.98] transition-transform shadow-lg shadow-brand-600/30"
            >
              ยืนยันออเดอร์
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
