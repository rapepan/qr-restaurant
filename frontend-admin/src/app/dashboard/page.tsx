'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, TrendingUp, Table2, Clock } from 'lucide-react';
import { getOrders, getStats, getTables } from '@/lib/api';

export default function DashboardPage() {
  const [stats,  setStats]  = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    Promise.all([
      getStats({ start_date: today, end_date: today }),
      getOrders({ status: 'pending,confirmed' }),
      getTables(),
    ]).then(([s, o, t]) => {
      setStats(s);
      setOrders(o);
      setTables(t);
    }).catch(console.error);
  }, []);

  const todayStats = stats?.revenue?.[0];
  const occupiedCount = tables.filter(t => t.status === 'occupied').length;
  const activeOrders  = orders.filter(o => ['pending','confirmed'].includes(o.status)).length;

  const CARDS = [
    { label: 'รายได้วันนี้',     value: todayStats ? `฿${parseFloat(todayStats.total_revenue||0).toFixed(0)}` : '฿0', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-900/30' },
    { label: 'ออเดอร์วันนี้',    value: todayStats?.total_orders ?? 0, icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-900/30'  },
    { label: 'โต๊ะที่กำลังใช้',  value: `${occupiedCount}/${tables.length}`, icon: Table2, color: 'text-amber-400', bg: 'bg-amber-900/30' },
    { label: 'ออเดอร์รอดำเนินการ', value: activeOrders, icon: Clock, color: 'text-red-400', bg: 'bg-red-900/30' },
  ];

  const STATUS_LABEL: Record<string, string> = {
    pending: 'รอรับออเดอร์',
    confirmed: 'รับออเดอร์',
    served: 'เสิร์ฟแล้ว',
  };
  const STATUS_COLOR: Record<string, string> = {
    pending: 'bg-yellow-900/40 text-yellow-400',
    confirmed: 'bg-blue-900/40 text-blue-400',
    served: 'bg-gray-700 text-gray-300',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-white text-sm">ออเดอร์ล่าสุด</h2>
          <a href="/dashboard/orders" className="text-xs text-orange-400 hover:underline">ดูทั้งหมด →</a>
        </div>
        <div className="divide-y divide-gray-800">
          {orders.slice(0, 8).map((order) => (
            <div key={order.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{order.order_number}</p>
                <p className="text-xs text-gray-500">โต๊ะ {order.table_number} · {order.items?.length ?? 0} รายการ</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${STATUS_COLOR[order.status] || 'bg-gray-700 text-gray-400'}`}>
                {STATUS_LABEL[order.status] || order.status}
              </span>
              <p className="text-sm font-semibold text-white flex-shrink-0">฿{parseFloat(order.total).toFixed(0)}</p>
            </div>
          ))}
          {orders.length === 0 && (
            <div className="text-center py-10 text-gray-500 text-sm">ไม่มีออเดอร์ที่รอดำเนินการ</div>
          )}
        </div>
      </div>
    </div>
  );
}
