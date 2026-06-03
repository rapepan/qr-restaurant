'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getStats } from '@/lib/api';
import toast from 'react-hot-toast';

export default function StatsPage() {
  const [stats,   setStats]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range,   setRange]   = useState({ start: '', end: '' });

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  useEffect(() => {
    setRange({ start: weekAgo, end: today });
    load(weekAgo, today);
  }, []);

  const load = async (start: string, end: string) => {
    setLoading(true);
    try {
      const data = await getStats({ start_date: start, end_date: end });
      setStats(data);
    } catch { toast.error('โหลดข้อมูลไม่ได้'); }
    finally { setLoading(false); }
  };

  const totalRevenue = stats?.revenue?.reduce((s: number, r: any) => s + parseFloat(r.total_revenue || 0), 0) ?? 0;
  const totalOrders  = stats?.revenue?.reduce((s: number, r: any) => s + parseInt(r.total_orders || 0), 0) ?? 0;

  const chartData = stats?.revenue?.map((r: any) => ({
    date: new Date(r.date).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' }),
    ยอดขาย: parseFloat(r.total_revenue || 0),
    ออเดอร์: parseInt(r.total_orders || 0),
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <h1 className="text-xl font-bold text-white">ยอดขาย</h1>
        <div className="flex items-center gap-2 text-sm">
          <input
            type="date" value={range.start}
            onChange={(e) => setRange(r => ({ ...r, start: e.target.value }))}
            className="bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <span className="text-gray-500">ถึง</span>
          <input
            type="date" value={range.end}
            onChange={(e) => setRange(r => ({ ...r, end: e.target.value }))}
            className="bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            onClick={() => load(range.start, range.end)}
            className="bg-orange-500 text-white px-4 py-2 rounded-xl hover:bg-orange-600 transition-colors"
          >
            ดู
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <p className="text-xs text-gray-400 mb-1">รายได้รวม</p>
          <p className="text-2xl font-bold text-green-400">฿{totalRevenue.toFixed(0)}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <p className="text-xs text-gray-400 mb-1">ออเดอร์รวม</p>
          <p className="text-2xl font-bold text-blue-400">{totalOrders}</p>
        </div>
      </div>

      {/* Revenue Chart */}
      {!loading && chartData.length > 0 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">รายได้รายวัน</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', color: '#fff' }}
                formatter={(v: number) => [`฿${v.toFixed(0)}`, 'ยอดขาย']}
              />
              <Bar dataKey="ยอดขาย" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top items */}
      {stats?.topItems?.length > 0 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">เมนูขายดี</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {stats.topItems.map((item: any, idx: number) => (
              <div key={item.name} className="flex items-center gap-3 px-5 py-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  idx === 0 ? 'bg-amber-500 text-white' :
                  idx === 1 ? 'bg-gray-400 text-gray-900' :
                  idx === 2 ? 'bg-orange-700 text-white' : 'bg-gray-800 text-gray-400'
                }`}>{idx + 1}</span>
                <p className="flex-1 text-sm text-white truncate">{item.name}</p>
                <p className="text-xs text-gray-400 flex-shrink-0">{item.qty} จาน</p>
                <p className="text-sm font-semibold text-green-400 flex-shrink-0">฿{parseFloat(item.revenue).toFixed(0)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <div className="text-center py-12 text-gray-500">กำลังโหลด...</div>}
    </div>
  );
}
