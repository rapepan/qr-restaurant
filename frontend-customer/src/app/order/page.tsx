import { Suspense } from 'react';
import OrderPageContent from './OrderPageContent';

export default function OrderPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-3">
        <div className="w-8 h-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        <p className="text-gray-500 text-sm">กำลังโหลดเมนู...</p>
      </div>
    }>
      <OrderPageContent />
    </Suspense>
  );
}
