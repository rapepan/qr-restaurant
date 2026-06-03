'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { submitOrder } from '@/lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  tableNumber: string;
  onSuccess: (orderNumber: string) => void;
}

export default function CartConfirm({ open, onClose, tableNumber, onSuccess }: Props) {
  const { items, tableId, getTotal, clearCart } = useCartStore();
  const total = getTotal();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const TAX = total * 0.07;

  if (!open) return null;

  const handleSubmit = async () => {
    if (!tableId) return;
    setLoading(true);
    setError('');
    try {
      const payload = {
        table_id: tableId,
        note: note.trim() || undefined,
        items: items.map((i) => ({
          menu_item_id: i.id,
          quantity: i.quantity,
          note: i.note || undefined,
        })),
      };
      const order = await submitOrder(payload);
      clearCart();
      onSuccess(order.order_number);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={!loading ? onClose : undefined} />
      <div className="relative bg-white rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg">ยืนยันการสั่งอาหาร</h2>
          <button onClick={onClose} disabled={loading} className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Table info */}
          <div className="bg-brand-50 rounded-2xl p-3 flex items-center gap-3">
            <span className="text-2xl">🪑</span>
            <div>
              <p className="text-xs text-brand-600 font-medium">โต๊ะของคุณ</p>
              <p className="font-bold text-gray-900">โต๊ะ {tableNumber}</p>
            </div>
          </div>

          {/* Items list */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">รายการอาหาร</h3>
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-gray-800">{item.name}</p>
                  {item.note && <p className="text-xs text-gray-400 italic">"{item.note}"</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm text-gray-500">x{item.quantity}</p>
                  <p className="text-sm font-semibold text-gray-800">฿{(item.price * item.quantity).toFixed(0)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Note */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">หมายเหตุ (ถ้ามี)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ไม่ใส่ผัก, ไม่เผ็ด..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>

          {/* Price summary */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>ยอดรวม</span><span>฿{total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>VAT 7%</span><span>฿{TAX.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t border-gray-200">
              <span>รวมทั้งหมด</span>
              <span className="text-brand-600">฿{(total + TAX).toFixed(2)}</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 pb-8 pt-3 safe-bottom">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-brand-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98] transition-transform shadow-lg shadow-brand-600/30"
          >
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> กำลังส่งออเดอร์...</> : '🛎️ สั่งอาหารเลย!'}
          </button>
        </div>
      </div>
    </div>
  );
}
