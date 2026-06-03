'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, UtensilsCrossed, ClipboardList,
  Table2, BarChart3, LogOut, Bell, Menu as MenuIcon, X
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { getMe, logout } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast, { Toaster } from 'react-hot-toast';

const NAV = [
  { href: '/dashboard',        label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/dashboard/orders', label: 'ออเดอร์',      icon: ClipboardList   },
  { href: '/dashboard/menu',   label: 'จัดการเมนู',    icon: UtensilsCrossed },
  { href: '/dashboard/tables', label: 'โต๊ะ & QR',     icon: Table2          },
  { href: '/dashboard/stats',  label: 'ยอดขาย',       icon: BarChart3       },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, setUser, clearUser } = useAuthStore();
  const [sideOpen, setSideOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  // Verify auth + load user
  useEffect(() => {
    if (!localStorage.getItem('access_token')) {
      router.replace('/login');
      return;
    }
    if (!user) {
      getMe().then(u => setUser(u, localStorage.getItem('access_token')!, localStorage.getItem('refresh_token')!))
        .catch(() => { clearUser(); router.replace('/login'); });
    }
  }, []);

  // Socket.IO
  useEffect(() => {
    const socket: Socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, { transports: ['websocket'] });
    socket.emit('join_admin');

    socket.on('new_order', (order) => {
      toast(`🛎️ ออเดอร์ใหม่! โต๊ะ ${order.table_number}`, { duration: 5000 });
      setNotifCount(c => c + 1);
    });

    socket.on('staff_call', (call) => {
      const msg = call.type === 'request_bill'
        ? `💳 ขอเช็กบิล โต๊ะ ${call.table_number}`
        : `🔔 เรียกพนักงาน โต๊ะ ${call.table_number}`;
      toast(msg, { duration: 8000, icon: '⚡' });
      setNotifCount(c => c + 1);
    });

    return () => { socket.disconnect(); };
  }, []);

  const handleLogout = async () => {
    await logout().catch(() => {});
    clearUser();
    router.replace('/login');
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1f2937', color: '#fff', border: '1px solid #374151' } }} />

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-60 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-300
        lg:relative lg:translate-x-0
        ${sideOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🍽️</span>
            <div>
              <p className="font-bold text-sm text-white leading-none">Restaurant</p>
              <p className="text-[10px] text-gray-500">Admin Panel</p>
            </div>
          </div>
          <button onClick={() => setSideOpen(false)} className="lg:hidden">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSideOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold">
              {user?.full_name?.[0] ?? 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Backdrop mobile */}
      {sideOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSideOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center px-5 gap-4 flex-shrink-0">
          <button onClick={() => setSideOpen(true)} className="lg:hidden">
            <MenuIcon className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex-1" />
          <button
            onClick={() => { setNotifCount(0); router.push('/dashboard/orders'); }}
            className="relative p-2 rounded-xl hover:bg-gray-800 transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-400" />
            {notifCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-950 p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
