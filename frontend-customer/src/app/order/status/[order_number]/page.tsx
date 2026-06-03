'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, ChefHat, Utensils } from 'lucide-react';
import { getOrder } from '@/lib/api';
import { io } from 'socket.io-client';

const STATUS_STEPS = [
  { key: 'pending',    label: 'รับออเดอร์แล้ว',    icon: CheckCircle2, color: 'text-blue-500'   },
  { key: 'confirmed',  label: 'ยืนยันออเดอร์',       icon: CheckCircle2, color: 'text-blue-500'   },
  { key: 'preparing',  label: 'กำลังปรุงอาหาร',      icon: ChefHat,      color: 'text-amber-500'  },
  { key: 'ready',      label: 'อาหารพร้อมแล้ว',      icon: Utensils,     color: 'text-green-500'  },
  { key: 'served',     label: 'เสิร์ฟแล้ว',           icon: CheckCircle2, color: 'text-green-600'  },
];

const statusIndex = (s: string) => STATUS_STEPS.findIndex((st) => st.key === s);

export default function OrderStatusPage() {
  const { order_number } = useParams() as { order_number: string };
  const searchParams = useSearchParams();
  const table = searchParams.get('table') ?? '';

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrder(order_number)
      .then(setOrder)
      .finally(() => setLoading(false));

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, { transports: ['websocket'] });
    socket.on('order_status_updated', (data: any) => {
      if (data.order?.order_number === order_number) {
        setOrder((prev: any) => ({ ...prev, status: data.status }));
      }
    });
    return () => { socket.disconnect(); };
  }, [order_number]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
    </div>
  );

  if (!order) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">ไม่พบออเดอร์</p>
    </div>
  );

  const currentIdx = statusIndex(order.status);

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-white px-5 pt-10 pb-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-bold text-xl text-gray-900">สถานะออเดอร์</h1>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">โต๊ะ {table}</span>
        </div>
        <p className="text-sm text-gray-500 font-mono">{order.order_number}</p>
      </div>

      <div className="px-5 py-6 space-y-6">
        {/* Status steps */}
        <div className="bg-white rounded-2xl p-5 space-y-4 shadow-sm">
          {STATUS_STEPS.map((step, idx) => {
            const done    = idx <= currentIdx;
            const active  = idx === currentIdx;
            const Icon    = step.icon;
            return (
              <div key={step.key} className="flex items-center gap-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  done ? 'bg-brand-100' : 'bg-gray-100'
                }`}>
                  <Icon className={`w-4 h-4 ${done ? step.color : 'text-gray-300'}`} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${done ? 'text-gray-900' : 'text-gray-300'}`}>{step.label}</p>
                  {active && order.status !== 'served' && (
                    <p className="text-xs text-brand-500 animate-pulse">กำลังดำเนินการ...</p>
                  )}
                </div>
                {done && <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Order items */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">รายการที่สั่ง</h3>
          <div className="space-y-2.5">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <div>
                  <span className="text-gray-800">{item.name}</span>
                  {item.note && <p className="text-xs text-gray-400 italic">"{item.note}"</p>}
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-xs">x{item.quantity}</p>
                  <p className="font-semibold text-gray-900">฿{item.total_price}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between font-bold text-gray-900">
            <span>รวม</span>
            <span className="text-brand-600">฿{parseFloat(order.total).toFixed(2)}</span>
          </div>
        </div>

        {/* Back to menu */}
        <a
          href={`/order?table=${table}&token=${searchParams.get('token') ?? ''}`}
          className="block text-center py-3 text-sm text-brand-600 font-medium"
        >
          ← กลับหน้าเมนู
        </a>
      </div>
    </div>
  );
}
