'use client';

import { useState } from 'react';
import { X, Loader2, CheckCircle2 } from 'lucide-react';
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
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async () => {
    if (!tableId || !paid) return;

    setLoading(true);
    setError('');
    try {
      const payload = {
        table_id: tableId,
        note: note.trim() || undefined,
        payment_method: 'qr_payment' as const,
        payment_status: 'paid' as const,
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
          <div className="bg-brand-50 rounded-2xl p-3 flex items-center gap-3">
            <span className="text-2xl">🪑</span>
            <div>
              <p className="text-xs text-brand-600 font-medium">โต๊ะของคุณ</p>
              <p className="font-bold text-gray-900">โต๊ะ {tableNumber}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">รายการอาหาร</h3>
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm text-gray-800">{item.name}</p>
                  {item.note && <p className="text-xs text-gray-400 italic">หมายเหตุรายการ: {item.note}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm text-gray-500">x{item.quantity}</p>
                  <p className="text-sm font-semibold text-gray-800">฿{(Number(item.price) * item.quantity).toFixed(0)}</p>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">หมายเหตุออเดอร์ (ถ้ามี)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ไม่ใส่ผัก, ไม่เผ็ด, แยกน้ำซุป..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 flex justify-between font-bold text-base text-gray-900">
            <span>รวมทั้งหมด</span>
            <span className="text-brand-600">฿{total.toFixed(2)}</span>
          </div>

          <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">ชำระเงินก่อนส่งออเดอร์</p>
                <p className="text-xs text-gray-500 mt-0.5">หลังยืนยันชำระเงิน ออเดอร์จะถูกส่งเข้าครัวทันที</p>
              </div>
              <p className="text-sm font-bold text-brand-700">฿{total.toFixed(2)}</p>
            </div>
            <button
              type="button"
              onClick={() => setPaid(true)}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors ${
                paid ? 'bg-green-600 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'
              }`}
            >
              {paid && <CheckCircle2 className="w-4 h-4" />}
              {paid ? 'ยืนยันชำระเงินแล้ว' : 'กดยืนยันว่าชำระเงินแล้ว'}
            </button>
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
            disabled={loading || !paid}
            className="w-full bg-brand-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform shadow-lg shadow-brand-600/30"
          >
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> กำลังส่งออเดอร์...</> : 'ส่งออเดอร์เข้าครัว'}
          </button>
        </div>
      </div>
    </div>
  );
}
