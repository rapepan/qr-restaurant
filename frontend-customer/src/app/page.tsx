import { redirect } from 'next/navigation';

// QR Code จะพา user มาที่ /order?table=X&token=Y ตรงๆ
// หน้านี้ handle กรณีที่ใครเข้า root URL
export default function Home({
  searchParams,
}: {
  searchParams: { table?: string; token?: string };
}) {
  if (searchParams.table && searchParams.token) {
    redirect(`/order?table=${searchParams.table}&token=${searchParams.token}`);
  }
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-4">🍽️</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">QR Restaurant</h1>
      <p className="text-gray-500 text-sm">กรุณาสแกน QR Code ที่โต๊ะของคุณเพื่อสั่งอาหาร</p>
    </div>
  );
}
