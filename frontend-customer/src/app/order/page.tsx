'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShoppingCart, Bell, Receipt, ChevronUp, Search, Star, Loader2, CheckCircle2, X } from 'lucide-react';
import { fetchMenu, verifyTable, callStaff } from '@/lib/api';
import { useCartStore, type MenuItem } from '@/store/cartStore';
import MenuItemCard from '@/components/MenuItemCard';
import CartSheet from '@/components/CartSheet';
import CartConfirm from '@/components/CartConfirm';
import Toast from '@/components/Toast';

type Category = {
  id: number;
  name: string;
  icon?: string;
  items: MenuItem[];
};

type ToastState = { message: string; type: 'success' | 'error' | 'info' } | null;

export default function OrderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const table  = searchParams.get('table') ?? '';
  const token  = searchParams.get('token') ?? '';

  const { setTable, tableId, getTotal, getCount } = useCartStore();
  const count = getCount();
  const total = getTotal();

  const [menu, setMenu]           = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [cartOpen, setCartOpen]   = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast]         = useState<ToastState>(null);

  const catRefs = useRef<Record<number, HTMLElement | null>>({});

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!table || !token) { setError('QR Code ไม่ถูกต้อง'); setLoading(false); return; }

    (async () => {
      try {
        const [tableData, menuData] = await Promise.all([
          verifyTable(table, token),
          fetchMenu(),
        ]);
        setTable(tableData.id, tableData.table_number, token);
        setMenu(menuData);
        if (menuData.length) setActiveCat(menuData[0].id);
      } catch {
        setError('ไม่สามารถโหลดข้อมูลได้ กรุณาสแกน QR ใหม่');
      } finally {
        setLoading(false);
      }
    })();
  }, [table, token]);

  const scrollToCategory = (catId: number) => {
    setActiveCat(catId);
    catRefs.current[catId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCallStaff = async (type: 'call_staff' | 'request_bill') => {
    if (!tableId) return;
    try {
      await callStaff(tableId, type);
      const msg = type === 'request_bill' ? '✅ ส่งคำขอเช็กบิลแล้ว พนักงานกำลังมา' : '✅ เรียกพนักงานแล้ว กรุณารอสักครู่';
      showToast(msg, 'success');
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    }
  };

  const filteredMenu = search.trim()
    ? menu.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
          item.name.includes(search) || (item.name_en?.toLowerCase().includes(search.toLowerCase()))
        ),
      })).filter(cat => cat.items.length > 0)
    : menu;

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      <p className="text-gray-500 text-sm">กำลังโหลดเมนู...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 text-center">
      <div className="text-5xl mb-4">🍽️</div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">ไม่สามารถเข้าถึงได้</h2>
      <p className="text-gray-500 text-sm">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto relative">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="font-bold text-gray-900 text-base leading-tight">🍽️ สั่งอาหาร</h1>
            <p className="text-xs text-gray-400">โต๊ะ {table}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCallStaff('call_staff')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 active:scale-95 transition-transform"
            >
              <Bell className="w-3.5 h-3.5" /> เรียกพนักงาน
            </button>
            <button
              onClick={() => handleCallStaff('request_bill')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 active:scale-95 transition-transform"
            >
              <Receipt className="w-3.5 h-3.5" /> เช็กบิล
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาเมนู..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-100 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        {!search && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
            {menu.map((cat) => (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
                  activeCat === cat.id
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {cat.icon && <span>{cat.icon}</span>}
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Menu Content */}
      <main className="pb-32 px-4 pt-4 space-y-8">
        {filteredMenu.map((cat) => (
          <section
            key={cat.id}
            ref={(el) => { catRefs.current[cat.id] = el; }}
          >
            <div className="flex items-center gap-2 mb-3">
              {cat.icon && <span className="text-xl">{cat.icon}</span>}
              <h2 className="text-base font-bold text-gray-800">{cat.name}</h2>
              <span className="text-xs text-gray-400 ml-auto">{cat.items.length} รายการ</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {cat.items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onAdd={() => showToast(`เพิ่ม ${item.name} ลงตะกร้าแล้ว`, 'success')}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Cart FAB */}
      {count > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full flex items-center justify-between bg-brand-600 text-white px-5 py-3.5 rounded-2xl shadow-xl shadow-brand-600/30 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-2 -right-2 bg-white text-brand-700 text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {count}
                </span>
              </div>
              <span className="font-medium text-sm">ดูตะกร้า</span>
            </div>
            <span className="font-bold">฿{total.toFixed(0)}</span>
          </button>
        </div>
      )}

      {/* Cart Sheet */}
      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onConfirm={() => { setCartOpen(false); setConfirmOpen(true); }}
      />

      {/* Confirm Order */}
      <CartConfirm
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        tableNumber={table}
        onSuccess={(orderNumber) => {
          router.push(`/order/status/${orderNumber}?table=${table}`);
        }}
      />

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
