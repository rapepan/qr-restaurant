'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Loader2, Upload, CheckCircle2 } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { submitOrder, submitPaymentSlip } from '@/lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  tableNumber: string;
  onSuccess: (orderNumber: string) => void;
}

export default function CartConfirm({ open, onClose, tableNumber, onSuccess }: Props) {
  const { items, tableId, getTotal, clearCart } = useCartStore();
  const total = getTotal();
  const [pendingOrder, setPendingOrder] = useState<any>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const autoCreateStarted = useRef(false);

  const handleCreateOrder = async () => {
    if (!tableId || creating) return;

    setCreating(true);
    setError('');
    try {
      const order = await submitOrder({
        table_id: tableId,
        items: items.map((i) => ({
          menu_item_id: i.id,
          quantity: i.quantity,
          note: i.note?.trim() || undefined,
        })),
      });
      setPendingOrder(order);
    } catch (err: any) {
      autoCreateStarted.current = false;
      setError(err?.response?.data?.message || 'สร้าง QR ชำระเงินไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (!open || pendingOrder || autoCreateStarted.current) return;
    autoCreateStarted.current = true;
    handleCreateOrder();
  }, [open, pendingOrder]);

  if (!open) return null;

  const resetAndClose = () => {
    if (creating || verifying) return;
    autoCreateStarted.current = false;
    setPendingOrder(null);
    setSlipFile(null);
    setError('');
    onClose();
  };

  const handleVerifySlip = async () => {
    if (!pendingOrder?.order_number || !slipFile) return;

    setVerifying(true);
    setError('');
    try {
      const paidOrder = await submitPaymentSlip(pendingOrder.order_number, slipFile);
      clearCart();
      onSuccess(paidOrder.order_number);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'ตรวจสอบสลิปไม่ผ่าน กรุณาตรวจสอบยอดเงินแล้วลองใหม่');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={resetAndClose} />
      <div className="relative bg-white rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg">
            {pendingOrder ? 'ชำระเงินและอัปโหลดสลิป' : 'กำลังสร้าง QR ชำระเงิน'}
          </h2>
          <button onClick={resetAndClose} disabled={creating || verifying} className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="bg-brand-50 rounded-2xl p-3">
            <p className="text-xs text-brand-600 font-medium">โต๊ะของคุณ</p>
            <p className="font-bold text-gray-900">โต๊ะ {tableNumber}</p>
          </div>

          {!pendingOrder ? (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">รายการอาหาร</h3>
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-400">x{item.quantity}</p>
                      {item.note && <p className="text-xs text-amber-600 mt-1">หมายเหตุ: {item.note}</p>}
                    </div>
                    <p className="text-sm font-semibold text-gray-800 flex-shrink-0">
                      ฿{(Number(item.price) * item.quantity).toFixed(0)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 flex justify-between font-bold text-base text-gray-900">
                <span>รวมทั้งหมด</span>
                <span className="text-brand-600">฿{total.toFixed(2)}</span>
              </div>

              <div className="rounded-2xl bg-brand-50 border border-brand-100 px-4 py-4 flex items-center justify-center gap-2 text-brand-700">
                <Loader2 className="w-5 h-5 animate-spin" />
                <p className="text-sm font-semibold">กำลังสร้าง QR ชำระเงิน...</p>
              </div>

              {error && (
                <button
                  onClick={handleCreateOrder}
                  disabled={creating}
                  className="w-full bg-brand-600 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {creating ? <><Loader2 className="w-5 h-5 animate-spin" /> กำลังลองใหม่...</> : 'ลองสร้าง QR อีกครั้ง'}
                </button>
              )}
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-center space-y-3">
                <p className="text-sm font-semibold text-gray-900">สแกนจ่าย PromptPay</p>
                {pendingOrder.payment?.qr_data_url ? (
                  <div className="bg-white p-3 rounded-xl inline-block">
                    <img src={pendingOrder.payment.qr_data_url} alt="PromptPay QR" className="w-52 h-52" />
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-xl text-sm text-red-500">ไม่พบ QR ชำระเงิน</div>
                )}
                <p className="text-xs text-gray-500 font-mono">{pendingOrder.order_number}</p>
                <p className="text-xl font-bold text-brand-700">฿{Number(pendingOrder.total).toFixed(2)}</p>
              </div>

              <label className="block rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center cursor-pointer">
                <Upload className="w-5 h-5 text-brand-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-800">
                  {slipFile ? slipFile.name : 'อัปโหลดสลิปโอนเงิน'}
                </p>
                <p className="text-xs text-gray-400 mt-1">รองรับ JPG, PNG, WEBP</p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
                />
              </label>

              <div className="rounded-2xl bg-green-50 border border-green-100 px-4 py-3 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-green-700">
                  ออเดอร์จะเข้าครัวอัตโนมัติเมื่อระบบตรวจสลิปแล้วว่ายอดตรงและไม่ใช่สลิปซ้ำ
                </p>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 pb-8 pt-3 safe-bottom">
          <button
            onClick={handleVerifySlip}
            disabled={!pendingOrder || verifying || !slipFile}
            className="w-full bg-brand-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform shadow-lg shadow-brand-600/30"
          >
            {verifying ? <><Loader2 className="w-5 h-5 animate-spin" /> กำลังตรวจสลิป...</> : 'ส่งสลิปเพื่อตรวจสอบ'}
          </button>
        </div>
      </div>
    </div>
  );
}
