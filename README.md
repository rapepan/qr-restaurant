# 🍽️ QR Restaurant System

ระบบสั่งอาหารผ่าน QR Code สำหรับร้านอาหาร — ครบวงจร

## โครงสร้างโปรเจกต์

```
qr-restaurant/
├── database/
│   └── schema.sql           ← SQL สร้างตาราง + seed data
├── backend/                 ← Express.js API Server
│   ├── src/
│   │   ├── index.js          ← Entry point
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── socket/
│   │   └── utils/
│   └── package.json
├── frontend-customer/       ← Next.js (หน้าลูกค้า)
│   └── src/
│       ├── app/
│       │   ├── order/
│       │   │   ├── page.tsx  ← หน้าหลักสั่งอาหาร
│       │   │   └── status/[order_number]/page.tsx
│       ├── components/
│       ├── store/
│       └── lib/
└── frontend-admin/          ← Next.js (ระบบ Admin)
    └── src/
        ├── app/
        │   ├── login/
        │   └── dashboard/
        │       ├── page.tsx
        │       ├── orders/
        │       ├── menu/
        │       ├── tables/
        │       └── stats/
        ├── store/
        └── lib/
```

---

## 🚀 Deploy Step-by-Step

### 1. Database (Railway MariaDB)

1. ไปที่ [railway.app](https://railway.app) → New Project → Add MySQL
2. Copy connection string
3. รัน `schema.sql` ผ่าน Railway Console หรือ DBeaver

### 2. Backend (Railway)

```bash
cd backend
cp .env.example .env
# แก้ไข .env ให้ครบ

npm install
npm start  # local test
```

**Railway deploy:**
1. Push code ขึ้น GitHub
2. New Service → GitHub repo → เลือกโฟลเดอร์ `backend`
3. ตั้ง Environment Variables ตาม `.env.example`
4. Railway จะ detect `npm start` เอง

### 3. Frontend Customer (Vercel)

```bash
cd frontend-customer
cp .env.local.example .env.local
# แก้ไข NEXT_PUBLIC_API_URL และ NEXT_PUBLIC_SOCKET_URL

npm install
npm run dev  # local test
```

**Vercel deploy:**
1. `vercel deploy` หรือ import จาก GitHub
2. ตั้ง Environment Variables
3. URL: `yourrestaurant.vercel.app`

### 4. Frontend Admin (Vercel)

```bash
cd frontend-admin
# สร้าง .env.local เหมือนกัน

npm install
npm run dev  # รันที่ port 3001
```

**Vercel deploy:**
- แนะนำใช้ subdomain: `admin-yourrestaurant.vercel.app`

---

## 🔗 URL Structure

| หน้า | URL |
|------|-----|
| ลูกค้าสแกน QR | `yourrestaurant.vercel.app/order?table=1&token=xxx` |
| ติดตามออเดอร์ | `yourrestaurant.vercel.app/order/status/ORD-xxx` |
| Admin Login | `admin-yourrestaurant.vercel.app/login` |
| Admin Dashboard | `admin-yourrestaurant.vercel.app/dashboard` |

---

## 🔐 Default Admin

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin1234` |

⚠️ **เปลี่ยน password ทันทีหลัง deploy!**

เปลี่ยน password ผ่าน SQL:
```sql
UPDATE users SET password = '$2b$12$NEW_BCRYPT_HASH' WHERE username = 'admin';
```

Generate bcrypt hash:
```js
const bcrypt = require('bcrypt');
bcrypt.hash('new_password', 12).then(console.log);
```

---

## 📡 Realtime Events (Socket.IO)

| Event | Direction | Description |
|-------|-----------|-------------|
| `new_order` | Server → Admin | ออเดอร์ใหม่จากลูกค้า |
| `order_status_updated` | Server → All | อัปเดตสถานะออเดอร์ |
| `item_status_updated` | Server → All | อัปเดตสถานะรายการอาหาร |
| `staff_call` | Server → Admin | เรียกพนักงาน / ขอเช็กบิล |
| `table_status_updated` | Server → Admin | อัปเดตสถานะโต๊ะ |

---

## 🛡️ Security Features

- ✅ JWT Access Token (8h) + Refresh Token (7d)
- ✅ bcrypt password hashing (cost 12)
- ✅ Table token (crypto.randomBytes 32) — ไม่เดาได้
- ✅ Rate limiting (100 req/15min, 10 orders/min)
- ✅ Helmet.js HTTP security headers
- ✅ CORS whitelist
- ✅ Input validation ทุก endpoint
- ✅ Admin routes แยก middleware

---

## 📦 Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend Customer | Next.js 14, Tailwind CSS, Zustand, Socket.IO Client |
| Frontend Admin | Next.js 14, Tailwind CSS, Recharts, react-hot-toast |
| Backend | Node.js, Express.js, Socket.IO |
| Database | MariaDB |
| Auth | JWT, bcrypt |
| File Upload | Cloudinary |
| Hosting Customer | Vercel |
| Hosting Backend | Railway |
| Hosting DB | Railway |
"# qr-restaurant" 
