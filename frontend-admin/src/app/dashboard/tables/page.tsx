'use client';

import { useEffect, useState } from 'react';
import { Plus, QrCode, Loader2, Trash2 } from 'lucide-react';
import { getTables, createTable, regenerateToken, deleteTable } from '@/lib/api';
import toast from 'react-hot-toast';

export default function TablesPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrModal, setQrModal] = useState<{ open: boolean; qr?: string; name?: string }>({ open: false });
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [newTable, setNewTable] = useState({ table_number: '', capacity: '4' });

  const load = async () => {
    setLoading(true);
    try {
      setTables(await getTables());
    } catch {
      toast.error('โหลดข้อมูลโต๊ะไม่ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!newTable.table_number.trim()) {
      toast.error('กรุณากรอกหมายเลขโต๊ะ');
      return;
    }

    setAdding(true);
    try {
      const data = await createTable({
        table_number: newTable.table_number.trim(),
        capacity: parseInt(newTable.capacity, 10),
      });
      toast.success(`สร้างโต๊ะ ${newTable.table_number} สำเร็จ`);
      setNewTable({ table_number: '', capacity: '4' });
      setQrModal({ open: true, qr: data.qr_data_url, name: data.table_number });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setAdding(false);
    }
  };

  const handleShowQr = async (id: number, name: string) => {
    try {
      const data = await regenerateToken(id);
      setQrModal({ open: true, qr: data.qr_data_url, name });
    } catch {
      toast.error('โหลด QR Code ไม่ได้');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`ลบโต๊ะ ${name}? ถ้าโต๊ะนี้มีประวัติออเดอร์ ระบบจะซ่อนโต๊ะไว้แทนเพื่อรักษาข้อมูลย้อนหลัง`)) return;

    setDeletingId(id);
    try {
      await deleteTable(id);
      toast.success(`ลบโต๊ะ ${name} สำเร็จ`);
      setTables((prev) => prev.filter((table) => table.id !== id));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'ลบโต๊ะไม่ได้');
    } finally {
      setDeletingId(null);
    }
  };

  const downloadQR = (dataUrl: string, name: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-table-${name}.png`;
    a.click();
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-white">โต๊ะ & QR Code</h1>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">เพิ่มโต๊ะใหม่</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="หมายเลขโต๊ะ เช่น 1, A1"
            value={newTable.table_number}
            onChange={(e) => setNewTable((t) => ({ ...t, table_number: e.target.value }))}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <input
            type="number"
            min="1"
            max="20"
            placeholder="ที่นั่ง"
            value={newTable.capacity}
            onChange={(e) => setNewTable((t) => ({ ...t, capacity: e.target.value }))}
            className="w-20 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            onClick={handleCreate}
            disabled={adding}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            เพิ่ม
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">กำลังโหลด...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {tables.map((table) => (
            <div key={table.id} className="bg-gray-900 rounded-2xl border border-gray-800 p-4 flex flex-col gap-3">
              <div>
                <p className="text-lg font-bold text-white">โต๊ะ {table.table_number}</p>
                <p className="text-xs text-gray-500">{table.capacity} ที่นั่ง</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleShowQr(table.id, table.table_number)}
                  className="flex-1 flex items-center justify-center gap-1 text-xs text-orange-400 bg-orange-900/30 hover:bg-orange-900/50 py-2 rounded-xl transition-colors"
                >
                  <QrCode className="w-3 h-3" /> ดู QR
                </button>
                <button
                  onClick={() => handleDelete(table.id, table.table_number)}
                  disabled={deletingId === table.id}
                  className="flex items-center justify-center gap-1 text-xs text-red-400 bg-red-900/30 hover:bg-red-900/50 py-2 px-3 rounded-xl transition-colors disabled:opacity-60"
                  title="ลบโต๊ะ"
                >
                  {deletingId === table.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {qrModal.open && qrModal.qr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-xs text-center shadow-2xl">
            <h3 className="font-bold text-white mb-4">QR Code โต๊ะ {qrModal.name}</h3>
            <div className="bg-white p-3 rounded-xl inline-block mb-4">
              <img src={qrModal.qr} alt="QR Code" className="w-48 h-48" />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => downloadQR(qrModal.qr!, qrModal.name!)}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                ดาวน์โหลด
              </button>
              <button
                onClick={() => setQrModal({ open: false })}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm py-2.5 rounded-xl transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
