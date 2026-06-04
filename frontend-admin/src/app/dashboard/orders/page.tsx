'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { getOrders, updateOrderStatus } from '@/lib/api';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'pending', label: 'รอรับออเดอร์' },
  { value: 'confirmed', label: 'รับออเดอร์' },
  { value: 'served', label: 'เสิร์ฟแล้ว' },
];

const NEXT_STATUS: Record<string, { status: string; label: string }> = {
  pending: { status: 'confirmed', label: 'รับออเดอร์' },
  confirmed: { status: 'served', label: 'เสิร์ฟแล้ว' },
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
  confirmed: 'bg-blue-900/40 text-blue-400 border-blue-800',
  served: 'bg-gray-700/60 text-gray-300 border-gray-600',
  cancelled: 'bg-red-900/40 text-red-400 border-red-800',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filterStatus, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getOrders(filterStatus ? { status: filterStatus } : {});
      setOrders(data);
    } catch {
      toast.error('โหลดออเดอร์ไม่ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterStatus]);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, { transports: ['websocket'] });
    socket.emit('join_admin');
    socket.on('new_order', (order) => {
      setOrders((prev) => [{ ...order }, ...prev]);
    });
    socket.on('order_status_updated', ({ order_id, status }) => {
      setOrders((prev) => prev.map((o) => (o.id === parseInt(order_id, 10) ? { ...o, status } : o)));
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleUpdateStatus = async (orderId: number, status: string) => {
    try {
      await updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      toast.success('อัปเดตสถานะสำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">ออเดอร์ทั้งหมด</h1>
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-gray-800 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> รีเฟรช
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filterStatus === opt.value ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">กำลังโหลด...</div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const next = NEXT_STATUS[order.status];
            const statusLabel = STATUS_OPTIONS.find((s) => s.value === order.status)?.label || order.status;

            return (
              <div key={order.id} className={`bg-gray-900 rounded-2xl border overflow-hidden transition-all ${STATUS_COLOR[order.status] || 'border-gray-800'}`}>
                <div
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-white font-medium">{order.order_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[order.status]}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      โต๊ะ {order.table_number} · {order.items?.length ?? 0} รายการ ·{' '}
                      {new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-white flex-shrink-0">฿{parseFloat(order.total).toFixed(0)}</p>
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${expanded === order.id ? 'rotate-180' : ''}`} />
                </div>

                {expanded === order.id && (
                  <div className="border-t border-gray-800 px-4 py-3 space-y-3">
                    <div className="space-y-1.5">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between gap-3 text-sm">
                          <div className="min-w-0">
                            <p className="text-gray-300">{item.name} x{item.quantity}</p>
                            {item.note && <p className="text-xs text-amber-300 italic">หมายเหตุรายการ: {item.note}</p>}
                          </div>
                          <span className="text-gray-400 flex-shrink-0">฿{item.total_price}</span>
                        </div>
                      ))}
                    </div>
                    {order.note && (
                      <p className="text-xs text-amber-400 italic bg-amber-900/20 px-3 py-2 rounded-xl">
                        หมายเหตุออเดอร์: {order.note}
                      </p>
                    )}

                    {next && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleUpdateStatus(order.id, next.status)}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
                        >
                          {next.label}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {orders.length === 0 && (
            <div className="text-center py-12 text-gray-500">ไม่มีออเดอร์</div>
          )}
        </div>
      )}
    </div>
  );
}
