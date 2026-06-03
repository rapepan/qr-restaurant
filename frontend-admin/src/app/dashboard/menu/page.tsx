'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2, X, ImageIcon } from 'lucide-react';
import { getAdminMenu, getCategories, createMenuItem, updateMenuItem, deleteMenuItem } from '@/lib/api';
import toast from 'react-hot-toast';

export default function MenuPage() {
  const [menu,       setMenu]       = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState<{ open: boolean; item?: any }>({ open: false });
  const [saving,     setSaving]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>('');

  const [form, setForm] = useState({
    category_id: '', name: '', name_en: '', description: '',
    price: '', is_available: true, is_recommended: false, sort_order: '0',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [m, c] = await Promise.all([getAdminMenu(), getCategories()]);
      setMenu(m); setCategories(c);
    } catch { toast.error('โหลดข้อมูลไม่ได้'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ category_id: categories[0]?.id ?? '', name: '', name_en: '', description: '', price: '', is_available: true, is_recommended: false, sort_order: '0' });
    setPreview('');
    setModal({ open: true });
  };

  const openEdit = (item: any) => {
    setForm({
      category_id: item.category_id, name: item.name, name_en: item.name_en || '', description: item.description || '',
      price: item.price, is_available: !!item.is_available, is_recommended: !!item.is_recommended, sort_order: item.sort_order,
    });
    setPreview(item.image_url || '');
    setModal({ open: true, item });
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.category_id) {
      toast.error('กรุณากรอกข้อมูลให้ครบ'); return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      const file = fileRef.current?.files?.[0];
      if (file) fd.append('image', file);

      if (modal.item) { await updateMenuItem(modal.item.id, fd); toast.success('แก้ไขเมนูสำเร็จ'); }
      else            { await createMenuItem(fd); toast.success('เพิ่มเมนูสำเร็จ'); }

      setModal({ open: false });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`ลบเมนู "${name}" ใช่หรือไม่?`)) return;
    try {
      await deleteMenuItem(id);
      toast.success('ลบเมนูสำเร็จ');
      load();
    } catch { toast.error('ลบไม่ได้'); }
  };

  const handleToggleAvailable = async (item: any) => {
    const fd = new FormData();
    fd.append('is_available', String(!item.is_available));
    fd.append('name', item.name);
    fd.append('price', item.price);
    fd.append('category_id', item.category_id);
    try {
      await updateMenuItem(item.id, fd);
      load();
    } catch { toast.error('เกิดข้อผิดพลาด'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">จัดการเมนู</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> เพิ่มเมนู
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">กำลังโหลด...</div>
      ) : (
        menu.map((cat) => (
          <div key={cat.id} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-800">
              <span className="text-lg">{cat.icon}</span>
              <h2 className="font-semibold text-white text-sm">{cat.name}</h2>
              <span className="text-xs text-gray-500 ml-auto">{cat.items.length} รายการ</span>
            </div>
            <div className="divide-y divide-gray-800">
              {cat.items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${item.is_available ? 'text-white' : 'text-gray-500 line-through'}`}>{item.name}</p>
                    <p className="text-sm font-bold text-orange-400">฿{item.price}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => handleToggleAvailable(item)} className="p-1.5 rounded-lg hover:bg-gray-800">
                      {item.is_available
                        ? <ToggleRight className="w-5 h-5 text-green-400" />
                        : <ToggleLeft  className="w-5 h-5 text-gray-600" />}
                    </button>
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id, item.name)} className="p-1.5 rounded-lg hover:bg-red-900/30 text-gray-400 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h3 className="font-bold text-white">{modal.item ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}</h3>
              <button onClick={() => setModal({ open: false })} className="p-1 rounded-lg hover:bg-gray-800">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Image */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">รูปภาพ</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-700 rounded-xl p-4 text-center cursor-pointer hover:border-orange-500 transition-colors"
                >
                  {preview ? (
                    <img src={preview} alt="preview" className="w-full h-32 object-cover rounded-lg" />
                  ) : (
                    <div className="text-gray-500 text-sm py-4">คลิกเพื่อเลือกรูป</div>
                  )}
                </div>
                <input
                  ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setPreview(URL.createObjectURL(f));
                  }}
                />
              </div>

              {/* Fields */}
              {[
                { label: 'หมวดหมู่ *', type: 'select' },
                { label: 'ชื่อเมนู *',  key: 'name',        placeholder: 'เช่น ข้าวผัดกุ้ง' },
                { label: 'ชื่อ (EN)',    key: 'name_en',     placeholder: 'Shrimp Fried Rice' },
                { label: 'คำอธิบาย',    key: 'description', placeholder: 'รายละเอียดสั้นๆ', textarea: true },
                { label: 'ราคา (฿) *',  key: 'price',        placeholder: '0.00', inputType: 'number' },
              ].map((field: any) => (
                <div key={field.label}>
                  <label className="text-xs text-gray-400 mb-1.5 block">{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      value={form.category_id}
                      onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                  ) : field.textarea ? (
                    <textarea
                      value={(form as any)[field.key]}
                      onChange={(e) => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder} rows={2}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    />
                  ) : (
                    <input
                      type={field.inputType || 'text'}
                      value={(form as any)[field.key]}
                      onChange={(e) => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  )}
                </div>
              ))}

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} className="w-4 h-4 rounded accent-orange-500" />
                  เปิดขาย
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={form.is_recommended} onChange={e => setForm(f => ({ ...f, is_recommended: e.target.checked }))} className="w-4 h-4 rounded accent-orange-500" />
                  แนะนำ
                </label>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-800">
              <button
                onClick={handleSave} disabled={saving}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก...</> : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
