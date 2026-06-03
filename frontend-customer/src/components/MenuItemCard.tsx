'use client';

import { useState } from 'react';
import { Plus, Minus, Star } from 'lucide-react';
import { useCartStore, type MenuItem } from '@/store/cartStore';

export default function MenuItemCard({ item, onAdd }: { item: MenuItem; onAdd?: () => void }) {
  const { items, addItem, updateQty } = useCartStore();
  const cartItem = items.find((i) => i.id === item.id);
  const qty = cartItem?.quantity ?? 0;
  const [imgError, setImgError] = useState(false);

  const handleAdd = () => {
    addItem(item);
    onAdd?.();
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {item.image_url && !imgError ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">
            🍽️
          </div>
        )}
        {item.is_recommended && (
          <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-amber-400 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
            <Star className="w-2.5 h-2.5 fill-white" /> แนะนำ
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 flex flex-col flex-1">
        <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2">{item.name}</p>
        {item.description && (
          <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{item.description}</p>
        )}
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-sm font-bold text-brand-600">฿{item.price.toFixed(0)}</span>
          {qty === 0 ? (
            <button
              onClick={handleAdd}
              className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center active:scale-90 transition-transform shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => updateQty(item.id, qty - 1)}
                className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform"
              >
                <Minus className="w-3 h-3 text-gray-600" />
              </button>
              <span className="text-xs font-bold text-gray-800 w-4 text-center">{qty}</span>
              <button
                onClick={() => updateQty(item.id, qty + 1)}
                className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center active:scale-90 transition-transform"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
